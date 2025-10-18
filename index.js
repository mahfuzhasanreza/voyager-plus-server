const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// db connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.726llh0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Global variable to hold the collections
let usersCollection;
let tripsCollection;
let joinRequestsCollection;
let groupChatsCollection;

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("✅ Connected to MongoDB successfully!");

    const database = client.db("voyagerPlus");
    usersCollection = database.collection("users");
    tripsCollection = database.collection("trips");
    joinRequestsCollection = database.collection("joinRequests");
    groupChatsCollection = database.collection("groupChats");

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
  // NOTE: Don't close the client here - keep connection alive for the app
}

// Connect to MongoDB before starting the server
run().catch(console.dir);

// API Routes
app.post('/user', async (req, res) => {
  try {
    const user = req.body;
    console.log("📝 Received user data:", user);
    const result = await usersCollection.insertOne(user);
    console.log("✅ User inserted successfully:", result.insertedId);
    res.send(result);
  } catch (error) {
    console.error("❌ Error inserting user:", error);
    res.status(500).send({ error: 'Failed to insert user', message: error.message });
  }
});

// Get user by username or email (for login)
app.get('/user', async (req, res) => {
  try {
    const identifier = req.query.identifier;

    // Search by username or email
    const user = await usersCollection.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send(user);
  } catch (error) {
    console.error("❌ Error finding user:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Update user profile
app.put('/user/update', async (req, res) => {
  try {
    const { username, displayName, email, bio, profilePicturePath, coverPhotoPath } = req.body;

    const result = await usersCollection.updateOne(
      { username: username },
      {
        $set: {
          displayName,
          email,
          bio,
          profilePicturePath,
          coverPhotoPath
        }
      }
    );

    res.send(result);
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).send({ message: 'Update failed' });
  }
});

// Add a new trip
app.post('/trips', async (req, res) => {
  try {
    const trip = req.body;
    console.log("📝 Received trip data:", trip);
    const result = await tripsCollection.insertOne(trip);
    console.log("✅ Trip inserted successfully:", result.insertedId);
    res.send(result);
  } catch (error) {
    console.error("❌ Error inserting trip:", error);
    res.status(500).send({ error: 'Failed to insert trip', message: error.message });
  }
});

// Get all trips
app.get('/trips', async (req, res) => {
  try {
    const trips = await tripsCollection.find().toArray();
    res.send(trips);
  } catch (error) {
    console.error("❌ Error fetching trips:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get solo trips only
app.get('/trips/solo', async (req, res) => {
  try {
    const excludeUsername = req.query.excludeUsername;
    let query = { type: 'SOLO' };

    // Exclude the current user's trips if excludeUsername is provided
    if (excludeUsername) {
      query.creatorUsername = { $ne: excludeUsername };
    }

    const soloTrips = await tripsCollection.find(query).toArray();
    res.send(soloTrips);
  } catch (error) {
    console.error("❌ Error fetching solo trips:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get group trips only
app.get('/trips/group', async (req, res) => {
  try {
    const excludeUsername = req.query.excludeUsername;
    let query = { type: 'GROUP' };

    // Exclude the current user's trips if excludeUsername is provided
    if (excludeUsername) {
      query.creatorUsername = { $ne: excludeUsername };
    }

    const groupTrips = await tripsCollection.find(query).toArray();
    res.send(groupTrips);
  } catch (error) {
    console.error("❌ Error fetching group trips:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Create a join request for a group trip
app.post('/trips/:tripId/request', async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const { requesterUsername, message } = req.body;

    if (!requesterUsername) return res.status(400).send({ message: 'Missing requesterUsername' });

    const trip = await tripsCollection.findOne({ _id: new ObjectId(tripId) });
    if (!trip) return res.status(404).send({ message: 'Trip not found' });
    if (trip.type !== 'GROUP') return res.status(400).send({ message: 'Can only request to join group trips' });
    if (trip.creatorUsername === requesterUsername) return res.status(400).send({ message: 'Creator cannot request own trip' });

    // Check for existing pending request
    const existing = await joinRequestsCollection.findOne({
      tripId: new ObjectId(tripId),
      requesterUsername,
      status: 'PENDING'
    });
    if (existing) return res.status(409).send({ message: 'You already have a pending request for this trip' });

    const requestDoc = {
      tripId: new ObjectId(tripId),
      tripCreatorUsername: trip.creatorUsername,
      requesterUsername,
      message: message || '',
      status: 'PENDING',
      createdAt: new Date()
    };

    const result = await joinRequestsCollection.insertOne(requestDoc);
    console.log("✅ Join request created successfully:", result.insertedId);
    res.status(201).send({ insertedId: result.insertedId, message: 'Join request created successfully' });
  } catch (error) {
    console.error("❌ Error creating join request:", error);
    res.status(500).send({ message: 'Failed to create join request' });
  }
});

// List join requests for a trip (only trip creator should call)
app.get('/trips/:tripId/requests', async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const username = req.query.username; // username of caller; used to verify owner

    const trip = await tripsCollection.findOne({ _id: new ObjectId(tripId) });
    if (!trip) return res.status(404).send({ message: 'Trip not found' });
    if (!username || username !== trip.creatorUsername) {
      return res.status(403).send({ message: 'Only the trip creator can view requests' });
    }

    const requests = await joinRequestsCollection.find({ tripId: new ObjectId(tripId) }).toArray();
    res.send(requests);
  } catch (error) {
    console.error("❌ Error fetching join requests:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Approve or reject a join request (trip owner only)
app.put('/trips/:tripId/requests/:requestId/respond', async (req, res) => {
  try {
    const { tripId, requestId } = req.params;
    const { action, responderUsername } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).send({ message: 'Invalid action. Must be "approve" or "reject"' });
    }

    const trip = await tripsCollection.findOne({ _id: new ObjectId(tripId) });
    if (!trip) return res.status(404).send({ message: 'Trip not found' });
    if (!responderUsername || responderUsername !== trip.creatorUsername) {
      return res.status(403).send({ message: 'Only the trip creator can respond to requests' });
    }

    const reqDoc = await joinRequestsCollection.findOne({ 
      _id: new ObjectId(requestId), 
      tripId: new ObjectId(tripId) 
    });
    if (!reqDoc) return res.status(404).send({ message: 'Request not found' });
    if (reqDoc.status !== 'PENDING') {
      return res.status(409).send({ message: 'Request has already been responded to' });
    }

    if (action === 'approve') {
      // Add requester to trip participants
      await tripsCollection.updateOne(
        { _id: new ObjectId(tripId) },
        { $addToSet: { participants: reqDoc.requesterUsername } }
      );
      await joinRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: 'APPROVED', responderUsername, respondedAt: new Date() } }
      );
      console.log("✅ Join request approved for user:", reqDoc.requesterUsername);

      // Automatically create a group chat if not already exists
      let chatId = tripId;
      const existingChat = await groupChatsCollection.findOne({ tripId: new ObjectId(tripId) });
      
      if (!existingChat) {
        await groupChatsCollection.insertOne({
          tripId: new ObjectId(tripId),
          creatorUsername: trip.creatorUsername,
          participants: [trip.creatorUsername, reqDoc.requesterUsername],
          messages: [],
          createdAt: new Date()
        });
        console.log("✅ Group chat created for trip:", tripId);
      } else {
        // Add participant if not already in the chat
        await groupChatsCollection.updateOne(
          { tripId: new ObjectId(tripId) },
          { $addToSet: { participants: reqDoc.requesterUsername } }
        );
        console.log("✅ User added to existing group chat:", tripId);
      }

      return res.send({ message: 'Request approved successfully' });
    } else {
      await joinRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: 'REJECTED', responderUsername, respondedAt: new Date() } }
      );
      console.log("✅ Join request rejected for user:", reqDoc.requesterUsername);
      return res.send({ message: 'Request rejected' });
    }
  } catch (error) {
    console.error("❌ Error responding to request:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get notifications for a user (both incoming join requests and responses to their requests)
app.get('/notifications/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const notifications = [];

    // 1. Find incoming join requests for trips created by this user (PENDING only)
    const userTrips = await tripsCollection.find({ creatorUsername: username }).toArray();
    const tripIds = userTrips.map(trip => trip._id);

    const pendingRequests = await joinRequestsCollection.find({
      tripId: { $in: tripIds },
      status: 'PENDING'
    }).toArray();

    // Add pending requests as notifications
    pendingRequests.forEach(request => {
      const trip = userTrips.find(t => t._id.toString() === request.tripId.toString());
      notifications.push({
        _id: request._id,
        type: 'JOIN_REQUEST',
        tripId: request.tripId,
        tripTitle: trip ? trip.title : 'Unknown Trip',
        tripRoute: trip ? trip.route : '',
        requesterUsername: request.requesterUsername,
        message: request.message,
        createdAt: request.createdAt,
        status: request.status
      });
    });

    // 2. Find responses to this user's join requests (APPROVED or REJECTED)
    const userRequestResponses = await joinRequestsCollection.find({
      requesterUsername: username,
      status: { $in: ['APPROVED', 'REJECTED'] }
    }).toArray();

    // Add responses as notifications
    for (const response of userRequestResponses) {
      const trip = await tripsCollection.findOne({ _id: response.tripId });
      notifications.push({
        _id: response._id,
        type: response.status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        tripId: response.tripId,
        tripTitle: trip ? trip.title : 'Unknown Trip',
        tripRoute: trip ? trip.route : '',
        tripCreatorUsername: response.tripCreatorUsername,
        message: response.status === 'APPROVED'
          ? `Your request to join "${trip ? trip.title : 'the trip'}" has been approved!`
          : `Your request to join "${trip ? trip.title : 'the trip'}" has been declined.`,
        createdAt: response.respondedAt || response.createdAt,
        status: response.status
      });
    }

    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`✅ Found ${notifications.length} notifications for user: ${username}`);
    res.send(notifications);
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get notification count for a user
app.get('/notifications/:username/count', async (req, res) => {
  try {
    const username = req.params.username;
    let totalCount = 0;

    // 1. Count pending join requests for trips created by this user
    const userTrips = await tripsCollection.find({ creatorUsername: username }).toArray();
    const tripIds = userTrips.map(trip => trip._id);

    const pendingRequestsCount = await joinRequestsCollection.countDocuments({
      tripId: { $in: tripIds },
      status: 'PENDING'
    });

    totalCount += pendingRequestsCount;

    // 2. Count responses to this user's join requests (APPROVED or REJECTED)
    const responsesCount = await joinRequestsCollection.countDocuments({
      requesterUsername: username,
      status: { $in: ['APPROVED', 'REJECTED'] }
    });

    totalCount += responsesCount;

    console.log(`✅ User ${username} has ${totalCount} pending notifications (${pendingRequestsCount} requests, ${responsesCount} responses)`);
    res.send({ count: totalCount });
  } catch (error) {
    console.error("❌ Error counting notifications:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Mark notification as read (remove approved/rejected requests after viewing)
app.delete('/notifications/:username/:requestId', async (req, res) => {
  try {
    const { username, requestId } = req.params;

    // Find the request
    const request = await joinRequestsCollection.findOne({
      _id: new ObjectId(requestId),
      requesterUsername: username
    });

    if (!request) {
      return res.status(404).send({ message: 'Notification not found' });
    }

    // Only allow deletion of APPROVED or REJECTED requests (not PENDING)
    if (request.status === 'PENDING') {
      return res.status(400).send({ message: 'Cannot delete pending requests' });
    }

    // Delete the request notification
    await joinRequestsCollection.deleteOne({ _id: new ObjectId(requestId) });

    console.log(`✅ Notification ${requestId} deleted for user: ${username}`);
    res.send({ message: 'Notification dismissed' });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// ==================== GROUP CHAT ENDPOINTS (Database Persistent) ====================

// Get group chat for a trip
app.get('/groupchats/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    const chat = await groupChatsCollection.findOne({ tripId: new ObjectId(tripId) });

    if (!chat) {
      return res.status(404).send({ message: 'Group chat not found' });
    }

    const trip = await tripsCollection.findOne({ _id: new ObjectId(tripId) });

    res.send({
      _id: chat._id,
      tripId: chat.tripId,
      chatName: trip ? `${trip.title} - Group Chat` : 'Group Chat',
      members: chat.participants,
      messages: chat.messages,
      createdAt: chat.createdAt
    });
  } catch (error) {
    console.error("❌ Error fetching group chat:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get all group chats for a user
app.get('/groupchats/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find all chats where user is a participant
    const chats = await groupChatsCollection.find({ 
      participants: username 
    }).toArray();

    const userChats = [];

    for (const chat of chats) {
      const trip = await tripsCollection.findOne({ _id: chat.tripId });
      userChats.push({
        _id: chat._id,
        tripId: chat.tripId,
        chatName: trip ? `${trip.title} - Group Chat` : 'Group Chat',
        members: chat.participants,
        messageCount: chat.messages.length,
        lastMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null,
        createdAt: chat.createdAt
      });
    }

    res.send(userChats);
  } catch (error) {
    console.error("❌ Error fetching user group chats:", error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Add message to group chat (persisted to database)
app.post('/groupchats/:tripId/messages', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { sender, content } = req.body;

    const chat = await groupChatsCollection.findOne({ tripId: new ObjectId(tripId) });

    if (!chat) {
      return res.status(404).send({ message: 'Group chat not found' });
    }

    // Verify sender is a member
    if (!chat.participants.includes(sender)) {
      return res.status(403).send({ message: 'You are not a member of this chat' });
    }

    const message = {
      sender,
      content,
      timestamp: new Date()
    };

    // Add message to the chat's messages array in the database
    await groupChatsCollection.updateOne(
      { tripId: new ObjectId(tripId) },
      { $push: { messages: message } }
    );

    console.log(`✅ Message added to group chat ${tripId} by ${sender}`);
    res.send({ success: true, message });
  } catch (error) {
    console.error("❌ Error adding message:", error);
    res.status(500).send({ message: 'Server error' });
  }
});


app.get('/', (req, res) => {
  res.send('Voyager+ Server is running! 🚀');
});

app.listen(port, () => {
    console.log(`🚀 Server is running on port: ${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹ Shutting down gracefully...');
  await client.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
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

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("✅ Connected to MongoDB successfully!");

    const database = client.db("voyagerPlus");
    usersCollection = database.collection("users");
    tripsCollection = database.collection("trips");

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
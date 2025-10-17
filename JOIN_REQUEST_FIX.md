# Join Request Fix - Documentation

## Problem
Join requests were not being saved to the MongoDB `joinRequests` collection when users requested to join group trips.

## Root Cause
The Java application was only storing join requests in **local memory** (in the `TripService` class) instead of sending them to the backend API to be saved in MongoDB.

## Solution

### 1. Backend API (Node.js/Express) - Already Implemented ✅
The backend API endpoint already exists at `POST http://localhost:5000/trips/:tripId/request` and properly saves requests to MongoDB.

### 2. Java Client Updates - FIXED ✅

#### Added to `TripApiClient.java`:
- **`sendJoinRequest(tripId, requesterUsername, message)`** - Sends POST request to backend API
- **`fetchJoinRequests(tripId, username)`** - Fetches all requests for a trip (for trip owner)
- **`respondToJoinRequest(tripId, requestId, action, responderUsername)`** - Approve/reject requests
- **`httpPost(url, jsonPayload)`** - Helper method for POST requests
- **`httpPut(url, jsonPayload)`** - Helper method for PUT requests
- **`escapeJson(string)`** - Helper to properly escape JSON strings

#### Updated in `TripService.java`:
Modified the `requestToJoin()` method to:
1. **Call the backend API** using `TripApiClient.sendJoinRequest()` to save to MongoDB
2. **Keep a local copy** for immediate UI feedback
3. **Log success/failure** for debugging

## How It Works Now

### When a user requests to join a group trip:

1. User clicks "Request to Join" on a group trip in the newsfeed
2. `TripPlannerController` calls `TripService.requestToJoin(tripId, message)`
3. `TripService` calls `TripApiClient.sendJoinRequest(tripId, username, message)`
4. `TripApiClient` sends HTTP POST to `http://localhost:5000/trips/:tripId/request`
5. Backend saves the request to MongoDB `joinRequests` collection
6. Local copy is also created in memory for immediate UI updates

### Database Structure:
```javascript
{
  _id: ObjectId,
  tripId: ObjectId,
  tripCreatorUsername: string,
  requesterUsername: string,
  message: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  createdAt: Date,
  responderUsername: string (when responded),
  respondedAt: Date (when responded)
}
```

## Testing

### To verify the fix:

1. **Start the backend server:**
   ```cmd
   cd d:\VoyagerPlus\voyager-plus-server
   node index.js
   ```

2. **Run the Java application**

3. **Create a GROUP trip** and post it

4. **Login as a different user** and request to join the group trip

5. **Check MongoDB** to verify the request was saved:
   - Collection: `voyagerPlus.joinRequests`
   - Should see a document with status: "PENDING"

6. **Check console output:**
   - Should see: `📤 Sending join request to: http://localhost:5000/trips/{tripId}/request`
   - Should see: `✅ Join request saved to MongoDB database`

## Console Output Example

When a request is successfully saved:
```
📤 Sending join request to: http://localhost:5000/trips/67313ed947d7ea1b3c05fd6a/request
📤 Payload: {"requesterUsername":"testuser","message":"I want to join!"}
📡 HTTP Response Code: 201
✅ Join request response: {"insertedId":"67313f1d47d7ea1b3c05fd6b","message":"Join request created successfully"}
✅ Join request saved to MongoDB database
```

## API Endpoints Available

1. **POST** `/trips/:tripId/request` - Create a join request
   - Body: `{ requesterUsername, message }`
   
2. **GET** `/trips/:tripId/requests?username=xxx` - List requests (owner only)

3. **PUT** `/trips/:tripId/requests/:requestId/respond` - Approve/reject
   - Body: `{ action: "approve"|"reject", responderUsername }`

## Status
✅ **FIXED** - Join requests now save to MongoDB database correctly


# Notification System for Join Requests - Complete Documentation

## Overview
Trip creators now receive notifications for join requests in the **Notification section** of the home page. They can view all pending requests and click to manage them directly.

## What Was Implemented

### 1. Backend API Endpoints ✅

#### `GET /notifications/:username`
- Fetches all pending join requests for trips created by the user
- Returns enriched data with trip information
- **Response Example:**
```json
[
  {
    "_id": "67313f1d47d7ea1b3c05fd6b",
    "type": "JOIN_REQUEST",
    "tripId": "67313ed947d7ea1b3c05fd6a",
    "tripTitle": "Beach Adventure",
    "tripRoute": "Miami to Key West",
    "requesterUsername": "bob",
    "message": "I'd love to join this trip!",
    "createdAt": "2025-10-17T10:30:00Z",
    "status": "PENDING"
  }
]
```

#### `GET /notifications/:username/count`
- Returns the count of pending notifications
- **Response Example:**
```json
{
  "count": 3
}
```

### 2. Java Classes Created

#### **Notification.java** - NEW
- Represents a join request notification
- **Properties:**
  - `id` - Notification ID
  - `type` - Type of notification (JOIN_REQUEST)
  - `tripId` - ID of the trip
  - `tripTitle` - Title of the trip
  - `tripRoute` - Route of the trip
  - `requesterUsername` - Username of the person requesting
  - `message` - Personal message from requester
  - `createdAt` - Timestamp of request

- **Methods:**
  - `getDisplayText()` - "bob wants to join your trip \"Beach Adventure\""
  - `getTimeAgo()` - "2 hours ago" / "Just now" / etc.

#### **NotificationsController.java** - NEW
- Controls the Notifications page UI
- **Features:**
  - Displays list of all pending join requests
  - Shows requester info, trip details, and time
  - Double-click to open Manage Requests dialog
  - Refresh button to fetch latest notifications
  - Empty state when no notifications

#### **NavbarController.java** - UPDATED
- `updateNotificationBadge()` - Now fetches real count from backend
- `handleNotifications()` - Opens notifications page
- Shows red badge with count when notifications exist

#### **TripApiClient.java** - UPDATED
- `fetchNotifications(username)` - Fetches notifications from backend
- `fetchNotificationCount(username)` - Gets notification count
- `parseNotificationsFromJson()` - Parses JSON response
- `parseSingleNotification()` - Parses individual notification

### 3. UI Components

#### **Notifications.fxml** - NEW
- Full-page notifications view
- Features:
  - Header with notification count
  - Refresh button
  - Scrollable list of notifications
  - Empty state message
  - Double-click instruction

## User Workflow

### For Trip Creators:

1. **User A creates a GROUP trip** and posts it to newsfeed

2. **User B requests to join** from the newsfeed
   - Request is saved to MongoDB `joinRequests` collection
   - Notification is now available for User A

3. **User A sees notification badge** on navbar
   - Red badge shows count (e.g., "3")
   - Appears automatically when requests exist

4. **User A clicks notification icon/badge**
   - Opens Notifications page
   - Shows all pending join requests with:
     - 🔔 "bob wants to join your trip \"Beach Adventure\""
     - 📍 Miami to Key West
     - ⏰ 2 hours ago

5. **User A double-clicks on a notification**
   - Opens Manage Requests dialog for that specific trip
   - Can approve or reject the request

6. **After handling requests**
   - Notification disappears from list
   - Badge count updates automatically

## Visual Features

### Notification Badge (Navbar)
- **Hidden** - When count = 0
- **Visible** - Shows number when notifications exist
- **Red color** - Draws attention to pending requests

### Notifications Page
- **Card-style layout** - Each notification in a card
- **Visual hierarchy:**
  - Bold main text: Requester wants to join
  - Gray subtext: Trip route
  - Lighter text: Time ago
- **Hover effect** - Background changes on hover
- **Empty state** - "🔔 No new notifications"
- **Refresh button** - "🔄 Refresh" to get latest

### Notification Items Display:
```
🔔 bob wants to join your trip "Beach Adventure"
📍 Miami to Key West
⏰ 2 hours ago
```

## Integration Points

### Automatic Updates:
1. When user creates account - Notification system ready
2. When trip is created - System monitors for requests
3. When request is made - Notification appears immediately
4. When request is handled - Notification removed
5. On page load - Badge updates with current count

## Database Flow

```
User B requests to join
    ↓
POST /trips/:tripId/request
    ↓
Saved to joinRequests collection
    ↓
User A logs in
    ↓
GET /notifications/:username/count
    ↓
Badge shows count "3"
    ↓
User A clicks notifications
    ↓
GET /notifications/:username
    ↓
Displays all pending requests
    ↓
User A double-clicks notification
    ↓
Opens Manage Requests dialog
    ↓
User A approves/rejects
    ↓
PUT /trips/:tripId/requests/:requestId/respond
    ↓
Status updated in database
    ↓
Notification removed from list
```

## Benefits

✅ **Real-time awareness** - Creators know immediately when someone wants to join  
✅ **Centralized location** - All notifications in one place  
✅ **Visual indicators** - Badge count shows pending requests  
✅ **Quick access** - Double-click to manage requests  
✅ **User-friendly** - Time-ago format and clear messaging  
✅ **Persistent** - Survives app restarts  
✅ **Database-driven** - Always in sync with MongoDB  

## Testing

### To test the notification system:

1. **Start backend server:**
   ```cmd
   cd d:\VoyagerPlus\voyager-plus-server
   node index.js
   ```

2. **Login as User A** and create a GROUP trip

3. **Login as User B** and request to join the trip

4. **Login back as User A:**
   - You should see a **red badge** on the navbar (e.g., "1")
   - Click the **notification icon/badge**
   - See the notification: "User B wants to join your trip..."

5. **Double-click the notification:**
   - Manage Requests dialog opens
   - Approve or reject the request

6. **Notification should disappear** and badge should update

### Expected Console Output:

**On navbar load:**
```
✅ User alice has 1 pending notifications
```

**On notifications page load:**
```
✅ Parsed 1 notifications from backend
```

**After handling request:**
```
🔍 Fetching all join requests from backend for trip: 67313ed947d7ea1b3c05fd6a
✅ Fetched 0 total requests from backend
```

## Files Created/Modified

### Created:
1. `Notification.java` - Notification model class
2. `NotificationsController.java` - Notifications page controller
3. `Notifications.fxml` - Notifications page UI

### Modified:
1. `index.js` - Added notification endpoints
2. `TripApiClient.java` - Added notification fetching methods
3. `NavbarController.java` - Updated badge to show real count

## Status
✅ **COMPLETE** - Trip creators can now see join request notifications in the Notification section of the home page!


# Dynamic Notification System Fix - Documentation

## Problem
The notification badge was showing static information instead of fetching real-time data from the MongoDB database.

## Root Cause
1. The notification badge was placed on the "Community" button instead of having its own dedicated button
2. The notification count wasn't being fetched from the backend API dynamically
3. No auto-refresh mechanism was in place to update the count periodically

## Solution Implemented

### 1. **Backend API - Already Working** ✅
The backend endpoints are functioning correctly:
- `GET /notifications/:username` - Fetches all pending join requests
- `GET /notifications/:username/count` - Returns count of pending notifications

### 2. **Frontend Changes**

#### **Navbar.fxml** - UPDATED
- **Removed:** Notification badge from Community button
- **Added:** Dedicated notification bell button (🔔) with badge
- **Position:** Between Community and Learn buttons
- **Badge:** Shows dynamically on top-right of bell icon

```xml
<StackPane>
    <Button text="🔔" onAction="#handleNotifications" styleClass="nav-btn"/>
    <Label fx:id="notificationBadge" text="0" styleClass="notification-badge" visible="false"/>
</StackPane>
```

#### **NavbarController.java** - UPDATED
Added dynamic notification fetching:

**1. Auto-Refresh Timer:**
```java
private java.util.Timer notificationTimer;

private void startNotificationTimer() {
    notificationTimer = new java.util.Timer(true);
    notificationTimer.scheduleAtFixedRate(new java.util.TimerTask() {
        @Override
        public void run() {
            Platform.runLater(() -> updateNotificationBadge());
        }
    }, 10000, 30000); // First update: 10s, then every 30s
}
```

**2. Dynamic Badge Update:**
```java
private void updateNotificationBadge() {
    User currentUser = tripService.getCurrentUser();
    if (currentUser != null) {
        // Fetch REAL count from MongoDB via backend API
        int notificationCount = TripApiClient.fetchNotificationCount(currentUser.getUsername());

        if (notificationCount > 0) {
            notificationBadge.setText(String.valueOf(notificationCount));
            notificationBadge.setVisible(true);
        } else {
            notificationBadge.setVisible(false);
        }
    }
}
```

**3. Click Handler:**
```java
@FXML
private void handleNotifications(ActionEvent event) {
    navigateToPage("Notifications.fxml", "Notifications - Voyager+", "home");
}
```

#### **TripApiClient.java** - UPDATED
Enhanced logging for debugging:

```java
public static int fetchNotificationCount(String username) {
    String url = BASE_URL + "/notifications/" + URLEncoder.encode(username, StandardCharsets.UTF_8) + "/count";
    System.out.println("🔍 Fetching notification count for user: " + username);
    System.out.println("📡 URL: " + url);
    
    String jsonResponse = httpGet(url);
    System.out.println("📥 Response: " + jsonResponse);
    
    String countStr = extractJsonValue(jsonResponse, "count");
    if (countStr != null) {
        int count = Integer.parseInt(countStr);
        System.out.println("✅ Notification count: " + count);
        return count;
    }
    return 0;
}
```

#### **NotificationsController.java** - UPDATED
Added manual refresh with visual feedback:

```java
@FXML
private void handleRefresh() {
    System.out.println("🔄 Manual refresh triggered");
    loadNotifications();
    showTemporaryMessage("Refreshed!");
}

private void showTemporaryMessage(String message) {
    titleLabel.setText("Notifications - " + message);
    // Reset after 2 seconds
    new java.util.Timer().schedule(new java.util.TimerTask() {
        @Override
        public void run() {
            Platform.runLater(() -> {
                titleLabel.setText("Notifications (" + notifications.size() + ")");
            });
        }
    }, 2000);
}
```

## How It Works Now

### Automatic Updates:
1. **On Page Load:** Fetches notification count immediately
2. **First Auto-Refresh:** 10 seconds after page load
3. **Subsequent Refreshes:** Every 30 seconds
4. **Uses Platform.runLater():** Ensures UI updates on JavaFX thread

### Visual Indicators:
- **Badge Hidden:** When count = 0
- **Badge Visible:** Shows number (e.g., "3") when notifications exist
- **Red Badge:** Styled to draw attention
- **Bell Icon:** Large, clickable notification bell

### User Workflow:

1. **User B requests to join User A's trip**
   ```
   POST /trips/:tripId/request
   → Saved to MongoDB joinRequests collection
   ```

2. **User A's navbar auto-refreshes (every 30s)**
   ```
   GET /notifications/userA/count
   → Returns { "count": 1 }
   → Badge shows "1"
   ```

3. **User A clicks bell icon**
   ```
   Opens Notifications.fxml
   GET /notifications/userA
   → Returns full notification details
   ```

4. **User A double-clicks notification**
   ```
   Opens Manage Requests dialog
   User A approves/rejects request
   PUT /trips/:tripId/requests/:requestId/respond
   → Status updated to APPROVED/REJECTED
   ```

5. **Badge updates automatically**
   ```
   Next auto-refresh (within 30s)
   GET /notifications/userA/count
   → Returns { "count": 0 }
   → Badge hides
   ```

## Console Output Examples

### On Navbar Load:
```
🔍 Fetching notification count for user: alice
📡 URL: http://localhost:5000/notifications/alice/count
📥 Response: {"count":2}
✅ Notification count: 2
```

### On Auto-Refresh (every 30s):
```
🔍 Fetching notification count for user: alice
📡 URL: http://localhost:5000/notifications/alice/count
📥 Response: {"count":2}
✅ Notification count: 2
```

### On Notifications Page:
```
✅ Parsed 2 notifications from backend
```

### On Manual Refresh:
```
🔄 Manual refresh triggered
✅ Parsed 2 notifications from backend
```

## Testing Instructions

### 1. Start the Backend Server:
```cmd
cd d:\VoyagerPlus\voyager-plus-server
node index.js
```

You should see:
```
✅ Connected to MongoDB successfully!
✅ Pinged your deployment. You successfully connected to MongoDB!
🚀 Server is running on port: 5000
```

### 2. Test the Flow:

**As User A (Trip Creator):**
1. Login and create a GROUP trip
2. Post it to the newsfeed
3. Check navbar - badge should be hidden (no requests yet)

**As User B (Requester):**
1. Login to a different account
2. View newsfeed
3. Request to join User A's trip

**Back as User A:**
1. Wait up to 30 seconds (or reload page for immediate refresh)
2. You should see the badge appear with "1"
3. Click the bell icon 🔔
4. See the notification: "User B wants to join your trip..."
5. Double-click to manage the request
6. Approve or reject
7. Badge should update within 30 seconds

### 3. Verify Backend Calls:

Check your console output for:
```
🔍 Fetching notification count for user: alice
📡 URL: http://localhost:5000/notifications/alice/count
📥 Response: {"count":1}
✅ Notification count: 1
```

### 4. Verify Backend Logs:

Check your backend server console:
```
✅ User alice has 1 pending notifications
✅ Found 1 notifications for user: alice
```

## Troubleshooting

### Badge Not Showing:
1. Check if backend server is running on port 5000
2. Verify user is logged in (check console logs)
3. Confirm there are PENDING join requests in database
4. Check console for API errors

### Badge Not Updating:
1. Wait 30 seconds for auto-refresh
2. Manually refresh by navigating away and back
3. Check console for "Fetching notification count" logs

### Can't Click Notification:
1. Make sure you're double-clicking (not single-click)
2. Verify trip exists in local cache
3. Check console for errors

## Files Modified

1. `d:\VoyagerPlus\voyager-plus-server\index.js` - Backend API (already working)
2. `Navbar.fxml` - Added dedicated bell button with badge
3. `NavbarController.java` - Added auto-refresh timer and dynamic fetching
4. `TripApiClient.java` - Enhanced logging for debugging
5. `NotificationsController.java` - Added refresh feedback
6. `Notification.java` - Already created
7. `Notifications.fxml` - Already created

## Key Features

✅ **Real-time from Database** - Fetches actual count from MongoDB  
✅ **Auto-refresh** - Updates every 30 seconds automatically  
✅ **Visual Feedback** - Red badge with number  
✅ **Clickable** - Bell icon opens notifications page  
✅ **Background Updates** - Uses Timer + Platform.runLater()  
✅ **Error Handling** - Graceful fallback if API fails  
✅ **Detailed Logging** - Easy debugging with console output  

## Status
✅ **FIXED** - Notifications now fetch dynamically from MongoDB database and update automatically every 30 seconds!


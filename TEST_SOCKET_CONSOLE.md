# Test Socket.IO in Console (Alternative Method)

Since direct ES6 imports don't work in the console, use this alternative test:

## Method 1: Check if Script is Already Running

```javascript
// Check if announcement notification badge is initialized
console.log('🔍 Checking announcement notification badge status...');

// Check for badge element
const badge = document.getElementById('iu-notification-badge');
console.log('Badge element:', badge ? '✅ Found' : '❌ Not found');

// Check console logs for initialization messages
// Look for: "🔔 Initializing announcement notification badge for: lgu-iu"
// Look for: "✅ Announcement notification socket connected"

// Check if Socket.IO events are being received
// Look for: "📢 Socket.IO: Received new_announcement event"
```

## Method 2: Monitor Console for Events

Just watch the console - the announcement notification badge script should already be running and will log:
- `🔔 Initializing announcement notification badge for: lgu-iu`
- `✅ Announcement notification socket connected`
- `📢 Socket.IO: Received new_announcement event` (when announcement is created)

## Method 3: Test by Creating Announcement

1. Keep the LGU-IU console open
2. Create an announcement from System Admin
3. Watch for these console messages:
   - `📢 Socket.IO: Received new_announcement event`
   - `🔔 Updating badge iu-notification-badge with count: X`
   - Badge should update automatically

## Method 4: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket) or "socket.io"
3. You should see a WebSocket connection to `localhost:3000`
4. When announcement is created, you should see messages in the WebSocket


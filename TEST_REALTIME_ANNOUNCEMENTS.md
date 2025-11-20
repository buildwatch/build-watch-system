# Test Real-Time Announcement Notifications

## ✅ Current Status
- API endpoint is working: `/api/admin/public/announcements/unread-count`
- Badge is displaying correctly: Shows "1" when there are unread announcements
- Badge visibility is working: Badge appears when count > 0

## 🔍 Test Real-Time Updates

### Step 1: Check Socket.IO Connection
Run this in the browser console to verify Socket.IO is connected:

```javascript
// Check if Socket.IO is loaded and connected
(async function() {
  if (typeof io === 'undefined') {
    console.log('⚠️ Socket.IO not loaded, importing...');
    const { io } = await import('socket.io-client');
    window.io = io;
  }
  
  const token = localStorage.getItem('token');
  const SOCKET_URL = 'http://localhost:3000';
  
  const testSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });
  
  testSocket.on('connect', () => {
    console.log('✅ Socket.IO Connected!');
    console.log('   Socket ID:', testSocket.id);
    
    // Listen for announcement events
    testSocket.on('new_announcement', (data) => {
      console.log('📢 NEW ANNOUNCEMENT EVENT RECEIVED:', data);
      console.log('   This means real-time updates are working!');
    });
    
    testSocket.on('announcement_updated', (data) => {
      console.log('📢 ANNOUNCEMENT UPDATED EVENT:', data);
    });
    
    testSocket.on('announcement_deleted', (data) => {
      console.log('📢 ANNOUNCEMENT DELETED EVENT:', data);
    });
  });
  
  testSocket.on('connect_error', (error) => {
    console.error('❌ Socket.IO Connection Error:', error);
  });
  
  testSocket.on('disconnect', (reason) => {
    console.log('⚠️ Socket.IO Disconnected:', reason);
  });
  
  console.log('🔌 Socket.IO test initialized. Creating an announcement will trigger events.');
})();
```

### Step 2: Create a Test Announcement
1. Open System Admin account in another browser tab/window
2. Create a new announcement
3. Watch the console in the LGU-IU account - you should see:
   - `📢 NEW ANNOUNCEMENT EVENT RECEIVED`
   - `📢 Socket.IO: Received new_announcement event`
   - `🔔 Updating badge iu-notification-badge with count: X`
   - Badge count should update automatically

### Step 3: Verify Badge Updates
After creating an announcement, check:
- Badge count increases automatically (no page refresh needed)
- Badge appears with blinking animation
- Console shows real-time update messages

## 🐛 Troubleshooting

### If Socket.IO doesn't connect:
1. Check backend server is running on port 3000
2. Check browser console for connection errors
3. Verify token is valid: `localStorage.getItem('token')`

### If events aren't received:
1. Check backend console for Socket.IO emit logs
2. Verify announcement was created (not saved as draft)
3. Check that announcement targetAudience includes the user's role

### If badge doesn't update:
1. Check console for `🔔 Updating badge` messages
2. Manually test: `document.getElementById('iu-notification-badge').textContent = '2'`
3. Verify badge element exists: `document.getElementById('iu-notification-badge')`

## ✅ Success Indicators
- ✅ API returns correct unread count
- ✅ Badge displays when count > 0
- ✅ Socket.IO connects successfully
- ✅ Events are received in real-time
- ✅ Badge updates automatically without page refresh


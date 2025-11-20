# Debug Announcement Notifications

## Quick Debug Script

Copy and paste this into your browser console to debug announcement notifications:

```javascript
// Quick Debug Script for Announcement Notifications
(async function() {
  console.log('🔍 Debugging Announcement Notifications...\n');
  
  // 1. Check badge element
  const badgeIds = ['sysadmin-notification-badge', 'iu-notification-badge', 'eiu-notification-badge', 
                    'secretariat-notification-badge', 'lgu-pmt-notification-badge', 'executive-notification-badge'];
  let badge = null;
  let badgeId = null;
  
  for (const id of badgeIds) {
    const el = document.getElementById(id);
    if (el) {
      badge = el;
      badgeId = id;
      console.log(`✅ Found badge: ${id}`);
      console.log(`   - Visible: ${!el.classList.contains('hidden')}`);
      console.log(`   - Text: ${el.textContent}`);
      break;
    }
  }
  
  if (!badge) {
    console.error('❌ No badge found!');
    return;
  }
  
  // 2. Check token
  const token = localStorage.getItem('token') || document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  console.log(`\n🔑 Token: ${token ? '✅ Found' : '❌ Missing'}`);
  
  // 3. Test API
  const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : `${window.location.protocol}//${window.location.hostname}:3000/api`;
  try {
    const response = await fetch(`${API_URL}/admin/public/announcements/unread-count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    console.log(`\n📊 Unread count: ${data.unreadCount}`);
    
    if (data.unreadCount > 0) {
      badge.textContent = data.unreadCount;
      badge.classList.remove('hidden');
      console.log('✅ Badge should now be visible!');
    }
  } catch (err) {
    console.error('❌ API Error:', err);
  }
  
  // 4. Check Socket.IO
  console.log('\n🔌 Socket.IO:', typeof io !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
  
  console.log('\n✅ Debug complete!');
})();
```

## Manual Test Steps

1. **Open browser console** (F12)
2. **Paste the debug script above**
3. **Check the output** for any errors
4. **Create an announcement** from System Admin
5. **Watch the console** for Socket.IO events

## Common Issues

### Badge not found
- Check if you're on the correct page (dashboard)
- Verify the topbar component is loaded
- Check browser console for errors

### Token missing
- Try logging out and back in
- Check localStorage: `localStorage.getItem('token')`
- Check cookies: `document.cookie`

### API not working
- Check backend server is running on port 3000
- Check Network tab in browser DevTools
- Verify the endpoint: `/api/admin/public/announcements/unread-count`

### Socket.IO not connecting
- Check backend server is running
- Check browser console for connection errors
- Verify Socket.IO is loaded: `typeof io !== 'undefined'`

## Load Debug Script

You can also load the full debug script:

```javascript
// Load full debug script
const script = document.createElement('script');
script.src = '/src/scripts/debugAnnouncementNotifications.js';
script.type = 'module';
document.head.appendChild(script);
```


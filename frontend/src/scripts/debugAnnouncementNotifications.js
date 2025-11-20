/**
 * Debug script for announcement notification badge
 * Run this in the browser console to diagnose issues
 */

(function() {
  console.log('🔍 Starting Announcement Notification Badge Debug...\n');

  // 1. Check if badge element exists
  console.log('1️⃣ Checking badge elements...');
  const badgeIds = {
    'eiu': 'eiu-notification-badge',
    'lgu-iu': 'iu-notification-badge',
    'secretariat': 'secretariat-notification-badge',
    'lgu-pmt': 'lgu-pmt-notification-badge',
    'sysadmin': 'sysadmin-notification-badge',
    'executive': 'executive-notification-badge'
  };

  let foundBadge = null;
  let accountType = null;
  
  for (const [type, badgeId] of Object.entries(badgeIds)) {
    const badge = document.getElementById(badgeId);
    if (badge) {
      console.log(`✅ Found badge: ${badgeId} (${type})`);
      console.log(`   - Visible: ${!badge.classList.contains('hidden')}`);
      console.log(`   - Text: ${badge.textContent}`);
      console.log(`   - Classes: ${badge.className}`);
      foundBadge = badge;
      accountType = type;
      break;
    }
  }

  if (!foundBadge) {
    console.error('❌ No badge element found! Checked:', Object.values(badgeIds));
    console.log('   Available elements with "notification" in ID:');
    document.querySelectorAll('[id*="notification"]').forEach(el => {
      console.log(`   - ${el.id}`);
    });
  }

  // 2. Check token
  console.log('\n2️⃣ Checking authentication token...');
  function getToken() {
    const localToken = localStorage.getItem('token');
    if (localToken) {
      console.log('✅ Token found in localStorage');
      return localToken;
    }
    
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
    if (tokenCookie) {
      console.log('✅ Token found in cookies');
      return tokenCookie.split('=')[1];
    }
    
    console.error('❌ No token found!');
    return null;
  }

  const token = getToken();
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('   - User ID:', payload.userId || payload.id);
        console.log('   - Role:', payload.role);
      }
    } catch (e) {
      console.error('   - Error parsing token:', e);
    }
  }

  // 3. Test unread count API
  console.log('\n3️⃣ Testing unread count API...');
  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : `${window.location.protocol}//${window.location.hostname}:3000/api`;

  async function testUnreadCount() {
    try {
      const response = await fetch(`${API_URL}/admin/public/announcements/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`   - Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Unread count API working!');
        console.log('   - Unread count:', data.unreadCount);
        return data.unreadCount;
      } else {
        const errorText = await response.text();
        console.error('❌ Unread count API error:', response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Unread count API request failed:', error);
      return null;
    }
  }

  // 4. Check Socket.IO connection
  console.log('\n4️⃣ Checking Socket.IO connection...');
  const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : `${window.location.protocol}//${window.location.hostname}:3000`;

  // Check if socket.io-client is loaded
  if (typeof io === 'undefined') {
    console.warn('⚠️ Socket.IO client not loaded. Checking if it can be imported...');
    import('socket.io-client').then(({ io }) => {
      console.log('✅ Socket.IO client can be imported');
      testSocketConnection(io);
    }).catch(err => {
      console.error('❌ Cannot import Socket.IO client:', err);
    });
  } else {
    console.log('✅ Socket.IO client is loaded');
    testSocketConnection(io);
  }

  async function testSocketConnection(ioClient) {
    if (!token) {
      console.error('❌ Cannot test Socket.IO: No token available');
      return;
    }

    try {
      console.log('   - Attempting to connect to:', SOCKET_URL);
      const testSocket = ioClient(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false
      });

      testSocket.on('connect', () => {
        console.log('✅ Socket.IO connected!');
        console.log('   - Socket ID:', testSocket.id);
        
        // Listen for announcement events
        testSocket.on('new_announcement', (data) => {
          console.log('📢 Received new_announcement event:', data);
        });

        testSocket.on('announcement_updated', (data) => {
          console.log('📢 Received announcement_updated event:', data);
        });

        testSocket.on('announcement_deleted', (data) => {
          console.log('📢 Received announcement_deleted event:', data);
        });

        testSocket.on('announcement_read', (data) => {
          console.log('📢 Received announcement_read event:', data);
        });

        testSocket.on('announcement_acknowledged', (data) => {
          console.log('📢 Received announcement_acknowledged event:', data);
        });

        // Test event after 2 seconds
        setTimeout(() => {
          console.log('\n   - Socket.IO connection test complete. Listening for events...');
          console.log('   - You can now create an announcement to test real-time updates');
        }, 2000);
      });

      testSocket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error.message);
        testSocket.disconnect();
      });

      testSocket.on('disconnect', (reason) => {
        console.log('⚠️ Socket.IO disconnected:', reason);
      });

    } catch (error) {
      console.error('❌ Socket.IO test failed:', error);
    }
  }

  // 5. Check if announcement notification badge script is loaded
  console.log('\n5️⃣ Checking if announcement notification badge script is initialized...');
  
  // Check window for any global state
  if (window.announcementNotificationBadgeInitialized) {
    console.log('✅ Announcement notification badge appears to be initialized');
  } else {
    console.warn('⚠️ Announcement notification badge initialization not detected');
    console.log('   - This might be normal if the script uses a different initialization method');
  }

  // 6. Check for custom events
  console.log('\n6️⃣ Setting up event listeners for debugging...');
  
  window.addEventListener('announcementUpdated', (e) => {
    console.log('📢 Custom event: announcementUpdated', e);
  });

  window.addEventListener('announcementRead', (e) => {
    console.log('📢 Custom event: announcementRead', e);
  });

  window.addEventListener('announcementAcknowledged', (e) => {
    console.log('📢 Custom event: announcementAcknowledged', e);
  });

  console.log('✅ Event listeners set up. These will log when events are dispatched.');

  // 7. Manual badge update test
  console.log('\n7️⃣ Testing manual badge update...');
  if (foundBadge && accountType) {
    const testUpdate = () => {
      const currentText = foundBadge.textContent;
      const currentCount = parseInt(currentText) || 0;
      foundBadge.textContent = (currentCount + 1).toString();
      foundBadge.classList.remove('hidden');
      console.log(`✅ Badge updated manually: ${currentCount} → ${currentCount + 1}`);
      console.log('   - Badge is now visible');
      
      setTimeout(() => {
        foundBadge.textContent = currentText;
        if (currentCount === 0) {
          foundBadge.classList.add('hidden');
        }
        console.log('   - Badge restored to original state');
      }, 3000);
    };

    console.log('   - Run testUpdate() in console to manually test badge update');
    window.testUpdate = testUpdate;
  }

  // 8. Run unread count test
  console.log('\n8️⃣ Fetching current unread count...');
  testUnreadCount().then(count => {
    if (count !== null && foundBadge) {
      console.log(`\n📊 Current unread count: ${count}`);
      if (count > 0) {
        console.log('⚠️ There are unread announcements, but badge might not be showing.');
        console.log('   - Checking if badge should be visible...');
        if (foundBadge.classList.contains('hidden')) {
          console.log('   - Badge is hidden. This might be the issue!');
          console.log('   - Try: document.getElementById("' + foundBadge.id + '").classList.remove("hidden")');
        }
      } else {
        console.log('✅ No unread announcements (count is 0)');
      }
    }
  });

  // Summary
  console.log('\n📋 DEBUG SUMMARY:');
  console.log('==================');
  console.log(`Badge Element: ${foundBadge ? '✅ Found' : '❌ Not Found'}`);
  console.log(`Token: ${token ? '✅ Available' : '❌ Missing'}`);
  console.log(`Account Type: ${accountType || '❓ Unknown'}`);
  console.log('\n💡 TIPS:');
  console.log('   - If badge is not found, check the topbar component');
  console.log('   - If token is missing, try logging in again');
  console.log('   - If Socket.IO fails, check backend server is running');
  console.log('   - Create an announcement and watch for Socket.IO events');
  console.log('   - Check browser Network tab for API calls');
  console.log('\n✅ Debug script complete! Check the logs above for issues.');

  // Export test functions
  window.debugAnnouncementNotifications = {
    testUnreadCount,
    testUpdate: foundBadge ? window.testUpdate : null,
    badge: foundBadge,
    accountType,
    API_URL,
    SOCKET_URL
  };

  console.log('\n💻 Available test functions:');
  console.log('   - debugAnnouncementNotifications.testUnreadCount()');
  if (window.testUpdate) {
    console.log('   - debugAnnouncementNotifications.testUpdate()');
  }
})();


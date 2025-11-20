// Test EIU Badge - Copy and paste this into EIU account console
console.log('🔍 Testing EIU Announcement Notification Badge...\n');

// 1. Check badge element
const badge = document.getElementById('eiu-notification-badge');
if (badge) {
  console.log('✅ Badge element found');
  console.log('   - Visible:', !badge.classList.contains('hidden'));
  console.log('   - Text:', badge.textContent);
  console.log('   - Classes:', badge.className);
} else {
  console.error('❌ Badge element NOT found!');
}

// 2. Check if script is initialized
if (window.announcementNotificationBadge) {
  console.log('\n✅ Announcement notification badge is initialized');
  console.log('   Account Type:', window.announcementNotificationBadge.accountType);
  console.log('   Badge ID:', window.announcementNotificationBadge.badgeId);
} else {
  console.log('\n⚠️ Announcement notification badge NOT initialized');
  console.log('   Check console for: "🔔 Initializing announcement notification badge for: eiu"');
}

// 3. Test API
const token = localStorage.getItem('token');
fetch('http://localhost:3000/api/admin/public/announcements/unread-count', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('\n📊 API Test:');
  console.log('   - Success:', data.success);
  console.log('   - Unread Count:', data.unreadCount);
  
  if (badge && data.unreadCount > 0) {
    badge.textContent = data.unreadCount;
    badge.classList.remove('hidden');
    console.log('   ✅ Badge manually updated!');
    console.log('   - Badge should now be visible');
  } else if (data.unreadCount === 0) {
    console.log('   ℹ️ No unread announcements (count is 0)');
  }
})
.catch(err => {
  console.error('   ❌ API Error:', err);
});

// 4. Check for Socket.IO connection messages
console.log('\n📋 Check console for:');
console.log('   - "🔔 Initializing announcement notification badge for: eiu"');
console.log('   - "✅ Announcement notification socket connected"');
console.log('   - "📢 Socket.IO: Received new_announcement event"');


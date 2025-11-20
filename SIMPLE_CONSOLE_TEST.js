// Simple Console Test - Copy and paste this into browser console
// This checks if the announcement notification badge is already working

console.log('🔍 Testing Announcement Notification Badge...\n');

// 1. Check if script is initialized
if (window.announcementNotificationBadge) {
  console.log('✅ Announcement notification badge is initialized');
  console.log('   Account Type:', window.announcementNotificationBadge.accountType);
  console.log('   Badge ID:', window.announcementNotificationBadge.badgeId);
} else {
  console.log('⚠️ Announcement notification badge not initialized yet');
  console.log('   Check console for initialization messages');
}

// 2. Check badge element
const badgeIds = ['sysadmin-notification-badge', 'iu-notification-badge', 'eiu-notification-badge', 
                  'secretariat-notification-badge', 'lgu-pmt-notification-badge', 'executive-notification-badge'];
let foundBadge = null;

for (const id of badgeIds) {
  const el = document.getElementById(id);
  if (el) {
    foundBadge = el;
    console.log(`\n✅ Found badge: ${id}`);
    console.log('   - Visible:', !el.classList.contains('hidden'));
    console.log('   - Text:', el.textContent);
    break;
  }
}

// 3. Test API
const token = localStorage.getItem('token');
const API_URL = 'http://localhost:3000/api';

fetch(`${API_URL}/admin/public/announcements/unread-count`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('\n📊 API Test:');
  console.log('   - Success:', data.success);
  console.log('   - Unread Count:', data.unreadCount);
  
  if (foundBadge && data.unreadCount > 0) {
    foundBadge.textContent = data.unreadCount;
    foundBadge.classList.remove('hidden');
    console.log('   ✅ Badge updated!');
  }
})
.catch(err => {
  console.error('   ❌ API Error:', err);
});

// 4. Instructions
console.log('\n📋 Next Steps:');
console.log('   1. Watch the console for Socket.IO connection messages');
console.log('   2. Look for: "✅ Announcement notification socket connected"');
console.log('   3. Create an announcement from System Admin');
console.log('   4. Watch for: "📢 Socket.IO: Received new_announcement event"');
console.log('   5. Badge should update automatically!');
console.log('\n💡 The script is already running - just watch the console!');


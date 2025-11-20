// ============================================
// ANNOUNCEMENT API DEBUGGING SCRIPT
// ============================================
// Copy and paste this ENTIRE script into your browser console
// Then press Enter to run it
// ============================================

(async () => {
  console.clear();
  console.log('%c🔍 ANNOUNCEMENT API DEBUGGING', 'font-size: 20px; font-weight: bold; color: #2563eb;');
  console.log('='.repeat(70));
  
  const API_BASE = 'http://localhost:3000/api';
  const ANNOUNCEMENT_ID = 8; // Change this if needed
  
  // Get token
  const token = localStorage.getItem('token') || document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  
  if (!token) {
    console.error('%c❌ No authentication token found!', 'color: red; font-weight: bold;');
    return;
  }
  
  console.log('%c✅ Token found', 'color: green;');
  console.log('Testing Announcement ID:', ANNOUNCEMENT_ID);
  console.log('-'.repeat(70));
  
  const test = async (name, endpoint, method = 'GET', body = null) => {
    try {
      const opts = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      if (body) opts.body = JSON.stringify(body);
      
      const res = await fetch(`${API_BASE}${endpoint}`, opts);
      const data = await res.json();
      
      if (res.ok) {
        console.log(`%c✅ ${name}: SUCCESS`, 'color: green; font-weight: bold;');
        console.log('Response:', data);
        return { success: true, data };
      } else {
        console.error(`%c❌ ${name}: FAILED (${res.status})`, 'color: red; font-weight: bold;');
        console.error('Error:', data);
        if (data.details) console.error('Details:', data.details);
        return { success: false, error: data, status: res.status };
      }
    } catch (err) {
      console.error(`%c❌ ${name}: EXCEPTION`, 'color: red; font-weight: bold;');
      console.error('Error:', err);
      return { success: false, exception: err };
    }
  };
  
  // Test sequence
  const results = {};
  
  results.announcement = await test('1. Get Announcement', `/admin/announcements/${ANNOUNCEMENT_ID}`);
  
  if (results.announcement.success) {
    results.comments = await test('2. Get Comments', `/admin/announcements/${ANNOUNCEMENT_ID}/comments`);
    results.reactions = await test('3. Get Reactions', `/admin/announcements/${ANNOUNCEMENT_ID}/reactions`);
    results.analytics = await test('4. Get Analytics', `/admin/announcements/${ANNOUNCEMENT_ID}/analytics`);
    results.readStatus = await test('5. Get Read Status', `/admin/announcements/${ANNOUNCEMENT_ID}/read-status`);
    results.favorite = await test('6. Get Favorite', `/admin/announcements/${ANNOUNCEMENT_ID}/favorite`);
    results.toggleReaction = await test('7. Toggle Reaction', `/admin/announcements/${ANNOUNCEMENT_ID}/reactions`, 'POST', { reactionType: 'helpful' });
  } else {
    console.error('%c⚠️  Cannot proceed - announcement not found', 'color: orange; font-weight: bold;');
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('%c📊 SUMMARY', 'font-size: 16px; font-weight: bold;');
  console.log('='.repeat(70));
  Object.entries(results).forEach(([key, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    console.log(`%c${key}: ${status}`, `color: ${color}; font-weight: bold;`);
  });
  
  // Recommendations
  console.log('\n' + '='.repeat(70));
  console.log('%c💡 NEXT STEPS', 'font-size: 16px; font-weight: bold;');
  console.log('='.repeat(70));
  console.log('1. Check backend server console for detailed error logs');
  console.log('2. Verify backend server is running: http://localhost:3000');
  console.log('3. Restart backend server to apply code changes');
  console.log('4. Check database tables exist:');
  console.log('   - announcement_comments');
  console.log('   - announcement_reactions');
  console.log('   - announcement_favorites');
  console.log('5. Verify Phase 3A migration was run successfully');
  
  console.log('\n%c✅ Debugging complete!', 'color: green; font-weight: bold;');
  console.log('Copy the error messages above and share them.');
})();


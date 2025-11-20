/**
 * Announcement API Debugging Script
 * 
 * Run this in the browser console to debug announcement API issues
 * Copy and paste the entire script into the console and press Enter
 */

(async function debugAnnouncementsAPI() {
  console.log('🔍 Starting Announcement API Debugging...\n');
  
  const API_BASE_URL = 'http://localhost:3000/api';
  const ANNOUNCEMENT_ID = 8; // Change this to test with a different announcement ID
  
  // Get authentication token
  const getToken = () => {
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
    return tokenCookie ? tokenCookie.split('=')[1] : '';
  };
  
  const token = getToken();
  
  if (!token) {
    console.error('❌ No authentication token found!');
    console.log('Please make sure you are logged in.');
    return;
  }
  
  console.log('✅ Authentication token found');
  console.log('📋 Testing with Announcement ID:', ANNOUNCEMENT_ID);
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('─'.repeat(60));
  
  // Helper function to make API calls
  const testEndpoint = async (method, endpoint, body = null) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      console.log(`\n📡 ${method} ${endpoint}`);
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Success:', data);
        return { success: true, data, response };
      } else {
        console.error('❌ Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        return { success: false, error: data, status: response.status, response };
      }
    } catch (error) {
      console.error('❌ Network/Parse Error:', error);
      return { success: false, error: error.message, exception: error };
    }
  };
  
  // Test 1: Check if announcement exists
  console.log('\n📌 TEST 1: Check if announcement exists');
  console.log('─'.repeat(60));
  const announcementCheck = await testEndpoint('GET', `/admin/announcements/${ANNOUNCEMENT_ID}`);
  
  if (!announcementCheck.success) {
    console.error('\n❌ Cannot proceed - announcement not found or inaccessible');
    return;
  }
  
  // Test 2: Get comments
  console.log('\n📌 TEST 2: Get Comments');
  console.log('─'.repeat(60));
  const commentsTest = await testEndpoint('GET', `/admin/announcements/${ANNOUNCEMENT_ID}/comments`);
  
  if (!commentsTest.success && commentsTest.status === 500) {
    console.error('\n🔍 Detailed Error Analysis for Comments:');
    console.log('Error Object:', commentsTest.error);
    if (commentsTest.error?.details) {
      console.log('Error Details:', commentsTest.error.details);
    }
  }
  
  // Test 3: Get reactions
  console.log('\n📌 TEST 3: Get Reactions');
  console.log('─'.repeat(60));
  const reactionsTest = await testEndpoint('GET', `/admin/announcements/${ANNOUNCEMENT_ID}/reactions`);
  
  if (!reactionsTest.success && reactionsTest.status === 500) {
    console.error('\n🔍 Detailed Error Analysis for Reactions:');
    console.log('Error Object:', reactionsTest.error);
    if (reactionsTest.error?.details) {
      console.log('Error Details:', reactionsTest.error.details);
    }
  }
  
  // Test 4: Get analytics
  console.log('\n📌 TEST 4: Get Analytics');
  console.log('─'.repeat(60));
  const analyticsTest = await testEndpoint('GET', `/admin/announcements/${ANNOUNCEMENT_ID}/analytics`);
  
  if (!analyticsTest.success && analyticsTest.status === 500) {
    console.error('\n🔍 Detailed Error Analysis for Analytics:');
    console.log('Error Object:', analyticsTest.error);
    if (analyticsTest.error?.details) {
      console.log('Error Details:', analyticsTest.error.details);
    }
  }
  
  // Test 5: Get read status
  console.log('\n📌 TEST 5: Get Read Status');
  console.log('─'.repeat(60));
  const readStatusTest = await testEndpoint('GET', `/admin/announcements/${ANNOUNCEMENT_ID}/read-status`);
  
  // Test 6: Check favorite status
  console.log('\n📌 TEST 6: Check Favorite Status');
  console.log('─'.repeat(60));
  const favoriteTest = await testEndpoint('GET', `/admin/announcements/${ANNOUNCEMENT_ID}/favorite`);
  
  // Test 7: Test toggle reaction (POST)
  console.log('\n📌 TEST 7: Toggle Reaction (POST)');
  console.log('─'.repeat(60));
  const toggleReactionTest = await testEndpoint('POST', `/admin/announcements/${ANNOUNCEMENT_ID}/reactions`, {
    reactionType: 'helpful'
  });
  
  if (!toggleReactionTest.success && toggleReactionTest.status === 500) {
    console.error('\n🔍 Detailed Error Analysis for Toggle Reaction:');
    console.log('Error Object:', toggleReactionTest.error);
    if (toggleReactionTest.error?.details) {
      console.log('Error Details:', toggleReactionTest.error.details);
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('Announcement Check:', announcementCheck.success ? '✅ PASS' : '❌ FAIL');
  console.log('Get Comments:', commentsTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('Get Reactions:', reactionsTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('Get Analytics:', analyticsTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('Get Read Status:', readStatusTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('Check Favorite:', favoriteTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('Toggle Reaction:', toggleReactionTest.success ? '✅ PASS' : '❌ FAIL');
  
  // Check backend server status
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 BACKEND SERVER CHECK');
  console.log('═'.repeat(60));
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Backend Health Check:', healthCheck.status === 200 ? '✅ Online' : '⚠️ Responding but may have issues');
  } catch (error) {
    console.error('❌ Backend server appears to be offline or unreachable');
    console.error('Error:', error.message);
    console.log('\n💡 TIP: Make sure the backend server is running on port 3000');
  }
  
  // Database connection check (if possible)
  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('═'.repeat(60));
  
  if (!commentsTest.success || !reactionsTest.success || !analyticsTest.success) {
    console.log('1. ⚠️  Check backend server logs for detailed error messages');
    console.log('2. 🔄 Restart the backend server to apply code changes');
    console.log('3. 🗄️  Verify database tables exist:');
    console.log('   - announcement_comments');
    console.log('   - announcement_reactions');
    console.log('   - announcement_favorites');
    console.log('   - read_receipts');
    console.log('4. 🔍 Check if migrations have been run:');
    console.log('   - Phase 3A migration (20251110000003-add-phase3a-engagement-features.js)');
    console.log('5. 📝 Check backend console for detailed error stack traces');
  }
  
  console.log('\n✅ Debugging complete!');
  console.log('Copy the error messages above and share them for further assistance.');
})();


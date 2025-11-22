/**
 * Profile API Debugging Script
 * Run this in the browser console to debug profile API issues
 * 
 * Usage: Copy and paste this entire script into browser console
 */

window.debugProfileAPI = function() {
  console.log('🔍 Profile API Debugger');
  console.log('==========================================\n');
  
  // Get current environment info
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const isProd = hostname !== 'localhost' && hostname !== '127.0.0.1';
  
  console.log('📊 Environment Info:');
  console.log(`   Hostname: ${hostname}`);
  console.log(`   Protocol: ${protocol}`);
  console.log(`   Is Production: ${isProd}`);
  
  // Calculate expected API URL
  const expectedApiUrl = isProd 
    ? `${protocol}//${hostname}/api`
    : 'http://localhost:3000/api';
  
  console.log(`   Expected API URL: ${expectedApiUrl}\n`);
  
  // Check localStorage
  console.log('📦 LocalStorage Check:');
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  console.log(`   Token: ${token ? 'Found (' + token.substring(0, 20) + '...)' : 'Not found'}`);
  console.log(`   User: ${user ? 'Found' : 'Not found'}`);
  if (user) {
    try {
      const userObj = JSON.parse(user);
      console.log(`   User ID: ${userObj.userId || userObj.id || 'N/A'}`);
      console.log(`   Email: ${userObj.email || 'N/A'}`);
      console.log(`   Profile Picture URL: ${userObj.profilePictureUrl ? userObj.profilePictureUrl.substring(0, 80) + '...' : 'None'}`);
      if (userObj.profilePictureUrl && userObj.profilePictureUrl.includes(':3000')) {
        console.log('   ⚠️  WARNING: Profile picture URL contains port 3000!');
      }
    } catch (e) {
      console.log('   ⚠️  Error parsing user data');
    }
  }
  console.log('');
  
  // Test API endpoints
  console.log('📡 Testing API Endpoints:');
  
  const testEndpoint = async (name, url) => {
    try {
      console.log(`   Testing ${name}...`);
      console.log(`   URL: ${url}`);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Cache-Control': 'no-cache'
        }
      });
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ ${name}: SUCCESS (${duration}ms)`);
        console.log(`   Status: ${response.status}`);
        if (data.success !== undefined) {
          console.log(`   Success: ${data.success}`);
        }
        return true;
      } else {
        console.log(`   ❌ ${name}: FAILED`);
        console.log(`   Status: ${response.status}`);
        const text = await response.text();
        console.log(`   Response: ${text.substring(0, 200)}...`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ ${name}: ERROR`);
      console.log(`   Error: ${error.message}`);
      if (error.message.includes('3000')) {
        console.log('   ⚠️  ERROR: URL contains port 3000 - this is the problem!');
        console.log(`   💡 Expected URL should be: ${expectedApiUrl}${url.split('/api')[1] || ''}`);
      }
      return false;
    }
  };
  
  // Run tests
  (async () => {
    const results = {
      health: await testEndpoint('Health Check', `${expectedApiUrl}/health`),
      profile: await testEndpoint('Profile', `${expectedApiUrl}/auth/profile`),
      profileCompletion: await testEndpoint('Profile Completion', `${expectedApiUrl}/auth/profile/completion`)
    };
    
    console.log('\n📋 Test Summary:');
    console.log('==========================================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    console.log('');
    
    // Check for hardcoded URLs in code
    console.log('🔍 Checking for hardcoded URLs:');
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let foundHardcoded = false;
    scripts.forEach(script => {
      if (script.src.includes(':3000') && !script.src.includes('localhost')) {
        console.log(`   ⚠️  Found script with port 3000: ${script.src}`);
        foundHardcoded = true;
      }
    });
    if (!foundHardcoded) {
      console.log('   ✅ No hardcoded URLs found in script tags');
    }
    console.log('');
    
    // Recommendations
    console.log('💡 Recommendations:');
    if (!results.profile || !results.profileCompletion) {
      console.log('   1. Check if frontend needs to be rebuilt');
      console.log('   2. Clear browser cache (Ctrl+Shift+R)');
      console.log('   3. Check backend logs: pm2 logs buildwatch-backend');
      console.log('   4. Verify Caddyfile has /api/* handle block');
    }
    if (user) {
      try {
        const userObj = JSON.parse(user);
        if (userObj.profilePictureUrl && userObj.profilePictureUrl.includes(':3000')) {
          console.log('   5. Profile picture URL in database has localhost:3000');
          console.log('      This will be normalized by the backend, but consider updating the database');
        }
      } catch (e) {}
    }
    console.log('');
  })();
};

// Auto-run if in console
if (typeof window !== 'undefined') {
  console.log('✅ Profile API Debugger loaded!');
  console.log('   Run: debugProfileAPI()');
  console.log('');
}


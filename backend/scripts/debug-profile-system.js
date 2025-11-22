#!/usr/bin/env node
/**
 * Profile System Debugging Script
 * 
 * This script helps diagnose profile system issues:
 * - Tests API endpoints
 * - Checks profile picture file existence
 * - Verifies Caddy routing
 * - Tests authentication
 * 
 * Run: node scripts/debug-profile-system.js [userId]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://www.build-watch.com';
const LOCAL_BACKEND = 'http://localhost:3000';
const TEST_USER_ID = process.argv[2] || 'SYS-AD-0001'; // Default to System Admin
const TEST_TOKEN = process.env.TEST_TOKEN || '';

console.log('🔍 Profile System Debugger');
console.log('==========================================\n');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Local Backend: ${LOCAL_BACKEND}`);
console.log(`Test User ID: ${TEST_USER_ID}`);
console.log(`Token: ${TEST_TOKEN ? 'Provided' : 'Not provided'}\n`);

// Helper to make HTTP/HTTPS requests
const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, {
      headers: {
        'Authorization': TEST_TOKEN ? `Bearer ${TEST_TOKEN}` : '',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Test 1: Check backend health
console.log('📡 Test 1: Checking backend health...');
const testBackendHealth = async () => {
  try {
    const result = await makeRequest(`${LOCAL_BACKEND}/api/health`);
    if (result.status === 200) {
      console.log('✅ Backend is healthy');
      console.log(`   Status: ${result.status}`);
      const healthData = JSON.parse(result.data);
      console.log(`   Environment: ${healthData.environment || 'unknown'}`);
      console.log(`   Database: ${healthData.database || 'unknown'}\n`);
      return true;
    } else {
      console.log(`❌ Backend returned status ${result.status}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Backend health check failed: ${error.message}\n`);
    return false;
  }
};

// Test 2: Check API through Caddy
console.log('📡 Test 2: Testing API endpoint through Caddy...');
const testApiThroughCaddy = async () => {
  try {
    const result = await makeRequest(`${BASE_URL}/api/health`);
    if (result.status === 200) {
      console.log('✅ API is accessible through Caddy');
      console.log(`   Status: ${result.status}\n`);
      return true;
    } else {
      console.log(`❌ API returned status ${result.status}`);
      console.log(`   Response: ${result.data.substring(0, 100)}...\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ API request failed: ${error.message}`);
    console.log(`   This might indicate Caddy routing issue\n`);
    return false;
  }
};

// Test 3: Test profile endpoint (requires token)
console.log('📡 Test 3: Testing profile endpoint...');
const testProfileEndpoint = async () => {
  if (!TEST_TOKEN) {
    console.log('⚠️  Skipping (no token provided)');
    console.log('   💡 Set TEST_TOKEN environment variable to test\n');
    return false;
  }

  try {
    // Test through Caddy
    const result = await makeRequest(`${BASE_URL}/api/auth/profile`);
    if (result.status === 200) {
      const data = JSON.parse(result.data);
      if (data.success && data.user) {
        console.log('✅ Profile endpoint working through Caddy');
        console.log(`   User: ${data.user.fullName || data.user.name || data.user.username}`);
        console.log(`   Email: ${data.user.email}`);
        console.log(`   Role: ${data.user.role}`);
        console.log(`   Profile Picture URL: ${data.user.profilePictureUrl ? data.user.profilePictureUrl.substring(0, 80) + '...' : 'None'}\n`);
        return true;
      } else {
        console.log(`❌ Profile endpoint returned invalid data`);
        console.log(`   Response: ${result.data.substring(0, 200)}...\n`);
        return false;
      }
    } else {
      console.log(`❌ Profile endpoint returned status ${result.status}`);
      console.log(`   Response: ${result.data.substring(0, 200)}...\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Profile endpoint request failed: ${error.message}\n`);
    return false;
  }
};

// Test 4: Test profile picture endpoint
console.log('📡 Test 4: Testing profile picture endpoint...');
const testProfilePictureEndpoint = async () => {
  try {
    const result = await makeRequest(`${BASE_URL}/api/profile/picture/${TEST_USER_ID}`);
    if (result.status === 200) {
      const data = JSON.parse(result.data);
      if (data.success) {
        console.log('✅ Profile picture endpoint working');
        console.log(`   Has picture: ${data.profilePictureUrl ? 'Yes' : 'No'}`);
        if (data.profilePictureUrl) {
          console.log(`   URL: ${data.profilePictureUrl.substring(0, 100)}...`);
          // Check if URL has port 3000
          if (data.profilePictureUrl.includes(':3000')) {
            console.log('   ⚠️  WARNING: URL contains port 3000 (should be removed in production)');
          }
        }
        console.log('');
        return true;
      } else {
        console.log(`❌ Profile picture endpoint returned error`);
        console.log(`   Response: ${result.data.substring(0, 200)}...\n`);
        return false;
      }
    } else {
      console.log(`❌ Profile picture endpoint returned status ${result.status}`);
      console.log(`   Response: ${result.data.substring(0, 200)}...\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Profile picture endpoint request failed: ${error.message}\n`);
    return false;
  }
};

// Test 5: Check uploads directory
console.log('📡 Test 5: Checking uploads directory...');
const testUploadsDirectory = async () => {
  const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      console.log(`❌ Uploads directory does not exist: ${uploadsDir}`);
      console.log(`   💡 Create it with: mkdir -p ${uploadsDir}\n`);
      return false;
    }

    const files = fs.readdirSync(uploadsDir);
    console.log(`✅ Uploads directory exists: ${uploadsDir}`);
    console.log(`   Files found: ${files.length}`);
    
    if (files.length > 0) {
      console.log(`   Sample files:`);
      files.slice(0, 5).forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`     - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
      if (files.length > 5) {
        console.log(`     ... and ${files.length - 5} more`);
      }
    }
    console.log('');
    return true;
  } catch (error) {
    console.log(`❌ Error checking uploads directory: ${error.message}\n`);
    return false;
  }
};

// Test 6: Test uploads route through Caddy
console.log('📡 Test 6: Testing uploads route through Caddy...');
const testUploadsRoute = async () => {
  // Try to access a test file (if any exists)
  const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');
  
  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      if (files.length > 0) {
        const testFile = files[0];
        const testUrl = `${BASE_URL}/uploads/profile-pictures/${testFile}`;
        
        try {
          const result = await makeRequest(testUrl);
          if (result.status === 200) {
            console.log(`✅ Uploads route working through Caddy`);
            console.log(`   Test file: ${testFile}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Content-Type: ${result.headers['content-type']}\n`);
            return true;
          } else {
            console.log(`❌ Uploads route returned status ${result.status}`);
            console.log(`   URL: ${testUrl}`);
            console.log(`   💡 Check Caddyfile has /uploads/* handle block\n`);
            return false;
          }
        } catch (error) {
          console.log(`❌ Uploads route request failed: ${error.message}`);
          console.log(`   URL: ${testUrl}`);
          console.log(`   💡 Check Caddyfile has /uploads/* handle block\n`);
          return false;
        }
      } else {
        console.log('⚠️  No files in uploads directory to test\n');
        return true;
      }
    } else {
      console.log('⚠️  Uploads directory does not exist\n');
      return false;
    }
  } catch (error) {
    console.log(`❌ Error testing uploads route: ${error.message}\n`);
    return false;
  }
};

// Test 7: Check for hardcoded URLs in database
console.log('📡 Test 7: Checking database for hardcoded localhost URLs...');
const testDatabaseUrls = async () => {
  try {
    const { User, sequelize } = require('../models');
    
    // Find users with localhost:3000 in profilePictureUrl
    const users = await User.findAll({
      where: {
        profilePictureUrl: {
          [require('sequelize').Op.like]: '%localhost:3000%'
        }
      },
      attributes: ['id', 'userId', 'email', 'profilePictureUrl'],
      limit: 10
    });

    if (users.length > 0) {
      console.log(`⚠️  Found ${users.length} users with localhost:3000 in profilePictureUrl:`);
      users.forEach(user => {
        console.log(`   - ${user.userId || user.email}: ${user.profilePictureUrl}`);
      });
      console.log(`   💡 These URLs will be normalized when returned, but consider updating them in the database\n`);
    } else {
      console.log('✅ No users found with localhost:3000 in profilePictureUrl\n');
    }
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.log(`⚠️  Could not check database: ${error.message}`);
    console.log(`   (This is okay if database connection fails)\n`);
    return false;
  }
};

// Run all tests
async function runTests() {
  const results = {
    backendHealth: await testBackendHealth(),
    apiThroughCaddy: await testApiThroughCaddy(),
    profileEndpoint: await testProfileEndpoint(),
    profilePictureEndpoint: await testProfilePictureEndpoint(),
    uploadsDirectory: await testUploadsDirectory(),
    uploadsRoute: await testUploadsRoute(),
    databaseUrls: await testDatabaseUrls()
  };

  console.log('📋 Test Summary:');
  console.log('==========================================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  console.log('');

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('✅ All tests passed!\n');
  } else {
    console.log('❌ Some tests failed. Review the output above.\n');
    console.log('📋 Troubleshooting steps:');
    console.log('   1. Check backend is running: pm2 status');
    console.log('   2. Check Caddy is running: sudo systemctl status caddy');
    console.log('   3. Verify Caddyfile: sudo cat /etc/caddy/Caddyfile | grep -A 5 uploads');
    console.log('   4. Check backend logs: pm2 logs buildwatch-backend --lines 50');
    console.log('   5. Check Caddy logs: sudo journalctl -u caddy -f');
    console.log('   6. Verify uploads directory exists and has correct permissions');
    console.log('   7. Test with a valid token: TEST_TOKEN=your-token node scripts/debug-profile-system.js\n');
  }

  process.exit(allPassed ? 0 : 1);
}

runTests();


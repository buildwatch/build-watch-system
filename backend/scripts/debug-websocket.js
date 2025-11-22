#!/usr/bin/env node
/**
 * WebSocket/Socket.IO Connection Debugging Script
 * 
 * This script tests the WebSocket connection to help diagnose 502 errors
 * Run: node scripts/debug-websocket.js
 */

const http = require('http');
const https = require('https');

// Try to load socket.io-client, but make it optional
let io = null;
try {
  io = require('socket.io-client').io;
} catch (e) {
  console.log('⚠️  socket.io-client not installed - Socket.IO connection test will be skipped');
  console.log('   Install it with: npm install socket.io-client\n');
}

// Configuration
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-token'; // You'll need a real token

console.log('🔍 WebSocket/Socket.IO Connection Debugger');
console.log('==========================================\n');

// Test 1: Check if backend is running
console.log('📡 Test 1: Checking if backend is accessible...');
const testBackend = () => {
  return new Promise((resolve, reject) => {
    const url = new URL(SOCKET_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(`${SOCKET_URL}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Backend is accessible');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 100)}...\n`);
          resolve(true);
        } else {
          console.log(`❌ Backend returned status ${res.statusCode}`);
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Cannot connect to backend: ${err.message}`);
      console.log(`   URL: ${SOCKET_URL}`);
      console.log(`   Make sure the backend is running on port 3000\n`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
  });
};

// Test 2: Check Socket.IO endpoint
console.log('📡 Test 2: Checking Socket.IO endpoint...');
const testSocketIOEndpoint = () => {
  return new Promise((resolve, reject) => {
    const url = new URL(SOCKET_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(`${SOCKET_URL}/socket.io/?EIO=4&transport=polling`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers:`, res.headers);
        if (res.statusCode === 200 || res.statusCode === 400) {
          // 400 is expected if no auth token, but means endpoint exists
          console.log('✅ Socket.IO endpoint is accessible');
          console.log(`   Response preview: ${data.substring(0, 100)}...\n`);
          resolve(true);
        } else {
          console.log(`❌ Socket.IO endpoint returned status ${res.statusCode}`);
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Cannot connect to Socket.IO endpoint: ${err.message}\n`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
  });
};

// Test 3: Try Socket.IO connection
console.log('📡 Test 3: Attempting Socket.IO connection...');
const testSocketIOConnection = () => {
  return new Promise((resolve, reject) => {
    if (!io) {
      console.log('   ⚠️  Skipping Socket.IO connection test (socket.io-client not available)');
      console.log('   💡 Install socket.io-client to test full connection:');
      console.log('      npm install socket.io-client\n');
      resolve(true);
      return;
    }

    console.log(`   Connecting to: ${SOCKET_URL}`);
    console.log(`   Path: /socket.io`);
    console.log(`   Transport: websocket, polling\n`);

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: {
        token: TEST_TOKEN
      },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 10000
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout after 10 seconds'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Socket.IO connected successfully!');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      socket.disconnect();
      resolve(true);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Socket.IO connection error:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Type: ${error.type || 'unknown'}`);
      console.log(`   Description: ${error.description || 'none'}`);
      
      if (error.message.includes('Authentication')) {
        console.log('\n   💡 This is an authentication error - the token might be invalid');
        console.log('   💡 Try setting TEST_TOKEN environment variable with a valid JWT token');
      }
      
      socket.disconnect();
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`   Disconnected: ${reason}`);
    });
  });
};

// Test 4: Check Caddy reverse proxy (if applicable)
console.log('📡 Test 4: Checking reverse proxy configuration...');
const testReverseProxy = () => {
  return new Promise((resolve) => {
    if (SOCKET_URL.includes('localhost') || SOCKET_URL.includes('127.0.0.1')) {
      console.log('   ⚠️  Testing direct connection (not through reverse proxy)');
      console.log('   💡 For production, test with: SOCKET_URL=https://www.build-watch.com node scripts/debug-websocket.js\n');
      resolve(true);
      return;
    }

    console.log(`   Testing reverse proxy at: ${SOCKET_URL}`);
    console.log('   💡 Make sure Caddy is configured with:');
    console.log('      - handle /socket.io/* before /api/*');
    console.log('      - header_up Connection {>Connection}');
    console.log('      - header_up Upgrade {>Upgrade}');
    console.log('      - transport http { versions h2c 1.1 }\n');
    resolve(true);
  });
};

// Run all tests
async function runTests() {
  try {
    await testBackend();
    await testSocketIOEndpoint();
    await testReverseProxy();
    
    // Only test connection if we have socket.io-client and a valid token
    if (io && TEST_TOKEN && TEST_TOKEN !== 'test-token') {
      await testSocketIOConnection();
    } else {
      if (!io) {
        console.log('⚠️  Skipping Socket.IO connection test (socket.io-client not installed)');
      } else {
        console.log('⚠️  Skipping Socket.IO connection test (no valid token)');
        console.log('   💡 To test connection, set TEST_TOKEN environment variable:');
        console.log('      TEST_TOKEN=your-jwt-token node scripts/debug-websocket.js');
      }
      console.log('');
    }

    console.log('✅ All tests completed!\n');
    console.log('📋 Next steps if you see errors:');
    console.log('   1. Check backend logs: pm2 logs buildwatch-backend');
    console.log('   2. Check Caddy logs: sudo journalctl -u caddy -f');
    console.log('   3. Verify Caddyfile has /socket.io/* handle block');
    console.log('   4. Restart backend: pm2 restart buildwatch-backend');
    console.log('   5. Reload Caddy: sudo systemctl reload caddy\n');

  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}\n`);
    process.exit(1);
  }
}

runTests();


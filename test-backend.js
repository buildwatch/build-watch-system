const fetch = require('node-fetch');

async function testBackend() {
  try {
    console.log('Testing backend connection...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3000/api/health');
    console.log('Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health check response:', healthData);
    }
    
    // Test profile endpoint
    const profileResponse = await fetch('http://localhost:3000/api/profile/picture/test');
    console.log('Profile endpoint status:', profileResponse.status);
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('Profile endpoint response:', profileData);
    }
    
  } catch (error) {
    console.error('Backend test failed:', error.message);
    console.log('\nPossible solutions:');
    console.log('1. Make sure the backend server is running on port 3000');
    console.log('2. Check if there are any firewall or network issues');
    console.log('3. Verify the backend server.js file is properly configured');
  }
}

testBackend();

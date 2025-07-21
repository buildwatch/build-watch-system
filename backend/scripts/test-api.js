const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Testing Build Watch LGU Backend API...');
  console.log('⏰ Start time:', new Date().toISOString());
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Login with sample user
    console.log('\n2️⃣ Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'juan.pmt',
      password: 'password123'
    });
    console.log('✅ Login successful:', {
      success: loginResponse.data.success,
      user: loginResponse.data.user?.name,
      role: loginResponse.data.user?.role
    });
    
    const token = loginResponse.data.token;
    
    // Test 3: Get user profile
    console.log('\n3️⃣ Testing get profile...');
    const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile retrieved:', {
      name: profileResponse.data.user?.name,
      role: profileResponse.data.user?.role
    });
    
    // Test 4: Get projects
    console.log('\n4️⃣ Testing get projects...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Projects retrieved:', {
      count: projectsResponse.data.projects?.length,
      firstProject: projectsResponse.data.projects?.[0]?.name
    });
    
    // Test 5: Get users (admin only)
    console.log('\n5️⃣ Testing get users (admin)...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Users retrieved:', {
        count: usersResponse.data.users?.length
      });
    } catch (error) {
      console.log('⚠️ Users endpoint access denied (expected for non-admin)');
    }
    
    // Test 6: Logout
    console.log('\n6️⃣ Testing logout...');
    const logoutResponse = await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Logout successful');
    
    console.log('\n🎉 All API tests completed successfully!');
    console.log('📋 Backend API is working correctly');
    
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
    console.error('🔍 Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = testAPI; 
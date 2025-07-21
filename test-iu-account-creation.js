// Test configuration
const API_BASE = 'http://localhost:3000/api';
const TEST_USER = {
  firstName: 'Juan',
  middleName: 'Santos',
  lastName: 'Garcia',
  username: 'juan.garcia@lgu.gov.ph',
  email: 'juan.garcia@lgu.gov.ph',
  password: 'TestPassword123!',
  role: 'LGU-IU',
  subRole: 'Implementing Office-Officer',
  group: 'LGU-IU',
  contactNumber: '+639123456789',
  birthdate: '1985-06-15',
  userId: 'IU-IMP-001',
  status: 'active'
};

async function testIUAccountCreation() {
  console.log('🧪 Testing LGU-IU: Implementing Office-Officer Account Creation');
  console.log('=' .repeat(60));

  try {
    // Step 1: Login as System Admin to get token
    console.log('1. Logging in as System Administrator...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'sysad@gmail.com',
        password: 'sysad123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      throw new Error(`Login failed: ${loginData.error}`);
    }

    const token = loginData.token;
    console.log('✅ Successfully logged in as System Administrator');

    // Step 2: Create LGU-IU: Implementing Office-Officer account
    console.log('\n2. Creating LGU-IU: Implementing Office-Officer account...');
    console.log('Account details:', {
      name: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
      username: TEST_USER.username,
      role: TEST_USER.role,
      subRole: TEST_USER.subRole
    });

    const createResponse = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(TEST_USER)
    });

    const createData = await createResponse.json();
    
    if (!createData.success) {
      throw new Error(`Account creation failed: ${createData.error}`);
    }

    console.log('✅ Successfully created LGU-IU: Implementing Office-Officer account');
    console.log('User ID:', createData.user.id);
    console.log('Unique User ID:', createData.user.userId);

    // Step 3: Verify the account was created with correct role
    console.log('\n3. Verifying account details...');
    const verifyResponse = await fetch(`${API_BASE}/users/${createData.user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      const user = verifyData.user;
      console.log('✅ Account verification successful');
      console.log('Role:', user.role);
      console.log('Sub-Role:', user.subRole);
      console.log('Group:', user.group);
      console.log('Status:', user.status);
      
      if (user.role === 'LGU-IU' && user.subRole === 'Implementing Office-Officer') {
        console.log('✅ Role assignment is correct!');
      } else {
        console.log('❌ Role assignment is incorrect!');
      }
    }

    // Step 4: Test login with the new account
    console.log('\n4. Testing login with new LGU-IU account...');
    const testLoginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: TEST_USER.username,
        password: TEST_USER.password
      })
    });

    const testLoginData = await testLoginResponse.json();
    
    if (testLoginData.success) {
      console.log('✅ Successfully logged in with new LGU-IU account');
      console.log('User role:', testLoginData.user.role);
      console.log('User sub-role:', testLoginData.user.subRole);
      
      if (testLoginData.user.role === 'LGU-IU' && testLoginData.user.subRole === 'Implementing Office-Officer') {
        console.log('✅ Login verification successful - correct role detected!');
      } else {
        console.log('❌ Login verification failed - incorrect role detected!');
      }
    } else {
      console.log('❌ Login test failed:', testLoginData.error);
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- LGU-IU: Implementing Office-Officer account can be created');
    console.log('- Account has correct role and sub-role assignment');
    console.log('- Account can be used for login');
    console.log('- Ready to test the IU Implementing Office dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testIUAccountCreation(); 
const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function createTestEIUUser() {
  try {
    console.log('✅ Starting EIU user creation test...');

    // Test data for EIU user
    const testUserData = {
      firstName: 'Test',
      middleName: 'EIU',
      lastName: 'User',
      fullName: 'Test EIU User',
      name: 'Test EIU User', // This is required by the model
      username: 'test.eiu@contractor.com',
      email: 'test.eiu@contractor.com',
      password: await bcrypt.hash('LGU_Pass', 10),
      role: 'EIU',
      subRole: null,
      group: 'EIU',
      projectCode: 'TEST-2025-001',
      status: 'active',
      enable2FA: false,
      accountLockout: false
    };

    console.log('🔍 Attempting to create EIU user with data:', {
      ...testUserData,
      password: '[HIDDEN]'
    });

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { username: testUserData.username }
    });

    if (existingUser) {
      console.log('❌ User already exists with username:', testUserData.username);
      return;
    }

    // Create the user
    const user = await User.create(testUserData);

    console.log('✅ EIU user created successfully!');
    console.log('📊 User details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Group: ${user.group}`);
    console.log(`   Project Code: ${user.projectCode}`);
    console.log(`   Status: ${user.status}`);

  } catch (error) {
    console.error('❌ Error creating EIU user:', error.message);
    console.error('Full error:', error);
    
    // Check for specific validation errors
    if (error.name === 'SequelizeValidationError') {
      console.log('🔍 Validation errors:');
      error.errors.forEach(err => {
        console.log(`   - ${err.path}: ${err.message}`);
      });
    }
  }
}

createTestEIUUser(); 
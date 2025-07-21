const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function createProperEIUUser() {
  try {
    console.log('✅ Creating proper EIU user with complete profile information...');

    // Complete EIU user data that will reflect in the Profile module
    const eiuUserData = {
      // Name fields (will be used in Profile)
      firstName: 'Harold Jhony',
      middleName: 'Sins',
      lastName: 'Degala',
      fullName: 'Harold Jhony Sins Degala',
      name: 'Harold Jhony Sins Degala', // Required by backend model
      
      // Credentials (for login)
      username: 'harold@gmail.com', // Email as username
      email: 'harold@gmail.com', // Contact email
      password: await bcrypt.hash('LGU_Pass', 10), // Default password
      
      // Profile information
      birthdate: '2000-01-01',
      userId: 'EIU-2025-001', // Auto-generated or assigned
      
      // Role and group information
      role: 'EIU',
      subRole: null, // EIU Member doesn't have sub-role
      group: 'EIU',
      
      // Project assignment
      projectCode: 'Sample-1111',
      
      // Additional profile fields
      department: 'External Implementing Unit',
      position: 'Project Manager',
      contactNumber: '+63 912 345 6789',
      address: '123 Business District, Santa Cruz, Laguna',
      
      // Account settings
      status: 'active',
      enable2FA: false,
      accountLockout: false
    };

    console.log('🔍 Attempting to create EIU user with complete profile data...');

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { username: eiuUserData.username }
    });

    if (existingUser) {
      console.log('❌ User already exists with username:', eiuUserData.username);
      console.log('📊 Existing user details:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Status: ${existingUser.status}`);
      return;
    }

    // Create the user
    const user = await User.create(eiuUserData);

    console.log('✅ EIU user created successfully!');
    console.log('📊 Complete user profile:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Full Name: ${user.fullName}`);
    console.log(`   Username: ${user.username} (for login)`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Group: ${user.group}`);
    console.log(`   Project Code: ${user.projectCode}`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Birthdate: ${user.birthdate}`);
    console.log(`   Department: ${user.department}`);
    console.log(`   Position: ${user.position}`);
    console.log(`   Contact: ${user.contactNumber}`);
    console.log(`   Address: ${user.address}`);
    console.log(`   Status: ${user.status}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: LGU_Pass`);
    console.log(`   Login URL: /login/lgu-pmt`);
    
    console.log('\n📋 This information will be displayed in the EIU Personnel Profile module:');
    console.log('   - First Name, Middle Name, Last Name → Full Name');
    console.log('   - Username (Email) → for login');
    console.log('   - Contact Email → for communications');
    console.log('   - Birthday → for profile');
    console.log('   - User ID → for identification');
    console.log('   - Group: EIU → role classification');
    console.log('   - Role: Member → specific role');
    console.log('   - Project Code → assigned project');

  } catch (error) {
    console.error('❌ Error creating EIU user:', error.message);
    
    // Check for specific validation errors
    if (error.name === 'SequelizeValidationError') {
      console.log('🔍 Validation errors:');
      error.errors.forEach(err => {
        console.log(`   - ${err.path}: ${err.message}`);
      });
    }
  }
}

createProperEIUUser(); 
const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const db = require('../models');

async function createSystemAdminAccount() {
  try {
    console.log('🔧 Creating System Administrator Account...');
    console.log('='.repeat(50));

    // Check if admin account already exists
    const existingAdmin = await User.findOne({
      where: { username: 'sysadmin' }
    });

    if (existingAdmin) {
      console.log('⚠️  System Administrator account already exists');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Status: ${existingAdmin.status}`);
      return existingAdmin;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('BuildWatch2025!', 12);

    // Create System Administrator account
    const adminUser = await User.create({
      name: 'System Administrator',
      username: 'sysadmin',
      email: 'sysadmin@santacruz.gov.ph',
      password: hashedPassword,
      role: 'SYS.AD',
      subRole: 'System Administrator',
      status: 'active',
      idType: 'LGU Personnel ID',
      idNumber: 'SYSAD-001',
      group: 'System Administration',
      department: 'Information Technology',
      position: 'System Administrator',
      contactNumber: '+63-XXX-XXX-XXXX',
      address: 'LGU Santa Cruz, Laguna'
    });

    // Log the creation
    await ActivityLog.create({
      userId: adminUser.id,
      action: 'CREATE_SYSTEM_ADMIN',
      entityType: 'User',
      entityId: adminUser.id,
      details: 'System Administrator account created during system initialization',
      ipAddress: '127.0.0.1',
      userAgent: 'System Initialization Script'
    });

    console.log('✅ System Administrator Account Created Successfully!');
    console.log('='.repeat(50));
    console.log('📋 Account Details:');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Sub-Role: ${adminUser.subRole}`);
    console.log(`   Status: ${adminUser.status}`);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log(`   Username: sysadmin`);
    console.log(`   Password: BuildWatch2025!`);
    console.log('');
    console.log('🛡️ Privileges:');
    console.log('   ✅ Create and manage all user accounts');
    console.log('   ✅ Assign roles and permissions');
    console.log('   ✅ Reset or deactivate accounts');
    console.log('   ✅ View full audit logs');
    console.log('   ✅ Access SYS.AD dashboard');
    console.log('   ✅ Cannot be deleted by other users');
    console.log('');
    console.log('⚠️  IMPORTANT: Change password after first login!');

    return adminUser;

  } catch (error) {
    console.error('❌ Error creating System Administrator account:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  createSystemAdminAccount()
    .then(() => {
      console.log('🎉 System Administrator setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 System Administrator setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createSystemAdminAccount }; 
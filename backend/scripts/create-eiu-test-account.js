const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');

async function createEIUTestAccount() {
  try {
    console.log('🔧 Creating EIU test account...');

    // Check if EIU test account already exists
    const existingUser = await User.findOne({
      where: { username: 'eiu_test' }
    });

    if (existingUser) {
      console.log('⚠️  EIU test account already exists!');
      console.log('Username: eiu_test');
      console.log('Password: eiu123456');
      console.log('Role: EIU');
      console.log('Status: Active');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('eiu123456', 10);

    // Create EIU test user
    const eiuUser = await User.create({
      name: 'Engr. Roberto Garcia',
      username: 'eiu_test',
      email: 'eiu_test@santacruz.gov.ph',
      password: hashedPassword,
      role: 'EIU',
      subRole: 'Project Engineer',
      idType: 'Government ID',
      idNumber: 'EIU-2025-001',
      group: 'External Implementing Unit',
      department: 'Engineering Department',
      position: 'Project Engineer',
      contactNumber: '+63 912 345 6789',
      address: '123 Engineering St., Santa Cruz, Laguna',
      status: 'active'
    });

    // Log activity
    await ActivityLog.create({
      userId: eiuUser.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: eiuUser.id,
      details: `Created EIU test account: ${eiuUser.name} (${eiuUser.username})`,
      ipAddress: '127.0.0.1',
      userAgent: 'EIU Test Account Creation Script'
    });

    console.log('✅ EIU test account created successfully!');
    console.log('');
    console.log('📋 EIU Test Account Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Name: Engr. Roberto Garcia');
    console.log('🔑 Username: eiu_test');
    console.log('🔒 Password: eiu123456');
    console.log('📧 Email: eiu_test@santacruz.gov.ph');
    console.log('🏢 Role: EIU (External Implementing Unit)');
    console.log('👨‍💼 Position: Project Engineer');
    console.log('📞 Contact: +63 912 345 6789');
    console.log('📍 Address: 123 Engineering St., Santa Cruz, Laguna');
    console.log('✅ Status: Active');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🚀 You can now test the EIU dashboard with these credentials!');
    console.log('🌐 Login URL: http://localhost:4322/login');
    console.log('📊 Dashboard URL: http://localhost:4322/dashboard/eiu');

  } catch (error) {
    console.error('❌ Error creating EIU test account:', error);
    process.exit(1);
  }
}

// Run the script
createEIUTestAccount()
  .then(() => {
    console.log('🎉 EIU test account setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 
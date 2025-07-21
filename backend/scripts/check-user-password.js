const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function checkUserPassword() {
  try {
    console.log('🔍 Checking user password for mswdopartner2@gmail.com...');

    // Find the user
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: 'mswdopartner2@gmail.com' },
          { email: 'mswdopartner2@gmail.com' }
        ]
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('ID:', user.id);
    console.log('Name:', user.name);
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.status);

    // Test common passwords
    const commonPasswords = [
      'password123',
      'password',
      '123456',
      'admin123',
      'test123',
      'user123',
      'mswdo123',
      'mswdo2025',
      'partner123',
      'partner2025'
    ];

    console.log('\n🔐 Testing common passwords...');
    
    for (const password of commonPasswords) {
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) {
        console.log(`✅ Password found: ${password}`);
        return;
      }
    }

    console.log('❌ None of the common passwords worked');
    console.log('💡 You may need to reset the password using the reset script');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserPassword()
  .then(() => {
    console.log('🎉 Password check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 
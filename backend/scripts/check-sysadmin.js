const { User } = require('../models');

async function checkSysAdminUsers() {
  try {
    console.log('🔍 Checking SYS.AD users in database...');
    
    const sysAdminUsers = await User.findAll({
      where: { role: 'SYS.AD' },
      attributes: ['id', 'username', 'name', 'email', 'role', 'subRole', 'status']
    });
    
    console.log(`\n📊 Found ${sysAdminUsers.length} SYS.AD users:`);
    
    if (sysAdminUsers.length === 0) {
      console.log('❌ No SYS.AD users found!');
    } else {
      sysAdminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} - ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}, SubRole: ${user.subRole}, Status: ${user.status}`);
      });
    }
    
    // Also check for any user with 'sysadmin' username
    const sysadminUser = await User.findOne({
      where: { username: 'sysadmin' }
    });
    
    console.log('\n🔍 Checking for username "sysadmin":');
    if (sysadminUser) {
      console.log(`✅ Found: ${sysadminUser.username} - ${sysadminUser.name} (${sysadminUser.role})`);
    } else {
      console.log('❌ No user with username "sysadmin" found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSysAdminUsers(); 
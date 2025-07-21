const { User } = require('../models');

async function verifyUsers() {
  try {
    console.log('🔍 Verifying LGU User Accounts...');
    console.log('='.repeat(60));

    // Get all users
    const users = await User.findAll({
      order: [['role', 'ASC'], ['name', 'ASC']]
    });

    console.log(`📊 Total users in database: ${users.length}`);

    // Group users by role
    const userGroups = {};
    users.forEach(user => {
      if (!userGroups[user.role]) {
        userGroups[user.role] = [];
      }
      userGroups[user.role].push(user);
    });

    // Display users by group
    Object.entries(userGroups).forEach(([role, roleUsers]) => {
      console.log(`\n👥 ${role} (${roleUsers.length} users):`);
      console.log('-'.repeat(40));
      
      roleUsers.forEach(user => {
        console.log(`  • ${user.name}`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Role: ${user.subRole}`);
        console.log(`    Department: ${user.department || 'N/A'}`);
        console.log(`    Status: ${user.status}`);
        console.log('');
      });
    });

    // Summary
    console.log('📋 User Summary by Role:');
    console.log('='.repeat(40));
    Object.entries(userGroups).forEach(([role, roleUsers]) => {
      const activeUsers = roleUsers.filter(u => u.status === 'active').length;
      console.log(`  ${role}: ${roleUsers.length} total, ${activeUsers} active`);
    });

    console.log('\n✅ User verification completed!');
    console.log('🚀 All users are ready for login testing.');

    return users;

  } catch (error) {
    console.error('❌ Error verifying users:', error.message);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  verifyUsers()
    .then(() => {
      console.log('\n🎉 User verification successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 User verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyUsers }; 
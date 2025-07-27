const { User, sequelize } = require('./models');

async function checkAllUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'name', 'username', 'role', 'email'],
      order: [['role', 'ASC'], ['name', 'ASC']]
    });

    console.log('\n👥 ALL USERS IN DATABASE:');
    console.log('='.repeat(80));
    
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    Object.keys(usersByRole).forEach(role => {
      console.log(`\n📋 ${role.toUpperCase()} USERS (${usersByRole[role].length}):`);
      console.log('-'.repeat(50));
      usersByRole[role].forEach(user => {
        console.log(`  ${user.name} (${user.username}) - ID: ${user.id}`);
      });
    });

    // Check specifically for Implementing Office users
    const implementingOfficeUsers = users.filter(u => u.role === 'iu-implementing-office');
    console.log(`\n🎯 IMPLEMENTING OFFICE USERS: ${implementingOfficeUsers.length}`);
    if (implementingOfficeUsers.length === 0) {
      console.log('❌ NO IMPLEMENTING OFFICE USERS FOUND!');
      console.log('This is why the EIU Activity Feed is not working.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkAllUsers(); 
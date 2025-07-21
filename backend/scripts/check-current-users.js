const { User } = require('../models');

async function checkUsers() {
  try {
    const users = await User.findAll();
    console.log('Current users and roles:');
    users.forEach(user => {
      console.log(`${user.username}: ${user.role}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers(); 
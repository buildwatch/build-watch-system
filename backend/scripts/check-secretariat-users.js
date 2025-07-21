const db = require('../models');
const { User } = db;

async function checkSecretariatUsers() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');

    const users = await User.findAll({
      where: { role: 'LGU-PMT' }
    });

    console.log('\n=== LGU-PMT Users ===');
    users.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`SubRole: ${user.subRole}`);
      console.log(`Group: ${user.group}`);
      console.log('---');
    });

    // Check specifically for Secretariat users
    const secretariatUsers = await User.findAll({
      where: { 
        role: 'LGU-PMT',
        subRole: 'Secretariat'
      }
    });

    console.log('\n=== Secretariat Users ===');
    secretariatUsers.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`SubRole: ${user.subRole}`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSecretariatUsers(); 
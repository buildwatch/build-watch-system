const { User } = require('./models');
const { Sequelize } = require('sequelize');
const config = require('./config/database');

const sequelize = new Sequelize(config.development);

async function checkSecretariatUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find Secretariat users
    const secretariatUsers = await User.findAll({
      where: {
        role: 'LGU-PMT',
        subRole: {
          [require('sequelize').Op.like]: '%Secretariat%'
        }
      },
      attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
    });

    console.log(`Found ${secretariatUsers.length} Secretariat users:`);
    secretariatUsers.forEach(user => {
      console.log(`- ${user.name} (${user.username}) - ${user.subRole}`);
    });

    // Find Implementing Office users
    const iuUsers = await User.findAll({
      where: {
        role: 'LGU-IU'
      },
      attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
    });

    console.log(`\nFound ${iuUsers.length} Implementing Office users:`);
    iuUsers.forEach(user => {
      console.log(`- ${user.name} (${user.username}) - ${user.subRole}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkSecretariatUsers(); 
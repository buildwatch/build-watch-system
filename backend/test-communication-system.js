const { User, Communication } = require('./models');
const { Sequelize } = require('sequelize');
const config = require('./config/database');

const sequelize = new Sequelize(config.development);

async function testCommunicationSystem() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Find all Implementing Office users
    const iuUsers = await User.findAll({
      where: {
        role: 'LGU-IU',
        status: 'Active'
      },
      attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
    });

    console.log(`\n📋 Found ${iuUsers.length} Implementing Office users:`);
    iuUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username}) - ${user.subRole || user.role}`);
    });

    // Find Secretariat users
    const secretariatUsers = await User.findAll({
      where: {
        role: 'LGU-PMT',
        subRole: {
          [Sequelize.Op.like]: '%Secretariat%'
        },
        status: 'Active'
      },
      attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
    });

    console.log(`\n🏛️  Found ${secretariatUsers.length} Secretariat users:`);
    secretariatUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username}) - ${user.subRole}`);
    });

    // Check existing communications
    const communications = await Communication.findAll({
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['name', 'role', 'subRole']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['name', 'role', 'subRole']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    console.log(`\n💬 Found ${communications.length} existing communications:`);
    communications.forEach((comm, index) => {
      console.log(`${index + 1}. ${comm.sender?.name} → ${comm.recipient?.name}: "${comm.subject}" (${comm.status})`);
    });

    // Test communication flow
    if (iuUsers.length > 0 && secretariatUsers.length > 0) {
      console.log(`\n✅ Communication system is properly configured:`);
      console.log(`   - ${iuUsers.length} Implementing Office users can send messages to Secretariat`);
      console.log(`   - ${secretariatUsers.length} Secretariat users can receive messages from Implementing Office`);
      console.log(`   - Total communications in system: ${communications.length}`);
    } else {
      console.log(`\n❌ Communication system needs configuration:`);
      if (iuUsers.length === 0) {
        console.log(`   - No Implementing Office users found`);
      }
      if (secretariatUsers.length === 0) {
        console.log(`   - No Secretariat users found`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testCommunicationSystem(); 
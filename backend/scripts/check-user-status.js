const { User } = require('../models');
const sequelize = require('../models').sequelize;

async function checkUserStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Find the specific EIU user
    const user = await User.findOne({
      where: {
        id: '12bf7a21-e79b-4b07-a5e4-69b1e4271b14'
      }
    });

    if (user) {
      console.log(`\n👤 User: ${user.name}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: "${user.status}" (length: ${user.status.length})`);
      console.log(`   Status === 'Active': ${user.status === 'Active'}`);
      console.log(`   Status === 'active': ${user.status === 'active'}`);
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Error checking user status:', error);
  } finally {
    await sequelize.close();
  }
}

checkUserStatus(); 
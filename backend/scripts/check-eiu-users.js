const { User } = require('../models');
const sequelize = require('../config/database');

async function checkEIUUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    console.log('🔍 Checking EIU users in database...');
    
    // Find all EIU users
    const eiuUsers = await User.findAll({
      where: { role: 'EIU' },
      attributes: ['id', 'username', 'name', 'email', 'role', 'subRole', 'status', 'group']
    });

    console.log(`📊 Found ${eiuUsers.length} EIU users:`);
    
    if (eiuUsers.length === 0) {
      console.log('❌ No EIU users found in database');
    } else {
      eiuUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} - ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}, SubRole: ${user.subRole || 'N/A'}, Group: ${user.group || 'N/A'}, Status: ${user.status}`);
        console.log('');
      });
    }

    // Check total users by role
    console.log('📈 User count by role:');
    const roleCounts = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    roleCounts.forEach(roleCount => {
      console.log(`   ${roleCount.role}: ${roleCount.count} users`);
    });

  } catch (error) {
    console.error('❌ Error checking EIU users:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkEIUUsers(); 
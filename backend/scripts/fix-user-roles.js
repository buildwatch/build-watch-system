const { User } = require('../models');

async function fixUserRoles() {
  try {
    // Update IU to LGU-IU
    await User.update(
      { role: 'LGU-IU' },
      { where: { role: 'IU' } }
    );
    
    console.log('Updated IU roles to LGU-IU');
    
    // Check final state
    const users = await User.findAll();
    console.log('Updated users and roles:');
    users.forEach(user => {
      console.log(`${user.username}: ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserRoles(); 
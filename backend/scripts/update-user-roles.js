const { User } = require('../models');

async function updateUserRoles() {
  try {
    console.log('Checking current users...');
    const users = await User.findAll();
    
    console.log('Current users:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Role: ${user.role}`);
    });

    // Update SYS.AD users to LGU-PMT
    const sysAdminUsers = await User.findAll({ where: { role: 'SYS.AD' } });
    if (sysAdminUsers.length > 0) {
      console.log(`\nUpdating ${sysAdminUsers.length} SYS.AD users to LGU-PMT...`);
      await User.update(
        { role: 'LGU-PMT', subRole: 'System Administrator' },
        { where: { role: 'SYS.AD' } }
      );
    }

    // Update EXEC users to LGU-PMT
    const execUsers = await User.findAll({ where: { role: 'EXEC' } });
    if (execUsers.length > 0) {
      console.log(`\nUpdating ${execUsers.length} EXEC users to LGU-PMT...`);
      await User.update(
        { role: 'LGU-PMT', subRole: 'Executive Viewer' },
        { where: { role: 'EXEC' } }
      );
    }

    console.log('\nUser roles updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating user roles:', error);
    process.exit(1);
  }
}

updateUserRoles(); 
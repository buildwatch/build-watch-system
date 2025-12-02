const db = require('../models');
const { User } = db;

async function setAdminUserIds() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.\n');

    // Find and update System Admin
    const sysAdmin = await User.findOne({
      where: {
        email: 'sysadmin@gmail.com'
      }
    });

    if (sysAdmin) {
      if (!sysAdmin.userId) {
        await sysAdmin.update({
          userId: 'SYS-AD-0001'
        });
        console.log('✅ System Admin userId set to: SYS-AD-0001');
      } else {
        console.log('ℹ️  System Admin already has userId:', sysAdmin.userId);
      }
    } else {
      console.log('❌ System Admin NOT FOUND');
    }

    // Find and update Executive Viewer
    const execViewer = await User.findOne({
      where: {
        email: 'exeviewer@gmail.com'
      }
    });

    if (execViewer) {
      // Always update to ensure correct userId
      await execViewer.update({
        userId: 'EXE-VIEW-0001'
      });
      console.log('✅ Executive Viewer userId set to: EXE-VIEW-0001');
    } else {
      console.log('❌ Executive Viewer NOT FOUND');
    }

    // Also ensure System Admin has the correct userId (force update)
    if (sysAdmin) {
      await sysAdmin.update({
        userId: 'SYS-AD-0001'
      });
      console.log('✅ System Admin userId confirmed: SYS-AD-0001');
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY FOR FORGOT PASSWORD TESTING');
    console.log('='.repeat(60));
    console.log('\nSystem Admin:');
    console.log('   Email: sysadmin@gmail.com');
    console.log('   Unique User ID: SYS-AD-0001');
    console.log('\nExecutive Viewer:');
    console.log('   Email: exeviewer@gmail.com');
    console.log('   Unique User ID: EXE-VIEW-0001');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdminUserIds();


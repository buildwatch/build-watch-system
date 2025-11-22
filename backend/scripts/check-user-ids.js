const db = require('../models');
const { User } = db;

async function checkUserIds() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.\n');

    // Find System Admin
    const sysAdmin = await User.findOne({
      where: {
        email: 'sysadmin@gmail.com'
      },
      attributes: ['id', 'userId', 'email', 'name', 'username', 'role', 'subRole']
    });

    // Find Executive Viewer
    const execViewer = await User.findOne({
      where: {
        email: 'exeviewer@gmail.com'
      },
      attributes: ['id', 'userId', 'email', 'name', 'username', 'role', 'subRole']
    });

    console.log('='.repeat(60));
    console.log('USER ID VERIFICATION');
    console.log('='.repeat(60));

    if (sysAdmin) {
      console.log('\n✅ System Admin Found:');
      console.log('   Email:', sysAdmin.email);
      console.log('   Name:', sysAdmin.name);
      console.log('   Username:', sysAdmin.username);
      console.log('   Role:', sysAdmin.role);
      console.log('   SubRole:', sysAdmin.subRole);
      console.log('   Unique User ID (userId):', sysAdmin.userId || '❌ NOT SET');
      console.log('   Database ID (UUID):', sysAdmin.id);
    } else {
      console.log('\n❌ System Admin NOT FOUND');
    }

    if (execViewer) {
      console.log('\n✅ Executive Viewer Found:');
      console.log('   Email:', execViewer.email);
      console.log('   Name:', execViewer.name);
      console.log('   Username:', execViewer.username);
      console.log('   Role:', execViewer.role);
      console.log('   SubRole:', execViewer.subRole);
      console.log('   Unique User ID (userId):', execViewer.userId || '❌ NOT SET');
      console.log('   Database ID (UUID):', execViewer.id);
    } else {
      console.log('\n❌ Executive Viewer NOT FOUND');
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('\nFor Forgot Password Testing:');
    if (sysAdmin && sysAdmin.userId) {
      console.log(`   System Admin User ID: ${sysAdmin.userId}`);
    } else {
      console.log('   System Admin User ID: ❌ NOT SET - Please set userId in database');
    }
    if (execViewer && execViewer.userId) {
      console.log(`   Executive Viewer User ID: ${execViewer.userId}`);
    } else {
      console.log('   Executive Viewer User ID: ❌ NOT SET - Please set userId in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserIds();


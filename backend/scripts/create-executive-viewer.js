const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function createExecutiveViewer() {
  try {
    // Check if Executive Viewer already exists
    const existingUser = await User.findOne({
      where: { email: 'exeviewer@gmail.com' }
    });

    if (existingUser) {
      console.log('Executive Viewer user already exists');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('LGU_Pass', 10);

    // Create Executive Viewer user
    const executiveViewer = await User.create({
      username: 'exeviewer@gmail.com',
      email: 'exeviewer@gmail.com',
      password: hashedPassword,
      firstName: 'Executive',
      lastName: 'Viewer',
      name: 'Executive Viewer',
      role: 'SYS.AD',
      group: 'System Administrator',
      subRole: 'EXECUTIVE',
      status: 'active'
    });

    console.log('✅ Executive Viewer user created successfully:');
    console.log('Username: exeviewer@gmail.com');
    console.log('Password: LGU_Pass');
    console.log('Role: SYS.AD (Executive Viewer)');
    console.log('SubRole: EXECUTIVE');
    console.log('Group: System Administrator');

  } catch (error) {
    console.error('❌ Error creating Executive Viewer user:', error.message);
  }
}

// Run the script
createExecutiveViewer(); 
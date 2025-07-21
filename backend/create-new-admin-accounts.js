const db = require('./models');
const { User } = db;
const bcrypt = require('bcryptjs');

async function createNewAdminAccounts() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');
    
    // Remove old admin accounts
    console.log('Removing old admin accounts...');
    await User.destroy({
      where: {
        role: ['SYS.AD', 'EXEC']
      }
    });
    console.log('Old admin accounts removed.');
    
    // Create new System Admin account
    console.log('Creating new System Admin account...');
    const sysAdminPassword = await bcrypt.hash('BW123', 10);
    const sysAdmin = await User.create({
      username: 'SystemAdmin',
      email: 'sysad@gmail.com',
      password: sysAdminPassword,
      role: 'SYS.AD',
      subRole: 'System Admin',
      name: 'System Admin',
      firstName: 'System',
      lastName: 'Admin',
      office: 'Santa Cruz LGU',
      position: 'System Administrator',
      status: 'active'
    });
    console.log('System Admin account created successfully!');
    console.log('- ID:', sysAdmin.id);
    console.log('- Username:', sysAdmin.username);
    console.log('- Email:', sysAdmin.email);
    console.log('- Role:', sysAdmin.role);
    
    // Create new Executive Viewer account
    console.log('Creating new Executive Viewer account...');
    const execViewerPassword = await bcrypt.hash('BW123', 10);
    const execViewer = await User.create({
      username: 'ExecutiveViewer',
      email: 'exviewer@gmail.com',
      password: execViewerPassword,
      role: 'EXEC',
      subRole: 'Executive Viewer',
      name: 'Executive Viewer',
      firstName: 'Executive',
      lastName: 'Viewer',
      office: 'Santa Cruz LGU',
      position: 'Executive Viewer',
      status: 'active'
    });
    console.log('Executive Viewer account created successfully!');
    console.log('- ID:', execViewer.id);
    console.log('- Username:', execViewer.username);
    console.log('- Email:', execViewer.email);
    console.log('- Role:', execViewer.role);
    
    console.log('\n=== NEW ACCOUNT CREDENTIALS ===');
    console.log('\nSystem Admin Dashboard Account:');
    console.log('- Username: SystemAdmin');
    console.log('- Email: sysad@gmail.com');
    console.log('- User Type: System Admin');
    console.log('- Password: BW123');
    
    console.log('\nExecutive Viewer Dashboard Account:');
    console.log('- Username: ExecutiveViewer');
    console.log('- Email: exviewer@gmail.com');
    console.log('- User Type: Executive Viewer');
    console.log('- Password: BW123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createNewAdminAccounts(); 
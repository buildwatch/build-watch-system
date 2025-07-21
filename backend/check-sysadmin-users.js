const db = require('./models');
const { User } = db;

async function checkSysAdminUsers() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');
    
    const users = await User.findAll({ 
      where: { 
        role: 'SYS.AD' 
      } 
    });
    
    console.log('System Admin users found:');
    if (users.length === 0) {
      console.log('No System Admin users found!');
    } else {
      users.forEach(user => {
        console.log('- ID:', user.id);
        console.log('- Username:', user.username);
        console.log('- Email:', user.email);
        console.log('- Role:', user.role);
        console.log('- Status:', user.status);
        console.log('---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSysAdminUsers(); 
const db = require('./models');
const { User } = db;
const bcrypt = require('bcryptjs');

async function checkSysAdminPassword() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');
    
    const user = await User.findOne({ 
      where: { 
        username: 'executive.admin' 
      } 
    });
    
    if (user) {
      console.log('System Admin user found:');
      console.log('- Username:', user.username);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Status:', user.status);
      
      // Reset password to a known value
      const newPassword = 'BuildWatch';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await user.update({
        password: hashedPassword
      });
      
      console.log('Password reset successfully!');
      console.log('New System Admin credentials:');
      console.log('- Username: executive.admin');
      console.log('- Email: executive.admin@buildwatch.gov.ph');
      console.log('- Password: BuildWatch');
    } else {
      console.log('System Admin user not found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSysAdminPassword(); 
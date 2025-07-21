const db = require('./models');
const { User } = db;
const bcrypt = require('bcryptjs');

async function resetSysAdminPassword() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');
    
    // Find the sysad@gmail.com user
    const user = await User.findOne({ 
      where: { 
        email: 'sysad@gmail.com' 
      } 
    });
    
    if (user) {
      console.log('System Admin user found:');
      console.log('- Username:', user.username);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Status:', user.status);
      
      // Reset password to a known value
      const newPassword = 'BuildWatch2025!';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await user.update({
        password: hashedPassword
      });
      
      console.log('Password reset successfully!');
      console.log('New System Admin credentials:');
      console.log('- Username: sysad@gmail.com');
      console.log('- Email: sysad@gmail.com');
      console.log('- Password: BuildWatch2025!');
    } else {
      console.log('System Admin user not found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetSysAdminPassword(); 
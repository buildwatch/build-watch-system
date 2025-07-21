const db = require('./models');
const { User } = db;
const bcrypt = require('bcryptjs');

async function checkExecutiveViewer() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');
    
    // Find any user with the username or email
    let user = await User.findOne({ 
      where: { 
        username: 'exeviewer' 
      } 
    });
    if (!user) {
      user = await User.findOne({
        where: {
          email: 'santacruzadmin@gmail.com'
        }
      });
    }
    
    if (user) {
      console.log('Executive Viewer user found, updating if needed...');
      user.username = 'exeviewer';
      user.email = 'santacruzadmin@gmail.com';
      user.role = 'EXEC';
      user.subRole = 'Executive Viewer';
      user.name = 'Executive Viewer';
      user.status = 'active';
      user.password = await bcrypt.hash('BuildWatch', 10);
      await user.save();
      console.log('Executive Viewer user updated:');
      console.log('- ID:', user.id);
      console.log('- Username:', user.username);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Created:', user.createdAt);
    } else {
      console.log('Executive Viewer user NOT FOUND, creating...');
      const hashedPassword = await bcrypt.hash('BuildWatch', 10);
      const newUser = await User.create({
        username: 'exeviewer',
        email: 'santacruzadmin@gmail.com',
        password: hashedPassword,
        role: 'EXEC',
        subRole: 'Executive Viewer',
        name: 'Executive Viewer',
        status: 'active'
      });
      console.log('Executive Viewer user created successfully!');
      console.log('- ID:', newUser.id);
      console.log('- Username:', newUser.username);
      console.log('- Role:', newUser.role);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error details:', error);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`Validation error for ${err.path}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

checkExecutiveViewer(); 
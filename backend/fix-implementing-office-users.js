const { User, sequelize } = require('./models');

async function fixImplementingOfficeUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Find users that should be Implementing Office users
    const implementingOfficeCandidates = await User.findAll({
      where: {
        role: 'lgu-iu',
        name: {
          [require('sequelize').Op.like]: '%Municipal%'
        }
      },
      attributes: ['id', 'name', 'username', 'role', 'email']
    });

    console.log('\n🔍 FOUND IMPLEMENTING OFFICE CANDIDATES:');
    console.log('='.repeat(80));
    implementingOfficeCandidates.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username}) - Current Role: ${user.role}`);
    });

    if (implementingOfficeCandidates.length === 0) {
      console.log('❌ No Implementing Office candidates found!');
      return;
    }

    // Update their roles to iu-implementing-office
    console.log('\n🔧 UPDATING USER ROLES:');
    console.log('='.repeat(80));
    
    for (const user of implementingOfficeCandidates) {
      console.log(`Updating ${user.name} from ${user.role} to iu-implementing-office...`);
      
      await user.update({
        role: 'iu-implementing-office'
      });
      
      console.log(`✅ Updated ${user.name} successfully!`);
    }

    // Verify the changes
    console.log('\n✅ VERIFICATION:');
    console.log('='.repeat(80));
    
    const updatedUsers = await User.findAll({
      where: { role: 'iu-implementing-office' },
      attributes: ['id', 'name', 'username', 'role', 'email']
    });

    console.log(`Found ${updatedUsers.length} Implementing Office users:`);
    updatedUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.username}) - ID: ${user.id}`);
    });

    // Now fix the project assignment
    console.log('\n🔧 FIXING PROJECT ASSIGNMENT:');
    console.log('='.repeat(80));
    
    const { Project } = require('./models');
    
    // Find the Municipal Engineer Office user
    const meoUser = updatedUsers.find(u => 
      u.name.toLowerCase().includes('municipal engineer') || 
      u.username.toLowerCase().includes('meo')
    );

    if (meoUser) {
      console.log(`Found Municipal Engineer Office user: ${meoUser.name} (${meoUser.id})`);
      
      // Update the project
      const project = await Project.findOne({
        where: { name: 'Rehabilitation and Improvement of Drainage System along Poblacion Area' }
      });

      if (project) {
        await project.update({
          implementingOfficeId: meoUser.id
        });
        
        console.log(`✅ Project updated to use Implementing Office ID: ${meoUser.id}`);
        
        // Verify the project
        const updatedProject = await Project.findOne({
          where: { id: project.id },
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'username', 'role']
            }
          ]
        });
        
        console.log(`\n✅ PROJECT VERIFICATION:`);
        console.log(`Project: ${updatedProject.name}`);
        console.log(`Implementing Office: ${updatedProject.implementingOffice?.name} (${updatedProject.implementingOfficeId})`);
        
      } else {
        console.log('❌ Project not found!');
      }
    } else {
      console.log('❌ Municipal Engineer Office user not found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixImplementingOfficeUsers(); 
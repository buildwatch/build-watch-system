const { Project, User, sequelize } = require('./models');

async function fixProjectImplementingOffice() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get all Implementing Office users
    const implementingOfficeUsers = await User.findAll({
      where: { role: 'iu-implementing-office' },
      attributes: ['id', 'name', 'username', 'role']
    });

    console.log('\n👥 AVAILABLE IMPLEMENTING OFFICE USERS:');
    console.log('='.repeat(80));
    implementingOfficeUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username}) - ID: ${user.id}`);
    });

    // Get the problematic project
    const project = await Project.findOne({
      where: { name: 'Rehabilitation and Improvement of Drainage System along Poblacion Area' },
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'username', 'role']
        }
      ]
    });

    console.log('\n📋 CURRENT PROJECT STATE:');
    console.log('='.repeat(80));
    console.log(`Project: ${project.name}`);
    console.log(`Current Implementing Office ID: ${project.implementingOfficeId}`);
    console.log(`Current Implementing Office: ${project.implementingOffice?.name || 'NOT FOUND'}`);

    // Find the correct Implementing Office user (Municipal Engineer Office)
    const correctUser = implementingOfficeUsers.find(u => 
      u.name.toLowerCase().includes('municipal engineer') || 
      u.username.toLowerCase().includes('meo')
    );

    if (correctUser) {
      console.log(`\n🔧 FIXING PROJECT ASSIGNMENT:`);
      console.log(`Assigning to: ${correctUser.name} (${correctUser.id})`);
      
      // Update the project
      await project.update({
        implementingOfficeId: correctUser.id
      });

      console.log('✅ Project implementing office updated successfully!');
      
      // Verify the fix
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

      console.log(`\n✅ VERIFICATION:`);
      console.log(`Project: ${updatedProject.name}`);
      console.log(`Implementing Office: ${updatedProject.implementingOffice?.name} (${updatedProject.implementingOfficeId})`);
      
    } else {
      console.log('\n❌ No suitable Implementing Office user found!');
      console.log('Available users:');
      implementingOfficeUsers.forEach(u => console.log(`  - ${u.name} (${u.username})`));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixProjectImplementingOffice(); 
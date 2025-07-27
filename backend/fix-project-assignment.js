const { Project, User, sequelize } = require('./models');

async function fixProjectAssignment() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get all LGU-IU users (Implementing Office users)
    const lguIuUsers = await User.findAll({
      where: { role: 'LGU-IU' },
      attributes: ['id', 'name', 'username', 'role', 'email']
    });

    console.log('\n👥 LGU-IU USERS (Implementing Office):');
    console.log('='.repeat(80));
    lguIuUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username}) - ID: ${user.id}`);
    });

    // Find the Municipal Engineer Office user
    const meoUser = lguIuUsers.find(u => 
      u.name.toLowerCase().includes('municipal engineer') || 
      u.username.toLowerCase().includes('meo')
    );

    if (!meoUser) {
      console.log('❌ Municipal Engineer Office user not found!');
      return;
    }

    console.log(`\n🎯 FOUND MEO USER: ${meoUser.name} (${meoUser.id})`);

    // Get the project
    const project = await Project.findOne({
      where: { name: 'Rehabilitation and Improvement of Drainage System along Poblacion Area' }
    });

    if (!project) {
      console.log('❌ Project not found!');
      return;
    }

    console.log(`\n📋 PROJECT DETAILS:`);
    console.log(`Name: ${project.name}`);
    console.log(`Current Implementing Office ID: ${project.implementingOfficeId}`);
    console.log(`Target Implementing Office ID: ${meoUser.id}`);

    // Update the project
    if (project.implementingOfficeId !== meoUser.id) {
      console.log('\n🔧 UPDATING PROJECT ASSIGNMENT...');
      
      await project.update({
        implementingOfficeId: meoUser.id
      });
      
      console.log('✅ Project assignment updated successfully!');
    } else {
      console.log('✅ Project is already correctly assigned!');
    }

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

    // Test the EIU Activity Feed query
    console.log('\n🧪 TESTING EIU ACTIVITY FEED QUERY:');
    console.log('='.repeat(80));
    
    const { EIUActivity } = require('./models');
    
    const activities = await EIUActivity.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location', 'implementingOfficeId'],
          where: {
            implementingOfficeId: meoUser.id
          }
        },
        {
          model: User,
          as: 'eiuUser',
          attributes: ['id', 'name', 'username', 'department']
        }
      ],
      order: [['activityDate', 'DESC'], ['createdAt', 'DESC']]
    });

    console.log(`Found ${activities.length} activities for Implementing Office ${meoUser.name}:`);
    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. Activity: ${activity.title}`);
      console.log(`   Project: ${activity.project?.name}`);
      console.log(`   EIU User: ${activity.eiuUser?.name}`);
      console.log(`   Status: ${activity.status} | Review: ${activity.reviewStatus}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixProjectAssignment(); 
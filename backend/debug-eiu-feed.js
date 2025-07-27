const { Project, User, EIUActivity, sequelize } = require('./models');

async function debugEIUFeed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Check the specific project and its relationships
    const project = await Project.findOne({
      where: { name: 'Rehabilitation and Improvement of Drainage System along Poblacion Area' },
      include: [
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'username', 'role']
        }
      ]
    });

    console.log('\n📋 PROJECT DETAILS:');
    console.log('='.repeat(80));
    console.log(`Project: ${project.name}`);
    console.log(`Project ID: ${project.id}`);
    console.log(`Implementing Office ID: ${project.implementingOfficeId}`);
    console.log(`EIU Personnel ID: ${project.eiuPersonnelId}`);
    console.log(`Implementing Office: ${project.implementingOffice?.name} (${project.implementingOffice?.username})`);
    console.log(`EIU Personnel: ${project.eiuPersonnel?.name} (${project.eiuPersonnel?.username})`);

    // Check all activities for this project
    const activities = await EIUActivity.findAll({
      where: { projectId: project.id },
      include: [
        {
          model: User,
          as: 'eiuUser',
          attributes: ['id', 'name', 'username', 'role']
        }
      ]
    });

    console.log('\n📊 ACTIVITIES FOR THIS PROJECT:');
    console.log('='.repeat(80));
    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. Activity: ${activity.title}`);
      console.log(`   Activity ID: ${activity.id}`);
      console.log(`   EIU User: ${activity.eiuUser?.name} (${activity.eiuUser?.id})`);
      console.log(`   Status: ${activity.status}`);
      console.log(`   Review Status: ${activity.reviewStatus}`);
      console.log(`   Created: ${activity.createdAt}`);
    });

    // Simulate the EIU Activity Feed query for Implementing Office
    console.log('\n🔍 SIMULATING EIU ACTIVITY FEED QUERY:');
    console.log('='.repeat(80));
    
    // This is what the EIU Activity Feed endpoint does
    const implementingOfficeId = project.implementingOfficeId;
    console.log(`Looking for activities where project.implementingOfficeId = ${implementingOfficeId}`);
    
    const feedActivities = await EIUActivity.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location', 'implementingOfficeId'],
          where: {
            implementingOfficeId: implementingOfficeId
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

    console.log(`\nFound ${feedActivities.length} activities for Implementing Office ${implementingOfficeId}:`);
    feedActivities.forEach((activity, index) => {
      console.log(`\n${index + 1}. Activity: ${activity.title}`);
      console.log(`   Project: ${activity.project?.name}`);
      console.log(`   EIU User: ${activity.eiuUser?.name}`);
      console.log(`   Status: ${activity.status} | Review: ${activity.reviewStatus}`);
    });

    // Check if there are any Implementing Office users
    const implementingOfficeUsers = await User.findAll({
      where: { role: 'iu-implementing-office' },
      attributes: ['id', 'name', 'username', 'role']
    });

    console.log('\n👥 IMPLEMENTING OFFICE USERS:');
    console.log('='.repeat(80));
    implementingOfficeUsers.forEach(user => {
      console.log(`User: ${user.name} (${user.username}) - ID: ${user.id}`);
    });

    // Check if the project's implementing office ID matches any user
    const matchingUser = implementingOfficeUsers.find(u => u.id === project.implementingOfficeId);
    console.log(`\n🔍 Project Implementing Office ID (${project.implementingOfficeId}) matches user: ${matchingUser ? matchingUser.name : 'NO MATCH'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

debugEIUFeed(); 
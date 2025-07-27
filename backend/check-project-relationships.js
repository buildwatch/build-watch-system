const { Project, User, EIUActivity, sequelize } = require('./models');

async function checkProjectRelationships() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get all projects with their relationships
    const projects = await Project.findAll({
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

    console.log('\n📋 PROJECT RELATIONSHIPS:');
    console.log('='.repeat(80));
    
    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. Project: ${project.name}`);
      console.log(`   Code: ${project.projectCode}`);
      console.log(`   Implementing Office: ${project.implementingOffice?.name || 'None'} (ID: ${project.implementingOfficeId})`);
      console.log(`   EIU Personnel: ${project.eiuPersonnel?.name || 'None'} (ID: ${project.eiuPersonnelId})`);
      console.log(`   Has External Partner: ${project.hasExternalPartner}`);
    });

    // Check EIU Activities
    console.log('\n\n📊 EIU ACTIVITIES:');
    console.log('='.repeat(80));
    
    const activities = await EIUActivity.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'implementingOfficeId', 'eiuPersonnelId']
        },
        {
          model: User,
          as: 'eiuUser',
          attributes: ['id', 'name', 'username']
        }
      ]
    });

    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. Activity: ${activity.title}`);
      console.log(`   Project: ${activity.project?.name || 'Unknown'}`);
      console.log(`   EIU User: ${activity.eiuUser?.name || 'Unknown'}`);
      console.log(`   Project EIU Personnel: ${activity.project?.eiuPersonnelId}`);
      console.log(`   Activity EIU User: ${activity.eiuUserId}`);
      console.log(`   Status: ${activity.status} | Review: ${activity.reviewStatus}`);
    });

    // Check specific user relationships
    console.log('\n\n👥 USER ANALYSIS:');
    console.log('='.repeat(80));
    
    const users = await User.findAll({
      where: {
        role: ['eiu', 'iu-implementing-office']
      },
      attributes: ['id', 'name', 'username', 'role']
    });

    users.forEach(user => {
      console.log(`\nUser: ${user.name} (${user.username})`);
      console.log(`Role: ${user.role}`);
      
      // Find projects where this user is the implementing office
      const ioProjects = projects.filter(p => p.implementingOfficeId === user.id);
      if (ioProjects.length > 0) {
        console.log(`   Implementing Office for ${ioProjects.length} projects:`);
        ioProjects.forEach(p => console.log(`     - ${p.name} (EIU: ${p.eiuPersonnel?.name || 'None'})`));
      }
      
      // Find projects where this user is the EIU personnel
      const eiuProjects = projects.filter(p => p.eiuPersonnelId === user.id);
      if (eiuProjects.length > 0) {
        console.log(`   EIU Personnel for ${eiuProjects.length} projects:`);
        eiuProjects.forEach(p => console.log(`     - ${p.name} (IO: ${p.implementingOffice?.name || 'None'})`));
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkProjectRelationships(); 
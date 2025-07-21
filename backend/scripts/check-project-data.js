const { Project, User, sequelize } = require('../models');

async function checkProjectData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all projects
    const projects = await Project.findAll({
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'username', 'role']
        }
      ]
    });

    console.log(`\n📊 Found ${projects.length} projects:`);
    
    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Project Code: ${project.projectCode}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Workflow Status: ${project.workflowStatus}`);
      console.log(`   Total Budget: ${project.totalBudget} (Type: ${typeof project.totalBudget})`);
      console.log(`   Timeline Progress: ${project.timelineProgress}%`);
      console.log(`   Budget Progress: ${project.budgetProgress}%`);
      console.log(`   Physical Progress: ${project.physicalProgress}%`);
      console.log(`   Overall Progress: ${project.overallProgress}%`);
      console.log(`   EIU Personnel: ${project.eiuPersonnel?.name || 'None'}`);
      console.log(`   Implementing Office: ${project.implementingOffice?.name || 'None'}`);
    });

    // Check EIU projects specifically
    const eiuProjects = projects.filter(p => p.eiuPersonnelId);
    console.log(`\n🎯 EIU Projects: ${eiuProjects.length}`);
    
    if (eiuProjects.length > 0) {
      const totalBudget = eiuProjects.reduce((sum, p) => sum + parseFloat(p.totalBudget || 0), 0);
      const avgProgress = eiuProjects.reduce((sum, p) => sum + parseFloat(p.overallProgress || 0), 0) / eiuProjects.length;
      
      console.log(`   Total Budget: ₱${totalBudget.toLocaleString()}`);
      console.log(`   Average Progress: ${avgProgress.toFixed(2)}%`);
    }

    console.log('\n✅ Project data check completed');

  } catch (error) {
    console.error('❌ Error checking project data:', error);
  } finally {
    await sequelize.close();
  }
}

checkProjectData(); 
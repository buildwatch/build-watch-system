const { Project, ProjectMilestone } = require('./models');

async function findDelayedProject() {
  try {
    console.log('🔍 Looking for projects with "Rehabilitation of Barangay Road at Brgy. Bubukal"...\n');
    
    const projects = await Project.findAll({
      where: {
        name: 'Rehabilitation of Barangay Road at Brgy. Bubukal'
      },
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones'
        }
      ]
    });
    
    console.log(`Found ${projects.length} matching projects:`);
    
    for (const project of projects) {
      console.log(`\n📋 Project: ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Milestones: ${project.milestones.length}`);
      
      if (project.milestones.length > 0) {
        console.log('   Milestone details:');
        project.milestones.forEach(milestone => {
          const dueDate = new Date(milestone.dueDate);
          const today = new Date();
          const isOverdue = dueDate < today;
          
          console.log(`     - ${milestone.title}`);
          console.log(`       Status: ${milestone.status}`);
          console.log(`       Due: ${milestone.dueDate}`);
          console.log(`       Overdue: ${isOverdue}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

findDelayedProject(); 
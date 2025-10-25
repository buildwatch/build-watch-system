const delayedStatusService = require('./services/delayedStatusService');
const { Project } = require('./models');

async function quickTest() {
  try {
    console.log('🔄 Quick delayed status test...\n');
    
    const projects = await Project.findAll({ 
      where: { status: 'delayed' } 
    });
    
    console.log(`Found ${projects.length} delayed projects\n`);
    
    for (const project of projects) {
      console.log(`📋 Project: ${project.name}`);
      
      const result = await delayedStatusService.updateProjectDelayedStatus(project.id);
      console.log(`Status: ${result.currentStatus}`);
      console.log(`Overdue milestones: ${result.overdueMilestones.length}`);
      
      if (result.overdueMilestones.length > 0) {
        await delayedStatusService.createDelayedStatusUpdate(
          project.id, 
          result.delayInfo, 
          result.overdueMilestones
        );
        console.log('✅ Delay notification created');
      }
      console.log('');
    }
    
    console.log('✅ Test complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

quickTest(); 
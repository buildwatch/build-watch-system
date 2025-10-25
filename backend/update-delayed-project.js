const { Project } = require('./models');
const delayedStatusService = require('./services/delayedStatusService');

async function updateDelayedProject() {
  console.log('🔄 Updating delayed project status...\n');
  
  try {
    // Find the delayed project
    const projects = await Project.findAll({ 
      where: { status: 'delayed' } 
    });
    
    console.log(`Found ${projects.length} delayed projects`);
    
    for (const project of projects) {
      console.log(`\n📋 Updating project: ${project.name}`);
      
      const result = await delayedStatusService.updateProjectDelayedStatus(project.id);
      console.log('✅ Update result:', {
        statusChanged: result.statusChanged,
        previousStatus: result.previousStatus,
        currentStatus: result.currentStatus,
        overdueMilestones: result.overdueMilestones.length
      });
      
      if (result.statusChanged && result.currentStatus === 'delayed') {
        await delayedStatusService.createDelayedStatusUpdate(
          project.id, 
          result.delayInfo, 
          result.overdueMilestones
        );
        console.log('📝 Created delay notification');
      } else if (result.delayInfo.overdueMilestones > 0) {
        // Even if status didn't change, create notification if we haven't already
        await delayedStatusService.createDelayedStatusUpdate(
          project.id, 
          result.delayInfo, 
          result.overdueMilestones
        );
        console.log('📝 Created delay notification for existing delayed project');
      }
    }
    
    console.log('\n✅ Update complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

updateDelayedProject(); 
const delayedStatusService = require('./services/delayedStatusService');
const { Project } = require('./models');

async function createDelayNotification() {
  console.log('🔄 Creating delay notification for delayed project...\n');
  
  try {
    const projectId = 'edfc77c1-a45b-49c8-b009-561f28b98992';
    
    // Check and update delayed status
    console.log('📋 Checking delayed status...');
    const result = await delayedStatusService.updateProjectDelayedStatus(projectId);
    
    console.log('Status update result:', {
      statusChanged: result.statusChanged,
      currentStatus: result.currentStatus,
      overdueMilestones: result.overdueMilestones.length
    });
    
    // Create delay notification if there are overdue milestones
    if (result.overdueMilestones && result.overdueMilestones.length > 0) {
      console.log('📝 Creating delay notification...');
      
      await delayedStatusService.createDelayedStatusUpdate(
        projectId,
        result.delayInfo,
        result.overdueMilestones
      );
      
      console.log('✅ Delay notification created successfully!');
    } else {
      console.log('ℹ️ No overdue milestones found, no notification needed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

createDelayNotification(); 
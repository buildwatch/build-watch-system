const { ProjectMilestone } = require('../models');

async function updateMilestoneStatus() {
  try {
    console.log('🔄 Updating milestone status...');
    
    // Find the "Procurement and Delivery of Materials" milestone
    const milestone = await ProjectMilestone.findOne({
      where: {
        title: 'Procurement and Delivery of Materials'
      }
    });
    
    if (!milestone) {
      console.log('❌ Milestone not found');
      return;
    }
    
    console.log('📋 Current milestone data:', {
      id: milestone.id,
      title: milestone.title,
      currentStatus: milestone.status,
      projectId: milestone.projectId
    });
    
    // Update the status to 'completed'
    await milestone.update({
      status: 'completed'
    });
    
    console.log('✅ Milestone status updated to "completed"');
    
    // Verify the update
    const updatedMilestone = await ProjectMilestone.findByPk(milestone.id);
    console.log('🔍 Updated milestone data:', {
      id: updatedMilestone.id,
      title: updatedMilestone.title,
      newStatus: updatedMilestone.status
    });
    
  } catch (error) {
    console.error('❌ Error updating milestone status:', error);
  }
}

// Run the update
updateMilestoneStatus()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
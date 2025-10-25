const { ProjectMilestone } = require('../models');

async function checkMilestoneStatus() {
  try {
    console.log('🔍 Checking milestone status...');
    
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
      status: milestone.status,
      projectId: milestone.projectId,
      updatedAt: milestone.updatedAt
    });
    
  } catch (error) {
    console.error('❌ Error checking milestone status:', error);
  }
}

// Run the check
checkMilestoneStatus()
  .then(() => {
    console.log('🎉 Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });

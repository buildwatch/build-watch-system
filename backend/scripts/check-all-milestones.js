const { ProjectMilestone } = require('../models');

async function checkAllMilestones() {
  try {
    console.log('🔍 Checking all milestones with "Procurement" in title...');
    
    // Find all milestones with "Procurement" in the title
    const milestones = await ProjectMilestone.findAll({
      where: {
        title: {
          [require('sequelize').Op.like]: '%Procurement%'
        }
      }
    });
    
    console.log(`📋 Found ${milestones.length} milestones with "Procurement" in title:`);
    
    milestones.forEach((milestone, index) => {
      console.log(`\n${index + 1}. Milestone:`, {
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        projectId: milestone.projectId,
        updatedAt: milestone.updatedAt
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking milestones:', error);
  }
}

// Run the check
checkAllMilestones()
  .then(() => {
    console.log('🎉 Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });

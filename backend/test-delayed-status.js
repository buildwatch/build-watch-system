const { Project, ProjectMilestone } = require('./models');
const delayedStatusService = require('./services/delayedStatusService');

async function testDelayedStatus() {
  console.log('🧪 Testing delayed status functionality...\n');
  
  try {
    // Get all projects
    const projects = await Project.findAll({
      where: {
        status: ['ongoing', 'delayed']
      },
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones'
        }
      ]
    });
    
    console.log(`Found ${projects.length} projects to check\n`);
    
    for (const project of projects) {
      console.log(`\n📋 Checking Project: ${project.name}`);
      console.log(`   Current Status: ${project.status}`);
      console.log(`   Milestones: ${project.milestones?.length || 0}`);
      
      // Check delayed status
      const delayCheck = await delayedStatusService.checkProjectDelayedStatus(project.id);
      
      console.log(`   🔍 Delay Check Results:`);
      console.log(`      - Is Delayed: ${delayCheck.isDelayed}`);
      console.log(`      - Overdue Milestones: ${delayCheck.delayInfo.overdueMilestoneCount}`);
      console.log(`      - Max Days Overdue: ${delayCheck.delayInfo.maxDaysOverdue}`);
      console.log(`      - Severity: ${delayCheck.delayInfo.severity}`);
      
      if (delayCheck.overdueMilestones.length > 0) {
        console.log(`   📅 Overdue Milestones:`);
        delayCheck.overdueMilestones.forEach(milestone => {
          console.log(`      - ${milestone.title}: ${milestone.daysOverdue} days overdue (Due: ${milestone.dueDate})`);
        });
      }
      
      // Update status if needed
      if (delayCheck.isDelayed && project.status !== 'delayed') {
        console.log(`   ⚡ Updating project status to DELAYED...`);
        const result = await delayedStatusService.updateProjectDelayedStatus(project.id);
        console.log(`   ✅ Status updated: ${result.previousStatus} → ${result.currentStatus}`);
        
        // Create delay notification
        await delayedStatusService.createDelayedStatusUpdate(
          project.id, 
          result.delayInfo, 
          result.overdueMilestones
        );
        console.log(`   📝 Delay notification created`);
      }
      
      console.log(`   ${'─'.repeat(50)}`);
    }
    
    console.log('\n✅ Delayed status check complete!');
    
  } catch (error) {
    console.error('❌ Error testing delayed status:', error);
  }
  
  process.exit(0);
}

// Run the test
testDelayedStatus(); 
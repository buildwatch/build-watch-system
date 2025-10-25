const delayedStatusService = require('./services/delayedStatusService');
const { Project, ProjectMilestone } = require('./models');

async function testDelayDetection() {
  console.log('🔍 Testing delayed status detection...\n');
  
  try {
    // Test the specific project from screenshots
    const projectId = 'edfc77c1-a45b-49c8-b009-561f28b98992';
    
    console.log('📋 Project ID:', projectId);
    
    // First, let's see the raw milestone data
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      order: [['dueDate', 'ASC']]
    });
    
    console.log('\n🎯 Raw milestone data:');
    milestones.forEach(milestone => {
      const dueDate = new Date(milestone.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = dueDate < today;
      
      console.log(`- ${milestone.title}:`);
      console.log(`  Status: ${milestone.status}`);
      console.log(`  Due Date: ${milestone.dueDate}`);
      console.log(`  Is Overdue: ${isOverdue}`);
      console.log(`  Days Overdue: ${Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))}`);
    });
    
    // Now test the delayed status service
    console.log('\n🔍 Testing delayedStatusService.checkProjectDelayedStatus...');
    const delayCheck = await delayedStatusService.checkProjectDelayedStatus(projectId);
    
    console.log('\n✅ Delay check result:');
    console.log('Is Delayed:', delayCheck.isDelayed);
    console.log('Overdue Milestone Count:', delayCheck.delayInfo.overdueMilestoneCount);
    console.log('Max Days Overdue:', delayCheck.delayInfo.maxDaysOverdue);
    console.log('Overdue Milestones:', delayCheck.overdueMilestones.map(m => ({
      title: m.title,
      dueDate: m.dueDate,
      daysOverdue: m.daysOverdue,
      status: m.status
    })));
    
    // Test the update function
    console.log('\n🔄 Testing delayedStatusService.updateProjectDelayedStatus...');
    const updateResult = await delayedStatusService.updateProjectDelayedStatus(projectId);
    
    console.log('\n📝 Update result:');
    console.log('Status Changed:', updateResult.statusChanged);
    console.log('Previous Status:', updateResult.previousStatus);
    console.log('Current Status:', updateResult.currentStatus);
    console.log('Overdue Milestones:', updateResult.overdueMilestones.length);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testDelayDetection(); 
const { Project, ProjectUpdate, ProjectMilestone } = require('../models');

async function fixDivisionWeights() {
  try {
    console.log('🔧 Fixing Division Weights...\n');
    
    // Get the specific project
    const projectId = '55a35f40-a287-4864-923c-1665d2b2c670';
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      console.log('❌ Project not found');
      return;
    }
    
    console.log(`📋 Project: ${project.name} (${project.projectCode})`);
    
    // Get latest milestone update
    const latestUpdate = await ProjectUpdate.findOne({
      where: {
        projectId: projectId,
        updateType: {
          [require('sequelize').Op.in]: ['milestone', 'milestone_update']
        }
      },
      order: [['createdAt', 'DESC']]
    });
    
    if (!latestUpdate) {
      console.log('❌ No milestone updates found');
      return;
    }
    
    console.log(`📝 Latest Update: ${latestUpdate.title}`);
    console.log(`📅 Submitted: ${latestUpdate.submittedAt}`);
    console.log(`📊 Status: ${latestUpdate.status}`);
    
    // Parse milestone updates
    let milestoneUpdates = [];
    try {
      milestoneUpdates = typeof latestUpdate.milestoneUpdates === 'string' 
        ? JSON.parse(latestUpdate.milestoneUpdates) 
        : latestUpdate.milestoneUpdates || [];
    } catch (e) {
      console.log('❌ Error parsing milestone updates:', e.message);
      return;
    }
    
    console.log(`\n📋 Current Milestone Updates (${milestoneUpdates.length}):`);
    milestoneUpdates.forEach((update, index) => {
      console.log(`\n  Milestone ${index + 1}:`);
      console.log(`    Title: ${update.milestoneTitle || update.title || 'undefined'}`);
      console.log(`    Timeline Status: ${update.timelineStatus || 'pending'}`);
      console.log(`    Budget Status: ${update.budgetStatus || 'pending'}`);
      console.log(`    Physical Status: ${update.physicalStatus || 'pending'}`);
      console.log(`    Timeline Weight: ${update.timelineWeight || 0}`);
      console.log(`    Budget Weight: ${update.budgetWeight || 0}`);
      console.log(`    Physical Weight: ${update.physicalWeight || 0}`);
    });
    
    // Fix the milestone updates
    let hasChanges = false;
    milestoneUpdates.forEach((update, index) => {
      console.log(`\n🔧 Fixing Milestone ${index + 1}:`);
      
      // Fix milestone title
      if (!update.milestoneTitle && !update.title) {
        update.milestoneTitle = 'Site Preparation and Excavation';
        console.log(`   ✅ Added milestone title: ${update.milestoneTitle}`);
        hasChanges = true;
      }
      
      // Fix division weights (each division gets 33.33% of milestone weight)
      const milestoneWeight = parseFloat(update.weight || 40); // Default to 40% if not set
      const divisionWeight = milestoneWeight / 3; // Each division gets equal share
      
      if (!update.timelineWeight || update.timelineWeight === 0) {
        update.timelineWeight = divisionWeight;
        console.log(`   ✅ Set timeline weight: ${divisionWeight.toFixed(2)}%`);
        hasChanges = true;
      }
      
      if (!update.budgetWeight || update.budgetWeight === 0) {
        update.budgetWeight = divisionWeight;
        console.log(`   ✅ Set budget weight: ${divisionWeight.toFixed(2)}%`);
        hasChanges = true;
      }
      
      if (!update.physicalWeight || update.physicalWeight === 0) {
        update.physicalWeight = divisionWeight;
        console.log(`   ✅ Set physical weight: ${divisionWeight.toFixed(2)}%`);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      // Update the project update with fixed milestone updates
      await latestUpdate.update({
        milestoneUpdates: JSON.stringify(milestoneUpdates)
      });
      
      console.log('\n✅ Updated milestone updates in database');
      
      // Test the progress calculation
      console.log('\n🧮 Testing Progress Calculation After Fix...');
      const ProgressCalculationService = require('../services/progressCalculationService');
      
      try {
        const progressData = await ProgressCalculationService.calculateProjectProgress(projectId, 'secretariat');
        
        console.log('\n✅ ProgressCalculationService Results After Fix:');
        console.log(`   Overall Progress: ${progressData.progress.overall}%`);
        console.log(`   Timeline Progress: ${progressData.progress.timeline}%`);
        console.log(`   Budget Progress: ${progressData.progress.budget}%`);
        console.log(`   Physical Progress: ${progressData.progress.physical}%`);
        
        if (progressData.compiledReport.exists) {
          console.log(`   Applied Weight: ${progressData.compiledReport.appliedWeight}%`);
          console.log(`   Total Weight: ${progressData.compiledReport.totalWeight}%`);
        }
        
      } catch (error) {
        console.log('❌ ProgressCalculationService Error:', error.message);
      }
      
    } else {
      console.log('\n✅ No changes needed - division weights are already correct');
    }
    
  } catch (error) {
    console.error('❌ Fix Error:', error);
  }
}

// Run the fix
fixDivisionWeights().then(() => {
  console.log('\n✅ Fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
}); 
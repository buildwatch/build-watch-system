const { Project, ProjectUpdate, ProjectMilestone } = require('../models');
const ProgressCalculationService = require('../services/progressCalculationService');

async function debugProgressCalculation() {
  try {
    console.log('🔍 Debugging Progress Calculation...\n');
    
    // Get the specific project
    const projectId = '55a35f40-a287-4864-923c-1665d2b2c670';
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      console.log('❌ Project not found');
      return;
    }
    
    console.log(`📋 Project: ${project.name} (${project.projectCode})`);
    console.log(`📊 Current Progress: ${project.overallProgress}%`);
    console.log(`📈 Timeline: ${project.timelineProgress}%`);
    console.log(`💰 Budget: ${project.budgetProgress}%`);
    console.log(`🏗️ Physical: ${project.physicalProgress}%`);
    
    // Test ProgressCalculationService
    console.log('\n🔧 Testing ProgressCalculationService...');
    try {
      const progressData = await ProgressCalculationService.calculateProjectProgress(projectId, 'secretariat');
      console.log('✅ ProgressCalculationService Result:');
      console.log(`   Overall: ${progressData.progress.overall}%`);
      console.log(`   Timeline: ${progressData.progress.timeline}%`);
      console.log(`   Budget: ${progressData.progress.budget}%`);
      console.log(`   Physical: ${progressData.progress.physical}%`);
      console.log(`   Amount Spent: ₱${progressData.amountSpent.toLocaleString()}`);
    } catch (error) {
      console.log('❌ ProgressCalculationService Error:', error.message);
    }
    
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
    
    if (latestUpdate) {
      console.log('\n📝 Latest Milestone Update:');
      console.log(`   ID: ${latestUpdate.id}`);
      console.log(`   Status: ${latestUpdate.status}`);
      console.log(`   Type: ${latestUpdate.updateType}`);
      
      if (latestUpdate.milestoneUpdates) {
        try {
          const milestoneUpdates = typeof latestUpdate.milestoneUpdates === 'string' 
            ? JSON.parse(latestUpdate.milestoneUpdates) 
            : latestUpdate.milestoneUpdates;
          
          console.log(`\n📊 Milestone Updates (${milestoneUpdates.length} milestones):`);
          milestoneUpdates.forEach((milestone, index) => {
            console.log(`   ${index + 1}. ${milestone.milestoneTitle || milestone.title || `Milestone ${index + 1}`}:`);
            console.log(`      Weight: ${milestone.weight}%`);
            console.log(`      Timeline Status: ${milestone.timelineStatus} (Weight: ${milestone.timelineWeight})`);
            console.log(`      Budget Status: ${milestone.budgetStatus} (Weight: ${milestone.budgetWeight})`);
            console.log(`      Physical Status: ${milestone.physicalStatus} (Weight: ${milestone.physicalWeight})`);
          });
        } catch (e) {
          console.log('❌ Error parsing milestone updates:', e.message);
        }
      }
    }
    
    // Test division progress calculation
    console.log('\n🔧 Testing Division Progress Calculation...');
    try {
      const divisionProgress = await ProgressCalculationService.calculateDivisionProgress(projectId);
      console.log('✅ Division Progress Result:');
      console.log(`   Timeline: ${divisionProgress.timeline}%`);
      console.log(`   Budget: ${divisionProgress.budget}%`);
      console.log(`   Physical: ${divisionProgress.physical}%`);
    } catch (error) {
      console.log('❌ Division Progress Error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
  }
}

debugProgressCalculation(); 
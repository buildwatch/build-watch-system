const { Project, ProjectUpdate, ProjectMilestone } = require('../models');
const { Op } = require('sequelize');

async function fixProjectProgress() {
  try {
    console.log('🔧 Fixing project progress for PRJ-2025-076329...');

    // Find the project
    const project = await Project.findOne({
      where: { projectCode: 'PRJ-2025-076329' }
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`\n📋 Current Project Status:`);
    console.log(`   Project Code: ${project.projectCode}`);
    console.log(`   Name: ${project.name}`);
    console.log(`   Workflow Status: ${project.workflowStatus}`);
    console.log(`   Overall Progress: ${project.overallProgress}%`);
    console.log(`   Timeline Progress: ${project.timelineProgress}%`);
    console.log(`   Budget Progress: ${project.budgetProgress}%`);
    console.log(`   Physical Progress: ${project.physicalProgress}%`);

    // Find the latest milestone update
    const milestoneUpdate = await ProjectUpdate.findOne({
      where: {
        projectId: project.id,
        updateType: 'milestone',
        status: 'iu_approved'
      },
      order: [['createdAt', 'DESC']]
    });

    if (!milestoneUpdate) {
      console.log('❌ No approved milestone update found');
      return;
    }

    console.log(`\n📊 Milestone Update Details:`);
    console.log(`   Status: ${milestoneUpdate.status}`);
    console.log(`   Claimed Progress: ${milestoneUpdate.claimedProgress}%`);
    console.log(`   Adjusted Progress: ${milestoneUpdate.adjustedProgress}%`);
    console.log(`   Final Progress: ${milestoneUpdate.finalProgress}%`);

    // Parse milestone updates to get the actual milestone data
    let milestoneUpdates = [];
    try {
      milestoneUpdates = typeof milestoneUpdate.milestoneUpdates === 'string' 
        ? JSON.parse(milestoneUpdate.milestoneUpdates) 
        : milestoneUpdate.milestoneUpdates;
    } catch (e) {
      console.error('❌ Error parsing milestone updates:', e);
      return;
    }

    console.log(`\n📋 Milestone Updates (${milestoneUpdates.length} milestones):`);
    let totalWeight = 0;
    let appliedWeight = 0;

    milestoneUpdates.forEach((milestone, index) => {
      const weight = parseFloat(milestone.weight) || 0;
      const status = milestone.status;
      totalWeight += weight;
      
      console.log(`   ${index + 1}. ${milestone.title || `Milestone ${index + 1}`}:`);
      console.log(`      Weight: ${weight}%`);
      console.log(`      Status: ${status}`);
      
      if (status === 'completed') {
        appliedWeight += weight;
        console.log(`      ✅ Applied: ${weight}%`);
      } else if (status === 'in_progress') {
        const progress = parseFloat(milestone.progress) || 0;
        const applied = (weight * progress) / 100;
        appliedWeight += applied;
        console.log(`      🔄 In Progress: ${progress}% (Applied: ${applied.toFixed(2)}%)`);
      } else {
        console.log(`      ⏳ Pending: 0%`);
      }
    });

    console.log(`\n📊 Progress Summary:`);
    console.log(`   Total Weight: ${totalWeight}%`);
    console.log(`   Applied Weight: ${appliedWeight.toFixed(2)}%`);

    // Calculate division progress (each division gets equal share of applied weight)
    const divisionWeight = appliedWeight / 3; // Each division gets equal share
    
    const newTimelineProgress = Math.min(100, divisionWeight);
    const newBudgetProgress = Math.min(100, divisionWeight);
    const newPhysicalProgress = Math.min(100, divisionWeight);
    const newOverallProgress = Math.min(100, appliedWeight);

    console.log(`\n🔧 Updating Project Progress:`);
    console.log(`   Timeline Progress: ${project.timelineProgress}% → ${newTimelineProgress.toFixed(2)}%`);
    console.log(`   Budget Progress: ${project.budgetProgress}% → ${newBudgetProgress.toFixed(2)}%`);
    console.log(`   Physical Progress: ${project.physicalProgress}% → ${newPhysicalProgress.toFixed(2)}%`);
    console.log(`   Overall Progress: ${project.overallProgress}% → ${newOverallProgress.toFixed(2)}%`);

    // Update the project progress
    await project.update({
      timelineProgress: newTimelineProgress,
      budgetProgress: newBudgetProgress,
      physicalProgress: newPhysicalProgress,
      overallProgress: newOverallProgress,
      automatedProgress: newOverallProgress
    });

    console.log(`\n✅ Project progress updated successfully!`);
    console.log(`   The project now reflects the actual milestone progress.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing project progress:', error);
    process.exit(1);
  }
}

fixProjectProgress(); 
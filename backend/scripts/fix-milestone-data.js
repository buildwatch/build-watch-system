const { Project, ProjectUpdate, ProjectMilestone } = require('../models');
const { Op } = require('sequelize');

async function fixMilestoneData() {
  try {
    console.log('🔧 Fixing milestone data for PRJ-2025-076329...');

    // Find the project
    const project = await Project.findOne({
      where: { projectCode: 'PRJ-2025-076329' }
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    // Get the milestone update that needs fixing
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

    console.log(`\n📋 Current Milestone Update:`);
    console.log(`   ID: ${milestoneUpdate.id}`);
    console.log(`   Status: ${milestoneUpdate.status}`);

    // Get the project milestones to get the correct data
    const projectMilestones = await ProjectMilestone.findAll({
      where: { projectId: project.id },
      order: [['order', 'ASC']]
    });

    console.log(`\n📋 Project Milestones (${projectMilestones.length} total):`);
    projectMilestones.forEach((milestone, index) => {
      console.log(`   ${index + 1}. ${milestone.title}:`);
      console.log(`      Weight: ${milestone.weight}%`);
      console.log(`      Status: ${milestone.status}`);
      console.log(`      Progress: ${milestone.progress}%`);
    });

    // Create the correct milestone updates data
    const correctMilestoneUpdates = projectMilestones.map((milestone, index) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      weight: parseFloat(milestone.weight) || 0,
      status: milestone.status,
      progress: parseFloat(milestone.progress) || 0,
      dueDate: milestone.dueDate,
      plannedBudget: milestone.plannedBudget,
      order: milestone.order
    }));

    console.log(`\n🔧 Corrected Milestone Updates:`);
    correctMilestoneUpdates.forEach((milestone, index) => {
      console.log(`   ${index + 1}. ${milestone.title}:`);
      console.log(`      Weight: ${milestone.weight}%`);
      console.log(`      Status: ${milestone.status}`);
      console.log(`      Progress: ${milestone.progress}%`);
    });

    // Calculate the total applied weight
    const appliedWeight = correctMilestoneUpdates.reduce((total, milestone) => {
      if (milestone.status === 'completed') {
        return total + milestone.weight;
      } else if (milestone.status === 'in_progress') {
        return total + (milestone.weight * milestone.progress / 100);
      }
      return total;
    }, 0);

    console.log(`\n📊 Progress Calculation:`);
    console.log(`   Total Applied Weight: ${appliedWeight.toFixed(2)}%`);

    // Update the milestone update with correct data
    await milestoneUpdate.update({
      milestoneUpdates: correctMilestoneUpdates,
      claimedProgress: appliedWeight,
      adjustedProgress: appliedWeight,
      finalProgress: appliedWeight
    });

    console.log(`\n✅ Milestone update data fixed successfully!`);

    // Now update the project progress
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
    console.log(`   The project now reflects the correct milestone progress.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing milestone data:', error);
    process.exit(1);
  }
}

fixMilestoneData(); 
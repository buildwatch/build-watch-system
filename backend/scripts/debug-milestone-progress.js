/**
 * Debug script to check milestone progress calculation
 * Usage: node backend/scripts/debug-milestone-progress.js <projectCode>
 */

const { Project, ProjectMilestone, MilestoneSubmission } = require('../models');
const { Op } = require('sequelize');
const ProgressCalculationService = require('../services/progressCalculationService');

async function debugMilestoneProgress(projectCode) {
  try {
    console.log(`\n🔍 Debugging milestone progress for project: ${projectCode}\n`);
    
    // Find the project
    const project = await Project.findOne({
      where: { projectCode: projectCode },
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones',
          required: false
        }
      ]
    });
    
    if (!project) {
      console.error(`❌ Project not found: ${projectCode}`);
      return;
    }
    
    console.log(`✅ Found project: ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Overall Progress: ${project.overallProgress || 0}%`);
    console.log(`   Total Budget: ₱${parseFloat(project.totalBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`\n📋 Checking milestones...\n`);
    
    // Get all milestones
    const milestones = await ProjectMilestone.findAll({
      where: { projectId: project.id },
      order: [['order', 'ASC'], ['dueDate', 'ASC']]
    });
    
    console.log(`Found ${milestones.length} milestone(s):\n`);
    
    // Get progress data from ProgressCalculationService
    let progressData = null;
    try {
      const progressResult = await ProgressCalculationService.calculateProjectProgress(project.id, 'iu');
      progressData = progressResult;
      console.log(`📊 Progress Calculation Service Results:`);
      console.log(`   Overall Progress: ${progressResult.progress?.overall || 0}%`);
      console.log(`   Timeline Progress: ${progressResult.progress?.timeline || 0}%`);
      console.log(`   Budget Progress: ${progressResult.progress?.budget || 0}%`);
      console.log(`   Physical Progress: ${progressResult.progress?.physical || 0}%`);
      if (progressResult.milestones && Array.isArray(progressResult.milestones)) {
        console.log(`   Milestones in progress data: ${progressResult.milestones.length}`);
      }
      console.log('');
    } catch (progressError) {
      console.warn('⚠️  Could not fetch progress data:', progressError.message);
    }
    
    for (const milestone of milestones) {
      console.log(`📌 Milestone: ${milestone.title}`);
      console.log(`   ID: ${milestone.id}`);
      console.log(`   Status: ${milestone.status}`);
      console.log(`   Weight: ${milestone.weight}%`);
      console.log(`   Progress (from DB): ${milestone.progress || 0}%`);
      console.log(`   Timeline Status: ${milestone.timelineStatus || 'N/A'}`);
      console.log(`   Budget Status: ${milestone.budgetStatus || 'N/A'}`);
      console.log(`   Physical Status: ${milestone.physicalStatus || 'N/A'}`);
      
      // Check for approved submissions
      const approvedSubmissions = await MilestoneSubmission.findAll({
        where: {
          milestoneId: milestone.id,
          status: {
            [Op.in]: ['approved', 'iu_approved']
          }
        },
        order: [['submittedAt', 'DESC']],
        limit: 1
      });
      
      if (approvedSubmissions.length > 0) {
        const latestSubmission = approvedSubmissions[0];
        console.log(`   Latest Approved Submission:`);
        console.log(`     ID: ${latestSubmission.id}`);
        console.log(`     Status: ${latestSubmission.status}`);
        console.log(`     Budget Utilization: ${latestSubmission.budgetUtilizationPercentage || 0}%`);
        console.log(`     Milestone Utilization: ${latestSubmission.milestoneUtilizationPercentage || 0}%`);
        console.log(`     Used Budget: ₱${parseFloat(latestSubmission.usedBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        console.log(`   ⚠️  No approved submissions found`);
      }
      
      // Calculate expected progress
      let expectedProgress = milestone.progress || 0;
      
      // If milestone is completed/approved, use project overall progress
      const isCompleted = milestone.status === 'completed' || milestone.status === 'approved' ||
                         (milestone.timelineStatus === 'approved' && milestone.budgetStatus === 'approved' && milestone.physicalStatus === 'approved');
      
      if (isCompleted) {
        const milestoneWeight = parseFloat(milestone.weight || 0);
        if (milestoneWeight === 100) {
          expectedProgress = parseFloat(project.overallProgress || 0);
          console.log(`   ✅ Milestone is completed with 100% weight, expected progress: ${expectedProgress}% (from project overall progress)`);
        } else if (approvedSubmissions.length > 0) {
          const latestSubmission = approvedSubmissions[0];
          if (latestSubmission.milestoneUtilizationPercentage) {
            expectedProgress = parseFloat(latestSubmission.milestoneUtilizationPercentage);
            console.log(`   ✅ Milestone is completed, expected progress: ${expectedProgress}% (from submission)`);
          } else {
            expectedProgress = parseFloat(project.overallProgress || 0);
            console.log(`   ✅ Milestone is completed, expected progress: ${expectedProgress}% (from project overall progress)`);
          }
        } else {
          expectedProgress = parseFloat(project.overallProgress || 0);
          console.log(`   ✅ Milestone is completed, expected progress: ${expectedProgress}% (from project overall progress)`);
        }
      } else if (progressData && progressData.milestones && Array.isArray(progressData.milestones)) {
        const milestoneProgress = progressData.milestones.find(m => m.id === milestone.id);
        if (milestoneProgress && milestoneProgress.progress) {
          expectedProgress = parseFloat(milestoneProgress.progress);
          console.log(`   📊 Expected progress from progressData: ${expectedProgress}%`);
        }
      }
      
      console.log(`   🎯 Expected Progress: ${expectedProgress.toFixed(2)}%`);
      console.log(`   ❌ Current Progress (from DB): ${milestone.progress || 0}%`);
      
      if (Math.abs(expectedProgress - (milestone.progress || 0)) > 0.01) {
        console.log(`   ⚠️  MISMATCH: Expected ${expectedProgress.toFixed(2)}% but milestone.progress is ${milestone.progress || 0}%`);
      }
      
      console.log('');
    }
    
    console.log(`\n✅ Debug complete!\n`);
    console.log(`\n💡 Recommendations:`);
    console.log(`   1. For completed milestones with 100% weight, progress should match project overall progress`);
    console.log(`   2. For completed milestones with approved submissions, use submission's milestoneUtilizationPercentage`);
    console.log(`   3. Ensure calculateMilestoneProgress function is called with progressData containing project overallProgress\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Get project code from command line
const projectCode = process.argv[2];

if (!projectCode) {
  console.error('❌ Please provide a project code');
  console.log('Usage: node backend/scripts/debug-milestone-progress.js <projectCode>');
  process.exit(1);
}

debugMilestoneProgress(projectCode);


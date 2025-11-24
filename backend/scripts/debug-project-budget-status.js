/**
 * Debug script to check project budget and status issues
 * Usage: node backend/scripts/debug-project-budget-status.js PRJ-MEO-20250090
 */

const { Project, ProjectMilestone, MilestoneSubmission } = require('../models');
const { Op } = require('sequelize');
const ProgressCalculationService = require('../services/progressCalculationService');
const ProjectCompletionService = require('../services/projectCompletionService');

async function debugProjectBudgetStatus(projectCode) {
  try {
    console.log(`\n🔍 Debugging project budget and status for: ${projectCode}\n`);
    
    // Find the project
    const project = await Project.findOne({
      where: { projectCode: projectCode }
    });
    
    if (!project) {
      console.error(`❌ Project not found: ${projectCode}`);
      return;
    }
    
    console.log(`✅ Found project: ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Total Budget: ₱${parseFloat(project.totalBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Overall Progress: ${project.overallProgress || 0}%`);
    console.log(`\n📋 Checking milestones and submissions...\n`);
    
    // Get all milestones
    const milestones = await ProjectMilestone.findAll({
      where: { projectId: project.id }
    });
    
    console.log(`Found ${milestones.length} milestone(s):\n`);
    
    let totalUsedBudget = 0;
    
    for (const milestone of milestones) {
      console.log(`📌 Milestone: ${milestone.title}`);
      console.log(`   ID: ${milestone.id}`);
      console.log(`   Planned Budget: ₱${parseFloat(milestone.plannedBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      
      // Get approved submissions for this milestone
      const approvedSubmissions = await MilestoneSubmission.findAll({
        where: {
          milestoneId: milestone.id,
          status: {
            [Op.in]: ['approved', 'iu_approved']
          }
        },
        order: [['submittedAt', 'DESC']]
      });
      
      console.log(`   Approved Submissions: ${approvedSubmissions.length}`);
      
      if (approvedSubmissions.length > 0) {
        // Get the latest approved submission's usedBudget
        const latestSubmission = approvedSubmissions[0];
        const usedBudget = parseFloat(latestSubmission.usedBudget || 0);
        console.log(`   Latest Used Budget: ₱${usedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        totalUsedBudget += usedBudget;
        
        // Show all approved submissions
        approvedSubmissions.forEach((sub, idx) => {
          console.log(`     Submission ${idx + 1}: ₱${parseFloat(sub.usedBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sub.status})`);
        });
      } else {
        console.log(`   ⚠️  No approved submissions found`);
      }
      
      console.log('');
    }
    
    console.log(`\n💰 Budget Summary:`);
    console.log(`   Total Budget: ₱${parseFloat(project.totalBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Total Used Budget (from submissions): ₱${totalUsedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Remaining Budget: ₱${(parseFloat(project.totalBudget || 0) - totalUsedBudget).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    // Check what ProgressCalculationService returns
    console.log(`\n🔄 Checking ProgressCalculationService...\n`);
    const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, 'iu');
    
    console.log(`   Progress Data:`);
    console.log(`     Overall Progress: ${progressData.progress?.overall || 0}%`);
    console.log(`     Budget Progress: ${progressData.progress?.budget || 0}%`);
    console.log(`     Amount Spent (calculated): ₱${parseFloat(progressData.project?.amountSpent || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`     Amount Spent (from progress): ₱${parseFloat(progressData.progress?.amountSpent || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    // Check project status
    console.log(`\n📊 Checking project status...\n`);
    const completionResult = await ProjectCompletionService.checkAndUpdateProjectCompletion(project.id, project);
    
    console.log(`   Completion Check:`);
    console.log(`     Is Completed: ${completionResult.isCompleted}`);
    console.log(`     Was Updated: ${completionResult.wasUpdated}`);
    console.log(`     Project Status: ${completionResult.project?.status}`);
    console.log(`     Completion Date: ${completionResult.project?.completionDate || 'N/A'}`);
    
    // Reload project to get latest status
    await project.reload();
    console.log(`\n   After reload:`);
    console.log(`     Status: ${project.status}`);
    console.log(`     Overall Progress: ${project.overallProgress || 0}%`);
    console.log(`     Completion Date: ${project.completionDate || 'N/A'}`);
    
    console.log(`\n✅ Debug complete!\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Get project code from command line
const projectCode = process.argv[2] || 'PRJ-MEO-20250090';

debugProjectBudgetStatus(projectCode);


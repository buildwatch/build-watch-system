/**
 * Debug script to check why a project is not marked as completed
 * Usage: node backend/scripts/debug-project-completion.js PRJ-MEO-20250090
 */

const { Project, ProjectMilestone, MilestoneSubmission } = require('../models');
const { Op } = require('sequelize');
const projectCompletionService = require('../services/projectCompletionService');

async function debugProjectCompletion(projectCode) {
  try {
    console.log(`\n🔍 Debugging project completion for: ${projectCode}\n`);
    
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
    console.log(`   Current Status: ${project.status}`);
    console.log(`   Completion Date: ${project.completionDate || 'N/A'}`);
    console.log(`\n📋 Checking milestones...\n`);
    
    // Get all milestones
    const milestones = await ProjectMilestone.findAll({
      where: { projectId: project.id },
      attributes: ['id', 'title', 'status', 'timelineStatus', 'budgetStatus', 'physicalStatus', 'completedDate']
    });
    
    console.log(`Found ${milestones.length} milestone(s):\n`);
    
    if (milestones.length === 0) {
      console.log('⚠️  No milestones found for this project');
      return;
    }
    
    // Check each milestone
    const milestoneChecks = [];
    
    for (const milestone of milestones) {
      console.log(`📌 Milestone: ${milestone.title}`);
      console.log(`   ID: ${milestone.id}`);
      console.log(`   Status: ${milestone.status}`);
      console.log(`   Timeline Status: ${milestone.timelineStatus || 'N/A'}`);
      console.log(`   Budget Status: ${milestone.budgetStatus || 'N/A'}`);
      console.log(`   Physical Status: ${milestone.physicalStatus || 'N/A'}`);
      
      // Check milestone status
      const statusCompleted = milestone.status === 'completed' || milestone.status === 'approved';
      console.log(`   ✓ Status check (completed/approved): ${statusCompleted}`);
      
      // Check divisions
      const divisionsApproved = 
        milestone.timelineStatus === 'approved' &&
        milestone.budgetStatus === 'approved' &&
        milestone.physicalStatus === 'approved';
      console.log(`   ✓ All divisions approved: ${divisionsApproved}`);
      
      // Check approved submissions
      const approvedSubmissions = await MilestoneSubmission.count({
        where: {
          milestoneId: milestone.id,
          status: {
            [Op.in]: ['approved', 'iu_approved']
          }
        }
      });
      console.log(`   ✓ Approved submissions: ${approvedSubmissions}`);
      
      const isCompleted = statusCompleted || divisionsApproved || approvedSubmissions > 0;
      console.log(`   → Milestone is completed: ${isCompleted ? '✅ YES' : '❌ NO'}\n`);
      
      milestoneChecks.push(isCompleted);
    }
    
    // Check if all milestones are completed
    const allMilestonesCompleted = milestoneChecks.length > 0 && milestoneChecks.every(check => check === true);
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total Milestones: ${milestones.length}`);
    console.log(`   Completed Milestones: ${milestoneChecks.filter(c => c).length}`);
    console.log(`   All Milestones Completed: ${allMilestonesCompleted ? '✅ YES' : '❌ NO'}`);
    console.log(`   Project Status: ${project.status}`);
    console.log(`   Should be completed: ${allMilestonesCompleted ? '✅ YES' : '❌ NO'}`);
    
    // Try to run the completion service
    console.log(`\n🔄 Running completion service...\n`);
    const result = await projectCompletionService.checkAndUpdateProjectCompletion(project.id, project);
    
    console.log(`\n📋 Completion Service Result:`);
    console.log(`   Is Completed: ${result.isCompleted}`);
    console.log(`   Was Updated: ${result.wasUpdated}`);
    
    if (result.wasUpdated) {
      await result.project.reload();
      console.log(`   ✅ Project status updated to: ${result.project.status}`);
      console.log(`   ✅ Completion date: ${result.project.completionDate}`);
    } else if (result.isCompleted) {
      console.log(`   ℹ️  Project is already marked as completed`);
    } else {
      console.log(`   ⚠️  Project was NOT updated. Reasons:`);
      if (milestones.length === 0) {
        console.log(`      - No milestones found`);
      } else {
        const incompleteMilestones = milestones.filter((m, i) => !milestoneChecks[i]);
        console.log(`      - Incomplete milestones: ${incompleteMilestones.map(m => m.title).join(', ')}`);
      }
    }
    
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

debugProjectCompletion(projectCode);


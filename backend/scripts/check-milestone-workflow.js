const { Project, ProjectUpdate, ProjectMilestone } = require('../models');
const { Op } = require('sequelize');

async function checkMilestoneWorkflow() {
  try {
    console.log('🔍 Checking milestone workflow for project PRJ-2025-076329...');

    // Find the project
    const project = await Project.findOne({
      where: { projectCode: 'PRJ-2025-076329' }
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`\n📋 Project Details:`);
    console.log(`   Project Code: ${project.projectCode}`);
    console.log(`   Name: ${project.name}`);
    console.log(`   Workflow Status: ${project.workflowStatus}`);
    console.log(`   Submitted to Secretariat: ${project.submittedToSecretariat}`);
    console.log(`   Approved by Secretariat: ${project.approvedBySecretariat}`);

    // Find all project updates
    const updates = await ProjectUpdate.findAll({
      where: { projectId: project.id },
      order: [['createdAt', 'DESC']]
    });

    console.log(`\n📊 Project Updates (${updates.length} total):`);
    updates.forEach((update, index) => {
      console.log(`   ${index + 1}. ${update.updateType} Update:`);
      console.log(`      Status: ${update.status}`);
      console.log(`      Submitted by: ${update.submittedByRole}`);
      console.log(`      Progress: ${update.currentProgress}%`);
      console.log(`      Created: ${update.createdAt}`);
      console.log(`      Has Milestone Data: ${update.milestoneUpdates ? 'Yes' : 'No'}`);
    });

    // Check for approved milestone updates
    const approvedUpdates = updates.filter(u => u.status === 'iu_approved');
    const approvedMilestone = approvedUpdates.find(u => u.updateType === 'milestone');

    console.log(`\n✅ Approved Updates: ${approvedUpdates.length}`);
    console.log(`✅ Approved Milestone Updates: ${approvedMilestone ? 'Yes' : 'No'}`);

    if (approvedMilestone) {
      console.log(`\n📋 Approved Milestone Details:`);
      console.log(`   ID: ${approvedMilestone.id}`);
      console.log(`   Status: ${approvedMilestone.status}`);
      console.log(`   Progress: ${approvedMilestone.currentProgress}%`);
      console.log(`   Has Milestone Data: ${approvedMilestone.milestoneUpdates ? 'Yes' : 'No'}`);
      
      if (approvedMilestone.milestoneUpdates) {
        try {
          const milestones = typeof approvedMilestone.milestoneUpdates === 'string' 
            ? JSON.parse(approvedMilestone.milestoneUpdates) 
            : approvedMilestone.milestoneUpdates;
          console.log(`   Milestone Count: ${milestones.length}`);
        } catch (e) {
          console.log(`   Error parsing milestone data: ${e.message}`);
        }
      }
    }

    // Check what should happen next
    console.log(`\n🔍 Workflow Analysis:`);
    
    if (project.workflowStatus === 'secretariat_approved') {
      console.log(`   ✅ Project is already approved by Secretariat`);
      console.log(`   ✅ Should be visible in Secretariat compilation`);
    } else if (project.workflowStatus === 'submitted') {
      console.log(`   ⏳ Project is submitted to Secretariat for approval`);
      console.log(`   ✅ Should be visible in Secretariat submissions`);
    } else if (approvedMilestone) {
      console.log(`   ⚠️  Project has approved milestone but workflow status is: ${project.workflowStatus}`);
      console.log(`   🔧 Should be compiled and submitted to Secretariat`);
    } else {
      console.log(`   ❌ No approved milestone updates found`);
      console.log(`   🔧 Need to approve milestone updates first`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking milestone workflow:', error);
    process.exit(1);
  }
}

checkMilestoneWorkflow(); 
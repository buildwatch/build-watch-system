const { Project, ProjectUpdate, ProjectMilestone } = require('../models');
const { Op } = require('sequelize');

async function fixMilestoneWorkflow() {
  try {
    console.log('🔧 Fixing milestone workflow for project PRJ-2025-076329...');

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
    console.log(`   Submitted to Secretariat: ${project.submittedToSecretariat}`);
    console.log(`   Approved by Secretariat: ${project.approvedBySecretariat}`);

    // Find approved milestone updates
    const approvedUpdates = await ProjectUpdate.findAll({
      where: {
        projectId: project.id,
        status: 'iu_approved',
        updateType: 'milestone'
      }
    });

    console.log(`\n📊 Found ${approvedUpdates.length} approved milestone updates`);

    if (approvedUpdates.length > 0) {
      const latestUpdate = approvedUpdates[0];
      console.log(`\n📋 Latest Approved Milestone:`);
      console.log(`   ID: ${latestUpdate.id}`);
      console.log(`   Status: ${latestUpdate.status}`);
      console.log(`   Progress: ${latestUpdate.currentProgress}%`);
      console.log(`   Has Milestone Data: ${latestUpdate.milestoneUpdates ? 'Yes' : 'No'}`);

      // Check if project should be in compilation or submissions
      if (project.workflowStatus === 'secretariat_approved') {
        console.log(`\n✅ Project is already approved by Secretariat`);
        console.log(`✅ Should appear in Compilation Summary`);
        
        // Update to validated status if milestone is approved
        if (latestUpdate.status === 'iu_approved') {
          console.log(`\n🔄 Updating project to validated status...`);
          await project.update({
            workflowStatus: 'validated_by_secretariat'
          });
          console.log(`✅ Project workflow status updated to 'validated_by_secretariat'`);
        }
      } else if (project.workflowStatus === 'submitted') {
        console.log(`\n✅ Project is submitted to Secretariat`);
        console.log(`✅ Should appear in Submissions & Tracker`);
      } else {
        console.log(`\n⚠️  Project workflow status is: ${project.workflowStatus}`);
        console.log(`🔧 Updating to appropriate status...`);
        
        // Determine correct status based on milestone approval
        if (latestUpdate.status === 'iu_approved') {
          await project.update({
            workflowStatus: 'submitted',
            submittedToSecretariat: true,
            submittedToSecretariatDate: new Date()
          });
          console.log(`✅ Project updated to 'submitted' status`);
        }
      }
    } else {
      console.log(`\n❌ No approved milestone updates found`);
      console.log(`🔧 Checking for pending milestone updates...`);
      
      const pendingUpdates = await ProjectUpdate.findAll({
        where: {
          projectId: project.id,
          status: 'submitted',
          updateType: 'milestone'
        }
      });

      if (pendingUpdates.length > 0) {
        console.log(`📋 Found ${pendingUpdates.length} pending milestone updates`);
        console.log(`⏳ These need to be approved by Implementing Office first`);
      } else {
        console.log(`❌ No milestone updates found at all`);
        console.log(`🔧 Project may need milestone updates to be submitted`);
      }
    }

    // Final status check
    const updatedProject = await Project.findOne({
      where: { projectCode: 'PRJ-2025-076329' }
    });

    console.log(`\n📋 Final Project Status:`);
    console.log(`   Workflow Status: ${updatedProject.workflowStatus}`);
    console.log(`   Submitted to Secretariat: ${updatedProject.submittedToSecretariat}`);
    console.log(`   Approved by Secretariat: ${updatedProject.approvedBySecretariat}`);

    // Show where project should appear
    console.log(`\n🎯 Project Visibility:`);
    if (updatedProject.workflowStatus === 'submitted') {
      console.log(`   ✅ Should appear in: Submissions & Tracker`);
      console.log(`   ⏳ Status: Pending Secretariat Review`);
    } else if (updatedProject.workflowStatus === 'secretariat_approved' || 
               updatedProject.workflowStatus === 'validated_by_secretariat') {
      console.log(`   ✅ Should appear in: Compilation Summary`);
      console.log(`   ✅ Status: Approved by Secretariat`);
    } else {
      console.log(`   ⚠️  Status: ${updatedProject.workflowStatus}`);
      console.log(`   🔧 May need manual review`);
    }

    console.log(`\n✅ Milestone workflow fix completed!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing milestone workflow:', error);
    process.exit(1);
  }
}

fixMilestoneWorkflow(); 
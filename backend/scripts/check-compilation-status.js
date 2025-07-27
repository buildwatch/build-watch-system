const { Project, ProjectUpdate } = require('../models');
const { Op } = require('sequelize');

async function checkCompilationStatus() {
  try {
    console.log('🔍 Checking compilation status for project PRJ-2025-076329...');

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

    // Find milestone updates
    const milestoneUpdates = await ProjectUpdate.findAll({
      where: {
        projectId: project.id,
        updateType: 'milestone',
        status: 'iu_approved'
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`\n📊 Milestone Updates (${milestoneUpdates.length} total):`);
    milestoneUpdates.forEach((update, index) => {
      console.log(`   ${index + 1}. Milestone Update:`);
      console.log(`      Status: ${update.status}`);
      console.log(`      Progress: ${update.currentProgress}%`);
      console.log(`      Has Milestone Data: ${update.milestoneUpdates ? 'Yes' : 'No'}`);
      console.log(`      Created: ${update.createdAt}`);
    });

    // Check what the API expects
    console.log(`\n🔍 API Validation Requirements:`);
    console.log(`   Expected workflowStatus: 'compiled_for_secretariat'`);
    console.log(`   Current workflowStatus: '${project.workflowStatus}'`);
    
    if (project.workflowStatus === 'compiled_for_secretariat') {
      console.log(`   ✅ Project is ready for Secretariat validation`);
    } else if (project.workflowStatus === 'validated_by_secretariat') {
      console.log(`   ⚠️  Project is already validated by Secretariat`);
      console.log(`   🔧 Cannot validate again - project is in final state`);
    } else if (project.workflowStatus === 'secretariat_approved') {
      console.log(`   ⚠️  Project is approved but not compiled`);
      console.log(`   🔧 Need to compile project first`);
    } else {
      console.log(`   ❌ Project is not in correct state for validation`);
    }

    // Check if project needs to be compiled
    if (milestoneUpdates.length > 0 && project.workflowStatus !== 'compiled_for_secretariat') {
      console.log(`\n🔧 Action Required:`);
      if (project.workflowStatus === 'validated_by_secretariat') {
        console.log(`   Project is already validated. No further action needed.`);
      } else {
        console.log(`   Project needs to be compiled to 'compiled_for_secretariat' status`);
        console.log(`   Run: npm run fix-compilation-status`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking compilation status:', error);
    process.exit(1);
  }
}

checkCompilationStatus(); 
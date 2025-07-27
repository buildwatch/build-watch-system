const { Project } = require('../models');
const { Op } = require('sequelize');

async function updateSecretariatApprovalDate() {
  try {
    console.log('🔄 Updating Secretariat approval date for project...');
    
    // Find the specific project
    const project = await Project.findOne({
      where: {
        projectCode: 'PRJ-2025-632699'
      }
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`📋 Found project: ${project.name} (${project.projectCode})`);
    console.log(`📅 Current secretariatApprovalDate: ${project.secretariatApprovalDate}`);

    // Update to today's date
    const today = new Date();
    await project.update({
      secretariatApprovalDate: today,
      secretariatApprovedBy: project.secretariatApprovedBy || 'a04e2465-b096-49e9-a824-9b2ed3b8178f' // Use existing or default user ID
    });

    console.log(`✅ Updated secretariatApprovalDate to: ${today}`);
    console.log(`✅ Project ${project.projectCode} approval date updated successfully!`);

  } catch (error) {
    console.error('❌ Error updating secretariat approval date:', error);
  } finally {
    process.exit(0);
  }
}

updateSecretariatApprovalDate(); 
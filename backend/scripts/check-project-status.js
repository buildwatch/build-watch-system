const { Project } = require('../models');

async function checkProjectStatus() {
  try {
    const project = await Project.findOne({ 
      where: { projectCode: 'PRJ-2025-076329' } 
    });

    if (project) {
      console.log('📋 Project Status Check:');
      console.log(`   Project Code: ${project.projectCode}`);
      console.log(`   Name: ${project.name}`);
      console.log(`   Workflow Status: ${project.workflowStatus}`);
      console.log(`   Submitted to Secretariat: ${project.submittedToSecretariat}`);
      console.log(`   Implementing Office: ${project.implementingOfficeName}`);
      console.log(`   Created Date: ${project.createdAt}`);
      console.log(`   Submitted Date: ${project.submittedToSecretariatDate}`);
      
      // Check if it should be visible to Secretariat
      const shouldBeVisible = ['submitted', 'secretariat_approved', 'ongoing', 'completed', 'compiled_for_secretariat', 'validated_by_secretariat'].includes(project.workflowStatus);
      console.log(`   Should be visible to Secretariat: ${shouldBeVisible ? '✅ YES' : '❌ NO'}`);
      
    } else {
      console.log('❌ Project not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking project status:', error);
    process.exit(1);
  }
}

checkProjectStatus(); 
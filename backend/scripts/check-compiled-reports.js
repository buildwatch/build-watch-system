const { Project, ProjectUpdate, User } = require('../models');
const { sequelize } = require('../config/database');

async function checkCompiledReports() {
  try {
    console.log('🔍 Checking compiled reports and project status...\n');

    // Check projects with compiled_for_secretariat status
    const compiledProjects = await Project.findAll({
      where: {
        workflowStatus: 'compiled_for_secretariat'
      },
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log(`📊 Found ${compiledProjects.length} projects with 'compiled_for_secretariat' status:\n`);

    for (const project of compiledProjects) {
      console.log(`🏗️  Project: ${project.name} (${project.projectCode})`);
      console.log(`   Implementing Office: ${project.implementingOffice?.name || 'Not assigned'}`);
      console.log(`   EIU Partner: ${project.eiuPersonnel?.name || 'Not assigned'}`);
      console.log(`   Workflow Status: ${project.workflowStatus}`);
      console.log(`   Overall Progress: ${project.overallProgress}%`);
      
      // Check for project updates
      const updates = await ProjectUpdate.findAll({
        where: {
          projectId: project.id
        },
        include: [
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'iuReviewerUser',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      console.log(`   📝 Project Updates: ${updates.length} total`);
      
      updates.forEach((update, index) => {
        console.log(`      ${index + 1}. Update ID: ${update.id}`);
        console.log(`         Type: ${update.updateType}`);
        console.log(`         Status: ${update.status}`);
        console.log(`         Submitted By: ${update.submitter?.name || 'Unknown'}`);
        console.log(`         Submitted At: ${update.submittedAt}`);
        console.log(`         IU Reviewer: ${update.iuReviewerUser?.name || 'Not assigned'}`);
        console.log(`         IU Review Date: ${update.iuReviewDate || 'Not reviewed'}`);
        console.log(`         Title: ${update.title || 'No title'}`);
        console.log(`         Claimed Progress: ${update.claimedProgress || 0}%`);
        console.log(`         Final Progress: ${update.finalProgress || 0}%`);
        
        if (update.milestoneUpdates) {
          try {
            const milestones = JSON.parse(update.milestoneUpdates);
            console.log(`         Milestone Updates: ${milestones.length} milestones`);
            milestones.forEach((milestone, mIndex) => {
              console.log(`            ${mIndex + 1}. ${milestone.title || 'Untitled'} - Status: ${milestone.status} - Progress: ${milestone.progress || 0}%`);
            });
          } catch (e) {
            console.log(`         Milestone Updates: Error parsing - ${e.message}`);
          }
        }
        console.log('');
      });

      // Check for IU approved updates specifically
      const iuApprovedUpdates = updates.filter(u => u.status === 'iu_approved');
      console.log(`   ✅ IU Approved Updates: ${iuApprovedUpdates.length}`);
      
      if (iuApprovedUpdates.length === 0) {
        console.log(`   ⚠️  WARNING: No IU approved updates found for project with 'compiled_for_secretariat' status!`);
        console.log(`   💡 This explains why the compiled report isn't showing in the UI.`);
      }
      
      console.log('   ' + '='.repeat(80) + '\n');
    }

    // Check all project updates to see what statuses exist
    const allUpdates = await ProjectUpdate.findAll({
      attributes: ['status', 'updateType'],
      group: ['status', 'updateType']
    });

    console.log('📋 All Project Update Statuses in Database:');
    allUpdates.forEach(update => {
      console.log(`   - Status: ${update.status}, Type: ${update.updateType}`);
    });

    console.log('\n✅ Check completed!');

  } catch (error) {
    console.error('❌ Error checking compiled reports:', error);
  } finally {
    await sequelize.close();
  }
}

checkCompiledReports(); 
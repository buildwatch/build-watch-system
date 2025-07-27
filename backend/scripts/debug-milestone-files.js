const { Project, ProjectUpdate, User } = require('../models');
const { Op } = require('sequelize');

async function debugMilestoneFiles() {
  try {
    console.log('🔍 Debugging milestone files...');
    
    // Get the specific project
    const project = await Project.findByPk('55a35f40-a287-4864-923c-1665d2b2c670', {
      include: [
        {
          model: ProjectUpdate,
          as: 'updates',
          where: { status: 'iu_approved' },
          required: false,
          include: [
            {
              model: User,
              as: 'submitter',
              attributes: ['name', 'role']
            }
          ]
        }
      ]
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`📋 Project: ${project.name}`);
    console.log(`📊 Updates count: ${project.updates?.length || 0}`);

    if (project.updates && project.updates.length > 0) {
      project.updates.forEach((update, index) => {
        console.log(`\n📝 Update ${index + 1}:`);
        console.log(`   ID: ${update.id}`);
        console.log(`   Type: ${update.updateType}`);
        console.log(`   Status: ${update.status}`);
        console.log(`   Submitted by: ${update.submitter?.name}`);
        console.log(`   Submitted at: ${update.submittedAt}`);
        
        if (update.milestoneUpdates) {
          console.log(`   📄 Milestone Updates (raw):`, update.milestoneUpdates);
          
          try {
            const milestoneData = typeof update.milestoneUpdates === 'string' 
              ? JSON.parse(update.milestoneUpdates) 
              : update.milestoneUpdates;
            
            console.log(`   📄 Milestone Updates (parsed):`, JSON.stringify(milestoneData, null, 2));
            
            if (Array.isArray(milestoneData)) {
              milestoneData.forEach((milestone, mIndex) => {
                console.log(`   🎯 Milestone ${mIndex + 1}:`);
                console.log(`      Milestone ID: ${milestone.milestoneId}`);
                console.log(`      Timeline:`, milestone.timeline);
                console.log(`      Budget:`, milestone.budget);
                console.log(`      Physical:`, milestone.physical);
                console.log(`      Notes: ${milestone.notes}`);
                console.log(`      Uploaded Files:`, milestone.uploadedFiles);
              });
            } else if (milestoneData && typeof milestoneData === 'object') {
              console.log(`   🎯 Single Milestone:`);
              console.log(`      Milestone ID: ${milestoneData.milestoneId}`);
              console.log(`      Timeline:`, milestoneData.timeline);
              console.log(`      Budget:`, milestoneData.budget);
              console.log(`      Physical:`, milestoneData.physical);
              console.log(`      Notes: ${milestoneData.notes}`);
              console.log(`      Uploaded Files:`, milestoneData.uploadedFiles);
            }
          } catch (error) {
            console.log(`   ❌ Error parsing milestone updates:`, error.message);
          }
        } else {
          console.log(`   ❌ No milestone updates found`);
        }
      });
    } else {
      console.log('❌ No updates found for this project');
    }

  } catch (error) {
    console.error('❌ Error debugging milestone files:', error);
  } finally {
    process.exit(0);
  }
}

debugMilestoneFiles(); 
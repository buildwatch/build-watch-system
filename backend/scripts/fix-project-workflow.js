const { Project, User } = require('../models');
const { Op } = require('sequelize');

async function fixProjectWorkflow() {
  try {
    console.log('🔧 Starting project workflow fix...');

    // Find projects that are submitted but not properly configured
    const projectsToFix = await Project.findAll({
      where: {
        [Op.or]: [
          {
            workflowStatus: 'submitted',
            submittedToSecretariat: false
          },
          {
            workflowStatus: 'draft',
            submittedToSecretariat: true
          },
          {
            workflowStatus: 'pending',
            submittedToSecretariat: true
          }
        ]
      }
    });

    console.log(`📋 Found ${projectsToFix.length} projects to fix`);

    for (const project of projectsToFix) {
      console.log(`\n🔍 Processing project: ${project.name} (${project.projectCode})`);
      console.log(`   Current status: ${project.workflowStatus}`);
      console.log(`   Submitted to Secretariat: ${project.submittedToSecretariat}`);

      let updated = false;

      // Fix 1: Projects with 'submitted' status but not marked as submitted to Secretariat
      if (project.workflowStatus === 'submitted' && !project.submittedToSecretariat) {
        await project.update({
          submittedToSecretariat: true,
          submittedToSecretariatDate: project.submittedToSecretariatDate || new Date()
        });
        console.log(`   ✅ Fixed: Marked as submitted to Secretariat`);
        updated = true;
      }

      // Fix 2: Projects marked as submitted to Secretariat but still in draft status
      if (project.workflowStatus === 'draft' && project.submittedToSecretariat) {
        await project.update({
          workflowStatus: 'submitted',
          submittedToSecretariatDate: project.submittedToSecretariatDate || new Date()
        });
        console.log(`   ✅ Fixed: Updated workflow status to 'submitted'`);
        updated = true;
      }

      // Fix 3: Projects with 'pending' status but submitted to Secretariat
      if (project.workflowStatus === 'pending' && project.submittedToSecretariat) {
        await project.update({
          workflowStatus: 'submitted',
          submittedToSecretariatDate: project.submittedToSecretariatDate || new Date()
        });
        console.log(`   ✅ Fixed: Updated workflow status from 'pending' to 'submitted'`);
        updated = true;
      }

      if (!updated) {
        console.log(`   ℹ️  No changes needed`);
      }
    }

    // Check for projects that should be visible to Secretariat
    const secretariatProjects = await Project.findAll({
      where: {
        [Op.or]: [
          { workflowStatus: 'submitted' },
          { workflowStatus: 'secretariat_approved' },
          { workflowStatus: 'ongoing' },
          { workflowStatus: 'completed' },
          { workflowStatus: 'compiled_for_secretariat' },
          { workflowStatus: 'validated_by_secretariat' }
        ]
      },
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'role', 'subRole']
        }
      ]
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total projects visible to Secretariat: ${secretariatProjects.length}`);
    console.log(`   Projects with 'submitted' status: ${secretariatProjects.filter(p => p.workflowStatus === 'submitted').length}`);
    console.log(`   Projects with 'secretariat_approved' status: ${secretariatProjects.filter(p => p.workflowStatus === 'secretariat_approved').length}`);
    console.log(`   Projects with 'ongoing' status: ${secretariatProjects.filter(p => p.workflowStatus === 'ongoing').length}`);

    // List projects that should be visible to Secretariat
    console.log(`\n📋 Projects visible to Secretariat:`);
    secretariatProjects.forEach(project => {
      console.log(`   - ${project.name} (${project.projectCode}) - ${project.workflowStatus} - ${project.implementingOffice?.name || 'Unknown Office'}`);
    });

    console.log('\n✅ Project workflow fix completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing project workflow:', error);
    process.exit(1);
  }
}

// Run the fix
fixProjectWorkflow(); 
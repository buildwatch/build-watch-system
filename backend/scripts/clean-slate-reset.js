const { Project, ProjectUpdate, ProjectMilestone, ProjectUpdateFile } = require('../models');
const { Op } = require('sequelize');

async function cleanSlateReset() {
  try {
    console.log('🧹 Clean Slate Reset Starting...\n');

    // ===== STEP 1: AUDIT CURRENT DATA =====
    console.log('📊 STEP 1: Auditing current data...');
    
    const projectCount = await Project.count();
    const milestoneCount = await ProjectMilestone.count();
    const updateCount = await ProjectUpdate.count();
    const fileCount = await ProjectUpdateFile.count();

    console.log(`Current Data:`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Milestones: ${milestoneCount}`);
    console.log(`   Updates: ${updateCount}`);
    console.log(`   Files: ${fileCount}\n`);

    if (projectCount === 0) {
      console.log('✅ System is already clean - no projects to delete');
      process.exit(0);
    }

    // ===== STEP 2: CONFIRMATION =====
    console.log('⚠️  WARNING: This will permanently delete ALL project data!');
    console.log('   - All projects will be deleted');
    console.log('   - All milestones will be deleted');
    console.log('   - All project updates will be deleted');
    console.log('   - All project files will be deleted');
    console.log('   - This action cannot be undone!\n');

    // ===== STEP 3: DELETE IN REVERSE ORDER =====
    console.log('🗑️  STEP 3: Deleting data in reverse dependency order...');

    // Delete project update files first
    console.log('   Deleting project update files...');
    const deletedFiles = await ProjectUpdateFile.destroy({
      where: {},
      force: true
    });
    console.log(`   ✅ Deleted ${deletedFiles} project update files`);

    // Delete project updates
    console.log('   Deleting project updates...');
    const deletedUpdates = await ProjectUpdate.destroy({
      where: {},
      force: true
    });
    console.log(`   ✅ Deleted ${deletedUpdates} project updates`);

    // Delete project milestones
    console.log('   Deleting project milestones...');
    const deletedMilestones = await ProjectMilestone.destroy({
      where: {},
      force: true
    });
    console.log(`   ✅ Deleted ${deletedMilestones} project milestones`);

    // Delete projects
    console.log('   Deleting projects...');
    const deletedProjects = await Project.destroy({
      where: {},
      force: true
    });
    console.log(`   ✅ Deleted ${deletedProjects} projects`);

    // ===== STEP 4: VERIFY CLEANUP =====
    console.log('\n🔍 STEP 4: Verifying cleanup...');
    
    const remainingProjects = await Project.count();
    const remainingMilestones = await ProjectMilestone.count();
    const remainingUpdates = await ProjectUpdate.count();
    const remainingFiles = await ProjectUpdateFile.count();

    console.log(`Remaining Data:`);
    console.log(`   Projects: ${remainingProjects}`);
    console.log(`   Milestones: ${remainingMilestones}`);
    console.log(`   Updates: ${remainingUpdates}`);
    console.log(`   Files: ${remainingFiles}`);

    if (remainingProjects === 0 && remainingMilestones === 0 && 
        remainingUpdates === 0 && remainingFiles === 0) {
      console.log('\n✅ SUCCESS: System completely reset!');
      console.log('🎯 Ready for fresh project creation with proper flow');
      console.log('\n📋 Next Steps:');
      console.log('   1. Create a new project through the UI');
      console.log('   2. Add milestones with proper weights (sum to 100%)');
      console.log('   3. Submit milestone updates');
      console.log('   4. Test the complete workflow');
    } else {
      console.log('\n❌ ERROR: Some data remains - manual cleanup may be required');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error in clean slate reset:', error);
    process.exit(1);
  }
}

cleanSlateReset(); 
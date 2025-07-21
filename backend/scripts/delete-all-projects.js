const db = require('../models');
const { Project, ProjectUpdate, ProjectMilestone, ProjectValidation } = db;
const { sequelize } = db;

// Ensure database connection
async function ensureConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function deleteAllProjects() {
  try {
    // Ensure database connection first
    await ensureConnection();
    
    console.log('🔄 Starting project deletion process...');
    
    // First, let's see what we have
    const projectCount = await Project.count();
    console.log(`📊 Found ${projectCount} projects to delete`);
    
    if (projectCount === 0) {
      console.log('✅ No projects found to delete');
      return;
    }
    
    // Get project IDs for logging
    const projects = await Project.findAll({
      attributes: ['id', 'name', 'projectCode'],
      raw: true
    });
    
    console.log('\n📋 Projects to be deleted:');
    projects.forEach(project => {
      console.log(`   - ${project.projectCode}: ${project.name}`);
    });
    
    // Start transaction
    const transaction = await sequelize.transaction();
    
    try {
      console.log('\n🗑️  Deleting related data...');
      
      // Delete project validations first (foreign key constraint)
      const validationCount = await ProjectValidation.destroy({
        where: {},
        transaction
      });
      console.log(`   ✅ Deleted ${validationCount} project validations`);
      
      // Delete project updates
      const updateCount = await ProjectUpdate.destroy({
        where: {},
        transaction
      });
      console.log(`   ✅ Deleted ${updateCount} project updates`);
      
      // Delete project milestones
      const milestoneCount = await ProjectMilestone.destroy({
        where: {},
        transaction
      });
      console.log(`   ✅ Deleted ${milestoneCount} project milestones`);
      
      // Finally, delete the projects
      console.log('\n🗑️  Deleting projects...');
      const deletedCount = await Project.destroy({
        where: {},
        transaction
      });
      console.log(`   ✅ Deleted ${deletedCount} projects`);
      
      // Commit transaction
      await transaction.commit();
      
      console.log('\n🎉 Project deletion completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - Projects deleted: ${deletedCount}`);
      console.log(`   - Milestones deleted: ${milestoneCount}`);
      console.log(`   - Updates deleted: ${updateCount}`);
      console.log(`   - Validations deleted: ${validationCount}`);
      
      // Verify deletion
      const remainingProjects = await Project.count();
      console.log(`\n✅ Verification: ${remainingProjects} projects remaining in database`);
      
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error deleting projects:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
deleteAllProjects(); 
const { Project, User } = require('../models');
const { sequelize } = require('../models');

async function updateExistingProjects() {
  try {
    console.log('🔄 Checking and updating existing projects...');
    console.log('='.repeat(60));

    // Check if the new columns exist
    const tableInfo = await sequelize.query("DESCRIBE Projects", { type: sequelize.QueryTypes.SELECT });
    const columnNames = tableInfo.map(col => col.Field);
    
    console.log('Current columns in Projects table:', columnNames);

    // Check if new columns need to be added
    const needsProjectCode = !columnNames.includes('projectCode');
    const needsImplementingOffice = !columnNames.includes('implementingOfficeName');
    const needsFundingSource = !columnNames.includes('fundingSource');
    const needsCreatedDate = !columnNames.includes('createdDate');

    if (needsProjectCode || needsImplementingOffice || needsFundingSource || needsCreatedDate) {
      console.log('Adding missing columns...');
      
      if (needsProjectCode) {
        await sequelize.query("ALTER TABLE Projects ADD COLUMN projectCode VARCHAR(255) NOT NULL DEFAULT 'PRJ-2025-000001'");
        console.log('✅ Added projectCode column');
      }
      
      if (needsImplementingOffice) {
        await sequelize.query("ALTER TABLE Projects ADD COLUMN implementingOfficeName VARCHAR(255) NOT NULL DEFAULT 'Unknown Office'");
        console.log('✅ Added implementingOfficeName column');
      }
      
      if (needsFundingSource) {
        await sequelize.query("ALTER TABLE Projects ADD COLUMN fundingSource ENUM('local_fund', 'national_fund', 'foreign_fund', 'private_fund', 'donor_fund', 'mixed_fund') NOT NULL DEFAULT 'local_fund'");
        console.log('✅ Added fundingSource column');
      }
      
      if (needsCreatedDate) {
        await sequelize.query("ALTER TABLE Projects ADD COLUMN createdDate DATE NOT NULL DEFAULT '2025-01-01'");
        console.log('✅ Added createdDate column');
      }

      // Add unique constraint to projectCode
      try {
        await sequelize.query("ALTER TABLE Projects ADD UNIQUE (projectCode)");
        console.log('✅ Added unique constraint to projectCode');
      } catch (error) {
        console.log('⚠️ Unique constraint already exists or error:', error.message);
      }
    } else {
      console.log('✅ All required columns already exist');
    }

    // Update existing projects with proper values
    const existingProjects = await Project.findAll();
    console.log(`Found ${existingProjects.length} existing projects to update`);

    for (let i = 0; i < existingProjects.length; i++) {
      const project = existingProjects[i];
      
      // Generate unique project code if not set
      if (!project.projectCode || project.projectCode === 'PRJ-2025-000001') {
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        const projectCode = `PRJ-${year}-${timestamp}${i}`;
        
        await project.update({
          projectCode,
          implementingOfficeName: project.implementingOfficeName || 'Unknown Office',
          fundingSource: project.fundingSource || 'local_fund',
          createdDate: project.createdDate || project.createdAt?.toISOString().split('T')[0] || '2025-01-01'
        });
        
        console.log(`✅ Updated project ${project.id}: ${projectCode}`);
      }
    }

    console.log('='.repeat(60));
    console.log('🎉 Project table update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating projects:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateExistingProjects(); 
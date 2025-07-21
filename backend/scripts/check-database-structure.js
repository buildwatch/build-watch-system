const { sequelize } = require('../models');

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure...\n');

    // Check if project_milestones table exists
    const [results] = await sequelize.query("SHOW TABLES LIKE 'project_milestones'");
    if (results.length === 0) {
      console.log('❌ project_milestones table does not exist');
      return;
    }

    console.log('✅ project_milestones table exists');

    // Check columns in project_milestones table
    const [columns] = await sequelize.query("DESCRIBE project_milestones");
    console.log('\n📋 Columns in project_milestones table:');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // Check if projects table exists
    const [projectResults] = await sequelize.query("SHOW TABLES LIKE 'projects'");
    if (projectResults.length === 0) {
      console.log('\n❌ projects table does not exist');
      return;
    }

    console.log('\n✅ projects table exists');

    // Check columns in projects table
    const [projectColumns] = await sequelize.query("DESCRIBE projects");
    console.log('\n📋 Key columns in projects table:');
    const keyColumns = ['id', 'projectCode', 'name', 'workflowStatus', 'automatedProgress'];
    projectColumns.forEach(col => {
      if (keyColumns.includes(col.Field)) {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      }
    });

    // Check if there are any projects
    const [projects] = await sequelize.query("SELECT COUNT(*) as count FROM projects");
    console.log(`\n📊 Total projects: ${projects[0].count}`);

    // Check if there are any milestones
    const [milestones] = await sequelize.query("SELECT COUNT(*) as count FROM project_milestones");
    console.log(`📈 Total milestones: ${milestones[0].count}`);

    console.log('\n✅ Database structure check completed!');

  } catch (error) {
    console.error('❌ Error checking database structure:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDatabaseStructure(); 
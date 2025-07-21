const { Sequelize } = require('sequelize');
const config = require('./config/config.json').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect
});

async function checkProjectTables() {
  try {
    // Check for project-related tables
    const [projectTables] = await sequelize.query("SHOW TABLES LIKE '%project%'");
    console.log('Project tables found:', projectTables);
    
    // Check structure of each project table
    const projectTableNames = projectTables.map(t => Object.values(t)[0]);
    
    for (const tableName of projectTableNames) {
      console.log(`\n=== ${tableName} table structure ===`);
      const [columns] = await sequelize.query(`DESCRIBE ${tableName}`);
      console.log('Columns:', columns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      })));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkProjectTables(); 
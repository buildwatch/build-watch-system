const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false
});

async function checkIndexes() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Get all tables
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = '${config.database}' 
      AND TABLE_TYPE = 'BASE TABLE'
    `);

    let totalIndexes = 0;
    
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      // Get indexes for each table
      const [indexes] = await sequelize.query(`
        SELECT INDEX_NAME, COLUMN_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = '${config.database}' 
        AND TABLE_NAME = '${tableName}'
        AND INDEX_NAME != 'PRIMARY'
      `);
      
      console.log(`\n📋 Table: ${tableName}`);
      console.log(`   Indexes: ${indexes.length}`);
      
      indexes.forEach(index => {
        console.log(`   - ${index.INDEX_NAME} (${index.COLUMN_NAME})`);
      });
      
      totalIndexes += indexes.length;
    }
    
    console.log(`\n📊 Total indexes across all tables: ${totalIndexes}`);
    console.log(`📊 Total tables: ${tables.length}`);
    
    if (totalIndexes > 60) {
      console.log('⚠️  Warning: Total indexes exceed 60, which may cause issues with MySQL');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkIndexes(); 
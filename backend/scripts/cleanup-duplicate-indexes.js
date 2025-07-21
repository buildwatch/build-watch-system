const { Sequelize } = require('sequelize');
const config = require('../config/database.js');

async function cleanupDuplicateIndexes() {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env];
  
  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get all indexes on users table
    const [results] = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' AND TABLE_NAME = 'users'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    console.log(`Found ${results.length} indexes on users table`);

    // Group indexes by column
    const columnIndexes = {};
    results.forEach(row => {
      if (!columnIndexes[row.COLUMN_NAME]) {
        columnIndexes[row.COLUMN_NAME] = [];
      }
      columnIndexes[row.COLUMN_NAME].push({
        name: row.INDEX_NAME,
        isUnique: row.NON_UNIQUE === 0
      });
    });

    // Find duplicate indexes to remove
    const indexesToRemove = [];
    
    Object.keys(columnIndexes).forEach(column => {
      const indexes = columnIndexes[column];
      if (indexes.length > 1) {
        console.log(`\nColumn ${column}' has ${indexes.length} indexes:`);
        indexes.forEach(idx => {
          console.log(`  - ${idx.name} ${idx.isUnique ? '(UNIQUE)' : ''}`);     });
        
        // Keep the first one, remove the rest
        const toRemove = indexes.slice(1);
        indexesToRemove.push(...toRemove.map(idx => idx.name));
        console.log(`  Will remove: ${toRemove.map(idx => idx.name).join(',')}`);
      }
    });

    if (indexesToRemove.length === 0) {
      console.log('\nNo duplicate indexes found.');
      return;
    }

    console.log(`\nRemoving ${indexesToRemove.length} duplicate indexes...`);

    // Remove duplicate indexes
    for (const indexName of indexesToRemove) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`users\``);
        console.log(`✓ Removed index: ${indexName}`);
      } catch (error) {
        console.log(`✗ Failed to remove index ${indexName}: ${error.message}`);
      }
    }

    // Verify the cleanup
    const [finalResults] = await sequelize.query(`
      SELECT COUNT(*) as total_indexes
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' AND TABLE_NAME = 'users'
    `);

    console.log(`\nFinal index count on users table: ${finalResults[0].total_indexes}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

cleanupDuplicateIndexes(); 
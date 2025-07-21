const { Sequelize } = require('sequelize');
const config = require('../config/database.js');

async function checkUsersIndexes() {
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

    // Check indexes on users table
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

    console.log('\n=== Indexes on users table ===');
    console.log('Total indexes found:', results.length);
    
    const indexGroups = {};
    results.forEach(row => {
      if (!indexGroups[row.INDEX_NAME]) {
        indexGroups[row.INDEX_NAME] = [];
      }
      indexGroups[row.INDEX_NAME].push(row.COLUMN_NAME);
    });

    Object.keys(indexGroups).forEach(indexName => {
      const columns = indexGroups[indexName];
      const isUnique = results.find(r => r.INDEX_NAME === indexName)?.NON_UNIQUE === 0;
      console.log(`${indexName}: [${columns.join(',')}] ${isUnique ? '(UNIQUE)' : ''}`);
    });

    // Check total indexes in the database
    const [totalResults] = await sequelize.query(`
      SELECT COUNT(*) as total_indexes
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}'
    `);

    console.log(`\nTotal indexes in database: ${totalResults[0].total_indexes}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUsersIndexes(); 
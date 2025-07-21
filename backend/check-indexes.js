const { sequelize } = require('./models');

async function checkIndexes() {
  try {
    console.log('Checking existing indexes in the database...');
    
    // Check indexes on users table
    const [userIndexes] = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'buildwatch_lgu' 
      AND TABLE_NAME = 'users'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.log('\nUsers table indexes:');
    userIndexes.forEach(index => {
      console.log(`- ${index.INDEX_NAME}: ${index.COLUMN_NAME} (unique: ${!index.NON_UNIQUE})`);
    });
    
    // Check total number of indexes
    const [totalIndexes] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'buildwatch_lgu'
    `);
    
    console.log(`\nTotal indexes in database: ${totalIndexes[0].total}`);
    
    // Check indexes by table
    const [tableIndexes] = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        COUNT(*) as index_count
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'buildwatch_lgu'
      GROUP BY TABLE_NAME
      ORDER BY index_count DESC
    `);
    
    console.log('\nIndexes by table:');
    tableIndexes.forEach(table => {
      console.log(`- ${table.TABLE_NAME}: ${table.index_count} indexes`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking indexes:', error.message);
    process.exit(1);
  }
}

checkIndexes(); 
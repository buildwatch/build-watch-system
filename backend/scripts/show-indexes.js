require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('../config/database').development;

async function showIndexes() {
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database
  });

  try {
    console.log('✅ Database connection established successfully.');
    console.log(`\n📋 Showing indexes for table: users\n`);

    const [indexes] = await connection.execute(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [config.database]);

    console.log('Index Name'.padEnd(30) + 'Column Name'.padEnd(20) + 'Unique'.padEnd(10) + 'Seq');
    console.log('-'.repeat(70));

    indexes.forEach(index => {
      const unique = index.NON_UNIQUE === 0 ? 'YES' : 'NO';
      console.log(
        index.INDEX_NAME.padEnd(30) + 
        index.COLUMN_NAME.padEnd(20) + 
        unique.padEnd(10) + 
        index.SEQ_IN_INDEX
      );
    });

    console.log(`\n📊 Total indexes: ${indexes.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

showIndexes(); 
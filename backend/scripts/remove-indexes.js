require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('../config/database').development;

async function removeIndexes() {
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database
  });

  try {
    console.log('✅ Database connection established successfully.');

    // Get all tables
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_TYPE = 'BASE TABLE'
    `, [config.database]);

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`\n📋 Processing table: ${tableName}`);
      
      // Get all indexes for the table (excluding PRIMARY)
      const [indexes] = await connection.execute(`
        SELECT INDEX_NAME, COLUMN_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = ? 
        AND INDEX_NAME != 'PRIMARY'
        GROUP BY INDEX_NAME
      `, [config.database, tableName]);
      
      console.log(`   Found ${indexes.length} non-primary indexes`);
      
      // Remove each index
      for (const index of indexes) {
        try {
          await connection.execute(`DROP INDEX \`${index.INDEX_NAME}\` ON \`${tableName}\``);
          console.log(`   ✅ Removed index: ${index.INDEX_NAME}`);
        } catch (error) {
          console.log(`   ⚠️  Could not remove index ${index.INDEX_NAME}: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Index removal completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

removeIndexes(); 
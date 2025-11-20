const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'buildwatch_123',
  database: process.env.DB_NAME || 'buildwatch_lgu',
  multipleStatements: true
};

async function createTables() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database');

    console.log('📝 Reading SQL script...');
    const fs = require('fs');
    const path = require('path');
    const sqlScript = fs.readFileSync(
      path.join(__dirname, '../sql/create-project-comments-tables.sql'),
      'utf8'
    );

    console.log('🚀 Executing SQL script...');
    await connection.query(sqlScript);
    
    console.log('✅ Successfully created project_comments and project_comment_reactions tables!');
    console.log('📊 Tables created:');
    console.log('   - project_comments');
    console.log('   - project_comment_reactions');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Tables already exist. Skipping...');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

createTables()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });


const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'buildwatch_123',
  database: process.env.DB_NAME || 'buildwatch_lgu',
  multipleStatements: true
};

async function createTable() {
  let connection;
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Database connection successful.');

    const sql = fs.readFileSync(path.join(__dirname, '../sql/create-deleted-project-comments-table.sql'), 'utf8');
    console.log('Executing SQL script to create deleted_project_comments table...');
    await connection.query(sql);
    console.log('✅ Deleted project comments table created successfully.');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

createTable()
  .then(() => console.log('🎉 Migration completed successfully.'))
  .catch((error) => console.error('💥 Migration failed:', error));


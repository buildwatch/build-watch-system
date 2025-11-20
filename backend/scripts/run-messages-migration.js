require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dbConfig = require('../config/database.js').development;

async function runMigration() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'create-messages-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Messages table created.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Table already exists. Migration skipped.');
    } else {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

runMigration();


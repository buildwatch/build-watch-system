const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'buildwatch_123',
  database: process.env.DB_NAME || 'buildwatch_lgu',
};

async function addLastLogoutAtColumn() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    
    // Create database connection
    connection = await mysql.createConnection(DB_CONFIG);
    
    console.log('✅ Database connection successful.');
    
    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'lastLogoutAt'
    `, [DB_CONFIG.database]);

    if (columns.length > 0) {
      console.log('ℹ️ Column "lastLogoutAt" already exists. Skipping migration.');
      return;
    }
    
    console.log('📝 Adding lastLogoutAt column to users table...');
    
    // Execute SQL directly
    await connection.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`lastLogoutAt\` DATETIME DEFAULT NULL COMMENT 'Timestamp when user last logged out'
    `);
    
    console.log('✅ lastLogoutAt column added successfully.');
    
    // Close connection
    await connection.end();
    console.log('🔌 Database connection closed.');
    
    console.log('✅ lastLogoutAt column added successfully.');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run migration
addLastLogoutAtColumn()
  .then(() => console.log('🎉 Migration completed successfully.'))
  .catch((error) => console.error('💥 Migration failed:', error));


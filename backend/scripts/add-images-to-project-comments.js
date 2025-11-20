// Script to add images column to project_comments table
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

async function addImagesColumn() {
  let connection;
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Database connection successful.');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'project_comments' 
      AND COLUMN_NAME = 'images'
    `, [DB_CONFIG.database]);

    if (columns.length > 0) {
      console.log('ℹ️ Column "images" already exists. Skipping migration.');
      return;
    }

    console.log('📝 Adding images column to project_comments table...');
    
    await connection.query(`
      ALTER TABLE \`project_comments\`
      ADD COLUMN \`images\` JSON NULL DEFAULT NULL AFTER \`isApproved\`
    `);

    console.log('✅ Images column added successfully.');
  } catch (error) {
    console.error('❌ Error adding images column:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

addImagesColumn()
  .then(() => console.log('🎉 Migration completed successfully.'))
  .catch((error) => console.error('💥 Migration failed:', error));


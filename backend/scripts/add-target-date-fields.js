const db = require('../models');
const fs = require('fs');
const path = require('path');

async function addTargetDateFields() {
  try {
    console.log('🔌 Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    console.log('🔄 Adding targetDateOfCompletion and expectedDaysOfCompletion fields to projects table...');
    
    // Check if columns already exist
    const [results] = await db.sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME IN ('targetDateOfCompletion', 'expectedDaysOfCompletion')
    `);
    
    const existingColumns = results.map(row => row.COLUMN_NAME);
    
    if (!existingColumns.includes('targetDateOfCompletion')) {
      await db.sequelize.query(`
        ALTER TABLE projects 
        ADD COLUMN targetDateOfCompletion DATE NULL 
        COMMENT 'Target date of completion (replaces endDate)'
      `);
      console.log('✅ Added targetDateOfCompletion column');
    } else {
      console.log('⚠️  targetDateOfCompletion column already exists');
    }
    
    if (!existingColumns.includes('expectedDaysOfCompletion')) {
      await db.sequelize.query(`
        ALTER TABLE projects 
        ADD COLUMN expectedDaysOfCompletion INT NULL 
        COMMENT 'Expected days of completion (auto-calculated)'
      `);
      console.log('✅ Added expectedDaysOfCompletion column');
    } else {
      console.log('⚠️  expectedDaysOfCompletion column already exists');
    }

    // Copy existing endDate values to targetDateOfCompletion for backward compatibility
    console.log('🔄 Copying existing endDate values to targetDateOfCompletion...');
    await db.sequelize.query(`
      UPDATE projects 
      SET targetDateOfCompletion = endDate 
      WHERE targetDateOfCompletion IS NULL AND endDate IS NOT NULL
    `);
    console.log('✅ Copied existing endDate values to targetDateOfCompletion');

    console.log('🎉 Target date fields migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

addTargetDateFields();

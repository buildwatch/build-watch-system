const db = require('../models');
const fs = require('fs');
const path = require('path');

async function addTargetCompletionDateField() {
  try {
    console.log('🔌 Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    console.log('🔄 Adding targetCompletionDate field to projects table...');
    
    // Check if column already exists
    const [results] = await db.sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME = 'targetCompletionDate'
    `);
    
    if (results.length === 0) {
      await db.sequelize.query(`
        ALTER TABLE projects 
        ADD COLUMN targetCompletionDate DATE NULL 
        COMMENT 'Target completion date (new field name)'
      `);
      console.log('✅ Added targetCompletionDate column');
    } else {
      console.log('⚠️  targetCompletionDate column already exists');
    }

    // Copy existing targetDateOfCompletion values to targetCompletionDate for backward compatibility
    console.log('🔄 Copying existing targetDateOfCompletion values to targetCompletionDate...');
    await db.sequelize.query(`
      UPDATE projects 
      SET targetCompletionDate = targetDateOfCompletion 
      WHERE targetCompletionDate IS NULL AND targetDateOfCompletion IS NOT NULL
    `);
    console.log('✅ Copied existing targetDateOfCompletion values to targetCompletionDate');

    console.log('🎉 Target completion date field migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

addTargetCompletionDateField();

/**
 * Script to run migration for adding notes column to projects table
 * This adds the notes JSON column for project notes and annotations
 */

const db = require('../models');
const sequelize = db.sequelize;
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add Notes Column to Projects...\n');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME = 'notes'
    `);

    if (columns.length > 0) {
      console.log('⚠️  Notes column already exists in projects table, skipping migration...');
      return;
    }

    const migrationPath = path.join(__dirname, '../migrations/20251113000000-add-notes-to-projects.js');
    const migration = require(migrationPath);

    // Run the migration
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);

    // Mark migration as run in SequelizeMeta (if table exists)
    try {
      const [results] = await sequelize.query(`
        SELECT * FROM SequelizeMeta WHERE name = '20251113000000-add-notes-to-projects.js'
      `);

      if (results.length === 0) {
        await sequelize.query(`
          INSERT INTO SequelizeMeta (name) VALUES ('20251113000000-add-notes-to-projects.js')
        `);
        console.log('✅ Migration marked as completed in SequelizeMeta');
      }
    } catch (e) {
      // SequelizeMeta table might not exist, that's okay
      console.log('ℹ️  Could not update SequelizeMeta (table may not exist)');
    }

    console.log('\n✅ Notes migration completed successfully!');
    console.log('📝 Added column:');
    console.log('   - projects.notes (JSON)');

  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();


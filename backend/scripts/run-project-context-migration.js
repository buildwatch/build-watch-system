/**
 * Script to run migration for adding projectId column to messages table
 * This enables project-aware messaging functionality
 */

const db = require('../models');
const sequelize = db.sequelize;
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add Project ID to Messages...\n');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'projectId'
    `);

    if (columns.length > 0) {
      console.log('⚠️  projectId column already exists in messages table, skipping migration...');
      return;
    }

    const migrationPath = path.join(__dirname, '../migrations/20251114000001-add-project-id-to-messages.js');
    const migration = require(migrationPath);

    // Run the migration
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);

    // Mark migration as run in SequelizeMeta (if table exists)
    try {
      const [results] = await sequelize.query(`
        SELECT * FROM SequelizeMeta WHERE name = '20251114000001-add-project-id-to-messages.js'
      `);

      if (results.length === 0) {
        await sequelize.query(`
          INSERT INTO SequelizeMeta (name) VALUES ('20251114000001-add-project-id-to-messages.js')
        `);
        console.log('✅ Migration marked as completed in SequelizeMeta');
      }
    } catch (e) {
      // SequelizeMeta table might not exist, that's okay
      console.log('ℹ️  Could not update SequelizeMeta (table may not exist)');
    }

    console.log('\n✅ Project Context migration completed successfully!');
    console.log('📝 Added column:');
    console.log('   - messages.projectId (UUID, nullable, foreign key to projects)');
    console.log('   - Index: idx_messages_project');

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


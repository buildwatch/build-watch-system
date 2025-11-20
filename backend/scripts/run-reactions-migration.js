/**
 * Script to run migration for adding reactions column to messages table
 * This adds the reactions JSON column for message reactions (emoji)
 */

const db = require('../models');
const sequelize = db.sequelize;
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add Reactions Column to Messages...\n');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'reactions'
    `);

    if (columns.length > 0) {
      console.log('⚠️  Reactions column already exists in messages table, skipping migration...');
      return;
    }

    const migrationPath = path.join(__dirname, '../migrations/20251114000000-add-reactions-to-messages.js');
    const migration = require(migrationPath);

    // Run the migration
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);

    // Mark migration as run in SequelizeMeta (if table exists)
    try {
      const [results] = await sequelize.query(`
        SELECT * FROM SequelizeMeta WHERE name = '20251114000000-add-reactions-to-messages.js'
      `);

      if (results.length === 0) {
        await sequelize.query(`
          INSERT INTO SequelizeMeta (name) VALUES ('20251114000000-add-reactions-to-messages.js')
        `);
        console.log('✅ Migration marked as completed in SequelizeMeta');
      }
    } catch (e) {
      // SequelizeMeta table might not exist, that's okay
      console.log('ℹ️  Could not update SequelizeMeta (table may not exist)');
    }

    console.log('\n✅ Reactions migration completed successfully!');
    console.log('📝 Added column:');
    console.log('   - messages.reactions (JSON)');

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


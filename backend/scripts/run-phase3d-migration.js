/**
 * Script to run Phase 3D migration for push notifications
 * This creates the user_push_subscriptions table
 */

const db = require('../models');
const sequelize = db.sequelize;
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running Phase 3D migration: Add Push Notifications...\n');

    const migrationPath = path.join(__dirname, '../migrations/20251110000005-add-phase3d-push-notifications.js');
    const migration = require(migrationPath);

    // Run the migration
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);

    // Mark migration as run in SequelizeMeta
    const [results] = await sequelize.query(`
      SELECT * FROM SequelizeMeta WHERE name = '20251110000005-add-phase3d-push-notifications.js'
    `);

    if (results.length === 0) {
      await sequelize.query(`
        INSERT INTO SequelizeMeta (name) VALUES ('20251110000005-add-phase3d-push-notifications.js')
      `);
      console.log('✅ Migration marked as completed in SequelizeMeta');
    }

    console.log('\n✅ Phase 3D migration completed successfully!');
    console.log('📱 Created table:');
    console.log('   - user_push_subscriptions');

  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();


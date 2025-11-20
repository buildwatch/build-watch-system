/**
 * Run Phase 3C Migration
 * This script runs the Phase 3C migration directly
 */

const db = require('../models');
const sequelize = db.sequelize;
const path = require('path');
const fs = require('fs');

async function runMigration() {
  try {
    console.log('🔄 Running Phase 3C migration...\n');

    const migrationPath = path.join(__dirname, '../migrations/20251110000004-add-phase3c-features.js');
    const migration = require(migrationPath);

    // Run the migration
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);

    // Mark migration as run in SequelizeMeta
    const [results] = await sequelize.query(`
      SELECT * FROM SequelizeMeta WHERE name = '20251110000004-add-phase3c-features.js'
    `);

    if (results.length === 0) {
      await sequelize.query(`
        INSERT INTO SequelizeMeta (name) VALUES ('20251110000004-add-phase3c-features.js')
      `);
      console.log('✅ Migration marked as completed in SequelizeMeta');
    }

    console.log('\n✅ Phase 3C migration completed successfully!');
    console.log('📋 Created tables:');
    console.log('   - announcement_versions');
    console.log('   - announcement_approvals');
    console.log('   - announcement_categories');
    console.log('   - announcement_tags');
    console.log('   - announcement_category_mappings');
    console.log('   - announcement_tag_mappings');
    console.log('   - announcement_notification_preferences');
    console.log('\n📝 Added fields to announcements table:');
    console.log('   - approvalStatus');
    console.log('   - requiresApproval');

  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();


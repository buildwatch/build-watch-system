const { sequelize } = require('../models');
const path = require('path');
const fs = require('fs');

async function runMigration() {
  try {
    console.log('Running Phase 3A migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/20251110000003-add-phase3a-engagement-features.js');
    const migration = require(migrationPath);
    
    // Run the migration
    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, sequelize.constructor);
    
    // Mark migration as run in SequelizeMeta
    const [results] = await sequelize.query(
      "SELECT * FROM SequelizeMeta WHERE name = '20251110000003-add-phase3a-engagement-features.js'"
    );
    
    if (results.length === 0) {
      await sequelize.query(
        "INSERT INTO SequelizeMeta (name) VALUES ('20251110000003-add-phase3a-engagement-features.js')"
      );
      console.log('Migration marked as completed in SequelizeMeta');
    }
    
    console.log('Phase 3A migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();


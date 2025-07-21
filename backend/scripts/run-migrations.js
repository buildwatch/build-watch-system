const db = require('../models');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('🔌 Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Only run the new admin-related migrations
    const newMigrations = [
      '20250712162227-create-announcement-table.js',
      '20250712162228-create-department-table.js',
      '20250712162229-create-group-table.js',
      '20250712162230-create-backup-table.js'
    ];

    console.log(`📁 Running ${newMigrations.length} new admin migrations`);

    for (const file of newMigrations) {
      console.log(`🔄 Running migration: ${file}`);
      const migration = require(path.join(__dirname, '../migrations', file));
      
      try {
        await migration.up(db.sequelize.getQueryInterface(), db.Sequelize);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Table/column already exists for ${file}, skipping...`);
        } else {
          console.error(`❌ Error running migration ${file}:`, error.message);
          throw error;
        }
      }
    }

    console.log('🎉 All admin migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

runMigrations(); 
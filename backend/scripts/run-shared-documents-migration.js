const db = require('../models');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔌 Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    const migrationFile = '20250125000000-create-shared-documents-tables.js';
    console.log(`📁 Running migration: ${migrationFile}`);

    const migration = require(path.join(__dirname, '../migrations', migrationFile));
    
    try {
      await migration.up(db.sequelize.getQueryInterface(), db.Sequelize);
      console.log(`✅ Migration ${migrationFile} completed successfully`);
      console.log('📊 Created tables:');
      console.log('   - shared_folders');
      console.log('   - shared_documents');
      console.log('   - document_downloads');
    } catch (error) {
      if (error.message.includes('already exists') || 
          error.message.includes('Duplicate column name') ||
          error.message.includes('Duplicate key name')) {
        console.log(`⚠️  Tables already exist for ${migrationFile}, skipping...`);
        console.log('💡 If you need to recreate them, drop the tables first.');
      } else {
        console.error(`❌ Error running migration ${migrationFile}:`, error.message);
        throw error;
      }
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

runMigration();


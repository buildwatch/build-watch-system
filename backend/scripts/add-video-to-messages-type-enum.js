/**
 * Script to add 'video' to messages.type ENUM
 * This fixes the "Data truncated for column 'type'" error when sending videos
 */

const { Sequelize } = require('sequelize');
const config = require('../config/config.json').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: console.log
});

async function addVideoToEnum() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    console.log('🔄 Adding "video" to messages.type ENUM...');
    
    // Modify the ENUM column to include 'video'
    await sequelize.query(`
      ALTER TABLE messages 
      MODIFY COLUMN type ENUM('text', 'image', 'video', 'file', 'system') NOT NULL DEFAULT 'text'
    `);
    
    console.log('✅ Successfully added "video" to messages.type ENUM');
    
    // Verify the change
    const [results] = await sequelize.query(`
      SHOW COLUMNS FROM messages WHERE Field = 'type'
    `);
    
    console.log('📊 Current messages.type column definition:');
    console.log(JSON.stringify(results[0], null, 2));
    
    await sequelize.close();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

addVideoToEnum();


'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'video' to the messages.type ENUM
    // MySQL requires recreating the column to modify ENUM values
    await queryInterface.sequelize.query(`
      ALTER TABLE messages 
      MODIFY COLUMN type ENUM('text', 'image', 'video', 'file', 'system') NOT NULL DEFAULT 'text'
    `);
    
    console.log('✅ Added "video" to messages.type ENUM');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove 'video' from the ENUM (but first check if any records use 'video')
    // For safety, convert any 'video' messages to 'file' before removing
    await queryInterface.sequelize.query(`
      UPDATE messages 
      SET type = 'file' 
      WHERE type = 'video'
    `);
    
    // Then remove 'video' from the ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE messages 
      MODIFY COLUMN type ENUM('text', 'image', 'file', 'system') NOT NULL DEFAULT 'text'
    `);
    
    console.log('✅ Removed "video" from messages.type ENUM');
  }
};


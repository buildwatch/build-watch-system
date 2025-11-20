'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const [results] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'reactions'
    `);

    if (results.length === 0) {
      await queryInterface.addColumn('messages', 'reactions', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Stores reactions as { emoji: [userId1, userId2, ...] }'
      });
      console.log('✅ Added reactions column to messages table');
    } else {
      console.log('ℹ️ reactions column already exists in messages table');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'reactions');
    console.log('✅ Removed reactions column from messages table');
  }
};


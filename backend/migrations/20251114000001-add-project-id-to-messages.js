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
      AND COLUMN_NAME = 'projectId'
    `);

    if (results.length === 0) {
      // Add projectId column
      await queryInterface.addColumn('messages', 'projectId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional link to a project for project-aware messaging'
      });

      // Add index for better query performance
      await queryInterface.addIndex('messages', ['projectId'], {
        name: 'idx_messages_project',
        fields: ['projectId']
      });

      console.log('✅ Added projectId column and index to messages table');
    } else {
      console.log('ℹ️ projectId column already exists in messages table');
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('messages', 'idx_messages_project');
    // Remove column
    await queryInterface.removeColumn('messages', 'projectId');
    console.log('✅ Removed projectId column from messages table');
  }
};


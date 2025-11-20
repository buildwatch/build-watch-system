'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add createdBy field (UUID reference to users table)
    await queryInterface.addColumn('announcements', 'createdBy', {
      type: Sequelize.CHAR(36).BINARY,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add announcementType field (ENUM for different announcement types)
    await queryInterface.addColumn('announcements', 'announcementType', {
      type: Sequelize.ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update'),
      allowNull: false,
      defaultValue: 'general'
    });

    // Add index on createdBy for better query performance
    await queryInterface.addIndex('announcements', ['createdBy'], {
      name: 'idx_announcements_createdBy'
    });

    // Add index on announcementType
    await queryInterface.addIndex('announcements', ['announcementType'], {
      name: 'idx_announcements_type'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('announcements', 'idx_announcements_type');
    await queryInterface.removeIndex('announcements', 'idx_announcements_createdBy');
    
    // Remove columns
    await queryInterface.removeColumn('announcements', 'announcementType');
    await queryInterface.removeColumn('announcements', 'createdBy');
  }
};

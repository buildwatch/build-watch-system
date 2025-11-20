'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add isPinned field to announcements table
    await queryInterface.addColumn('announcements', 'isPinned', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isPinned'
    });

    // Add index for pinned announcements
    await queryInterface.addIndex('announcements', ['isPinned'], {
      name: 'idx_announcements_isPinned'
    });

    // Create announcement_templates table
    await queryInterface.createTable('announcement_templates', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      contentHtml: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'contentHtml'
      },
      priority: {
        type: Sequelize.ENUM('urgent', 'high', 'normal', 'low'),
        allowNull: false,
        defaultValue: 'normal'
      },
      announcementType: {
        type: Sequelize.ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update'),
        allowNull: false,
        defaultValue: 'general',
        field: 'announcementType'
      },
      targetAudience: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'all',
        field: 'targetAudience'
      },
      requiresAcknowledgment: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'requiresAcknowledgment'
      },
      isSystemTemplate: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isSystemTemplate'
      },
      createdBy: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: true,
        field: 'createdBy',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'createdAt'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updatedAt'
      }
    });

    // Add indexes for templates
    await queryInterface.addIndex('announcement_templates', ['createdBy'], {
      name: 'idx_templates_createdBy'
    });
    await queryInterface.addIndex('announcement_templates', ['announcementType'], {
      name: 'idx_templates_type'
    });
    await queryInterface.addIndex('announcement_templates', ['isSystemTemplate'], {
      name: 'idx_templates_system'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop table
    await queryInterface.dropTable('announcement_templates');
    
    // Remove index
    await queryInterface.removeIndex('announcements', 'idx_announcements_isPinned');
    
    // Remove column
    await queryInterface.removeColumn('announcements', 'isPinned');
  }
};


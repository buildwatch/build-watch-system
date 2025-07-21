'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('Info', 'Success', 'Warning', 'Error', 'Alert'),
        defaultValue: 'Info',
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('Project', 'Update', 'Validation', 'System', 'Reminder', 'Alert'),
        allowNull: false
      },
      entityType: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      priority: {
        type: Sequelize.ENUM('Low', 'Medium', 'High', 'Critical'),
        defaultValue: 'Medium',
        allowNull: false
      },
      actionUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      actionText: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Active', 'Archived', 'Deleted'),
        defaultValue: 'Active',
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('notifications', ['userId'], {
      name: 'idx_notifications_user_id'
    });
    await queryInterface.addIndex('notifications', ['type'], {
      name: 'idx_notifications_type'
    });
    await queryInterface.addIndex('notifications', ['category'], {
      name: 'idx_notifications_category'
    });
    await queryInterface.addIndex('notifications', ['isRead'], {
      name: 'idx_notifications_is_read'
    });
    await queryInterface.addIndex('notifications', ['priority'], {
      name: 'idx_notifications_priority'
    });
    await queryInterface.addIndex('notifications', ['createdAt'], {
      name: 'idx_notifications_created_at'
    });
    await queryInterface.addIndex('notifications', ['userId', 'isRead'], {
      name: 'idx_notifications_user_read'
    });
    await queryInterface.addIndex('notifications', ['userId', 'category'], {
      name: 'idx_notifications_user_category'
    });
    await queryInterface.addIndex('notifications', ['entityType', 'entityId'], {
      name: 'idx_notifications_entity_type_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
  }
}; 
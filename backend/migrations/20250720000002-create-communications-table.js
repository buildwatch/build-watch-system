'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('communications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('report', 'feedback', 'request', 'alert', 'meeting', 'general'),
        allowNull: false,
        defaultValue: 'general'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium'
      },
      type: {
        type: Sequelize.ENUM('incoming', 'outgoing'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'delivered', 'read', 'responded', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isImportant: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isUrgent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      requestAcknowledgment: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      acknowledgedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      respondedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      senderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recipientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      parentMessageId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'communications',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('communications', ['senderId']);
    await queryInterface.addIndex('communications', ['recipientId']);
    await queryInterface.addIndex('communications', ['status']);
    await queryInterface.addIndex('communications', ['category']);
    await queryInterface.addIndex('communications', ['isRead']);
    await queryInterface.addIndex('communications', ['isImportant']);
    await queryInterface.addIndex('communications', ['createdAt']);
    await queryInterface.addIndex('communications', ['parentMessageId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('communications');
  }
}; 
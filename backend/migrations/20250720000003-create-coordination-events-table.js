'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('coordination_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      eventType: {
        type: Sequelize.ENUM('meeting', 'field_inspection', 'deadline', 'training', 'review', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium'
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      recurrencePattern: {
        type: Sequelize.JSON,
        allowNull: true
      },
      participantData: {
        type: Sequelize.JSON,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reminderSent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reminderDate: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('coordination_events', ['createdBy']);
    await queryInterface.addIndex('coordination_events', ['projectId']);
    await queryInterface.addIndex('coordination_events', ['eventType']);
    await queryInterface.addIndex('coordination_events', ['status']);
    await queryInterface.addIndex('coordination_events', ['startDate']);
    await queryInterface.addIndex('coordination_events', ['priority']);
    await queryInterface.addIndex('coordination_events', ['isRecurring']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('coordination_events');
  }
}; 
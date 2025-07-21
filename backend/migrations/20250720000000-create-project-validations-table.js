'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('project_validations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reportType: {
        type: Sequelize.ENUM('progress_report', 'milestone_report', 'completion_report', 'rpmes_form'),
        allowNull: false,
        defaultValue: 'progress_report'
      },
      reportId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of the specific report being validated (e.g., ProjectUpdate ID, RPMES Form ID)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'validated', 'flagged', 'returned', 'approved'),
        allowNull: false,
        defaultValue: 'pending'
      },
      priority: {
        type: Sequelize.ENUM('high', 'medium', 'low'),
        allowNull: false,
        defaultValue: 'medium'
      },
      issues: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of identified issues'
      },
      validationChecklist: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Validation checklist results'
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Validation comments and feedback'
      },
      validatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      validatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      returnedForRevision: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      revisionReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resubmittedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      validationScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Validation score (0-100)'
      },
      complianceStatus: {
        type: Sequelize.ENUM('compliant', 'non_compliant', 'partial'),
        allowNull: true
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
    await queryInterface.addIndex('project_validations', ['projectId']);
    await queryInterface.addIndex('project_validations', ['status']);
    await queryInterface.addIndex('project_validations', ['priority']);
    await queryInterface.addIndex('project_validations', ['validatedBy']);
    await queryInterface.addIndex('project_validations', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('project_validations');
  }
}; 
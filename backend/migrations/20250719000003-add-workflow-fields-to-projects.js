'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add workflow-related fields to projects table
    await queryInterface.addColumn('projects', 'workflowStatus', {
      type: Sequelize.ENUM('draft', 'submitted', 'secretariat_approved', 'ongoing', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft'
    });

    await queryInterface.addColumn('projects', 'submittedToSecretariat', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('projects', 'submittedToSecretariatDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('projects', 'secretariatApprovalDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('projects', 'secretariatApprovedBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('projects', 'automatedProgress', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'System-calculated progress based on approved milestones'
    });

    await queryInterface.addColumn('projects', 'lastProgressUpdate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add indexes for workflow queries
    await queryInterface.addIndex('projects', ['workflowStatus']);
    await queryInterface.addIndex('projects', ['submittedToSecretariat']);
    await queryInterface.addIndex('projects', ['secretariatApprovedBy']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeColumn('projects', 'workflowStatus');
    await queryInterface.removeColumn('projects', 'submittedToSecretariat');
    await queryInterface.removeColumn('projects', 'submittedToSecretariatDate');
    await queryInterface.removeColumn('projects', 'secretariatApprovalDate');
    await queryInterface.removeColumn('projects', 'secretariatApprovedBy');
    await queryInterface.removeColumn('projects', 'automatedProgress');
    await queryInterface.removeColumn('projects', 'lastProgressUpdate');
  }
}; 
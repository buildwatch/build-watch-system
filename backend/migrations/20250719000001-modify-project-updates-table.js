'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new fields to existing project_updates table
    await queryInterface.addColumn('project_updates', 'milestoneId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'project_milestones',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID of the milestone being updated'
    });

    await queryInterface.addColumn('project_updates', 'claimedProgress', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Percentage claimed by EIU'
    });

    await queryInterface.addColumn('project_updates', 'adjustedProgress', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Percentage adjusted by IU'
    });

    await queryInterface.addColumn('project_updates', 'finalProgress', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Final percentage approved by Secretariat'
    });

    await queryInterface.addColumn('project_updates', 'iuReviewer', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID of IU user who reviewed the update'
    });

    await queryInterface.addColumn('project_updates', 'iuReviewDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date when IU reviewed the update'
    });

    await queryInterface.addColumn('project_updates', 'iuReviewRemarks', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Remarks from IU reviewer'
    });

    await queryInterface.addColumn('project_updates', 'secretariatReviewer', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID of Secretariat user who reviewed the update'
    });

    await queryInterface.addColumn('project_updates', 'secretariatReviewDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date when Secretariat reviewed the update'
    });

    await queryInterface.addColumn('project_updates', 'secretariatReviewRemarks', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Remarks from Secretariat reviewer'
    });

    // Modify the status enum to include new workflow states
    await queryInterface.changeColumn('project_updates', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'submitted', 'iu_reviewed', 'iu_approved', 'iu_rejected', 'secretariat_approved', 'secretariat_rejected'),
      allowNull: false,
      defaultValue: 'submitted'
    });

    // Add new indexes
    await queryInterface.addIndex('project_updates', ['milestoneId']);
    await queryInterface.addIndex('project_updates', ['projectId', 'status']);
    await queryInterface.addIndex('project_updates', ['iuReviewer']);
    await queryInterface.addIndex('project_updates', ['secretariatReviewer']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeColumn('project_updates', 'milestoneId');
    await queryInterface.removeColumn('project_updates', 'claimedProgress');
    await queryInterface.removeColumn('project_updates', 'adjustedProgress');
    await queryInterface.removeColumn('project_updates', 'finalProgress');
    await queryInterface.removeColumn('project_updates', 'iuReviewer');
    await queryInterface.removeColumn('project_updates', 'iuReviewDate');
    await queryInterface.removeColumn('project_updates', 'iuReviewRemarks');
    await queryInterface.removeColumn('project_updates', 'secretariatReviewer');
    await queryInterface.removeColumn('project_updates', 'secretariatReviewDate');
    await queryInterface.removeColumn('project_updates', 'secretariatReviewRemarks');

    // Revert status enum
    await queryInterface.changeColumn('project_updates', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    });
  }
}; 
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new fields to existing project_milestones table
    await queryInterface.addColumn('project_milestones', 'weight', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Percentage weight (0.00 to 100.00)'
    });

    await queryInterface.addColumn('project_milestones', 'plannedBudget', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Planned budget for this milestone'
    });

    await queryInterface.addColumn('project_milestones', 'plannedStartDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Planned start date for this milestone'
    });

    await queryInterface.addColumn('project_milestones', 'plannedEndDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Planned end date for this milestone'
    });

    await queryInterface.addColumn('project_milestones', 'actualStartDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Actual start date for this milestone'
    });

    await queryInterface.addColumn('project_milestones', 'actualEndDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Actual end date for this milestone'
    });

    await queryInterface.addColumn('project_milestones', 'order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Order of milestone in the project'
    });

    // Add new indexes
    await queryInterface.addIndex('project_milestones', ['projectId', 'status']);
    await queryInterface.addIndex('project_milestones', ['projectId', 'order']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeColumn('project_milestones', 'weight');
    await queryInterface.removeColumn('project_milestones', 'plannedBudget');
    await queryInterface.removeColumn('project_milestones', 'plannedStartDate');
    await queryInterface.removeColumn('project_milestones', 'plannedEndDate');
    await queryInterface.removeColumn('project_milestones', 'actualStartDate');
    await queryInterface.removeColumn('project_milestones', 'actualEndDate');
    await queryInterface.removeColumn('project_milestones', 'order');
  }
}; 
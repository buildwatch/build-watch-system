'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('project_milestones', 'timelineWeight', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 33.33,
      comment: 'Weight percentage for timeline division (fixed at 33.33%)'
    });

    await queryInterface.addColumn('project_milestones', 'timelineStartDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Timeline division start date'
    });

    await queryInterface.addColumn('project_milestones', 'timelineEndDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Timeline division end date'
    });

    await queryInterface.addColumn('project_milestones', 'timelineDescription', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Description of timeline activities and progress'
    });

    await queryInterface.addColumn('project_milestones', 'timelineStatus', {
      type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'approved'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Status of timeline division approval'
    });

    await queryInterface.addColumn('project_milestones', 'budgetWeight', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 33.33,
      comment: 'Weight percentage for budget division (fixed at 33.33%)'
    });

    await queryInterface.addColumn('project_milestones', 'budgetPlanned', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Planned budget for this division'
    });

    await queryInterface.addColumn('project_milestones', 'budgetBreakdown', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Budget breakdown description'
    });

    await queryInterface.addColumn('project_milestones', 'budgetStatus', {
      type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'approved'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Status of budget division approval'
    });

    await queryInterface.addColumn('project_milestones', 'physicalWeight', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 33.33,
      comment: 'Weight percentage for physical division (fixed at 33.33%)'
    });

    await queryInterface.addColumn('project_milestones', 'physicalProofType', {
      type: Sequelize.ENUM('form', 'video', 'image', 'document', 'report', 'other'),
      allowNull: true,
      defaultValue: 'form',
      comment: 'Type of proof required for physical accomplishment'
    });

    await queryInterface.addColumn('project_milestones', 'physicalDescription', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Description of physical accomplishment'
    });

    await queryInterface.addColumn('project_milestones', 'physicalStatus', {
      type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'approved'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Status of physical division approval'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('project_milestones', 'timelineWeight');
    await queryInterface.removeColumn('project_milestones', 'timelineStartDate');
    await queryInterface.removeColumn('project_milestones', 'timelineEndDate');
    await queryInterface.removeColumn('project_milestones', 'timelineDescription');
    await queryInterface.removeColumn('project_milestones', 'timelineStatus');
    await queryInterface.removeColumn('project_milestones', 'budgetWeight');
    await queryInterface.removeColumn('project_milestones', 'budgetPlanned');
    await queryInterface.removeColumn('project_milestones', 'budgetBreakdown');
    await queryInterface.removeColumn('project_milestones', 'budgetStatus');
    await queryInterface.removeColumn('project_milestones', 'physicalWeight');
    await queryInterface.removeColumn('project_milestones', 'physicalProofType');
    await queryInterface.removeColumn('project_milestones', 'physicalDescription');
    await queryInterface.removeColumn('project_milestones', 'physicalStatus');
  }
}; 
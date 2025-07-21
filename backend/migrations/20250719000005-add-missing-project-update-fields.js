'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add submittedTo field
    await queryInterface.addColumn('project_updates', 'submittedTo', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // Add milestoneUpdates field
    await queryInterface.addColumn('project_updates', 'milestoneUpdates', {
      type: Sequelize.JSON,
      allowNull: true
    });

    // Add submittedAt field
    await queryInterface.addColumn('project_updates', 'submittedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('project_updates', 'submittedTo');
    await queryInterface.removeColumn('project_updates', 'milestoneUpdates');
    await queryInterface.removeColumn('project_updates', 'submittedAt');
  }
}; 
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Update the updateType enum to include 'milestone'
    await queryInterface.changeColumn('project_updates', 'updateType', {
      type: Sequelize.ENUM('timeline', 'budget', 'physical', 'overall', 'milestone'),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert the updateType enum
    await queryInterface.changeColumn('project_updates', 'updateType', {
      type: Sequelize.ENUM('timeline', 'budget', 'physical', 'overall'),
      allowNull: false
    });
  }
}; 
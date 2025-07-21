'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('project_updates', 'budgetUsed', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('project_updates', 'budgetUsed');
  }
}; 
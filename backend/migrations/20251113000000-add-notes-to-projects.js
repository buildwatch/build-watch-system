'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add notes column to projects table
    await queryInterface.addColumn('projects', 'notes', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Project notes and annotations array'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove notes column from projects table
    await queryInterface.removeColumn('projects', 'notes');
  }
};


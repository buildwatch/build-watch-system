'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add eiuReassignedAt column to projects table (lowercase)
    await queryInterface.addColumn('projects', 'eiuReassignedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date and time when EIU was reassigned to a new partner contractor'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove eiuReassignedAt column (table name is lowercase 'projects')
    await queryInterface.removeColumn('projects', 'eiuReassignedAt');
  }
};


'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add eiuReassignedAt column to Projects table
    await queryInterface.addColumn('Projects', 'eiuReassignedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date and time when EIU was reassigned to a new partner contractor'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove eiuReassignedAt column
    await queryInterface.removeColumn('Projects', 'eiuReassignedAt');
  }
};


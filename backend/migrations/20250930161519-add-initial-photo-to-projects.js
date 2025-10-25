'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('projects', 'initialPhoto', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'URL or path to the initial project photo'
    });

    await queryInterface.addColumn('projects', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Project location latitude coordinate'
    });

    await queryInterface.addColumn('projects', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Project location longitude coordinate'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('projects', 'initialPhoto');
    await queryInterface.removeColumn('projects', 'latitude');
    await queryInterface.removeColumn('projects', 'longitude');
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Update the status column to include 'deleted' as a valid value
    await queryInterface.changeColumn('users', 'status', {
      type: Sequelize.ENUM('active', 'blocked', 'deactivated', 'deleted'),
      defaultValue: 'active',
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert back to original enum values
    await queryInterface.changeColumn('users', 'status', {
      type: Sequelize.ENUM('active', 'blocked', 'deactivated'),
      defaultValue: 'active',
      allowNull: false
    });
  }
}; 
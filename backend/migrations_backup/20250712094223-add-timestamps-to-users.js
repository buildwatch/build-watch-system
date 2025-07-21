'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'created_at', { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') });
    await queryInterface.addColumn('users', 'updated_at', { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'created_at');
    await queryInterface.removeColumn('users', 'updated_at');
  }
};

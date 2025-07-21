'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'sub_role', {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: ''
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'sub_role', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null
    });
  }
};

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'externalCompanyName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'externalCompanyName');
  }
}; 
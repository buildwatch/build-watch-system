'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('projects', 'eiuPersonnelId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID of the EIU Personnel assigned to this project (if hasExternalPartner is true)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('projects', 'eiuPersonnelId');
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (!table.idType) await queryInterface.addColumn('users', 'idType', { type: Sequelize.STRING(50), allowNull: true });
    if (!table.idNumber) await queryInterface.addColumn('users', 'idNumber', { type: Sequelize.STRING(50), allowNull: true });
    if (!table.group) await queryInterface.addColumn('users', 'group', { type: Sequelize.STRING(100), allowNull: true });
    if (!table.department) await queryInterface.addColumn('users', 'department', { type: Sequelize.STRING(100), allowNull: true });
    if (!table.position) await queryInterface.addColumn('users', 'position', { type: Sequelize.STRING(100), allowNull: true });
    if (!table.contactNumber) await queryInterface.addColumn('users', 'contactNumber', { type: Sequelize.STRING(20), allowNull: true });
    if (!table.address) await queryInterface.addColumn('users', 'address', { type: Sequelize.TEXT, allowNull: true });
    if (!table.lastLoginAt) await queryInterface.addColumn('users', 'lastLoginAt', { type: Sequelize.DATE, allowNull: true });
    if (!table.passwordChangedAt) await queryInterface.addColumn('users', 'passwordChangedAt', { type: Sequelize.DATE, allowNull: true });
    if (!table.resetPasswordToken) await queryInterface.addColumn('users', 'resetPasswordToken', { type: Sequelize.STRING(255), allowNull: true });
    if (!table.resetPasswordExpires) await queryInterface.addColumn('users', 'resetPasswordExpires', { type: Sequelize.DATE, allowNull: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'idType');
    await queryInterface.removeColumn('users', 'idNumber');
    await queryInterface.removeColumn('users', 'group');
    await queryInterface.removeColumn('users', 'department');
    await queryInterface.removeColumn('users', 'position');
    await queryInterface.removeColumn('users', 'contactNumber');
    await queryInterface.removeColumn('users', 'address');
    await queryInterface.removeColumn('users', 'lastLoginAt');
    await queryInterface.removeColumn('users', 'passwordChangedAt');
    await queryInterface.removeColumn('users', 'resetPasswordToken');
    await queryInterface.removeColumn('users', 'resetPasswordExpires');
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop referencing tables first
    await queryInterface.dropTable('activity_logs');
    await queryInterface.dropTable('projects');
    // Add more dropTable calls here if there are other referencing tables

    // Drop users table
    await queryInterface.dropTable('users');

    // Recreate users table with camelCase columns
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      firstName: { type: Sequelize.STRING(100), allowNull: true },
      middleName: { type: Sequelize.STRING(100), allowNull: true },
      lastName: { type: Sequelize.STRING(100), allowNull: true },
      fullName: { type: Sequelize.STRING(255), allowNull: true },
      userId: { type: Sequelize.STRING(50), allowNull: true, unique: true },
      birthdate: { type: Sequelize.DATEONLY, allowNull: true },
      projectCode: { type: Sequelize.STRING(50), allowNull: true },
      enable2FA: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      accountLockout: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      name: { type: Sequelize.STRING(255), allowNull: false },
      username: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('LGU-PMT', 'EIU', 'LGU-IU', 'EMS', 'SYS.AD', 'EXEC'), allowNull: false },
      subRole: { type: Sequelize.STRING(100), allowNull: true },
      status: { type: Sequelize.ENUM('active', 'blocked', 'deactivated'), allowNull: false, defaultValue: 'active' },
      idType: { type: Sequelize.STRING(50), allowNull: true },
      idNumber: { type: Sequelize.STRING(50), allowNull: true },
      group: { type: Sequelize.STRING(100), allowNull: true },
      department: { type: Sequelize.STRING(100), allowNull: true },
      position: { type: Sequelize.STRING(100), allowNull: true },
      contactNumber: { type: Sequelize.STRING(20), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      lastLoginAt: { type: Sequelize.DATE, allowNull: true },
      passwordChangedAt: { type: Sequelize.DATE, allowNull: true },
      resetPasswordToken: { type: Sequelize.STRING(255), allowNull: true },
      resetPasswordExpires: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // Recreate projects table (minimal columns for FK)
    await queryInterface.createTable('projects', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      implementingUnitId: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      // Add other columns as needed
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // Recreate activity_logs table
    await queryInterface.createTable('activity_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      action: { type: Sequelize.STRING(100), allowNull: false },
      entityType: { type: Sequelize.STRING(50), allowNull: true },
      entityId: { type: Sequelize.UUID, allowNull: true },
      details: { type: Sequelize.TEXT, allowNull: true },
      ipAddress: { type: Sequelize.STRING(45), allowNull: true },
      userAgent: { type: Sequelize.TEXT, allowNull: true },
      level: { type: Sequelize.ENUM('Info', 'Warning', 'Error', 'Critical'), allowNull: false, defaultValue: 'Info' },
      module: { type: Sequelize.STRING(50), allowNull: true },
      status: { type: Sequelize.ENUM('Success', 'Failed', 'Pending'), allowNull: false, defaultValue: 'Success' },
      metadata: { type: Sequelize.JSON, allowNull: true },
      sessionId: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('activity_logs');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('users');
  }
}; 
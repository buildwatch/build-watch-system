'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('announcements', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('urgent', 'high', 'normal', 'low'),
        allowNull: false,
        defaultValue: 'normal'
      },
      status: {
        type: Sequelize.ENUM('active', 'scheduled', 'expired', 'draft'),
        allowNull: false,
        defaultValue: 'active'
      },
      targetAudience: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'all'
      },
      publishDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      views: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('announcements');
  }
};

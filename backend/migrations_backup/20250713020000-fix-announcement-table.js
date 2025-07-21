'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding them
    const tableDescription = await queryInterface.describeTable('announcements');
    
    if (!tableDescription.target_audience) {
      await queryInterface.addColumn('announcements', 'target_audience', {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'all'
      });
    }
    
    if (!tableDescription.publish_date) {
      await queryInterface.addColumn('announcements', 'publish_date', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
    }
    
    if (!tableDescription.expiry_date) {
      await queryInterface.addColumn('announcements', 'expiry_date', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    
    if (!tableDescription.views) {
      await queryInterface.addColumn('announcements', 'views', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('announcements');
    
    if (tableDescription.target_audience) {
      await queryInterface.removeColumn('announcements', 'target_audience');
    }
    if (tableDescription.publish_date) {
      await queryInterface.removeColumn('announcements', 'publish_date');
    }
    if (tableDescription.expiry_date) {
      await queryInterface.removeColumn('announcements', 'expiry_date');
    }
    if (tableDescription.views) {
      await queryInterface.removeColumn('announcements', 'views');
    }
  }
}; 
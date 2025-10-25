'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notifications', 'profilePic', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Profile picture URL for the user involved in the notification'
    });
    
    await queryInterface.addColumn('notifications', 'module', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Module/feature the notification is related to (e.g., user-management)'
    });
    
    await queryInterface.addColumn('notifications', 'targetId', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Target identifier for highlighting specific items (e.g., User ID for user management)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('notifications', 'profilePic');
    await queryInterface.removeColumn('notifications', 'module'); 
    await queryInterface.removeColumn('notifications', 'targetId');
  }
}; 
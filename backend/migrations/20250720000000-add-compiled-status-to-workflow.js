'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the new enum value to the workflowStatus column
    await queryInterface.sequelize.query(`
      ALTER TABLE projects 
      MODIFY COLUMN workflowStatus ENUM('draft', 'submitted', 'secretariat_approved', 'ongoing', 'completed', 'cancelled', 'compiled_for_secretariat') 
      NOT NULL DEFAULT 'draft'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new enum value (this will fail if any records use the new value)
    await queryInterface.sequelize.query(`
      ALTER TABLE projects 
      MODIFY COLUMN workflowStatus ENUM('draft', 'submitted', 'secretariat_approved', 'ongoing', 'completed', 'cancelled') 
      NOT NULL DEFAULT 'draft'
    `);
  }
}; 
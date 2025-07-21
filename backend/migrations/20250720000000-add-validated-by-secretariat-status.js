'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the new enum value to the workflowStatus column
    await queryInterface.sequelize.query(`
      ALTER TABLE projects 
      MODIFY COLUMN workflowStatus ENUM(
        'draft', 
        'submitted', 
        'secretariat_approved', 
        'ongoing', 
        'completed', 
        'cancelled', 
        'compiled_for_secretariat',
        'validated_by_secretariat'
      ) NOT NULL DEFAULT 'draft'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the enum value if needed
    await queryInterface.sequelize.query(`
      ALTER TABLE projects 
      MODIFY COLUMN workflowStatus ENUM(
        'draft', 
        'submitted', 
        'secretariat_approved', 
        'ongoing', 
        'completed', 
        'cancelled', 
        'compiled_for_secretariat'
      ) NOT NULL DEFAULT 'draft'
    `);
  }
}; 
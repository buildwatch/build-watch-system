'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('projects', 'targetDateOfCompletion', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Target date of completion (replaces endDate)'
    });

    await queryInterface.addColumn('projects', 'expectedDaysOfCompletion', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Expected days of completion (auto-calculated)'
    });

    // Copy existing endDate values to targetDateOfCompletion for backward compatibility
    await queryInterface.sequelize.query(`
      UPDATE projects 
      SET targetDateOfCompletion = endDate 
      WHERE targetDateOfCompletion IS NULL AND endDate IS NOT NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('projects', 'targetDateOfCompletion');
    await queryInterface.removeColumn('projects', 'expectedDaysOfCompletion');
  }
};

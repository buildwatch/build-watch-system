'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add projectCode column
    await queryInterface.addColumn('Projects', 'projectCode', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'PRJ-2025-000001'
    });

    // Add implementingOffice column
    await queryInterface.addColumn('Projects', 'implementingOffice', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Unknown Office'
    });

    // Add fundingSource column
    await queryInterface.addColumn('Projects', 'fundingSource', {
      type: Sequelize.ENUM('local_fund', 'national_fund', 'foreign_fund', 'private_fund', 'donor_fund', 'mixed_fund'),
      allowNull: false,
      defaultValue: 'local_fund'
    });

    // Add createdDate column
    await queryInterface.addColumn('Projects', 'createdDate', {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: '2025-01-01'
    });

    // Add unique constraint to projectCode after all columns are added
    await queryInterface.addConstraint('Projects', {
      fields: ['projectCode'],
      type: 'unique',
      name: 'Projects_projectCode_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove unique constraint first
    await queryInterface.removeConstraint('Projects', 'Projects_projectCode_unique');
    
    // Remove columns
    await queryInterface.removeColumn('Projects', 'projectCode');
    await queryInterface.removeColumn('Projects', 'implementingOffice');
    await queryInterface.removeColumn('Projects', 'fundingSource');
    await queryInterface.removeColumn('Projects', 'createdDate');
  }
}; 
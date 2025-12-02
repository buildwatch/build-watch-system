'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add remarks and recommendation field
    await queryInterface.addColumn('milestone_submissions', 'remarks', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Remarks and recommendation from the approver/reviewer'
    });

    // Add remarksAndRecommendation field (alias for remarks)
    await queryInterface.addColumn('milestone_submissions', 'remarksAndRecommendation', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Remarks and recommendation from the approver/reviewer (alias for remarks)'
    });

    // Add approver full name field for auditing
    await queryInterface.addColumn('milestone_submissions', 'approverFullName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Full name of the approver/reviewer for audit purposes'
    });

    // Add approverName field (alias for approverFullName)
    await queryInterface.addColumn('milestone_submissions', 'approverName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Name of the approver/reviewer (alias for approverFullName)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('milestone_submissions', 'remarks');
    await queryInterface.removeColumn('milestone_submissions', 'remarksAndRecommendation');
    await queryInterface.removeColumn('milestone_submissions', 'approverFullName');
    await queryInterface.removeColumn('milestone_submissions', 'approverName');
  }
};


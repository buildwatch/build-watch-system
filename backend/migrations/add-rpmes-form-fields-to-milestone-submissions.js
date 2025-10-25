'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('milestone_submissions', 'rpmesFormPath', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Path to the uploaded RPMES form file'
    });

    await queryInterface.addColumn('milestone_submissions', 'rpmesFormName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Original name of the RPMES form file'
    });

    await queryInterface.addColumn('milestone_submissions', 'rpmesFormSize', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Size of the RPMES form file in bytes'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('milestone_submissions', 'rpmesFormPath');
    await queryInterface.removeColumn('milestone_submissions', 'rpmesFormName');
    await queryInterface.removeColumn('milestone_submissions', 'rpmesFormSize');
  }
};

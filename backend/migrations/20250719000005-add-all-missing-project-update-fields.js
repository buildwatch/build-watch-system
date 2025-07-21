'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add all missing columns
    const columns = [
      {
        name: 'remarks',
        type: Sequelize.TEXT,
        allowNull: true
      },
      {
        name: 'iuReviewRemarks',
        type: Sequelize.TEXT,
        allowNull: true
      },
      {
        name: 'secretariatReviewRemarks',
        type: Sequelize.TEXT,
        allowNull: true
      },
      {
        name: 'submittedById',
        type: Sequelize.UUID,
        allowNull: true
      }
    ];

    for (const column of columns) {
      try {
        await queryInterface.addColumn('project_updates', column.name, {
          type: column.type,
          allowNull: column.allowNull
        });
        console.log(`Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`Column ${column.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const columns = ['remarks', 'iuReviewRemarks', 'secretariatReviewRemarks', 'submittedById'];
    
    for (const column of columns) {
      try {
        await queryInterface.removeColumn('project_updates', column);
        console.log(`Removed column: ${column}`);
      } catch (error) {
        console.log(`Column ${column} doesn't exist, skipping...`);
      }
    }
  }
}; 
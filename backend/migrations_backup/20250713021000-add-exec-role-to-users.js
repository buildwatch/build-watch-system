// Migration to add 'EXEC' to the ENUM values for the 'role' column in the users table

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // MySQL ENUM modification workaround: alter column with new ENUM values
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('LGU-PMT', 'EIU', 'LGU-IU', 'EMS', 'SYS.AD', 'EXEC') NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to previous ENUM values (remove EXEC)
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('LGU-PMT', 'EIU', 'LGU-IU', 'EMS', 'SYS.AD') NOT NULL;
    `);
  }
}; 
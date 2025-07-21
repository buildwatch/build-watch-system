'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, update existing users with 'LGU-IU' role to 'IU'
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'IU' WHERE role = 'LGU-IU'
    `);

    // Then modify the ENUM to include all required roles
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('LGU-PMT', 'EIU', 'IU', 'EMS', 'SYS.AD') NOT NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to original ENUM
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'LGU-IU' WHERE role = 'IU'
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('LGU-PMT', 'EIU', 'LGU-IU', 'EMS') NOT NULL
    `);
  }
}; 
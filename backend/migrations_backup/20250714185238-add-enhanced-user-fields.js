'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Update role enum to remove SYS.AD and EXEC (only keep LGU-PMT, EIU, LGU-IU, EMS)
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('LGU-PMT', 'EIU', 'LGU-IU', 'EMS') NOT NULL;
    `);

    // Make subRole nullable since some roles don't need it
    await queryInterface.changeColumn('users', 'sub_role', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    // Restore original role enum
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('LGU-PMT', 'EIU', 'LGU-IU', 'EMS', 'SYS.AD', 'EXEC') NOT NULL;
    `);

    // Restore subRole as required
    await queryInterface.changeColumn('users', 'sub_role', {
      type: Sequelize.STRING(100),
      allowNull: false
    });
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Temporarily change role column to VARCHAR to allow data updates
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NOT NULL
    `);

    // Update existing data to use valid role values
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'LGU-IU' WHERE role = 'IU'
    `);

    // Change back to ENUM with new values
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('LGU-PMT', 'LGU-IU', 'EIU', 'EMS', 'SYS.AD') NOT NULL
    `);

    // Create activity_logs table
    await queryInterface.createTable('activity_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      entityType: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      level: {
        type: Sequelize.ENUM('Info', 'Warning', 'Error', 'Critical'),
        defaultValue: 'Info',
        allowNull: false
      },
      module: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Success', 'Failed', 'Pending'),
        defaultValue: 'Success',
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      sessionId: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('activity_logs', ['userId'], {
      name: 'idx_activity_logs_user_id'
    });
    await queryInterface.addIndex('activity_logs', ['action'], {
      name: 'idx_activity_logs_action'
    });
    await queryInterface.addIndex('activity_logs', ['entityType', 'entityId'], {
      name: 'idx_activity_logs_entity_type_id'
    });
    await queryInterface.addIndex('activity_logs', ['level'], {
      name: 'idx_activity_logs_level'
    });
    await queryInterface.addIndex('activity_logs', ['module'], {
      name: 'idx_activity_logs_module'
    });
    await queryInterface.addIndex('activity_logs', ['createdAt'], {
      name: 'idx_activity_logs_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop activity_logs table
    await queryInterface.dropTable('activity_logs');

    // Revert role ENUM to original values
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('LGU-PMT', 'EIU', 'IU', 'EMS', 'SYS.AD') NOT NULL
    `);
  }
};

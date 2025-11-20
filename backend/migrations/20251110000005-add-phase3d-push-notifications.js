'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create user_push_subscriptions table
    await queryInterface.createTable('user_push_subscriptions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      endpoint: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      p256dh: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      auth: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('user_push_subscriptions', ['user_id'], {
      name: 'idx_user_push_subscriptions_user_id'
    });

    await queryInterface.addIndex('user_push_subscriptions', ['user_id', 'endpoint'], {
      unique: true,
      name: 'unique_user_endpoint'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_push_subscriptions');
  }
};


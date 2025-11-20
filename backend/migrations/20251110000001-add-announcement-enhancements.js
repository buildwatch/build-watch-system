'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add contentHtml field for rich text content
    await queryInterface.addColumn('announcements', 'contentHtml', {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'contentHtml'
    });

    // Add requiresAcknowledgment field
    await queryInterface.addColumn('announcements', 'requiresAcknowledgment', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requiresAcknowledgment'
    });

    // Add acknowledgmentDeadline field
    await queryInterface.addColumn('announcements', 'acknowledgmentDeadline', {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'acknowledgmentDeadline'
    });

    // Create read_receipts table
    await queryInterface.createTable('read_receipts', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcementId',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: false,
        field: 'userId',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'readAt'
      },
      acknowledgedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'acknowledgedAt'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'createdAt'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updatedAt'
      }
    });

    // Add unique constraint for announcementId + userId
    await queryInterface.addIndex('read_receipts', ['announcementId', 'userId'], {
      unique: true,
      name: 'idx_read_receipts_unique'
    });

    // Create announcement_attachments table
    await queryInterface.createTable('announcement_attachments', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcementId',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'fileName'
      },
      originalFileName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'originalFileName'
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: false,
        field: 'filePath'
      },
      fileSize: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'fileSize'
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'mimeType'
      },
      uploadedBy: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: true,
        field: 'uploadedBy',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'createdAt'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updatedAt'
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('read_receipts', ['announcementId'], {
      name: 'idx_read_receipts_announcementId'
    });
    await queryInterface.addIndex('read_receipts', ['userId'], {
      name: 'idx_read_receipts_userId'
    });
    await queryInterface.addIndex('announcement_attachments', ['announcementId'], {
      name: 'idx_attachments_announcementId'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove tables
    await queryInterface.dropTable('announcement_attachments');
    await queryInterface.dropTable('read_receipts');
    
    // Remove columns
    await queryInterface.removeColumn('announcements', 'contentHtml');
    await queryInterface.removeColumn('announcements', 'requiresAcknowledgment');
    await queryInterface.removeColumn('announcements', 'acknowledgmentDeadline');
  }
};


'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Template name/title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Template description'
      },
      category: {
        type: Sequelize.ENUM('rpmes_forms', 'progress_reports', 'specialized_forms', 'compliance_forms', 'monitoring_forms'),
        allowNull: false,
        defaultValue: 'progress_reports'
      },
      subCategory: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Sub-category within main category'
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Target department/office for this template'
      },
      fileType: {
        type: Sequelize.ENUM('pdf', 'docx', 'xlsx', 'doc', 'xls'),
        allowNull: false,
        defaultValue: 'pdf'
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Path to the template file'
      },
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original filename'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes'
      },
      version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '1.0',
        comment: 'Template version'
      },
      status: {
        type: Sequelize.ENUM('active', 'draft', 'archived', 'pending'),
        allowNull: false,
        defaultValue: 'draft'
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this template is mandatory for projects'
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times template has been downloaded'
      },
      lastDownloadedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time template was downloaded'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Search tags for the template'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the template'
      },
      uploadedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Template expiry date if applicable'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('templates', ['category']);
    await queryInterface.addIndex('templates', ['department']);
    await queryInterface.addIndex('templates', ['status']);
    await queryInterface.addIndex('templates', ['uploadedBy']);
    await queryInterface.addIndex('templates', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('templates');
  }
}; 
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create shared_folders table first (no dependencies)
    await queryInterface.createTable('shared_folders', {
      id: {
        type: Sequelize.CHAR(36).BINARY,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('documents', 'photos', 'videos'),
        allowNull: false,
        defaultValue: 'documents'
      },
      created_by_id: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Add index for created_by_id
    await queryInterface.addIndex('shared_folders', ['created_by_id'], {
      name: 'idx_shared_folders_created_by_id'
    });

    // Add index for type
    await queryInterface.addIndex('shared_folders', ['type'], {
      name: 'idx_shared_folders_type'
    });

    // Create shared_documents table (depends on shared_folders)
    await queryInterface.createTable('shared_documents', {
      id: {
        type: Sequelize.CHAR(36).BINARY,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'documents'
      },
      url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      uploaded_by_id: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      folder_id: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: true,
        references: {
          model: 'shared_folders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    // Add indexes for shared_documents
    await queryInterface.addIndex('shared_documents', ['uploaded_by_id'], {
      name: 'idx_shared_documents_uploaded_by_id'
    });
    await queryInterface.addIndex('shared_documents', ['folder_id'], {
      name: 'idx_shared_documents_folder_id'
    });
    await queryInterface.addIndex('shared_documents', ['file_type'], {
      name: 'idx_shared_documents_file_type'
    });
    await queryInterface.addIndex('shared_documents', ['uploaded_at'], {
      name: 'idx_shared_documents_uploaded_at'
    });

    // Create document_downloads table
    await queryInterface.createTable('document_downloads', {
      id: {
        type: Sequelize.CHAR(36).BINARY,
        primaryKey: true,
        allowNull: false
      },
      file_id: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: true,
        references: {
          model: 'shared_documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      downloaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    // Add indexes for document_downloads
    await queryInterface.addIndex('document_downloads', ['user_id'], {
      name: 'idx_document_downloads_user_id'
    });
    await queryInterface.addIndex('document_downloads', ['file_id'], {
      name: 'idx_document_downloads_file_id'
    });
    await queryInterface.addIndex('document_downloads', ['downloaded_at'], {
      name: 'idx_document_downloads_downloaded_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (respecting foreign key dependencies)
    await queryInterface.dropTable('document_downloads');
    await queryInterface.dropTable('shared_documents');
    await queryInterface.dropTable('shared_folders');
  }
};


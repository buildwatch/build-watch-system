'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('articles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      author: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'LGU Communications Office'
      },
      authorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      publishDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      category: {
        type: Sequelize.ENUM('News', 'Announcement', 'Publication', 'Update', 'Event'),
        allowNull: false,
        defaultValue: 'News'
      },
      status: {
        type: Sequelize.ENUM('Draft', 'Published', 'Archived'),
        allowNull: false,
        defaultValue: 'Published'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      externalUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('articles', ['status']);
    await queryInterface.addIndex('articles', ['category']);
    await queryInterface.addIndex('articles', ['isFeatured']);
    await queryInterface.addIndex('articles', ['publishDate']);
    await queryInterface.addIndex('articles', ['authorId']);
    await queryInterface.addIndex('articles', ['projectId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('articles');
  }
}; 
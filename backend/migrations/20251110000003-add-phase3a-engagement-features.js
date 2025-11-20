'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create announcement_comments table
    await queryInterface.createTable('announcement_comments', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcement_id',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      parentCommentId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        field: 'parent_comment_id',
        references: {
          model: 'announcement_comments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      isEdited: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_edited'
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_deleted'
      },
      editedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'edited_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for announcement_comments
    await queryInterface.addIndex('announcement_comments', ['announcement_id'], {
      name: 'idx_announcement_comments_announcementId'
    });
    await queryInterface.addIndex('announcement_comments', ['user_id'], {
      name: 'idx_announcement_comments_userId'
    });
    await queryInterface.addIndex('announcement_comments', ['parent_comment_id'], {
      name: 'idx_announcement_comments_parentCommentId'
    });
    await queryInterface.addIndex('announcement_comments', ['created_at'], {
      name: 'idx_announcement_comments_createdAt'
    });

    // Create announcement_reactions table
    await queryInterface.createTable('announcement_reactions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcement_id',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      reactionType: {
        type: Sequelize.ENUM('helpful', 'important', 'acknowledged', 'urgent'),
        allowNull: false,
        defaultValue: 'helpful',
        field: 'reaction_type'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for announcement_reactions
    await queryInterface.addIndex('announcement_reactions', ['announcement_id'], {
      name: 'idx_announcement_reactions_announcementId'
    });
    await queryInterface.addIndex('announcement_reactions', ['user_id'], {
      name: 'idx_announcement_reactions_userId'
    });
    // Unique constraint: one reaction type per user per announcement
    await queryInterface.addIndex('announcement_reactions', ['announcement_id', 'user_id', 'reaction_type'], {
      unique: true,
      name: 'unique_user_reaction_per_announcement'
    });

    // Create announcement_favorites table
    await queryInterface.createTable('announcement_favorites', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcement_id',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for announcement_favorites
    await queryInterface.addIndex('announcement_favorites', ['announcement_id'], {
      name: 'idx_announcement_favorites_announcementId'
    });
    await queryInterface.addIndex('announcement_favorites', ['user_id'], {
      name: 'idx_announcement_favorites_userId'
    });
    // Unique constraint: one favorite per user per announcement
    await queryInterface.addIndex('announcement_favorites', ['announcement_id', 'user_id'], {
      unique: true,
      name: 'unique_user_favorite_per_announcement'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order (due to foreign key constraints)
    await queryInterface.dropTable('announcement_favorites');
    await queryInterface.dropTable('announcement_reactions');
    await queryInterface.dropTable('announcement_comments');
  }
};


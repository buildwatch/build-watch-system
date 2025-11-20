'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create project_comments table
    await queryInterface.createTable('project_comments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      authorName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'Anonymous'
      },
      authorEmail: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      isAnonymous: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      likes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      isApproved: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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

    // Create indexes
    await queryInterface.addIndex('project_comments', ['projectId'], { name: 'idx_project_comments_project_id' });
    await queryInterface.addIndex('project_comments', ['userId'], { name: 'idx_project_comments_user_id' });
    await queryInterface.addIndex('project_comments', ['createdAt'], { name: 'idx_project_comments_created_at' });
    await queryInterface.addIndex('project_comments', ['isApproved'], { name: 'idx_project_comments_is_approved' });

    // Create project_comment_reactions table
    await queryInterface.createTable('project_comment_reactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      commentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'project_comments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      sessionId: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      reactionType: {
        type: Sequelize.ENUM('like', 'heart'),
        defaultValue: 'like',
        allowNull: false
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

    // Create indexes
    await queryInterface.addIndex('project_comment_reactions', ['commentId'], { name: 'idx_project_comment_reactions_comment_id' });
    await queryInterface.addIndex('project_comment_reactions', ['userId'], { name: 'idx_project_comment_reactions_user_id' });
    await queryInterface.addIndex('project_comment_reactions', ['sessionId'], { name: 'idx_project_comment_reactions_session_id' });
    
    // Create unique constraint to prevent duplicate reactions
    await queryInterface.addIndex('project_comment_reactions', ['commentId', 'userId', 'sessionId'], {
      name: 'unique_reaction',
      unique: true,
      where: {
        userId: { [Sequelize.Op.ne]: null }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('project_comment_reactions');
    await queryInterface.dropTable('project_comments');
  }
};


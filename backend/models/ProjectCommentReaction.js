const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectCommentReaction = sequelize.define('ProjectCommentReaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    commentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'project_comments',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User ID if logged in, null for anonymous'
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Session ID for anonymous users to prevent duplicate reactions'
    },
    reactionType: {
      type: DataTypes.ENUM('like', 'heart'),
      defaultValue: 'like',
      allowNull: false
    }
  }, {
    tableName: 'project_comment_reactions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['commentId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['sessionId']
      },
      {
        unique: true,
        fields: ['commentId', 'userId', 'sessionId'],
        name: 'unique_reaction'
      }
    ]
  });

  ProjectCommentReaction.associate = (models) => {
    ProjectCommentReaction.belongsTo(models.ProjectComment, {
      foreignKey: 'commentId',
      as: 'comment'
    });
    
    ProjectCommentReaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      optional: true
    });
  };

  return ProjectCommentReaction;
};


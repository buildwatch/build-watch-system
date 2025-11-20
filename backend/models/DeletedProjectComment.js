const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  if (!sequelize) {
    throw new Error('Sequelize instance is required');
  }
  const DeletedProjectComment = sequelize.define('DeletedProjectComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    originalCommentId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Original comment ID before deletion'
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
      comment: 'Project the comment belonged to'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'User who made the comment (if logged in)'
    },
    authorName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Author name from the original comment'
    },
    authorEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Author email from the original comment'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Comment content before deletion'
    },
    commentCreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Original creation date of the comment'
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'System Admin who deleted the comment'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the comment was deleted'
    },
    deletedFromIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of the deletion request'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent of the deletion request'
    }
  }, {
    tableName: 'deleted_project_comments',
    timestamps: false, // We manage timestamps manually
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['deletedBy']
      },
      {
        fields: ['deletedAt']
      }
    ]
  });

  DeletedProjectComment.associate = (models) => {
    DeletedProjectComment.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    DeletedProjectComment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    DeletedProjectComment.belongsTo(models.User, { foreignKey: 'deletedBy', as: 'deletedByUser' });
  };

  return DeletedProjectComment;
};


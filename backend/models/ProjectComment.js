const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectComment = sequelize.define('ProjectComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    authorName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Anonymous',
      comment: 'Name of the comment author (for anonymous users)'
    },
    authorEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email of the comment author (optional, for anonymous users)'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'User ID if logged in user posted the comment'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5000]
      }
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether the comment is approved for public display'
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Array of image URLs attached to the comment (max 2 images)'
    }
  }, {
    tableName: 'project_comments',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['isApproved']
      }
    ]
  });

  ProjectComment.associate = (models) => {
    ProjectComment.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });
    
    ProjectComment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      optional: true
    });
  };

  return ProjectComment;
};


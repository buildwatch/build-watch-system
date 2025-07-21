const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectFeedback = sequelize.define('ProjectFeedback', {
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
      }
    },
    providedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('Positive', 'Negative', 'Suggestion', 'Concern', 'Question'),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Reviewed', 'Addressed', 'Closed'),
      defaultValue: 'Pending',
      allowNull: false
    },
    reviewedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responseById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    responseAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      defaultValue: 'Medium',
      allowNull: false
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'project_feedback',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['providedById']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      }
    ]
  });

  ProjectFeedback.associate = (models) => {
    // ProjectFeedback belongs to Project
    ProjectFeedback.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // ProjectFeedback belongs to User (provider)
    ProjectFeedback.belongsTo(models.User, {
      foreignKey: 'providedById',
      as: 'provider'
    });

    // ProjectFeedback belongs to User (reviewer)
    ProjectFeedback.belongsTo(models.User, {
      foreignKey: 'reviewedById',
      as: 'reviewer'
    });

    // ProjectFeedback belongs to User (responder)
    ProjectFeedback.belongsTo(models.User, {
      foreignKey: 'responseById',
      as: 'responder'
    });
  };

  return ProjectFeedback;
}; 
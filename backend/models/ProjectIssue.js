const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectIssue = sequelize.define('ProjectIssue', {
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
    reportedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    severity: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Closed', 'Escalated'),
      defaultValue: 'Open',
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      allowNull: false
    },
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    resolvedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    escalationLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },
    escalatedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    impact: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mitigationPlan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'project_issues',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['reportedById']
      },
      {
        fields: ['assignedToId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['priority']
      }
    ]
  });

  ProjectIssue.associate = (models) => {
    // ProjectIssue belongs to Project
    ProjectIssue.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // ProjectIssue belongs to User (reporter)
    ProjectIssue.belongsTo(models.User, {
      foreignKey: 'reportedById',
      as: 'reporter'
    });

    // ProjectIssue belongs to User (assigned to)
    ProjectIssue.belongsTo(models.User, {
      foreignKey: 'assignedToId',
      as: 'assignedTo'
    });

    // ProjectIssue belongs to User (resolver)
    ProjectIssue.belongsTo(models.User, {
      foreignKey: 'resolvedById',
      as: 'resolver'
    });

    // ProjectIssue belongs to User (escalated to)
    ProjectIssue.belongsTo(models.User, {
      foreignKey: 'escalatedToId',
      as: 'escalatedTo'
    });

    // ProjectIssue has many Uploads
    ProjectIssue.hasMany(models.Upload, {
      foreignKey: 'projectIssueId',
      as: 'attachments'
    });
  };

  return ProjectIssue;
}; 
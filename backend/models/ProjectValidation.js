const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectValidation = sequelize.define('ProjectValidation', {
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
    reportType: {
      type: DataTypes.ENUM('progress_report', 'milestone_report', 'completion_report', 'rpmes_form'),
      allowNull: false,
      defaultValue: 'progress_report'
    },
    reportId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of the specific report being validated (e.g., ProjectUpdate ID, RPMES Form ID)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'validated', 'flagged', 'returned', 'approved'),
      allowNull: false,
      defaultValue: 'pending'
    },
    priority: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: false,
      defaultValue: 'medium'
    },
    issues: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of identified issues'
    },
    validationChecklist: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Validation checklist results'
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Validation comments and feedback'
    },
    validatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    returnedForRevision: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    revisionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validationScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Validation score (0-100)'
    },
    complianceStatus: {
      type: DataTypes.ENUM('compliant', 'non_compliant', 'partial'),
      allowNull: true
    }
  }, {
    tableName: 'project_validations',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['validatedBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  ProjectValidation.associate = (models) => {
    // ProjectValidation belongs to Project
    ProjectValidation.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // ProjectValidation belongs to User (validator)
    ProjectValidation.belongsTo(models.User, {
      foreignKey: 'validatedBy',
      as: 'validator'
    });

    // ProjectValidation can have many ActivityLogs
    ProjectValidation.hasMany(models.ActivityLog, {
      foreignKey: 'entityId',
      as: 'activityLogs',
      scope: {
        entityType: 'ProjectValidation'
      }
    });
  };

  return ProjectValidation;
}; 
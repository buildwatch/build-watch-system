const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EIUActivity = sequelize.define('EIUActivity', {
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
    eiuUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    activityType: {
      type: DataTypes.ENUM('site_visit', 'document_review', 'progress_report', 'issue_identified', 'quality_check', 'safety_inspection', 'material_delivery', 'construction_update'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
      allowNull: false
    },
    activityDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of file attachments (photos, documents, etc.)'
    },
    findings: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Findings or observations from the activity'
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Recommendations or next steps'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID of IO user who reviewed this activity'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comments from IO reviewer'
    },
    reviewStatus: {
      type: DataTypes.ENUM('pending_review', 'approved', 'rejected', 'requires_revision'),
      defaultValue: 'pending_review',
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional activity-specific data'
    }
  }, {
    tableName: 'eiu_activities',
    timestamps: true,
    indexes: [
      {
        name: 'idx_eiu_activities_project_id',
        fields: ['projectId']
      },
      {
        name: 'idx_eiu_activities_eiu_user_id',
        fields: ['eiuUserId']
      },
      {
        name: 'idx_eiu_activities_activity_type',
        fields: ['activityType']
      },
      {
        name: 'idx_eiu_activities_status',
        fields: ['status']
      },
      {
        name: 'idx_eiu_activities_review_status',
        fields: ['reviewStatus']
      },
      {
        name: 'idx_eiu_activities_activity_date',
        fields: ['activityDate']
      },
      {
        name: 'idx_eiu_activities_project_status',
        fields: ['projectId', 'status']
      },
      {
        name: 'idx_eiu_activities_eiu_status',
        fields: ['eiuUserId', 'status']
      }
    ]
  });

  EIUActivity.associate = (models) => {
    // EIUActivity belongs to Project
    EIUActivity.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // EIUActivity belongs to EIU User (creator)
    EIUActivity.belongsTo(models.User, {
      foreignKey: 'eiuUserId',
      as: 'eiuUser'
    });

    // EIUActivity belongs to IO User (reviewer)
    EIUActivity.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
  };

  return EIUActivity;
}; 
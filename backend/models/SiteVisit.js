const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SiteVisit = sequelize.define('SiteVisit', {
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
    scheduledById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    scheduledDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    actualDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled'),
      defaultValue: 'Scheduled',
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    agenda: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    findings: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rescheduledDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isMandatory: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'site_visits',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['scheduledById']
      },
      {
        fields: ['scheduledDate']
      },
      {
        fields: ['status']
      }
    ]
  });

  SiteVisit.associate = (models) => {
    // SiteVisit belongs to Project
    SiteVisit.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // SiteVisit belongs to User (scheduler)
    SiteVisit.belongsTo(models.User, {
      foreignKey: 'scheduledById',
      as: 'scheduler'
    });

    // SiteVisit belongs to many Users (participants)
    SiteVisit.belongsToMany(models.User, {
      through: 'site_visit_participants',
      foreignKey: 'siteVisitId',
      otherKey: 'userId',
      as: 'participants'
    });

    // SiteVisit has many Monitoring Reports
    SiteVisit.hasMany(models.MonitoringReport, {
      foreignKey: 'siteVisitId',
      as: 'monitoringReports'
    });

    // SiteVisit has many Uploads
    SiteVisit.hasMany(models.Upload, {
      foreignKey: 'siteVisitId',
      as: 'attachments'
    });
  };

  return SiteVisit;
}; 
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MonitoringReport = sequelize.define('MonitoringReport', {
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
    conductedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    monitoringType: {
      type: DataTypes.ENUM(
        'Physical Progress Validation',
        'Financial Progress Review',
        'Quality Assessment',
        'Compliance Check',
        'Site Visit',
        'Stakeholder Interview',
        'Document Review'
      ),
      allowNull: false
    },
    monitoringDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    findings: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'),
      defaultValue: 'Draft',
      allowNull: false
    },
    validatedById: {
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
    validationFeedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    siteVisitId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'site_visits',
        key: 'id'
      }
    },
    physicalProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    financialProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    qualityRating: {
      type: DataTypes.ENUM('Poor', 'Fair', 'Good', 'Very Good', 'Excellent'),
      allowNull: true
    },
    complianceStatus: {
      type: DataTypes.ENUM('Compliant', 'Non-Compliant', 'Partially Compliant'),
      allowNull: true
    },
    riskLevel: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'monitoring_reports',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['conductedById']
      },
      {
        fields: ['monitoringType']
      },
      {
        fields: ['monitoringDate']
      },
      {
        fields: ['status']
      }
    ]
  });

  MonitoringReport.associate = (models) => {
    // MonitoringReport belongs to Project
    MonitoringReport.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // MonitoringReport belongs to User (conductor)
    MonitoringReport.belongsTo(models.User, {
      foreignKey: 'conductedById',
      as: 'conductor'
    });

    // MonitoringReport belongs to User (validator)
    MonitoringReport.belongsTo(models.User, {
      foreignKey: 'validatedById',
      as: 'validator'
    });

    // MonitoringReport belongs to SiteVisit
    MonitoringReport.belongsTo(models.SiteVisit, {
      foreignKey: 'siteVisitId',
      as: 'siteVisit'
    });

    // MonitoringReport has many Uploads
    MonitoringReport.hasMany(models.Upload, {
      foreignKey: 'monitoringReportId',
      as: 'attachments'
    });
  };

  return MonitoringReport;
}; 
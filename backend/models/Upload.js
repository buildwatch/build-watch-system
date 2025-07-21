const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Upload = sequelize.define('Upload', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    fileType: {
      type: DataTypes.ENUM('image', 'document', 'video', 'audio', 'archive', 'other'),
      allowNull: false
    },
    uploadedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    projectUpdateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'project_updates',
        key: 'id'
      }
    },
    rpmesFormId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rpmes_forms',
        key: 'id'
      }
    },
    monitoringReportId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'monitoring_reports',
        key: 'id'
      }
    },
    siteVisitId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'site_visits',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('Active', 'Archived', 'Deleted'),
      defaultValue: 'Active',
      allowNull: false
    }
  }, {
    tableName: 'uploads',
    timestamps: true,
    indexes: [
      {
        name: 'idx_uploads_uploaded_by',
        fields: ['uploadedById']
      },
      {
        name: 'idx_uploads_entity_type_id',
        fields: ['entityType', 'entityId']
      },
      {
        name: 'idx_uploads_project_id',
        fields: ['projectId']
      },
      {
        name: 'idx_uploads_file_type',
        fields: ['fileType']
      },
      {
        name: 'idx_uploads_status',
        fields: ['status']
      },
      {
        name: 'idx_uploads_created_at',
        fields: ['createdAt']
      },
      {
        name: 'idx_uploads_project_file_type',
        fields: ['projectId', 'fileType']
      },
      {
        name: 'idx_uploads_uploaded_date',
        fields: ['uploadedById', 'createdAt']
      }
    ]
  });

  Upload.associate = (models) => {
    // Upload belongs to User (uploader)
    Upload.belongsTo(models.User, {
      foreignKey: 'uploadedById',
      as: 'uploader'
    });

    // Upload belongs to Project
    Upload.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // Upload belongs to ProjectUpdate
    Upload.belongsTo(models.ProjectUpdate, {
      foreignKey: 'projectUpdateId',
      as: 'projectUpdate'
    });

    // Upload belongs to RPMESForm
    Upload.belongsTo(models.RPMESForm, {
      foreignKey: 'rpmesFormId',
      as: 'rpmesForm'
    });

    // Upload belongs to MonitoringReport
    Upload.belongsTo(models.MonitoringReport, {
      foreignKey: 'monitoringReportId',
      as: 'monitoringReport'
    });

    // Upload belongs to SiteVisit
    Upload.belongsTo(models.SiteVisit, {
      foreignKey: 'siteVisitId',
      as: 'siteVisit'
    });
  };

  return Upload;
}; 
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Template = sequelize.define('Template', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Template name/title'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Template description'
    },
    category: {
      type: DataTypes.ENUM('rpmes_forms', 'progress_reports', 'specialized_forms', 'compliance_forms', 'monitoring_forms'),
      allowNull: false,
      defaultValue: 'progress_reports'
    },
    subCategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Sub-category within main category'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Target department/office for this template'
    },
    fileType: {
      type: DataTypes.ENUM('pdf', 'docx', 'xlsx', 'doc', 'xls'),
      allowNull: false,
      defaultValue: 'pdf'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Path to the template file'
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original filename'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'File size in bytes'
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Template version'
    },
    status: {
      type: DataTypes.ENUM('active', 'draft', 'archived', 'pending'),
      allowNull: false,
      defaultValue: 'draft'
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this template is mandatory for projects'
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times template has been downloaded'
    },
    lastDownloadedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time template was downloaded'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Search tags for the template'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for the template'
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Template expiry date if applicable'
    }
  }, {
    tableName: 'templates',
    timestamps: true,
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['department']
      },
      {
        fields: ['status']
      },
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  Template.associate = (models) => {
    // Template belongs to User (uploader)
    Template.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });

    // Template belongs to User (approver)
    Template.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });

    // Template can have many ActivityLogs
    Template.hasMany(models.ActivityLog, {
      foreignKey: 'entityId',
      as: 'activityLogs',
      scope: {
        entityType: 'Template'
      }
    });
  };

  return Template;
}; 
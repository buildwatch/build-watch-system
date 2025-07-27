const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Policy = sequelize.define('Policy', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Policy title/name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Policy description'
    },
    documentType: {
      type: DataTypes.ENUM('policy_memorandum', 'executive_order', 'ordinance', 'resolution', 'guideline', 'procedure', 'standard'),
      allowNull: false,
      defaultValue: 'policy_memorandum',
      comment: 'Type of policy document'
    },
    category: {
      type: DataTypes.ENUM('infrastructure', 'health', 'education', 'agriculture', 'social', 'environment', 'transportation', 'general'),
      allowNull: false,
      defaultValue: 'general',
      comment: 'Policy category'
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived', 'expired'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Policy status'
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Policy version'
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when policy becomes effective'
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when policy expires'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Path to policy document file'
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Original filename'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'File size in bytes'
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times policy has been downloaded'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times policy has been viewed'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Search tags for the policy'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for the policy'
    },
    complianceRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Compliance rate percentage (0-100)'
    },
    impactScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Policy impact score (0-100)'
    },
    createdBy: {
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
    lastReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last review date'
    },
    nextReviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Next scheduled review date'
    }
  }, {
    tableName: 'policies',
    timestamps: true,
    indexes: [
      {
        fields: ['documentType']
      },
      {
        fields: ['category']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['effectiveDate']
      },
      {
        fields: ['expiryDate']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  Policy.associate = (models) => {
    // Policy belongs to User (creator)
    Policy.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Policy belongs to User (approver)
    Policy.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });

    // Policy can have many ActivityLogs
    Policy.hasMany(models.ActivityLog, {
      foreignKey: 'entityId',
      as: 'activityLogs',
      scope: {
        entityType: 'Policy'
      }
    });
  };

  return Policy;
}; 
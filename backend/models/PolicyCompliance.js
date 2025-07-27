const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PolicyCompliance = sequelize.define('PolicyCompliance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    policyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'policies',
        key: 'id'
      }
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    complianceStatus: {
      type: DataTypes.ENUM('compliant', 'non_compliant', 'partially_compliant', 'pending_review'),
      allowNull: false,
      defaultValue: 'pending_review'
    },
    complianceScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Compliance score percentage (0-100)'
    },
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when compliance was reviewed'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    findings: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Compliance findings and observations'
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Recommendations for improvement'
    },
    nextReviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Next scheduled compliance review date'
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of compliance review attachments'
    }
  }, {
    tableName: 'policy_compliance',
    timestamps: true,
    indexes: [
      {
        fields: ['policyId']
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['complianceStatus']
      },
      {
        fields: ['reviewedBy']
      },
      {
        fields: ['reviewDate']
      },
      {
        fields: ['policyId', 'projectId'],
        unique: true
      }
    ]
  });

  PolicyCompliance.associate = (models) => {
    // PolicyCompliance belongs to Policy
    PolicyCompliance.belongsTo(models.Policy, {
      foreignKey: 'policyId',
      as: 'policy'
    });

    // PolicyCompliance belongs to Project
    PolicyCompliance.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // PolicyCompliance belongs to User (reviewer)
    PolicyCompliance.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
  };

  return PolicyCompliance;
}; 
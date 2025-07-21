'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProjectUpdate extends Model {
    static associate(models) {
      // Define associations here
      ProjectUpdate.belongsTo(models.Project, {
        foreignKey: 'projectId',
        as: 'project'
      });
      
      ProjectUpdate.belongsTo(models.ProjectMilestone, {
        foreignKey: 'milestoneId',
        as: 'milestone'
      });
      
      ProjectUpdate.belongsTo(models.User, {
        foreignKey: 'submittedBy',
        as: 'submitter'
      });
      
      ProjectUpdate.belongsTo(models.User, {
        foreignKey: 'iuReviewer',
        as: 'iuReviewerUser'
      });
      
      ProjectUpdate.belongsTo(models.User, {
        foreignKey: 'secretariatReviewer',
        as: 'secretariatReviewerUser'
      });
      
      ProjectUpdate.hasMany(models.ProjectUpdateFile, {
        foreignKey: 'projectUpdateId',
        as: 'files'
      });
    }
  }
  
  ProjectUpdate.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    milestoneId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'project_milestones',
        key: 'id'
      }
    },
    submittedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    submittedByRole: {
      type: DataTypes.ENUM('eiu', 'iu', 'secretariat', 'mpmec'),
      allowNull: false
    },
    submittedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updateType: {
      type: DataTypes.ENUM('timeline', 'budget', 'physical', 'milestone'),
      allowNull: false
    },
    updateFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false
    },
    previousProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    currentProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    progressChange: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    claimedProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    adjustedProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    finalProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    budgetUsed: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    milestoneUpdates: {
      type: DataTypes.JSON,
      allowNull: true
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('submitted', 'iu_reviewed', 'iu_approved', 'iu_rejected', 'secretariat_approved', 'secretariat_rejected'),
      allowNull: false,
      defaultValue: 'submitted'
    },
    iuReviewer: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    iuReviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    iuReviewRemarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    secretariatReviewer: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    secretariatReviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    secretariatReviewRemarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProjectUpdate',
    tableName: 'project_updates',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['milestoneId']
      },
      {
        fields: ['submittedBy']
      },
      {
        fields: ['status']
      },
      {
        fields: ['projectId', 'status']
      }
    ]
  });

  return ProjectUpdate;
}; 
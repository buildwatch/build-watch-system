'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProjectMilestone extends Model {
    static associate(models) {
      // Define associations here
      ProjectMilestone.belongsTo(models.Project, {
        foreignKey: 'projectId',
        as: 'project'
      });
      
      ProjectMilestone.hasMany(models.ProjectUpdate, {
        foreignKey: 'milestoneId',
        as: 'updates'
      });
    }
  }
  
  ProjectMilestone.init({
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    completedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'delayed'),
      allowNull: true,
      defaultValue: 'pending'
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: true,
      defaultValue: 'medium'
    },
    dependsOn: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'project_milestones',
        key: 'id'
      }
    },
    completionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    validatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    validationDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validationComments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    plannedBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    plannedStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    plannedEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'ProjectMilestone',
    tableName: 'project_milestones',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['projectId', 'status']
      },
      {
        fields: ['projectId', 'order']
      }
    ]
  });

  return ProjectMilestone;
}; 
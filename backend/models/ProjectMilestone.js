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
      
      // Add association to MilestoneSubmission
      ProjectMilestone.hasMany(models.MilestoneSubmission, {
        foreignKey: 'milestoneId',
        as: 'submissions'
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
    },
    
    // 3-Division Configuration Fields
    // Timeline Division
    timelineWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 33.33,
      comment: 'Weight percentage for timeline division (fixed at 33.33%)'
    },
    timelineStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Timeline division start date'
    },
    timelineEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Timeline division end date'
    },
    timelineDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of timeline activities and progress'
    },
    timelineStatus: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'approved'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Status of timeline division approval'
    },
    
    // Budget Division
    budgetWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 33.33,
      comment: 'Weight percentage for budget division (fixed at 33.33%)'
    },
    budgetPlanned: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Planned budget for this division'
    },
    budgetBreakdown: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Budget breakdown description'
    },
    budgetStatus: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'approved'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Status of budget division approval'
    },
    
    // Physical Accomplishment Division
    physicalWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 33.33,
      comment: 'Weight percentage for physical division (fixed at 33.33%)'
    },
    physicalProofType: {
      type: DataTypes.ENUM('form', 'video', 'image', 'document', 'report', 'other'),
      allowNull: true,
      defaultValue: 'form',
      comment: 'Type of proof required for physical accomplishment'
    },
    physicalDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of physical accomplishment'
    },
    physicalStatus: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'approved'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Status of physical division approval'
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
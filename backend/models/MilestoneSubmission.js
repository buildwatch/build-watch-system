const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MilestoneSubmission = sequelize.define('MilestoneSubmission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Foreign Keys
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      },
      comment: 'Reference to the project'
    },
    milestoneId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'project_milestones',
        key: 'id'
      },
      comment: 'Reference to the milestone'
    },
    submittedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'EIU user who submitted the milestone'
    },
    
    // Submission Status
    status: {
      type: DataTypes.ENUM('pending_review', 'under_review', 'approved', 'needs_revision', 'rejected'),
      defaultValue: 'pending_review',
      allowNull: false,
      comment: 'Current status of the submission'
    },
    
    // Timeline Division Data
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
    submissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date when milestone was submitted'
    },
    timelineActivitiesDeliverables: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Timeline activities and deliverables description from EIU'
    },
    
    // Budget Division Data
    plannedBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Planned budget for this milestone'
    },
    usedBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Used budget amount from EIU'
    },
    remainingBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Remaining budget calculated'
    },
    budgetUtilizationPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Budget utilization percentage'
    },
    milestoneUtilizationPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Milestone utilization percentage'
    },
    budgetBreakdownAllocation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Budget breakdown and allocation details from EIU'
    },
    fundingSource: {
      type: DataTypes.ENUM('local_fund', 'national_fund', 'foreign_fund', 'private_fund', 'donor_fund', 'mixed_fund'),
      allowNull: true,
      comment: 'Funding source for this milestone'
    },
    
    // Physical Division Data
    requiredProofs: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Required proof types (Photo, Video, Excel, etc.)'
    },
    physicalProgressDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Physical progress description from EIU'
    },
    
    // File Attachments (JSON arrays storing file metadata)
    photoEvidence: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of photo evidence files with metadata'
    },
    videoEvidence: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of video evidence files with metadata'
    },
    documentFiles: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of Excel/document files with metadata'
    },
    
    // Additional Information
    additionalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes from EIU'
    },
    
    // Submitted By Information (stored as JSON for flexibility)
    submitterInfo: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Full submitter information (name, subrole, contact, department, company)'
    },
    
    // RPMES and Additional Documents
    attachedRpmesForm: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Attached RPMES form file metadata'
    },
    rpmesFormPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Path to the uploaded RPMES form file'
    },
    rpmesFormName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Original name of the RPMES form file'
    },
    rpmesFormSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Size of the RPMES form file in bytes'
    },
    attachedAdditionalDocument: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional document file metadata'
    },
    
    // Division Weights
    timelineWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 33.33,
      comment: 'Timeline division weight percentage'
    },
    budgetWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 33.33,
      comment: 'Budget division weight percentage'
    },
    physicalWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 33.34,
      comment: 'Physical division weight percentage'
    },
    
    // Review Information
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'LGU-IU user who reviewed the submission'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date and time when submission was reviewed'
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from the reviewer'
    },
    
    // Timestamps
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the submission was created'
    }
  }, {
    tableName: 'milestone_submissions',
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
        fields: ['submissionDate']
      }
    ]
  });

  MilestoneSubmission.associate = (models) => {
    // Belongs to Project
    MilestoneSubmission.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });
    
    // Belongs to ProjectMilestone
    MilestoneSubmission.belongsTo(models.ProjectMilestone, {
      foreignKey: 'milestoneId',
      as: 'milestone'
    });
    
    // Belongs to User (submitter)
    MilestoneSubmission.belongsTo(models.User, {
      foreignKey: 'submittedBy',
      as: 'submitter'
    });
    
    // Belongs to User (reviewer)
    MilestoneSubmission.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
  };

  return MilestoneSubmission;
}; 
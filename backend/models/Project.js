const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Unique project code identifier'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Project/Program title'
    },
    implementingOfficeName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the implementing office/department'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed project description'
    },
    category: {
      type: DataTypes.ENUM('infrastructure', 'health', 'education', 'agriculture', 'social', 'environment', 'transportation'),
      allowNull: false,
      comment: 'Project category'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Project location/barangay'
    },
    priority: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: false,
      comment: 'Project priority level'
    },
    fundingSource: {
      type: DataTypes.ENUM('local_fund', 'national_fund', 'foreign_fund', 'private_fund', 'donor_fund', 'mixed_fund'),
      allowNull: false,
      comment: 'Source of project funding'
    },
    createdDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date when project was created'
    },
    status: {
      type: DataTypes.ENUM('pending', 'ongoing', 'delayed', 'complete'),
      defaultValue: 'pending',
      comment: 'Project status'
    },
    
    // Basic project information
    expectedOutputs: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Expected outputs and results'
    },
    targetBeneficiaries: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Target beneficiaries'
    },
    hasExternalPartner: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether project has external partner (EIU)'
    },
    
    // Timeline Division Configuration
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Project start date'
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Project end date'
    },
    completionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Actual completion date'
    },
    timelineUpdateFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false,
      comment: 'Timeline update frequency'
    },
    timelineMilestones: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Timeline milestones and phases'
    },
    timelineProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Timeline progress percentage (0-100)'
    },
    
    // Budget/Disbursement Division Configuration
    totalBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Total budget allocation'
    },
    budgetUpdateFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false,
      comment: 'Budget update frequency'
    },
    budgetBreakdown: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed budget breakdown'
    },
    budgetProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Budget utilization progress percentage (0-100)'
    },
    
    // Physical Update Division Configuration
    physicalUpdateFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false,
      comment: 'Physical update frequency'
    },
    requiredDocumentation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Required documentation types (comma-separated)'
    },
    physicalProgressRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Physical progress requirements'
    },
    physicalProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Physical progress percentage (0-100)'
    },
    
    // Overall Progress
    overallProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Overall project progress percentage (0-100)'
    },
    
    // Additional Information
    projectManager: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Project manager/coordinator name'
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Contact number'
    },
    specialRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Special requirements or notes'
    },
    
    // Relationships
    implementingOfficeId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID of the implementing office that created the project'
    },
    
    // EIU Personnel assignment
    eiuPersonnelId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of the EIU Personnel assigned to this project (if hasExternalPartner is true)'
    },
    
    // Approval workflow
    approvedBySecretariat: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether project is approved by MPMEC Secretariat'
    },
    approvedByMPMEC: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether project is approved by MPMEC'
    },
    approvalDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when project was approved'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of user who approved the project'
    },
    
    // New workflow fields
    workflowStatus: {
      type: DataTypes.ENUM('draft', 'submitted', 'secretariat_approved', 'ongoing', 'completed', 'cancelled', 'compiled_for_secretariat', 'validated_by_secretariat'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Current workflow status of the project'
    },
    submittedToSecretariat: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether project has been submitted to Secretariat for approval'
    },
    submittedToSecretariatDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when project was submitted to Secretariat'
    },
    secretariatApprovalDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when Secretariat approved the project'
    },
    secretariatApprovedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of Secretariat user who approved the project'
    },
    automatedProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'System-calculated progress based on approved milestones'
    },
    lastProgressUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date of last progress update'
    },
    
    // Timestamps
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    indexes: [
      {
        fields: ['implementingOfficeId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['startDate']
      },
      {
        fields: ['endDate']
      }
    ]
  });

  // Instance methods
  Project.prototype.calculateOverallProgress = function() {
    // Each division contributes 33.33% to overall progress
    const timelineWeight = 33.33;
    const budgetWeight = 33.33;
    const physicalWeight = 33.34; // Slightly more to ensure 100%
    
    const overallProgress = (
      (this.timelineProgress * timelineWeight / 100) +
      (this.budgetProgress * budgetWeight / 100) +
      (this.physicalProgress * physicalWeight / 100)
    );
    
    return Math.min(100, Math.max(0, overallProgress));
  };

  Project.prototype.updateProgress = function(timelineProgress, budgetProgress, physicalProgress) {
    this.timelineProgress = Math.min(100, Math.max(0, timelineProgress));
    this.budgetProgress = Math.min(100, Math.max(0, budgetProgress));
    this.physicalProgress = Math.min(100, Math.max(0, physicalProgress));
    this.overallProgress = this.calculateOverallProgress();
    
    // Update status based on progress
    if (this.overallProgress >= 100) {
      this.status = 'complete';
      this.completionDate = new Date();
    } else if (this.overallProgress > 0) {
      this.status = 'ongoing';
    }
    
    return this;
  };

  Project.prototype.checkForDelays = function() {
    const today = new Date();
    const endDate = new Date(this.endDate);
    
    if (today > endDate && this.overallProgress < 100) {
      this.status = 'delayed';
      return true;
    }
    
    return false;
  };

  // Define associations
  Project.associate = function(models) {
    // Project belongs to Implementing Office (User)
    Project.belongsTo(models.User, {
      foreignKey: 'implementingOfficeId',
      as: 'implementingOffice'
    });

    // Project belongs to EIU Personnel (User)
    Project.belongsTo(models.User, {
      foreignKey: 'eiuPersonnelId',
      as: 'eiuPersonnel'
    });

    // Project belongs to User who approved it
    Project.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approvedByUser'
    });

    // Project belongs to Secretariat user who approved it
    Project.belongsTo(models.User, {
      foreignKey: 'secretariatApprovedBy',
      as: 'secretariatApprovedByUser'
    });

    // Project has many updates
    Project.hasMany(models.ProjectUpdate, {
      foreignKey: 'projectId',
      as: 'updates'
    });

    // Project has many milestones
    Project.hasMany(models.ProjectMilestone, {
      foreignKey: 'projectId',
      as: 'milestones'
    });

    // Project has many issues
    Project.hasMany(models.ProjectIssue, {
      foreignKey: 'projectId',
      as: 'issues'
    });

    // Project has many uploads
    Project.hasMany(models.Upload, {
      foreignKey: 'projectId',
      as: 'uploads'
    });
  };

  return Project;
}; 
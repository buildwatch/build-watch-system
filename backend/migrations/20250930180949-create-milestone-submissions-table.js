'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('milestone_submissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      
      // Foreign Keys
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the project'
      },
      milestoneId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'project_milestones',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the milestone'
      },
      submittedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'EIU user who submitted the milestone'
      },
      
      // Submission Status
      status: {
        type: Sequelize.ENUM('pending_review', 'under_review', 'approved', 'needs_revision', 'rejected'),
        defaultValue: 'pending_review',
        allowNull: false,
        comment: 'Current status of the submission'
      },
      
      // Timeline Division Data
      timelineStartDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Timeline division start date'
      },
      timelineEndDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Timeline division end date'
      },
      submissionDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date when milestone was submitted'
      },
      timelineActivitiesDeliverables: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Timeline activities and deliverables description from EIU'
      },
      
      // Budget Division Data
      plannedBudget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Planned budget for this milestone'
      },
      usedBudget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Used budget amount from EIU'
      },
      remainingBudget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Remaining budget calculated'
      },
      budgetUtilizationPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Budget utilization percentage'
      },
      milestoneUtilizationPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Milestone utilization percentage'
      },
      budgetBreakdownAllocation: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Budget breakdown and allocation details from EIU'
      },
      fundingSource: {
        type: Sequelize.ENUM('local_fund', 'national_fund', 'foreign_fund', 'private_fund', 'donor_fund', 'mixed_fund'),
        allowNull: true,
        comment: 'Funding source for this milestone'
      },
      
      // Physical Division Data
      requiredProofs: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Required proof types (Photo, Video, Excel, etc.)'
      },
      physicalProgressDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Physical progress description from EIU'
      },
      
      // File Attachments (JSON arrays storing file metadata)
      photoEvidence: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of photo evidence files with metadata'
      },
      videoEvidence: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of video evidence files with metadata'
      },
      documentFiles: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of Excel/document files with metadata'
      },
      
      // Additional Information
      additionalNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes from EIU'
      },
      
      // Submitted By Information (stored as JSON for flexibility)
      submitterInfo: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Full submitter information (name, subrole, contact, department, company)'
      },
      
      // RPMES and Additional Documents
      attachedRpmesForm: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Attached RPMES form file metadata'
      },
      attachedAdditionalDocument: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional document file metadata'
      },
      
      // Division Weights
      timelineWeight: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 33.33,
        comment: 'Timeline division weight percentage'
      },
      budgetWeight: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 33.33,
        comment: 'Budget division weight percentage'
      },
      physicalWeight: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 33.34,
        comment: 'Physical division weight percentage'
      },
      
      // Review Information
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'LGU-IU user who reviewed the submission'
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date and time when submission was reviewed'
      },
      reviewNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes from the reviewer'
      },
      
      // Timestamps
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the submission was created'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('milestone_submissions', ['projectId'], {
      name: 'milestone_submissions_project_id_idx'
    });
    
    await queryInterface.addIndex('milestone_submissions', ['milestoneId'], {
      name: 'milestone_submissions_milestone_id_idx'
    });
    
    await queryInterface.addIndex('milestone_submissions', ['submittedBy'], {
      name: 'milestone_submissions_submitted_by_idx'
    });
    
    await queryInterface.addIndex('milestone_submissions', ['status'], {
      name: 'milestone_submissions_status_idx'
    });
    
    await queryInterface.addIndex('milestone_submissions', ['submissionDate'], {
      name: 'milestone_submissions_submission_date_idx'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('milestone_submissions');
  }
};

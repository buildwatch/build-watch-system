'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, let's check if the users table exists and has the correct structure
    try {
      const [results] = await queryInterface.sequelize.query(
        "SHOW TABLES LIKE 'users'"
      );
      
      if (results.length === 0) {
        throw new Error('Users table does not exist. Please run user migrations first.');
      }

      // Check if users table has the correct structure
      const [columns] = await queryInterface.sequelize.query(
        "DESCRIBE users"
      );
      
      const hasIdColumn = columns.some(col => col.Field === 'id' && col.Key === 'PRI');
      if (!hasIdColumn) {
        throw new Error('Users table does not have a primary key id column.');
      }
    } catch (error) {
      console.error('Error checking users table:', error.message);
      throw error;
    }

    // Create projects table
    await queryInterface.createTable('projects', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Project/Program title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Detailed project description'
      },
      category: {
        type: Sequelize.ENUM('infrastructure', 'health', 'education', 'agriculture', 'social', 'environment', 'transportation'),
        allowNull: false,
        comment: 'Project category'
      },
      location: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Project location/barangay'
      },
      priority: {
        type: Sequelize.ENUM('high', 'medium', 'low'),
        allowNull: false,
        comment: 'Project priority level'
      },
      status: {
        type: Sequelize.ENUM('pending', 'ongoing', 'delayed', 'complete'),
        defaultValue: 'pending',
        comment: 'Project status'
      },
      
      // Basic project information
      expectedOutputs: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Expected outputs and results'
      },
      targetBeneficiaries: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Target beneficiaries'
      },
      hasExternalPartner: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether project has external partner (EIU)'
      },
      
      // Timeline Division Configuration
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Project start date'
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Project end date'
      },
      completionDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Actual completion date'
      },
      timelineUpdateFrequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        allowNull: false,
        comment: 'Timeline update frequency'
      },
      timelineMilestones: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Timeline milestones and phases'
      },
      timelineProgress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Timeline progress percentage (0-100)'
      },
      
      // Budget/Disbursement Division Configuration
      totalBudget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Total budget allocation'
      },
      budgetUpdateFrequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        allowNull: false,
        comment: 'Budget update frequency'
      },
      budgetBreakdown: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed budget breakdown'
      },
      budgetProgress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Budget utilization progress percentage (0-100)'
      },
      
      // Physical Update Division Configuration
      physicalUpdateFrequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        allowNull: false,
        comment: 'Physical update frequency'
      },
      requiredDocumentation: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Required documentation types (comma-separated)'
      },
      physicalProgressRequirements: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Physical progress requirements'
      },
      physicalProgress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Physical progress percentage (0-100)'
      },
      
      // Overall Progress
      overallProgress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Overall project progress percentage (0-100)'
      },
      
      // Additional Information
      projectManager: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Project manager/coordinator name'
      },
      contactNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Contact number'
      },
      specialRequirements: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Special requirements or notes'
      },
      
      // Relationships - Create without foreign key first
      implementingOfficeId: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of the implementing office that created the project'
      },
      
      // Approval workflow
      approvedBySecretariat: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether project is approved by MPMEC Secretariat'
      },
      approvedByMPMEC: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether project is approved by MPMEC'
      },
      approvalDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when project was approved'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of user who approved the project'
      },
      
      // Timestamps
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

    // Create project_updates table
    await queryInterface.createTable('project_updates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of the project being updated'
      },
      updateType: {
        type: Sequelize.ENUM('timeline', 'budget', 'physical', 'overall'),
        allowNull: false,
        comment: 'Type of update (which division)'
      },
      updateFrequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        allowNull: false,
        comment: 'Update frequency requirement'
      },
      
      // Progress data
      previousProgress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Previous progress percentage'
      },
      currentProgress: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Current progress percentage'
      },
      progressChange: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Change in progress percentage'
      },
      
      // Update details
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Update title/summary'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Detailed description of what was accomplished'
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional comments or notes'
      },
      
      // Financial data (for budget updates)
      amountSpent: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Amount spent in this update period'
      },
      budgetUtilization: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Budget utilization percentage'
      },
      
      // Physical data (for physical updates)
      documentsUploaded: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'List of documents uploaded (comma-separated)'
      },
      mediaFiles: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'List of media files (photos, videos)'
      },
      
      // Timeline data (for timeline updates)
      milestoneAchieved: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Milestone achieved in this update'
      },
      nextMilestone: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Next milestone to be achieved'
      },
      
      // Approval workflow
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        comment: 'Update approval status'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of user who approved/rejected the update'
      },
      approvalDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when update was approved/rejected'
      },
      approvalComments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Comments from approver'
      },
      
      // Submitted by
      submittedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of user who submitted the update'
      },
      submittedByRole: {
        type: Sequelize.ENUM('eiu', 'iu', 'secretariat', 'mpmec'),
        allowNull: false,
        comment: 'Role of user who submitted the update'
      },
      
      // Timestamps
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

    // Create project_milestones table
    await queryInterface.createTable('project_milestones', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of the project this milestone belongs to'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Milestone title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed description of the milestone'
      },
      dueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Due date for the milestone'
      },
      completedDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date when milestone was completed'
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'delayed'),
        defaultValue: 'pending',
        comment: 'Milestone status'
      },
      progress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Progress percentage for this milestone (0-100)'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
        comment: 'Milestone priority level'
      },
      
      // Dependencies
      dependsOn: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of milestone this depends on'
      },
      
      // Completion details
      completionNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes about milestone completion'
      },
      completedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of user who marked milestone as completed'
      },
      
      // Validation
      validatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of user who validated the milestone completion'
      },
      validationDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when milestone was validated'
      },
      validationComments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Comments from validator'
      },
      
      // Timestamps
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

    // Add indexes
    await queryInterface.addIndex('projects', ['implementingOfficeId']);
    await queryInterface.addIndex('projects', ['status']);
    await queryInterface.addIndex('projects', ['category']);
    await queryInterface.addIndex('projects', ['priority']);
    await queryInterface.addIndex('projects', ['startDate']);
    await queryInterface.addIndex('projects', ['endDate']);

    await queryInterface.addIndex('project_updates', ['projectId']);
    await queryInterface.addIndex('project_updates', ['updateType']);
    await queryInterface.addIndex('project_updates', ['status']);
    await queryInterface.addIndex('project_updates', ['submittedBy']);
    await queryInterface.addIndex('project_updates', ['submittedByRole']);
    await queryInterface.addIndex('project_updates', ['createdAt']);

    await queryInterface.addIndex('project_milestones', ['projectId']);
    await queryInterface.addIndex('project_milestones', ['status']);
    await queryInterface.addIndex('project_milestones', ['dueDate']);
    await queryInterface.addIndex('project_milestones', ['priority']);
    await queryInterface.addIndex('project_milestones', ['dependsOn']);

    // Now add foreign key constraints after tables are created
    try {
      // Add foreign key for projects.implementingOfficeId
      await queryInterface.addConstraint('projects', {
        fields: ['implementingOfficeId'],
        type: 'foreign key',
        name: 'projects_implementingOfficeId_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for projects.approvedBy
      await queryInterface.addConstraint('projects', {
        fields: ['approvedBy'],
        type: 'foreign key',
        name: 'projects_approvedBy_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for project_updates.projectId
      await queryInterface.addConstraint('project_updates', {
        fields: ['projectId'],
        type: 'foreign key',
        name: 'project_updates_projectId_fkey',
        references: {
          table: 'projects',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for project_updates.approvedBy
      await queryInterface.addConstraint('project_updates', {
        fields: ['approvedBy'],
        type: 'foreign key',
        name: 'project_updates_approvedBy_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for project_updates.submittedBy
      await queryInterface.addConstraint('project_updates', {
        fields: ['submittedBy'],
        type: 'foreign key',
        name: 'project_updates_submittedBy_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for project_milestones.projectId
      await queryInterface.addConstraint('project_milestones', {
        fields: ['projectId'],
        type: 'foreign key',
        name: 'project_milestones_projectId_fkey',
        references: {
          table: 'projects',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for project_milestones.dependsOn
      await queryInterface.addConstraint('project_milestones', {
        fields: ['dependsOn'],
        type: 'foreign key',
        name: 'project_milestones_dependsOn_fkey',
        references: {
          table: 'project_milestones',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for project_milestones.completedBy
      await queryInterface.addConstraint('project_milestones', {
        fields: ['completedBy'],
        type: 'foreign key',
        name: 'project_milestones_completedBy_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Add foreign key for project_milestones.validatedBy
      await queryInterface.addConstraint('project_milestones', {
        fields: ['validatedBy'],
        type: 'foreign key',
        name: 'project_milestones_validatedBy_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

    } catch (error) {
      console.error('Error adding foreign key constraints:', error.message);
      // Continue without foreign keys if they fail
      console.log('Continuing without foreign key constraints...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables first
    await queryInterface.dropTable('project_milestones');
    await queryInterface.dropTable('project_updates');
    await queryInterface.dropTable('projects');
  }
}; 
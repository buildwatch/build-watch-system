'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('eiu_activities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      eiuUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      activityType: {
        type: Sequelize.ENUM('site_visit', 'document_review', 'progress_report', 'issue_identified', 'quality_check', 'safety_inspection', 'material_delivery', 'construction_update'),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false
      },
      activityDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of file attachments (photos, documents, etc.)'
      },
      findings: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Findings or observations from the activity'
      },
      recommendations: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Recommendations or next steps'
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID of IO user who reviewed this activity'
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reviewComments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Comments from IO reviewer'
      },
      reviewStatus: {
        type: Sequelize.ENUM('pending_review', 'approved', 'rejected', 'requires_revision'),
        defaultValue: 'pending_review',
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional activity-specific data'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('eiu_activities', ['projectId'], {
      name: 'idx_eiu_activities_project_id'
    });
    await queryInterface.addIndex('eiu_activities', ['eiuUserId'], {
      name: 'idx_eiu_activities_eiu_user_id'
    });
    await queryInterface.addIndex('eiu_activities', ['activityType'], {
      name: 'idx_eiu_activities_activity_type'
    });
    await queryInterface.addIndex('eiu_activities', ['status'], {
      name: 'idx_eiu_activities_status'
    });
    await queryInterface.addIndex('eiu_activities', ['reviewStatus'], {
      name: 'idx_eiu_activities_review_status'
    });
    await queryInterface.addIndex('eiu_activities', ['activityDate'], {
      name: 'idx_eiu_activities_activity_date'
    });
    await queryInterface.addIndex('eiu_activities', ['projectId', 'status'], {
      name: 'idx_eiu_activities_project_status'
    });
    await queryInterface.addIndex('eiu_activities', ['eiuUserId', 'status'], {
      name: 'idx_eiu_activities_eiu_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('eiu_activities');
  }
}; 
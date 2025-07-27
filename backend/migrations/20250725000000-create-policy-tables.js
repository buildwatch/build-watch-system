'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create policies table
    await queryInterface.createTable('policies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Policy title/name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Policy description'
      },
      documentType: {
        type: Sequelize.ENUM('policy_memorandum', 'executive_order', 'ordinance', 'resolution', 'guideline', 'procedure', 'standard'),
        allowNull: false,
        defaultValue: 'policy_memorandum',
        comment: 'Type of policy document'
      },
      category: {
        type: Sequelize.ENUM('infrastructure', 'health', 'education', 'agriculture', 'social', 'environment', 'transportation', 'general'),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Policy category'
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived', 'expired'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Policy status'
      },
      version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '1.0',
        comment: 'Policy version'
      },
      effectiveDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when policy becomes effective'
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when policy expires'
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to policy document file'
      },
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Original filename'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes'
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times policy has been downloaded'
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times policy has been viewed'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Search tags for the policy'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the policy'
      },
      complianceRate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Compliance rate percentage (0-100)'
      },
      impactScore: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Policy impact score (0-100)'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastReviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last review date'
      },
      nextReviewDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next scheduled review date'
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

    // Create policy_compliance table
    await queryInterface.createTable('policy_compliance', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      policyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'policies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      complianceStatus: {
        type: Sequelize.ENUM('compliant', 'non_compliant', 'partially_compliant', 'pending_review'),
        allowNull: false,
        defaultValue: 'pending_review'
      },
      complianceScore: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Compliance score percentage (0-100)'
      },
      reviewDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when compliance was reviewed'
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      findings: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Compliance findings and observations'
      },
      recommendations: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Recommendations for improvement'
      },
      nextReviewDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next scheduled compliance review date'
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of compliance review attachments'
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

    // Add indexes
    await queryInterface.addIndex('policies', ['documentType']);
    await queryInterface.addIndex('policies', ['category']);
    await queryInterface.addIndex('policies', ['status']);
    await queryInterface.addIndex('policies', ['createdBy']);
    await queryInterface.addIndex('policies', ['effectiveDate']);
    await queryInterface.addIndex('policies', ['expiryDate']);
    await queryInterface.addIndex('policies', ['createdAt']);

    await queryInterface.addIndex('policy_compliance', ['policyId']);
    await queryInterface.addIndex('policy_compliance', ['projectId']);
    await queryInterface.addIndex('policy_compliance', ['complianceStatus']);
    await queryInterface.addIndex('policy_compliance', ['reviewedBy']);
    await queryInterface.addIndex('policy_compliance', ['reviewDate']);
    
    // Add unique constraint for policy-project combination
    await queryInterface.addConstraint('policy_compliance', {
      fields: ['policyId', 'projectId'],
      type: 'unique',
      name: 'policy_compliance_policy_project_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('policy_compliance');
    await queryInterface.dropTable('policies');
  }
}; 
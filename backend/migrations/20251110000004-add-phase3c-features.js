'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add approval fields to announcements table
    await queryInterface.addColumn('announcements', 'approvalStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      field: 'approvalStatus'
    });

    await queryInterface.addColumn('announcements', 'requiresApproval', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requiresApproval'
    });

    // Create announcement_versions table
    await queryInterface.createTable('announcement_versions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcement_id',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      versionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'version_number'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      contentHtml: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'content_html'
      },
      priority: {
        type: Sequelize.ENUM('urgent', 'high', 'normal', 'low'),
        allowNull: false
      },
      announcementType: {
        type: Sequelize.ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update'),
        allowNull: false,
        field: 'announcement_type'
      },
      targetAudience: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'target_audience'
      },
      changeDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'change_description'
      },
      changedBy: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: false,
        field: 'changed_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create announcement_approvals table
    await queryInterface.createTable('announcement_approvals', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcement_id',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      approvalLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'approval_level'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      approvedBy: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: true,
        field: 'approved_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'approved_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create announcement_categories table
    await queryInterface.createTable('announcement_categories', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#3B82F6'
      },
      createdBy: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: true,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create announcement_tags table
    await queryInterface.createTable('announcement_tags', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#6B7280'
      },
      createdBy: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: true,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create announcement_category_mappings table
    await queryInterface.createTable('announcement_category_mappings', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcement_id',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      categoryId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'category_id',
        references: {
          model: 'announcement_categories',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create announcement_tag_mappings table
    await queryInterface.createTable('announcement_tag_mappings', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      announcementId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'announcement_id',
        references: {
          model: 'announcements',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tagId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'tag_id',
        references: {
          model: 'announcement_tags',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create announcement_notification_preferences table
    await queryInterface.createTable('announcement_notification_preferences', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: Sequelize.CHAR(36).BINARY,
        allowNull: false,
        unique: true,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      emailNotifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'email_notifications'
      },
      pushNotifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'push_notifications'
      },
      notifyOnNewAnnouncement: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'notify_on_new_announcement'
      },
      notifyOnUpdate: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'notify_on_update'
      },
      notifyOnComment: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'notify_on_comment'
      },
      notifyOnReaction: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'notify_on_reaction'
      },
      priorityFilter: {
        type: Sequelize.ENUM('all', 'urgent', 'high', 'urgent_high'),
        allowNull: false,
        defaultValue: 'all',
        field: 'priority_filter'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('announcement_versions', ['announcement_id'], {
      name: 'idx_announcement_versions_announcement_id'
    });
    await queryInterface.addIndex('announcement_versions', ['changed_by'], {
      name: 'idx_announcement_versions_changed_by'
    });
    await queryInterface.addIndex('announcement_approvals', ['announcement_id'], {
      name: 'idx_announcement_approvals_announcement_id'
    });
    await queryInterface.addIndex('announcement_approvals', ['approved_by'], {
      name: 'idx_announcement_approvals_approved_by'
    });
    await queryInterface.addIndex('announcement_approvals', ['status'], {
      name: 'idx_announcement_approvals_status'
    });
    await queryInterface.addIndex('announcement_category_mappings', ['announcement_id', 'category_id'], {
      unique: true,
      name: 'unique_announcement_category'
    });
    await queryInterface.addIndex('announcement_tag_mappings', ['announcement_id', 'tag_id'], {
      unique: true,
      name: 'unique_announcement_tag'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('announcement_notification_preferences');
    await queryInterface.dropTable('announcement_tag_mappings');
    await queryInterface.dropTable('announcement_category_mappings');
    await queryInterface.dropTable('announcement_tags');
    await queryInterface.dropTable('announcement_categories');
    await queryInterface.dropTable('announcement_approvals');
    await queryInterface.dropTable('announcement_versions');
    
    // Remove columns from announcements table
    await queryInterface.removeColumn('announcements', 'requiresApproval');
    await queryInterface.removeColumn('announcements', 'approvalStatus');
  }
};


module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    contentHtml: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'contentHtml'
    },
    requiresAcknowledgment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requiresAcknowledgment'
    },
    acknowledgmentDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'acknowledgmentDeadline'
    },
    priority: {
      type: DataTypes.ENUM('urgent', 'high', 'normal', 'low'),
      allowNull: false,
      defaultValue: 'normal'
    },
    status: {
      type: DataTypes.ENUM('active', 'scheduled', 'expired', 'draft'),
      allowNull: false,
      defaultValue: 'active'
    },
    targetAudience: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'all',
      field: 'targetAudience'
    },
    publishDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'publishDate'
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiryDate'
    },
    views: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    createdBy: {
      type: DataTypes.CHAR(36).BINARY,
      allowNull: true,
      field: 'createdBy',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    announcementType: {
      type: DataTypes.ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update'),
      allowNull: false,
      defaultValue: 'general',
      field: 'announcementType'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isPinned'
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      field: 'approvalStatus'
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requiresApproval'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updatedAt'
    }
  }, {
    tableName: 'announcements',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  Announcement.associate = (models) => {
    // Announcement belongs to User (creator)
    Announcement.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    // Announcement has many ReadReceipts
    Announcement.hasMany(models.ReadReceipt, {
      foreignKey: 'announcementId',
      as: 'readReceipts'
    });
    // Announcement has many Attachments
    Announcement.hasMany(models.AnnouncementAttachment, {
      foreignKey: 'announcementId',
      as: 'attachments'
    });
    // Announcement has many Comments
    Announcement.hasMany(models.AnnouncementComment, {
      foreignKey: 'announcementId',
      as: 'comments'
    });
    // Announcement has many Reactions
    Announcement.hasMany(models.AnnouncementReaction, {
      foreignKey: 'announcementId',
      as: 'reactions'
    });
    // Announcement has many Favorites
    Announcement.hasMany(models.AnnouncementFavorite, {
      foreignKey: 'announcementId',
      as: 'favorites'
    });
    // Announcement has many Versions
    Announcement.hasMany(models.AnnouncementVersion, {
      foreignKey: 'announcementId',
      as: 'versions'
    });
    // Announcement has many Approvals
    Announcement.hasMany(models.AnnouncementApproval, {
      foreignKey: 'announcementId',
      as: 'approvals'
    });
    // Announcement has many Category Mappings
    Announcement.hasMany(models.AnnouncementCategoryMapping, {
      foreignKey: 'announcementId',
      as: 'categoryMappings'
    });
    // Announcement has many Tag Mappings
    Announcement.hasMany(models.AnnouncementTagMapping, {
      foreignKey: 'announcementId',
      as: 'tagMappings'
    });
  };

  return Announcement;
}; 
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementVersion extends Model {
    static associate(models) {
      // Version belongs to an Announcement
      AnnouncementVersion.belongsTo(models.Announcement, {
        foreignKey: 'announcementId',
        as: 'announcement'
      });
      
      // Version belongs to a User (who made the change)
      AnnouncementVersion.belongsTo(models.User, {
        foreignKey: 'changedBy',
        as: 'changedByUser'
      });
    }
  }
  
  AnnouncementVersion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'announcement_id',
      references: {
        model: 'announcements',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'version_number'
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
      field: 'content_html'
    },
    priority: {
      type: DataTypes.ENUM('urgent', 'high', 'normal', 'low'),
      allowNull: false
    },
    announcementType: {
      type: DataTypes.ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update'),
      allowNull: false,
      field: 'announcement_type'
    },
    targetAudience: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'target_audience'
    },
    changeDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'change_description'
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'changed_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AnnouncementVersion',
    tableName: 'announcement_versions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['announcement_id']
      },
      {
        fields: ['changed_by']
      },
      {
        fields: ['created_at']
      }
    ]
  });
  
  return AnnouncementVersion;
};


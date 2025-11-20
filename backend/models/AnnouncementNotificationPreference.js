'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementNotificationPreference extends Model {
    static associate(models) {
      // Preference belongs to a User
      AnnouncementNotificationPreference.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  
  AnnouncementNotificationPreference.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.UUID,
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
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'email_notifications'
    },
    pushNotifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'push_notifications'
    },
    notifyOnNewAnnouncement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'notify_on_new_announcement'
    },
    notifyOnUpdate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'notify_on_update'
    },
    notifyOnComment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'notify_on_comment'
    },
    notifyOnReaction: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'notify_on_reaction'
    },
    priorityFilter: {
      type: DataTypes.ENUM('all', 'urgent', 'high', 'urgent_high'),
      allowNull: false,
      defaultValue: 'all',
      field: 'priority_filter'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AnnouncementNotificationPreference',
    tableName: 'announcement_notification_preferences',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      }
    ]
  });
  
  return AnnouncementNotificationPreference;
};


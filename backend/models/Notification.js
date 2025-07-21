const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('Info', 'Success', 'Warning', 'Error', 'Alert'),
      defaultValue: 'Info',
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('Project', 'Update', 'Validation', 'System', 'Reminder', 'Alert'),
      allowNull: false
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      defaultValue: 'Medium',
      allowNull: false
    },
    actionUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    actionText: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Active', 'Archived', 'Deleted'),
      defaultValue: 'Active',
      allowNull: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      {
        name: 'idx_notifications_user_id',
        fields: ['userId']
      },
      {
        name: 'idx_notifications_type',
        fields: ['type']
      },
      {
        name: 'idx_notifications_category',
        fields: ['category']
      },
      {
        name: 'idx_notifications_is_read',
        fields: ['isRead']
      },
      {
        name: 'idx_notifications_priority',
        fields: ['priority']
      },
      {
        name: 'idx_notifications_created_at',
        fields: ['createdAt']
      },
      {
        name: 'idx_notifications_user_read',
        fields: ['userId', 'isRead']
      },
      {
        name: 'idx_notifications_user_category',
        fields: ['userId', 'category']
      },
      {
        name: 'idx_notifications_entity_type_id',
        fields: ['entityType', 'entityId']
      }
    ]
  });

  Notification.associate = (models) => {
    // Notification belongs to User
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Notification;
}; 
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    level: {
      type: DataTypes.ENUM('Info', 'Warning', 'Error', 'Critical'),
      defaultValue: 'Info',
      allowNull: false
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Success', 'Failed', 'Pending'),
      defaultValue: 'Success',
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'activity_logs',
    timestamps: true,
    indexes: [
      {
        name: 'idx_activity_logs_user_id',
        fields: ['userId']
      },
      {
        name: 'idx_activity_logs_action',
        fields: ['action']
      },
      {
        name: 'idx_activity_logs_entity_type_id',
        fields: ['entityType', 'entityId']
      },
      {
        name: 'idx_activity_logs_level',
        fields: ['level']
      },
      {
        name: 'idx_activity_logs_module',
        fields: ['module']
      },
      {
        name: 'idx_activity_logs_created_at',
        fields: ['createdAt']
      },
      {
        name: 'idx_activity_logs_user_action',
        fields: ['userId', 'action']
      },
      {
        name: 'idx_activity_logs_user_date',
        fields: ['userId', 'createdAt']
      }
    ]
  });

  ActivityLog.associate = (models) => {
    // ActivityLog belongs to User
    ActivityLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return ActivityLog;
}; 
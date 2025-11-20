const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'file', 'system'),
      allowNull: false,
      defaultValue: 'text'
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    reactions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Stores reactions as { emoji: [userId1, userId2, ...] }'
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional link to a project for project-aware messaging'
    }
  }, {
    tableName: 'messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['senderId', 'recipientId']
      },
      {
        fields: ['recipientId', 'isRead']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['projectId']
      }
    ]
  });

  Message.associate = (models) => {
    Message.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender'
    });
    
    Message.belongsTo(models.User, {
      foreignKey: 'recipientId',
      as: 'recipient'
    });

    // Message can belong to a Project (optional)
    Message.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });
  };

  return Message;
};


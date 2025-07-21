const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Communication = sequelize.define('Communication', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('report', 'feedback', 'request', 'alert', 'meeting', 'general'),
      allowNull: false,
      defaultValue: 'general'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    type: {
      type: DataTypes.ENUM('incoming', 'outgoing'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'delivered', 'read', 'responded', 'archived'),
      allowNull: false,
      defaultValue: 'draft'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isImportant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isUrgent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    requestAcknowledgment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    parentMessageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Communications',
        key: 'id'
      }
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'communications',
    timestamps: true,
    paranoid: true
  });

  Communication.associate = (models) => {
    Communication.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender'
    });
    
    Communication.belongsTo(models.User, {
      foreignKey: 'recipientId',
      as: 'recipient'
    });
    
    Communication.belongsTo(Communication, {
      foreignKey: 'parentMessageId',
      as: 'parentMessage'
    });
    
    Communication.hasMany(Communication, {
      foreignKey: 'parentMessageId',
      as: 'replies'
    });
  };

  return Communication;
}; 
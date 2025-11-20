'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserPushSubscription extends Model {
    static associate(models) {
      UserPushSubscription.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  
  UserPushSubscription.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.CHAR(36).BINARY,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    p256dh: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    auth: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'UserPushSubscription',
    tableName: 'user_push_subscriptions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['userId'] },
      { unique: true, fields: ['userId', 'endpoint'], name: 'unique_user_endpoint' }
    ]
  });
  
  return UserPushSubscription;
};


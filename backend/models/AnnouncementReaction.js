'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementReaction extends Model {
    static associate(models) {
      // Reaction belongs to an Announcement
      AnnouncementReaction.belongsTo(models.Announcement, {
        foreignKey: 'announcementId',
        as: 'announcement'
      });
      
      // Reaction belongs to a User
      AnnouncementReaction.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  
  AnnouncementReaction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'announcements',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    reactionType: {
      type: DataTypes.ENUM('helpful', 'important', 'acknowledged', 'urgent'),
      allowNull: false,
      defaultValue: 'helpful'
    }
  }, {
    sequelize,
    modelName: 'AnnouncementReaction',
    tableName: 'announcement_reactions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['announcementId']
      },
      {
        fields: ['userId']
      },
      {
        unique: true,
        fields: ['announcementId', 'userId', 'reactionType'],
        name: 'unique_user_reaction_per_announcement'
      }
    ]
  });
  
  return AnnouncementReaction;
};


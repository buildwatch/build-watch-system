'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementFavorite extends Model {
    static associate(models) {
      // Favorite belongs to an Announcement
      AnnouncementFavorite.belongsTo(models.Announcement, {
        foreignKey: 'announcementId',
        as: 'announcement'
      });
      
      // Favorite belongs to a User
      AnnouncementFavorite.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  
  AnnouncementFavorite.init({
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
    }
  }, {
    sequelize,
    modelName: 'AnnouncementFavorite',
    tableName: 'announcement_favorites',
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
        fields: ['announcementId', 'userId'],
        name: 'unique_user_favorite_per_announcement'
      }
    ]
  });
  
  return AnnouncementFavorite;
};


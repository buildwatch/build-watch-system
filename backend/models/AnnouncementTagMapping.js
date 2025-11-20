'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementTagMapping extends Model {
    static associate(models) {
      // Mapping belongs to an Announcement
      AnnouncementTagMapping.belongsTo(models.Announcement, {
        foreignKey: 'announcementId',
        as: 'announcement'
      });
      
      // Mapping belongs to a Tag
      AnnouncementTagMapping.belongsTo(models.AnnouncementTag, {
        foreignKey: 'tagId',
        as: 'tag'
      });
    }
  }
  
  AnnouncementTagMapping.init({
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
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tag_id',
      references: {
        model: 'announcement_tags',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AnnouncementTagMapping',
    tableName: 'announcement_tag_mappings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['announcement_id', 'tag_id']
      },
      {
        fields: ['announcement_id']
      },
      {
        fields: ['tag_id']
      }
    ]
  });
  
  return AnnouncementTagMapping;
};


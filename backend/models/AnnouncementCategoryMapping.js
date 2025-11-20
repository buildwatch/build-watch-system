'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementCategoryMapping extends Model {
    static associate(models) {
      // Mapping belongs to an Announcement
      AnnouncementCategoryMapping.belongsTo(models.Announcement, {
        foreignKey: 'announcementId',
        as: 'announcement'
      });
      
      // Mapping belongs to a Category
      AnnouncementCategoryMapping.belongsTo(models.AnnouncementCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
    }
  }
  
  AnnouncementCategoryMapping.init({
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
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
      references: {
        model: 'announcement_categories',
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
    modelName: 'AnnouncementCategoryMapping',
    tableName: 'announcement_category_mappings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['announcement_id', 'category_id']
      },
      {
        fields: ['announcement_id']
      },
      {
        fields: ['category_id']
      }
    ]
  });
  
  return AnnouncementCategoryMapping;
};


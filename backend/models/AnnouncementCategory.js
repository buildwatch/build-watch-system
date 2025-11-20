'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementCategory extends Model {
    static associate(models) {
      // Category belongs to a User (creator)
      AnnouncementCategory.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
      // Category has many Category Mappings
      AnnouncementCategory.hasMany(models.AnnouncementCategoryMapping, {
        foreignKey: 'categoryId',
        as: 'categoryMappings'
      });
    }
  }
  
  AnnouncementCategory.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7), // Hex color code
      allowNull: true,
      defaultValue: '#3B82F6'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
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
    modelName: 'AnnouncementCategory',
    tableName: 'announcement_categories',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['name']
      }
    ]
  });
  
  return AnnouncementCategory;
};


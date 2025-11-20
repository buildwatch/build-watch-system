'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementTag extends Model {
    static associate(models) {
      // Tag belongs to a User (creator)
      AnnouncementTag.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
      // Tag has many Tag Mappings
      AnnouncementTag.hasMany(models.AnnouncementTagMapping, {
        foreignKey: 'tagId',
        as: 'tagMappings'
      });
    }
  }
  
  AnnouncementTag.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    color: {
      type: DataTypes.STRING(7), // Hex color code
      allowNull: true,
      defaultValue: '#6B7280'
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
    modelName: 'AnnouncementTag',
    tableName: 'announcement_tags',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['name']
      }
    ]
  });
  
  return AnnouncementTag;
};


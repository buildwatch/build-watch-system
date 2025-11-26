'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SharedFolder extends Model {
    static associate(models) {
      // Associate with User (creator)
      SharedFolder.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdBy'
      });
      
      // Associate with SharedDocuments
      SharedFolder.hasMany(models.SharedDocument, {
        foreignKey: 'folderId',
        as: 'documents'
      });
    }
  }
  
  SharedFolder.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'documents' // 'documents', 'photos', 'videos'
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'SharedFolder',
    tableName: 'shared_folders',
    timestamps: true,
    underscored: true
  });
  
  return SharedFolder;
};


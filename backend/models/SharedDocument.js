'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SharedDocument extends Model {
    static associate(models) {
      // Associate with User (uploader)
      SharedDocument.belongsTo(models.User, {
        foreignKey: 'uploadedById',
        as: 'uploadedBy'
      });
      
      // Associate with SharedFolder (optional)
      SharedDocument.belongsTo(models.SharedFolder, {
        foreignKey: 'folderId',
        as: 'folder',
        allowNull: true
      });
    }
  }
  
  SharedDocument.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'documents'
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    uploadedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    folderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'shared_folders',
        key: 'id'
      }
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'SharedDocument',
    tableName: 'shared_documents',
    timestamps: true,
    underscored: true
  });
  
  return SharedDocument;
};


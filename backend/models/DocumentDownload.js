'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentDownload extends Model {
    static associate(models) {
      // Associate with User (downloader)
      DocumentDownload.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'downloadedBy'
      });
      
      // Associate with SharedDocument (file that was downloaded)
      DocumentDownload.belongsTo(models.SharedDocument, {
        foreignKey: 'fileId',
        as: 'file',
        allowNull: true
      });
    }
  }
  
  DocumentDownload.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fileId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    downloadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'DocumentDownload',
    tableName: 'document_downloads',
    timestamps: true,
    underscored: true
  });
  
  return DocumentDownload;
};


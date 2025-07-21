'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProjectUpdateFile extends Model {
    static associate(models) {
      // Define associations here
      ProjectUpdateFile.belongsTo(models.ProjectUpdate, {
        foreignKey: 'projectUpdateId',
        as: 'projectUpdate'
      });
      
      ProjectUpdateFile.belongsTo(models.User, {
        foreignKey: 'uploadedBy',
        as: 'uploader'
      });
    }
  }
  
  ProjectUpdateFile.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    projectUpdateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'project_updates',
        key: 'id'
      }
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileType: {
      type: DataTypes.ENUM('photo', 'video', 'document', 'other'),
      allowNull: false,
      defaultValue: 'document'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'ProjectUpdateFile',
    tableName: 'project_update_files',
    timestamps: true,
    indexes: [
      {
        fields: ['projectUpdateId']
      },
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['fileType']
      }
    ]
  });

  return ProjectUpdateFile;
}; 
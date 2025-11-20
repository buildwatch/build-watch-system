module.exports = (sequelize, DataTypes) => {
  const AnnouncementAttachment = sequelize.define('AnnouncementAttachment', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    announcementId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'announcementId',
      references: {
        model: 'announcements',
        key: 'id'
      }
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'fileName'
    },
    originalFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'originalFileName'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'filePath'
    },
    fileSize: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'fileSize'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mimeType'
    },
    uploadedBy: {
      type: DataTypes.CHAR(36).BINARY,
      allowNull: true,
      field: 'uploadedBy',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updatedAt'
    }
  }, {
    tableName: 'announcement_attachments',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  AnnouncementAttachment.associate = (models) => {
    AnnouncementAttachment.belongsTo(models.Announcement, {
      foreignKey: 'announcementId',
      as: 'announcement'
    });
    AnnouncementAttachment.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
  };

  return AnnouncementAttachment;
};


module.exports = (sequelize, DataTypes) => {
  const ReadReceipt = sequelize.define('ReadReceipt', {
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
    userId: {
      type: DataTypes.CHAR(36).BINARY,
      allowNull: false,
      field: 'userId',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'readAt'
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'acknowledgedAt'
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
    tableName: 'read_receipts',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['announcementId', 'userId'],
        name: 'idx_read_receipts_unique'
      },
      {
        fields: ['announcementId'],
        name: 'idx_read_receipts_announcementId'
      },
      {
        fields: ['userId'],
        name: 'idx_read_receipts_userId'
      }
    ]
  });

  ReadReceipt.associate = (models) => {
    ReadReceipt.belongsTo(models.Announcement, {
      foreignKey: 'announcementId',
      as: 'announcement'
    });
    ReadReceipt.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return ReadReceipt;
};


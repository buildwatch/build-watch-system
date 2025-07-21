module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('urgent', 'high', 'normal', 'low'),
      allowNull: false,
      defaultValue: 'normal'
    },
    status: {
      type: DataTypes.ENUM('active', 'scheduled', 'expired', 'draft'),
      allowNull: false,
      defaultValue: 'active'
    },
    targetAudience: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'all',
      field: 'targetAudience'
    },
    publishDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'publishDate'
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiryDate'
    },
    views: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
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
    tableName: 'announcements',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  return Announcement;
}; 
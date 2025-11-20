module.exports = (sequelize, DataTypes) => {
  const AnnouncementTemplate = sequelize.define('AnnouncementTemplate', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    contentHtml: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'contentHtml'
    },
    priority: {
      type: DataTypes.ENUM('urgent', 'high', 'normal', 'low'),
      allowNull: false,
      defaultValue: 'normal'
    },
    announcementType: {
      type: DataTypes.ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update'),
      allowNull: false,
      defaultValue: 'general',
      field: 'announcementType'
    },
    targetAudience: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'all',
      field: 'targetAudience'
    },
    requiresAcknowledgment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requiresAcknowledgment'
    },
    isSystemTemplate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isSystemTemplate'
    },
    createdBy: {
      type: DataTypes.CHAR(36).BINARY,
      allowNull: true,
      field: 'createdBy',
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
    tableName: 'announcement_templates',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  AnnouncementTemplate.associate = (models) => {
    // Template belongs to User (creator)
    AnnouncementTemplate.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return AnnouncementTemplate;
};


'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementComment extends Model {
    static associate(models) {
      // Comment belongs to an Announcement
      AnnouncementComment.belongsTo(models.Announcement, {
        foreignKey: 'announcementId',
        as: 'announcement'
      });
      
      // Comment belongs to a User (author)
      AnnouncementComment.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'author'
      });
      
      // Comment can have a parent comment (for threaded comments)
      AnnouncementComment.belongsTo(models.AnnouncementComment, {
        foreignKey: 'parentCommentId',
        as: 'parentComment'
      });
      
      // Comment can have replies
      AnnouncementComment.hasMany(models.AnnouncementComment, {
        foreignKey: 'parentCommentId',
        as: 'replies'
      });
    }
  }
  
  AnnouncementComment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'announcements',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    parentCommentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'announcement_comments',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AnnouncementComment',
    tableName: 'announcement_comments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['announcementId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['parentCommentId']
      },
      {
        fields: ['createdAt']
      }
    ]
  });
  
  return AnnouncementComment;
};


'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnnouncementApproval extends Model {
    static associate(models) {
      // Approval belongs to an Announcement
      AnnouncementApproval.belongsTo(models.Announcement, {
        foreignKey: 'announcementId',
        as: 'announcement'
      });
      
      // Approval belongs to a User (approver)
      AnnouncementApproval.belongsTo(models.User, {
        foreignKey: 'approvedBy',
        as: 'approver'
      });
    }
  }
  
  AnnouncementApproval.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'announcement_id',
      references: {
        model: 'announcements',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    approvalLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'approval_level'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'approved_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'approved_at'
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
    modelName: 'AnnouncementApproval',
    tableName: 'announcement_approvals',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['announcement_id']
      },
      {
        fields: ['approved_by']
      },
      {
        fields: ['status']
      }
    ]
  });
  
  return AnnouncementApproval;
};


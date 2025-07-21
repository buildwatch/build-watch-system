const express = require('express');
const { Notification, User, Project, ProjectUpdate, ActivityLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      type,
      isRead,
      priority
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      userId: req.user.id,
      status: 'Active'
    };

    // Add filters
    if (category) whereClause.category = category;
    if (type) whereClause.type = type;
    if (isRead !== undefined) whereClause.isRead = isRead === 'true';
    if (priority) whereClause.priority = priority;

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// Get notification count (for Topbar badge)
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const { isRead = false } = req.query;

    const count = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: isRead === 'true',
        status: 'Active'
      }
    });

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification count'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.update({
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          userId: req.user.id,
          isRead: false,
          status: 'Active'
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.update({
      status: 'Deleted'
    });

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

// Get recent activity notifications (for real-time updates)
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent activity logs that might be relevant to the user
    const recentActivity = await ActivityLog.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { userId: req.user.id },
          { entityType: 'Project' },
          { entityType: 'ProjectUpdate' },
          { action: { [require('sequelize').Op.in]: ['PROJECT_CREATED', 'PROJECT_UPDATED', 'VALIDATION_REQUIRED', 'APPROVAL_REQUIRED'] } }
        ]
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Convert activity logs to notification format
    const activityNotifications = recentActivity.map(activity => ({
      id: activity.id,
      title: getActivityTitle(activity.action),
      message: activity.details,
      type: getActivityType(activity.action),
      category: getActivityCategory(activity.action),
      entityType: activity.entityType,
      entityId: activity.entityId,
      createdAt: activity.createdAt,
      user: activity.user
    }));

    res.json({
      success: true,
      notifications: activityNotifications
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
});

// Helper functions for activity conversion
function getActivityTitle(action) {
  const titles = {
    'PROJECT_CREATED': 'New Project Created',
    'PROJECT_UPDATED': 'Project Updated',
    'VALIDATION_REQUIRED': 'Validation Required',
    'APPROVAL_REQUIRED': 'Approval Required',
    'LOGIN': 'User Login',
    'LOGOUT': 'User Logout',
    'UPDATE_SUBMITTED': 'Update Submitted',
    'DOCUMENT_UPLOADED': 'Document Uploaded'
  };
  return titles[action] || 'Activity Update';
}

function getActivityType(action) {
  const types = {
    'PROJECT_CREATED': 'Success',
    'PROJECT_UPDATED': 'Info',
    'VALIDATION_REQUIRED': 'Warning',
    'APPROVAL_REQUIRED': 'Alert',
    'LOGIN': 'Info',
    'LOGOUT': 'Info',
    'UPDATE_SUBMITTED': 'Success',
    'DOCUMENT_UPLOADED': 'Success'
  };
  return types[action] || 'Info';
}

function getActivityCategory(action) {
  const categories = {
    'PROJECT_CREATED': 'Project',
    'PROJECT_UPDATED': 'Project',
    'VALIDATION_REQUIRED': 'Validation',
    'APPROVAL_REQUIRED': 'Validation',
    'LOGIN': 'System',
    'LOGOUT': 'System',
    'UPDATE_SUBMITTED': 'Update',
    'DOCUMENT_UPLOADED': 'Update'
  };
  return categories[action] || 'System';
}

module.exports = router; 
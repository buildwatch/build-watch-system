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

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
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

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
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

    await notification.destroy();

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

// Create notification for user
async function createNotification(userId, title, message, type = 'Info', category = 'System', entityType = null, entityId = null, priority = 'Medium', options = {}) {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      category,
      entityType,
      entityId,
      priority,
      isRead: false,
      status: 'Active',
      // New enhanced fields
      profilePic: options.profilePic || null,
      module: options.module || null,
      targetId: options.targetId || null,
      actionUrl: options.actionUrl || null
    });
    
    console.log(`📧 Enhanced notification created for user ${userId}: ${title}`);
    console.log(`   📷 Profile: ${options.profilePic || 'None'}`);
    console.log(`   🎯 Module: ${options.module || 'None'}`);
    console.log(`   🏷️ Target: ${options.targetId || 'None'}`);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Create notification for multiple users (for system-wide notifications)
async function createNotificationForUsers(userIds, title, message, type = 'Info', category = 'System', entityType = null, entityId = null, priority = 'Medium') {
  try {
    const notifications = [];
    for (const userId of userIds) {
      const notification = await createNotification(userId, title, message, type, category, entityType, entityId, priority);
      if (notification) {
        notifications.push(notification);
      }
    }
    return notifications;
  } catch (error) {
    console.error('Error creating notifications for users:', error);
    return [];
  }
}

// Create notification for users by role
async function createNotificationForRole(role, title, message, type = 'Info', category = 'System', entityType = null, entityId = null, priority = 'Medium') {
  try {
    const users = await User.findAll({
      where: { 
        role: role,
        status: 'active'
      },
      attributes: ['id']
    });
    
    const userIds = users.map(user => user.id);
    return await createNotificationForUsers(userIds, title, message, type, category, entityType, entityId, priority);
  } catch (error) {
    console.error('Error creating notifications for role:', error);
    return [];
  }
}

// Helper functions for activity conversion
function getActivityTitle(action) {
  const titles = {
    'CREATE_USER': 'New User Account Created',
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
    'CREATE_USER': 'Success',
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
    'CREATE_USER': 'User Management',
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

// Create notification
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, message, submissionId, priority = 'medium' } = req.body;
    
    // Create notification using the existing function
    const notification = await createNotification(
      req.user.id,
      title,
      message,
      type,
      'Submission',
      'MilestoneSubmission',
      submissionId,
      priority
    );

    res.json({
      success: true,
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

// Create notification for specific user
router.post('/create-for-user', authenticateToken, async (req, res) => {
  try {
    const { userId, type, title, message, category = 'System', entityType, entityId, priority = 'medium' } = req.body;
    
    // Create notification using the existing function
    const notification = await createNotification(
      userId,
      title,
      message,
      type,
      category,
      entityType,
      entityId,
      priority
    );

    res.json({
      success: true,
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create user notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

// Create notification for LGU-IU IOO users when EIU submits milestone
router.post('/create-lgu-notification', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 Received LGU notification request from user:', req.user.id, req.user.name);
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      type, 
      category, 
      priority, 
      title, 
      message, 
      actionUrl, 
      actionText, 
      metadata, 
      targetRole 
    } = req.body;
    
    // Get the project ID from metadata to find the assigned implementing office user
    const projectId = metadata?.projectId;
    
    if (!projectId) {
      console.error('❌ No project ID provided in metadata');
      return res.status(400).json({
        success: false,
        error: 'Project ID is required in metadata to determine target user'
      });
    }
    
    // Find the project and get the assigned implementing office user
    const { Project } = require('../models');
    const project = await Project.findByPk(projectId, {
      include: [{
        model: User,
        as: 'implementingOffice',
        attributes: ['id', 'name', 'fullName', 'role', 'status']
      }]
    });
    
    if (!project) {
      console.error(`❌ Project not found with ID: ${projectId}`);
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    if (!project.implementingOffice) {
      console.error(`❌ No implementing office user assigned to project: ${projectId}`);
      return res.status(400).json({
        success: false,
        error: 'No implementing office user assigned to this project'
      });
    }
    
    // Verify the implementing office user is active
    if (project.implementingOffice.status !== 'active') {
      console.error(`❌ Assigned implementing office user is not active: ${project.implementingOffice.id}`);
      return res.status(400).json({
        success: false,
        error: 'Assigned implementing office user is not active'
      });
    }
    
    console.log(`🎯 Target user for notifications:`, {
      id: project.implementingOffice.id,
      name: project.implementingOffice.name || project.implementingOffice.fullName,
      role: project.implementingOffice.role,
      projectId: projectId,
      projectName: project.name
    });
    
    // Create notification only for the assigned implementing office user
    try {
      console.log(`📝 Creating notification for assigned user ${project.implementingOffice.name || project.implementingOffice.fullName} (ID: ${project.implementingOffice.id})`);
      
      const notification = await Notification.create({
        userId: project.implementingOffice.id,
        title,
        message,
        type,
        category,
        priority,
        entityType: 'MilestoneSubmission',
        entityId: metadata?.milestoneId || null,
        isRead: false,
        status: 'Active',
        actionUrl: actionUrl || null,
        actionText: actionText || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Notification created for assigned user ${project.implementingOffice.name || project.implementingOffice.fullName} (ID: ${notification.id})`);
      
      res.json({
        success: true,
        message: `Notification created successfully for assigned implementing office user`,
        notification: {
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt
        },
        targetUser: {
          id: project.implementingOffice.id,
          name: project.implementingOffice.name || project.implementingOffice.fullName,
          role: project.implementingOffice.role
        }
      });
      
    } catch (notificationError) {
      console.error(`❌ Failed to create notification for assigned user:`, notificationError);
      res.status(500).json({
        success: false,
        error: 'Failed to create notification for assigned user',
        details: notificationError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Create LGU notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create LGU notifications',
      details: error.message
    });
  }
});

// Test endpoint to manually create a notification (for debugging)
router.post('/test-lgu-notification', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Test LGU notification endpoint called by user:', req.user.id, req.user.name);
    
    // First, let's see ALL users in the database
    const allUsers = await User.findAll({ 
      attributes: ['id', 'name', 'fullName', 'role', 'status'] 
    });
    console.log('👥 ALL USERS in database:', allUsers.map(u => ({ 
      id: u.id, 
      name: u.name || u.fullName, 
      role: u.role, 
      status: u.status 
    })));
    
         // Try different role variations that might exist
     const possibleRoles = [
       'LGU-IU',               // Primary role format found in database
       'lgu-iu',               // Lowercase variation
       'iu-implementing-office',
       'implementing-office', 
       'iu',
       'municipal-engineer',
       'admin'
     ];
    
    let lguUsers = [];
    for (const role of possibleRoles) {
      const users = await User.findAll({
        where: { 
          role: role,
          status: 'active'
        },
        attributes: ['id', 'name', 'fullName', 'role', 'status']
      });
      
      if (users.length > 0) {
        console.log(`✅ Found ${users.length} users with role '${role}':`, users.map(u => ({ 
          id: u.id, 
          name: u.name || u.fullName 
        })));
        lguUsers = users;
        break;
      } else {
        console.log(`❌ No users found with role '${role}'`);
      }
    }
    
    if (lguUsers.length === 0) {
      // If no specific LGU users found, let's try to find any admin or similar user
      const adminUsers = await User.findAll({
        where: { 
          status: 'active'
        },
        attributes: ['id', 'name', 'fullName', 'role', 'status']
      });
      
      // Filter for any user that might be an admin or implementing office user
      lguUsers = adminUsers.filter(user => 
        user.role && (
          user.role.includes('admin') || 
          user.role.includes('implementing') ||
          user.role.includes('iu') ||
          user.role.includes('municipal')
        )
      );
      
      console.log(`🔍 Found ${lguUsers.length} potential target users:`, lguUsers.map(u => ({ 
        id: u.id, 
        name: u.name || u.fullName,
        role: u.role 
      })));
    }
    
    if (lguUsers.length === 0) {
      return res.json({
        success: false,
        message: 'No suitable target users found for notifications',
        debug: {
          allUsers: allUsers.map(u => ({ 
            id: u.id, 
            name: u.name || u.fullName, 
            role: u.role, 
            status: u.status 
          })),
          searchedRoles: possibleRoles,
          suggestion: 'You may need to create a user with role "iu-implementing-office" or similar, or update an existing user\'s role'
        }
      });
    }
    
    // Create a test notification for the first suitable user
    const testUser = lguUsers[0];
    console.log(`📝 Creating test notification for user: ${testUser.name || testUser.fullName} (Role: ${testUser.role})`);
    
    const notification = await Notification.create({
      userId: testUser.id,
      title: 'Test Notification - Milestone Submission',
      message: 'This is a test notification to verify the LGU-IU notification system is working properly.',
      type: 'Info',
      category: 'Project',
      priority: 'Medium',
      entityType: 'Test',
      entityId: null,
      isRead: false,
      status: 'Active',
      actionUrl: '/dashboard/iu-implementing-office/modules/progress-timeline',
      actionText: 'Test Action',
      metadata: JSON.stringify({ 
        test: true,
        createdBy: req.user.name || req.user.fullName,
        timestamp: new Date().toISOString()
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Test notification created successfully:', {
      id: notification.id,
      userId: notification.userId,
      title: notification.title
    });
    
    res.json({
      success: true,
      message: `Test notification created for user ${testUser.name || testUser.fullName} (${testUser.role})`,
      notification: {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      },
      debug: {
        targetUser: {
          id: testUser.id,
          name: testUser.name || testUser.fullName,
          role: testUser.role
        },
        allSuitableUsers: lguUsers.map(u => ({ 
          id: u.id, 
          name: u.name || u.fullName, 
          role: u.role 
        }))
      }
    });

  } catch (error) {
    console.error('❌ Test LGU notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test notification',
      details: error.message,
      stack: error.stack
    });
  }
});

// Export notification creation functions
module.exports = {
  router,
  createNotification,
  createNotificationForUsers,
  createNotificationForRole
}; 
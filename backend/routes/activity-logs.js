const express = require('express');
const { ActivityLog, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is System Admin
const requireSystemAdmin = async (req, res, next) => {
  if (req.user.role !== 'SYS.AD') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. System Administrator privileges required.'
    });
  }
  next();
};

// Helper function to log admin activities
const logAdminActivity = async (userId, action, entityType, entityId, details, ipAddress, userAgent, level = 'Info', status = 'Success', module = null, metadata = null) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
      userAgent,
      level,
      status,
      module,
      metadata
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

// Get all activity logs with filtering and pagination
router.get('/', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Log the activity of viewing audit logs
    await logAdminActivity(
      req.user.id,
      'VIEW_AUDIT_LOG',
      'ActivityLog',
      null,
      'Viewed activity logs with filters',
      req.ip,
      req.get('User-Agent'),
      'Info',
      'Success',
      'Audit & Monitoring',
      { filters: req.query }
    );

    const {
      page = 1,
      limit = 20,
      search,
      action,
      entityType,
      level,
      module,
      status,
      dateFrom,
      dateTo,
      export: exportType
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;
    if (level) whereClause.level = level;
    if (module) whereClause.module = module;
    if (status) whereClause.status = status;
    
    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[require('sequelize').Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.createdAt[require('sequelize').Op.lte] = new Date(dateTo + ' 23:59:59');
    }

    // Search filter
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { details: { [require('sequelize').Op.like]: `%${search}%` } },
        { action: { [require('sequelize').Op.like]: `%${search}%` } },
        { entityType: { [require('sequelize').Op.like]: `%${search}%` } },
        { ipAddress: { [require('sequelize').Op.like]: `%${search}%` } },
        { module: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    // If exporting, get all records
    const queryLimit = exportType === 'csv' ? null : parseInt(limit);
    const queryOffset = exportType === 'csv' ? null : parseInt(offset);

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'email', 'role'],
          required: false
        }
      ],
      limit: queryLimit,
      offset: queryOffset,
      order: [['createdAt', 'DESC']]
    });

    // Format logs for response
    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      userName: log.user ? log.user.name || log.user.username : 'System',
      userId: log.userId,
      level: log.level,
      status: log.status,
      module: log.module,
      metadata: log.metadata,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }));

    // Handle CSV export
    if (exportType === 'csv') {
      // Log the export activity
      await logAdminActivity(
        req.user.id,
        'EXPORT_AUDIT_LOG',
        'ActivityLog',
        null,
        'Exported activity logs to CSV',
        req.ip,
        req.get('User-Agent'),
        'Info',
        'Success',
        'Audit & Monitoring'
      );

      const csvHeader = 'Timestamp,User,Action,Level,Status,Module,Entity,Details,IP Address\n';
      const csvData = formattedLogs.map(log => {
        const timestamp = new Date(log.createdAt).toLocaleString();
        const userName = log.userName || 'System';
        const action = log.action;
        const level = log.level || 'Info';
        const status = log.status || 'Success';
        const module = log.module || '-';
        const entity = log.entityType || '-';
        const details = (log.details || '').replace(/"/g, '""');
        const ipAddress = log.ipAddress || '-';
        
        return `"${timestamp}","${userName}","${action}","${level}","${status}","${module}","${entity}","${details}","${ipAddress}"`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-trail.csv"');
      return res.send(csvHeader + csvData);
    }

    res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get activity logs error:', error);
    
    // Log the error
    await logAdminActivity(
      req.user.id,
      'VIEW_AUDIT_LOG',
      'ActivityLog',
      null,
      'Failed to view activity logs',
      req.ip,
      req.get('User-Agent'),
      'Error',
      'Failed',
      'Audit & Monitoring',
      { error: error.message }
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
});

// Get activity logs summary/statistics
router.get('/summary', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Log the activity of viewing summary
    await logAdminActivity(
      req.user.id,
      'VIEW_AUDIT_SUMMARY',
      'ActivityLog',
      null,
      'Viewed activity logs summary',
      req.ip,
      req.get('User-Agent'),
      'Info',
      'Success',
      'Audit & Monitoring'
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's activities count
    const todayActivities = await ActivityLog.count({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      }
    });

    // Get failed logins count
    const failedLogins = await ActivityLog.count({
      where: {
        action: 'FAILED_LOGIN',
        createdAt: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      }
    });

    // Get active users (users who logged in today)
    const activeUsers = await ActivityLog.count({
      where: {
        action: 'LOGIN',
        createdAt: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      },
      distinct: true,
      col: 'userId'
    });

    // Get total activities
    const totalActivities = await ActivityLog.count();

    // Get activities by level
    const activitiesByLevel = await ActivityLog.findAll({
      attributes: [
        'level',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      },
      group: ['level']
    });

    // Get activities by module
    const activitiesByModule = await ActivityLog.findAll({
      attributes: [
        'module',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      },
      group: ['module']
    });

    res.json({
      success: true,
      summary: {
        totalActivities,
        todayActivities,
        failedLogins,
        activeUsers,
        activitiesByLevel: activitiesByLevel.reduce((acc, item) => {
          acc[item.level] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
        activitiesByModule: activitiesByModule.reduce((acc, item) => {
          acc[item.module || 'Unknown'] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get activity logs summary error:', error);
    
    // Log the error
    await logAdminActivity(
      req.user.id,
      'VIEW_AUDIT_SUMMARY',
      'ActivityLog',
      null,
      'Failed to view activity logs summary',
      req.ip,
      req.get('User-Agent'),
      'Error',
      'Failed',
      'Audit & Monitoring',
      { error: error.message }
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs summary'
    });
  }
});

// Get activity logs by user
router.get('/user/:userId', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Log the activity of viewing user logs
    await logAdminActivity(
      req.user.id,
      'VIEW_USER_LOGS',
      'User',
      userId,
      `Viewed activity logs for user ${userId}`,
      req.ip,
      req.get('User-Agent'),
      'Info',
      'Success',
      'Audit & Monitoring'
    );

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'email', 'role'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      userName: log.user ? log.user.name || log.user.username : 'System',
      userId: log.userId,
      level: log.level,
      status: log.status,
      module: log.module,
      metadata: log.metadata,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }));

    res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get user activity logs error:', error);
    
    // Log the error
    await logAdminActivity(
      req.user.id,
      'VIEW_USER_LOGS',
      'User',
      req.params.userId,
      'Failed to view user activity logs',
      req.ip,
      req.get('User-Agent'),
      'Error',
      'Failed',
      'Audit & Monitoring',
      { error: error.message }
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity logs'
    });
  }
});

// Get real-time activity feed (last 50 activities)
router.get('/realtime', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'email', 'role'],
          required: false
        }
      ],
      limit: 50,
      order: [['createdAt', 'DESC']]
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      userName: log.user ? log.user.name || log.user.username : 'System',
      userId: log.userId,
      level: log.level,
      status: log.status,
      module: log.module,
      metadata: log.metadata,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }));

    res.json({
      success: true,
      logs: formattedLogs
    });

  } catch (error) {
    console.error('Get real-time activity logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time activity logs'
    });
  }
});

// Export the logAdminActivity function for use in other routes
module.exports = { router, logAdminActivity }; 
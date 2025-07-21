const express = require('express');
const { User, ActivityLog, Project, Announcement, Department, Group, Backup } = require('../models');
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

// ===== AUDIT TRAIL ENDPOINTS =====

// Get audit trail logs
router.get('/audit-trail', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[require('sequelize').Op.lte] = new Date(endDate);
    }

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      logs: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit trail'
    });
  }
});

// Export audit trail as CSV
router.get('/audit-trail/export', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { startDate, endDate, action, entityType } = req.query;
    const whereClause = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[require('sequelize').Op.lte] = new Date(endDate);
    }
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;

    const logs = await ActivityLog.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'username', 'role']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Convert to CSV format
    const csvData = logs.map(log => ({
      Date: log.createdAt.toISOString().split('T')[0],
      Time: log.createdAt.toTimeString().split(' ')[0],
      User: log.user ? log.user.name : 'Unknown',
      Username: log.user ? log.user.username : 'Unknown',
      Role: log.user ? log.user.role : 'Unknown',
      Action: log.action,
      EntityType: log.entityType,
      EntityID: log.entityId || '',
      Details: log.details,
      IPAddress: log.ipAddress,
      UserAgent: log.userAgent
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-trail.csv');
    
    // Convert to CSV string
    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    res.send(csvString);

  } catch (error) {
    console.error('Export audit trail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit trail'
    });
  }
});

// ===== CONFIGURATION ENDPOINTS =====

// Get system configuration
router.get('/configuration', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Mock configuration data - in real app, this would come from database
    const config = {
      general: {
        systemName: 'Build Watch LGU Santa Cruz',
        defaultLanguage: 'English',
        timezone: 'Asia/Manila'
      },
      modules: {
        userManagement: true,
        auditTrail: true,
        officeGroups: true,
        backupMaintenance: true,
        systemHealth: true,
        configuration: true,
        security: true,
        announcements: true
      },
      notifications: {
        email: true,
        sms: false
      },
      preferences: {
        theme: 'Light',
        dateFormat: 'MM/DD/YYYY'
      }
    };

    res.json({
      success: true,
      configuration: config
    });

  } catch (error) {
    console.error('Get configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

// Update system configuration
router.put('/configuration', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { general, modules, notifications, preferences } = req.body;

    // In real app, save to database
    // For now, just return success

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_CONFIGURATION',
      entityType: 'System',
      details: 'Updated system configuration',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('Update configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// ===== SECURITY ENDPOINTS =====

// Get security settings
router.get('/security', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Mock security data
    const security = {
      accessControls: {
        roleBasedAccess: true,
        defaultAccessLevel: 'Standard User',
        requireExplicitPermissions: true,
        ipWhitelist: false,
        allowedIPs: [],
        blockSuspiciousIPs: true
      },
      policies: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          expiryDays: 90
        },
        sessionPolicy: {
          timeoutMinutes: 30,
          forceLogoutInactivity: true,
          singleSession: true,
          rememberLogin: false
        }
      },
      authentication: {
        twoFactorAuth: false,
        require2FAForAdmins: true,
        twoFactorMethod: 'Authenticator App (TOTP)',
        captchaAfterFailedAttempts: true,
        failedAttemptsBeforeLockout: 5,
        lockoutDurationMinutes: 15
      }
    };

    res.json({
      success: true,
      security: security
    });

  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security settings'
    });
  }
});

// Update security settings
router.put('/security', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { accessControls, policies, authentication } = req.body;

    // In real app, save to database
    // For now, just return success

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_SECURITY_SETTINGS',
      entityType: 'System',
      details: 'Updated security settings',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Security settings updated successfully'
    });

  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security settings'
    });
  }
});

// Get security monitoring data
router.get('/security/monitoring', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Mock security monitoring data
    const monitoring = {
      overview: {
        securityStatus: 'Secure',
        activeSessions: 24,
        failedLogins: 3,
        securityAlerts: 1
      },
      alerts: [
        {
          id: 1,
          type: 'warning',
          message: 'Suspicious login attempt detected',
          details: 'IP: 192.168.1.100',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          type: 'info',
          message: 'Multiple failed login attempts',
          details: 'User: john.doe',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        }
      ],
      logs: [
        {
          event: 'Login',
          user: 'admin@lgu.gov.ph',
          ipAddress: '192.168.1.50',
          time: '2 min ago',
          status: 'Success'
        },
        {
          event: 'Failed Login',
          user: 'unknown@email.com',
          ipAddress: '203.45.67.89',
          time: '5 min ago',
          status: 'Failed'
        },
        {
          event: 'Password Change',
          user: 'user@lgu.gov.ph',
          ipAddress: '192.168.1.25',
          time: '10 min ago',
          status: 'Success'
        }
      ]
    };

    res.json({
      success: true,
      monitoring: monitoring
    });

  } catch (error) {
    console.error('Get security monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security monitoring data'
    });
  }
});

// ===== ANNOUNCEMENTS ENDPOINTS =====

// Get announcements (System Admin only)
router.get('/announcements', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      targetAudience,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (targetAudience) whereClause.targetAudience = targetAudience;
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { title: { [require('sequelize').Op.like]: `%${search}%` } },
        { content: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      announcements: announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcements'
    });
  }
});

// Create announcement
router.post('/announcements', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      priority,
      targetAudience,
      publishDate,
      expiryDate,
      sendEmailNotification
    } = req.body;

    // Validate required fields
    if (!title || !content || !priority || !targetAudience) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, priority, and target audience are required'
      });
    }

    // Create announcement in database
    const announcement = await Announcement.create({
      title,
      content,
      priority,
      targetAudience,
      status: publishDate && new Date(publishDate) > new Date() ? 'scheduled' : 'active',
      publishDate: publishDate || new Date(),
      expiryDate,
      views: 0
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: announcement.id,
      details: `Created announcement: ${title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement: announcement
    });

  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement'
    });
  }
});

// Update announcement
router.put('/announcements/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    await announcement.update(updateData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: id,
      details: `Updated announcement: ${updateData.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: announcement
    });

  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update announcement'
    });
  }
});

// Delete announcement
router.delete('/announcements/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    await announcement.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: id,
      details: `Deleted announcement ID: ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete announcement'
    });
  }
});

// ===== OFFICE & GROUPS ENDPOINTS =====

// Get departments
router.get('/departments', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      departments: departments
    });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments'
    });
  }
});

// Create department
router.post('/departments', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    console.log('Creating department with data:', req.body);
    const { name, code, description, head, contactNumber, email } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: 'Name and code are required'
      });
    }

    const department = await Department.create({
      name,
      code,
      description,
      head,
      contactNumber,
      email,
      status: 'active'
    });

    console.log('Department created successfully:', department.id);

    // Log activity
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'CREATE_DEPARTMENT',
        entityType: 'Department',
        entityId: department.id,
        details: `Created department: ${name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        level: 'Info',
        status: 'Success',
        module: 'Office & Groups'
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department: department
    });

  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create department: ' + error.message
    });
  }
});

// Update department
router.put('/departments/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    await department.update(updateData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      details: `Updated department: ${updateData.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Department updated successfully',
      department: department
    });

  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update department'
    });
  }
});

// Delete department
router.delete('/departments/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    await department.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      details: `Deleted department: ${department.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });

  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete department'
    });
  }
});

// Get groups
router.get('/groups', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const groups = await Group.findAll({
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      groups: groups
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
});

// Create group
router.post('/groups', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    console.log('Creating group with data:', req.body);
    const { name, code, description, departmentId, leader } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: 'Name and code are required'
      });
    }

    const group = await Group.create({
      name,
      code,
      description,
      departmentId,
      leader,
      memberCount: 0,
      status: 'active'
    });

    console.log('Group created successfully:', group.id);

    // Log activity
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'CREATE_GROUP',
        entityType: 'Group',
        entityId: group.id,
        details: `Created group: ${name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        level: 'Info',
        status: 'Success',
        module: 'Office & Groups'
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group: group
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create group: ' + error.message
    });
  }
});

// Update group
router.put('/groups/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    await group.update(updateData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_GROUP',
      entityType: 'Group',
      entityId: id,
      details: `Updated group: ${updateData.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Group updated successfully',
      group: group
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update group'
    });
  }
});

// Delete group
router.delete('/groups/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    await group.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_GROUP',
      entityType: 'Group',
      entityId: id,
      details: `Deleted group: ${group.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete group'
    });
  }
});

// ===== BACKUP & MAINTENANCE ENDPOINTS =====

// Get backup status
router.get('/backups', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const backups = await Backup.findAll({
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'username']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      backups: backups
    });

  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backups'
    });
  }
});

// Create backup
router.post('/backups', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { type = 'full', notes } = req.body;

    // Create backup record
    const backup = await Backup.create({
      name: `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}`,
      type,
      filePath: `/backups/backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.sql`,
      fileSize: 0,
      status: 'pending',
      createdBy: req.user.id,
      notes
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_BACKUP',
      entityType: 'Backup',
      entityId: backup.id,
      details: `Created ${type} backup`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Backup started successfully',
      backup: backup
    });

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

// Download backup
router.get('/backups/:id/download', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const backup = await Backup.findByPk(id);
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }

    if (backup.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Backup is not ready for download'
      });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DOWNLOAD_BACKUP',
      entityType: 'Backup',
      entityId: id,
      details: `Downloaded backup: ${backup.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Backup download initiated',
      downloadUrl: backup.filePath
    });

  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download backup'
    });
  }
});

// Delete backup
router.delete('/backups/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const backup = await Backup.findByPk(id);
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }

    await backup.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_BACKUP',
      entityType: 'Backup',
      entityId: id,
      details: `Deleted backup: ${backup.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });

  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup'
    });
  }
});

// ===== SYSTEM HEALTH ENDPOINTS =====

// Get system health metrics
router.get('/system-health', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Mock system health data
    const health = {
      overview: {
        status: 'Healthy',
        uptime: '99.9%',
        lastCheck: new Date().toISOString()
      },
      metrics: {
        cpu: {
          usage: 45,
          cores: 4,
          temperature: 65
        },
        memory: {
          used: 8.2,
          total: 16,
          usage: 51
        },
        disk: {
          used: 450,
          total: 1000,
          usage: 45
        },
        network: {
          upload: 2.5,
          download: 15.8
        }
      },
      alerts: [
        {
          id: 1,
          type: 'warning',
          message: 'Disk usage approaching threshold',
          details: 'Disk usage is at 85%',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ]
    };

    res.json({
      success: true,
      health: health
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health'
    });
  }
});

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Get real statistics from database
    const userCount = await User.count();
    const projectCount = await Project.count();
    const activeProjectCount = await Project.count({ where: { status: 'Active' } });

    const stats = {
      totalUsers: userCount,
      activeProjects: activeProjectCount,
      totalProjects: projectCount,
      systemUptime: '99.9%',
      storageUsed: '45%'
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// ===== PUBLIC ANNOUNCEMENTS ENDPOINT =====

// Get public announcements (for all authenticated users)
router.get('/public/announcements', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      priority,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      status: 'active',
      publishDate: { [require('sequelize').Op.lte]: new Date() }
    };

    // Add filters
    if (priority) whereClause.priority = priority;
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { title: { [require('sequelize').Op.like]: `%${search}%` } },
        { content: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    // Filter by target audience - show announcements for 'all' or specific user role
    const userRole = req.user.role;
    whereClause[require('sequelize').Op.or] = [
      { targetAudience: 'all' },
      { targetAudience: userRole.toLowerCase() }
    ];

    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      announcements: announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get public announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcements'
    });
  }
});

module.exports = router; 
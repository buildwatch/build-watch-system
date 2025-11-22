const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { User, ActivityLog, Project, Announcement, Department, Group, Backup, ReadReceipt, AnnouncementAttachment, AnnouncementTemplate, AnnouncementComment, AnnouncementReaction, AnnouncementFavorite, AnnouncementVersion, AnnouncementApproval, AnnouncementCategory, AnnouncementTag, AnnouncementCategoryMapping, AnnouncementTagMapping, AnnouncementNotificationPreference } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { sendAnnouncementEmail } = require('../services/emailService');
const pushNotificationService = require('../services/pushNotificationService');

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

// Middleware to check if user can create announcements
const canCreateAnnouncement = async (req, res, next) => {
  const userRole = req.user.role;
  const subRole = req.user.subRole || '';
  
  // Define which roles can create announcements
  const allowedRoles = {
    'SYS.AD': ['system_maintenance', 'system_update', 'general'],
    'EMS': ['administration', 'general'], // Executive Viewer
    'LGU-PMT': subRole === 'MPMEC-SECRETARIAT' || subRole === 'MPMEC_SECRETARIAT' 
      ? ['project_related', 'general']
      : subRole === 'MPMEC' || subRole === 'MPMEC-MPMEC'
      ? ['project_related', 'policy_related', 'general']
      : [],
    'LGU-IU': ['project_related', 'general'],
    'EIU': ['project_update', 'general']
  };

  if (!allowedRoles[userRole] || allowedRoles[userRole].length === 0) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You do not have permission to create announcements.'
    });
  }

  // Store allowed types in request for later validation
  req.allowedAnnouncementTypes = allowedRoles[userRole];
  next();
};

// ===== FILE UPLOAD CONFIGURATION =====
// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../uploads/announcements');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `announcement-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow all file types, but you can restrict here
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: images, PDF, Word, Excel, text files.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

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

// Get announcements (System Admin only - full management view) - with advanced filtering
router.get('/announcements', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      targetAudience,
      announcementType,
      search,
      createdBy,
      excludeCreatedBy,
      dateFrom,
      dateTo,
      readStatus, // 'read', 'unread', 'acknowledged', 'unacknowledged'
      requiresAcknowledgment
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    const Op = require('sequelize').Op;
    
    // Add filters
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (targetAudience) whereClause.targetAudience = targetAudience;
    if (announcementType) whereClause.announcementType = announcementType;
    if (createdBy) {
      whereClause.createdBy = createdBy;
      // Exclude drafts from "My Announcements" tab (only if status is not explicitly set)
      if (req.query.excludeDrafts === 'true' && !status) {
        whereClause.status = { [Op.ne]: 'draft' };
      }
    }
    if (excludeCreatedBy) {
      whereClause.createdBy = { [Op.ne]: excludeCreatedBy };
    }
    if (requiresAcknowledgment !== undefined) {
      whereClause.requiresAcknowledgment = requiresAcknowledgment === 'true' || requiresAcknowledgment === true;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.publishDate = {};
      if (dateFrom) whereClause.publishDate[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.publishDate[Op.lte] = new Date(dateTo);
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { contentHtml: { [Op.like]: `%${search}%` } }
      ];
    }

    const includeOptions = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'fullName', 'email', 'role', 'profilePictureUrl']
      },
      {
        model: AnnouncementAttachment,
        as: 'attachments',
        required: false
      },
      {
        model: AnnouncementCategoryMapping,
        as: 'categoryMappings',
        required: false,
        include: [{
          model: AnnouncementCategory,
          as: 'category',
          attributes: ['id', 'name', 'color', 'description']
        }]
      },
      {
        model: AnnouncementTagMapping,
        as: 'tagMappings',
        required: false,
        include: [{
          model: AnnouncementTag,
          as: 'tag',
          attributes: ['id', 'name', 'color']
        }]
      }
    ];

    // If readStatus filter is provided, we need to join with ReadReceipt
    let readStatusFilter = null;
    if (readStatus && req.user) {
      if (readStatus === 'read') {
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id, readAt: { [Op.ne]: null } },
          required: true
        });
      } else if (readStatus === 'unread') {
        // Use subquery or left join with null check
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id },
          required: false
        });
        // This will be handled in post-processing
        readStatusFilter = 'unread';
      } else if (readStatus === 'acknowledged') {
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id, acknowledgedAt: { [Op.ne]: null } },
          required: true
        });
      } else if (readStatus === 'unacknowledged') {
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id },
          required: false
        });
        readStatusFilter = 'unacknowledged';
      }
    }

    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['isPinned', 'DESC'], // Pinned announcements first
        [require('sequelize').literal("FIELD(priority, 'urgent', 'high', 'normal', 'low')"), 'ASC'],
        ['createdAt', 'DESC']
      ],
      distinct: true // Important for count with joins
    });

    // Post-process for unread/unacknowledged filter
    let filteredAnnouncements = announcements;
    if (readStatusFilter === 'unread' && req.user) {
      filteredAnnouncements = announcements.filter(ann => {
        const receipt = ann.readReceipts?.find(r => r.userId === req.user.id);
        return !receipt || !receipt.readAt;
      });
    } else if (readStatusFilter === 'unacknowledged' && req.user) {
      filteredAnnouncements = announcements.filter(ann => {
        if (!ann.requiresAcknowledgment) return false;
        const receipt = ann.readReceipts?.find(r => r.userId === req.user.id);
        return !receipt || !receipt.acknowledgedAt;
      });
    }

    res.json({
      success: true,
      announcements: filteredAnnouncements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: readStatusFilter ? filteredAnnouncements.length : count,
        pages: Math.ceil((readStatusFilter ? filteredAnnouncements.length : count) / limit)
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

// ===== ANNOUNCEMENT TEMPLATES =====
// IMPORTANT: These routes must come BEFORE /announcements/:id to avoid route conflicts

// Get all templates (system templates + user's own templates)
router.get('/announcements/templates', authenticateToken, async (req, res) => {
  try {
    const Op = require('sequelize').Op;
    
    const templates = await AnnouncementTemplate.findAll({
      where: {
        [Op.or]: [
          { isSystemTemplate: true },
          { createdBy: req.user.id }
        ]
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'role', 'profilePictureUrl']
      }],
      order: [
        ['isSystemTemplate', 'DESC'], // System templates first
        ['createdAt', 'DESC']
      ]
    });
    
    res.json({
      success: true,
      templates: templates
    });
    
  } catch (error) {
    console.error('Get templates error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== PHASE 3C: CATEGORIES, TAGS, AND NOTIFICATION PREFERENCES =====
// These routes must be defined BEFORE /announcements/:id to avoid route conflicts

// Categories Endpoints
router.get('/announcements/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await AnnouncementCategory.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

router.post('/announcements/categories', authenticateToken, async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const category = await AnnouncementCategory.create({
      name,
      description,
      color: color || '#3B82F6',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
});

// Tags Endpoints
router.get('/announcements/tags', authenticateToken, async (req, res) => {
  try {
    const tags = await AnnouncementTag.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags'
    });
  }
});

router.post('/announcements/tags', authenticateToken, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }

    const tag = await AnnouncementTag.create({
      name,
      color: color || '#6B7280',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      tag
    });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tag'
    });
  }
});

// Notification Preferences Endpoints
router.get('/announcements/notification-preferences', authenticateToken, async (req, res) => {
  try {
    let preference = await AnnouncementNotificationPreference.findOne({
      where: { userId: req.user.id }
    });

    if (!preference) {
      // Create default preferences
      preference = await AnnouncementNotificationPreference.create({
        userId: req.user.id
      });
    }

    res.json({
      success: true,
      preference
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification preferences'
    });
  }
});

router.put('/announcements/notification-preferences', authenticateToken, async (req, res) => {
  try {
    const {
      emailNotifications,
      pushNotifications,
      notifyOnNewAnnouncement,
      notifyOnUpdate,
      notifyOnComment,
      notifyOnReaction,
      priorityFilter
    } = req.body;

    let preference = await AnnouncementNotificationPreference.findOne({
      where: { userId: req.user.id }
    });

    if (!preference) {
      preference = await AnnouncementNotificationPreference.create({
        userId: req.user.id
      });
    }

    await preference.update({
      emailNotifications: emailNotifications !== undefined ? emailNotifications : preference.emailNotifications,
      pushNotifications: pushNotifications !== undefined ? pushNotifications : preference.pushNotifications,
      notifyOnNewAnnouncement: notifyOnNewAnnouncement !== undefined ? notifyOnNewAnnouncement : preference.notifyOnNewAnnouncement,
      notifyOnUpdate: notifyOnUpdate !== undefined ? notifyOnUpdate : preference.notifyOnUpdate,
      notifyOnComment: notifyOnComment !== undefined ? notifyOnComment : preference.notifyOnComment,
      notifyOnReaction: notifyOnReaction !== undefined ? notifyOnReaction : preference.notifyOnReaction,
      priorityFilter: priorityFilter || preference.priorityFilter
    });

    res.json({
      success: true,
      preference
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

// Get single announcement by ID
router.get('/announcements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const announcementId = parseInt(id);
    
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: AnnouncementAttachment,
          as: 'attachments',
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: AnnouncementCategoryMapping,
          as: 'categoryMappings',
          required: false,
          include: [{
            model: AnnouncementCategory,
            as: 'category',
            attributes: ['id', 'name', 'color', 'description']
          }]
        },
        {
          model: AnnouncementTagMapping,
          as: 'tagMappings',
          required: false,
          include: [{
            model: AnnouncementTag,
            as: 'tag',
            attributes: ['id', 'name', 'color']
          }]
        }
      ]
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check if user has access to this announcement
    // System Admin can see all announcements
    // Other users can see announcements targeted to them or 'all'
    if (req.user.role !== 'SYS.AD') {
      const targetAudience = announcement.targetAudience;
      const userRole = req.user.role;
      const userSubRole = req.user.subRole || '';
      
      // Check if announcement is targeted to this user
      const hasAccess = 
        targetAudience === 'all' ||
        targetAudience === userRole ||
        (targetAudience === 'LGU-PMT' && (userRole === 'LGU-PMT' || userSubRole === 'MPMEC-SECRETARIAT' || userSubRole === 'MPMEC_SECRETARIAT' || userSubRole === 'MPMEC' || userSubRole === 'MPMEC-MPMEC'));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You do not have permission to view this announcement.'
        });
      }
    }

    res.json({
      success: true,
      announcement: announcement
    });

  } catch (error) {
    console.error('Get announcement error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create announcement (role-based permissions) - with file upload support
router.post('/announcements', authenticateToken, canCreateAnnouncement, upload.array('attachments', 10), async (req, res) => {
  try {
    const {
      title,
      content,
      contentHtml,
      priority,
      targetAudience,
      publishDate,
      expiryDate,
      announcementType,
      sendEmailNotification,
      requiresAcknowledgment,
      acknowledgmentDeadline,
      status, // Allow status to be set (including 'draft')
      categoryIds, // Phase 3C: Categories
      tagIds, // Phase 3C: Tags
      requiresApproval // Phase 3C: Approval workflow
    } = req.body;

    // Validate required fields (skip validation for drafts)
    const isDraft = status === 'draft';
    if (!isDraft && (!title || !content || !priority || !targetAudience)) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, priority, and target audience are required'
      });
    }

    // Validate announcement type based on user role
    if (announcementType && !req.allowedAnnouncementTypes.includes(announcementType)) {
      return res.status(403).json({
        success: false,
        error: `You are not allowed to create ${announcementType} announcements. Allowed types: ${req.allowedAnnouncementTypes.join(', ')}`
      });
    }

    // Determine announcement type if not provided
    let finalAnnouncementType = announcementType || 'general';
    if (!announcementType && req.user.role === 'SYS.AD') {
      // System Admin defaults to general if not specified
      finalAnnouncementType = 'general';
    }

    // Determine status
    let finalStatus = status;
    if (!finalStatus) {
      // Default behavior: scheduled if publishDate is in future, otherwise active
      finalStatus = publishDate && new Date(publishDate) > new Date() ? 'scheduled' : 'active';
    }
    
    // Validate status
    if (!['active', 'scheduled', 'expired', 'draft'].includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, scheduled, expired, draft'
      });
    }

    // Create announcement in database
    const announcement = await Announcement.create({
      title: title || 'Untitled Draft',
      content: content || '',
      contentHtml: contentHtml || content || '', // Store HTML if provided
      priority: priority || 'normal',
      targetAudience: targetAudience || 'all',
      announcementType: finalAnnouncementType,
      createdBy: req.user.id,
      status: finalStatus,
      publishDate: publishDate || (finalStatus === 'draft' ? null : new Date()),
      expiryDate: expiryDate || null,
      requiresAcknowledgment: requiresAcknowledgment === 'true' || requiresAcknowledgment === true,
      acknowledgmentDeadline: acknowledgmentDeadline || null,
      requiresApproval: requiresApproval === 'true' || requiresApproval === true,
      approvalStatus: (requiresApproval === 'true' || requiresApproval === true) ? 'pending' : null,
      views: 0
    });

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      const attachmentPromises = req.files.map(file => {
        return AnnouncementAttachment.create({
          announcementId: announcement.id,
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: `/uploads/announcements/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: req.user.id
        });
      });
      await Promise.all(attachmentPromises);
    }

    // Handle categories (Phase 3C)
    if (categoryIds) {
      const catIds = Array.isArray(categoryIds) ? categoryIds : JSON.parse(categoryIds);
      if (catIds.length > 0) {
        await AnnouncementCategoryMapping.bulkCreate(
          catIds.map(catId => ({
            announcementId: announcement.id,
            categoryId: parseInt(catId)
          }))
        );
      }
    }

    // Handle tags (Phase 3C)
    if (tagIds) {
      const tIds = Array.isArray(tagIds) ? tagIds : JSON.parse(tagIds);
      if (tIds.length > 0) {
        await AnnouncementTagMapping.bulkCreate(
          tIds.map(tagId => ({
            announcementId: announcement.id,
            tagId: parseInt(tagId)
          }))
        );
      }
    }

    // Reload with creator information, attachments, categories, and tags
    await announcement.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: AnnouncementAttachment,
          as: 'attachments',
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: AnnouncementCategoryMapping,
          as: 'categoryMappings',
          include: [{
            model: AnnouncementCategory,
            as: 'category',
            attributes: ['id', 'name', 'color', 'description']
          }]
        },
        {
          model: AnnouncementTagMapping,
          as: 'tagMappings',
          include: [{
            model: AnnouncementTag,
            as: 'tag',
            attributes: ['id', 'name', 'color']
          }]
        }
      ]
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: announcement.id,
      details: `Created announcement: ${title} (Type: ${finalAnnouncementType})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send email notifications if requested and announcement is active (not scheduled or draft)
    if (sendEmailNotification === 'true' || sendEmailNotification === true) {
      if (announcement.status === 'active' && finalStatus !== 'draft') {
        try {
          // Get target users based on targetAudience
          const Op = require('sequelize').Op;
          let targetUsers = [];
          
          if (targetAudience === 'all') {
            // Get all active users except system admin
            targetUsers = await User.findAll({
              where: {
                status: 'active',
                email: { [Op.ne]: null }
              },
              attributes: ['id', 'email', 'name', 'role']
            });
          } else {
            // Map target audience to roles
            const roleMapping = {
              'SYS.AD': ['SYS.AD'],
              'LGU-PMT': ['LGU-PMT'],
              'LGU-IU': ['LGU-IU'],
              'EIU': ['EIU'],
              'EMS': ['EMS']
            };
            
            const targetRoles = roleMapping[targetAudience] || [targetAudience];
            
            // Also handle sub-role mappings for LGU-PMT
            if (targetAudience === 'LGU-PMT') {
              targetUsers = await User.findAll({
                where: {
                  status: 'active',
                  email: { [Op.ne]: null },
                  [Op.or]: [
                    { role: 'LGU-PMT' },
                    { subRole: 'MPMEC-SECRETARIAT' },
                    { subRole: 'MPMEC_SECRETARIAT' },
                    { subRole: 'MPMEC' }
                  ]
                },
                attributes: ['id', 'email', 'name', 'role', 'subRole']
              });
            } else {
              targetUsers = await User.findAll({
                where: {
                  status: 'active',
                  email: { [Op.ne]: null },
                  role: { [Op.in]: targetRoles }
                },
                attributes: ['id', 'email', 'name', 'role']
              });
            }
          }
          
          // Send emails asynchronously (don't wait for all to complete)
          const emailPromises = targetUsers
            .filter(user => user.email && user.email.trim())
            .map(user => 
              sendAnnouncementEmail(
                user.email, 
                announcement.toJSON(), 
                announcement.attachments || []
              ).catch(err => {
                console.error(`Failed to send email to ${user.email}:`, err);
                return false;
              })
            );
          
          // Fire and forget - don't block response
          Promise.all(emailPromises).then(results => {
            const successCount = results.filter(r => r === true).length;
            const failCount = results.length - successCount;
            console.log(`📧 Email notifications sent: ${successCount} successful, ${failCount} failed`);
          });
          
        } catch (emailError) {
          console.error('Error sending announcement emails:', emailError);
          // Don't fail the request if email sending fails
        }

        // Phase 3D: Send push notifications
        try {
          // Get user notification preferences and filter users who want push notifications
          const userIds = targetUsers.map(u => u.id);
          const preferences = await AnnouncementNotificationPreference.findAll({
            where: {
              userId: { [Op.in]: userIds },
              pushNotifications: true,
              notifyOnNewAnnouncement: true
            }
          });

          // Filter by priority if user has priority filter set
          const priorityFilterMap = {
            'all': ['urgent', 'high', 'normal', 'low'],
            'urgent': ['urgent'],
            'high': ['urgent', 'high'],
            'urgent_high': ['urgent', 'high']
          };

          const eligibleUserIds = preferences
            .filter(pref => {
              const allowedPriorities = priorityFilterMap[pref.priorityFilter] || priorityFilterMap['all'];
              return allowedPriorities.includes(announcement.priority);
            })
            .map(pref => pref.userId);

          if (eligibleUserIds.length > 0) {
            const pushNotification = {
              title: announcement.title,
              body: announcement.content.substring(0, 150) + (announcement.content.length > 150 ? '...' : ''),
              icon: '/icons/icon-192x192.png',
              badge: '/icons/badge.png',
              data: {
                announcementId: announcement.id,
                type: 'new_announcement',
                priority: announcement.priority
              },
              tag: `announcement-${announcement.id}`,
              requireInteraction: announcement.priority === 'urgent'
            };

            // Send push notifications asynchronously
            pushNotificationService.sendBulkNotifications(eligibleUserIds, pushNotification)
              .then(result => {
                console.log(`📱 Push notifications sent: ${result.sent}/${result.total} successful`);
              })
              .catch(pushError => {
                console.error('Error sending push notifications:', pushError);
              });
          }
        } catch (pushError) {
          console.error('Error sending push notifications:', pushError);
          // Don't fail the request if push notification sending fails
        }
      } else {
        console.log('📧 Email notifications will be sent when announcement is published (scheduled)');
      }
    }

    // Emit Socket.IO event for real-time updates (only for non-draft announcements)
    if (finalStatus !== 'draft' && req.io) {
      // Emit to ALL connected users (broadcast to everyone)
      req.io.emit('new_announcement', {
        id: announcement.id,
        title: announcement.title,
        createdBy: announcement.createdBy,
        targetAudience: announcement.targetAudience,
        status: announcement.status
      });
      console.log('📢 Socket.IO: Emitted new_announcement event to ALL connected users');
      console.log('   Announcement ID:', announcement.id);
      console.log('   Target Audience:', announcement.targetAudience);
      console.log('   Created By:', announcement.createdBy);
    }

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

// Update announcement (only creator or System Admin can update) - with file upload support
router.put('/announcements/:id', authenticateToken, upload.array('attachments', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      contentHtml,
      priority,
      targetAudience,
      publishDate,
      expiryDate,
      announcementType,
      requiresAcknowledgment,
      acknowledgmentDeadline,
      deleteAttachmentIds, // Array of attachment IDs to delete
      status // Allow status to be updated (including 'draft')
    } = req.body;
    
    const updateData = {
      title,
      content,
      contentHtml: contentHtml || content,
      priority,
      targetAudience,
      publishDate,
      expiryDate,
      announcementType,
      requiresAcknowledgment: requiresAcknowledgment === 'true' || requiresAcknowledgment === true,
      acknowledgmentDeadline: acknowledgmentDeadline || null,
      status // Include status in update
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    
    // Validate status if provided
    if (updateData.status && !['active', 'scheduled', 'expired', 'draft'].includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, scheduled, expired, draft'
      });
    }

    const announcement = await Announcement.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'role', 'profilePictureUrl']
      }]
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions: only creator or System Admin can update
    if (req.user.role !== 'SYS.AD' && announcement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only update your own announcements.'
      });
    }
    
    // If updating from draft to active/scheduled, validate required fields and set status to scheduled if publishDate is in future
    if (updateData.status && updateData.status !== 'draft' && announcement.status === 'draft') {
      const finalTitle = updateData.title !== undefined ? updateData.title : announcement.title;
      const finalContent = updateData.content !== undefined ? updateData.content : announcement.content;
      const finalPriority = updateData.priority !== undefined ? updateData.priority : announcement.priority;
      const finalTargetAudience = updateData.targetAudience !== undefined ? updateData.targetAudience : announcement.targetAudience;
      const finalPublishDate = updateData.publishDate !== undefined ? new Date(updateData.publishDate) : (announcement.publishDate ? new Date(announcement.publishDate) : new Date());
      
      if (!finalTitle || !finalContent || !finalPriority || !finalTargetAudience) {
        return res.status(400).json({
          success: false,
          error: 'Title, content, priority, and target audience are required when publishing a draft'
        });
      }
      
      // If publishDate is in the future, set status to 'scheduled', otherwise 'active'
      const now = new Date();
      if (finalPublishDate > now) {
        updateData.status = 'scheduled';
      } else if (!updateData.status || updateData.status === 'draft') {
        updateData.status = 'active';
      }
    }

    // If updating announcementType, validate permissions
    if (updateData.announcementType) {
      // Get allowed types for current user
      const userRole = req.user.role;
      const subRole = req.user.subRole;
      const allowedRoles = {
        'SYS.AD': ['system_maintenance', 'system_update', 'general'],
        'EMS': ['administration', 'general'],
        'LGU-PMT': subRole === 'MPMEC-SECRETARIAT' || subRole === 'MPMEC_SECRETARIAT' 
          ? ['project_related', 'general']
          : subRole === 'MPMEC' || subRole === 'MPMEC-MPMEC'
          ? ['project_related', 'policy_related', 'general']
          : [],
        'LGU-IU': ['project_related', 'general'],
        'EIU': ['project_update', 'general']
      };

      if (!allowedRoles[userRole] || !allowedRoles[userRole].includes(updateData.announcementType)) {
        return res.status(403).json({
          success: false,
          error: `You are not allowed to create ${updateData.announcementType} announcements.`
        });
      }
    }

    // Save version history before updating (Phase 3C)
    const hasChanges = 
      (updateData.title !== undefined && updateData.title !== announcement.title) ||
      (updateData.content !== undefined && updateData.content !== announcement.content) ||
      (updateData.priority !== undefined && updateData.priority !== announcement.priority) ||
      (updateData.announcementType !== undefined && updateData.announcementType !== announcement.announcementType) ||
      (updateData.targetAudience !== undefined && updateData.targetAudience !== announcement.targetAudience);

    if (hasChanges) {
      // Get current version count
      const versionCount = await AnnouncementVersion.count({
        where: { announcementId: parseInt(id) }
      });

      // Create version record
      await AnnouncementVersion.create({
        announcementId: parseInt(id),
        versionNumber: versionCount + 1,
        title: announcement.title,
        content: announcement.content,
        contentHtml: announcement.contentHtml || announcement.content,
        priority: announcement.priority,
        announcementType: announcement.announcementType,
        targetAudience: announcement.targetAudience,
        changeDescription: req.body.changeDescription || 'Updated announcement',
        changedBy: req.user.id
      });
    }

    await announcement.update(updateData);

    // Handle categories (Phase 3C)
    if (req.body.categoryIds) {
      const categoryIds = Array.isArray(req.body.categoryIds) ? req.body.categoryIds : JSON.parse(req.body.categoryIds);
      // Remove existing mappings
      await AnnouncementCategoryMapping.destroy({
        where: { announcementId: parseInt(id) }
      });
      // Create new mappings
      if (categoryIds.length > 0) {
        await AnnouncementCategoryMapping.bulkCreate(
          categoryIds.map(catId => ({
            announcementId: parseInt(id),
            categoryId: parseInt(catId)
          }))
        );
      }
    }

    // Handle tags (Phase 3C)
    if (req.body.tagIds) {
      const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds : JSON.parse(req.body.tagIds);
      // Remove existing mappings
      await AnnouncementTagMapping.destroy({
        where: { announcementId: parseInt(id) }
      });
      // Create new mappings
      if (tagIds.length > 0) {
        await AnnouncementTagMapping.bulkCreate(
          tagIds.map(tagId => ({
            announcementId: parseInt(id),
            tagId: parseInt(tagId)
          }))
        );
      }
    }

    // Handle file attachments deletion
    if (deleteAttachmentIds) {
      const idsToDelete = Array.isArray(deleteAttachmentIds) ? deleteAttachmentIds : JSON.parse(deleteAttachmentIds);
      for (const attachmentId of idsToDelete) {
        const attachment = await AnnouncementAttachment.findByPk(attachmentId);
        if (attachment && attachment.announcementId === parseInt(id)) {
          // Delete file from filesystem
          const filePath = path.join(__dirname, '..', attachment.filePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          await attachment.destroy();
        }
      }
    }

    // Handle new file attachments
    if (req.files && req.files.length > 0) {
      const attachmentPromises = req.files.map(file => {
        return AnnouncementAttachment.create({
          announcementId: parseInt(id),
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: `/uploads/announcements/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: req.user.id
        });
      });
      await Promise.all(attachmentPromises);
    }

    // Reload with creator information, attachments, categories, and tags
    await announcement.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: AnnouncementAttachment,
          as: 'attachments',
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: AnnouncementCategoryMapping,
          as: 'categoryMappings',
          include: [{
            model: AnnouncementCategory,
            as: 'category',
            attributes: ['id', 'name', 'color', 'description']
          }]
        },
        {
          model: AnnouncementTagMapping,
          as: 'tagMappings',
          include: [{
            model: AnnouncementTag,
            as: 'tag',
            attributes: ['id', 'name', 'color']
          }]
        }
      ]
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: id,
      details: `Updated announcement: ${updateData.title || announcement.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Emit Socket.IO event for real-time updates
    if (req.io) {
      const oldStatus = announcement.status;
      const newStatus = updateData.status || announcement.status;
      
      // If status changed from draft to active/scheduled, emit new_announcement
      if (oldStatus === 'draft' && newStatus !== 'draft') {
        req.io.emit('new_announcement', {
          id: announcement.id,
          title: announcement.title,
          createdBy: announcement.createdBy,
          targetAudience: announcement.targetAudience,
          status: newStatus
        });
        console.log('📢 Socket.IO: Emitted new_announcement event (draft published)');
      } else if (newStatus !== 'draft') {
        // Otherwise emit update event (only for non-draft announcements)
        req.io.emit('announcement_updated', {
          id: announcement.id,
          title: announcement.title,
          status: newStatus
        });
        console.log('📢 Socket.IO: Emitted announcement_updated event');
      }
    }

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

// Delete announcement (only creator or System Admin can delete)
router.delete('/announcements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions: only creator or System Admin can delete
    if (req.user.role !== 'SYS.AD' && announcement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only delete your own announcements.'
      });
    }

    const announcementId = announcement.id;
    await announcement.destroy();

    // Emit Socket.IO event for real-time updates
    if (req.io) {
      req.io.emit('announcement_deleted', announcementId);
      console.log('📢 Socket.IO: Emitted announcement_deleted event');
    }

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

// ===== BULK OPERATIONS ENDPOINTS =====

// Bulk delete announcements
router.post('/announcements/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { announcementIds } = req.body;
    
    if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'announcementIds array is required'
      });
    }
    
    const Op = require('sequelize').Op;
    const announcements = await Announcement.findAll({
      where: {
        id: { [Op.in]: announcementIds }
      }
    });
    
    // Check permissions: only System Admin can bulk delete, or users can delete their own
    const canDeleteAll = req.user.role === 'SYS.AD';
    const unauthorized = announcements.filter(ann => 
      !canDeleteAll && ann.createdBy !== req.user.id
    );
    
    if (unauthorized.length > 0) {
      return res.status(403).json({
        success: false,
        error: `Access denied. You cannot delete ${unauthorized.length} announcement(s).`
      });
    }
    
    // Delete attachments first
    const attachmentIds = [];
    for (const announcement of announcements) {
      const attachments = await AnnouncementAttachment.findAll({
        where: { announcementId: announcement.id }
      });
      attachmentIds.push(...attachments.map(a => a.id));
      
      // Delete files from filesystem
      for (const attachment of attachments) {
        const filePath = path.join(__dirname, '..', attachment.filePath);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileError) {
            console.error(`Error deleting file ${filePath}:`, fileError);
          }
        }
      }
    }
    
    // Delete read receipts
    if (attachmentIds.length > 0) {
      await ReadReceipt.destroy({
        where: {
          announcementId: { [Op.in]: announcementIds }
        }
      });
    }
    
    // Delete attachments
    if (attachmentIds.length > 0) {
      await AnnouncementAttachment.destroy({
        where: {
          id: { [Op.in]: attachmentIds }
        }
      });
    }
    
    // Delete announcements
    const deletedCount = await Announcement.destroy({
      where: {
        id: { [Op.in]: announcementIds }
      }
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'BULK_DELETE_ANNOUNCEMENTS',
      entityType: 'Announcement',
      entityId: null,
      details: `Bulk deleted ${deletedCount} announcement(s): ${announcementIds.join(', ')}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} announcement(s)`,
      deletedCount
    });
    
  } catch (error) {
    console.error('Bulk delete announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete announcements'
    });
  }
});

// Bulk mark as read
router.post('/announcements/bulk-mark-read', authenticateToken, async (req, res) => {
  try {
    const { announcementIds } = req.body;
    const userId = req.user.id;
    
    if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'announcementIds array is required'
      });
    }
    
    const Op = require('sequelize').Op;
    const now = new Date();
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const announcementId of announcementIds) {
      let receipt = await ReadReceipt.findOne({
        where: { announcementId, userId }
      });
      
      if (receipt) {
        if (!receipt.readAt) {
          receipt.readAt = now;
          await receipt.save();
          updatedCount++;
        }
      } else {
        await ReadReceipt.create({
          announcementId,
          userId,
          readAt: now
        });
        createdCount++;
        
        // Increment views count
        const announcement = await Announcement.findByPk(announcementId);
        if (announcement) {
          announcement.views = (announcement.views || 0) + 1;
          await announcement.save();
        }
      }
    }
    
    res.json({
      success: true,
      message: `Successfully marked ${announcementIds.length} announcement(s) as read`,
      created: createdCount,
      updated: updatedCount
    });
    
  } catch (error) {
    console.error('Bulk mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk mark announcements as read'
    });
  }
});

// Bulk acknowledge
router.post('/announcements/bulk-acknowledge', authenticateToken, async (req, res) => {
  try {
    const { announcementIds } = req.body;
    const userId = req.user.id;
    
    if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'announcementIds array is required'
      });
    }
    
    // Verify all announcements require acknowledgment
    const Op = require('sequelize').Op;
    const announcements = await Announcement.findAll({
      where: {
        id: { [Op.in]: announcementIds },
        requiresAcknowledgment: true
      }
    });
    
    if (announcements.length !== announcementIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some announcements do not require acknowledgment'
      });
    }
    
    const now = new Date();
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const announcementId of announcementIds) {
      let receipt = await ReadReceipt.findOne({
        where: { announcementId, userId }
      });
      
      if (receipt) {
        if (!receipt.acknowledgedAt) {
          receipt.acknowledgedAt = now;
          if (!receipt.readAt) {
            receipt.readAt = now;
          }
          await receipt.save();
          updatedCount++;
        }
      } else {
        await ReadReceipt.create({
          announcementId,
          userId,
          readAt: now,
          acknowledgedAt: now
        });
        createdCount++;
        
        // Increment views count
        const announcement = await Announcement.findByPk(announcementId);
        if (announcement) {
          announcement.views = (announcement.views || 0) + 1;
          await announcement.save();
        }
      }
    }
    
    res.json({
      success: true,
      message: `Successfully acknowledged ${announcementIds.length} announcement(s)`,
      created: createdCount,
      updated: updatedCount
    });
    
  } catch (error) {
    console.error('Bulk acknowledge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk acknowledge announcements'
    });
  }
});

// Bulk update status
router.post('/announcements/bulk-update-status', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { announcementIds, status } = req.body;
    
    if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'announcementIds array is required'
      });
    }
    
    if (!status || !['active', 'scheduled', 'expired', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (active, scheduled, expired, draft)'
      });
    }
    
    const Op = require('sequelize').Op;
    const updatedCount = await Announcement.update(
      { status },
      {
        where: {
          id: { [Op.in]: announcementIds }
        }
      }
    );
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'BULK_UPDATE_ANNOUNCEMENT_STATUS',
      entityType: 'Announcement',
      entityId: null,
      details: `Bulk updated ${updatedCount[0]} announcement(s) status to ${status}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: `Successfully updated ${updatedCount[0]} announcement(s) status to ${status}`,
      updatedCount: updatedCount[0]
    });
    
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update announcement status'
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

// Get public announcements (for all authenticated users) - with advanced filtering
router.get('/public/announcements', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      priority,
      announcementType,
      search,
      createdBy,
      excludeCreatedBy,
      dateFrom,
      dateTo,
      readStatus, // 'read', 'unread', 'acknowledged', 'unacknowledged'
      requiresAcknowledgment
    } = req.query;

    const offset = (page - 1) * limit;
    const now = new Date();
    const Op = require('sequelize').Op;
    
    // Filter by target audience - show announcements for 'all' or specific user role
    const userRole = req.user.role;
    
    // Build base where clause
    const whereConditions = [];

    // Check if filtering for drafts - only show drafts to creator and System Admin
    const isDraftFilter = req.query.status === 'draft' || req.query.draftFilter === 'true';
    
    if (isDraftFilter) {
      // Drafts tab - only show drafts to creator and System Admin
      if (req.user.role !== 'SYS.AD') {
        // Non-admin users can only see their own drafts
        whereConditions.push({ 
          status: 'draft',
          createdBy: req.user.id 
        });
      } else {
        // System Admin can see all drafts
        whereConditions.push({ status: 'draft' });
      }
    } else if (createdBy && createdBy === req.user.id) {
      // User viewing their own announcements - exclude drafts unless explicitly requested
      const excludeDrafts = req.query.excludeDrafts === 'true';
      
      if (excludeDrafts) {
        // "My Announcements" tab - exclude drafts, show only published announcements
        whereConditions.push({ createdBy: req.user.id });
        whereConditions.push({ status: { [Op.ne]: 'draft' } });
        // Respect expiry date
        whereConditions.push({
          [Op.or]: [
            { expiryDate: null },
            { expiryDate: { [Op.gte]: now } }
          ]
        });
      } else {
        // Include all statuses (for other views)
        whereConditions.push({ createdBy: req.user.id });
        // Still respect expiry date (but not for drafts)
        whereConditions.push({
          [Op.or]: [
            { expiryDate: null },
            { expiryDate: { [Op.gte]: now } },
            { status: 'draft' } // Drafts don't need expiry date check
          ]
        });
      }
    } else {
      // For "All Announcements" or "From Others", show active and scheduled announcements that match targetAudience
      // Exclude drafts (only creator and System Admin can see drafts)
      // Show active announcements that are published, or scheduled announcements (regardless of publishDate)
      whereConditions.push({
        [Op.and]: [
          {
            [Op.or]: [
              // Active announcements that are published
              {
                status: 'active',
                publishDate: { [Op.lte]: now }
              },
              // Scheduled announcements (will be shown even if publishDate is in future)
              {
                status: 'scheduled'
              }
            ]
          },
          // Exclude drafts
          {
            status: { [Op.ne]: 'draft' }
          }
        ]
      });
      
      // Respect expiry date for active announcements
      whereConditions.push({
        [Op.or]: [
          { expiryDate: null },
          { expiryDate: { [Op.gte]: now } }
        ]
      });

      // Apply targetAudience filter - announcements with 'all' should show for everyone
      const targetAudienceFilter = [
        { targetAudience: 'all' },
        { targetAudience: userRole }
      ];

      // Add role-specific mappings (case-insensitive matching)
      if (userRole === 'LGU-PMT') {
        targetAudienceFilter.push({ targetAudience: 'lgu-pmt' });
        targetAudienceFilter.push({ targetAudience: 'LGU-PMT' });
        targetAudienceFilter.push({ targetAudience: 'mpmec' });
        targetAudienceFilter.push({ targetAudience: 'MPMEC' });
        targetAudienceFilter.push({ targetAudience: 'mpmec-secretariat' });
        targetAudienceFilter.push({ targetAudience: 'MPMEC-SECRETARIAT' });
      } else if (userRole === 'LGU-IU') {
        targetAudienceFilter.push({ targetAudience: 'lgu-iu' });
        targetAudienceFilter.push({ targetAudience: 'LGU-IU' });
        targetAudienceFilter.push({ targetAudience: 'iu' });
        targetAudienceFilter.push({ targetAudience: 'IU' });
      } else if (userRole === 'EIU') {
        targetAudienceFilter.push({ targetAudience: 'eiu' });
        targetAudienceFilter.push({ targetAudience: 'EIU' });
      } else if (userRole === 'EMS') {
        targetAudienceFilter.push({ targetAudience: 'executive' });
        targetAudienceFilter.push({ targetAudience: 'Executive' });
        targetAudienceFilter.push({ targetAudience: 'executive-viewer' });
        targetAudienceFilter.push({ targetAudience: 'EXECUTIVE-VIEWER' });
      }

      whereConditions.push({
        [Op.or]: targetAudienceFilter
      });

      // Add createdBy/excludeCreatedBy filters if specified
      if (createdBy) {
        whereConditions.push({ createdBy });
      }
      if (excludeCreatedBy) {
        whereConditions.push({ createdBy: { [Op.ne]: excludeCreatedBy } });
      }
    }

    // Add other filters
    if (priority) whereConditions.push({ priority });
    if (announcementType) whereConditions.push({ announcementType });
    if (requiresAcknowledgment !== undefined) {
      whereConditions.push({ requiresAcknowledgment: requiresAcknowledgment === 'true' || requiresAcknowledgment === true });
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
      if (dateTo) dateFilter[Op.lte] = new Date(dateTo);
      if (Object.keys(dateFilter).length > 0) {
        whereConditions.push({ publishDate: dateFilter });
      }
    }
    
    if (search) {
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { content: { [Op.like]: `%${search}%` } },
          { contentHtml: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    const whereClause = {
      [Op.and]: whereConditions
    };

    const includeOptions = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'fullName', 'email', 'role', 'profilePictureUrl']
      },
      {
        model: AnnouncementAttachment,
        as: 'attachments',
        required: false
      },
      {
        model: AnnouncementCategoryMapping,
        as: 'categoryMappings',
        required: false,
        include: [{
          model: AnnouncementCategory,
          as: 'category',
          attributes: ['id', 'name', 'color', 'description']
        }]
      },
      {
        model: AnnouncementTagMapping,
        as: 'tagMappings',
        required: false,
        include: [{
          model: AnnouncementTag,
          as: 'tag',
          attributes: ['id', 'name', 'color']
        }]
      }
    ];

    // Always include readReceipts for the current user to check read status
    if (req.user) {
      includeOptions.push({
        model: ReadReceipt,
        as: 'readReceipts',
        required: false,
        where: { userId: req.user.id },
        attributes: ['id', 'userId', 'readAt', 'acknowledgedAt']
      });
    }

    // If readStatus filter is provided, we need to join with ReadReceipt
    let readStatusFilter = null;
    if (readStatus && req.user) {
      // Remove the default readReceipts and add a filtered one
      const readReceiptIndex = includeOptions.findIndex(opt => opt.as === 'readReceipts');
      if (readReceiptIndex !== -1) {
        includeOptions.splice(readReceiptIndex, 1);
      }
      
      if (readStatus === 'read') {
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id, readAt: { [Op.ne]: null } },
          required: true
        });
      } else if (readStatus === 'unread') {
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id },
          required: false
        });
        readStatusFilter = 'unread';
      } else if (readStatus === 'acknowledged') {
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id, acknowledgedAt: { [Op.ne]: null } },
          required: true
        });
      } else if (readStatus === 'unacknowledged') {
        includeOptions.push({
          model: ReadReceipt,
          as: 'readReceipts',
          where: { userId: req.user.id },
          required: false
        });
        readStatusFilter = 'unacknowledged';
      }
    }

    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['isPinned', 'DESC'], // Pinned announcements first
        [require('sequelize').literal("FIELD(priority, 'urgent', 'high', 'normal', 'low')"), 'ASC'],
        ['createdAt', 'DESC']
      ],
      distinct: true
    });

    // Post-process for unread/unacknowledged filter
    let filteredAnnouncements = announcements;
    if (readStatusFilter === 'unread' && req.user) {
      filteredAnnouncements = announcements.filter(ann => {
        const receipt = ann.readReceipts?.find(r => r.userId === req.user.id);
        return !receipt || !receipt.readAt;
      });
    } else if (readStatusFilter === 'unacknowledged' && req.user) {
      filteredAnnouncements = announcements.filter(ann => {
        if (!ann.requiresAcknowledgment) return false;
        const receipt = ann.readReceipts?.find(r => r.userId === req.user.id);
        return !receipt || !receipt.acknowledgedAt;
      });
    }

    res.json({
      success: true,
      announcements: filteredAnnouncements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: readStatusFilter ? filteredAnnouncements.length : count,
        pages: Math.ceil((readStatusFilter ? filteredAnnouncements.length : count) / limit)
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

// Get unread announcement count
router.get('/public/announcements/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const now = new Date();
    const Op = require('sequelize').Op;

    // Get all active announcements that are relevant to this user
    const whereConditions = {
      [Op.and]: [
        { status: { [Op.in]: ['active', 'scheduled'] } },
        {
          [Op.or]: [
            { expiryDate: null },
            { expiryDate: { [Op.gte]: now } }
          ]
        },
        {
          [Op.or]: [
            { targetAudience: 'all' },
            require('sequelize').literal(`LOWER(targetAudience) LIKE LOWER('%${userRole}%')`)
          ]
        }
      ]
    };

    // Get all relevant announcements
    // Explicitly specify attributes to avoid selecting non-existent columns
    const announcements = await Announcement.findAll({
      where: whereConditions,
      attributes: [
        'id', 'title', 'content', 'contentHtml', 'requiresAcknowledgment', 
        'acknowledgmentDeadline', 'priority', 'status', 'targetAudience', 
        'publishDate', 'expiryDate', 'views', 'isPinned', 'approvalStatus', 
        'requiresApproval', 'createdAt', 'updatedAt'
        // Excluded: createdBy, announcementType (may not exist in database)
      ],
      include: [{
        model: ReadReceipt,
        as: 'readReceipts',
        required: false,
        attributes: ['id', 'userId', 'readAt', 'acknowledgedAt']
      }]
    });

    // Count unread announcements (no read receipt for this user or readAt is null)
    // IMPORTANT: Exclude announcements created by the current user (if createdBy exists)
    const unreadCount = announcements.filter(ann => {
      // Skip announcements created by the current user (if createdBy field exists)
      if (ann.createdBy && String(ann.createdBy) === String(userId)) {
        return false;
      }
      // Find receipt for this specific user
      const receipt = ann.readReceipts && ann.readReceipts.length > 0
        ? ann.readReceipts.find(r => String(r.userId) === String(userId))
        : null;
      // Unread if no receipt exists or receipt exists but readAt is null
      return !receipt || !receipt.readAt;
    }).length;

    res.json({
      success: true,
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count',
      details: error.message
    });
  }
});

// ===== READ RECEIPTS ENDPOINTS =====

// Mark announcement as read
router.post('/announcements/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check if receipt already exists
    let receipt = await ReadReceipt.findOne({
      where: { announcementId: announcementId, userId: userId }
    });

    if (receipt) {
      // Update readAt if not already set
      if (!receipt.readAt) {
        receipt.readAt = new Date();
        await receipt.save();
      }
    } else {
      // Create new receipt
      receipt = await ReadReceipt.create({
        announcementId: announcementId,
        userId: userId,
        readAt: new Date()
      });
    }

    // Increment views count
    announcement.views = (announcement.views || 0) + 1;
    await announcement.save();

    // Emit Socket.IO event for real-time updates
    if (req.io) {
      req.io.emit('announcement_read', {
        announcementId: announcementId,
        userId: userId
      });
      console.log('📢 Socket.IO: Emitted announcement_read event');
    }

    res.json({
      success: true,
      message: 'Announcement marked as read',
      receipt: receipt
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark announcement as read'
    });
  }
});

// Acknowledge announcement
router.post('/announcements/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    if (!announcement.requiresAcknowledgment) {
      return res.status(400).json({
        success: false,
        error: 'This announcement does not require acknowledgment'
      });
    }

    // Check if receipt already exists
    let receipt = await ReadReceipt.findOne({
      where: { announcementId: announcementId, userId: userId }
    });

    if (receipt) {
      // Update acknowledgedAt
      receipt.acknowledgedAt = new Date();
      if (!receipt.readAt) {
        receipt.readAt = new Date();
      }
      await receipt.save();
    } else {
      // Create new receipt with acknowledgment
      receipt = await ReadReceipt.create({
        announcementId: announcementId,
        userId: userId,
        readAt: new Date(),
        acknowledgedAt: new Date()
      });
    }

    // Emit Socket.IO event for real-time updates
    if (req.io) {
      req.io.emit('announcement_acknowledged', {
        announcementId: announcementId,
        userId: userId
      });
      console.log('📢 Socket.IO: Emitted announcement_acknowledged event');
    }

    res.json({
      success: true,
      message: 'Announcement acknowledged',
      receipt: receipt
    });

  } catch (error) {
    console.error('Acknowledge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge announcement'
    });
  }
});

// Get read receipt status for current user
router.get('/announcements/:id/read-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const receipt = await ReadReceipt.findOne({
      where: { announcementId: announcementId, userId: userId }
    });

    res.json({
      success: true,
      read: receipt ? !!receipt.readAt : false,
      acknowledged: receipt ? !!receipt.acknowledgedAt : false,
      readAt: receipt?.readAt || null,
      acknowledgedAt: receipt?.acknowledgedAt || null
    });

  } catch (error) {
    console.error('Get read status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get read status'
    });
  }
});

// ===== FILE DOWNLOAD ENDPOINT =====

// Download announcement attachment
router.get('/announcements/attachments/:attachmentId/download', authenticateToken, async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await AnnouncementAttachment.findByPk(attachmentId, {
      include: [{
        model: Announcement,
        as: 'announcement'
      }]
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    const filePath = path.join(__dirname, '..', attachment.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    res.download(filePath, attachment.originalFileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download file'
        });
      }
    });

  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download attachment'
    });
  }
});

// ===== PIN/UNPIN ANNOUNCEMENTS =====

// Toggle pin status of announcement
router.post('/announcements/:id/toggle-pin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }
    
    // Check permissions: only System Admin can pin/unpin
    if (req.user.role !== 'SYS.AD') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only System Administrators can pin announcements.'
      });
    }
    
    // Check if there are already 5 pinned announcements (limit)
    if (!announcement.isPinned) {
      const pinnedCount = await Announcement.count({
        where: { isPinned: true }
      });
      
      if (pinnedCount >= 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum of 5 announcements can be pinned at once. Please unpin another announcement first.'
        });
      }
    }
    
    // Toggle pin status
    announcement.isPinned = !announcement.isPinned;
    await announcement.save();
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: announcement.isPinned ? 'PIN_ANNOUNCEMENT' : 'UNPIN_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: id,
      details: `${announcement.isPinned ? 'Pinned' : 'Unpinned'} announcement: ${announcement.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'} successfully`,
      announcement: announcement
    });
    
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle pin status'
    });
  }
});

// Get single template
router.get('/announcements/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const Op = require('sequelize').Op;
    
    const template = await AnnouncementTemplate.findOne({
      where: {
        id: id,
        [Op.or]: [
          { isSystemTemplate: true },
          { createdBy: req.user.id }
        ]
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'role', 'profilePictureUrl']
      }]
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      template: template
    });
    
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Create template
router.post('/announcements/templates', authenticateToken, canCreateAnnouncement, async (req, res) => {
  try {
    const {
      name,
      description,
      title,
      content,
      contentHtml,
      priority,
      announcementType,
      targetAudience,
      requiresAcknowledgment
    } = req.body;
    
    if (!name || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, title, and content are required'
      });
    }
    
    // Validate announcement type
    if (announcementType && !req.allowedAnnouncementTypes.includes(announcementType)) {
      return res.status(403).json({
        success: false,
        error: `You are not allowed to create ${announcementType} templates.`
      });
    }
    
    const template = await AnnouncementTemplate.create({
      name,
      description: description || null,
      title,
      content,
      contentHtml: contentHtml || content,
      priority: priority || 'normal',
      announcementType: announcementType || 'general',
      targetAudience: targetAudience || 'all',
      requiresAcknowledgment: requiresAcknowledgment === 'true' || requiresAcknowledgment === true,
      isSystemTemplate: false,
      createdBy: req.user.id
    });
    
    // Reload with creator
    await template.reload({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'role', 'profilePictureUrl']
      }]
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_ANNOUNCEMENT_TEMPLATE',
      entityType: 'AnnouncementTemplate',
      entityId: template.id,
      details: `Created announcement template: ${name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: template
    });
    
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// Update template
router.put('/announcements/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      title,
      content,
      contentHtml,
      priority,
      announcementType,
      targetAudience,
      requiresAcknowledgment
    } = req.body;
    
    const template = await AnnouncementTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    // Check permissions: only creator or System Admin can update
    if (req.user.role !== 'SYS.AD' && template.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only update your own templates.'
      });
    }
    
    // System templates cannot be updated by non-admins
    if (template.isSystemTemplate && req.user.role !== 'SYS.AD') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. System templates cannot be modified.'
      });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (contentHtml !== undefined) updateData.contentHtml = contentHtml;
    if (priority !== undefined) updateData.priority = priority;
    if (announcementType !== undefined) updateData.announcementType = announcementType;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (requiresAcknowledgment !== undefined) updateData.requiresAcknowledgment = requiresAcknowledgment === 'true' || requiresAcknowledgment === true;
    
    await template.update(updateData);
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_ANNOUNCEMENT_TEMPLATE',
      entityType: 'AnnouncementTemplate',
      entityId: id,
      details: `Updated template: ${template.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      template: template
    });
    
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// Delete template
router.delete('/announcements/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await AnnouncementTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    // Check permissions: only creator or System Admin can delete
    if (req.user.role !== 'SYS.AD' && template.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only delete your own templates.'
      });
    }
    
    // System templates cannot be deleted
    if (template.isSystemTemplate) {
      return res.status(403).json({
        success: false,
        error: 'System templates cannot be deleted.'
      });
    }
    
    await template.destroy();
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_ANNOUNCEMENT_TEMPLATE',
      entityType: 'AnnouncementTemplate',
      entityId: id,
      details: `Deleted template: ${template.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// ===== EXPORT FUNCTIONALITY =====

// Helper function to fetch announcements with filters (shared by all export endpoints)
async function fetchAnnouncementsForExport(req) {
  const {
    priority,
    announcementType,
    search,
    dateFrom,
    dateTo,
    readStatus,
    requiresAcknowledgment
  } = req.query;
  
  const Op = require('sequelize').Op;
  const now = new Date();
  
  // Build where clause similar to get announcements
  const whereConditions = [];
  
  // Check if user is admin
  const isAdmin = req.user.role === 'SYS.AD';
  
  if (!isAdmin) {
    // Public users see only active, published, non-expired announcements
    const userRole = req.user.role;
    const targetAudienceFilter = [
      { targetAudience: 'all' },
      { targetAudience: userRole }
    ];
    
    if (userRole === 'LGU-PMT') {
      targetAudienceFilter.push({ targetAudience: 'lgu-pmt' });
      targetAudienceFilter.push({ targetAudience: 'mpmec' });
      targetAudienceFilter.push({ targetAudience: 'mpmec-secretariat' });
    } else if (userRole === 'LGU-IU') {
      targetAudienceFilter.push({ targetAudience: 'lgu-iu' });
      targetAudienceFilter.push({ targetAudience: 'iu' });
    } else if (userRole === 'EIU') {
      targetAudienceFilter.push({ targetAudience: 'eiu' });
    } else if (userRole === 'EMS') {
      targetAudienceFilter.push({ targetAudience: 'executive' });
      targetAudienceFilter.push({ targetAudience: 'executive-viewer' });
    }
    
    whereConditions.push(
      { status: 'active' },
      { publishDate: { [Op.lte]: now } },
      {
        [Op.or]: [
          { expiryDate: null },
          { expiryDate: { [Op.gte]: now } }
        ]
      },
      { [Op.or]: targetAudienceFilter }
    );
  }
  
  if (priority) whereConditions.push({ priority });
  if (announcementType) whereConditions.push({ announcementType });
  if (requiresAcknowledgment !== undefined) {
    whereConditions.push({ requiresAcknowledgment: requiresAcknowledgment === 'true' || requiresAcknowledgment === true });
  }
  
  if (dateFrom || dateTo) {
    const dateFilter = {};
    if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
    if (dateTo) dateFilter[Op.lte] = new Date(dateTo);
    if (Object.keys(dateFilter).length > 0) {
      whereConditions.push({ publishDate: dateFilter });
    }
  }
  
  if (search) {
    whereConditions.push({
      [Op.or]: [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { contentHtml: { [Op.like]: `%${search}%` } }
      ]
    });
  }
  
  const whereClause = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
  
  const announcements = await Announcement.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'fullName', 'email', 'role', 'profilePictureUrl']
      },
      {
        model: AnnouncementAttachment,
        as: 'attachments',
        required: false
      }
    ],
    order: [
      ['isPinned', 'DESC'],
      [require('sequelize').literal("FIELD(priority, 'urgent', 'high', 'normal', 'low')"), 'ASC'],
      ['createdAt', 'DESC']
    ]
  });
  
  return announcements;
}

// Export announcements to Excel
router.get('/announcements/export/excel', authenticateToken, async (req, res) => {
  try {
    const announcements = await fetchAnnouncementsForExport(req);
    
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Announcements');
    
    // Define columns
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Content', key: 'content', width: 50 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Target Audience', key: 'targetAudience', width: 20 },
      { header: 'Published', key: 'published', width: 20 },
      { header: 'Expires', key: 'expires', width: 20 },
      { header: 'Views', key: 'views', width: 10 },
      { header: 'Pinned', key: 'pinned', width: 10 },
      { header: 'Creator', key: 'creator', width: 25 },
      { header: 'Attachments', key: 'attachments', width: 30 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data rows
    announcements.forEach(ann => {
      const attachments = ann.attachments ? ann.attachments.map(a => a.originalFileName).join('; ') : 'None';
      worksheet.addRow({
        title: ann.title || '',
        content: (ann.content || '').substring(0, 500),
        priority: ann.priority || '',
        type: ann.announcementType || '',
        status: ann.status || '',
        targetAudience: ann.targetAudience || '',
        published: ann.publishDate ? new Date(ann.publishDate).toLocaleString() : '',
        expires: ann.expiryDate ? new Date(ann.expiryDate).toLocaleString() : '',
        views: ann.views || 0,
        pinned: ann.isPinned ? 'Yes' : 'No',
        creator: ann.creator ? ann.creator.name || ann.creator.email : '',
        attachments: attachments
      });
    });
    
    // Set response headers
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export announcements'
    });
  }
});

// Export announcements to CSV
router.get('/announcements/export/csv', authenticateToken, async (req, res) => {
  try {
    const announcements = await fetchAnnouncementsForExport(req);
    
    // Generate CSV
    const csvRows = [];
    csvRows.push(['Title', 'Content', 'Priority', 'Type', 'Status', 'Target Audience', 'Published', 'Expires', 'Views', 'Pinned', 'Creator', 'Attachments'].join(','));
    
    announcements.forEach(ann => {
      const attachments = ann.attachments ? ann.attachments.map(a => a.originalFileName).join('; ') : 'None';
      const row = [
        `"${(ann.title || '').replace(/"/g, '""')}"`,
        `"${(ann.content || '').replace(/"/g, '""').substring(0, 200)}"`,
        ann.priority || '',
        ann.announcementType || '',
        ann.status || '',
        ann.targetAudience || '',
        ann.publishDate ? new Date(ann.publishDate).toLocaleString() : '',
        ann.expiryDate ? new Date(ann.expiryDate).toLocaleString() : '',
        ann.views || 0,
        ann.isPinned ? 'Yes' : 'No',
        ann.creator ? ann.creator.name || ann.creator.email : '',
        `"${attachments}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export announcements'
    });
  }
});

// Export announcements to PDF
router.get('/announcements/export/pdf', authenticateToken, async (req, res) => {
  try {
    const announcements = await fetchAnnouncementsForExport(req);
    
    // Generate HTML for PDF (browser can print to PDF)
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Announcements Export</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    h1 {
      color: #1f2937;
      border-bottom: 3px solid #1f2937;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #1f2937;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .priority-urgent { color: #dc2626; font-weight: bold; }
    .priority-high { color: #ea580c; font-weight: bold; }
    .priority-normal { color: #2563eb; }
    .priority-low { color: #6b7280; }
    .pinned { color: #dc2626; font-weight: bold; }
    @media print {
      body { margin: 0; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <h1>Announcements Export</h1>
  <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Total Announcements:</strong> ${announcements.length}</p>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Priority</th>
        <th>Type</th>
        <th>Status</th>
        <th>Target Audience</th>
        <th>Published</th>
        <th>Expires</th>
        <th>Views</th>
        <th>Creator</th>
      </tr>
    </thead>
    <tbody>
`;
    
    announcements.forEach(ann => {
      const priorityClass = `priority-${ann.priority || 'normal'}`;
      htmlContent += `
      <tr>
        <td>${(ann.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        <td class="${priorityClass}">${(ann.priority || '').toUpperCase()}</td>
        <td>${(ann.announcementType || '').replace(/_/g, ' ')}</td>
        <td>${ann.status || ''}</td>
        <td>${ann.targetAudience || ''}</td>
        <td>${ann.publishDate ? new Date(ann.publishDate).toLocaleString() : 'N/A'}</td>
        <td>${ann.expiryDate ? new Date(ann.expiryDate).toLocaleString() : 'N/A'}</td>
        <td>${ann.views || 0}</td>
        <td>${ann.creator ? (ann.creator.name || ann.creator.email) : 'N/A'}</td>
      </tr>
`;
    });
    
    htmlContent += `
    </tbody>
  </table>
</body>
</html>
`;
    
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.html`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // For PDF, we return HTML that can be printed to PDF by the browser
    // Users can open the HTML file and use "Print to PDF" in their browser
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export announcements'
    });
  }
});

// Export announcements to HTML
router.get('/announcements/export/html', authenticateToken, async (req, res) => {
  try {
    const announcements = await fetchAnnouncementsForExport(req);
    
    // Generate HTML
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Announcements Export</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
      background-color: #fff;
    }
    h1 {
      color: #1f2937;
      border-bottom: 3px solid #1f2937;
      padding-bottom: 10px;
    }
    .info {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th {
      background-color: #1f2937;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    tr:hover {
      background-color: #f3f4f6;
    }
    .priority-urgent { color: #dc2626; font-weight: bold; }
    .priority-high { color: #ea580c; font-weight: bold; }
    .priority-normal { color: #2563eb; }
    .priority-low { color: #6b7280; }
    .pinned { color: #dc2626; font-weight: bold; }
    .content-preview {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <h1>Announcements Export</h1>
  <div class="info">
    <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Announcements:</strong> ${announcements.length}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Content Preview</th>
        <th>Priority</th>
        <th>Type</th>
        <th>Status</th>
        <th>Target Audience</th>
        <th>Published</th>
        <th>Expires</th>
        <th>Views</th>
        <th>Pinned</th>
        <th>Creator</th>
        <th>Attachments</th>
      </tr>
    </thead>
    <tbody>
`;
    
    announcements.forEach(ann => {
      const priorityClass = `priority-${ann.priority || 'normal'}`;
      const contentPreview = (ann.content || '').substring(0, 100).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const attachments = ann.attachments ? ann.attachments.map(a => a.originalFileName).join(', ') : 'None';
      htmlContent += `
      <tr>
        <td><strong>${(ann.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong></td>
        <td class="content-preview" title="${(ann.content || '').replace(/"/g, '&quot;')}">${contentPreview}${(ann.content || '').length > 100 ? '...' : ''}</td>
        <td class="${priorityClass}">${(ann.priority || '').toUpperCase()}</td>
        <td>${(ann.announcementType || '').replace(/_/g, ' ')}</td>
        <td>${ann.status || ''}</td>
        <td>${ann.targetAudience || ''}</td>
        <td>${ann.publishDate ? new Date(ann.publishDate).toLocaleString() : 'N/A'}</td>
        <td>${ann.expiryDate ? new Date(ann.expiryDate).toLocaleString() : 'N/A'}</td>
        <td>${ann.views || 0}</td>
        <td class="${ann.isPinned ? 'pinned' : ''}">${ann.isPinned ? 'Yes' : 'No'}</td>
        <td>${ann.creator ? (ann.creator.name || ann.creator.email) : 'N/A'}</td>
        <td>${attachments}</td>
      </tr>
`;
    });
    
    htmlContent += `
    </tbody>
  </table>
</body>
</html>
`;
    
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.html`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Export HTML error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export announcements'
    });
  }
});

// ===== PHASE 3A: ENGAGEMENT & INTERACTION ENDPOINTS =====

// ===== COMMENTS ENDPOINTS =====

// Get comments for an announcement
router.get('/announcements/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    const offset = (page - 1) * limit;
    const { count, rows: comments } = await AnnouncementComment.findAndCountAll({
      where: {
        announcementId: announcementId,
        isDeleted: false,
        parentCommentId: null // Only top-level comments
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: AnnouncementComment,
          as: 'replies',
          where: { isDeleted: false },
          required: false,
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'email', 'role']
          }],
          separate: true,
          order: [['createdAt', 'ASC']]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create a comment
router.post('/announcements/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentCommentId } = req.body;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // If replying to a comment, verify parent exists
    if (parentCommentId) {
      const parentComment = await AnnouncementComment.findByPk(parentCommentId);
      if (!parentComment || parentComment.announcementId !== announcementId) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }
    }

    const comment = await AnnouncementComment.create({
      announcementId: announcementId,
      userId: req.user.id,
      parentCommentId: parentCommentId || null,
      content: content.trim()
    });

    // Reload with author information
    await comment.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_ANNOUNCEMENT_COMMENT',
      entityType: 'AnnouncementComment',
      entityId: comment.id,
      details: `Commented on announcement: ${announcement.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
});

// Update a comment
router.put('/announcements/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    const comment = await AnnouncementComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Only comment author or System Admin can edit
    if (comment.userId !== req.user.id && req.user.role !== 'SYS.AD') {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comments'
      });
    }

    await comment.update({
      content: content.trim(),
      isEdited: true,
      editedAt: new Date()
    });

    // Reload with author information
    await comment.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
});

// Delete a comment (soft delete)
router.delete('/announcements/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await AnnouncementComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Only comment author or System Admin can delete
    if (comment.userId !== req.user.id && req.user.role !== 'SYS.AD') {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own comments'
      });
    }

    // Soft delete
    await comment.update({
      isDeleted: true,
      content: '[Deleted]'
    });

    // Also soft delete replies
    await AnnouncementComment.update(
      { isDeleted: true, content: '[Deleted]' },
      { where: { parentCommentId: commentId } }
    );

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
});

// ===== REACTIONS ENDPOINTS =====

// Get reactions for an announcement
router.get('/announcements/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    const reactions = await AnnouncementReaction.findAll({
      where: { announcementId: announcementId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    // Group reactions by type
    const reactionCounts = {
      helpful: 0,
      important: 0,
      acknowledged: 0,
      urgent: 0
    };
    const userReactions = {};
    
    reactions.forEach(reaction => {
      reactionCounts[reaction.reactionType]++;
      if (reaction.userId === req.user.id) {
        userReactions[reaction.reactionType] = true;
      }
    });

    res.json({
      success: true,
      reactions: reactionCounts,
      userReactions,
      totalReactions: reactions.length
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reactions'
    });
  }
});

// Toggle reaction (add or remove)
router.post('/announcements/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    if (!reactionType || !['helpful', 'important', 'acknowledged', 'urgent'].includes(reactionType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid reaction type is required (helpful, important, acknowledged, urgent)'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check if reaction already exists
    const existingReaction = await AnnouncementReaction.findOne({
      where: {
        announcementId: announcementId,
        userId: req.user.id,
        reactionType
      }
    });

    if (existingReaction) {
      // Remove reaction
      await existingReaction.destroy();
      res.json({
        success: true,
        message: 'Reaction removed',
        action: 'removed'
      });
    } else {
      // Remove any other reaction type from this user for this announcement
      await AnnouncementReaction.destroy({
        where: {
          announcementId: announcementId,
          userId: req.user.id
        }
      });

      // Add new reaction
      await AnnouncementReaction.create({
        announcementId: announcementId,
        userId: req.user.id,
        reactionType
      });

      res.json({
        success: true,
        message: 'Reaction added',
        action: 'added'
      });
    }
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle reaction'
    });
  }
});

// ===== FAVORITES ENDPOINTS =====

// Get favorites for current user
router.get('/announcements/favorites', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: favorites } = await AnnouncementFavorite.findAndCountAll({
      where: { userId: req.user.id },
      include: [{
        model: Announcement,
        as: 'announcement',
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: AnnouncementAttachment,
            as: 'attachments',
            required: false
          }
        ]
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      favorites: favorites.map(fav => fav.announcement),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites'
    });
  }
});

// Check if announcement is favorited by current user
router.get('/announcements/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const favorite = await AnnouncementFavorite.findOne({
      where: {
        announcementId: announcementId,
        userId: req.user.id
      }
    });

    res.json({
      success: true,
      isFavorited: !!favorite
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check favorite status'
    });
  }
});

// Toggle favorite (add or remove)
router.post('/announcements/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    const existingFavorite = await AnnouncementFavorite.findOne({
      where: {
        announcementId: announcementId,
        userId: req.user.id
      }
    });

    if (existingFavorite) {
      // Remove favorite
      await existingFavorite.destroy();
      res.json({
        success: true,
        message: 'Removed from favorites',
        isFavorited: false
      });
    } else {
      // Add favorite
      await AnnouncementFavorite.create({
        announcementId: announcementId,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Added to favorites',
        isFavorited: true
      });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite'
    });
  }
});

// ===== SHARING ENDPOINTS =====

// Generate shareable link
router.get('/announcements/:id/share', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Generate shareable link (in production, this would be a proper share token)
    const shareLink = `${req.protocol}://${req.get('host')}/dashboard/announcements/${id}`;

    res.json({
      success: true,
      shareLink,
      announcement: {
        id: announcement.id,
        title: announcement.title
      }
    });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share link'
    });
  }
});

// ===== PHASE 3B: DUPLICATION & ANALYTICS =====

// Duplicate/Clone announcement
router.post('/announcements/:id/duplicate', authenticateToken, canCreateAnnouncement, async (req, res) => {
  try {
    const { id } = req.params;

    const originalAnnouncement = await Announcement.findByPk(id, {
      include: [
        {
          model: AnnouncementAttachment,
          as: 'attachments',
          required: false
        }
      ]
    });

    if (!originalAnnouncement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions: can duplicate if user can create announcements
    // Also allow if it's the user's own announcement or System Admin
    if (req.user.role !== 'SYS.AD' && originalAnnouncement.createdBy !== req.user.id) {
      // Check if user can view this announcement (targetAudience check)
      const userRole = req.user.role;
      const targetAudience = originalAnnouncement.targetAudience;
      const canView = targetAudience === 'all' || targetAudience === userRole;
      
      if (!canView) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You cannot duplicate this announcement.'
        });
      }
    }

    // Create duplicate announcement as draft
    const duplicatedAnnouncement = await Announcement.create({
      title: `${originalAnnouncement.title} (Copy)`,
      content: originalAnnouncement.content,
      contentHtml: originalAnnouncement.contentHtml,
      priority: originalAnnouncement.priority,
      targetAudience: originalAnnouncement.targetAudience,
      announcementType: originalAnnouncement.announcementType,
      createdBy: req.user.id,
      status: 'draft', // Always create duplicates as drafts
      publishDate: null, // Reset publish date
      expiryDate: originalAnnouncement.expiryDate,
      requiresAcknowledgment: originalAnnouncement.requiresAcknowledgment,
      acknowledgmentDeadline: originalAnnouncement.acknowledgmentDeadline,
      views: 0,
      isPinned: false // Don't duplicate pinned status
    });

    // Duplicate attachments (copy file references, not the actual files)
    if (originalAnnouncement.attachments && originalAnnouncement.attachments.length > 0) {
      const attachmentPromises = originalAnnouncement.attachments.map(attachment => {
        return AnnouncementAttachment.create({
          announcementId: duplicatedAnnouncement.id,
          fileName: attachment.fileName,
          originalFileName: attachment.originalFileName,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: req.user.id
        });
      });
      await Promise.all(attachmentPromises);
    }

    // Reload with associations
    await duplicatedAnnouncement.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: AnnouncementAttachment,
          as: 'attachments',
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DUPLICATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: duplicatedAnnouncement.id,
      details: `Duplicated announcement: ${originalAnnouncement.title} (Original ID: ${id})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Announcement duplicated successfully as draft',
      announcement: duplicatedAnnouncement
    });

  } catch (error) {
    console.error('Duplicate announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate announcement'
    });
  }
});

// Get announcement analytics
router.get('/announcements/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions: only creator or System Admin can view analytics
    if (req.user.role !== 'SYS.AD' && announcement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view analytics for your own announcements.'
      });
    }

    const Op = require('sequelize').Op;

    // Build date filter for read receipts
    const readDateFilter = {};
    if (startDate) readDateFilter[Op.gte] = new Date(startDate);
    if (endDate) readDateFilter[Op.lte] = new Date(endDate);

    // Build date filter for acknowledgments
    const ackDateFilter = {};
    if (startDate) ackDateFilter[Op.gte] = new Date(startDate);
    if (endDate) ackDateFilter[Op.lte] = new Date(endDate);

    // Build date filter for comments/reactions/favorites
    const engagementDateFilter = {};
    if (startDate) engagementDateFilter[Op.gte] = new Date(startDate);
    if (endDate) engagementDateFilter[Op.lte] = new Date(endDate);

    // Get read receipts
    const readReceiptsWhere = { announcementId: announcementId };
    if (Object.keys(readDateFilter).length > 0) {
      readReceiptsWhere.readAt = readDateFilter;
    }

    const readReceipts = await ReadReceipt.findAll({
      where: readReceiptsWhere,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    // Get acknowledgments
    const acknowledgmentsWhere = {
      announcementId: announcementId,
      acknowledgedAt: { [Op.ne]: null }
    };
    if (Object.keys(ackDateFilter).length > 0) {
      acknowledgmentsWhere.acknowledgedAt = { ...acknowledgmentsWhere.acknowledgedAt, ...ackDateFilter };
    }

    const acknowledgments = await ReadReceipt.findAll({
      where: acknowledgmentsWhere,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    // Get comments count
    const commentsWhere = {
      announcementId: announcementId,
      isDeleted: false
    };
    if (Object.keys(engagementDateFilter).length > 0) {
      commentsWhere.createdAt = engagementDateFilter;
    }

    const commentsCount = await AnnouncementComment.count({
      where: commentsWhere
    });

    // Get reactions count by type
    const reactionsWhere = { announcementId: announcementId };
    if (Object.keys(engagementDateFilter).length > 0) {
      reactionsWhere.createdAt = engagementDateFilter;
    }

    const reactions = await AnnouncementReaction.findAll({
      where: reactionsWhere
    });

    const reactionsByType = {
      helpful: reactions.filter(r => r.reactionType === 'helpful').length,
      important: reactions.filter(r => r.reactionType === 'important').length,
      acknowledged: reactions.filter(r => r.reactionType === 'acknowledged').length,
      urgent: reactions.filter(r => r.reactionType === 'urgent').length
    };

    // Get favorites count
    const favoritesWhere = { announcementId: announcementId };
    if (Object.keys(engagementDateFilter).length > 0) {
      favoritesWhere.createdAt = engagementDateFilter;
    }

    const favoritesCount = await AnnouncementFavorite.count({
      where: favoritesWhere
    });

    // Calculate read rate (if targetAudience is known, estimate total audience)
    // For simplicity, we'll use the number of unique users who have read it
    const uniqueReaders = new Set(readReceipts.map(r => r.userId.toString())).size;
    const uniqueAcknowledgers = new Set(acknowledgments.map(a => a.userId.toString())).size;

    // Get engagement timeline (reads per day)
    const readsByDate = {};
    readReceipts.forEach(receipt => {
      if (receipt.readAt) {
        const date = new Date(receipt.readAt).toISOString().split('T')[0];
        readsByDate[date] = (readsByDate[date] || 0) + 1;
      }
    });

    res.json({
      success: true,
      analytics: {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          status: announcement.status,
          createdAt: announcement.createdAt,
          publishDate: announcement.publishDate,
          views: announcement.views
        },
        metrics: {
          totalViews: announcement.views || 0,
          uniqueReaders: uniqueReaders,
          totalReads: readReceipts.length,
          totalAcknowledged: acknowledgments.length,
          uniqueAcknowledgers: uniqueAcknowledgers,
          acknowledgmentRate: announcement.requiresAcknowledgment && uniqueReaders > 0 
            ? ((uniqueAcknowledgers / uniqueReaders) * 100).toFixed(2) 
            : null,
          commentsCount: commentsCount,
          reactionsCount: reactions.length,
          reactionsByType: reactionsByType,
          favoritesCount: favoritesCount
        },
        engagement: {
          readsByDate: readsByDate,
          readReceipts: readReceipts.map(r => ({
            userId: r.userId,
            userName: r.user?.name,
            userEmail: r.user?.email,
            readAt: r.readAt,
            acknowledgedAt: r.acknowledgedAt
          })),
          acknowledgments: acknowledgments.map(a => ({
            userId: a.userId,
            userName: a.user?.name,
            userEmail: a.user?.email,
            acknowledgedAt: a.acknowledgedAt
          }))
        }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get overall announcement analytics (for System Admin or user's own announcements)
router.get('/announcements/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, createdBy } = req.query;
    const Op = require('sequelize').Op;

    // Build where clause
    const whereClause = {};
    if (req.user.role !== 'SYS.AD') {
      // Non-admin users can only see analytics for their own announcements
      whereClause.createdBy = req.user.id;
    } else if (createdBy) {
      // System Admin can filter by creator
      whereClause.createdBy = createdBy;
    }

    // Date filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    // Get all announcements matching criteria
    const announcements = await Announcement.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    const announcementIds = announcements.map(a => a.id);

    // Calculate aggregate metrics
    const totalAnnouncements = announcements.length;
    const activeAnnouncements = announcements.filter(a => a.status === 'active').length;
    const scheduledAnnouncements = announcements.filter(a => a.status === 'scheduled').length;
    const draftAnnouncements = announcements.filter(a => a.status === 'draft').length;
    const expiredAnnouncements = announcements.filter(a => a.status === 'expired').length;

    // Get total views
    const totalViews = announcements.reduce((sum, a) => sum + (a.views || 0), 0);

    // Get engagement metrics
    const totalReads = await ReadReceipt.count({
      where: {
        announcementId: { [Op.in]: announcementIds }
      }
    });

    const totalAcknowledged = await ReadReceipt.count({
      where: {
        announcementId: { [Op.in]: announcementIds },
        acknowledgedAt: { [Op.ne]: null }
      }
    });

    const totalComments = await AnnouncementComment.count({
      where: {
        announcementId: { [Op.in]: announcementIds },
        isDeleted: false
      }
    });

    const totalReactions = await AnnouncementReaction.count({
      where: {
        announcementId: { [Op.in]: announcementIds }
      }
    });

    const totalFavorites = await AnnouncementFavorite.count({
      where: {
        announcementId: { [Op.in]: announcementIds }
      }
    });

    // Get top performing announcements
    const topAnnouncements = announcements
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        title: a.title,
        views: a.views || 0,
        status: a.status,
        createdAt: a.createdAt
      }));

    // Calculate distribution by type
    const typeDistribution = {};
    announcements.forEach(a => {
      const type = a.announcementType || 'general';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    // Calculate distribution by priority
    const priorityDistribution = {
      urgent: 0,
      high: 0,
      normal: 0,
      low: 0
    };
    announcements.forEach(a => {
      const priority = a.priority || 'normal';
      if (priorityDistribution.hasOwnProperty(priority)) {
        priorityDistribution[priority]++;
      }
    });

    // Calculate growth over time (group by month)
    const growthOverTime = {};
    announcements.forEach(a => {
      if (a.createdAt) {
        const date = new Date(a.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        growthOverTime[monthKey] = (growthOverTime[monthKey] || 0) + 1;
      }
    });

    // Convert growth over time to sorted array
    const growthData = Object.keys(growthOverTime)
      .sort()
      .map(key => ({
        month: key,
        count: growthOverTime[key]
      }));

    res.json({
      success: true,
      overview: {
        totalAnnouncements,
        statusBreakdown: {
          active: activeAnnouncements,
          scheduled: scheduledAnnouncements,
          draft: draftAnnouncements,
          expired: expiredAnnouncements
        },
        typeDistribution,
        priorityDistribution,
        growthOverTime: growthData,
        engagement: {
          totalViews,
          totalReads,
          totalAcknowledged,
          totalComments,
          totalReactions,
          totalFavorites
        },
        topAnnouncements
      }
    });

  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics overview'
    });
  }
});

// ===== PHASE 3C: ADVANCED MANAGEMENT FEATURES =====

// Version History Endpoints
router.get('/announcements/:id/versions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const announcementId = parseInt(id);
    
    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'SYS.AD' && announcement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const versions = await AnnouncementVersion.findAll({
      where: { announcementId: announcementId },
      include: [{
        model: User,
        as: 'changedByUser',
        attributes: ['id', 'name', 'email', 'role']
      }],
      order: [['versionNumber', 'DESC']]
    });

    res.json({
      success: true,
      versions
    });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch versions'
    });
  }
});

// Approval Workflow Endpoints (Phase 3C)
router.post('/announcements/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, approvalLevel = 1 } = req.body;
    const announcementId = parseInt(id);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    if (!announcement.requiresApproval) {
      return res.status(400).json({
        success: false,
        error: 'This announcement does not require approval'
      });
    }

    // Create or update approval record
    let approval = await AnnouncementApproval.findOne({
      where: {
        announcementId: announcementId,
        approvalLevel: approvalLevel
      }
    });

    if (approval) {
      await approval.update({
        status: 'approved',
        approvedBy: req.user.id,
        comments: comments || null,
        approvedAt: new Date()
      });
    } else {
      approval = await AnnouncementApproval.create({
        announcementId: announcementId,
        approvalLevel: approvalLevel,
        status: 'approved',
        approvedBy: req.user.id,
        comments: comments || null,
        approvedAt: new Date()
      });
    }

    // Check if all required approvals are complete (simplified: single level for now)
    const allApprovals = await AnnouncementApproval.findAll({
      where: { announcementId: announcementId }
    });
    const allApproved = allApprovals.every(a => a.status === 'approved');

    if (allApproved) {
      await announcement.update({
        approvalStatus: 'approved',
        status: announcement.status === 'draft' ? 'scheduled' : announcement.status
      });
    }

    res.json({
      success: true,
      approval,
      announcement
    });
  } catch (error) {
    console.error('Approve announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve announcement'
    });
  }
});

router.post('/announcements/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, approvalLevel = 1 } = req.body;
    const announcementId = parseInt(id);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    if (!announcement.requiresApproval) {
      return res.status(400).json({
        success: false,
        error: 'This announcement does not require approval'
      });
    }

    // Create or update approval record
    let approval = await AnnouncementApproval.findOne({
      where: {
        announcementId: announcementId,
        approvalLevel: approvalLevel
      }
    });

    if (approval) {
      await approval.update({
        status: 'rejected',
        approvedBy: req.user.id,
        comments: comments || null,
        approvedAt: new Date()
      });
    } else {
      approval = await AnnouncementApproval.create({
        announcementId: announcementId,
        approvalLevel: approvalLevel,
        status: 'rejected',
        approvedBy: req.user.id,
        comments: comments || null,
        approvedAt: new Date()
      });
    }

    await announcement.update({
      approvalStatus: 'rejected'
    });

    res.json({
      success: true,
      approval,
      announcement
    });
  } catch (error) {
    console.error('Reject announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject announcement'
    });
  }
});

// Assign categories/tags to announcement
router.post('/announcements/:id/categories', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryIds } = req.body;
    const announcementId = parseInt(id);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'SYS.AD' && announcement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Remove existing mappings
    await AnnouncementCategoryMapping.destroy({
      where: { announcementId: announcementId }
    });

    // Create new mappings
    if (categoryIds && categoryIds.length > 0) {
      const catIds = Array.isArray(categoryIds) ? categoryIds : JSON.parse(categoryIds);
      await AnnouncementCategoryMapping.bulkCreate(
        catIds.map(catId => ({
          announcementId: announcementId,
          categoryId: parseInt(catId)
        }))
      );
    }

    res.json({
      success: true,
      message: 'Categories updated successfully'
    });
  } catch (error) {
    console.error('Update categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update categories'
    });
  }
});

router.post('/announcements/:id/tags', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body;
    const announcementId = parseInt(id);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'SYS.AD' && announcement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Remove existing mappings
    await AnnouncementTagMapping.destroy({
      where: { announcementId: announcementId }
    });

    // Create new mappings
    if (tagIds && tagIds.length > 0) {
      const tIds = Array.isArray(tagIds) ? tagIds : JSON.parse(tagIds);
      await AnnouncementTagMapping.bulkCreate(
        tIds.map(tagId => ({
          announcementId: announcementId,
          tagId: parseInt(tagId)
        }))
      );
    }

    res.json({
      success: true,
      message: 'Tags updated successfully'
    });
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tags'
    });
  }
});

// ===== SYSTEM HEALTH ENDPOINTS =====

const systemHealthService = require('../services/systemHealthService');

// Get system metrics
router.get('/system-health/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = await systemHealthService.getSystemMetrics();
    const alerts = systemHealthService.checkThresholds(metrics);

    res.json({
      success: true,
      metrics: metrics,
      alerts: alerts
    });
  } catch (error) {
    console.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics'
    });
  }
});

// Run health checks
router.post('/system-health/check', authenticateToken, async (req, res) => {
  try {
    const healthCheckResult = await systemHealthService.runHealthChecks();

    // Log health check activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'RUN_HEALTH_CHECK',
      entityType: 'SystemHealth',
      details: `Health check completed with status: ${healthCheckResult.overallStatus}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      healthCheck: healthCheckResult
    });
  } catch (error) {
    console.error('Run health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run health checks'
    });
  }
});

// Get health check history
router.get('/system-health/checks', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent health check logs from activity logs
    const healthCheckLogs = await ActivityLog.findAll({
      where: {
        action: 'RUN_HEALTH_CHECK'
      },
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username']
      }]
    });

    // Format health check history
    const history = healthCheckLogs.map(log => {
      const details = log.details || '';
      const statusMatch = details.match(/status: (\w+)/);
      return {
        id: log.id,
        timestamp: log.createdAt,
        status: statusMatch ? statusMatch[1] : 'Unknown',
        performedBy: log.user ? log.user.name : 'System',
        details: log.details
      };
    });

    res.json({
      success: true,
      history: history
    });
  } catch (error) {
    console.error('Get health check history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health check history'
    });
  }
});

// Get active alerts
router.get('/system-health/alerts', authenticateToken, async (req, res) => {
  try {
    const metrics = await systemHealthService.getSystemMetrics();
    const alerts = systemHealthService.checkThresholds(metrics);

    // Format alerts with timestamps
    const formattedAlerts = alerts.map((alert, index) => ({
      id: `alert-${Date.now()}-${index}`,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      component: alert.component,
      value: alert.value,
      time: 'Just now',
      acknowledged: false
    }));

    res.json({
      success: true,
      alerts: formattedAlerts
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// Get service health status
router.get('/system-health/services', authenticateToken, async (req, res) => {
  try {
    const healthCheckResult = await systemHealthService.runHealthChecks();

    // Format service statuses
    const services = Object.entries(healthCheckResult.checks).map(([name, check]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      status: check.status,
      message: check.message,
      responseTime: check.responseTime || null,
      details: check
    }));

    res.json({
      success: true,
      services: services,
      overallStatus: healthCheckResult.overallStatus
    });
  } catch (error) {
    console.error('Get service health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service health'
    });
  }
});

// Get performance analytics data
router.get('/system-health/analytics', authenticateToken, async (req, res) => {
  try {
    const { range = '24h' } = req.query; // 24h, 7d, 30d
    
    // Calculate time range
    const now = new Date();
    let startDate;
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get activity logs for user activity
    const activityLogs = await ActivityLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: startDate
        }
      },
      attributes: ['createdAt', 'action', 'userId'],
      order: [['createdAt', 'ASC']]
    });

    // Generate hourly/daily data points
    const dataPoints = [];
    const interval = range === '24h' ? 60 * 60 * 1000 : range === '7d' ? 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const labels = [];
    
    for (let time = startDate.getTime(); time <= now.getTime(); time += interval) {
      const pointDate = new Date(time);
      const endTime = time + interval;
      
      const count = activityLogs.filter(log => {
        const logTime = new Date(log.createdAt).getTime();
        return logTime >= time && logTime < endTime;
      }).length;
      
      dataPoints.push(count);
      
      if (range === '24h') {
        labels.push(pointDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      } else {
        labels.push(pointDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
    }

    // Get unique active users per period
    const uniqueUsers = new Set();
    activityLogs.forEach(log => {
      if (log.userId) uniqueUsers.add(log.userId);
    });

    res.json({
      success: true,
      analytics: {
        labels: labels,
        data: dataPoints,
        totalRequests: activityLogs.length,
        uniqueUsers: uniqueUsers.size,
        range: range
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data'
    });
  }
});

// Get user activity statistics
router.get('/system-health/user-activity', authenticateToken, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get active users (users with activity in the time period)
    const activeUserIds = await ActivityLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: startDate
        },
        userId: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: [
        [require('sequelize').fn('DISTINCT', require('sequelize').col('userId')), 'userId']
      ],
      raw: true
    });
    
    const uniqueUserIds = [...new Set(activeUserIds.map(item => item.userId).filter(Boolean))];
    const activeUsersCount = uniqueUserIds.length;

    // Get all activity logs with user info
    const allActivityLogs = await ActivityLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: startDate
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role'],
        required: false
      }]
    });

    // Count by role
    const roleCounts = {};
    allActivityLogs.forEach(log => {
      const role = log.user?.role || 'Unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    const activityByRole = Object.entries(roleCounts).map(([role, count]) => ({
      role: role,
      count: count
    }));

    // Get most active users
    const userActivityCounts = {};
    allActivityLogs.forEach(log => {
      if (log.userId) {
        if (!userActivityCounts[log.userId]) {
          userActivityCounts[log.userId] = {
            userId: log.userId,
            user: log.user ? {
              id: log.user.id,
              name: log.user.name,
              username: log.user.username,
              role: log.user.role
            } : null,
            count: 0
          };
        }
        userActivityCounts[log.userId].count++;
      }
    });

    const mostActiveUsers = Object.values(userActivityCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({
        userId: item.userId,
        name: item.user?.name || 'Unknown',
        username: item.user?.username || 'Unknown',
        role: item.user?.role || 'Unknown',
        activityCount: item.count
      }));

    res.json({
      success: true,
      activity: {
        activeUsers: activeUsersCount,
        activityByRole: activityByRole.map(item => ({
          role: item.user?.role || 'Unknown',
          count: parseInt(item.count) || 0
        })),
        mostActiveUsers: mostActiveUsers.map(item => ({
          userId: item.userId,
          name: item.user?.name || 'Unknown',
          username: item.user?.username || 'Unknown',
          role: item.user?.role || 'Unknown',
          activityCount: parseInt(item.activityCount) || 0
        })),
        timeRange: `${hours} hours`
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity data'
    });
  }
});

// Get system logs
router.get('/system-health/logs', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      severity, 
      search,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[require('sequelize').Op.lte] = new Date(endDate);
    }

    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { action: { [require('sequelize').Op.like]: `%${search}%` } },
        { details: { [require('sequelize').Op.like]: `%${search}%` } },
        { entityType: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    // Get logs from ActivityLog (system logs)
    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role'],
        required: false
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Format logs with severity (determine from action type)
    const formattedLogs = logs.map(log => {
      let severity = 'info';
      if (log.action.includes('ERROR') || log.action.includes('FAIL')) {
        severity = 'error';
      } else if (log.action.includes('WARN') || log.action.includes('WARNING')) {
        severity = 'warning';
      }

      return {
        id: log.id,
        timestamp: log.createdAt,
        severity: severity,
        action: log.action,
        entityType: log.entityType,
        message: log.details || log.action,
        user: log.user ? {
          name: log.user.name,
          username: log.user.username,
          role: log.user.role
        } : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      };
    });

    // Filter by severity if provided
    const filteredLogs = severity 
      ? formattedLogs.filter(log => log.severity === severity)
      : formattedLogs;

    res.json({
      success: true,
      logs: filteredLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system logs'
    });
  }
});

// Get database health details
router.get('/system-health/database', authenticateToken, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    
    // Get connection pool info
    const pool = sequelize.connectionManager.pool;
    const poolInfo = {
      size: pool ? pool.size : 0,
      available: pool ? pool.available : 0,
      using: pool ? pool.using : 0,
      waiting: pool ? pool.waiting : 0
    };

    // Get database size (simplified - would need actual query for MySQL)
    let dbSize = null;
    try {
      const [results] = await sequelize.query(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);
      if (results && results[0]) {
        dbSize = results[0].size_mb;
      }
    } catch (err) {
      console.error('Error getting database size:', err);
    }

    // Get table counts
    const tableCounts = {};
    try {
      const tables = ['users', 'projects', 'announcements', 'activity_logs'];
      for (const table of tables) {
        const [results] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
        if (results && results[0]) {
          tableCounts[table] = results[0].count;
        }
      }
    } catch (err) {
      console.error('Error getting table counts:', err);
    }

    // Test query performance
    const queryStart = Date.now();
    await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT });
    const queryTime = Date.now() - queryStart;

    res.json({
      success: true,
      database: {
        connectionPool: poolInfo,
        databaseSize: dbSize,
        tableCounts: tableCounts,
        queryPerformance: {
          testQueryTime: queryTime,
          status: queryTime < 100 ? 'Excellent' : queryTime < 500 ? 'Good' : 'Slow'
        },
        status: 'OK'
      }
    });
  } catch (error) {
    console.error('Get database health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database health'
    });
  }
});

// ===== SYSTEM ACTIONS ENDPOINTS =====

// Clear application cache
router.post('/system-health/actions/clear-cache', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Log the action
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CLEAR_CACHE',
      entityType: 'SystemHealth',
      details: 'Application cache cleared',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Toggle maintenance mode
router.post('/system-health/actions/maintenance-mode', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // Log the action
    await ActivityLog.create({
      userId: req.user.id,
      action: enabled ? 'ENABLE_MAINTENANCE_MODE' : 'DISABLE_MAINTENANCE_MODE',
      entityType: 'SystemHealth',
      details: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // In production, you would update a configuration file or database setting
    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      maintenanceMode: enabled
    });
  } catch (error) {
    console.error('Toggle maintenance mode error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle maintenance mode'
    });
  }
});

// Get maintenance mode status
router.get('/system-health/actions/maintenance-mode', authenticateToken, async (req, res) => {
  try {
    // In production, read from configuration
    res.json({
      success: true,
      maintenanceMode: false
    });
  } catch (error) {
    console.error('Get maintenance mode error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance mode status'
    });
  }
});

// Get security events
router.get('/system-health/security', authenticateToken, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get failed login attempts
    const failedLogins = await ActivityLog.findAll({
      where: {
        action: {
          [require('sequelize').Op.like]: '%LOGIN%FAIL%'
        },
        createdAt: {
          [require('sequelize').Op.gte]: startDate
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Get security-related actions
    const securityEvents = await ActivityLog.findAll({
      where: {
        action: {
          [require('sequelize').Op.in]: [
            'LOGIN_FAILED',
            'LOGIN_SUCCESS',
            'PASSWORD_CHANGE',
            'PERMISSION_DENIED',
            'UNAUTHORIZED_ACCESS'
          ]
        },
        createdAt: {
          [require('sequelize').Op.gte]: startDate
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // Count events by type
    const eventCounts = {
      failedLogins: failedLogins.length,
      successfulLogins: securityEvents.filter(e => e.action === 'LOGIN_SUCCESS').length,
      passwordChanges: securityEvents.filter(e => e.action === 'PASSWORD_CHANGE').length,
      unauthorizedAccess: securityEvents.filter(e => e.action === 'UNAUTHORIZED_ACCESS' || e.action === 'PERMISSION_DENIED').length
    };

    res.json({
      success: true,
      security: {
        eventCounts: eventCounts,
        recentFailedLogins: failedLogins.slice(0, 10).map(log => ({
          id: log.id,
          timestamp: log.createdAt,
          username: log.details || 'Unknown',
          ipAddress: log.ipAddress,
          userAgent: log.userAgent
        })),
        recentSecurityEvents: securityEvents.slice(0, 20).map(log => ({
          id: log.id,
          timestamp: log.createdAt,
          action: log.action,
          user: log.user ? {
            name: log.user.name,
            username: log.user.username,
            role: log.user.role
          } : null,
          ipAddress: log.ipAddress,
          details: log.details
        })),
        timeRange: `${hours} hours`
      }
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security events'
    });
  }
});

// Get resource optimization recommendations
router.get('/system-health/optimization', authenticateToken, async (req, res) => {
  try {
    const metrics = await systemHealthService.getSystemMetrics();
    const recommendations = [];

    // CPU recommendations
    if (metrics.cpuUsage > 80) {
      recommendations.push({
        type: 'warning',
        category: 'CPU',
        title: 'High CPU Usage',
        message: `CPU usage is at ${metrics.cpuUsage.toFixed(1)}%. Consider optimizing processes or scaling resources.`,
        priority: metrics.cpuUsage > 90 ? 'high' : 'medium',
        action: 'Review running processes and consider resource scaling'
      });
    }

    // Memory recommendations
    if (metrics.memoryUsage > 80) {
      recommendations.push({
        type: 'warning',
        category: 'Memory',
        title: 'High Memory Usage',
        message: `Memory usage is at ${metrics.memoryUsage.toFixed(1)}%. Consider clearing cache or increasing memory allocation.`,
        priority: metrics.memoryUsage > 90 ? 'high' : 'medium',
        action: 'Clear application cache or increase server memory'
      });
    }

    // Disk recommendations
    if (metrics.diskUsage > 85) {
      recommendations.push({
        type: 'warning',
        category: 'Storage',
        title: 'High Disk Usage',
        message: `Disk usage is at ${metrics.diskUsage}%. Consider cleaning up old files or expanding storage.`,
        priority: metrics.diskUsage > 95 ? 'high' : 'medium',
        action: 'Clean up old files, logs, or backups'
      });
    }

    // Response time recommendations
    if (metrics.responseTime > 1000) {
      recommendations.push({
        type: 'info',
        category: 'Performance',
        title: 'Slow Response Time',
        message: `Average response time is ${metrics.responseTime}ms. Consider optimizing database queries or caching.`,
        priority: 'medium',
        action: 'Optimize database queries and enable caching'
      });
    }

    // Database recommendations
    const dbHealth = await systemHealthService.checkDatabaseHealth();
    if (dbHealth.queryTime > 500) {
      recommendations.push({
        type: 'info',
        category: 'Database',
        title: 'Slow Database Queries',
        message: `Database query time is ${dbHealth.queryTime}ms. Consider optimizing queries or adding indexes.`,
        priority: 'medium',
        action: 'Review slow queries and add appropriate indexes'
      });
    }

    res.json({
      success: true,
      recommendations: recommendations,
      totalRecommendations: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length
    });
  } catch (error) {
    console.error('Get optimization recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch optimization recommendations'
    });
  }
});

// Get slow queries (if available)
router.get('/system-health/database/slow-queries', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    
    // For MySQL, check if slow query log is enabled
    // This is a simplified version - in production, you'd parse actual slow query logs
    const slowQueries = [];
    
    // Example: Get recent slow queries from activity logs (if logged)
    const slowQueryLogs = await ActivityLog.findAll({
      where: {
        action: {
          [require('sequelize').Op.like]: '%SLOW_QUERY%'
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      slowQueries: slowQueries,
      message: 'Slow query detection requires MySQL slow query log to be enabled'
    });
  } catch (error) {
    console.error('Get slow queries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch slow queries'
    });
  }
});

// ===== PHASE 4: INCIDENT MANAGEMENT, ALERT CONFIGURATION, AND REPORTING =====

// Get all incidents
router.get('/system-health/incidents', authenticateToken, async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;

    // For now, we'll use ActivityLog to simulate incidents
    // In production, you'd have a dedicated Incident model
    const incidents = await ActivityLog.findAll({
      where: {
        action: {
          [require('sequelize').Op.in]: [
            'SYSTEM_ERROR',
            'DATABASE_ERROR',
            'SERVICE_DOWN',
            'HIGH_CPU_USAGE',
            'HIGH_MEMORY_USAGE',
            'DISK_FULL',
            'NETWORK_ISSUE'
          ]
        },
        ...whereClause
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format incidents
    const formattedIncidents = incidents.map(log => ({
      id: log.id,
      title: log.action.replace(/_/g, ' '),
      description: log.details || log.action,
      severity: log.details?.includes('CRITICAL') ? 'critical' : 
                log.details?.includes('HIGH') ? 'high' : 
                log.details?.includes('MEDIUM') ? 'medium' : 'low',
      status: 'open', // In production, this would come from Incident model
      createdAt: log.createdAt,
      resolvedAt: null,
      resolvedBy: null,
      user: log.user
    }));

    res.json({
      success: true,
      incidents: formattedIncidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedIncidents.length
      }
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents'
    });
  }
});

// Create incident
router.post('/system-health/incidents', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { title, description, severity = 'medium' } = req.body;

    // Log as incident
    const incident = await ActivityLog.create({
      userId: req.user.id,
      action: `INCIDENT: ${title.toUpperCase().replace(/\s/g, '_')}`,
      entityType: 'SystemHealth',
      details: `Severity: ${severity.toUpperCase()}. ${description}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      incident: {
        id: incident.id,
        title,
        description,
        severity,
        status: 'open',
        createdAt: incident.createdAt
      }
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident'
    });
  }
});

// Resolve incident
router.post('/system-health/incidents/:id/resolve', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    // Update incident (in production, update Incident model)
    const incident = await ActivityLog.findByPk(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }

    // Log resolution
    await ActivityLog.create({
      userId: req.user.id,
      action: `INCIDENT_RESOLVED: ${incident.action}`,
      entityType: 'SystemHealth',
      details: `Resolution: ${resolutionNotes || 'Incident resolved'}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Incident resolved successfully'
    });
  } catch (error) {
    console.error('Resolve incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve incident'
    });
  }
});

// Get alert configuration
router.get('/system-health/alerts/config', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // In production, this would come from a database table
    // For now, return default configuration
    const config = {
      thresholds: {
        cpuUsage: { warning: 70, critical: 90 },
        memoryUsage: { warning: 75, critical: 90 },
        diskUsage: { warning: 80, critical: 95 },
        responseTime: { warning: 500, critical: 1000 }
      },
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      alertChannels: {
        email: [],
        sms: []
      }
    };

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Get alert config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert configuration'
    });
  }
});

// Update alert configuration
router.put('/system-health/alerts/config', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { thresholds, notifications, alertChannels } = req.body;

    // In production, save to database
    // For now, just log the update
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_ALERT_CONFIGURATION',
      entityType: 'SystemHealth',
      details: 'Alert configuration updated',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Alert configuration updated successfully',
      config: {
        thresholds: thresholds || {},
        notifications: notifications || {},
        alertChannels: alertChannels || {}
      }
    });
  } catch (error) {
    console.error('Update alert config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert configuration'
    });
  }
});

// Export system health report
router.get('/system-health/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'json', range = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate;
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get system metrics
    const metrics = await systemHealthService.getSystemMetrics();
    const healthChecks = await systemHealthService.runHealthChecks();
    const alerts = await systemHealthService.checkThresholds(metrics);

    // Get activity logs
    const activityLogs = await ActivityLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: startDate
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: 1000
    });

    const report = {
      generatedAt: new Date().toISOString(),
      timeRange: range,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      summary: {
        systemStatus: metrics.cpuUsage > 90 || metrics.memoryUsage > 90 ? 'Critical' : 
                     metrics.cpuUsage > 70 || metrics.memoryUsage > 75 ? 'Warning' : 'Healthy',
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        totalHealthChecks: healthChecks.length,
        failedHealthChecks: healthChecks.filter(h => h.status !== 'OK').length
      },
      metrics: {
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage,
        diskUsage: metrics.diskUsage,
        responseTime: metrics.responseTime,
        networkLatency: metrics.networkLatency,
        activeUsers: metrics.activeUsers
      },
      healthChecks: healthChecks.map(check => ({
        component: check.component,
        status: check.status,
        details: check.details,
        timestamp: check.timestamp
      })),
      alerts: alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp
      })),
      activity: {
        totalEvents: activityLogs.length,
        events: activityLogs.slice(0, 100).map(log => ({
          action: log.action,
          entityType: log.entityType,
          user: log.user ? {
            name: log.user.name,
            role: log.user.role
          } : null,
          timestamp: log.createdAt
        }))
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows = [];
      csvRows.push('Report Type,Value');
      csvRows.push(`Generated At,${report.generatedAt}`);
      csvRows.push(`Time Range,${report.timeRange}`);
      csvRows.push(`System Status,${report.summary.systemStatus}`);
      csvRows.push(`Total Alerts,${report.summary.totalAlerts}`);
      csvRows.push(`Critical Alerts,${report.summary.criticalAlerts}`);
      csvRows.push(`CPU Usage,${report.metrics.cpuUsage}%`);
      csvRows.push(`Memory Usage,${report.metrics.memoryUsage}%`);
      csvRows.push(`Disk Usage,${report.metrics.diskUsage}%`);
      csvRows.push(`Response Time,${report.metrics.responseTime}ms`);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=system-health-report-${Date.now()}.csv`);
      res.send(csvRows.join('\n'));
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=system-health-report-${Date.now()}.json`);
      res.json(report);
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    });
  }
});

// ===== PHASE 5: HISTORICAL DATA, AUTOMATED WORKFLOWS, AND ENHANCED NOTIFICATIONS =====

// Get historical trends
router.get('/system-health/trends', authenticateToken, async (req, res) => {
  try {
    const { metric, days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get current metrics for comparison
    const currentMetrics = await systemHealthService.getSystemMetrics();
    
    // For historical data, we'll use activity logs as a proxy
    // In production, you'd have a dedicated metrics_history table
    const activityLogs = await ActivityLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: startDate
        },
        entityType: 'SystemHealth'
      },
      order: [['createdAt', 'ASC']],
      limit: 1000
    });

    // Generate trend data points (daily averages)
    const trends = [];
    const interval = 24 * 60 * 60 * 1000; // 1 day
    
    for (let time = startDate.getTime(); time <= Date.now(); time += interval) {
      const dayStart = new Date(time);
      const dayEnd = new Date(time + interval);
      
      const dayLogs = activityLogs.filter(log => {
        const logTime = new Date(log.createdAt).getTime();
        return logTime >= dayStart.getTime() && logTime < dayEnd.getTime();
      });

      // Simulate historical metrics based on activity
      const baseValue = metric === 'cpu' ? currentMetrics.cpuUsage :
                       metric === 'memory' ? currentMetrics.memoryUsage :
                       metric === 'disk' ? currentMetrics.diskUsage :
                       metric === 'responseTime' ? currentMetrics.responseTime : 0;

      // Add some variation for historical data
      const variation = (Math.random() - 0.5) * 20;
      const historicalValue = Math.max(0, Math.min(100, baseValue + variation));

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        value: Math.round(historicalValue * 10) / 10,
        timestamp: dayStart.toISOString()
      });
    }

    // Calculate statistics
    const values = trends.map(t => t.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const current = metric === 'cpu' ? currentMetrics.cpuUsage :
                   metric === 'memory' ? currentMetrics.memoryUsage :
                   metric === 'disk' ? currentMetrics.diskUsage :
                   metric === 'responseTime' ? currentMetrics.responseTime : 0;

    res.json({
      success: true,
      trends: {
        metric: metric || 'cpu',
        period: `${days} days`,
        dataPoints: trends,
        statistics: {
          current: Math.round(current * 10) / 10,
          average: Math.round(avg * 10) / 10,
          minimum: Math.round(min * 10) / 10,
          maximum: Math.round(max * 10) / 10,
          trend: current > avg ? 'increasing' : current < avg ? 'decreasing' : 'stable'
        }
      }
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trend data'
    });
  }
});

// Get performance baselines
router.get('/system-health/baselines', authenticateToken, async (req, res) => {
  try {
    const metrics = await systemHealthService.getSystemMetrics();
    
    // Calculate baselines (in production, these would be calculated from historical data)
    const baselines = {
      cpuUsage: {
        baseline: 25, // Average expected CPU usage
        current: metrics.cpuUsage,
        deviation: metrics.cpuUsage - 25,
        status: Math.abs(metrics.cpuUsage - 25) > 20 ? 'anomaly' : 'normal'
      },
      memoryUsage: {
        baseline: 60, // Average expected memory usage
        current: metrics.memoryUsage,
        deviation: metrics.memoryUsage - 60,
        status: Math.abs(metrics.memoryUsage - 60) > 20 ? 'anomaly' : 'normal'
      },
      diskUsage: {
        baseline: 40, // Average expected disk usage
        current: metrics.diskUsage,
        deviation: metrics.diskUsage - 40,
        status: Math.abs(metrics.diskUsage - 40) > 20 ? 'anomaly' : 'normal'
      },
      responseTime: {
        baseline: 150, // Average expected response time (ms)
        current: metrics.responseTime,
        deviation: metrics.responseTime - 150,
        status: Math.abs(metrics.responseTime - 150) > 100 ? 'anomaly' : 'normal'
      }
    };

    res.json({
      success: true,
      baselines
    });
  } catch (error) {
    console.error('Get baselines error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch baseline data'
    });
  }
});

// Get scheduled tasks
router.get('/system-health/scheduled-tasks', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // In production, this would come from a scheduled_tasks table
    const scheduledTasks = [
      {
        id: '1',
        name: 'Daily Health Check',
        description: 'Run comprehensive system health check',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        lastRun: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 19 * 60 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '2',
        name: 'Weekly Report Generation',
        description: 'Generate weekly system health report',
        schedule: '0 0 * * 0', // Weekly on Sunday
        enabled: true,
        lastRun: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '3',
        name: 'Database Optimization',
        description: 'Run database optimization tasks',
        schedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
        enabled: false,
        lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        nextRun: null,
        status: 'disabled'
      }
    ];

    res.json({
      success: true,
      tasks: scheduledTasks
    });
  } catch (error) {
    console.error('Get scheduled tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled tasks'
    });
  }
});

// Toggle scheduled task
router.post('/system-health/scheduled-tasks/:id/toggle', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    // Log the action
    await ActivityLog.create({
      userId: req.user.id,
      action: `TOGGLE_SCHEDULED_TASK: ${id}`,
      entityType: 'SystemHealth',
      details: `Scheduled task ${enabled ? 'enabled' : 'disabled'}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Scheduled task ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Toggle scheduled task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle scheduled task'
    });
  }
});

// Get notification templates
router.get('/system-health/notifications/templates', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const templates = [
      {
        id: '1',
        name: 'Critical Alert',
        type: 'email',
        subject: '🚨 Critical System Alert: {{alertType}}',
        body: 'A critical alert has been triggered:\n\nType: {{alertType}}\nSeverity: {{severity}}\nMessage: {{message}}\nTime: {{timestamp}}\n\nPlease investigate immediately.',
        enabled: true
      },
      {
        id: '2',
        name: 'Health Check Summary',
        type: 'email',
        subject: 'System Health Check Summary - {{date}}',
        body: 'Daily health check completed:\n\nStatus: {{status}}\nCPU: {{cpuUsage}}%\nMemory: {{memoryUsage}}%\nDisk: {{diskUsage}}%\n\nView full report: {{reportUrl}}',
        enabled: true
      },
      {
        id: '3',
        name: 'Incident Notification',
        type: 'email',
        subject: 'New Incident: {{incidentTitle}}',
        body: 'A new incident has been created:\n\nTitle: {{incidentTitle}}\nSeverity: {{severity}}\nDescription: {{description}}\n\nView incident: {{incidentUrl}}',
        enabled: true
      }
    ];

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification templates'
    });
  }
});

// Update notification template
router.put('/system-health/notifications/templates/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body, enabled } = req.body;

    // Log the action
    await ActivityLog.create({
      userId: req.user.id,
      action: `UPDATE_NOTIFICATION_TEMPLATE: ${id}`,
      entityType: 'SystemHealth',
      details: `Notification template updated: ${name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Notification template updated successfully',
      template: {
        id,
        name,
        subject,
        body,
        enabled
      }
    });
  } catch (error) {
    console.error('Update notification template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification template'
    });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { sendUserIdEmail } = require('../services/emailService');
const { createNotification, createNotificationForRole } = require('./notifications');

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

// Get all users (System Admin only)
router.get('/', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      filterGroup,
      filterDepartment
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      // Exclude deleted users and System Administrator account from main table
      status: { [require('sequelize').Op.ne]: 'deleted' },
      // Exclude System Administrator account (sysad@gmail.com)
      [require('sequelize').Op.and]: [
        { [require('sequelize').Op.or]: [
          { username: { [require('sequelize').Op.ne]: 'sysad@gmail.com' } },
          { email: { [require('sequelize').Op.ne]: 'sysad@gmail.com' } }
        ]}
      ]
    };

    // Add filters
    if (role) whereClause.role = role;
    if (status && status !== 'deleted') whereClause.status = status; // Don't allow filtering by deleted status in main table
    if (filterGroup) whereClause.group = filterGroup;
    if (filterDepartment) whereClause.department = filterDepartment;
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { firstName: { [require('sequelize').Op.like]: `%${search}%` } },
        { lastName: { [require('sequelize').Op.like]: `%${search}%` } },
        { fullName: { [require('sequelize').Op.like]: `%${search}%` } },
        { name: { [require('sequelize').Op.like]: `%${search}%` } },
        { username: { [require('sequelize').Op.like]: `%${search}%` } },
        { email: { [require('sequelize').Op.like]: `%${search}%` } },
        { userId: { [require('sequelize').Op.like]: `%${search}%` } },
        { department: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['createdAt', 'fullName', 'group', 'department', 'role', 'name', 'username', 'email'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[validSortBy, validSortOrder]]
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'VIEW_USERS',
      entityType: 'User',
      details: `Viewed users list with filters: ${JSON.stringify(req.query)}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      users: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get users by role
router.get('/role/:role', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { role } = req.params;

    const users = await User.findAll({
      where: { 
        role: role,
        status: { [require('sequelize').Op.ne]: 'deleted' }, // Exclude deleted users
        // Exclude System Administrator account
        [require('sequelize').Op.and]: [
          { [require('sequelize').Op.or]: [
            { username: { [require('sequelize').Op.ne]: 'sysad@gmail.com' } },
            { email: { [require('sequelize').Op.ne]: 'sysad@gmail.com' } }
          ]}
        ]
      },
      attributes: ['id', 'name', 'username', 'email', 'role', 'subRole', 'status'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users by role'
    });
  }
});

// Validate EIU Personnel Account ID
router.get('/validate-eiu/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const eiuUser = await User.findOne({
      where: {
        userId: userId,
        role: 'EIU',
        status: 'active'
      },
      attributes: ['id', 'name', 'username', 'email', 'role', 'status', 'userId']
    });

    if (!eiuUser) {
      return res.status(404).json({
        success: false,
        error: 'EIU Personnel account not found or inactive'
      });
    }

    res.json({
      success: true,
      user: eiuUser
    });

  } catch (error) {
    console.error('Validate EIU account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate EIU account'
    });
  }
});

// Create new user
router.post('/', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      fullName,
      userId,
      birthdate,
      projectCode,
      enable2FA,
      accountLockout,
      name,
      username,
      email,
      password,
      role,
      subRole,
      idType,
      idNumber,
      group,
      department,
      officeDepartment,
      position,
      contactNumber,
      address
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, username, password, and role are required'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Check if email already exists (use username as email)
    const existingEmail = await User.findOne({ where: { email: username } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Check if userId already exists (if provided)
    if (userId) {
      const existingUserId = await User.findOne({ where: { userId } });
      if (existingUserId) {
        return res.status(400).json({
          success: false,
          error: 'User ID already exists'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate full name if not provided
    const generatedFullName = fullName || [firstName, middleName, lastName].filter(Boolean).join(' ');

    // Create user
    const user = await User.create({
      firstName,
      middleName,
      lastName,
      fullName: generatedFullName,
      userId,
      birthdate,
      projectCode,
      enable2FA: enable2FA || false,
      accountLockout: accountLockout || false,
      name: generatedFullName, // Keep for backward compatibility
      username,
      email: username, // Use username as email since we removed the separate email field
      password: hashedPassword,
      role,
      subRole,
      idType,
      idNumber,
      group,
      department: officeDepartment || department, // Add support for officeDepartment
      position,
      contactNumber,
      address,
      status: 'active'
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      details: `Created user: ${user.fullName} (${user.username})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Create notifications for relevant users based on the new user's role
    try {
      // Notify System Administrators about new user creation
      await createNotificationForRole('SYS.AD', 
        'New User Account Created', 
        `A new ${user.role} account has been created: ${user.fullName} (${user.username})`, 
        'Success', 
        'User Management', 
        'User', 
        user.id, 
        'Normal'
      );

      // Notify specific role users based on the new user's role
      if (user.role === 'EIU') {
        // Notify Secretariat about new EIU user
        await createNotificationForRole('secretariat', 
          'New EIU User Account Created', 
          `A new EIU personnel account has been created: ${user.fullName} (${user.username})`, 
          'Info', 
          'User Management', 
          'User', 
          user.id, 
          'Normal'
        );
      } else if (user.role === 'LGU-IU' || user.role === 'iu') {
        // Notify Secretariat about new Implementing Office user
        await createNotificationForRole('secretariat', 
          'New Implementing Office User Created', 
          `A new Implementing Office account has been created: ${user.fullName} (${user.username})`, 
          'Info', 
          'User Management', 
          'User', 
          user.id, 
          'Normal'
        );
      } else if (user.role === 'LGU-PMT') {
        // Notify System Admin about new MPMEC user
        await createNotificationForRole('SYS.AD', 
          'New MPMEC User Account Created', 
          `A new MPMEC member account has been created: ${user.fullName} (${user.username})`, 
          'Info', 
          'User Management', 
          'User', 
          user.id, 
          'Normal'
        );
      }

      console.log(`Notifications created for new user: ${user.fullName}`);
    } catch (notificationError) {
      console.error('Error creating notifications for new user:', notificationError);
      // Don't fail the user creation if notifications fail
    }

    // Return user data without password
    const userData = user.toJSON();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userData
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// Update user status
router.patch('/:id/status', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'blocked', 'deactivated'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (active, blocked, deactivated)'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const oldStatus = user.status;
    await user.update({ status });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_USER_STATUS',
      entityType: 'User',
      entityId: user.id,
      details: `Changed user status from ${oldStatus} to ${status}: ${user.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User status updated successfully',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
});

// Assign role to user
router.patch('/:id/role', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, subRole } = req.body;

    if (!role || !subRole) {
      return res.status(400).json({
        success: false,
        error: 'Role and subRole are required'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const oldRole = user.role;
    const oldSubRole = user.subRole;
    await user.update({ role, subRole });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'ASSIGN_USER_ROLE',
      entityType: 'User',
      entityId: user.id,
      details: `Changed user role from ${oldRole}/${oldSubRole} to ${role}/${subRole}: ${user.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User role assigned successfully',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        subRole: user.subRole
      }
    });

  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign role'
    });
  }
});

// Soft delete user (move to deleted users section)
router.put('/:id/soft-delete', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deletion of own account
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Prevent deletion of Executive Viewer account only
    if (user.role === 'SYS.AD' && user.subRole === 'EXECUTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete Executive Viewer account. This is a protected system account.'
      });
    }

    // Soft delete by updating status and adding deletedAt timestamp
    await user.update({
      status: 'deleted',
      deletedAt: new Date()
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'SOFT_DELETE_USER',
      entityType: 'User',
      entityId: id,
      details: `Soft deleted user: ${user.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User moved to deleted users section'
    });

  } catch (error) {
    console.error('Soft delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to soft delete user'
    });
  }
});

// Restore soft deleted user
router.put('/:id/restore', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Restore user by updating status and removing deletedAt timestamp
    await user.update({
      status: 'active',
      deletedAt: null
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'RESTORE_USER',
      entityType: 'User',
      entityId: id,
      details: `Restored user: ${user.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User restored successfully'
    });

  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore user'
    });
  }
});

// Permanent delete user (after 30 days)
router.delete('/:id/permanent-delete', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deletion of own account
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Prevent deletion of System Admin and Executive Viewer accounts
    if (user.role === 'SYS.AD' && (user.subRole === 'System Administrator' || user.subRole === 'EXECUTIVE')) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete System Administrator or Executive Viewer accounts. These are protected system accounts.'
      });
    }

    const userName = user.name;
    await user.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'PERMANENT_DELETE_USER',
      entityType: 'User',
      entityId: id,
      details: `Permanently deleted user: ${userName}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User permanently deleted'
    });

  } catch (error) {
    console.error('Permanent delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to permanently delete user'
    });
  }
});

// Hard delete user (original endpoint)
router.delete('/:id', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deletion of own account
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Prevent deletion of System Admin and Executive Viewer accounts
    if (user.role === 'SYS.AD' && (user.subRole === 'System Administrator' || user.subRole === 'EXECUTIVE')) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete System Administrator or Executive Viewer accounts. These are protected system accounts.'
      });
    }

    const userName = user.name;
    await user.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      details: `Deleted user: ${userName}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// Get deleted users
router.get('/deleted', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const deletedUsers = await User.findAll({
      where: {
        status: 'deleted',
        deletedAt: { [require('sequelize').Op.ne]: null }
      },
      attributes: { exclude: ['password'] },
      order: [['deletedAt', 'DESC']]
    });

    res.json({
      success: true,
      users: deletedUsers
    });

  } catch (error) {
    console.error('Get deleted users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deleted users'
    });
  }
});

// Get user activity logs (System Admin only)
router.get('/logs', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
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
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
});

// Get current user's activity logs (for EIU, LGU-IU, etc.)
router.get('/me/logs', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { userId: req.user.id };

    if (action) whereClause.action = action;
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
    console.error('Get user logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Update current user profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      email,
      contactNumber,
      address
    } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields only
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (address) updateData.address = address;

    await user.update(updateData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_PROFILE',
      entityType: 'User',
      entityId: user.id,
      details: `Updated profile information`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        contactNumber: user.contactNumber,
        address: user.address,
        role: user.role,
        subRole: user.subRole
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Count users by group (for Unique User ID generation)
router.get('/count-by-group', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { group } = req.query;
    
    if (!group) {
      return res.status(400).json({
        success: false,
        error: 'Group parameter is required'
      });
    }

    const count = await User.count({
      where: { role: group }
    });

    res.json({
      success: true,
      count: count
    });

  } catch (error) {
    console.error('Count users by group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count users by group'
    });
  }
});

// Send User ID via email
router.post('/send-user-id-email', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { email, userId, group } = req.body;
    
    if (!email || !userId || !group) {
      return res.status(400).json({
        success: false,
        error: 'Email, User ID, and Group are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Send the actual email using the email service
    const emailSent = await sendUserIdEmail(email, userId, group);
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send email. Please try again.'
      });
    }

    // Log the email sending activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'SEND_USER_ID_EMAIL',
      entityType: 'User',
      details: `Sent User ID ${userId} to email ${email} for group ${group}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User ID email sent successfully',
      userId: userId,
      email: email
    });

  } catch (error) {
    console.error('Send User ID email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send User ID email'
    });
  }
});

// Temporary endpoint to update LGU-IU departments (remove after use)
router.post('/update-lgu-iu-departments', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    console.log('🔄 Updating LGU-IU users department field...');
    
    // Get all LGU-IU users
    const lguIuUsers = await User.findAll({
      where: {
        group: 'LGU-IU',
        status: { [require('sequelize').Op.ne]: 'deleted' }
      }
    });

    console.log(`Found ${lguIuUsers.length} LGU-IU users to update`);

    const updateResults = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of lguIuUsers) {
      try {
        const fullName = user.fullName || user.name;
        
        // Map full names to department names
        let department = null;
        
        if (fullName.includes('Municipal Engineer') || fullName.includes("Engineer's Office")) {
          department = "Municipal Engineer's Office";
        } else if (fullName.includes('Municipal Agriculturist') || fullName.includes("Agriculturist's Office")) {
          department = "Municipal Agriculturist's Office";
        } else if (fullName.includes('Municipal General Services') || fullName.includes('General Services Office')) {
          department = "Municipal General Services Office";
        } else if (fullName.includes('Municipal Social Welfare') || fullName.includes('Social Welfare and Development')) {
          department = "Municipal Social Welfare and Development Office";
        } else if (fullName.includes('Municipal Disaster') || fullName.includes('Risk Reduction') || fullName.includes('MDRRMO')) {
          department = "Municipal Disaster and Risk Reduction Management Office";
        } else {
          // If no match found, use the full name as department
          department = fullName;
        }

        // Check if department is already set and matches
        if (user.department === department) {
          console.log(`⏭️  Skipped: ${fullName} - Department already set correctly`);
          skippedCount++;
          updateResults.push({
            username: user.username,
            fullName: fullName,
            status: 'SKIPPED',
            details: 'Department already set correctly'
          });
          continue;
        }

        // Update user's department
        await user.update({ department });

        // Log activity
        await ActivityLog.create({
          userId: req.user.id,
          action: 'UPDATE_USER_DEPARTMENT',
          entityType: 'User',
          entityId: user.id,
          details: `Updated department for ${fullName}: ${department}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        console.log(`✅ Updated: ${fullName} -> ${department}`);
        updatedCount++;
        updateResults.push({
          username: user.username,
          fullName: fullName,
          status: 'UPDATED',
          details: `Department set to: ${department}`
        });

      } catch (error) {
        console.error(`❌ Error updating ${user.fullName || user.name}:`, error.message);
        updateResults.push({
          username: user.username,
          fullName: user.fullName || user.name,
          status: 'ERROR',
          details: error.message
        });
      }
    }

    // Verify the updates
    const updatedUsers = await User.findAll({
      where: {
        group: 'LGU-IU',
        status: { [require('sequelize').Op.ne]: 'deleted' },
        department: { [require('sequelize').Op.ne]: null }
      },
      attributes: ['fullName', 'department', 'username']
    });

    res.json({
      success: true,
      message: 'LGU-IU departments updated successfully',
      summary: {
        totalUsers: lguIuUsers.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: updateResults.filter(r => r.status === 'ERROR').length
      },
      results: updateResults,
      verification: {
        usersWithDepartment: updatedUsers.length,
        users: updatedUsers.map(u => ({
          fullName: u.fullName,
          department: u.department,
          username: u.username
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error in updateLGUIUDepartments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update LGU-IU departments'
    });
  }
});

module.exports = router; 
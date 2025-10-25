const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, ActivityLog, Notification, Project, ProjectUpdate, ProjectIssue, RPMESForm, MonitoringReport, SiteVisit, Upload, ProjectValidation } = require('../models');
const { authenticateToken, updateUserActivity, isUserActive, userActivityTracker } = require('../middleware/auth');
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
      // Exclude System Administrator account (sysadmin@gmail.com)
      [require('sequelize').Op.and]: [
        { [require('sequelize').Op.or]: [
          { username: { [require('sequelize').Op.ne]: 'sysadmin' } },
          { email: { [require('sequelize').Op.ne]: 'sysadmin@gmail.com' } }
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
      attributes: { exclude: ['password'] } // Return all fields except password
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
    console.log('User creation request received:', { ...req.body, password: '***' });
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
      address,
      externalCompanyName,
      actualRole,
      actualSubRole
    } = req.body;

    // Comprehensive validation for all required fields
    const missingFields = [];
    
    if (!firstName?.trim()) missingFields.push('First Name');
    if (!middleName?.trim()) missingFields.push('Middle Name');
    if (!lastName?.trim()) missingFields.push('Last Name');
    if (!username?.trim()) missingFields.push('Email');
    if (!contactNumber?.trim()) missingFields.push('Contact Number');
    if (!password?.trim()) missingFields.push('Password');
    if (!birthdate) missingFields.push('Birthdate');
    if (!group?.trim()) missingFields.push('Group');
    // For backward compatibility, if actualRole/actualSubRole are not provided, skip validation
    // The frontend should provide these for proper validation
    if (actualRole && !actualRole.trim()) missingFields.push('Role');
    if (actualSubRole && !actualSubRole.trim()) missingFields.push('Subrole');
    if (!officeDepartment?.trim() && !department?.trim()) missingFields.push('Department/Office');
    if (!userId?.trim()) missingFields.push('Unique User ID');
    
    // Conditional validation: Company Name required for EIU group
    if (group === 'EIU' && !externalCompanyName?.trim()) {
      missingFields.push('Company Name (required for EIU Group)');
    }
    
    if (missingFields.length > 0) {
      console.log('Missing fields validation failed:', missingFields);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Format validation
    if (contactNumber && !contactNumber.startsWith('09')) {
      return res.status(400).json({
        success: false,
        error: 'Contact number must start with 09'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid email address'
      });
    }

    // EMS group restriction
    if (group === 'EMS') {
      return res.status(400).json({
        success: false,
        error: 'EMS group is not yet implemented'
      });
    }

    // ✅ ENHANCED: Check for existing MPMEC Secretariat Admin
    if (group === 'LGU-PMT' && (actualSubRole === 'Focal Person (Admin)' || subRole?.includes('Focal Person (Admin)'))) {
      console.log('🔍 Checking for existing MPMEC Secretariat Admin...');
      
      const existingSecretariatAdmin = await User.findOne({
        where: {
          group: 'LGU-PMT',
          [Op.or]: [
            { subRole: { [Op.like]: '%Focal Person (Admin)%' } },
            { subRole: { [Op.like]: '%MPMEC Secretariat%Admin%' } }
          ],
          status: 'active' // Only check active users
        },
        paranoid: true // Exclude soft-deleted users
      });

      if (existingSecretariatAdmin) {
        console.log('❌ MPMEC Secretariat Admin already exists:', {
          id: existingSecretariatAdmin.id,
          name: existingSecretariatAdmin.fullName || existingSecretariatAdmin.name,
          username: existingSecretariatAdmin.username,
          subRole: existingSecretariatAdmin.subRole
        });

        return res.status(409).json({
          success: false,
          error: 'MPMEC Secretariat Admin already exists. Delete the current account with safety measures before creating a new one.',
          existingUser: {
            name: existingSecretariatAdmin.fullName || existingSecretariatAdmin.name,
            username: existingSecretariatAdmin.username,
            userId: existingSecretariatAdmin.userId
          }
        });
      }

      console.log('✅ No existing MPMEC Secretariat Admin found, proceeding with creation');
    }

    // Validate Group → Role → Subrole combination
    const validRoleMapping = {
      'LGU-PMT': ['MPMEC Secretariat', 'MPMEC'],
      'LGU-IU': ['IO Officer', 'MDC', 'Municipal Officer'],
      'EIU': ['Contractor', 'Program Partner Agency']
    };
    
    const validSubRoleMapping = {
      'MPMEC Secretariat': ['Focal Person (Admin)'],
      'MPMEC': ['Chairperson', 'Vice Chairperson', 'Member'],
      'IO Officer': ['Department Encoder (Admin)'],
      'MDC': ['Member'],
      'Municipal Officer': ['Member'],
      'Contractor': ['Head'],
      'Program Partner Agency': ['Head']
    };
    
    // Temporarily disable role/subrole validation for debugging
    console.log('Role/subrole validation data:', { group, actualRole, actualSubRole });
    
    // Check if the selected role is valid for the selected group
    if (actualRole && validRoleMapping[group] && !validRoleMapping[group].includes(actualRole)) {
      console.log('Role validation failed:', { group, actualRole, validRoles: validRoleMapping[group] });
      return res.status(400).json({
        success: false,
        error: `Invalid Role for selected Group. Valid roles for ${group}: ${validRoleMapping[group]?.join(', ') || 'None'}`
      });
    }
    
    // Check if the selected subrole is valid for the selected role
    if (actualRole && actualSubRole && validSubRoleMapping[actualRole] && !validSubRoleMapping[actualRole].includes(actualSubRole)) {
      console.log('Subrole validation failed:', { actualRole, actualSubRole, validSubRoles: validSubRoleMapping[actualRole] });
      return res.status(400).json({
        success: false,
        error: `Invalid Subrole for selected Role. Valid subroles for ${actualRole}: ${validSubRoleMapping[actualRole]?.join(', ') || 'None'}`
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

    // Create user with all required fields
    const user = await User.create({
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      fullName: generatedFullName,
      userId: userId.trim(), // This is the user-facing ID (e.g., LGU-PMT-0001)
      birthdate,
      projectCode,
      enable2FA: enable2FA || false,
      accountLockout: accountLockout || false,
      name: generatedFullName, // Keep for backward compatibility
      username: username.trim(),
      email: username.trim(), // Use username as email
      password: hashedPassword,
      role: role.trim(),
      subRole: subRole.trim(),
      idType,
      idNumber,
      group: group.trim(),
      department: officeDepartment?.trim() || department?.trim(), // Department/Office field
      position,
      contactNumber: contactNumber.trim(),
      address,
      externalCompanyName: externalCompanyName?.trim() || null, // Company name for EIU
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
      // ✅ ENHANCED: Notify System Administrators with profile picture and targeting
      const systemAdmins = await User.findAll({
        where: { 
          role: 'SYS.AD',
          status: 'active'
        },
        attributes: ['id']
      });
      
      for (const admin of systemAdmins) {
        await createNotification(
          admin.id,
          'User Created',
          `A new user account has been successfully created: ${user.fullName} (${user.userId})`,
          'Success',
          'System',
          'User',
          user.id,
          'Medium',
          {
            profilePic: user.profilePictureUrl || null, // Use new user's profile picture
            module: 'user-management',
            targetId: user.userId, // Use userId for highlighting in table
            actionUrl: '/dashboard/sysadmin/modules/user-management'
          }
        );
      }
      
      // ✅ ENHANCED: Send welcome notification to the newly created user
      await createNotification(
        user.id,
        'Welcome to Build Watch',
        `Welcome ${user.fullName}! Your account has been successfully created. You can now access your dashboard and start using the system.`,
        'Success',
        'System',
        'User',
        user.id,
        'High',
        {
          profilePic: req.user.profilePictureUrl || null, // Use creating admin's profile picture
          module: 'dashboard',
          targetId: user.userId,
          actionUrl: '/dashboard'
        }
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
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: `Failed to create user: ${error.message}`
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

    // Store complete user data before soft delete (to preserve profile picture and other info)
    const userSnapshot = {
      id: user.id,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      contactNumber: user.contactNumber,
      birthdate: user.birthdate,
      group: user.group,
      role: user.role,
      subRole: user.subRole,
      department: user.department,
      position: user.position,
      profilePictureUrl: user.profilePictureUrl,
      status: user.status,
      createdAt: user.createdAt,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletedByUser: req.user.name || req.user.fullName || req.user.username
    };

    // Soft delete by updating status and adding deletedAt timestamp
    await user.update({
      status: 'deleted',
      deletedAt: new Date()
    });

    // Log activity with complete user snapshot
    await ActivityLog.create({
      userId: req.user.id,
      action: 'SOFT_DELETE_USER',
      entityType: 'User',
      entityId: id,
      details: `Soft deleted user: ${user.name}`,
      metadata: userSnapshot, // Store complete user data for preservation
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

    // Get preserved user data from soft delete log if available
    let preservedData = null;
    try {
      const { ActivityLog } = require('../models');
      const softDeleteLog = await ActivityLog.findOne({
        where: {
          action: 'SOFT_DELETE_USER',
          entityId: id,
          metadata: { [require('sequelize').Op.ne]: null }
        },
        order: [['createdAt', 'DESC']]
      });

      if (softDeleteLog && softDeleteLog.metadata) {
        preservedData = softDeleteLog.metadata;
      }
    } catch (logError) {
      console.log('⚠️ Could not retrieve preserved data:', logError.message);
    }

    // Prepare restore data - use preserved data if available, otherwise current data
    const restoreData = {
      status: 'active',
      deletedAt: null
    };

    // Restore profile picture if it was preserved and current one is missing
    if (preservedData && preservedData.profilePictureUrl && !user.profilePictureUrl) {
      restoreData.profilePictureUrl = preservedData.profilePictureUrl;
      console.log('✅ Restored profile picture from preserved data:', preservedData.profilePictureUrl);
    }

    // Restore user by updating status and removing deletedAt timestamp
    await user.update(restoreData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'RESTORE_USER',
      entityType: 'User',
      entityId: id,
      details: `Restored user: ${user.name}`,
      metadata: preservedData ? { restoredFromSnapshot: true, originalSnapshot: preservedData } : null,
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
    
    console.log('🔍 Attempting permanent delete for user ID:', id);
    console.log('🔍 User ID type:', typeof id);

    // Try to find user by primary key first
    let user = await User.findByPk(id);
    
    // If not found by primary key, try to find by userId field
    if (!user) {
      console.log('🔍 User not found by primary key, trying userId field...');
      user = await User.findOne({ where: { userId: id } });
    }
    
    // If still not found, try to find by email
    if (!user) {
      console.log('🔍 User not found by userId, trying email...');
      user = await User.findOne({ where: { email: id } });
    }

    if (!user) {
      console.log('❌ User not found with any method');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ User found:', {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      subRole: user.subRole
    });

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

    const userName = user.name || user.fullName || user.username;
    
    // Store user data for history before deletion
    const userDataForHistory = {
      id: user.id,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      contactNumber: user.contactNumber,
      birthdate: user.birthdate,
      group: user.group,
      role: user.role,
      subRole: user.subRole,
      department: user.department,
      status: user.status,
      profilePictureUrl: user.profilePictureUrl,
      createdAt: user.createdAt,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletedByUser: req.user.name || req.user.fullName || req.user.username
    };
    
    // Delete related records first to avoid foreign key constraint violations
    try {
      console.log('🔄 Deleting related records for user:', userName);
      
      // Delete notifications related to this user
      await Notification.destroy({
        where: { userId: user.id }
      });
      console.log('✅ Deleted notifications for user:', userName);
      
      // Delete activity logs related to this user
      await ActivityLog.destroy({
        where: { userId: user.id }
      });
      console.log('✅ Deleted activity logs for user:', userName);
      
      // Delete project updates submitted by this user
      await ProjectUpdate.destroy({
        where: { submittedBy: user.id }
      });
      console.log('✅ Deleted project updates submitted by user:', userName);
      
      // Also handle project updates submitted TO this user (fix foreign key constraint)
      await ProjectUpdate.update(
        { submittedTo: null }, // Set to null instead of deleting the entire update
        { where: { submittedTo: user.id } }
      );
      console.log('✅ Updated project updates submitted to user (set submittedTo to null):', userName);
      
      // Handle ALL project foreign key relationships for this user
      console.log(`🔍 Comprehensive project cleanup for user:`, userName);
      
      // 1. Handle implementingOfficeId
      const implementingOfficeProjects = await Project.findAll({
        where: { implementingOfficeId: user.id },
        attributes: ['id', 'title']
      });
      console.log(`🔍 Found ${implementingOfficeProjects.length} projects as implementing office`);
      await Project.update({ implementingOfficeId: null }, { where: { implementingOfficeId: user.id } });
      
      // 2. Handle eiuPersonnelId  
      const eiuPersonnelProjects = await Project.findAll({
        where: { eiuPersonnelId: user.id },
        attributes: ['id', 'title']
      });
      console.log(`🔍 Found ${eiuPersonnelProjects.length} projects as EIU personnel`);
      await Project.update({ eiuPersonnelId: null }, { where: { eiuPersonnelId: user.id } });
      
      // 3. Handle approvedBy
      const approvedByProjects = await Project.findAll({
        where: { approvedBy: user.id },
        attributes: ['id', 'title']
      });
      console.log(`🔍 Found ${approvedByProjects.length} projects approved by this user`);
      await Project.update({ approvedBy: null }, { where: { approvedBy: user.id } });
      
      // 4. Handle secretariatApprovedBy
      const secretariatApprovedProjects = await Project.findAll({
        where: { secretariatApprovedBy: user.id },
        attributes: ['id', 'title']
      });
      console.log(`🔍 Found ${secretariatApprovedProjects.length} projects secretariat approved by this user`);
      await Project.update({ secretariatApprovedBy: null }, { where: { secretariatApprovedBy: user.id } });
      
      console.log('✅ All project foreign keys updated for user:', userName);
      
      // Handle ProjectIssue foreign keys
      // Update reportedById
      await ProjectIssue.update({ reportedById: null }, { where: { reportedById: user.id } });
      
      // Update assignedToId  
      await ProjectIssue.update({ assignedToId: null }, { where: { assignedToId: user.id } });
      
      // Update resolvedById
      await ProjectIssue.update({ resolvedById: null }, { where: { resolvedById: user.id } });
      
      // Update escalatedToId
      await ProjectIssue.update({ escalatedToId: null }, { where: { escalatedToId: user.id } });
      
      console.log('✅ All ProjectIssue foreign keys updated for user:', userName);
      
      // Delete RPMES forms submitted by this user
      await RPMESForm.destroy({
        where: { submittedById: user.id }
      });
      console.log('✅ Deleted RPMES forms for user:', userName);
      
      // Delete monitoring reports conducted by this user
      await MonitoringReport.destroy({
        where: { conductedById: user.id }
      });
      console.log('✅ Deleted monitoring reports for user:', userName);
      
      // Delete site visits scheduled by this user
      await SiteVisit.destroy({
        where: { scheduledById: user.id }
      });
      console.log('✅ Deleted site visits for user:', userName);
      
      // Delete uploads by this user
      await Upload.destroy({
        where: { uploadedById: user.id }
      });
      console.log('✅ Deleted uploads for user:', userName);
      
      // Delete project validations by this user
      await ProjectValidation.destroy({
        where: { validatedBy: user.id }
      });
      console.log('✅ Deleted project validations for user:', userName);
      
      // Delete site visit participants (many-to-many relationship)
      await user.sequelize.query(
        'DELETE FROM site_visit_participants WHERE userId = ?',
        { replacements: [user.id] }
      );
      console.log('✅ Deleted site visit participants for user:', userName);
      
    } catch (relatedError) {
      console.log('⚠️ Error deleting related records:', relatedError.message);
      // Continue with user deletion even if related records fail
    }
    
    // Now delete the user
    await user.destroy();

    console.log('✅ User permanently deleted:', userName);

    // Log activity with user data for history
    await ActivityLog.create({
      userId: req.user.id,
      action: 'PERMANENT_DELETE_USER',
      entityType: 'User',
      entityId: user.id,
      details: `Permanently deleted user: ${userName}`,
      metadata: userDataForHistory, // Store user data for history in metadata field
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // ✅ ENHANCED: Notify System Administrators about permanent user deletion
    try {
      const systemAdmins = await User.findAll({
        where: { 
          role: 'SYS.AD',
          status: 'active'
        },
        attributes: ['id']
      });
      
      for (const admin of systemAdmins) {
        await createNotification(
          admin.id,
          'User Permanently Deleted',
          `A user account has been permanently deleted from the system: ${userName} (${userDataForHistory.userId || 'N/A'})`,
          'Warning',
          'System',
          'User',
          userDataForHistory.id,
          'High',
          {
            profilePic: userDataForHistory.profilePictureUrl || null, // Use deleted user's preserved profile picture
            module: 'user-management',
            targetId: userDataForHistory.userId || userDataForHistory.id, // Use userId for reference
            actionUrl: '/dashboard/sysadmin/modules/user-management'
          }
        );
      }
      
      console.log('✅ System admin notifications sent for permanent deletion:', userName);
    } catch (notificationError) {
      console.error('⚠️ Error creating permanent deletion notifications:', notificationError);
      // Don't fail the deletion if notifications fail
    }

    res.json({
      success: true,
      message: 'User permanently deleted'
    });

  } catch (error) {
    console.error('❌ Permanent delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to permanently delete user: ' + error.message
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

// Get deleted users with enhanced information
router.get('/deleted', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // First get users with status 'deleted'
    const deletedUsers = await User.findAll({
      where: {
        status: 'deleted',
        deletedAt: { [require('sequelize').Op.ne]: null }
      },
      attributes: { exclude: ['password'] },
      order: [['deletedAt', 'DESC']]
    });

    // Also get user data from soft delete activity logs to fill in any missing information
    const { ActivityLog } = require('../models');
    const softDeleteLogs = await ActivityLog.findAll({
      where: {
        action: 'SOFT_DELETE_USER',
        metadata: { [require('sequelize').Op.ne]: null }
      },
      attributes: ['metadata', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Enhance deleted users with preserved data from activity logs if available
    const enhancedDeletedUsers = deletedUsers.map(user => {
      // Find corresponding soft delete log
      const logEntry = softDeleteLogs.find(log => {
        try {
          const metadata = log.metadata;
          return metadata && metadata.id === user.id;
        } catch (e) {
          return false;
        }
      });

      // Use preserved data from log if available, otherwise use current user data
      if (logEntry && logEntry.metadata) {
        const preservedData = logEntry.metadata;
        return {
          ...user.toJSON(),
          // Prioritize preserved profile picture over current one to avoid corruption
          profilePictureUrl: preservedData.profilePictureUrl || user.profilePictureUrl,
          // Add deletion metadata
          deletedBy: preservedData.deletedBy,
          deletedByUser: preservedData.deletedByUser,
          // Calculate days remaining for permanent deletion (30 days)
          daysRemaining: Math.max(0, 30 - Math.floor((new Date() - new Date(user.deletedAt)) / (1000 * 60 * 60 * 24))),
          // Add preserved snapshot for reference
          preservedSnapshot: preservedData
        };
      }

      return {
        ...user.toJSON(),
        daysRemaining: Math.max(0, 30 - Math.floor((new Date() - new Date(user.deletedAt)) / (1000 * 60 * 60 * 24)))
      };
    });

    res.json({
      success: true,
      users: enhancedDeletedUsers
    });

  } catch (error) {
    console.error('Get deleted users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deleted users'
    });
  }
});

// Get deleted users history (permanently deleted users)
router.get('/deleted-history', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    // Get permanently deleted users from ActivityLog where action is PERMANENT_DELETE_USER
    const deletedUsersHistory = await ActivityLog.findAll({
      where: {
        action: 'PERMANENT_DELETE_USER',
        metadata: { [require('sequelize').Op.ne]: null }
      },
      attributes: ['id', 'metadata', 'createdAt', 'details', 'userId'],
      order: [['createdAt', 'DESC']]
    });

    // Get user information for who performed the deletions
    const deleterIds = [...new Set(deletedUsersHistory.map(log => log.userId))];
    const deleters = await User.findAll({
      where: { id: deleterIds },
      attributes: ['id', 'name', 'fullName', 'username', 'role', 'subRole']
    });

    // Create a map for quick lookup
    const deleterMap = {};
    deleters.forEach(deleter => {
      deleterMap[deleter.id] = {
        name: deleter.name || deleter.fullName || deleter.username,
        role: deleter.role,
        subRole: deleter.subRole
      };
    });

    // Format the metadata for frontend
    const formattedHistory = deletedUsersHistory.map(log => {
      try {
        const userData = log.metadata;
        const deleter = deleterMap[log.userId];
        const deleterInfo = deleter ? 
          (deleter.role === 'SYS.AD' ? 'System Administrator' : deleter.name) : 
          'Unknown User';

        return {
          ...userData,
          permanentDeletedAt: log.createdAt,
          deletedBy: log.userId,
          deletedByUser: deleterInfo,
          deletedByRole: deleter ? deleter.role : null,
          deletedBySubRole: deleter ? deleter.subRole : null
        };
      } catch (parseError) {
        console.error('Error parsing metadata:', parseError);
        return null;
      }
    }).filter(user => user !== null);

    res.json({
      success: true,
      users: formattedHistory
    });

  } catch (error) {
    console.error('Get deleted users history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deleted users history'
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

// Check if email already exists
router.post('/check-email', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: email },
          { username: email }
        ]
      },
      paranoid: false // Include soft-deleted users
    });
    
    res.json({
      success: true,
      exists: !!existingUser
    });
    
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check email uniqueness'
    });
  }
});

// Check if contact number already exists
router.post('/check-contact', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { contactNumber } = req.body;
    
    if (!contactNumber) {
      return res.status(400).json({
        success: false,
        error: 'Contact number is required'
      });
    }
    
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { contactNumber: contactNumber },
          { phone: contactNumber }
        ]
      },
      paranoid: false // Include soft-deleted users
    });
    
    res.json({
      success: true,
      exists: !!existingUser
    });
    
  } catch (error) {
    console.error('Error checking contact number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check contact number uniqueness'
    });
  }
});

// ✅ ENHANCED: Check if MPMEC Secretariat Admin already exists
router.post('/check-mpmec-secretariat-admin', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    console.log('🔍 API: Checking for existing MPMEC Secretariat Admin...');
    
    const existingSecretariatAdmin = await User.findOne({
      where: {
        group: 'LGU-PMT',
        [Op.or]: [
          { subRole: { [Op.like]: '%Focal Person (Admin)%' } },
          { subRole: { [Op.like]: '%MPMEC Secretariat%Admin%' } }
        ],
        status: 'active' // Only check active users
      },
      paranoid: true // Exclude soft-deleted users
    });

    if (existingSecretariatAdmin) {
      console.log('❌ API: MPMEC Secretariat Admin already exists:', {
        id: existingSecretariatAdmin.id,
        name: existingSecretariatAdmin.fullName || existingSecretariatAdmin.name,
        username: existingSecretariatAdmin.username,
        subRole: existingSecretariatAdmin.subRole
      });

      res.json({
        success: true,
        exists: true,
        existingUser: {
          name: existingSecretariatAdmin.fullName || existingSecretariatAdmin.name,
          username: existingSecretariatAdmin.username,
          userId: existingSecretariatAdmin.userId
        }
      });
    } else {
      console.log('✅ API: No existing MPMEC Secretariat Admin found');
      res.json({
        success: true,
        exists: false,
        existingUser: null
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking MPMEC Secretariat Admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check MPMEC Secretariat Admin existence'
    });
  }
});

// Get unique departments from existing users
router.get('/departments', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching unique departments from existing users...');
    
    // Get unique departments from all users (active and soft-deleted)
    const departments = await User.findAll({
      attributes: ['department'],
      where: {
        department: {
          [Op.ne]: null // Not null
        }
      },
      group: ['department'],
      paranoid: false, // Include soft-deleted users
      raw: true
    });
    
    // Extract department names and sort them
    const departmentNames = departments
      .map(dept => dept.department)
      .filter(dept => dept && dept.trim() !== '') // Filter out empty strings
      .sort();
    
    console.log(`✅ Found ${departmentNames.length} unique departments:`, departmentNames);
    
    res.json({
      success: true,
      departments: departmentNames
    });
    
  } catch (error) {
    console.error('❌ Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments'
    });
  }
});

// Update user activity (heartbeat endpoint)
router.post('/activity/heartbeat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update user activity in tracker
    updateUserActivity(userId);
    
    // Also update lastLoginAt in database periodically (every 5 minutes)
    const activity = userActivityTracker.get(userId);
    if (activity) {
      const now = new Date();
      const lastUpdate = activity.lastDbUpdate || new Date(0);
      const timeSinceLastUpdate = (now - lastUpdate) / 1000 / 60; // minutes
      
      if (timeSinceLastUpdate >= 5) {
        await User.update(
          { lastLoginAt: now },
          { where: { id: userId } }
        );
        activity.lastDbUpdate = now;
      }
    }
    
    res.json({
      success: true,
      message: 'Activity updated',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error updating user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update activity'
    });
  }
});

// Get user activity status for multiple users
router.post('/activity/status', authenticateToken, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be an array'
      });
    }
    
    const statusMap = {};
    
    // Get users from database to ensure they exist
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.in]: userIds } },
          { userId: { [Op.in]: userIds } },
          { email: { [Op.in]: userIds } }
        ]
      },
      attributes: ['id', 'userId', 'email', 'lastLoginAt', 'status']
    });
    
    // Check activity status for each user
    for (const user of users) {
      const isActive = isUserActive(user.id);
      const activity = userActivityTracker.get(user.id);
      
      // Use multiple identifiers to ensure we can match users
      const identifiers = [user.id.toString(), user.userId, user.email].filter(Boolean);
      
      for (const identifier of identifiers) {
        statusMap[identifier] = {
          isActive: isActive,
          lastActivity: activity ? activity.lastActivity : user.lastLoginAt,
          status: user.status,
          userId: user.id
        };
      }
    }
    
    res.json({
      success: true,
      statusMap: statusMap,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error fetching user activity status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity status'
    });
  }
});

// Get single user activity status
router.get('/activity/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user by multiple possible identifiers
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { id: userId },
          { userId: userId },
          { email: userId }
        ]
      },
      attributes: ['id', 'userId', 'email', 'lastLoginAt', 'status', 'fullName', 'name']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const isActive = isUserActive(user.id);
    const activity = userActivityTracker.get(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.fullName || user.name,
        isActive: isActive,
        lastActivity: activity ? activity.lastActivity : user.lastLoginAt,
        status: user.status
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error fetching user activity status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity status'
    });
  }
});

module.exports = router; 
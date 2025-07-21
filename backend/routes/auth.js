const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, ActivityLog } = require('../models');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'buildwatch_lgu_secret_key_2024');
    
    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive user'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user by username (which is now email) or email
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      // Log failed login attempt for non-existent user
      await ActivityLog.create({
        userId: null,
        action: 'FAILED_LOGIN',
        entityType: 'User',
        entityId: null,
        details: `Failed login attempt for non-existent user: ${username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        level: 'Warning',
        status: 'Failed',
        module: 'Authentication'
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is not active. Please contact administrator.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Log failed login attempt
      await ActivityLog.create({
        userId: user.id,
        action: 'FAILED_LOGIN',
        entityType: 'User',
        entityId: user.id,
        details: `Failed login attempt for user ${user.name || user.username} - Invalid password`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        level: 'Warning',
        status: 'Failed',
        module: 'Authentication'
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last login
    await user.update({
      lastLoginAt: new Date()
    });

    // Log successful login activity
    await ActivityLog.create({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: `User ${user.name || user.username} logged in successfully`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      level: 'Info',
      status: 'Success',
      module: 'Authentication'
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        subRole: user.subRole
      },
      process.env.JWT_SECRET || 'buildwatch_lgu_secret_key_2024',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    // Return user data (excluding password)
    const userData = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      subRole: user.subRole,
      status: user.status,
      idType: user.idType,
      idNumber: user.idNumber,
      group: user.group,
      department: user.department,
      position: user.position,
      contactNumber: user.contactNumber,
      address: user.address,
      lastLoginAt: user.lastLoginAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: req.user.id,
      details: `User ${req.user.name || req.user.username} logged out successfully`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      level: 'Info',
      status: 'Success',
      module: 'Authentication'
    });

    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      user: {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
        subRole: req.user.subRole
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user profile endpoint
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update user profile endpoint
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      fullName,
      contactNumber,
      birthdate
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
    if (fullName) updateData.fullName = fullName;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (birthdate) updateData.birthdate = birthdate;

    await user.update(updateData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_PROFILE',
      entityType: 'User',
      entityId: user.id,
      details: `Updated profile information`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      level: 'Info',
      status: 'Success',
      module: 'Profile Management'
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        name: user.name,
        email: user.email,
        contactNumber: user.contactNumber,
        birthdate: user.birthdate,
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

// Change password endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({
      password: hashedPassword,
      passwordChangedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get available roles endpoint
router.get('/roles', (req, res) => {
  const roles = [
    {
      value: 'LGU-PMT',
      label: 'LGU-PMT (Monitoring Team)',
      subRoles: ['Chair', 'Vice Chair', 'Secretariat']
    },
    {
      value: 'EIU',
      label: 'EIU (External Implementing Units)',
      subRoles: ['EPIU Manager', 'EPIU Staff']
    },
    {
      value: 'LGU-IU',
      label: 'LGU-IU (Internal Units)',
      subRoles: ['MDC Chair', 'Oversight Officer', 'Implementing Staff']
    },
    {
      value: 'EMS',
      label: 'EMS (External Monitoring)',
      subRoles: ['NGO Representative', 'CSO Member', 'PPMC Representative']
    },
    {
      value: 'SYS.AD',
      label: 'SYS.AD (System Admin)',
      subRoles: ['System Administrator', 'Executive']
    }
  ];

  res.json({
    success: true,
    roles: roles
  });
});

// Test endpoint to create sample activity logs (for debugging)
router.post('/test-logs', async (req, res) => {
  try {
    const { action, userId, details } = req.body;
    
    // Create a test activity log
    await ActivityLog.create({
      userId: userId || 1,
      action: action || 'LOGIN',
      entityType: 'User',
      entityId: userId || 1,
      details: details || 'Test activity log entry',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      level: 'Info',
      status: 'Success',
      module: 'Authentication'
    });

    res.json({
      success: true,
      message: 'Test activity log created successfully'
    });
  } catch (error) {
    console.error('Test log creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test log'
    });
  }
});

// Validate EIU Personnel Account endpoint
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const user = await User.findOne({
      where: { 
        userId: userId,
        status: 'active'
      },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'EIU Personnel account not found'
      });
    }

    // Check if the user is an EIU Personnel
    if (user.role !== 'EIU') {
      return res.status(400).json({
        success: false,
        error: 'The specified user is not an EIU Personnel account'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        status: user.status
      }
    });
  } catch (error) {
    console.error('EIU account validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 
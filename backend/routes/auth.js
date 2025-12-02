const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, ActivityLog, Project, ProjectValidation, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendPasswordResetEmail } = require('../services/emailService');

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
    // Reload user to get updated lastLoginAt
    await user.reload();

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

    // Emit Socket.IO event for login (for admin dashboard real-time updates)
    // IMPORTANT: Emit AFTER lastLoginAt is updated and user is reloaded
    if (req.io && user.role !== 'EMS') {
      // Only emit for non-Gmail users (Gmail users use gmail_user_logged_in event)
      const feedbackIO = req.io.of('/feedback');
      feedbackIO.to('admin_dashboard').emit('user_logged_in', {
        userId: user.id,
        email: user.email,
        lastLoginAt: user.lastLoginAt
      });
      console.log(`📤 Emitted user_logged_in to admin dashboard for user: ${user.email}, lastLoginAt: ${user.lastLoginAt}`);
    }

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
      lastLoginAt: user.lastLoginAt,
      profilePictureUrl: user.profilePictureUrl,  // CRITICAL: Include profile picture URL
      userId: user.userId,  // CRITICAL: Include userId (like LGU-IU-0001)
      employeeId: user.employeeId,
      fullName: user.fullName || user.name,
      birthdate: user.birthdate
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

// Google OAuth login endpoint
router.post('/google-login', async (req, res) => {
  try {
    const { credential, email, name, picture, googleId } = req.body;

    // If credential is provided (from Google Identity Services), verify it
    if (credential) {
      // Verify the Google ID token
      const { OAuth2Client } = require('google-auth-library');
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      
      if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID') {
        console.error('❌ Google Client ID not configured in backend environment');
        return res.status(500).json({
          success: false,
          error: 'Google Sign-In is not configured on the server. Please contact administrator.'
        });
      }
      
      const client = new OAuth2Client(googleClientId);
      
      try {
        console.log('🔍 Verifying Google credential with Client ID:', googleClientId.substring(0, 20) + '...');
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleClientId
        });
        
        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleName = payload.name;
        const googlePicture = payload.picture;
        const googleUserId = payload.sub;

        // Find or create user
        let user = await User.findOne({
          where: {
            [require('sequelize').Op.or]: [
              { email: googleEmail },
              { username: googleEmail }
            ]
          }
        });

        if (!user) {
          // Create new user from Google account
          // Use 'EMS' role for public users (External Monitoring/Public users)
          // If you need a dedicated PUBLIC role, add it to the User model ENUM first
          user = await User.create({
            username: googleEmail,
            email: googleEmail,
            name: googleName || 'Google User',
            password: await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10), // Random password
            role: 'EMS', // Using EMS role for public/Google-authenticated users
            status: 'active',
            profilePictureUrl: googlePicture || null,
            lastLoginAt: new Date() // Set initial login time
          });

          // Log user creation
          await ActivityLog.create({
            userId: user.id,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: user.id,
            details: `User ${user.name} created via Google OAuth`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            level: 'Info',
            status: 'Success',
            module: 'Authentication'
          });
        } else {
          // Update last login and profile picture if needed
          await user.update({
            lastLoginAt: new Date(),
            profilePictureUrl: googlePicture || user.profilePictureUrl
          });
          // Reload user to get updated lastLoginAt
          await user.reload();
        }

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

        // Log successful login
        await ActivityLog.create({
          userId: user.id,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          details: `User ${user.name || user.username} logged in via Google OAuth`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          level: 'Info',
          status: 'Success',
          module: 'Authentication'
        });

        // Return user data (excluding password)
        const userData = {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          subRole: user.subRole,
          status: user.status,
          profilePicture: user.profilePictureUrl
        };

        // Emit Socket.IO event for login (for admin dashboard real-time updates)
        // IMPORTANT: Emit AFTER lastLoginAt is updated and user is reloaded
        if (req.io && user.role === 'EMS') {
          const feedbackIO = req.io.of('/feedback');
          feedbackIO.to('admin_dashboard').emit('gmail_user_logged_in', {
            userId: user.id,
            name: user.name,
            email: user.email,
            lastLoginAt: user.lastLoginAt, // This should now have the updated timestamp
            profilePictureUrl: user.profilePictureUrl
          });
          console.log(`📤 Emitted gmail_user_logged_in to admin dashboard for user: ${user.email}, lastLoginAt: ${user.lastLoginAt}`);
        }

        res.json({
          success: true,
          message: 'Login successful',
          token: token,
          user: userData
        });
      } catch (error) {
        console.error('❌ Google token verification error:', error.message);
        console.error('Error details:', {
          name: error.name,
          code: error.code,
          message: error.message
        });
        return res.status(401).json({
          success: false,
          error: `Invalid Google credential: ${error.message}`
        });
      }
    } else if (email && name) {
      // Fallback: direct OAuth (if credential verification fails)
      // Find or create user
      let user = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { email: email },
            { username: email }
          ]
        }
      });

      if (!user) {
        user = await User.create({
          username: email,
          email: email,
          name: name,
          password: await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10),
          role: 'EMS', // Using EMS role for public/Google-authenticated users
          status: 'active',
          profilePictureUrl: picture || null,
          lastLoginAt: new Date() // Set initial login time
        });
      } else {
        await user.update({
          lastLoginAt: new Date(),
          profilePictureUrl: picture || user.profilePictureUrl
        });
        // Reload user to get updated lastLoginAt
        await user.reload();
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET || 'buildwatch_lgu_secret_key_2024',
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      );

      const userData = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePicture: user.profilePictureUrl
      };

      // Emit Socket.IO event for login (for admin dashboard real-time updates)
      // IMPORTANT: Emit AFTER lastLoginAt is updated and user is reloaded
      if (req.io && user.role === 'EMS') {
        const feedbackIO = req.io.of('/feedback');
        feedbackIO.to('admin_dashboard').emit('gmail_user_logged_in', {
          userId: user.id,
          name: user.name,
          email: user.email,
          lastLoginAt: user.lastLoginAt, // This should now have the updated timestamp
          profilePictureUrl: user.profilePictureUrl
        });
        console.log(`📤 Emitted gmail_user_logged_in to admin dashboard for user: ${user.email}, lastLoginAt: ${user.lastLoginAt}`);
      }

      res.json({
        success: true,
        message: 'Login successful',
        token: token,
        user: userData
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Google credential or user info required'
      });
    }
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { User } = require('../models');
    
    // Import activity tracking functions
    const { updateUserActivity, userActivityTracker } = require('../middleware/auth');
    
    // Mark user as inactive immediately on logout
    const userId = req.user.id;
    userActivityTracker.delete(userId); // Remove from activity tracker
    
    // Update lastLogoutAt timestamp (if column exists)
    const user = await User.findByPk(userId);
    let lastLogoutAt = new Date();
    if (user) {
      try {
        // Update lastLogoutAt
        await user.update({
          lastLogoutAt: lastLogoutAt
        });
        // Reload user to get updated lastLogoutAt
        await user.reload();
        console.log(`✅ Updated lastLogoutAt for user ${user.email}: ${user.lastLogoutAt}`);
      } catch (updateError) {
        // Column might not exist yet - that's okay, just log and continue
        console.log('⚠️ Could not update lastLogoutAt (column may not exist yet):', updateError.message);
      }
      
      // Emit Socket.IO event for logout (for admin dashboard real-time updates)
      // IMPORTANT: Emit AFTER lastLogoutAt is updated and user is reloaded
      if (req.io) {
        const feedbackIO = req.io.of('/feedback');
        if (user.role === 'EMS') {
          // Gmail feedback users
          feedbackIO.to('admin_dashboard').emit('gmail_user_logged_out', {
            userId: user.id,
            email: user.email,
            lastLogoutAt: user.lastLogoutAt || lastLogoutAt
          });
          console.log(`📤 Emitted gmail_user_logged_out to admin dashboard for user: ${user.email}, lastLogoutAt: ${user.lastLogoutAt || lastLogoutAt}`);
        } else {
          // Regular users
          feedbackIO.to('admin_dashboard').emit('user_logged_out', {
            userId: user.id,
            email: user.email,
            lastLogoutAt: user.lastLogoutAt || lastLogoutAt
          });
          console.log(`📤 Emitted user_logged_out to admin dashboard for user: ${user.email}, lastLogoutAt: ${user.lastLogoutAt || lastLogoutAt}`);
        }
      }
    }
    
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

    // CRITICAL: Auto-fill missing address and position fields
    // NOTE: User model only has 'address' field, not 'location' (location is just a frontend display alias)
    let needsUpdate = false;
    const updateData = {};
    const defaultAddress = 'Municipal Hall, Santa Cruz, Laguna';

    // Set address if missing
    if (!user.address || user.address === '' || user.address === 'null' || user.address === 'undefined' || user.address === '-') {
      updateData.address = defaultAddress;
      needsUpdate = true;
    }

    // NOTE: User model only has 'address' field, not 'location' (location is just a frontend display alias)
    // The frontend uses userData.location || userData.address, so we only need to set address

    // Set position based on role/subRole if missing
    if (!user.position || user.position === '' || user.position === 'null' || user.position === 'undefined') {
      let defaultPosition = null;
      
      if (user.role === 'LGU-IU' || user.role === 'IU' || user.role === 'iu') {
        defaultPosition = 'Implementing Office Officer';
      } else if (user.role === 'EIU') {
        defaultPosition = 'External Partner';
      } else if (user.role === 'LGU-PMT' || user.role === 'MPMEC') {
        // Check if Secretariat
        if (user.subRole && (
          user.subRole.toLowerCase().includes('mpmec secretariat') || 
          user.subRole.toLowerCase().includes('secretariat')
        )) {
          defaultPosition = 'LGU - Project Monitoring Team';
        } else {
          // Regular MPMEC member
          defaultPosition = 'LGU - Project Monitoring Team';
        }
      } else if (user.role === 'MPMEC Secretariat' || user.role === 'Secretariat') {
        defaultPosition = 'LGU - Project Monitoring Team';
      }
      
      if (defaultPosition) {
        updateData.position = defaultPosition;
        needsUpdate = true;
      }
    }

    // Update user if needed
    if (needsUpdate) {
      await user.update(updateData);
      await user.reload(); // Reload to get updated values
      console.log('Auto-filled missing profile fields in /profile endpoint:', updateData);
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

// Check user ID endpoint (for debugging)
router.get('/check-user-id', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find user by userId
    const user = await User.findOne({
      where: {
        userId: userId.toUpperCase()
      },
      attributes: ['id', 'userId', 'email', 'name', 'username', 'status']
    });

    if (!user) {
      return res.json({
        success: false,
        error: 'User ID not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        username: user.username,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Check user ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Unique User ID is required'
      });
    }

    const normalizedUserId = userId.trim().toUpperCase();
    console.log('🔍 [FORGOT PASSWORD] Received userId:', normalizedUserId);

    // Try multiple lookup strategies
    let user = null;

    // Strategy 1: Find by userId (case-insensitive using Sequelize function)
    user = await User.findOne({
      where: sequelize.where(
        sequelize.fn('UPPER', sequelize.col('userId')),
        normalizedUserId
      )
    });

    console.log('🔍 [FORGOT PASSWORD] Strategy 1 (userId exact):', user ? `Found - ${user.email}` : 'Not found');

    // Strategy 2: If not found, try by email (in case user enters email instead)
    if (!user) {
      // Check if input looks like an email
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailPattern.test(userId.trim())) {
        user = await User.findOne({
          where: {
            email: userId.trim().toLowerCase()
          }
        });
        console.log('🔍 [FORGOT PASSWORD] Strategy 2 (email lookup):', user ? `Found - ${user.email}` : 'Not found');
      }
    }

    // Strategy 3: For System Admin, try to find by role if userId pattern matches
    if (!user && normalizedUserId.startsWith('SYS-AD-')) {
      // Find System Admin by role
      const sysAdmin = await User.findOne({
        where: {
          role: 'SYS.AD',
          status: 'active'
        },
        order: [['createdAt', 'ASC']] // Get the first/oldest System Admin
      });
      
      if (sysAdmin) {
        // If System Admin doesn't have userId set, update it
        if (!sysAdmin.userId) {
          await sysAdmin.update({ userId: normalizedUserId });
          console.log('🔍 [FORGOT PASSWORD] System Admin userId updated to:', normalizedUserId);
        }
        user = sysAdmin;
        console.log('🔍 [FORGOT PASSWORD] Strategy 3 (System Admin by role):', `Found - ${user.email}`);
      }
    }

    // Strategy 4: Try to find any active user with matching email pattern (last resort)
    if (!user) {
      // Only try this if the input doesn't look like a standard userId format
      const userIdPattern = /^[A-Z]+-[A-Z]+-\d+$/;
      if (!userIdPattern.test(normalizedUserId)) {
        user = await User.findOne({
          where: {
            email: {
              [Op.like]: `%${normalizedUserId.toLowerCase()}%`
            },
            status: 'active'
          }
        });
        console.log('🔍 [FORGOT PASSWORD] Strategy 4 (email pattern):', user ? `Found - ${user.email}` : 'Not found');
      }
    }

    // Return error if user doesn't exist or is not active
    if (!user) {
      console.log('❌ [FORGOT PASSWORD] User not found after all strategies');
      return res.status(404).json({
        success: false,
        error: 'Unique User ID not found or does not exist'
      });
    }

    if (user.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Account is not active. Please contact administrator.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    console.log('🔍 [FORGOT PASSWORD] Generated reset token, expiry:', resetTokenExpiry);

    // Save token to user
    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpiry
    });

    // Determine frontend URL based on environment
    // In production, use FRONTEND_URL from environment, otherwise default to localhost
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || (isProduction ? 'https://build-watch.com' : 'http://localhost:4321');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    console.log('🔍 [FORGOT PASSWORD] User email:', user.email);
    console.log('🔍 [FORGOT PASSWORD] Environment:', process.env.NODE_ENV || 'development');
    console.log('🔍 [FORGOT PASSWORD] Frontend URL:', frontendUrl);
    console.log('🔍 [FORGOT PASSWORD] Reset URL:', resetUrl);
    console.log('🔍 [FORGOT PASSWORD] Checking email configuration...');
    
    // Send password reset email to BOTH:
    // 1. System admin email (buildwatch69@gmail.com)
    // 2. User's email address
    const systemAdminEmail = 'buildwatch69@gmail.com';
    const userEmail = user.email;
    const userName = user.name || user.fullName || user.username;
    
    let systemAdminEmailSent = false;
    let userEmailSent = false;
    
    // Send email to system admin
    try {
      console.log('🔍 [FORGOT PASSWORD] Sending email to system admin:', systemAdminEmail);
      systemAdminEmailSent = await sendPasswordResetEmail(
        systemAdminEmail,
        resetUrl, 
        userName, 
        user.userId,
        userEmail // Pass user's email for display in email body
      );
      console.log('✅ [FORGOT PASSWORD] System admin email sent:', systemAdminEmailSent);
    } catch (emailError) {
      console.error('❌ [FORGOT PASSWORD] System admin email sending failed:', emailError.message);
      systemAdminEmailSent = false;
    }
    
    // Send email to user (if user has a valid email and it's different from system admin)
    if (userEmail && userEmail.trim() !== '' && userEmail.toLowerCase() !== systemAdminEmail.toLowerCase()) {
      try {
        console.log('🔍 [FORGOT PASSWORD] Sending email to user:', userEmail);
        userEmailSent = await sendPasswordResetEmail(
          userEmail,
          resetUrl, 
          userName, 
          user.userId,
          null // No need to show original email when sending to the user themselves
        );
        console.log('✅ [FORGOT PASSWORD] User email sent:', userEmailSent);
      } catch (emailError) {
        console.error('❌ [FORGOT PASSWORD] User email sending failed:', emailError.message);
        userEmailSent = false;
      }
    } else {
      console.log('⚠️ [FORGOT PASSWORD] User email is missing or same as system admin, skipping user email');
    }
    
    // Consider it successful if at least one email was sent
    const emailSent = systemAdminEmailSent || userEmailSent;

    // Log activity
    await ActivityLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      details: `Password reset requested for user ${user.userId} (${user.email})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      level: 'Info',
      status: 'Success',
      module: 'Authentication'
    });

    // Build response message based on which emails were sent
    let message = 'Password reset link has been sent.';
    if (systemAdminEmailSent && userEmailSent) {
      message = `Password reset link has been sent to both ${systemAdminEmail} and ${userEmail}.`;
    } else if (systemAdminEmailSent) {
      message = `Password reset link has been sent to ${systemAdminEmail}.`;
    } else if (userEmailSent) {
      message = `Password reset link has been sent to ${userEmail}.`;
    } else {
      message = 'Password reset link generation completed, but email sending failed. Please contact administrator.';
    }
    
    res.json({
      success: emailSent, // Return true only if at least one email was sent
      message: message,
      email: user.email, // Return user email for display in success message
      emailsSent: {
        systemAdmin: systemAdminEmailSent,
        user: userEmailSent
      }
    });

  } catch (error) {
    console.error('❌ [FORGOT PASSWORD] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, userId, newPassword, confirmPassword } = req.body;

    if (!token || !userId || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token, Unique User ID, new password, and confirm password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    // Find user by reset token and userId, check if token is valid and not expired
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        userId: userId.toUpperCase(),
        resetPasswordExpires: {
          [Op.gt]: new Date() // Token must not be expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token, or Unique User ID does not match'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await user.update({
      password: hashedPassword,
      passwordChangedAt: new Date(),
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    // Log activity
    await ActivityLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
      details: `Password reset completed for user ${user.userId} (${user.email})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      level: 'Info',
      status: 'Success',
      module: 'Authentication'
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify reset token endpoint (for checking if token is valid before showing reset form)
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Find user by reset token and check if token is valid and not expired
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          [Op.gt]: new Date() // Token must not be expired
        }
      },
      attributes: ['id', 'userId', 'email']
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      userId: user.userId // Return userId for the form
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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

// Get profile completion percentage (MUST be before /profile/:userId)
router.get('/profile/completion', authenticateToken, async (req, res) => {
  try {
    // Force reload user from database to get latest data (including profilePictureUrl)
    // Use raw query to bypass any caching
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'fullName', 'email', 'contactNumber', 'birthdate', 'department', 'position', 'profilePictureUrl', 'address', 'role', 'subRole'],
      raw: false // Get Sequelize instance to ensure fresh data
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Force reload from database to get latest profilePictureUrl
    await user.reload();

    // CRITICAL: Auto-fill missing address and position fields
    // NOTE: User model only has 'address' field, not 'location' (location is just a frontend display alias)
    let needsUpdate = false;
    const updateData = {};
    const defaultAddress = 'Municipal Hall, Santa Cruz, Laguna';

    // Set address if missing
    if (!user.address || user.address === '' || user.address === 'null' || user.address === 'undefined' || user.address === '-') {
      updateData.address = defaultAddress;
      needsUpdate = true;
    }

    // NOTE: User model only has 'address' field, not 'location' (location is just a frontend display alias)
    // The frontend uses userData.location || userData.address, so we only need to set address

    // Set position based on role/subRole if missing
    if (!user.position || user.position === '' || user.position === 'null' || user.position === 'undefined') {
      let defaultPosition = null;
      
      if (user.role === 'LGU-IU' || user.role === 'IU' || user.role === 'iu') {
        defaultPosition = 'Implementing Office Officer';
      } else if (user.role === 'EIU') {
        defaultPosition = 'External Partner';
      } else if (user.role === 'LGU-PMT' || user.role === 'MPMEC') {
        // Check if Secretariat
        if (user.subRole && (
          user.subRole.toLowerCase().includes('mpmec secretariat') || 
          user.subRole.toLowerCase().includes('secretariat')
        )) {
          defaultPosition = 'LGU - Project Monitoring Team';
        } else {
          // Regular MPMEC member
          defaultPosition = 'LGU - Project Monitoring Team';
        }
      } else if (user.role === 'MPMEC Secretariat' || user.role === 'Secretariat') {
        defaultPosition = 'LGU - Project Monitoring Team';
      }
      
      if (defaultPosition) {
        updateData.position = defaultPosition;
        needsUpdate = true;
      }
    }

    // Update user if needed
    if (needsUpdate) {
      await user.update(updateData);
      await user.reload(); // Reload to get updated values
      console.log('Auto-filled missing profile fields:', updateData);
    }

    // Calculate completion based on filled fields
    // NOTE: User model only has 'address' field, not 'location' (location is just a frontend display alias)
    const fields = {
      name: user.name || user.fullName,
      email: user.email,
      contactNumber: user.contactNumber,
      birthdate: user.birthdate,
      department: user.department,
      position: user.position,
      profilePictureUrl: user.profilePictureUrl,
      address: user.address
    };

    // Check if profilePictureUrl is valid (not null, not empty, and not just whitespace)
    // Handle both string and null/undefined cases
    let profilePicValue = fields.profilePictureUrl;
    
    // If profilePictureUrl is null/empty in database, try to check profile-data.json file
    // This handles cases where the profile picture was uploaded but not properly saved to the user record
    if (!profilePicValue || profilePicValue === 'null' || profilePicValue === 'undefined' || profilePicValue.trim() === '') {
      try {
        const fs = require('fs');
        const path = require('path');
        const profileDataPath = path.join(__dirname, '../uploads/profile-pictures/profile-data.json');
        
        if (fs.existsSync(profileDataPath)) {
          const profileData = JSON.parse(fs.readFileSync(profileDataPath, 'utf8'));
          
          // Try multiple possible ID formats (same as profile picture endpoint)
          const possibleIds = [
            user.id.toString(), // Primary key
            user.userId, // userId field (UUID or SA-001)
            user.email // Email
          ];
          
          // Remove duplicates
          const uniqueIds = [...new Set(possibleIds.filter(id => id))];
          
          console.log('🔍 [Profile Completion Debug] Checking profile-data.json with IDs:', uniqueIds);
          
          // Try each possible ID
          for (const id of uniqueIds) {
            if (profileData[id] && profileData[id].profilePictureUrl) {
              profilePicValue = profileData[id].profilePictureUrl;
              console.log('✅ [Profile Completion Debug] Found profile picture in profile-data.json for ID:', id, 'URL:', profilePicValue.substring(0, 50) + '...');
              
              // Update the user record with the found profile picture URL
              if (profilePicValue && !profilePicValue.startsWith('data:')) {
                try {
                  await user.update({ profilePictureUrl: profilePicValue });
                  await user.reload();
                  fields.profilePictureUrl = profilePicValue;
                  console.log('✅ [Profile Completion Debug] Updated user record with profile picture URL from profile-data.json');
                } catch (updateError) {
                  console.error('❌ [Profile Completion Debug] Failed to update user record:', updateError.message);
                }
              }
              break;
            }
          }
          
          if (!profilePicValue || profilePicValue === 'null' || profilePicValue === 'undefined' || profilePicValue.trim() === '') {
            console.log('⚠️ [Profile Completion Debug] Profile picture not found in profile-data.json for any of the IDs:', uniqueIds);
            console.log('🔍 [Profile Completion Debug] Available keys in profile-data.json:', Object.keys(profileData).slice(0, 10));
          }
        } else {
          console.log('⚠️ [Profile Completion Debug] profile-data.json file does not exist at:', profileDataPath);
        }
      } catch (profilePicError) {
        console.error('❌ [Profile Completion Debug] Error checking profile-data.json:', profilePicError.message);
      }
    }
    
    const hasProfilePicture = profilePicValue !== null && 
                              profilePicValue !== undefined &&
                              typeof profilePicValue === 'string' &&
                              profilePicValue.trim() !== '' && 
                              profilePicValue !== 'null' &&
                              profilePicValue !== 'undefined' &&
                              !profilePicValue.startsWith('data:image/svg+xml'); // Exclude default SVG placeholders

    const totalFields = Object.keys(fields).length;
    let filledFields = Object.entries(fields)
      .filter(([key, value]) => {
        if (key === 'profilePictureUrl') {
          return hasProfilePicture;
        }
        return value && value !== '' && value !== 'null' && value !== 'undefined' && value !== '-';
      }).length;

    const completionPercentage = Math.round((filledFields / totalFields) * 100);

    const missingFields = Object.entries(fields)
      .filter(([key, value]) => {
        if (key === 'profilePictureUrl') {
          return !hasProfilePicture;
        }
        return !value || value === '' || value === 'null' || value === 'undefined' || value === '-';
      })
      .map(([key]) => key);

    console.log('🔍 [Profile Completion Debug] Profile completion calculation:', {
      userId: user.id,
      userUserId: user.userId,
      email: user.email,
      role: user.role,
      subRole: user.subRole,
      fields: fields,
      profilePictureUrl: user.profilePictureUrl,
      profilePictureUrlType: typeof user.profilePictureUrl,
      profilePictureUrlLength: user.profilePictureUrl ? user.profilePictureUrl.length : 0,
      profilePicValue: profilePicValue ? (profilePicValue.substring(0, 50) + '...') : null,
      hasProfilePicture,
      filledFields,
      totalFields,
      completionPercentage,
      missingFields
    });

    res.json({
      success: true,
      completion: {
        percentage: completionPercentage,
        filledFields,
        totalFields,
        missingFields
      }
    });
  } catch (error) {
    console.error('Get profile completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate profile completion'
    });
  }
});

// Get user activity history (MUST be before /profile/:userId)
router.get('/profile/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const activities = await ActivityLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: limit
    });

    res.json({
      success: true,
      activities: activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        details: activity.details,
        module: activity.module,
        level: activity.level,
        status: activity.status,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        createdAt: activity.createdAt
      }))
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity history'
    });
  }
});

// Get user statistics (MUST be before /profile/:userId)
router.get('/profile/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get activity counts
    const totalActivities = await ActivityLog.count({ where: { userId } });
    const recentActivities = await ActivityLog.count({
      where: {
        userId,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Get last activity
    const lastActivity = await ActivityLog.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
      attributes: ['createdAt', 'action', 'module'],
      raw: true
    });

    // Role-specific statistics
    const stats = {
      account: {
        accountCreated: user.createdAt,
        lastLogin: user.lastLoginAt,
        lastLogout: user.lastLogoutAt,
        profileUpdated: user.updatedAt,
        status: user.status
      },
      activity: {
        totalActivities,
        recentActivities,
        lastActivity: lastActivity || null
      }
    };

    // Add role-specific stats
    if (user.role === 'LGU-IU') {
      // Get project-related stats for LGU-IU
      const projectsManaged = await Project.count({
        where: { implementingOfficeId: userId }
      });
      stats.projects = { managed: projectsManaged };
    } else if (user.role === 'LGU-PMT' || user.role === 'MPMEC Secretariat') {
      // Get validation/review stats
      const validationsCompleted = await ProjectValidation.count({
        where: { validatorId: userId }
      });
      stats.validations = { completed: validationsCompleted };
    } else if (user.role === 'EIU') {
      // Get EIU project stats
      const projectsAssigned = await Project.count({
        where: { eiuPersonnelId: userId }
      });
      stats.projects = { assigned: projectsAssigned };
    } else if (user.role === 'SYS.AD') {
      // Get system admin stats
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      stats.system = { totalUsers, activeUsers };
    }

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
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

// Password verification endpoint for UUID reveal
router.post('/verify-password', authenticateToken, async (req, res) => {
  try {
    const { password, targetUserId } = req.body;
    const adminUserId = req.user.id; // The admin requesting the reveal

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
    }

    // Get the target user whose UUID is being revealed
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Target user not found'
      });
    }

    // Verify the target user's password (not the admin's password)
    const isPasswordValid = await bcrypt.compare(password, targetUser.password);
    
    if (!isPasswordValid) {
      // Log failed password verification attempt
      await ActivityLog.create({
        userId: adminUserId,
        action: 'UUID_REVEAL_FAILED',
        details: `Failed password verification for UUID reveal of user ${targetUserId}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid password for the target user'
      });
    }

    // Log successful password verification
    await ActivityLog.create({
      userId: adminUserId,
      action: 'UUID_REVEAL_SUCCESS',
      details: `Successful password verification for UUID reveal of user ${targetUserId}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Password verified successfully'
    });

  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Password verification endpoint for admin operations (delete, etc.) - verifies the logged-in admin's own password
router.post('/verify-own-password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const adminUserId = req.user.id; // The admin performing the operation

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    // Get the logged-in admin user
    const adminUser = await User.findByPk(adminUserId);
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify the admin's own password
    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    
    if (!isPasswordValid) {
      // Log failed password verification attempt
      await ActivityLog.create({
        userId: adminUserId,
        action: 'PASSWORD_VERIFICATION_FAILED',
        details: `Failed password verification for admin operation`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Log successful password verification
    await ActivityLog.create({
      userId: adminUserId,
      action: 'PASSWORD_VERIFICATION_SUCCESS',
      details: `Successful password verification for admin operation`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Password verified successfully'
    });

  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 
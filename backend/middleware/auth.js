const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Store for tracking user activity (in production, this should be Redis or database)
const userActivityTracker = new Map();

// Function to update user activity
const updateUserActivity = (userId) => {
  userActivityTracker.set(userId, {
    lastActivity: new Date(),
    isActive: true
  });
};

// Function to check if user is active (within last 2 minutes for faster detection)
const isUserActive = (userId) => {
  const activity = userActivityTracker.get(userId);
  if (!activity) return false;
  
  const now = new Date();
  const lastActivity = new Date(activity.lastActivity);
  const timeDiff = (now - lastActivity) / 1000 / 60; // minutes
  
  return timeDiff <= 2; // Consider active if last activity within 2 minutes
};

// Cleanup inactive users periodically (faster cleanup for real-time updates)
setInterval(() => {
  const now = new Date();
  const inactiveUsers = [];
  
  for (const [userId, activity] of userActivityTracker.entries()) {
    const lastActivity = new Date(activity.lastActivity);
    const timeDiff = (now - lastActivity) / 1000 / 60; // minutes
    
    if (timeDiff > 2) { // Remove after 2 minutes of inactivity
      inactiveUsers.push(userId);
    }
  }
  
  // Remove inactive users
  inactiveUsers.forEach(userId => {
    userActivityTracker.delete(userId);
    console.log(`🔄 User ${userId} marked as inactive due to timeout`);
  });
  
  if (inactiveUsers.length > 0) {
    console.log(`🧹 Cleaned up ${inactiveUsers.length} inactive users`);
  }
}, 15000); // Check every 15 seconds for faster real-time updates

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  console.log('🔍 Auth middleware - Request received:', {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers['authorization']
  });
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 Auth middleware - Token check:', {
    hasToken: !!token,
    tokenLength: token ? token.length : 0
  });

  if (!token) {
    console.log('❌ Auth middleware - No token provided');
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

    // Update user activity on every authenticated request
    updateUserActivity(user.id);

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Middleware to check roles (accepts single role or array of roles)
const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('🔍 Role middleware - Checking roles:', {
      userRole: req.user?.role,
      allowedRoles: roles,
      hasUser: !!req.user
    });
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      console.log('❌ Role middleware - Access denied:', {
        userRole,
        allowedRoles
      });
      return res.status(403).json({
        success: false,
        error: `Access denied. One of the following roles required: ${allowedRoles.join(', ')}`
      });
    }
    
    console.log('✅ Role middleware - Access granted');
    next();
  };
};

// Middleware to check multiple roles (legacy function name)
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. One of the following roles required: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Middleware to check specific sub-role
const requireSubRole = (subRole) => {
  return (req, res, next) => {
    if (req.user.subRole !== subRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. ${subRole} privileges required.`
      });
    }
    next();
  };
};

// Middleware to check multiple sub-roles
const requireAnySubRole = (subRoles) => {
  return (req, res, next) => {
    if (!subRoles.includes(req.user.subRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. One of the following sub-roles required: ${subRoles.join(', ')}`
      });
    }
    next();
  };
};

// Specific role middlewares for new role system
const requireEIU = requireRole('EIU');
const requireIU = requireRole('iu');
const requireSecretariat = requireRole('secretariat');
const requireMPMEC = requireRole('mpmec');

// Legacy role middlewares (for backward compatibility)
const requireSystemAdmin = requireRole('SYS.AD');
const requireLGUPMT = requireRole('LGU-PMT');
const requireLGUIU = requireRole('LGU-IU');
const requireEMS = requireRole('EMS');

// Multiple role middlewares
const requireAdminOrPMT = requireAnyRole(['SYS.AD', 'LGU-PMT']);
const requireAdminOrEIU = requireAnyRole(['SYS.AD', 'EIU']);
const requireAdminOrIU = requireAnyRole(['SYS.AD', 'LGU-IU']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAnyRole,
  requireSubRole,
  requireAnySubRole,
  // New role middlewares
  requireEIU,
  requireIU,
  requireSecretariat,
  requireMPMEC,
  // Legacy role middlewares
  requireSystemAdmin,
  requireLGUPMT,
  requireLGUIU,
  requireEMS,
  requireAdminOrPMT,
  requireAdminOrEIU,
  requireAdminOrIU,
  // Activity tracking functions
  updateUserActivity,
  isUserActive,
  userActivityTracker
}; 
const jwt = require('jsonwebtoken');
const { User } = require('../models');

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

// Middleware to check roles (accepts single role or array of roles)
const requireRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. One of the following roles required: ${allowedRoles.join(', ')}`
      });
    }
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
  requireAdminOrIU
}; 
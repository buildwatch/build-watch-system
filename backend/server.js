const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database models
const db = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const rpmesRoutes = require('./routes/rpmes');
const monitoringRoutes = require('./routes/monitoring');
const reportRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/uploads');
const adminRoutes = require('./routes/admin');
const eiuRoutes = require('./routes/eiu');
const iuProjectRoutes = require('./routes/iu/projects');
const { router: activityLogRoutes } = require('./routes/activity-logs');
const { router: notificationRoutes } = require('./routes/notifications');
const homeRoutes = require('./routes/home');
const articleRoutes = require('./routes/articles');
const milestoneRoutes = require('./routes/milestones');
const projectUpdateRoutes = require('./routes/project-updates');
const templateRoutes = require('./routes/templates');
const communicationRoutes = require('./routes/communications');
const coordinationRoutes = require('./routes/coordination');
const eiuActivityRoutes = require('./routes/eiu-activities');
const policyRoutes = require('./routes/policies');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:4321', // Astro dev default
    'http://localhost:4322', // Astro fallback port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));

// Rate limiting - Development-friendly configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// General rate limiter - very lenient in development
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 1000, // 5000 requests in dev, 1000 in production
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks, home endpoints, and GET requests in development
    if (isDevelopment) {
      return req.path === '/api/health' || 
             req.path.startsWith('/api/home/') ||
             req.method === 'GET' ||
             req.path.startsWith('/api/projects') ||
             req.path.startsWith('/api/articles');
    }
    return req.path === '/api/health';
  }
});

// Login-specific rate limiter - more restrictive but still reasonable
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 10, // 50 login attempts in dev, 10 in production
  message: {
    error: 'Too many login attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to login endpoint
    return req.path !== '/api/auth/login';
  }
});

// Apply rate limiting only to specific endpoints that need protection
if (!isDevelopment) {
  // In production, apply general limiter to all API routes
  app.use('/api/', generalLimiter);
} else {
  // In development, apply only to sensitive endpoints
  app.use('/api/auth', generalLimiter);
  app.use('/api/admin', generalLimiter);
  app.use('/api/users', generalLimiter);
}

// Apply login limiter to auth routes
app.use('/api/auth', loginLimiter);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rpmes', rpmesRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/eiu', eiuRoutes);
app.use('/api/iu/projects', iuProjectRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/project-updates', projectUpdateRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/coordination', coordinationRoutes);
app.use('/api/eiu-activities', eiuActivityRoutes);
app.use('/api/policies', policyRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database models (create tables if they don't exist)
    // Temporarily disabled sync to avoid MySQL key limit issues
    // if (process.env.NODE_ENV === 'development') {
    //   await db.sequelize.sync({ alter: true });
    //   console.log('✅ Database models synchronized.');
    // }
    console.log('⚠️  Database sync disabled to avoid MySQL key limit issues.');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Build Watch LGU Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

// Start the server
startServer(); 
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
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
const webhookRoutes = require('./routes/webhooks');
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
const profileRoutes = require('./routes/profile');
const messageRoutes = require('./routes/messages');
const projectCommentRoutes = require('./routes/project-comments');
const testEmailRoutes = require('./routes/test-email');
const { checkAndPublishScheduledAnnouncements, checkAndExpireAnnouncements } = require('./services/scheduledAnnouncements');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO with production-ready configuration
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: [
      'http://localhost:4321',
      'http://localhost:4322',
      'https://build-watch.com',
      'http://build-watch.com',
      'https://www.build-watch.com',
      'http://www.build-watch.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Allow Engine.IO v3 clients for compatibility
  pingTimeout: 60000, // Increased for reverse proxy
  pingInterval: 25000, // Standard ping interval
  upgradeTimeout: 30000, // Timeout for upgrade to websocket
  maxHttpBufferSize: 1e8, // 100MB max buffer size
  // Enable compression for better performance
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    threshold: 1024 // Only compress messages larger than 1KB
  }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.log('🔐 Socket authentication attempt');
  console.log('🔐 Token present:', !!token);
  
  if (!token) {
    console.error('❌ No token provided in socket handshake');
    return next(new Error('Authentication error: No token'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔐 Token decoded successfully');
    console.log('🔐 Decoded payload:', decoded);
    
    // Try different possible ID fields - check userId first (as JWT uses userId)
    const userId = decoded.userId || decoded.id || decoded.sub || decoded.user_id;
    
    if (!userId) {
      console.error('❌ No user ID found in token payload');
      console.error('   Available fields:', Object.keys(decoded));
      console.error('   Decoded token:', decoded);
      return next(new Error('Authentication error: No user ID in token'));
    }
    
    socket.userId = String(userId); // Ensure it's a string
    console.log('✅ Socket userId set to:', socket.userId);
    socket.user = decoded;
    
    console.log('✅ Socket authenticated for user:', socket.userId);
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return next(new Error('Authentication error: ' + err.message));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User ${socket.userId} connected`);
  console.log(`✅ Socket ID: ${socket.id}`);
  
  // Join user's personal room (room name is the user's ID as string)
  const userIdString = String(socket.userId);
  socket.join(userIdString);
  console.log(`✅ User ${socket.userId} joined room: ${userIdString}`);
  
  // Verify room join
  const rooms = Array.from(socket.rooms);
  console.log(`✅ Socket ${socket.id} is in rooms:`, rooms);
  
  // Verify the user's room is in the list
  if (rooms.includes(userIdString)) {
    console.log(`✅ Room join verified: ${userIdString} is in socket rooms`);
  } else {
    console.error(`❌ Room join failed! ${userIdString} is NOT in socket rooms`);
    console.error(`   Expected room: ${userIdString}`);
    console.error(`   Actual rooms:`, rooms);
  }
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`⚠️ User ${socket.userId} disconnected. Reason: ${reason}`);
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(data.recipientId).emit('user_typing', {
      userId: socket.userId,
      isTyping: data.isTyping
    });
  });
  
  // Handle message read receipts
  socket.on('message_read', (data) => {
    socket.to(data.senderId).emit('message_read_receipt', {
      messageId: data.messageId,
      readBy: socket.userId,
      readAt: new Date()
    });
  });
});

// Public feedback namespace (no authentication required)
const feedbackIO = io.of('/feedback');

feedbackIO.on('connection', (socket) => {
  console.log(`✅ Feedback client connected: ${socket.id}`);
  
  // Handle joining project room
  socket.on('join_project', (data) => {
    const { projectId } = data;
    if (projectId) {
      const roomName = `project:${projectId}`;
      socket.join(roomName);
      console.log(`✅ Feedback client ${socket.id} joined project room: ${roomName}`);
    }
  });
  
  // Handle leaving project room
  socket.on('leave_project', (data) => {
    const { projectId } = data;
    if (projectId) {
      const roomName = `project:${projectId}`;
      socket.leave(roomName);
      console.log(`✅ Feedback client ${socket.id} left project room: ${roomName}`);
    }
  });
  
  // Handle joining admin room (for System Admins)
  socket.on('join_admin', () => {
    socket.join('admin_dashboard');
    console.log(`✅ Feedback client ${socket.id} joined admin room`);
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`⚠️ Feedback client ${socket.id} disconnected. Reason: ${reason}`);
  });
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Security middleware - More permissive for development
const isDevelopment = process.env.NODE_ENV !== 'production';
app.use(helmet({
  contentSecurityPolicy: isDevelopment ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:", "http://localhost:3000", "http://localhost:4321", "*"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:4321', // Astro dev default
    'http://localhost:4322', // Astro fallback port
    'https://build-watch.com', // Production frontend (HTTPS)
    'http://build-watch.com', // Production frontend (HTTP)
    'https://www.build-watch.com', // Production frontend with www (HTTPS)
    'http://www.build-watch.com', // Production frontend with www (HTTP)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Accept', 'Origin', 'X-Requested-With', 'X-Session-ID', 'x-session-id'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting - Development-friendly configuration
// isDevelopment is already defined above

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

// Handle preflight OPTIONS requests for uploaded files
app.options('/uploads/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Handle preflight OPTIONS requests for message files (must be before generic route)
app.options('/uploads/messages/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Specific route for message files with explicit CORS (must be before generic /uploads/:filename)
app.get('/uploads/messages/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'messages', filename);
  
  console.log(`📸 Requesting message file: ${filename}`);
  console.log(`📸 File path: ${filePath}`);
  
  // Set explicit CORS headers BEFORE any other operations
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Message file not found: ${filePath}`);
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Determine content type based on file extension
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.jfif') {
    contentType = 'image/jpeg';
  } else if (ext === '.png') {
    contentType = 'image/png';
  } else if (ext === '.gif') {
    contentType = 'image/gif';
  } else if (ext === '.webp') {
    contentType = 'image/webp';
  } else if (ext === '.bmp') {
    contentType = 'image/bmp';
  } else if (ext === '.svg') {
    contentType = 'image/svg+xml';
  } else if (ext === '.mp4') {
    contentType = 'video/mp4';
  } else if (ext === '.webm') {
    contentType = 'video/webm';
  } else if (ext === '.mov') {
    contentType = 'video/quicktime';
  } else if (ext === '.avi') {
    contentType = 'video/x-msvideo';
  } else if (ext === '.xlsx') {
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (ext === '.xls') {
    contentType = 'application/vnd.ms-excel';
  } else if (ext === '.pdf') {
    contentType = 'application/pdf';
  } else if (ext === '.doc') {
    contentType = 'application/msword';
  } else if (ext === '.docx') {
    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  
  res.setHeader('Content-Type', contentType);
  
  console.log(`✅ Sending message file with Content-Type: ${contentType}`);
  
  // Send the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('❌ Error sending message file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error sending file' });
      }
    } else {
      console.log(`✅ Successfully sent message file: ${filename}`);
    }
  });
});

// Specific route for uploaded files with explicit CORS
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Set explicit CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Check if file exists
  if (!require('fs').existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Determine content type based on file extension
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.jfif') {
    contentType = 'image/jpeg';
  } else if (ext === '.png') {
    contentType = 'image/png';
  } else if (ext === '.gif') {
    contentType = 'image/gif';
  } else if (ext === '.webp') {
    contentType = 'image/webp';
  } else if (ext === '.mp4') {
    contentType = 'video/mp4';
  } else if (ext === '.webm') {
    contentType = 'video/webm';
  } else if (ext === '.mov') {
    contentType = 'video/quicktime';
  } else if (ext === '.xlsx') {
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (ext === '.xls') {
    contentType = 'application/vnd.ms-excel';
  } else if (ext === '.pdf') {
    contentType = 'application/pdf';
  } else if (ext === '.doc') {
    contentType = 'application/msword';
  } else if (ext === '.docx') {
    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  // Send the file
  res.sendFile(filePath);
});

// Static file serving for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
    return;
  }
  
  // Set CORS headers for actual requests - more permissive for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Add cache control headers
  res.header('Cache-Control', 'public, max-age=31536000'); // 1 year
  res.header('Vary', 'Origin');
  
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  // Static file options
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set proper content type for all file types
    const ext = path.toLowerCase().split('.').pop();
    
    // Images
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === 'png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === 'gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (ext === 'webp') {
      res.setHeader('Content-Type', 'image/webp');
    } else if (ext === 'bmp') {
      res.setHeader('Content-Type', 'image/bmp');
    }
    
    // Videos
    else if (ext === 'mp4') {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (ext === 'webm') {
      res.setHeader('Content-Type', 'video/webm');
    } else if (ext === 'ogg' || ext === 'ogv') {
      res.setHeader('Content-Type', 'video/ogg');
    } else if (ext === 'avi') {
      res.setHeader('Content-Type', 'video/x-msvideo');
    } else if (ext === 'mov') {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (ext === 'wmv') {
      res.setHeader('Content-Type', 'video/x-ms-wmv');
    }
    
    // Documents
    else if (ext === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (ext === 'doc') {
      res.setHeader('Content-Type', 'application/msword');
    } else if (ext === 'docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } else if (ext === 'xls') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
    } else if (ext === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (ext === 'ppt') {
      res.setHeader('Content-Type', 'application/vnd.ms-powerpoint');
    } else if (ext === 'pptx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    }
    
    // Text files
    else if (ext === 'txt') {
      res.setHeader('Content-Type', 'text/plain');
    } else if (ext === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    }
    
    // Audio
    else if (ext === 'mp3') {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (ext === 'wav') {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (ext === 'ogg' || ext === 'oga') {
      res.setHeader('Content-Type', 'audio/ogg');
    }
    
    // Archives
    else if (ext === 'zip') {
      res.setHeader('Content-Type', 'application/zip');
    } else if (ext === 'rar') {
      res.setHeader('Content-Type', 'application/vnd.rar');
    } else if (ext === '7z') {
      res.setHeader('Content-Type', 'application/x-7z-compressed');
    }
    
    // Default fallback
    else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    // Add Content-Disposition header for document downloads
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'].includes(ext)) {
      const filename = path.split('/').pop();
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
  }
}));

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
app.use('/api/test', testEmailRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rpmes', rpmesRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/eiu', eiuRoutes);
app.use('/api/webhooks', webhookRoutes);
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
app.use('/api/profile', profileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/project-comments', projectCommentRoutes);

// OPTIONS handler for profile pictures
app.options('/uploads/profile-pictures/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Special route for profile pictures with enhanced CORS
app.get('/uploads/profile-pictures/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'profile-pictures', filename);
  
  // Set CORS headers specifically for profile pictures - more permissive
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'false'); // Changed to false for wildcard origin
  res.header('Cache-Control', 'public, max-age=31536000');
  res.header('Vary', 'Origin');
  
  // Check if file exists
  if (!require('fs').existsSync(filePath)) {
    return res.status(404).json({ error: 'Profile picture not found' });
  }
  
  // Determine content type
  let contentType = 'image/jpeg'; // default
  if (filename.endsWith('.png')) contentType = 'image/png';
  else if (filename.endsWith('.gif')) contentType = 'image/gif';
  else if (filename.endsWith('.svg')) contentType = 'image/svg+xml';
  else if (filename.endsWith('.jfif')) contentType = 'image/jpeg';
  else if (filename.endsWith('.webp')) contentType = 'image/webp';
  
  res.setHeader('Content-Type', contentType);
  res.sendFile(filePath);
});

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

    // Start server with Socket.IO
    server.listen(PORT, () => {
      console.log(`🚀 Build Watch LGU Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 Socket.IO ready for real-time messaging`);
      
      // Start scheduled announcements checker (runs every minute)
      setInterval(async () => {
        try {
          await checkAndPublishScheduledAnnouncements();
          await checkAndExpireAnnouncements();
        } catch (error) {
          console.error('Error in scheduled announcements job:', error);
        }
      }, 60000); // Run every 60 seconds (1 minute)
      
      console.log(`📅 Scheduled announcements checker started (runs every minute)`);
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
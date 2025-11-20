const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for comment image uploads
const commentImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'project-comments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `comment-${uniqueSuffix}${ext}`);
  }
});

const commentImageUpload = multer({
  storage: commentImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 2 // Maximum 2 files
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedImageTypes = /jpeg|jpg|png|gif|webp|bmp/;
    const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimetype = file.mimetype.toLowerCase();
    
    const isImage = allowedImageTypes.test(extname) || mimetype.startsWith('image/');
    
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, BMP)'), false);
    }
  }
});
const { ProjectComment, ProjectCommentReaction, User, Project } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

// Middleware to check if user is System Admin
const isSystemAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  // Check if user is System Admin
  if (req.user.role !== 'SYS.AD' && req.user.email !== 'sysadmin@gmail.com') {
    return res.status(403).json({
      success: false,
      error: 'Only System Administrators can delete comments'
    });
  }
  
  next();
};

// Rate limiting for comment submission - prevents spam
const commentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 comments per hour per IP
  message: {
    success: false,
    error: 'Too many comments. Please wait before posting again. (Limit: 10 comments per hour)'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users (they have their own limits)
    return req.user?.id;
  }
});

// Rate limiting for reactions - prevents reaction spam
const reactionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 reactions per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many reactions. Please wait before reacting again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Bad words filter (reuse from messaging system)
const badWords = [
  // English bad words
  'fuck', 'fucking', 'fucked', 'shit', 'shitting', 'asshole', 'bitch', 'bastard', 
  'damn', 'damned', 'hell', 'crap', 'piss', 'pissed', 'dick', 'cock', 'pussy',
  'retard', 'retarded', 'stupid', 'idiot', 'moron', 'dumbass', 'douchebag',
  // Tagalog bad words
  'putang', 'putang ina', 'tang ina', 'tangina', 'puta', 'gago', 'gagu', 'tarantado',
  'bobo', 'bubu', 'tanga', 'ulol', 'lintik', 'hayop', 'hayop ka', 'pakyu', 'pakyu ka',
  'leche', 'leche ka', 'walang hiya', 'walangya', 'pakshet', 'pakshet ka'
];

const containsBadWords = (text) => {
  if (!text || typeof text !== 'string') return false;
  const normalizedText = text.toLowerCase().trim();
  
  for (const badWord of badWords) {
    const normalizedBadWord = badWord.toLowerCase();
    const wholeWordRegex = new RegExp(`\\b${normalizedBadWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wholeWordRegex.test(normalizedText) || normalizedText.includes(normalizedBadWord)) {
      return true;
    }
  }
  return false;
};

// Check for duplicate comments (same content within last 5 minutes)
const checkDuplicateComment = async (projectId, content, userId, sessionId) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  if (userId) {
    // For logged-in users, check exact match by userId
    const duplicate = await ProjectComment.findOne({
      where: {
        projectId,
        userId,
        content: content.trim(),
        createdAt: { [Op.gte]: fiveMinutesAgo }
      }
    });
    return !!duplicate;
  } else {
    // For anonymous users, check by content similarity
    const similarComments = await ProjectComment.findAll({
      where: {
        projectId,
        createdAt: { [Op.gte]: fiveMinutesAgo },
        isAnonymous: true
      },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    // Check if any comment has very similar content (90% similarity)
    for (const comment of similarComments) {
      const similarity = calculateSimilarity(content.trim().toLowerCase(), comment.content.toLowerCase());
      if (similarity > 0.9) {
        return true;
      }
    }
    return false;
  }
};

// Simple string similarity calculation (Levenshtein-based)
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

// Get all comments for a project (public route)
router.get('/project/:projectId', async (req, res) => {
  try {
    if (!ProjectComment || !ProjectCommentReaction) {
      return res.status(500).json({
        success: false,
        error: 'Models not initialized'
      });
    }

    const { projectId } = req.params;
    const { sort = 'newest', filter = 'all' } = req.query;
    
    // Try to get user from token if available
    let userId = null;
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'buildwatch_lgu_secret_key_2024');
        userId = decoded.userId || decoded.id || decoded.sub || decoded.user_id;
      }
    } catch (e) {
      // Token invalid or not provided, continue as anonymous
    }
    
    const sessionId = req.headers['x-session-id'] || req.sessionID;

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Build where clause
    const where = { projectId };

    // Fetch comments
    const comments = await ProjectComment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'email', 'role'],
          required: false
        }
      ],
      order: getSortOrder(sort)
    });

    // Get user's reactions for these comments (check both userId and sessionId)
    let userReactions = [];
    if (userId || sessionId) {
      const whereClause = {};
      if (userId) {
        whereClause.userId = userId;
      } else if (sessionId) {
        whereClause.sessionId = sessionId;
        whereClause.userId = null; // Only session-based reactions for anonymous users
      }
      
      userReactions = await ProjectCommentReaction.findAll({
        where: {
          commentId: comments.map(c => c.id),
          ...whereClause
        },
        attributes: ['commentId', 'reactionType']
      });
    }

    // Get reaction counts for each comment
    const commentIds = comments.map(c => c.id);
    const reactionCounts = await ProjectCommentReaction.findAll({
      where: { commentId: commentIds },
      attributes: [
        'commentId',
        [ProjectCommentReaction.sequelize.fn('COUNT', ProjectCommentReaction.sequelize.col('id')), 'count'],
        'reactionType'
      ],
      group: ['commentId', 'reactionType'],
      raw: true
    });

    // Map reactions to comments
    const commentsWithReactions = comments.map(comment => {
      const commentReactions = reactionCounts.filter(r => r.commentId === comment.id);
      const likes = commentReactions.find(r => r.reactionType === 'like')?.count || 0;
      const hearts = commentReactions.find(r => r.reactionType === 'heart')?.count || 0;
      
      const userReaction = userReactions.find(r => r.commentId === comment.id);
      
      // Ensure isAnonymous is correctly set based on userId (not just the stored value)
      // If userId is null/undefined, it's anonymous regardless of stored isAnonymous value
      const isActuallyAnonymous = !comment.userId;
      
      // Parse images JSON if it exists
      let parsedImages = [];
      if (comment.images) {
        try {
          parsedImages = typeof comment.images === 'string' 
            ? JSON.parse(comment.images) 
            : comment.images;
        } catch (e) {
          console.error('Error parsing images JSON:', e);
          parsedImages = [];
        }
      }
      
      return {
        id: comment.id,
        projectId: comment.projectId,
        // Show authorName if provided, but still mark as anonymous if no userId
        authorName: isActuallyAnonymous ? (comment.authorName || 'Anonymous') : (comment.user?.name || comment.authorName || 'Anonymous'),
        authorEmail: isActuallyAnonymous ? null : (comment.user?.email || comment.authorEmail || null), // Include email for verified users
        content: comment.content,
        isAnonymous: isActuallyAnonymous, // Use computed value, not stored value
        images: parsedImages,
        likes: parseInt(likes),
        hearts: parseInt(hearts),
        userReaction: userReaction ? userReaction.reactionType : null,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      };
    });

    // Apply filters
    let filteredComments = commentsWithReactions;
    if (filter === 'most_liked') {
      filteredComments = filteredComments.sort((a, b) => (b.likes + b.hearts) - (a.likes + a.hearts));
    }

    res.json({
      success: true,
      comments: filteredComments,
      total: filteredComments.length
    });
  } catch (error) {
    console.error('Error fetching project comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

// Create a new comment (public route, anonymous allowed)
router.post('/project/:projectId', commentRateLimiter, commentImageUpload.array('images', 2), async (req, res) => {
  try {
    if (!ProjectComment || !Project) {
      return res.status(500).json({
        success: false,
        error: 'Models not initialized'
      });
    }

    const { projectId } = req.params;
    const { content, authorName, authorEmail, isAnonymous = true } = req.body;
    
    // Handle uploaded images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Validate file count (max 2)
      if (req.files.length > 2) {
        // Delete uploaded files if more than 2
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        return res.status(400).json({
          success: false,
          error: 'Maximum 2 images allowed per comment'
        });
      }
      
      // Generate URLs for uploaded images
      imageUrls = req.files.map(file => {
        // Use relative path for production, full URL for development
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          return `/uploads/project-comments/${file.filename}`;
        } else {
          return `http://localhost:3000/uploads/project-comments/${file.filename}`;
        }
      });
    }
    
    // Try to get user from token if available
    let userId = null;
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId || decoded.id || decoded.sub || decoded.user_id;
      }
    } catch (e) {
      // Token invalid or not provided, continue as anonymous
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    // Validate content length
    if (content.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Comment must be at least 3 characters long'
      });
    }

    if (content.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Comment must be less than 5000 characters'
      });
    }

    // Check for bad words
    if (containsBadWords(content)) {
      return res.status(400).json({
        success: false,
        error: 'Your comment contains inappropriate language. Please revise your message to maintain a professional environment.'
      });
    }

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check for duplicate comments (spam prevention)
    const sessionId = req.sessionID || req.headers['x-session-id'] || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isDuplicate = await checkDuplicateComment(projectId, content, userId, sessionId);
    
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        error: 'You have already posted a similar comment recently. Please wait a few minutes before posting again.'
      });
    }

    // Check minimum time between comments (30 seconds for anonymous, 10 seconds for logged-in)
    const timeWindow = userId ? 10 * 1000 : 30 * 1000; // 10s for logged-in, 30s for anonymous
    const recentComment = await ProjectComment.findOne({
      where: {
        projectId,
        createdAt: { [Op.gte]: new Date(Date.now() - timeWindow) },
        ...(userId ? { userId } : { isAnonymous: true })
      },
      order: [['createdAt', 'DESC']]
    });

    if (recentComment) {
      const waitTime = userId ? 10 : 30;
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitTime} seconds between comments to prevent spam.`
      });
    }

    // Create comment
    // isAnonymous should only be false if user has a valid userId (logged in)
    // Even if user provides a name, if they're not logged in, it's still anonymous
    const commentIsAnonymous = !userId; // Only verified if there's a valid userId
    
    const comment = await ProjectComment.create({
      projectId,
      userId,
      authorName: authorName || 'Anonymous',
      authorEmail: authorEmail || null,
      content: content.trim(),
      isAnonymous: commentIsAnonymous,
      images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
    });

    // Fetch with user relation
    const commentWithUser = await ProjectComment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'email', 'role'],
          required: false
        }
      ]
    });

    // Parse images JSON if it exists
    let parsedImages = [];
    if (commentWithUser.images) {
      try {
        parsedImages = typeof commentWithUser.images === 'string' 
          ? JSON.parse(commentWithUser.images) 
          : commentWithUser.images;
      } catch (e) {
        console.error('Error parsing images JSON:', e);
        parsedImages = [];
      }
    }
    
    const commentData = {
      id: commentWithUser.id,
      projectId: commentWithUser.projectId,
      // Show actual authorName if provided, but still mark as anonymous if no userId
      authorName: commentWithUser.isAnonymous ? (commentWithUser.authorName || 'Anonymous') : (commentWithUser.user?.name || commentWithUser.authorName || 'Anonymous'),
      content: commentWithUser.content,
      isAnonymous: commentWithUser.isAnonymous, // This should be true if no userId
      images: parsedImages,
      likes: 0,
      hearts: 0,
      userReaction: null,
      createdAt: commentWithUser.createdAt,
      updatedAt: commentWithUser.updatedAt,
      email: commentWithUser.user?.email || commentWithUser.authorEmail || null
    };
    
    // Emit real-time event to all users viewing this project
    if (req.io) {
      const feedbackIO = req.io.of('/feedback');
      const projectRoom = `project:${projectId}`;
      feedbackIO.to(projectRoom).emit('new_comment', commentData);
      console.log(`📤 Emitted new_comment to project room: ${projectRoom}`);
      
      // Emit to admin dashboard if user is logged in (for activity updates)
      if (commentWithUser.userId) {
        feedbackIO.to('admin_dashboard').emit('gmail_user_activity_updated', {
          userId: commentWithUser.userId,
          email: commentWithUser.user?.email || commentWithUser.authorEmail
        });
        console.log(`📤 Emitted gmail_user_activity_updated to admin dashboard`);
      }
    }
    
    res.status(201).json({
      success: true,
      comment: commentData
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    
    // Clean up uploaded files if comment creation failed
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkErr) {
            console.error('Error deleting uploaded file:', unlinkErr);
          }
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add/remove reaction to a comment
router.post('/:commentId/reaction', reactionRateLimiter, async (req, res) => {
  try {
    if (!ProjectComment || !ProjectCommentReaction) {
      return res.status(500).json({
        success: false,
        error: 'Models not initialized'
      });
    }

    const { commentId } = req.params;
    const { reactionType = 'like' } = req.body;
    const userId = req.user?.id || null;
    // Generate session ID for anonymous users
    const sessionId = req.sessionID || req.headers['x-session-id'] || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!['like', 'heart'].includes(reactionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reaction type'
      });
    }

    // Check if comment exists
    const comment = await ProjectComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user already reacted
    const where = { commentId };
    if (userId) {
      where.userId = userId;
    } else if (sessionId) {
      where.sessionId = sessionId;
      where.userId = null;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Session ID required for anonymous users'
      });
    }

    const existingReaction = await ProjectCommentReaction.findOne({ where });

    if (existingReaction) {
      // Toggle reaction - if same type, remove it; otherwise update it
      if (existingReaction.reactionType === reactionType) {
        await existingReaction.destroy();
        
        // Update comment likes count
        const reactionCount = await ProjectCommentReaction.count({
          where: { commentId, reactionType: 'like' }
        });
        const heartCount = await ProjectCommentReaction.count({
          where: { commentId, reactionType: 'heart' }
        });
        
        return res.json({
          success: true,
          action: 'removed',
          reactionType: null,
          likes: reactionCount,
          hearts: heartCount
        });
      } else {
        // Update reaction type
        existingReaction.reactionType = reactionType;
        await existingReaction.save();
      }
    } else {
      // Create new reaction
      await ProjectCommentReaction.create({
        commentId,
        userId,
        sessionId,
        reactionType
      });
    }

    // Get updated counts
    const likes = await ProjectCommentReaction.count({
      where: { commentId, reactionType: 'like' }
    });
    const hearts = await ProjectCommentReaction.count({
      where: { commentId, reactionType: 'heart' }
    });

    const reactionData = {
      commentId,
      action: existingReaction ? 'updated' : 'added',
      reactionType: existingReaction && existingReaction.reactionType === reactionType ? null : reactionType,
      likes,
      hearts
    };
    
    // Emit real-time event to all users viewing this project
    if (req.io) {
      const feedbackIO = req.io.of('/feedback');
      const projectRoom = `project:${comment.projectId}`;
      feedbackIO.to(projectRoom).emit('comment_reaction_updated', reactionData);
      console.log(`📤 Emitted comment_reaction_updated to project room: ${projectRoom}`);
    }

    res.json({
      success: true,
      ...reactionData
    });
  } catch (error) {
    console.error('Error updating reaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reaction'
    });
  }
});

// Delete a comment (System Admin only)
router.delete('/:commentId', authenticateToken, isSystemAdmin, async (req, res) => {
  try {
    console.log('🗑️ DELETE COMMENT REQUEST STARTED');
    console.log('  Comment ID:', req.params.commentId);
    console.log('  Deleted by:', req.user.id, req.user.email);
    
    if (!ProjectComment) {
      console.error('❌ ProjectComment model not initialized');
      return res.status(500).json({
        success: false,
        error: 'Models not initialized'
      });
    }

    const { commentId } = req.params;
    const models = require('../models');
    const DeletedProjectComment = models.DeletedProjectComment || models['DeletedProjectComment'];
    const User = models.User;

    console.log('🔍 Checking DeletedProjectComment model:', {
      exists: !!DeletedProjectComment,
      type: typeof DeletedProjectComment,
      isFunction: typeof DeletedProjectComment === 'function',
      hasCreate: !!DeletedProjectComment?.create
    });

    if (!DeletedProjectComment) {
      console.error('❌ DeletedProjectComment model not found in models');
      console.error('Available models:', Object.keys(models).filter(k => k.includes('Comment')));
      return res.status(500).json({
        success: false,
        error: 'DeletedProjectComment model not available'
      });
    }

    // Find the comment with user info
    console.log('🔍 Fetching comment from database...');
    const comment = await ProjectComment.findByPk(commentId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!comment) {
      console.error('❌ Comment not found:', commentId);
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    console.log('✅ Comment found:', {
      id: comment.id,
      projectId: comment.projectId,
      userId: comment.userId,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      hasUser: !!comment.user,
      userEmail: comment.user?.email,
      content: comment.content?.substring(0, 50) + '...',
      createdAt: comment.createdAt
    });

    // Prepare deletion history data
    const deletionData = {
      originalCommentId: comment.id,
      projectId: comment.projectId,
      userId: comment.userId, // This can be null for anonymous comments
      authorName: comment.authorName || (comment.user?.name || null),
      authorEmail: comment.authorEmail || (comment.user?.email || null),
      content: comment.content,
      commentCreatedAt: comment.createdAt,
      deletedBy: req.user.id,
      deletedFromIp: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || null
    };

    console.log('📝 Preparing to save deletion history:', {
      originalCommentId: deletionData.originalCommentId,
      projectId: deletionData.projectId,
      userId: deletionData.userId,
      authorName: deletionData.authorName,
      authorEmail: deletionData.authorEmail,
      isAnonymous: !deletionData.userId,
      deletedBy: deletionData.deletedBy,
      deletedFromIp: deletionData.deletedFromIp
    });

    // Save deletion history before deleting
    let deletedRecord = null;
    try {
      deletedRecord = await DeletedProjectComment.create(deletionData);
      console.log('✅ Deletion history saved successfully:', {
        id: deletedRecord.id,
        originalCommentId: deletedRecord.originalCommentId,
        projectId: deletedRecord.projectId,
        userId: deletedRecord.userId,
        authorName: deletedRecord.authorName,
        deletedAt: deletedRecord.deletedAt
      });
    } catch (createError) {
      console.error('❌ Failed to save deletion history:', createError);
      console.error('Error details:', {
        message: createError.message,
        name: createError.name,
        stack: createError.stack,
        errors: createError.errors
      });
      // Continue with deletion even if history save fails
      // Try to create a minimal record or use fallback
      try {
        deletedRecord = await DeletedProjectComment.create({
          ...deletionData,
          deletedAt: new Date()
        });
        console.log('✅ Retry: Deletion history saved successfully');
      } catch (retryError) {
        console.error('❌ Retry also failed, continuing without history record');
      }
    }

    // Delete the comment (cascade will handle reactions)
    console.log('🗑️ Deleting original comment...');
    await comment.destroy();
    console.log('✅ Comment deleted successfully');

    // Emit real-time events for comment deletion
    if (req.io) {
      const feedbackIO = req.io.of('/feedback');
      const projectRoom = `project:${comment.projectId}`;
      
      // Emit to project room (remove comment from public view)
      feedbackIO.to(projectRoom).emit('comment_deleted', {
        commentId: comment.id,
        projectId: comment.projectId
      });
      console.log(`📤 Emitted comment_deleted to project room: ${projectRoom}`);
      
      // Emit to admin room (refresh deleted comments table)
      const deletionEventData = {
        id: deletedRecord?.id || null,
        originalCommentId: comment.id,
        projectId: comment.projectId,
        authorName: deletionData.authorName,
        authorEmail: deletionData.authorEmail,
        content: deletionData.content,
        commentCreatedAt: deletionData.commentCreatedAt,
        deletedAt: deletedRecord?.deletedAt || new Date(),
        deletedBy: req.user.id,
        deletedByEmail: req.user.email,
        deletedByName: req.user.name || 'System Administrator',
        deletedFromIp: deletionData.deletedFromIp
      };
      
      feedbackIO.to('admin_dashboard').emit('comment_deleted_admin', deletionEventData);
      console.log(`📤 Emitted comment_deleted_admin to admin room`);
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user activity history (all comments including deleted)
router.get('/user/:userId/activity', authenticateToken, isSystemAdmin, async (req, res) => {
  try {
    const models = require('../models');
    const ProjectComment = models.ProjectComment || models['ProjectComment'];
    const DeletedProjectComment = models.DeletedProjectComment || models['DeletedProjectComment'];
    const Project = models.Project || models['Project'];
    
    if (!ProjectComment) {
      console.error('❌ ProjectComment model not found');
      return res.status(500).json({
        success: false,
        error: 'ProjectComment model not available'
      });
    }
    
    if (!DeletedProjectComment) {
      console.error('❌ DeletedProjectComment model not found');
      return res.status(500).json({
        success: false,
        error: 'DeletedProjectComment model not available'
      });
    }
    
    if (!Project) {
      console.error('❌ Project model not found');
      return res.status(500).json({
        success: false,
        error: 'Project model not available'
      });
    }
    
    const { userId } = req.params;
    console.log(`🔍 Fetching activity history for user: ${userId}`);
    
    // Get active comments
    let activeComments = [];
    try {
      // Try with include first, fallback to without if association fails
      try {
        activeComments = await ProjectComment.findAll({
          where: { userId },
          include: [
            {
              model: Project,
              as: 'project',
              attributes: ['id', 'name', 'title', 'projectCode'],
              required: false
            }
          ],
          order: [['createdAt', 'DESC']],
          raw: false // Ensure we get Sequelize instances
        });
        console.log(`✅ Found ${activeComments.length} active comments with includes`);
        // Log project data for debugging
        activeComments.forEach((comment, idx) => {
          console.log(`  Comment ${idx + 1}: projectId=${comment.projectId}, hasProject=${!!comment.project}, projectName=${comment.project?.name || 'N/A'}`);
        });
      } catch (includeErr) {
        console.warn('⚠️ Include failed, trying without Project association:', includeErr.message);
        activeComments = await ProjectComment.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          raw: false
        });
        console.log(`✅ Found ${activeComments.length} active comments without includes`);
      }
    } catch (err) {
      console.error('❌ Error fetching active comments:', err);
      console.error('Error details:', err.message, err.stack);
      // Continue with empty array
    }
    
    // Get deleted comments
    let deletedComments = [];
    try {
      // Try with include first, fallback to without if association fails
      try {
        deletedComments = await DeletedProjectComment.findAll({
          where: { userId },
          include: [
            {
              model: Project,
              as: 'project',
              attributes: ['id', 'name', 'title', 'projectCode'],
              required: false
            }
          ],
          order: [['commentCreatedAt', 'DESC']],
          raw: false // Ensure we get Sequelize instances
        });
        console.log(`✅ Found ${deletedComments.length} deleted comments with includes`);
        // Log project data for debugging
        deletedComments.forEach((comment, idx) => {
          console.log(`  Deleted Comment ${idx + 1}: projectId=${comment.projectId}, hasProject=${!!comment.project}, projectName=${comment.project?.name || 'N/A'}`);
        });
      } catch (includeErr) {
        console.warn('⚠️ Include failed, trying without Project association:', includeErr.message);
        deletedComments = await DeletedProjectComment.findAll({
          where: { userId },
          order: [['commentCreatedAt', 'DESC']],
          raw: false
        });
        console.log(`✅ Found ${deletedComments.length} deleted comments without includes`);
      }
    } catch (err) {
      console.error('❌ Error fetching deleted comments:', err);
      console.error('Error details:', err.message, err.stack);
      // Continue with empty array
    }
    
    // Helper function to get project name safely
    const getProjectName = async (comment) => {
      const commentId = comment.id || comment.originalCommentId || 'unknown';
      const projectId = comment.projectId;
      
      console.log(`🔍 Getting project name for comment ${commentId}, projectId: ${projectId}`);
      
      // First try to get from association
      if (comment.project) {
        const name = comment.project.name || comment.project.title;
        if (name) {
          console.log(`✅ Got project name from association: ${name}`);
          return name;
        }
      }
      
      // If association failed, fetch project separately
      if (projectId) {
        try {
          console.log(`🔍 Fetching project ${projectId} separately...`);
          // Try raw query first to see what's actually in the database
          const sequelize = Project.sequelize;
          const { QueryTypes } = require('sequelize');
          const rawResults = await sequelize.query(
            'SELECT id, name, projectCode FROM projects WHERE id = ?',
            {
              replacements: [projectId],
              type: QueryTypes.SELECT
            }
          );
          
          if (rawResults && rawResults.length > 0) {
            const rawProject = rawResults[0];
            const name = rawProject.name || rawProject.projectCode;
            console.log(`✅ Raw query found project:`, {
              id: rawProject.id,
              name: rawProject.name,
              projectCode: rawProject.projectCode
            });
            if (name) {
              return name;
            }
          }
          
          // Fallback to Sequelize findByPk
          const project = await Project.findByPk(projectId, {
            attributes: ['id', 'name', 'projectCode'],
            raw: false
          });
          
          if (project) {
            // Try multiple ways to get the name
            let name = null;
            
            // Method 1: Direct property access
            if (project.name) name = project.name;
            else if (project.projectCode) name = project.projectCode;
            
            // Method 2: Using get() method
            if (!name && project.get) {
              const projectData = project.get({ plain: true });
              name = projectData.name || projectData.projectCode;
            }
            
            // Method 3: Using toJSON()
            if (!name && project.toJSON) {
              const projectJSON = project.toJSON();
              name = projectJSON.name || projectJSON.projectCode;
            }
            
            // Method 4: Using dataValues
            if (!name && project.dataValues) {
              name = project.dataValues.name || project.dataValues.projectCode;
            }
            
            console.log(`✅ Sequelize findByPk found project:`, {
              id: project.id,
              name: project.name,
              projectCode: project.projectCode,
              hasGet: !!project.get,
              hasToJSON: !!project.toJSON,
              hasDataValues: !!project.dataValues,
              finalName: name
            });
            
            if (name) {
              return name;
            } else {
              console.warn(`⚠️ Project ${projectId} has no name/projectCode accessible. Trying dataValues:`, project.dataValues);
            }
          } else {
            console.warn(`⚠️ Project ${projectId} not found in database`);
          }
        } catch (err) {
          console.error(`❌ Error fetching project ${projectId}:`, err.message);
          console.error('Error stack:', err.stack);
        }
      } else {
        console.warn(`⚠️ Comment ${commentId} has no projectId`);
      }
      
      console.warn(`⚠️ Could not determine project name for comment ${commentId}`);
      return 'Unknown Project';
    };
    
    // Combine and format - fetch project names if needed
    const allActivities = await Promise.all([
      ...activeComments.map(async (comment) => {
        const projectName = await getProjectName(comment);
        return {
          id: comment.id,
          type: 'active',
          content: comment.content || '',
          projectId: comment.projectId,
          projectName: projectName,
          createdAt: comment.createdAt,
          isDeleted: false
        };
      }),
      ...deletedComments.map(async (comment) => {
        const projectName = await getProjectName(comment);
        return {
          id: comment.id,
          type: 'deleted',
          content: comment.content || '',
          projectId: comment.projectId,
          projectName: projectName,
          createdAt: comment.commentCreatedAt,
          deletedAt: comment.deletedAt,
          isDeleted: true
        };
      })
    ]);
    
    // Sort by date
    allActivities.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA; // Descending order
    });
    
    console.log(`✅ Returning ${allActivities.length} total activities`);
    
    res.json({
      success: true,
      activities: allActivities,
      total: allActivities.length
    });
  } catch (error) {
    console.error('❌ Error fetching user activity history:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get deleted comment history (System Admin only)
router.get('/deleted-history', authenticateToken, isSystemAdmin, async (req, res) => {
  try {
    console.log('🔍 FETCH DELETED HISTORY REQUEST STARTED');
    console.log('  Requested by:', req.user.id, req.user.email);
    
    const models = require('../models');
    const DeletedProjectComment = models.DeletedProjectComment || models['DeletedProjectComment'];
    const User = models.User;
    const Project = models.Project;
    
    console.log('🔍 Model availability check:', {
      DeletedProjectComment: !!DeletedProjectComment,
      User: !!User,
      Project: !!Project,
      allModels: Object.keys(models).filter(k => k.includes('Comment') || k.includes('Deleted'))
    });
    
    if (!DeletedProjectComment) {
      console.error('❌ DeletedProjectComment model not found in models');
      console.error('Available models:', Object.keys(models));
      return res.status(500).json({
        success: false,
        error: 'DeletedProjectComment model not available'
      });
    }
    
    // First, try a raw query to see if there are any records at all
    try {
      const sequelize = DeletedProjectComment.sequelize;
      const { QueryTypes } = require('sequelize');
      const rawCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM deleted_project_comments',
        { type: QueryTypes.SELECT }
      );
      console.log('📊 Raw SQL count query result:', rawCount);
    } catch (rawErr) {
      console.error('❌ Raw SQL count query failed:', rawErr.message);
    }
    
    console.log('🔍 Fetching deleted comments history with Sequelize...');
    let deletedComments = [];
    try {
      deletedComments = await DeletedProjectComment.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
            required: false
          },
          {
            model: User,
            as: 'deletedByUser',
            attributes: ['id', 'name', 'email', 'role'],
            required: false
          },
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'title', 'name'],
            required: false
          }
        ],
        order: [['deletedAt', 'DESC']],
        limit: 100 // Limit to last 100 deletions
      });
      console.log(`✅ Found ${deletedComments.length} deleted comments via Sequelize`);
    } catch (findErr) {
      console.error('❌ Sequelize findAll failed, trying without includes:', findErr.message);
      try {
        deletedComments = await DeletedProjectComment.findAll({
          order: [['deletedAt', 'DESC']],
          limit: 100,
          raw: false
        });
        console.log(`✅ Found ${deletedComments.length} deleted comments without includes`);
      } catch (simpleErr) {
        console.error('❌ Simple findAll also failed:', simpleErr.message);
        throw simpleErr;
      }
    }
    
    console.log('📋 Deleted comments details:', deletedComments.map(d => ({
      id: d.id,
      originalCommentId: d.originalCommentId,
      projectId: d.projectId,
      userId: d.userId,
      authorName: d.authorName,
      isAnonymous: !d.userId,
      deletedAt: d.deletedAt,
      deletedBy: d.deletedBy
    })));

    // Fetch project names if association failed
    console.log('🔄 Formatting deleted comments history...');
    const formattedHistory = await Promise.all(
      deletedComments.map(async (deleted, index) => {
        console.log(`  Processing deleted comment ${index + 1}/${deletedComments.length}:`, {
          id: deleted.id,
          originalCommentId: deleted.originalCommentId,
          projectId: deleted.projectId,
          userId: deleted.userId,
          authorName: deleted.authorName,
          isAnonymous: !deleted.userId
        });
        
        let projectName = 'Unknown Project';
        
        // Try to get project name from association first
        if (deleted.project) {
          projectName = deleted.project.name || deleted.project.title || 'Unknown Project';
          console.log(`    ✅ Got project name from association: ${projectName}`);
        } else if (deleted.projectId) {
          // If association failed, fetch project separately
          try {
            console.log(`    🔍 Fetching project ${deleted.projectId} for deleted comment...`);
            const project = await Project.findByPk(deleted.projectId, {
              attributes: ['id', 'name', 'title', 'projectCode']
            });
            if (project) {
              projectName = project.name || project.title || project.projectCode || 'Unknown Project';
              console.log(`    ✅ Fetched project name for deleted comment: ${projectName}`);
            } else {
              console.warn(`    ⚠️ Project ${deleted.projectId} not found for deleted comment`);
            }
          } catch (err) {
            console.error(`    ❌ Error fetching project ${deleted.projectId} for deleted comment:`, err.message);
          }
        }
        
        // Get deletedBy user info - try association first, then fetch separately if needed
        let deletedByName = 'Unknown';
        let deletedByEmail = null;
        
        if (deleted.deletedByUser) {
          deletedByName = deleted.deletedByUser.name || deleted.deletedByUser.email || 'Unknown';
          deletedByEmail = deleted.deletedByUser.email || null;
          console.log(`    ✅ Got deletedBy from association: ${deletedByName}`);
        } else if (deleted.deletedBy) {
          // Association failed, fetch user separately
          try {
            console.log(`    🔍 Fetching deletedBy user ${deleted.deletedBy} separately...`);
            const deletedByUser = await User.findByPk(deleted.deletedBy, {
              attributes: ['id', 'name', 'email', 'role']
            });
            if (deletedByUser) {
              deletedByName = deletedByUser.name || deletedByUser.email || 'System Admin';
              deletedByEmail = deletedByUser.email || null;
              console.log(`    ✅ Fetched deletedBy user: ${deletedByName}`);
            } else {
              console.warn(`    ⚠️ User ${deleted.deletedBy} not found for deletedBy`);
              // Since only System Admin can delete, default to "System Admin"
              deletedByName = 'System Admin';
            }
          } catch (userErr) {
            console.error(`    ❌ Error fetching deletedBy user ${deleted.deletedBy}:`, userErr.message);
            // Since only System Admin can delete, default to "System Admin"
            deletedByName = 'System Admin';
          }
        } else {
          // No deletedBy ID, but only System Admin can delete, so default to "System Admin"
          console.warn(`    ⚠️ No deletedBy ID found, defaulting to "System Admin"`);
          deletedByName = 'System Admin';
        }
        
        const formatted = {
          id: deleted.id,
          originalCommentId: deleted.originalCommentId,
          projectId: deleted.projectId,
          projectName: projectName,
          authorName: deleted.authorName || deleted.user?.name || 'Anonymous',
          authorEmail: deleted.authorEmail || deleted.user?.email || null,
          content: deleted.content,
          commentCreatedAt: deleted.commentCreatedAt,
          deletedBy: deletedByName,
          deletedByEmail: deletedByEmail,
          deletedAt: deleted.deletedAt,
          deletedFromIp: deleted.deletedFromIp,
          userAgent: deleted.userAgent
        };
        
        console.log(`    ✅ Formatted deleted comment ${index + 1}:`, {
          authorName: formatted.authorName,
          isAnonymous: !deleted.userId,
          projectName: formatted.projectName
        });
        
        return formatted;
      })
    );
    
    console.log(`✅ Formatted ${formattedHistory.length} deleted comments for response`);
    console.log('📤 Sending response with deleted history:', {
      total: formattedHistory.length,
      sample: formattedHistory[0] || 'No comments'
    });

    res.json({
      success: true,
      history: formattedHistory,
      total: formattedHistory.length
    });
  } catch (error) {
    console.error('Error fetching deleted comment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deleted comment history'
    });
  }
});

// Helper function to get sort order
function getSortOrder(sort) {
  switch (sort) {
    case 'oldest':
      return [['createdAt', 'ASC']];
    case 'most_liked':
      return [['likes', 'DESC'], ['createdAt', 'DESC']];
    default: // 'newest'
      return [['createdAt', 'DESC']];
  }
}

module.exports = router;


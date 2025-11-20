const express = require('express');
const { Message, User, Project } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('./notifications');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'messages');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `message-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (increased for videos)
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and common document types
    const allowedImageTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const allowedVideoTypes = /mp4|mov|avi|webm|mkv|flv|wmv|m4v|3gp/;
    const allowedDocTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z|tar|gz/;
    const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimetype = file.mimetype.toLowerCase();
    
    const isImage = allowedImageTypes.test(extname) || mimetype.startsWith('image/');
    const isVideo = allowedVideoTypes.test(extname) || mimetype.startsWith('video/');
    const isDoc = allowedDocTypes.test(extname) || mimetype.includes('pdf') || 
                  mimetype.includes('document') || mimetype.includes('spreadsheet') ||
                  mimetype.includes('presentation') || mimetype.includes('text') ||
                  mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive');
    
    if (isImage || isVideo || isDoc) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, video, and document files are allowed'));
    }
  }
});

// Create a more lenient upload that allows no files - use .any() to accept any fields
const uploadOptional = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (increased for videos)
  },
  fileFilter: (req, file, cb) => {
    // Only filter files that are in the 'attachments' field
    if (file.fieldname === 'attachments') {
      // Allow images, videos, and common document types
      const allowedImageTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
      const allowedVideoTypes = /mp4|mov|avi|webm|mkv|flv|wmv|m4v|3gp/;
      const allowedDocTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z|tar|gz/;
      const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
      const mimetype = file.mimetype.toLowerCase();
      
      const isImage = allowedImageTypes.test(extname) || mimetype.startsWith('image/');
      const isVideo = allowedVideoTypes.test(extname) || mimetype.startsWith('video/');
      const isDoc = allowedDocTypes.test(extname) || mimetype.includes('pdf') || 
                    mimetype.includes('document') || mimetype.includes('spreadsheet') ||
                    mimetype.includes('presentation') || mimetype.includes('text') ||
                    mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive');
      
      if (isImage || isVideo || isDoc) {
        return cb(null, true);
      } else {
        return cb(new Error('Only image, video, and document files are allowed'));
      }
    }
    // Allow other fields to pass through (non-file fields)
    cb(null, true);
  }
}).any();

// Optional file upload middleware - handles both JSON and multipart requests
const optionalUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  console.log('🔍 optionalUpload middleware - Content-Type:', contentType);
  
  // If it's not multipart/form-data, skip multer (text messages use JSON)
  if (!contentType.includes('multipart/form-data')) {
    console.log('📝 Not multipart/form-data, skipping multer');
    req.files = [];
    return next();
  }
  
  console.log('📤 Processing multipart/form-data with multer');
  
  // For multipart/form-data, use multer but make attachments optional
  // Use uploadOptional which allows no files
  uploadOptional(req, res, (err) => {
    if (err) {
      console.error('⚠️ Multer error:', err);
      console.error('⚠️ Error code:', err.code);
      console.error('⚠️ Error message:', err.message);
      
      // For text-only messages (no attachments), ignore common multer errors
      const ignoredErrors = [
        'LIMIT_UNEXPECTED_FILE',
        'Unexpected field',
        'No files',
        'File is required',
        'Field name missing'
      ];
      
      const shouldIgnore = ignoredErrors.some(errorMsg => 
        err.code === errorMsg || 
        (err.message && err.message.includes(errorMsg))
      );
      
      if (shouldIgnore) {
        console.log('✅ Ignoring multer error, continuing without files');
        // Continue without files - it's a text message
        req.files = [];
        return next();
      }
      
      console.error('❌ Multer error (not ignored):', err);
      return res.status(400).json({
        success: false,
        error: 'File upload error: ' + (err.message || err.toString())
      });
    }
    
    // Multer automatically parses form fields into req.body
    console.log('✅ Multer processed successfully');
    console.log('📦 req.body after multer:', JSON.stringify(req.body, null, 2));
    console.log('📁 req.files:', req.files);
    
    // Ensure req.files exists even if empty, and filter only attachment files
    if (!req.files) {
      req.files = [];
    } else {
      // Filter to only include files from the 'attachments' field
      req.files = req.files.filter(file => file.fieldname === 'attachments');
    }
    next();
  });
};

// Get all conversations for the current user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.query; // Optional project filter

    // Build where clause
    const whereClause = {
      [Op.or]: [
        { senderId: userId },
        { recipientId: userId }
      ]
    };

    // Add project filter if provided
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Get all unique conversations (users the current user has messaged or been messaged by)
    // Use raw query with manual joins if associations fail
    let conversations;
    try {
      const messages = await Message.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId'],
            required: false
          },
          {
            model: User,
            as: 'recipient',
            attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId'],
            required: false
          },
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'projectCode', 'name', 'status', 'category', 'location'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']]
      });
      
      // Normalize createdAt field for all messages
      conversations = messages.map(msg => {
        const msgData = msg.toJSON ? msg.toJSON() : msg;
        return {
          ...msgData,
          createdAt: msgData.createdAt || msgData.created_at || null
        };
      });
    } catch (includeError) {
      console.error('Error with includes, trying without associations:', includeError);
      // Fallback: Get messages without includes and fetch users separately
      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { senderId: userId },
            { recipientId: userId }
          ]
        },
        order: [['created_at', 'DESC']]
      });

      // Fetch users separately
      const userIds = new Set();
      messages.forEach(msg => {
        userIds.add(msg.senderId);
        userIds.add(msg.recipientId);
      });

      const users = await User.findAll({
        where: {
          id: { [Op.in]: Array.from(userIds) }
        },
        attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId']
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      // Attach users to messages and ensure createdAt is present
      conversations = messages.map(msg => {
        const msgData = msg.toJSON ? msg.toJSON() : msg;
        return {
          ...msgData,
          createdAt: msgData.createdAt || msgData.created_at || null,
          sender: userMap.get(msg.senderId) || null,
          recipient: userMap.get(msg.recipientId) || null
        };
      });
    }

    // Group messages by conversation partner
    const conversationMap = new Map();
    
    conversations.forEach(message => {
      // Skip if sender or recipient is null (shouldn't happen, but safety check)
      if (!message.sender || !message.recipient) {
        console.warn('Message missing sender or recipient:', message.id);
        return;
      }

      const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
      const partner = message.senderId === userId ? message.recipient : message.sender;
      
      // Ensure createdAt is present (Sequelize may use created_at)
      const messageCreatedAt = message.createdAt || message.created_at || null;
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner: partner || null,
          lastMessage: {
            id: message.id,
            content: message.content,
            type: message.type,
            createdAt: messageCreatedAt,
            isRead: message.isRead,
            projectId: message.projectId || null,
            project: message.project || null
          },
          unreadCount: 0,
          linkedProjects: message.projectId && message.project ? [message.project] : []
        });
      } else {
        const conv = conversationMap.get(partnerId);
        const convCreatedAt = conv.lastMessage?.createdAt || conv.lastMessage?.created_at || null;
        
        // Compare dates - use null check and fallback to current time comparison
        if (messageCreatedAt && (!convCreatedAt || new Date(messageCreatedAt) > new Date(convCreatedAt))) {
          conv.lastMessage = {
            id: message.id,
            content: message.content,
            type: message.type,
            createdAt: messageCreatedAt,
            isRead: message.isRead,
            projectId: message.projectId || null,
            project: message.project || null
          };
        }

        // Track linked projects
        if (message.projectId && message.project) {
          const existingProject = conv.linkedProjects.find(p => p && p.id === message.projectId);
          if (!existingProject) {
            conv.linkedProjects.push(message.project);
          }
        }
      }
      
      // Count unread messages
      if (message.recipientId === userId && !message.isRead) {
        const conv = conversationMap.get(partnerId);
        if (conv) {
          conv.unreadCount++;
        }
      }
    });

    // Convert map to array, normalize createdAt fields, and sort by last message time
    const conversationList = Array.from(conversationMap.values())
      .filter(conv => {
        // Filter out null partners
        if (!conv.partner) return false;
        // Filter out Gmail feedback users (EMS role) - they should not appear in messaging
        if (conv.partner.role === 'EMS') return false;
        return true;
      })
      .map(conv => {
        // Ensure lastMessage.createdAt is always present
        if (conv.lastMessage && !conv.lastMessage.createdAt) {
          conv.lastMessage.createdAt = conv.lastMessage.created_at || null;
        }
        return conv;
      })
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
        return bTime - aTime;
      });

    console.log('📨 Returning conversations:', {
      count: conversationList.length,
      projectFilter: projectId || 'none',
      sampleConversation: conversationList.length > 0 ? {
        partner: conversationList[0].partner?.name,
        lastMessageCreatedAt: conversationList[0].lastMessage?.createdAt,
        linkedProjects: conversationList[0].linkedProjects?.length || 0
      } : null
    });

    res.json({
      success: true,
      conversations: conversationList
    });

  } catch (error) {
    console.error('❌ Get conversations error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    if (error.parent) {
      console.error('❌ SQL Error:', error.parent.message);
      console.error('❌ SQL:', error.parent.sql);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get messages in a conversation with a specific user
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Validate that the other user exists
    const otherUser = await User.findByPk(userId, {
      attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email']
    });
    
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get all messages between the two users
    let messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, recipientId: userId },
          { senderId: userId, recipientId: currentUserId }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'projectCode', 'name', 'status', 'category', 'location'],
          required: false // Left join - project is optional
        }
      ],
      order: [['created_at', 'ASC']]
    });

    // Ensure all messages have createdAt field mapped from created_at
    messages = messages.map(msg => {
      const msgData = msg.toJSON ? msg.toJSON() : msg;
      // Ensure createdAt is present (Sequelize should map it, but ensure it's there)
      if (!msgData.createdAt && msgData.created_at) {
        msgData.createdAt = msgData.created_at;
      } else if (!msgData.createdAt) {
        // Fallback: use updated_at or current time if neither exists
        msgData.createdAt = msgData.updated_at || msgData.updatedAt || new Date().toISOString();
      }
      return msgData;
    });

    console.log('📨 Returning messages for conversation:', {
      count: messages.length,
      firstMessage: messages.length > 0 ? {
        id: messages[0].id,
        createdAt: messages[0].createdAt,
        created_at: messages[0].created_at
      } : null
    });

    // Mark messages as read
    await Message.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          senderId: userId,
          recipientId: currentUserId,
          isRead: false
        }
      }
    );

    res.json({
      success: true,
      messages,
      partner: otherUser,
      total: messages.length
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation'
    });
  }
});

// Send a new message
router.post('/send', authenticateToken, optionalUpload, async (req, res) => {
  try {
    console.log('📨 Send message request received');
    console.log('📨 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📨 Request files:', req.files);
    console.log('📨 Content-Type:', req.headers['content-type']);
    console.log('📨 User ID:', req.user?.id);
    
    // Verify Message model is available
    if (!Message) {
      console.error('❌ Message model is not defined!');
      return res.status(500).json({
        success: false,
        error: 'Message model not available'
      });
    }
    
    const { recipientId, content, type = 'text', projectId } = req.body;

    if (!recipientId || !content) {
      console.error('❌ Missing required fields:', { recipientId: !!recipientId, content: !!content });
      return res.status(400).json({
        success: false,
        error: 'Recipient and content are required'
      });
    }

    // Check if recipient exists
    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Validate project access if projectId is provided
    if (projectId) {
      const project = await Project.findByPk(projectId, {
        attributes: ['id', 'projectCode', 'name', 'implementingOfficeId', 'eiuPersonnelId', 'workflowStatus', 'approvedBySecretariat', 'submittedToSecretariat']
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if sender has access to this project based on their role
      const senderRole = (req.user.role || '').toUpperCase();
      const senderSubRole = (req.user.subRole || '').toLowerCase();
      let hasAccess = false;

      switch (senderRole) {
        case 'EIU':
          // EIU can only link to projects assigned to them
          hasAccess = project.eiuPersonnelId && String(project.eiuPersonnelId) === String(req.user.id);
          break;

        case 'LGU-IU':
        case 'IU':
          // LGU-IU can only link to projects they created
          hasAccess = String(project.implementingOfficeId) === String(req.user.id);
          break;

        case 'LGU-PMT':
          // MPMEC: Check subRole for Secretariat
          if (senderSubRole.includes('secretariat')) {
            // Secretariat subrole: can link to submitted/approved/ongoing/completed projects
            hasAccess = ['submitted', 'secretariat_approved', 'ongoing', 'completed', 'compiled_for_secretariat', 'validated_by_secretariat'].includes(project.workflowStatus);
          } else {
            // Regular MPMEC: can link to approved projects or projects submitted to Secretariat
            hasAccess = project.approvedBySecretariat === true || project.submittedToSecretariat === true;
          }
          break;

        case 'SECRETARIAT':
          // Secretariat: can link to submitted/approved/ongoing/completed projects
          hasAccess = ['submitted', 'secretariat_approved', 'ongoing', 'completed', 'compiled_for_secretariat', 'validated_by_secretariat'].includes(project.workflowStatus);
          break;

        case 'EMS':
          // Executive Admin: can link to all projects
          hasAccess = true;
          break;

        case 'SYS.AD':
        case 'SYS_AD':
        case 'SYSAD':
          // System Admin: cannot link to any projects
          hasAccess = false;
          break;

        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to link messages to this project'
        });
      }
    }

    // Process attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: `/uploads/messages/${file.filename}`
        });
      });
    }

    // Determine message type based on attachments
    let messageType = type;
    if (attachments.length > 0) {
      const mimetype = attachments[0].mimetype.toLowerCase();
      const originalname = attachments[0].originalName || '';
      const ext = path.extname(originalname).toLowerCase();
      
      console.log(`📎 Determining message type: mimetype=${mimetype}, ext=${ext}, originalname=${originalname}`);
      
      if (mimetype.startsWith('image/')) {
        messageType = 'image';
        console.log('📎 Message type set to: image');
      } else if (mimetype.startsWith('video/')) {
        messageType = 'video';
        console.log('📎 Message type set to: video');
      } else {
        // Check file extension as fallback for document types
        const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.7z'];
        if (docExtensions.includes(ext) || mimetype.includes('pdf') || mimetype.includes('document') || 
            mimetype.includes('spreadsheet') || mimetype.includes('presentation') || mimetype.includes('text') ||
            mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) {
          messageType = 'file';
          console.log('📎 Message type set to: file (document)');
        } else {
          messageType = 'file'; // Default to file for unknown types
          console.log('📎 Message type set to: file (default)');
        }
      }
    } else {
      console.log('📎 No attachments, message type:', messageType);
    }

    // Create message
    console.log('📝 Creating message with data:', {
      senderId: req.user.id,
      recipientId,
      contentLength: content.length,
      type: messageType,
      attachmentsCount: attachments.length,
      hasAttachments: attachments.length > 0,
      attachments: attachments.length > 0 ? attachments.map(att => ({
        filename: att.filename,
        originalName: att.originalName,
        mimetype: att.mimetype,
        size: att.size
      })) : []
    });
    
    let message;
    try {
      const messageData = {
        senderId: req.user.id,
        recipientId,
        content,
        type: messageType,
        attachments: attachments.length > 0 ? attachments : [], // Use empty array instead of null
        isRead: false,
        deliveredAt: new Date(),
        projectId: projectId || null // Optional project link
      };
      
      console.log('📝 Message data being saved:', {
        ...messageData,
        attachments: messageData.attachments.length > 0 ? `[${messageData.attachments.length} attachments]` : '[]'
      });
      
      message = await Message.create(messageData);
      console.log('✅ Message created successfully:', message.id);
      console.log('✅ Created message type:', message.type);
      console.log('✅ Created message attachments:', JSON.stringify(message.attachments));
    } catch (createError) {
      console.error('❌ Error creating message:', createError);
      console.error('❌ Create error name:', createError.name);
      console.error('❌ Create error message:', createError.message);
      if (createError.errors) {
        console.error('❌ Validation errors:', createError.errors);
      }
      throw createError; // Re-throw to be caught by outer catch
    }

    // Fetch message with user details - try with includes first, fallback if fails
    let messageWithDetails;
    try {
      messageWithDetails = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId'],
            required: false
          },
          {
            model: User,
            as: 'recipient',
            attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId'],
            required: false
          }
        ]
      });

      // If includes failed, fetch user details separately
      if (!messageWithDetails || !messageWithDetails.sender || !messageWithDetails.recipient) {
        const sender = await User.findByPk(req.user.id, {
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId']
        });
        const recipientUser = await User.findByPk(recipientId, {
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId']
        });
        
        // Use toJSON to get properly mapped field names
        messageWithDetails = message.toJSON();
        // Ensure createdAt is present (Sequelize maps created_at to createdAt)
        if (!messageWithDetails.createdAt && messageWithDetails.created_at) {
          messageWithDetails.createdAt = messageWithDetails.created_at;
        }
        messageWithDetails.sender = sender;
        messageWithDetails.recipient = recipientUser;
      }
    } catch (includeError) {
      console.error('Error fetching message with details, using fallback:', includeError);
      // Fallback: use basic message data and fetch users separately
      const sender = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId']
      });
      const recipientUser = await User.findByPk(recipientId, {
        attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email', 'userId']
      });
      
      // Use toJSON to get properly mapped field names
      messageWithDetails = message.toJSON();
      // Ensure createdAt is present (Sequelize maps created_at to createdAt)
      if (!messageWithDetails.createdAt && messageWithDetails.created_at) {
        messageWithDetails.createdAt = messageWithDetails.created_at;
      }
      messageWithDetails.sender = sender;
      messageWithDetails.recipient = recipientUser;
    }

    // Create notification for recipient
    try {
      const senderName = req.user.name || req.user.fullName || req.user.username || 'Unknown User';
      await createNotification(
        recipientId,
        `New message from ${senderName}`,
        content.length > 100 ? content.substring(0, 100) + '...' : content,
        'Info',
        'Communication',
        'Message',
        message.id,
        'Medium'
      );
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Emit socket event for real-time update (if socket is available)
    if (req.io) {
      console.log('📤 Emitting socket events...');
      console.log('📤 Recipient ID:', recipientId);
      console.log('📤 Sender ID:', req.user.id);
      console.log('📤 Message ID:', messageWithDetails.id);
      
      // Ensure IDs are strings for room matching
      const recipientRoomId = String(recipientId);
      const senderRoomId = String(req.user.id);
      
      // Get socket rooms to debug
      const recipientSockets = await req.io.in(recipientRoomId).fetchSockets();
      const senderSockets = await req.io.in(senderRoomId).fetchSockets();
      
      console.log('📤 Recipient room ID:', recipientRoomId);
      console.log('📤 Sender room ID:', senderRoomId);
      console.log('📤 Recipient sockets in room:', recipientSockets.length);
      console.log('📤 Sender sockets in room:', senderSockets.length);
      
      if (recipientSockets.length === 0) {
        console.warn('⚠️ No sockets found in recipient room!');
        console.warn('⚠️ Recipient might not be connected or room name mismatch');
        console.warn('⚠️ Trying to list all active rooms...');
        
        // List all sockets to see what rooms exist
        const allSockets = await req.io.fetchSockets();
        console.log('📊 Total connected sockets:', allSockets.length);
        allSockets.forEach(s => {
          const rooms = Array.from(s.rooms);
          console.log(`   Socket ${s.id} (userId: ${s.userId}) in rooms:`, rooms);
        });
      } else {
        console.log('✅ Recipient is connected and in room');
      }
      
      // Emit to recipient's room (use string ID)
      req.io.to(recipientRoomId).emit('new_message', messageWithDetails);
      console.log('✅ Emitted new_message to recipient room:', recipientRoomId);
      
      // Also emit to sender's room for confirmation (use string ID)
      req.io.to(senderRoomId).emit('message_sent', messageWithDetails);
      console.log('✅ Emitted message_sent to sender room:', senderRoomId);
    } else {
      console.error('❌ Socket.IO not available in request!');
    }

    res.status(201).json({
      success: true,
      message: messageWithDetails
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    if (error.stack) {
      console.error('❌ Error stack:', error.stack);
    }
    if (error.errors) {
      console.error('❌ Validation errors:', error.errors);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        errors: error.errors
      } : undefined
    });
  }
});

// Mark messages as read
router.post('/mark-read/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const result = await Message.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          senderId: userId,
          recipientId: currentUserId,
          isRead: false
        }
      }
    );

    res.json({
      success: true,
      updatedCount: result[0] || 0
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

// Get available users for messaging
router.get('/users/available', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    let whereClause = {
      id: { [Op.ne]: currentUser.id }, // Exclude current user
      status: 'active',
      // Exclude Gmail feedback users (EMS role users created via Google OAuth for feedback)
      // These users should only appear in the feedback system, not in messaging
      role: { [Op.ne]: 'EMS' } // Exclude EMS role (Gmail feedback users)
    };

    // Allow all users to message each other in the messaging system
    // Exclude Gmail feedback users (EMS role) from messaging
    
    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'username', 'email', 'role', 'subRole', 'department'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available users'
    });
  }
});

// Get unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await Message.count({
      where: {
        recipientId: req.user.id,
        isRead: false
      }
    });

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// Get media history (images and videos) for a conversation
router.get('/media/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, recipientId: userId },
          { senderId: userId, recipientId: currentUserId }
        ],
        type: { [Op.in]: ['image', 'video'] }
      },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'senderId', 'recipientId', 'type', 'attachments', 'created_at']
    });

    console.log(`🖼️ Found ${messages.length} media messages for conversation with ${userId}`);

    // Extract and format media items with sender info
    const mediaItems = [];
    messages.forEach(message => {
      try {
        // Convert Sequelize model to plain object if needed
        const messageData = message.toJSON ? message.toJSON() : message;
        
        // Parse attachments if it's a JSON string
        let attachments = messageData.attachments;
        if (typeof attachments === 'string') {
          try {
            attachments = JSON.parse(attachments);
          } catch (e) {
            console.error(`❌ Error parsing attachments JSON for message ${messageData.id}:`, e);
            attachments = [];
          }
        }
        
        // Handle Sequelize returning attachments as object/array
        if (!attachments) {
          console.warn(`⚠️ Message ${messageData.id} has no attachments`);
          return;
        }
        
        // Ensure it's an array
        if (!Array.isArray(attachments)) {
          if (typeof attachments === 'object') {
            if (attachments.filename || attachments.path || attachments.originalName) {
              attachments = [attachments];
            } else {
              console.warn(`⚠️ Message ${messageData.id} attachments is not an array or single object:`, typeof attachments);
              return;
            }
          } else {
            console.warn(`⚠️ Message ${messageData.id} attachments is not an array:`, typeof attachments);
            return;
          }
        }
        
        if (attachments.length > 0) {
          console.log(`🖼️ Processing ${attachments.length} attachments for message ${messageData.id}`);
          attachments.forEach((att, index) => {
            try {
              const attachmentObj = typeof att === 'object' && att !== null ? att : {};
              const filename = attachmentObj.filename || (attachmentObj.path ? attachmentObj.path.split('/').pop() : null);
              const path = attachmentObj.path || (filename ? `/uploads/messages/${filename}` : null);
              
              if (!filename && !path) {
                console.warn(`⚠️ Attachment ${index} in message ${messageData.id} has no filename or path`);
                return;
              }
              
              mediaItems.push({
                id: `${messageData.id}-${filename || attachmentObj.originalName || index || Date.now()}`,
                messageId: messageData.id,
                senderId: messageData.senderId,
                recipientId: messageData.recipientId,
                type: messageData.type,
                url: (path && path.startsWith('http')) ? path : `/uploads/messages/${filename || path?.replace('/uploads/messages/', '') || ''}`,
                filename: filename || 'unknown',
                originalName: attachmentObj.originalName || attachmentObj.filename || filename || 'unknown',
                mimetype: attachmentObj.mimetype || (messageData.type === 'image' ? 'image/jpeg' : 'video/mp4'),
                size: attachmentObj.size || 0,
                createdAt: messageData.createdAt || messageData.created_at
              });
            } catch (attError) {
              console.error(`❌ Error processing attachment ${index} in message ${messageData.id}:`, attError);
            }
          });
        } else {
          console.warn(`⚠️ Message ${messageData.id} has empty attachments array`);
        }
      } catch (msgError) {
        console.error(`❌ Error processing message:`, msgError);
      }
    });
    
    console.log(`🖼️ Extracted ${mediaItems.length} media items`);

    res.json({
      success: true,
      media: mediaItems
    });

  } catch (error) {
    console.error('Get media history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get media history'
    });
  }
});

// Get files history (documents) for a conversation
router.get('/files/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    console.log(`📁 Fetching files history for conversation between ${currentUserId} and ${userId}`);

    // First, let's check all messages to see what types exist
    const allMessages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, recipientId: userId },
          { senderId: userId, recipientId: currentUserId }
        ]
      },
      attributes: ['id', 'type', 'attachments', 'created_at'],
      limit: 10
    });
    console.log(`📁 Total messages in conversation: ${allMessages.length}`);
    console.log(`📁 Message types:`, allMessages.map(m => ({ id: m.id, type: m.type, hasAttachments: !!m.attachments })));

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, recipientId: userId },
          { senderId: userId, recipientId: currentUserId }
        ],
        type: 'file'
      },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'senderId', 'recipientId', 'type', 'attachments', 'created_at']
    });

    console.log(`📁 Found ${messages.length} file messages for conversation with ${userId}`);
    
    // Log sample messages for debugging
    if (messages.length > 0) {
      console.log(`📁 Sample message data:`, {
        id: messages[0].id,
        type: messages[0].type,
        senderId: messages[0].senderId,
        recipientId: messages[0].recipientId,
        attachmentsType: typeof messages[0].attachments,
        attachments: messages[0].attachments
      });
    }

    // Extract and format file items with sender info
    const fileItems = [];
    try {
      messages.forEach(message => {
        try {
          // Convert Sequelize model to plain object if needed
          const messageData = message.toJSON ? message.toJSON() : message;
          
          // Parse attachments if it's a JSON string
          let attachments = messageData.attachments;
          
          // Handle Sequelize JSON field - it might be an object or already parsed
          console.log(`📎 Processing message ${messageData.id}, attachments type: ${typeof attachments}, value:`, attachments);
          
          if (attachments === null || attachments === undefined) {
            console.warn(`⚠️ Message ${messageData.id} has no attachments (null/undefined)`);
            return;
          }
          
          // If it's a string, try to parse it
          if (typeof attachments === 'string') {
            try {
              attachments = JSON.parse(attachments);
            } catch (e) {
              console.error(`❌ Error parsing attachments JSON for message ${messageData.id}:`, e);
              attachments = [];
            }
          }
          
          // Handle Sequelize returning attachments as object/array
          // If it's already an object/array, use it directly
          if (!attachments) {
            console.warn(`⚠️ Message ${messageData.id} has no attachments`);
            return;
          }
          
          // Ensure it's an array
          if (!Array.isArray(attachments)) {
            // If it's an object but not an array, try to wrap it
            if (typeof attachments === 'object') {
              // Check if it has array-like properties
              if (attachments.length !== undefined && typeof attachments.length === 'number') {
                // Convert array-like object to array
                attachments = Array.from(attachments);
                console.log(`📎 Converted array-like object to array, length: ${attachments.length}`);
              } else if (attachments.filename || attachments.path || attachments.originalName) {
                // Single attachment object, wrap in array
                attachments = [attachments];
                console.log(`📎 Wrapped single attachment object in array`);
              } else {
                console.warn(`⚠️ Message ${messageData.id} attachments is not an array or single object:`, typeof attachments, JSON.stringify(attachments, null, 2));
                return;
              }
            } else {
              console.warn(`⚠️ Message ${messageData.id} attachments is not an array:`, typeof attachments, attachments);
              return;
            }
          }
          
          if (attachments.length > 0) {
            console.log(`📎 Processing ${attachments.length} attachments for message ${messageData.id}`);
            attachments.forEach((att, index) => {
              try {
                // Handle both object and array item formats
                const attachmentObj = typeof att === 'object' && att !== null ? att : {};
                
                const filename = attachmentObj.filename || (attachmentObj.path ? attachmentObj.path.split('/').pop() : null);
                const path = attachmentObj.path || (filename ? `/uploads/messages/${filename}` : null);
                
                console.log(`📎 Attachment ${index}: filename=${filename}, path=${path}, obj:`, attachmentObj);
                
                if (!filename && !path) {
                  console.warn(`⚠️ Attachment ${index} in message ${messageData.id} has no filename or path:`, attachmentObj);
                  return;
                }
                
                fileItems.push({
                  id: `${messageData.id}-${filename || attachmentObj.originalName || index || Date.now()}`,
                  messageId: messageData.id,
                  senderId: messageData.senderId,
                  recipientId: messageData.recipientId,
                  url: (path && path.startsWith('http')) ? path : `/uploads/messages/${filename || path?.replace('/uploads/messages/', '') || ''}`,
                  filename: filename || 'unknown',
                  originalName: attachmentObj.originalName || attachmentObj.filename || filename || 'unknown',
                  mimetype: attachmentObj.mimetype || 'application/octet-stream',
                  size: attachmentObj.size || 0,
                  createdAt: messageData.createdAt || messageData.created_at
                });
              } catch (attError) {
                console.error(`❌ Error processing attachment ${index} in message ${messageData.id}:`, attError);
                console.error(`❌ Attachment object:`, attachmentObj);
              }
            });
          } else {
            console.warn(`⚠️ Message ${messageData.id} has empty attachments array`);
          }
        } catch (msgError) {
          console.error(`❌ Error processing message ${messageData.id}:`, msgError);
          console.error(`❌ Error stack:`, msgError.stack);
          console.error(`❌ Message data:`, {
            id: messageData.id,
            type: messageData.type,
            attachments: messageData.attachments,
            attachmentsType: typeof messageData.attachments
          });
        }
      });
    } catch (forEachError) {
      console.error('❌ Error in forEach loop:', forEachError);
      throw forEachError;
    }
    
    console.log(`📁 Extracted ${fileItems.length} file items`);
    
    if (fileItems.length > 0) {
      console.log(`📁 Sample file item:`, JSON.stringify(fileItems[0], null, 2));
    } else if (messages.length > 0) {
      console.warn(`⚠️ WARNING: Found ${messages.length} file messages but extracted 0 file items`);
      console.warn(`⚠️ This suggests an issue with attachment processing`);
      messages.slice(0, 3).forEach((msg, idx) => {
        const msgData = msg.toJSON ? msg.toJSON() : msg;
        console.warn(`⚠️ Message ${idx + 1} (${msgData.id}) attachments:`, {
          type: typeof msgData.attachments,
          value: msgData.attachments,
          isArray: Array.isArray(msgData.attachments),
          isNull: msgData.attachments === null,
          isUndefined: msgData.attachments === undefined,
          raw: msgData.attachments
        });
      });
    }

    res.json({
      success: true,
      files: fileItems
    });

  } catch (error) {
    console.error('❌ ========== GET FILES HISTORY ERROR ==========');
    console.error('❌ Error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    if (error.errors) {
      console.error('❌ Validation errors:', error.errors);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to get files history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add or remove reaction to a message
router.post('/reaction/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        error: 'Emoji is required'
      });
    }

    // Find the message
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is sender or recipient
    const isSender = String(message.senderId) === String(userId);
    const isRecipient = String(message.recipientId) === String(userId);
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({
        success: false,
        error: 'You can only react to messages in your conversations'
      });
    }

    // Get recipient (reactor) info early for notification (if needed)
    let reactor = null;
    if (isRecipient) {
      try {
        reactor = await User.findByPk(userId, {
          attributes: ['id', 'name', 'username']
        });
      } catch (e) {
        console.error('Error fetching reactor info:', e);
      }
    }

    // Get current reactions or initialize empty object
    let reactions = message.reactions || {};
    if (!reactions || typeof reactions !== 'object') {
      reactions = {};
    }

    // Initialize emoji array if it doesn't exist
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    // Check if user already reacted with this emoji
    const userIndex = reactions[emoji].indexOf(userId);
    const isAddingReaction = userIndex === -1;
    
    if (userIndex > -1) {
      // Remove reaction (toggle off)
      reactions[emoji].splice(userIndex, 1);
      // Remove emoji key if no users left
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Add reaction (toggle on)
      reactions[emoji].push(userId);
    }

    // Update message with new reactions
    await message.update({ reactions });

    // Create notification when recipient reacts to sender's message (only when adding, not removing)
    if (isAddingReaction && isRecipient && reactor) {
      try {
        // Get sender info
        const sender = await User.findByPk(message.senderId, {
          attributes: ['id', 'name', 'username', 'role']
        });

        // Truncate message content for notification
        const messagePreview = message.content.length > 50 
          ? message.content.substring(0, 50) + '...' 
          : message.content;

        // Create notification for the sender
        await createNotification(
          message.senderId,
          `${reactor?.name || 'Someone'} reacted to your message`,
          `${reactor?.name || 'Someone'} reacted ${emoji} to your message: "${messagePreview}"`,
          'Info',
          'System',
          'Message',
          message.id,
          'Medium',
          {
            module: 'messaging',
            targetId: message.recipientId,
            actionUrl: (() => {
              // Map roles to dashboard paths
              const roleMap = {
                'LGU-IU': 'iu-implementing-office',
                'EIU': 'eiu',
                'LGU-PMT': 'pmt',
                'MPMEC': 'mpmec',
                'MPMEC-SECRETARIAT': 'mpmec-secretariat',
                'SYS.AD': 'sysadmin'
              };
              const role = sender?.role || 'LGU-IU';
              const dashboardPath = roleMap[role] || 'iu-implementing-office';
              return `/dashboard/${dashboardPath}/modules/message-center`;
            })()
          }
        );

        console.log(`📧 Notification created for message reaction: ${reactor?.name} reacted ${emoji} to message from ${sender?.name}`);
      } catch (notificationError) {
        console.error('Error creating reaction notification:', notificationError);
        // Don't fail the request if notification creation fails
      }
    }

    // Emit socket event for real-time update
    if (req.io) {
      // Emit to both sender and recipient (convert to strings for room matching)
      const senderRoomId = String(message.senderId);
      const recipientRoomId = String(message.recipientId);
      
      req.io.to(senderRoomId).to(recipientRoomId).emit('message_reaction_updated', {
        messageId: message.id,
        reactions: reactions
      });
      
      // Also emit notification update event to sender if recipient reacted
      if (isAddingReaction && isRecipient && req.io) {
        req.io.to(senderRoomId).emit('new_notification', {
          type: 'message_reaction',
          message: `${reactor?.name || 'Someone'} reacted ${emoji} to your message`
        });
      }
      
      console.log('✅ Emitted message_reaction_updated to sender and recipient rooms');
    } else {
      console.warn('⚠️ Socket.IO not available for reaction update');
    }

    res.json({
      success: true,
      reactions: reactions,
      action: userIndex > -1 ? 'removed' : 'added'
    });

  } catch (error) {
    console.error('Error adding/removing reaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reaction'
    });
  }
});

// Get reactions for a message
router.get('/reactions/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is sender or recipient
    const isSender = String(message.senderId) === String(userId);
    const isRecipient = String(message.recipientId) === String(userId);
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({
        success: false,
        error: 'You can only view reactions for messages in your conversations'
      });
    }

    res.json({
      success: true,
      reactions: message.reactions || {}
    });

  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reactions'
    });
  }
});

// Get messages for a specific project
router.get('/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const currentUserId = req.user.id;

    // Verify project exists and user has access
    const project = await Project.findByPk(projectId, {
      attributes: ['id', 'projectCode', 'name', 'status', 'implementingOfficeId', 'eiuPersonnelId', 'workflowStatus', 'approvedBySecretariat', 'submittedToSecretariat']
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has access to this project based on their role
    const userRole = (req.user.role || '').toUpperCase();
    const userSubRole = (req.user.subRole || '').toLowerCase();
    let hasAccess = false;

    switch (userRole) {
      case 'EIU':
        // EIU can only access projects assigned to them
        hasAccess = project.eiuPersonnelId && String(project.eiuPersonnelId) === String(currentUserId);
        break;

      case 'LGU-IU':
      case 'IU':
        // LGU-IU can only access projects they created
        hasAccess = String(project.implementingOfficeId) === String(currentUserId);
        break;

      case 'LGU-PMT':
        // MPMEC: Check subRole for Secretariat
        if (userSubRole.includes('secretariat')) {
          // Secretariat subrole: can access submitted/approved/ongoing/completed projects
          hasAccess = ['submitted', 'secretariat_approved', 'ongoing', 'completed', 'compiled_for_secretariat', 'validated_by_secretariat'].includes(project.workflowStatus);
        } else {
          // Regular MPMEC: can access approved projects or projects submitted to Secretariat
          hasAccess = project.approvedBySecretariat === true || project.submittedToSecretariat === true;
        }
        break;

      case 'SECRETARIAT':
        // Secretariat: can access submitted/approved/ongoing/completed projects
        hasAccess = ['submitted', 'secretariat_approved', 'ongoing', 'completed', 'compiled_for_secretariat', 'validated_by_secretariat'].includes(project.workflowStatus);
        break;

      case 'EMS':
        // Executive Admin: can access all projects
        hasAccess = true;
        break;

      case 'SYS.AD':
      case 'SYS_AD':
      case 'SYSAD':
        // System Admin: cannot access any projects
        hasAccess = false;
        break;

      default:
        hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project'
      });
    }

    // Get all messages linked to this project
    const messages = await Message.findAll({
      where: {
        projectId: projectId,
        [Op.or]: [
          { senderId: currentUserId },
          { recipientId: currentUserId }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'projectCode', 'name', 'status', 'category', 'location'],
          required: false
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      messages,
      project: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        status: project.status
      },
      total: messages.length
    });

  } catch (error) {
    console.error('Get project messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project messages'
    });
  }
});

// ===== PHASE 4: SMART PROJECT SEARCH =====

// Smart search across messages, projects, and project data
router.get('/search/project', authenticateToken, async (req, res) => {
  try {
    const { query, projectId, limit = 50 } = req.query;
    const currentUserId = req.user.id;

    if (!query || query.trim().length === 0) {
      return res.json({
        success: true,
        results: {
          messages: [],
          projects: [],
          milestones: []
        }
      });
    }

    const searchQuery = query.trim();
    const results = {
      messages: [],
      projects: [],
      milestones: []
    };

    // Search in messages linked to projects
    const messageWhere = {
      [Op.and]: [
        { content: { [Op.like]: `%${searchQuery}%` } },
        projectId ? { projectId: projectId } : { projectId: { [Op.ne]: null } }, // Only project-linked messages
        {
          [Op.or]: [
            { senderId: currentUserId },
            { recipientId: currentUserId }
          ]
        }
      ]
    };

    const messages = await Message.findAll({
      where: messageWhere,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'projectCode', 'name', 'status'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    results.messages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      projectId: msg.projectId,
      project: msg.project ? {
        id: msg.project.id,
        projectCode: msg.project.projectCode,
        name: msg.project.name
      } : null,
      sender: msg.sender ? {
        id: msg.sender.id,
        name: msg.sender.name
      } : null,
      createdAt: msg.created_at
    }));

    // Search in projects (role-based)
    const userRole = (req.user.role || '').toUpperCase();
    const userSubRole = (req.user.subRole || '').toLowerCase();
    const projectWhere = {};

    switch (userRole) {
      case 'EIU':
        projectWhere.hasExternalPartner = true;
        projectWhere.eiuPersonnelId = currentUserId;
        break;
      case 'LGU-IU':
      case 'IU':
        projectWhere.implementingOfficeId = currentUserId;
        break;
      case 'LGU-PMT':
        if (userSubRole.includes('secretariat')) {
          projectWhere[Op.or] = [
            { workflowStatus: 'submitted' },
            { workflowStatus: 'secretariat_approved' },
            { workflowStatus: 'ongoing' },
            { workflowStatus: 'completed' }
          ];
        } else {
          projectWhere[Op.or] = [
            { approvedBySecretariat: true },
            { submittedToSecretariat: true }
          ];
        }
        break;
      case 'SECRETARIAT':
        projectWhere[Op.or] = [
          { workflowStatus: 'submitted' },
          { workflowStatus: 'secretariat_approved' },
          { workflowStatus: 'ongoing' },
          { workflowStatus: 'completed' }
        ];
        break;
      case 'EMS':
        // Executive Admin sees all
        break;
      default:
        projectWhere.id = null; // No access
    }

    // Add search condition to projectWhere
    const searchCondition = {
      [Op.or]: [
        { name: { [Op.like]: `%${searchQuery}%` } },
        { projectCode: { [Op.like]: `%${searchQuery}%` } },
        { description: { [Op.like]: `%${searchQuery}%` } },
        { location: { [Op.like]: `%${searchQuery}%` } }
      ]
    };
    
    // Combine with existing where clause
    if (Object.keys(projectWhere).length > 0 && !projectWhere.id) {
      if (projectWhere[Op.or]) {
        // If we already have Op.or for workflowStatus, combine with search using Op.and
        const existingOr = projectWhere[Op.or];
        projectWhere[Op.and] = [
          { [Op.or]: existingOr },
          searchCondition
        ];
        delete projectWhere[Op.or];
      } else {
        // Combine with Op.and
        projectWhere[Op.and] = [
          ...(projectWhere[Op.and] || []),
          searchCondition
        ];
      }
    } else if (!projectWhere.id) {
      Object.assign(projectWhere, searchCondition);
    }

    const projects = await Project.findAll({
      where: projectWhere,
      attributes: ['id', 'projectCode', 'name', 'status', 'category', 'location'],
      limit: parseInt(limit)
    });

    results.projects = projects.map(p => p.toJSON());

    res.json({
      success: true,
      results,
      query: searchQuery
    });

  } catch (error) {
    console.error('Smart project search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform smart project search'
    });
  }
});

// ===== PHASE 4: PROJECT ALERTS & NOTIFICATIONS =====

// Get project alerts for current user
router.get('/alerts/projects', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const userRole = (req.user.role || '').toUpperCase();
    const alerts = [];

    // Get user's accessible projects
    const projectWhere = {};
    switch (userRole) {
      case 'EIU':
        projectWhere.hasExternalPartner = true;
        projectWhere.eiuPersonnelId = currentUserId;
        break;
      case 'LGU-IU':
      case 'IU':
        projectWhere.implementingOfficeId = currentUserId;
        break;
      case 'LGU-PMT':
      case 'SECRETARIAT':
      case 'EMS':
        // These roles see all projects
        break;
      default:
        return res.json({ success: true, alerts: [] });
    }

    const { ProjectMilestone } = require('../models');
    const projects = await Project.findAll({
      where: projectWhere,
      attributes: ['id', 'projectCode', 'name', 'status', 'endDate', 'workflowStatus'],
      include: [{
        model: ProjectMilestone,
        as: 'milestones',
        attributes: ['id', 'title', 'dueDate', 'status'],
        required: false
      }]
    });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const project of projects) {
      // Check for approaching project end date
      if (project.endDate) {
        const endDate = new Date(project.endDate);
        const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEnd <= 7 && daysUntilEnd > 0) {
          alerts.push({
            id: `project-end-${project.id}`,
            type: 'project_end_date',
            severity: daysUntilEnd <= 3 ? 'high' : 'medium',
            title: `Project Ending Soon: ${project.projectCode}`,
            message: `${project.name} is ending in ${daysUntilEnd} day${daysUntilEnd !== 1 ? 's' : ''}`,
            projectId: project.id,
            projectCode: project.projectCode,
            projectName: project.name,
            dueDate: project.endDate,
            daysRemaining: daysUntilEnd
          });
        }
      }

      // Check for milestone due dates
      if (project.milestones && project.milestones.length > 0) {
        for (const milestone of project.milestones) {
          if (milestone.dueDate && milestone.status !== 'completed') {
            const dueDate = new Date(milestone.dueDate);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue <= 7 && daysUntilDue >= 0) {
              alerts.push({
                id: `milestone-due-${milestone.id}`,
                type: 'milestone_due_date',
                severity: daysUntilDue <= 3 ? 'high' : daysUntilDue <= 5 ? 'medium' : 'low',
                title: `Milestone Due: ${milestone.title}`,
                message: `Milestone "${milestone.title}" for ${project.projectCode} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
                projectId: project.id,
                projectCode: project.projectCode,
                projectName: project.name,
                milestoneId: milestone.id,
                milestoneTitle: milestone.title,
                dueDate: milestone.dueDate,
                daysRemaining: daysUntilDue
              });
            }
          }
        }
      }

      // Check for overdue milestones
      if (project.milestones && project.milestones.length > 0) {
        for (const milestone of project.milestones) {
          if (milestone.dueDate && milestone.status !== 'completed') {
            const dueDate = new Date(milestone.dueDate);
            if (dueDate < now) {
              const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
              alerts.push({
                id: `milestone-overdue-${milestone.id}`,
                type: 'milestone_overdue',
                severity: 'high',
                title: `Overdue Milestone: ${milestone.title}`,
                message: `Milestone "${milestone.title}" for ${project.projectCode} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
                projectId: project.id,
                projectCode: project.projectCode,
                projectName: project.name,
                milestoneId: milestone.id,
                milestoneTitle: milestone.title,
                dueDate: milestone.dueDate,
                daysOverdue: daysOverdue
              });
            }
          }
        }
      }
    }

    // Sort alerts by severity and date
    alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[b.severity] !== severityOrder[a.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(a.dueDate || a.daysOverdue) - new Date(b.dueDate || b.daysOverdue);
    });

    res.json({
      success: true,
      alerts,
      total: alerts.length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    });

  } catch (error) {
    console.error('Get project alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project alerts'
    });
  }
});

// ===== PHASE 4: PROJECT ANALYTICS IN MESSAGING =====

// Get project analytics/statistics for messaging
router.get('/analytics/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const currentUserId = req.user.id;

    // Verify project access
    const project = await Project.findByPk(projectId, {
      attributes: ['id', 'projectCode', 'name', 'status', 'category', 'location', 'totalBudget', 'startDate', 'endDate', 'workflowStatus', 'implementingOfficeId', 'eiuPersonnelId']
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access
    const userRole = (req.user.role || '').toUpperCase();
    let hasAccess = false;

    switch (userRole) {
      case 'EIU':
        hasAccess = project.eiuPersonnelId && String(project.eiuPersonnelId) === String(currentUserId);
        break;
      case 'LGU-IU':
      case 'IU':
        hasAccess = String(project.implementingOfficeId) === String(currentUserId);
        break;
      case 'LGU-PMT':
      case 'SECRETARIAT':
      case 'EMS':
        hasAccess = true;
        break;
      default:
        hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project'
      });
    }

    // Calculate progress
    const ProgressCalculationService = require('../services/progressCalculationService');
    const progressData = await ProgressCalculationService.calculateProjectProgress(projectId, userRole);

    // Get milestone statistics
    const { ProjectMilestone } = require('../models');
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      attributes: ['id', 'title', 'status', 'dueDate', 'completedDate', 'weight']
    });

    const milestoneStats = {
      total: milestones.length,
      completed: milestones.filter(m => m.status === 'completed').length,
      inProgress: milestones.filter(m => m.status === 'in_progress').length,
      pending: milestones.filter(m => m.status === 'pending' || !m.status).length,
      overdue: milestones.filter(m => {
        if (m.dueDate && m.status !== 'completed') {
          return new Date(m.dueDate) < new Date();
        }
        return false;
      }).length
    };

    // Get message statistics
    const messageStats = await Message.count({
      where: { projectId },
      distinct: true,
      col: 'id'
    });

    // Calculate time remaining
    let timeRemaining = null;
    if (project.endDate) {
      const now = new Date();
      const endDate = new Date(project.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      timeRemaining = {
        days: daysRemaining,
        status: daysRemaining < 0 ? 'overdue' : daysRemaining <= 7 ? 'urgent' : daysRemaining <= 30 ? 'warning' : 'normal'
      };
    }

    const analytics = {
      project: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        status: project.status,
        workflowStatus: project.workflowStatus
      },
      progress: {
        timeline: Math.round(progressData.progress.internalTimeline * 100) / 100,
        budget: Math.round(progressData.progress.internalBudget * 100) / 100,
        physical: Math.round(progressData.progress.internalPhysical * 100) / 100,
        overall: Math.round(progressData.progress.overall * 100) / 100
      },
      milestones: milestoneStats,
      messages: messageStats,
      timeRemaining,
      budget: {
        total: parseFloat(project.totalBudget) || 0,
        currency: 'PHP'
      }
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Get project analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project analytics'
    });
  }
});

module.exports = router;


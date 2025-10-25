const express = require('express');
const { Communication, User, Project } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const { createNotification } = require('./notifications');

const router = express.Router();

// Get all communications for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      priority,
      isRead,
      search,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      [Op.or]: [
        { senderId: req.user.id },
        { recipientId: req.user.id }
      ]
    };

    // Add filters
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    if (isRead !== undefined) whereClause.isRead = isRead === 'true';
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    }

    if (search) {
      whereClause[Op.or] = [
        { subject: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: communications } = await Communication.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate statistics
    const totalMessages = count;
    const unreadMessages = await Communication.count({
      where: {
        recipientId: req.user.id,
        isRead: false
      }
    });

    const reportsSent = await Communication.count({
      where: {
        senderId: req.user.id,
        category: 'report'
      }
    });

    const pendingResponses = await Communication.count({
      where: {
        senderId: req.user.id,
        status: 'sent',
        requestAcknowledgment: true
      }
    });

    res.json({
      success: true,
      communications,
      total: count,
      unreadMessages,
      reportsSent,
      pendingResponses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get communications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communications'
    });
  }
});

// Get communication by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const communication = await Communication.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { senderId: req.user.id },
          { recipientId: req.user.id }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
        }
      ]
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Communication not found'
      });
    }

    // Mark as read if recipient is viewing
    if (communication.recipientId === req.user.id && !communication.isRead) {
      await communication.update({
        isRead: true,
        readAt: new Date()
      });
    }

    res.json({
      success: true,
      communication
    });

  } catch (error) {
    console.error('Get communication error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communication'
    });
  }
});

// Create new communication
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      subject,
      message,
      category = 'general',
      priority = 'medium',
      recipientId,
      isImportant = false,
      requestAcknowledgment = false,
      parentMessageId = null
    } = req.body;

    // Validate required fields
    if (!subject || !message || !recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Subject, message, and recipient are required'
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

    // Create communication
    const communication = await Communication.create({
      subject,
      message,
      category,
      priority,
      type: 'outgoing',
      status: 'sent',
      isRead: false,
      isImportant,
      isUrgent: priority === 'urgent',
      requestAcknowledgment,
      senderId: req.user.id,
      recipientId,
      parentMessageId
    });

    // Create notification for recipient
    try {
      const senderName = req.user.name || req.user.fullName || req.user.username || 'Unknown User';
      const notificationTitle = `New Message from ${senderName}`;
      const notificationMessage = `You have received a new message: "${subject}"`;
      
      // Determine notification priority based on message priority
      let notificationPriority = 'Medium';
      if (priority === 'urgent') notificationPriority = 'Critical';
      else if (priority === 'high') notificationPriority = 'High';
      else if (priority === 'low') notificationPriority = 'Low';

      // Determine notification type based on category
      let notificationType = 'Info';
      if (category === 'alert') notificationType = 'Alert';
      else if (category === 'request') notificationType = 'Warning';
      else if (isImportant) notificationType = 'Warning';

      await createNotification(
        recipientId,
        notificationTitle,
        notificationMessage,
        notificationType,
        'Alert', // Use Alert category for communications
        'Communication',
        communication.id,
        notificationPriority
      );

      console.log(`Notification created for recipient ${recipientId} for message ${communication.id}`);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the communication creation if notification fails
    }

    res.status(201).json({
      success: true,
      communication,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Create communication error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Update communication (mark as read, respond, etc.)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const communication = await Communication.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { senderId: req.user.id },
          { recipientId: req.user.id }
        ]
      }
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Communication not found'
      });
    }

    const { isRead, status, acknowledgedAt, respondedAt } = req.body;
    const updateData = {};

    if (isRead !== undefined) {
      updateData.isRead = isRead;
      if (isRead) {
        updateData.readAt = new Date();
        
        // Create notification for sender when message is read
        try {
          const recipientName = req.user.name || req.user.fullName || req.user.username || 'Unknown User';
          const notificationTitle = `Message Read by ${recipientName}`;
          const notificationMessage = `Your message "${communication.subject}" has been read`;
          
          await createNotification(
            communication.senderId,
            notificationTitle,
            notificationMessage,
            'Success',
            'Alert',
            'Communication',
            communication.id,
            'Low'
          );
          
          console.log(`Read notification created for sender ${communication.senderId} for message ${communication.id}`);
        } catch (notificationError) {
          console.error('Error creating read notification:', notificationError);
          // Don't fail the update if notification fails
        }
      }
    }

    if (status) {
      updateData.status = status;
      if (status === 'responded') {
        updateData.respondedAt = new Date();
        
        // Create notification for sender when message is responded to
        try {
          const responderName = req.user.name || req.user.fullName || req.user.username || 'Unknown User';
          const notificationTitle = `Message Responded by ${responderName}`;
          const notificationMessage = `Your message "${communication.subject}" has received a response`;
          
          await createNotification(
            communication.senderId,
            notificationTitle,
            notificationMessage,
            'Info',
            'Alert',
            'Communication',
            communication.id,
            'Medium'
          );
          
          console.log(`Response notification created for sender ${communication.senderId} for message ${communication.id}`);
        } catch (notificationError) {
          console.error('Error creating response notification:', notificationError);
          // Don't fail the update if notification fails
        }
      }
    }

    if (acknowledgedAt) {
      updateData.acknowledgedAt = acknowledgedAt;
    }

    if (respondedAt) {
      updateData.respondedAt = respondedAt;
    }

    await communication.update(updateData);

    res.json({
      success: true,
      communication,
      message: 'Communication updated successfully'
    });

  } catch (error) {
    console.error('Update communication error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update communication'
    });
  }
});

// Delete communication
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const communication = await Communication.findOne({
      where: {
        id: req.params.id,
        senderId: req.user.id // Only sender can delete
      }
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Communication not found or access denied'
      });
    }

    await communication.destroy();

    res.json({
      success: true,
      message: 'Communication deleted successfully'
    });

  } catch (error) {
    console.error('Delete communication error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete communication'
    });
  }
});

// Get available users for communication (filtered by role)
router.get('/users/available', authenticateToken, async (req, res) => {
  try {
    let whereClause = {
      status: 'active' // Fixed: use lowercase 'active' to match database
    };

    // Filter users based on current user's role
    if (req.user.role === 'LGU-PMT' && req.user.subRole?.toLowerCase().includes('secretariat')) {
      // Secretariat can communicate with MPMEC members and Implementing Office Officers
      whereClause[Op.or] = [
        { role: 'LGU-PMT', subRole: { [Op.like]: '%MPMEC%' } },
        { role: 'LGU-IU' }
      ];
    } else if (req.user.role === 'LGU-PMT' && req.user.subRole?.toLowerCase().includes('mpmec')) {
      // MPMEC members can communicate with Secretariat
      whereClause[Op.and] = [
        { role: 'LGU-PMT' },
        { subRole: { [Op.like]: '%Secretariat%' } }
      ];
    } else if (req.user.role === 'LGU-IU') {
      // Implementing Office Officers can communicate with Secretariat
      whereClause[Op.and] = [
        { role: 'LGU-PMT' },
        { subRole: { [Op.like]: '%Secretariat%' } }
      ];
    } else {
      // For other roles, show all LGU-PMT and LGU-IU users
      whereClause[Op.or] = [
        { role: 'LGU-PMT' },
        { role: 'LGU-IU' }
      ];
    }

    console.log('🔍 Communications API - Available users query:', JSON.stringify(whereClause, null, 2));

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'username', 'email', 'role', 'subRole', 'department'], // Added 'email' for profile pictures
      order: [['name', 'ASC']]
    });

    console.log(`✅ Communications API - Found ${users.length} available users`);
    console.log('📊 Users:', users.map(u => ({ name: u.name, role: u.role, subRole: u.subRole })));

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

// Get communication statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const totalMessages = await Communication.count({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { recipientId: req.user.id }
        ]
      }
    });

    const unreadMessages = await Communication.count({
      where: {
        recipientId: req.user.id,
        isRead: false
      }
    });

    const reportsSent = await Communication.count({
      where: {
        senderId: req.user.id,
        category: 'report'
      }
    });

    const pendingResponses = await Communication.count({
      where: {
        senderId: req.user.id,
        status: 'sent',
        requestAcknowledgment: true
      }
    });

    const todayMessages = await Communication.count({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { recipientId: req.user.id }
        ],
        createdAt: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    res.json({
      success: true,
      stats: {
        totalMessages,
        unreadMessages,
        reportsSent,
        pendingResponses,
        todayMessages
      }
    });

  } catch (error) {
    console.error('Get communication stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communication statistics'
    });
  }
});

// Mark messages as read
router.post('/mark-read', authenticateToken, async (req, res) => {
  try {
    const { senderId, recipientId } = req.body;
    
    console.log('Backend - Mark as read request:', { senderId, recipientId, userId: req.user.id });
    
    if (!senderId || !recipientId) {
      return res.status(400).json({
        success: false,
        error: 'senderId and recipientId are required'
      });
    }

    // First, let's see what unread messages exist
    const unreadMessages = await Communication.findAll({
      where: {
        senderId: senderId,
        recipientId: recipientId,
        isRead: false
      }
    });

    console.log(`Backend - Found ${unreadMessages.length} unread messages to mark as read`);

    // Mark all unread messages from senderId to recipientId as read
    const result = await Communication.update(
      { 
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          senderId: senderId,
          recipientId: recipientId,
          isRead: false
        }
      }
    );

    console.log(`Backend - Marked ${result[0]} messages as read from ${senderId} to ${recipientId}`);

    res.json({
      success: true,
      message: `Marked ${result[0]} messages as read`,
      updatedCount: result[0]
    });

  } catch (error) {
    console.error('Backend - Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

// Get conversation messages between two users
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Validate that the other user exists
    const otherUser = await User.findByPk(userId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get all messages between the two users
    const messages = await Communication.findAll({
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
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'username', 'role', 'subRole', 'department']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      messages,
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

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Communications route is working' });
});

module.exports = router; 
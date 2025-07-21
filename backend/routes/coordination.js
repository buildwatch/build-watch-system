const express = require('express');
const { CoordinationEvent, User, Project, ActivityLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get all coordination events with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      eventType,
      status,
      priority,
      startDate,
      endDate,
      projectId,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (eventType) whereClause.eventType = eventType;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (projectId) whereClause.projectId = projectId;
    
    if (startDate && endDate) {
      whereClause.startDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.startDate = {
        [Op.gte]: new Date(startDate)
      };
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: events } = await CoordinationEvent.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username', 'role', 'subRole']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode']
        }
      ],
      order: [['startDate', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get coordination events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coordination events'
    });
  }
});

// Get coordination event by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await CoordinationEvent.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username', 'role', 'subRole']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location']
        }
      ]
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Get coordination event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coordination event'
    });
  }
});

// Create new coordination event
router.post('/', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      location,
      priority,
      isRecurring,
      recurrencePattern,
      participantData,
      projectId,
      notes,
      reminderDate
    } = req.body;

    // Validate required fields
    if (!title || !eventType || !startDate) {
      return res.status(400).json({
        success: false,
        error: 'Title, event type, and start date are required'
      });
    }

    const event = await CoordinationEvent.create({
      title,
      description,
      eventType,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location,
      priority: priority || 'medium',
      isRecurring: isRecurring || false,
      recurrencePattern,
      participantData,
      projectId,
      notes,
      reminderDate: reminderDate ? new Date(reminderDate) : null,
      createdBy: req.user.id
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'CoordinationEvent',
      entityId: event.id,
      details: `Created coordination event: ${title}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      event,
      message: 'Coordination event created successfully'
    });

  } catch (error) {
    console.error('Create coordination event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create coordination event'
    });
  }
});

// Update coordination event
router.put('/:id', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await CoordinationEvent.findByPk(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Convert date strings to Date objects
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.reminderDate) updateData.reminderDate = new Date(updateData.reminderDate);

    await event.update(updateData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'CoordinationEvent',
      entityId: event.id,
      details: `Updated coordination event: ${event.title}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      event,
      message: 'Coordination event updated successfully'
    });

  } catch (error) {
    console.error('Update coordination event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update coordination event'
    });
  }
});

// Delete coordination event
router.delete('/:id', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { id } = req.params;

    const event = await CoordinationEvent.findByPk(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await event.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'CoordinationEvent',
      entityId: event.id,
      details: `Deleted coordination event: ${event.title}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Coordination event deleted successfully'
    });

  } catch (error) {
    console.error('Delete coordination event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete coordination event'
    });
  }
});

// Get coordination statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereClause = {};

    if (startDate && endDate) {
      whereClause.startDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const [
      totalEvents,
      upcomingEvents,
      fieldInspections,
      meetingsScheduled,
      deadlinesThisWeek
    ] = await Promise.all([
      CoordinationEvent.count({ where: whereClause }),
      CoordinationEvent.count({
        where: {
          ...whereClause,
          startDate: { [Op.gte]: new Date() },
          status: { [Op.in]: ['scheduled', 'confirmed'] }
        }
      }),
      CoordinationEvent.count({
        where: {
          ...whereClause,
          eventType: 'field_inspection'
        }
      }),
      CoordinationEvent.count({
        where: {
          ...whereClause,
          eventType: 'meeting'
        }
      }),
      CoordinationEvent.count({
        where: {
          ...whereClause,
          eventType: 'deadline',
          startDate: {
            [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        fieldInspections,
        meetingsScheduled,
        deadlinesThisWeek
      }
    });

  } catch (error) {
    console.error('Get coordination stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coordination statistics'
    });
  }
});

// Get upcoming events
router.get('/upcoming/events', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const events = await CoordinationEvent.findAll({
      where: {
        startDate: { [Op.gte]: new Date() },
        status: { [Op.in]: ['scheduled', 'confirmed'] }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode']
        }
      ],
      order: [['startDate', 'ASC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      events
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events'
    });
  }
});

// Get calendar events for a specific month
router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const events = await CoordinationEvent.findAll({
      where: {
        startDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode']
        }
      ],
      order: [['startDate', 'ASC']]
    });

    res.json({
      success: true,
      events
    });

  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events'
    });
  }
});

module.exports = router; 
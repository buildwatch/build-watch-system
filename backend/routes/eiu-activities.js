const express = require('express');
const { EIUActivity, Project, User, ActivityLog } = require('../models');
const { authenticateToken, requireEIU, requireLGUIU } = require('../middleware/auth');

const router = express.Router();

// Get all EIU activities for Implementing Office (with filtering)
router.get('/', authenticateToken, requireLGUIU, async (req, res) => {
  try {
    const {
      projectId,
      activityType,
      status,
      reviewStatus,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Filter by project (IO can only see activities for their projects)
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Filter by activity type
    if (activityType) {
      whereClause.activityType = activityType;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by review status
    if (reviewStatus) {
      whereClause.reviewStatus = reviewStatus;
    }

    // Filter by priority
    if (priority) {
      whereClause.priority = priority;
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.activityDate = {};
      if (startDate) {
        whereClause.activityDate.$gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.activityDate.$lte = new Date(endDate);
      }
    }

    const activities = await EIUActivity.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location', 'implementingOfficeId'],
          where: {
            implementingOfficeId: req.user.id // Only show activities for projects owned by this IO
          }
        },
        {
          model: User,
          as: 'eiuUser',
          attributes: ['id', 'name', 'username', 'department']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['activityDate', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate statistics (also filtered by implementing office)
    // Use a simpler approach to avoid GROUP BY issues
    const statsQuery = await EIUActivity.sequelize.query(`
      SELECT 
        COUNT(*) as totalActivities,
        COUNT(CASE WHEN DATE(activityDate) = CURDATE() THEN 1 END) as todayActivities,
        COUNT(CASE WHEN reviewStatus = 'pending_review' THEN 1 END) as pendingReviews,
        COUNT(CASE WHEN reviewStatus = 'approved' THEN 1 END) as completedReviews
      FROM eiu_activities ea
      INNER JOIN projects p ON ea.projectId = p.id
      WHERE p.implementingOfficeId = :implementingOfficeId
    `, {
      replacements: { implementingOfficeId: req.user.id },
      type: EIUActivity.sequelize.QueryTypes.SELECT
    });

    const stats = statsQuery[0] || {};

    res.json({
      success: true,
      activities: activities.rows,
      pagination: {
        total: activities.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(activities.count / limit)
      },
      stats: {
        totalActivities: parseInt(stats.totalActivities || 0),
        todayActivities: parseInt(stats.todayActivities || 0),
        pendingReviews: parseInt(stats.pendingReviews || 0),
        completedReviews: parseInt(stats.completedReviews || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching EIU activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch EIU activities'
    });
  }
});

// Get EIU activities for EIU user (their own activities)
router.get('/my-activities', authenticateToken, requireEIU, async (req, res) => {
  try {
    const {
      projectId,
      activityType,
      status,
      reviewStatus,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      eiuUserId: req.user.id
    };

    if (projectId) whereClause.projectId = projectId;
    if (activityType) whereClause.activityType = activityType;
    if (status) whereClause.status = status;
    if (reviewStatus) whereClause.reviewStatus = reviewStatus;

    const activities = await EIUActivity.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['activityDate', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      activities: activities.rows,
      pagination: {
        total: activities.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(activities.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching EIU user activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities'
    });
  }
});

// Create new EIU activity
router.post('/', authenticateToken, requireEIU, async (req, res) => {
  try {
    const {
      projectId,
      activityType,
      title,
      description,
      priority,
      location,
      findings,
      recommendations,
      attachments
    } = req.body;

    // Validate required fields
    if (!projectId || !activityType || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, activityType, title, description'
      });
    }

    // Verify project exists and is assigned to this EIU user
    const project = await Project.findOne({
      where: {
        id: projectId,
        eiuPersonnelId: req.user.id
      }
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'Project not found or not assigned to you'
      });
    }

    // Create activity
    const activity = await EIUActivity.create({
      projectId,
      eiuUserId: req.user.id,
      activityType,
      title,
      description,
      priority: priority || 'medium',
      location,
      findings,
      recommendations,
      attachments: attachments || [],
      activityDate: new Date()
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_EIU_ACTIVITY',
      entityType: 'EIUActivity',
      entityId: activity.id,
      details: `Created ${activityType} activity: ${title} for project: ${project.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      activity,
      message: 'Activity created successfully'
    });
  } catch (error) {
    console.error('Error creating EIU activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create activity'
    });
  }
});

// Get single EIU activity details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await EIUActivity.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location', 'description']
        },
        {
          model: User,
          as: 'eiuUser',
          attributes: ['id', 'name', 'username', 'department', 'position']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'username', 'department']
        }
      ]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // Check permissions
    if (req.user.role === 'EIU' && activity.eiuUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    console.error('Error fetching activity details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity details'
    });
  }
});

// Update EIU activity (EIU users can update their own activities)
router.put('/:id', authenticateToken, requireEIU, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      location,
      findings,
      recommendations,
      attachments
    } = req.body;

    const activity = await EIUActivity.findByPk(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // Check if user owns this activity
    if (activity.eiuUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own activities'
      });
    }

    // Check if activity is already reviewed
    if (activity.reviewStatus !== 'pending_review') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update activity that has been reviewed'
      });
    }

    // Update activity
    await activity.update({
      title,
      description,
      priority,
      location,
      findings,
      recommendations,
      attachments
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_EIU_ACTIVITY',
      entityType: 'EIUActivity',
      entityId: activity.id,
      details: `Updated activity: ${activity.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      activity,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    console.error('Error updating EIU activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update activity'
    });
  }
});

// Review an EIU activity (Implementing Office only)
router.post('/:id/review', authenticateToken, requireLGUIU, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewStatus, reviewComments } = req.body;

    if (!reviewStatus || !['approved', 'rejected', 'requires_revision'].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review status'
      });
    }

    const activity = await EIUActivity.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project'
        },
        {
          model: User,
          as: 'eiuUser'
        }
      ]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // Update review status
    await activity.update({
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewComments,
      reviewStatus
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'REVIEW_EIU_ACTIVITY',
      entityType: 'EIUActivity',
      entityId: activity.id,
      details: `Reviewed activity "${activity.title}" with status: ${reviewStatus}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      activity,
      message: `Activity ${reviewStatus} successfully`
    });
  } catch (error) {
    console.error('Error reviewing EIU activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review activity'
    });
  }
});

// Delete EIU activity (EIU users can delete their own pending activities)
router.delete('/:id', authenticateToken, requireEIU, async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await EIUActivity.findByPk(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // Check if user owns this activity
    if (activity.eiuUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own activities'
      });
    }

    // Check if activity can be deleted (only pending activities)
    if (activity.reviewStatus !== 'pending_review') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete activity that has been reviewed'
      });
    }

    // Log activity before deletion
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_EIU_ACTIVITY',
      entityType: 'EIUActivity',
      entityId: activity.id,
      details: `Deleted activity: ${activity.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await activity.destroy();

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting EIU activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete activity'
    });
  }
});

// Delete EIU activity (Implementing Office can delete any activity for their projects)
router.delete('/:id/io', authenticateToken, requireLGUIU, async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await EIUActivity.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          where: {
            implementingOfficeId: req.user.id // Only can delete activities for their projects
          }
        }
      ]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found or you do not have permission to delete it'
      });
    }

    // Log activity before deletion
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_EIU_ACTIVITY_IO',
      entityType: 'EIUActivity',
      entityId: activity.id,
      details: `IO deleted activity: ${activity.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await activity.destroy();

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting EIU activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete activity'
    });
  }
});

// Get history of activities by status (for Implementing Office)
router.get('/history/:status', authenticateToken, requireLGUIU, async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    // Map status to reviewStatus
    switch (status) {
      case 'deleted':
        // For deleted activities, we'll need to check ActivityLog
        const deletedActivities = await ActivityLog.findAll({
          where: {
            action: ['DELETE_EIU_ACTIVITY', 'DELETE_EIU_ACTIVITY_IO'],
            entityType: 'EIUActivity'
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'username']
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });

        return res.json({
          success: true,
          activities: deletedActivities,
          pagination: {
            total: deletedActivities.length,
            page: parseInt(page),
            limit: parseInt(limit)
          }
        });

      case 'approved':
        whereClause.reviewStatus = 'approved';
        break;
      case 'rejected':
        whereClause.reviewStatus = 'rejected';
        break;
      case 'requires_revision':
        whereClause.reviewStatus = 'requires_revision';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Use: deleted, approved, rejected, or requires_revision'
        });
    }

    const activities = await EIUActivity.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'location'],
          where: {
            implementingOfficeId: req.user.id
          }
        },
        {
          model: User,
          as: 'eiuUser',
          attributes: ['id', 'name', 'username', 'department']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['reviewedAt', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      activities: activities.rows,
      pagination: {
        total: activities.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(activities.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activity history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity history'
    });
  }
});

module.exports = router; 
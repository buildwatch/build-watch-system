const express = require('express');
const { Project, User, ActivityLog } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get home page statistics
router.get('/stats', async (req, res) => {
  try {
    // Get project statistics
    const projectStats = await Project.findAll({
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalProjects'],
        [require('sequelize').fn('SUM', require('sequelize').col('totalBudget')), 'totalBudget'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN status = "Ongoing" THEN 1 END')), 'ongoingProjects'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN status = "Completed" THEN 1 END')), 'completedProjects'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN status = "Planning" THEN 1 END')), 'planningProjects']
      ],
      where: {
        status: {
          [Op.ne]: 'Deleted'
        }
      }
    });

    // Get all projects to calculate utilized budget using ProgressCalculationService
    const allProjects = await Project.findAll({
      where: {
        status: {
          [Op.ne]: 'Deleted'
        }
      }
    });

    // Calculate utilized budget using ProgressCalculationService
    const ProgressCalculationService = require('../services/progressCalculationService');
    let utilizedBudget = 0;
    
    for (const project of allProjects) {
      try {
        const progress = await ProgressCalculationService.calculateProjectProgress(project.id, 'executive');
        const projectProgress = progress?.overallProgress || project.overallProgress || 0;
        utilizedBudget += (parseFloat(project.totalBudget) || 0) * (projectProgress / 100);
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        // Fallback to database progress
        const projectProgress = parseFloat(project.overallProgress) || 0;
        utilizedBudget += (parseFloat(project.totalBudget) || 0) * (projectProgress / 100);
      }
    }

    // Get user statistics
    const userStats = await User.count({
      where: {
        status: 'active',
        deletedAt: null
      }
    });

    // Get department count (unique departments from users)
    const departmentStats = await User.findAll({
      attributes: [
        [require('sequelize').fn('DISTINCT', require('sequelize').col('department')), 'department']
      ],
      where: {
        department: {
          [Op.ne]: null
        },
        status: 'active',
        deletedAt: null
      }
    });

    const stats = projectStats[0]?.dataValues || {};
    const totalBudget = parseFloat(stats.totalBudget) || 0;
    const budgetUtilization = totalBudget > 0 ? (utilizedBudget / totalBudget) * 100 : 0;
    
    res.json({
      success: true,
      totalProjects: parseInt(stats.totalProjects) || 0,
      ongoingProjects: parseInt(stats.ongoingProjects) || 0,
      completedProjects: parseInt(stats.completedProjects) || 0,
      delayedProjects: 0, // Calculate this if needed
      totalBudget: totalBudget,
      utilizedBudget: utilizedBudget,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      activeDepartments: departmentStats.length
    });

  } catch (error) {
    console.error('Error fetching home stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch home statistics'
    });
  }
});

// Get featured projects for home page
router.get('/featured-projects', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get projects that are either ongoing or recently completed
    const featuredProjects = await Project.findAll({
      where: {
        status: {
          [Op.in]: ['Ongoing', 'Completed', 'Planning']
        },
        [Op.or]: [
          { approvedByMPMEC: true },
          { approvedBySecretariat: true }
        ] // Show projects approved by either MPMEC or Secretariat
      },
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        ['overallProgress', 'DESC']
      ],
      limit: parseInt(limit)
    });

    // Calculate progress for each project using ProgressCalculationService
    const ProgressCalculationService = require('../services/progressCalculationService');
    const projectsWithProgress = await Promise.all(featuredProjects.map(async (project) => {
      const progress = await ProgressCalculationService.calculateProjectProgress(project.id, 'executive');
      return {
        ...project.toJSON(),
        progress
      };
    }));

    // Format projects for frontend
    const formattedProjects = projectsWithProgress.map(project => ({
      id: project.id,
      name: project.name,
      location: project.location || 'Santa Cruz, Laguna',
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.totalBudget,
      progress: project.progress?.overallProgress || project.overallProgress || 0,
      implementingOffice: project.implementingOffice?.name || 'Municipal Government',
      description: project.description,
      category: project.category
    }));

    res.json({
      success: true,
      projects: formattedProjects
    });

  } catch (error) {
    console.error('Error fetching featured projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured projects'
    });
  }
});

// Get recent activity for home page
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentActivity = await ActivityLog.findAll({
      where: {
        action: {
          [Op.in]: ['PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_APPROVED', 'PROJECT_COMPLETED']
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Format activity for frontend
    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      user: activity.user?.name || 'System',
      timestamp: activity.createdAt,
      entityType: activity.entityType,
      entityId: activity.entityId
    }));

    res.json({
      success: true,
      activities: formattedActivity
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
});

// Get project locations for map
router.get('/project-locations', async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: {
        status: {
          [Op.in]: ['Ongoing', 'Completed', 'Planning']
        },
        [Op.or]: [
          { approvedByMPMEC: true },
          { approvedBySecretariat: true }
        ]
      },
      attributes: [
        'id',
        'name',
        'location',
        'status',
        'totalBudget',
        'overallProgress',
        'startDate',
        'endDate',
        'category'
      ]
    });

    // Format for map display
    const locations = projects.map(project => ({
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      budget: project.totalBudget,
      progress: project.overallProgress || 0,
      startDate: project.startDate,
      endDate: project.endDate,
      category: project.category
    }));

    res.json({
      success: true,
      locations
    });

  } catch (error) {
    console.error('Error fetching project locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project locations'
    });
  }
});

// Get barangay statistics
router.get('/barangay-stats', async (req, res) => {
  try {
    const barangays = [
      'Alipit', 'Bagumbayan', 'Bubukal', 'Calios', 'Duhat', 'Gatid', 'Jasaan', 
      'Labuin', 'Malinao', 'Oogong', 'Pagsawitan', 'Palasan', 'Patimbao', 
      'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V',
      'San Jose', 'San Juan', 'San Pablo Norte', 'San Pablo Sur', 'Santisima Cruz',
      'Santo Angel Central', 'Santo Angel Norte', 'Santo Angel Sur'
    ];

    const barangayStats = [];

    for (const barangay of barangays) {
      const projects = await Project.count({
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: {
            [Op.ne]: 'Deleted'
          }
        }
      });

      const ongoingProjects = await Project.count({
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: 'Ongoing'
        }
      });

      const completedProjects = await Project.count({
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: 'Completed'
        }
      });

      const totalBudget = await Project.sum('totalBudget', {
        where: {
          location: {
            [Op.like]: `%${barangay}%`
          },
          status: {
            [Op.ne]: 'Deleted'
          }
        }
      });

      barangayStats.push({
        name: barangay,
        totalProjects: projects,
        ongoingProjects,
        completedProjects,
        totalBudget: totalBudget || 0
      });
    }

    res.json({
      success: true,
      barangayStats
    });

  } catch (error) {
    console.error('Error fetching barangay stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch barangay statistics'
    });
  }
});

module.exports = router; 
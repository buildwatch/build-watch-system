const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { Project, ProjectUpdate, ProjectMilestone } = require('../../models');
const { Op } = require('sequelize');

// Get all projects for IU Implementing Office
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, category, priority, search } = req.query;
    
    let whereClause = {
      implementingOfficeId: req.user.id
    };

    // Apply filters
    if (status) {
      whereClause.status = status;
    }
    if (category) {
      whereClause.category = category;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    const projects = await Project.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ProjectUpdate,
          as: 'updates',
          order: [['createdAt', 'DESC']],
          limit: 5
        }
      ]
    });

    res.json({
      success: true,
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        location: project.location,
        priority: project.priority,
        status: project.status,
        totalBudget: project.totalBudget,
        startDate: project.startDate,
        endDate: project.endDate,
        targetDate: project.endDate,
        completionDate: project.completionDate,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress,
        overallProgress: project.overallProgress,
        hasExternalPartner: project.hasExternalPartner,
        timelineUpdateFrequency: project.timelineUpdateFrequency,
        budgetUpdateFrequency: project.budgetUpdateFrequency,
        physicalUpdateFrequency: project.physicalUpdateFrequency,
        expectedOutputs: project.expectedOutputs,
        targetBeneficiaries: project.targetBeneficiaries,
        projectManager: project.projectManager,
        contactNumber: project.contactNumber,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

// Create new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      location,
      priority,
      expectedOutputs,
      targetBeneficiaries,
      hasExternalPartner,
      startDate,
      endDate,
      timelineUpdateFrequency,
      timelineMilestones,
      totalBudget,
      budgetUpdateFrequency,
      budgetBreakdown,
      physicalUpdateFrequency,
      requiredDocumentation,
      physicalProgressRequirements,
      projectManager,
      contactNumber,
      specialRequirements
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !location || !priority || 
        !hasExternalPartner || !startDate || !endDate || !timelineUpdateFrequency ||
        !totalBudget || !budgetUpdateFrequency || !physicalUpdateFrequency) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Validate budget
    if (parseFloat(totalBudget) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total budget must be greater than 0'
      });
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      category,
      location,
      priority,
      expectedOutputs,
      targetBeneficiaries,
      hasExternalPartner: hasExternalPartner === 'yes',
      startDate,
      endDate,
      timelineUpdateFrequency,
      timelineMilestones,
      totalBudget: parseFloat(totalBudget),
      budgetUpdateFrequency,
      budgetBreakdown,
      physicalUpdateFrequency,
      requiredDocumentation: Array.isArray(requiredDocumentation) ? requiredDocumentation.join(',') : requiredDocumentation,
      physicalProgressRequirements,
      projectManager,
      contactNumber,
      specialRequirements,
      implementingOfficeId: req.user.id,
      status: 'pending',
      timelineProgress: 0,
      budgetProgress: 0,
      physicalProgress: 0,
      overallProgress: 0
    });

    // Create initial milestones if provided
    if (timelineMilestones) {
      const milestones = timelineMilestones.split('\n').filter(milestone => milestone.trim());
      for (const milestone of milestones) {
        await ProjectMilestone.create({
          projectId: project.id,
          title: milestone.trim(),
          description: milestone.trim(),
          status: 'pending',
          dueDate: endDate
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        location: project.location,
        priority: project.priority,
        status: project.status,
        totalBudget: project.totalBudget,
        startDate: project.startDate,
        endDate: project.endDate,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress,
        overallProgress: project.overallProgress,
        hasExternalPartner: project.hasExternalPartner,
        createdAt: project.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        implementingOfficeId: req.user.id
      },
      include: [
        {
          model: ProjectUpdate,
          as: 'updates',
          order: [['createdAt', 'DESC']]
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          order: [['dueDate', 'ASC']]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        location: project.location,
        priority: project.priority,
        status: project.status,
        totalBudget: project.totalBudget,
        startDate: project.startDate,
        endDate: project.endDate,
        completionDate: project.completionDate,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress,
        overallProgress: project.overallProgress,
        hasExternalPartner: project.hasExternalPartner,
        timelineUpdateFrequency: project.timelineUpdateFrequency,
        budgetUpdateFrequency: project.budgetUpdateFrequency,
        physicalUpdateFrequency: project.physicalUpdateFrequency,
        expectedOutputs: project.expectedOutputs,
        targetBeneficiaries: project.targetBeneficiaries,
        projectManager: project.projectManager,
        contactNumber: project.contactNumber,
        timelineMilestones: project.timelineMilestones,
        budgetBreakdown: project.budgetBreakdown,
        requiredDocumentation: project.requiredDocumentation,
        physicalProgressRequirements: project.physicalProgressRequirements,
        specialRequirements: project.specialRequirements,
        updates: project.updates,
        milestones: project.milestones,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        implementingOfficeId: req.user.id
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only allow updates if project is pending or ongoing
    if (project.status === 'complete') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed project'
      });
    }

    const updatedProject = await project.update(req.body);

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        category: updatedProject.category,
        location: updatedProject.location,
        priority: updatedProject.priority,
        status: updatedProject.status,
        totalBudget: updatedProject.totalBudget,
        startDate: updatedProject.startDate,
        endDate: updatedProject.endDate,
        timelineProgress: updatedProject.timelineProgress,
        budgetProgress: updatedProject.budgetProgress,
        physicalProgress: updatedProject.physicalProgress,
        overallProgress: updatedProject.overallProgress,
        updatedAt: updatedProject.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        implementingOfficeId: req.user.id
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only allow deletion if project is pending
    if (project.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending projects'
      });
    }

    await project.destroy();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
});

// Get project timeline
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        implementingOfficeId: req.user.id
      },
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones',
          order: [['dueDate', 'ASC']]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      timeline: {
        projectId: project.id,
        startDate: project.startDate,
        endDate: project.endDate,
        timelineProgress: project.timelineProgress,
        updateFrequency: project.timelineUpdateFrequency,
        milestones: project.milestones,
        status: project.status
      }
    });
  } catch (error) {
    console.error('Error fetching project timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project timeline',
      error: error.message
    });
  }
});

// Get project disbursements
router.get('/:id/disbursements', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        implementingOfficeId: req.user.id
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // TODO: Implement disbursement tracking
    // This would include actual disbursement records from a separate table

    res.json({
      success: true,
      disbursements: {
        projectId: project.id,
        totalBudget: project.totalBudget,
        budgetProgress: project.budgetProgress,
        updateFrequency: project.budgetUpdateFrequency,
        breakdown: project.budgetBreakdown,
        disbursements: [] // TODO: Add actual disbursement records
      }
    });
  } catch (error) {
    console.error('Error fetching project disbursements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project disbursements',
      error: error.message
    });
  }
});

// Get project summary
router.get('/:id/summary', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        implementingOfficeId: req.user.id
      },
      include: [
        {
          model: ProjectUpdate,
          as: 'updates',
          order: [['createdAt', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      summary: {
        projectId: project.id,
        name: project.name,
        status: project.status,
        overallProgress: project.overallProgress,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress,
        startDate: project.startDate,
        endDate: project.endDate,
        totalBudget: project.totalBudget,
        recentUpdates: project.updates,
        efficiency: project.overallProgress > 0 ? (project.overallProgress / 100) : 0,
        timelineAdherence: project.timelineProgress > 0 ? (project.timelineProgress / 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching project summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project summary',
      error: error.message
    });
  }
});

module.exports = router; 
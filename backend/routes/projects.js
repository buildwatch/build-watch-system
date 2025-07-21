const express = require('express');
const { Project, ProjectUpdate, ProjectMilestone, User, ActivityLog, ProjectValidation } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const ProgressCalculationService = require('../services/progressCalculationService');

const router = express.Router();

// Universal progress endpoint for all user roles (MUST BE BEFORE :id route)
router.get('/progress/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const progressData = await ProgressCalculationService.calculateProjectProgress(projectId, req.user.role);
    
    res.json({
      success: true,
      data: progressData
    });

  } catch (error) {
    console.error('Error fetching project progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project progress'
    });
  }
});

// Get all projects with progress for current user role
router.get('/progress/list', authenticateToken, async (req, res) => {
  try {
    const projectsWithProgress = await ProgressCalculationService.getProjectsWithProgress(req.user.role, req.user.id);
    
    res.json({
      success: true,
      data: projectsWithProgress
    });

  } catch (error) {
    console.error('Error fetching projects with progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects with progress'
    });
  }
});

// Helper function to log activities
const logActivity = async (userId, action, entityType, entityId, details, module = 'Project Management') => {
  try {
    await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      details,
      module,
      level: 'Info',
      status: 'Success'
    });
  } catch (error) {
    console.error('Activity logging error:', error);
  }
};

// Helper function to calculate project progress using ProgressCalculationService
const calculateProjectProgress = async (project, userRole = 'any') => {
  try {
    const ProgressCalculationService = require('../services/progressCalculationService');
    const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, userRole);
    
    return {
      timelineProgress: progressData.progress.timeline,
      budgetProgress: progressData.progress.budget,
      physicalProgress: progressData.progress.physical,
      overallProgress: Math.round(progressData.progress.overall * 100) / 100
    };
  } catch (error) {
    console.error('Error calculating project progress:', error);
    // Fallback to simple calculation if ProgressCalculationService fails
    const timelineProgress = parseFloat(project.timelineProgress) || 0;
    const budgetProgress = parseFloat(project.budgetProgress) || 0;
    const physicalProgress = parseFloat(project.physicalProgress) || 0;
    const overallProgress = (timelineProgress + budgetProgress + physicalProgress) / 3;
    
    return {
      timelineProgress,
      budgetProgress,
      physicalProgress,
      overallProgress: Math.round(overallProgress * 100) / 100
    };
  }
};

// ===== PROJECT CRUD OPERATIONS =====

// Create new project (IU Implementing Office only)
router.post('/', authenticateToken, requireRole(['iu', 'LGU-IU']), async (req, res) => {
  try {
    const {
      projectCode,
      name,
      implementingOfficeName,
      description,
      category,
      location,
      priority,
      fundingSource,
      createdDate,
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
      specialRequirements,
      eiuPersonnelId,
      milestones // New field for milestone data
    } = req.body;

    // Validate required fields
    if (!projectCode || !name || !implementingOfficeName || !description || !category || !location || !priority || 
        !fundingSource || !createdDate || !startDate || !endDate || !totalBudget || !timelineUpdateFrequency || 
        !budgetUpdateFrequency || !physicalUpdateFrequency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate milestones if provided
    if (milestones) {
      if (!Array.isArray(milestones) || milestones.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Milestones must be an array with at least one milestone'
        });
      }

      // Validate total weight equals 100%
      const totalWeight = milestones.reduce((sum, milestone) => sum + parseFloat(milestone.weight || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          error: 'Total milestone weight must equal 100%'
        });
      }

      // Validate each milestone has required fields
      for (const milestone of milestones) {
        if ((!milestone.title && !milestone.name) || !milestone.weight || !milestone.plannedBudget) {
          return res.status(400).json({
            success: false,
            error: 'Each milestone must have title, weight, and plannedBudget'
          });
        }
      }
    }

    // Check if project code already exists
    const existingProject = await Project.findOne({
      where: { projectCode }
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        error: 'Project code already exists. Please use a different code.'
      });
    }

    // Validate EIU Personnel ID if external partner is selected
    let validatedEiuPersonnelId = null;
    if (hasExternalPartner && eiuPersonnelId) {
      const eiuUser = await User.findOne({
        where: {
          userId: eiuPersonnelId,
          role: 'EIU',
          status: 'active'
        }
      });

      if (!eiuUser) {
        return res.status(400).json({
          success: false,
          error: 'Invalid EIU Personnel ID. Please verify the account exists and is active.'
        });
      }

      // Use the database id for the foreign key
      validatedEiuPersonnelId = eiuUser.id;
    }

    // Create project with automatic forwarding to all relevant users
    const project = await Project.create({
      projectCode,
      name,
      implementingOfficeName,
      description,
      category,
      location,
      priority,
      fundingSource,
      createdDate,
      status: 'pending', // Starts as pending until approved
      workflowStatus: 'submitted', // Automatically submitted to Secretariat
      expectedOutputs,
      targetBeneficiaries,
      hasExternalPartner: hasExternalPartner || false,
      eiuPersonnelId: hasExternalPartner && validatedEiuPersonnelId ? validatedEiuPersonnelId : null,
      startDate,
      endDate,
      completionDate: null,
      timelineUpdateFrequency,
      timelineMilestones,
      timelineProgress: 0,
      totalBudget,
      budgetUpdateFrequency,
      budgetBreakdown,
      budgetProgress: 0,
      physicalUpdateFrequency,
      requiredDocumentation,
      physicalProgressRequirements,
      physicalProgress: 0,
      overallProgress: 0,
      automatedProgress: 0, // New automated progress field
      projectManager,
      contactNumber,
      specialRequirements,
      implementingOfficeId: req.user.id,
      approvedBySecretariat: false,
      approvedByMPMEC: false,
      approvedBy: null,
      approvalDate: null,
      submittedToSecretariat: true, // Automatically submitted to Secretariat
      submittedToSecretariatDate: new Date(), // Set submission date
      secretariatApprovalDate: null,
      secretariatApprovedBy: null,
      lastProgressUpdate: null
    });

    // Create milestones if provided
    if (milestones && milestones.length > 0) {
      const milestoneRecords = milestones.map((milestone, index) => ({
        projectId: project.id,
        title: milestone.title || milestone.name, // Support both title and name for backward compatibility
        description: milestone.description || '',
        weight: parseFloat(milestone.weight),
        plannedBudget: parseFloat(milestone.plannedBudget),
        plannedStartDate: milestone.plannedStartDate || null,
        plannedEndDate: milestone.plannedEndDate || null,
        dueDate: milestone.plannedEndDate || milestone.dueDate || new Date(), // Use plannedEndDate as dueDate if available
        status: 'pending',
        order: index + 1
      }));

      await ProjectMilestone.bulkCreate(milestoneRecords);
    }

    // Log activity
    await logActivity(
      req.user.id,
      'CREATE_PROJECT',
      'Project',
      project.id,
      `Created project: ${project.name} (${project.projectCode}) with ${milestones ? milestones.length : 0} milestones`
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        ...project.toJSON(),
        progress: calculateProjectProgress(project)
      }
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
});

// Get public projects (no authentication required)
router.get('/public', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      search,
      barangay
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      // Only show approved projects to the public
      approvedBySecretariat: true,
      status: { [Op.ne]: 'pending' } // Exclude pending projects
    };

    // Add filters
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { projectCode: { [Op.like]: `%${search}%` } }
      ];
    }
    if (barangay && barangay !== 'All Barangays') {
      whereClause.location = { [Op.like]: `%${barangay}%` };
    }

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'username', 'role', 'subRole']
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'username', 'role', 'subRole']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Calculate progress for each project using ProgressCalculationService
    const projectsWithProgress = await Promise.all(projects.map(async (project) => {
      const progress = await calculateProjectProgress(project, 'public');
      return {
        ...project.toJSON(),
        progress
      };
    }));

    // Format projects for public display (hide sensitive information)
    const publicProjects = projectsWithProgress.map(projectData => {
      return {
        id: projectData.id,
        name: projectData.name,
        projectCode: projectData.projectCode,
        description: projectData.description,
        category: projectData.category,
        location: projectData.location,
        priority: projectData.priority,
        fundingSource: projectData.fundingSource,
        status: projectData.status,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        completionDate: projectData.completionDate,
        totalBudget: projectData.totalBudget, // Show budget but not breakdown
        overallProgress: projectData.progress?.overallProgress || projectData.overallProgress,
        implementingOfficeName: projectData.implementingOffice?.name || 'N/A',
        eiuPersonnelName: projectData.eiuPersonnel?.name || null,
        hasExternalPartner: projectData.hasExternalPartner,
        createdAt: projectData.createdAt,
        updatedAt: projectData.updatedAt
        // Note: budgetBreakdown, budgetProgress, physicalProgress, etc. are excluded
      };
    });

    // Add cache-busting headers to force fresh data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${Date.now()}"`
    });

    res.json({
      success: true,
      projects: publicProjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get public projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

// Get projects based on user role
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      search,
      implementingOfficeId,
      submittedToSecretariat,
      workflowStatus
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    if (implementingOfficeId) whereClause.implementingOfficeId = implementingOfficeId;
    if (submittedToSecretariat === 'true') whereClause.submittedToSecretariat = true;
    if (workflowStatus) whereClause.workflowStatus = workflowStatus;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    // Role-based filtering
    switch (req.user.role) {
      case 'eiu':
      case 'EIU':
        // EIU sees projects assigned to them as external partner
        whereClause.hasExternalPartner = true;
        whereClause.eiuPersonnelId = req.user.id;
        break;
      case 'iu':
      case 'LGU-IU':
        // IU sees their own projects
        whereClause.implementingOfficeId = req.user.id;
        break;
      case 'secretariat':
        // Secretariat sees all projects for approval
        break;
      case 'mpmec':
      case 'LGU-PMT':
        // MPMEC sees approved projects
        whereClause.approvedBySecretariat = true;
        break;
      default:
        // Other roles see all projects
        break;
    }

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'username', 'role', 'subRole']
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'username', 'role', 'subRole']
        },
        {
          model: User,
          as: 'approvedByUser',
          attributes: ['id', 'name', 'username', 'role']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Calculate progress for each project
    const projectsWithProgress = await Promise.all(projects.map(async (project) => ({
      ...project.toJSON(),
      progress: await calculateProjectProgress(project, req.user.role)
    })));

    res.json({
      success: true,
      projects: projectsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

// Get project details with comprehensive progress
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const progressData = await ProgressCalculationService.calculateProjectProgress(id, req.user.role);
    
    // Add cache-busting headers to prevent stale data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0'
    });
    
    res.json({
      success: true,
      project: progressData
    });

  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project details'
    });
  }
});

// Update project (IU Implementing Office only)
router.put('/:id', authenticateToken, requireRole(['iu', 'LGU-IU']), async (req, res) => {
  try {
    const { id } = req.params;
    const { milestones, ...updateData } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user owns this project
    if (project.implementingOfficeId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this project'
      });
    }

    // Only allow updates if project is in draft status
    if (project.workflowStatus !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update project that is not in draft status'
      });
    }

    // Validate milestones if provided
    if (milestones) {
      if (!Array.isArray(milestones) || milestones.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Milestones must be an array with at least one milestone'
        });
      }

      // Validate total weight equals 100%
      const totalWeight = milestones.reduce((sum, milestone) => sum + parseFloat(milestone.weight || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          error: 'Total milestone weight must equal 100%'
        });
      }

      // Validate each milestone has required fields
      for (const milestone of milestones) {
        if ((!milestone.title && !milestone.name) || !milestone.weight || !milestone.plannedBudget) {
          return res.status(400).json({
            success: false,
            error: 'Each milestone must have title, weight, and plannedBudget'
          });
        }
      }
    }

    // Update project
    await project.update(updateData);

    // Handle milestone updates if provided
    if (milestones) {
      // Delete existing milestones
      await ProjectMilestone.destroy({
        where: { projectId: project.id }
      });

      // Create new milestones
      const milestoneRecords = milestones.map((milestone, index) => ({
        projectId: project.id,
        title: milestone.title || milestone.name, // Support both title and name for backward compatibility
        description: milestone.description || '',
        weight: parseFloat(milestone.weight),
        plannedBudget: parseFloat(milestone.plannedBudget),
        plannedStartDate: milestone.plannedStartDate || null,
        plannedEndDate: milestone.plannedEndDate || null,
        dueDate: milestone.plannedEndDate || milestone.dueDate || new Date(), // Use plannedEndDate as dueDate if available
        status: 'pending',
        order: index + 1
      }));

      await ProjectMilestone.bulkCreate(milestoneRecords);
    }

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_PROJECT',
      'Project',
      project.id,
      `Updated project: ${project.name} with ${milestones ? milestones.length : 0} milestones`
    );

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: {
        ...project.toJSON(),
        progress: calculateProjectProgress(project)
      }
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

// Delete project (IU Implementing Office only)
router.delete('/:id', authenticateToken, requireRole(['iu', 'LGU-IU']), async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user owns this project
    if (project.implementingOfficeId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this project'
      });
    }

    // Only allow deletion if project is pending
    if (project.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete project that is not pending'
      });
    }

    await project.destroy();

    // Log activity
    await logActivity(
      req.user.id,
      'DELETE_PROJECT',
      'Project',
      id,
      `Deleted project: ${project.name}`
    );

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

// ===== PROJECT APPROVAL WORKFLOW =====

// Approve project (Secretariat only) - Direct role checking
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, comments } = req.body;

    // Direct role checking for both new and legacy role systems
    const allowedRoles = ['secretariat', 'LGU-PMT'];
    const hasValidRole = allowedRoles.includes(req.user.role);
    
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    const hasValidSubrole = req.user.role === 'LGU-PMT' ? 
      (req.user.subRole === 'Secretariat' || req.user.subRole === 'MPMEC Secretariat') : true;
    
    if (!hasValidRole || !hasValidSubrole) {
      console.log('Role check failed:', { 
        userRole: req.user.role, 
        userSubRole: req.user.subRole, 
        allowedRoles,
        hasValidRole,
        hasValidSubrole
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.',
        debug: {
          userRole: req.user.role,
          userSubRole: req.user.subRole,
          allowedRoles
        }
      });
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (approved) {
      await project.update({
        workflowStatus: 'secretariat_approved',
        approvedBySecretariat: true,
        approvedBy: req.user.id,
        approvalDate: new Date(),
        status: 'ongoing'
      });

      // Log activity
      await logActivity(
        req.user.id,
        'APPROVE_PROJECT',
        'Project',
        project.id,
        `Approved project: ${project.name}`
      );

      res.json({
        success: true,
        message: 'Project approved successfully',
        project: {
          ...project.toJSON(),
          progress: calculateProjectProgress(project)
        }
      });
    } else {
      await project.update({
        workflowStatus: 'draft',
        approvedBySecretariat: false,
        status: 'pending'
      });

      // Log activity
      await logActivity(
        req.user.id,
        'REJECT_PROJECT',
        'Project',
        project.id,
        `Rejected project: ${project.name} - ${comments || 'No comments'}`
      );

      res.json({
        success: true,
        message: 'Project rejected',
        project: {
          ...project.toJSON(),
          progress: calculateProjectProgress(project)
        }
      });
    }

  } catch (error) {
    console.error('Approve project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve project'
    });
  }
});

// Submit project to Secretariat for approval
router.post('/:projectId/submit-to-secretariat', authenticateToken, requireRole(['iu', 'LGU-IU']), async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones'
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user owns this project
    if (project.implementingOfficeId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only submit your own projects'
      });
    }

    // Check if project is in draft status
    if (project.workflowStatus !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Project must be in draft status to submit to Secretariat'
      });
    }

    // Check if project has milestones
    if (!project.milestones || project.milestones.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Project must have milestones before submitting to Secretariat'
      });
    }

    // Update project status
    await project.update({
      workflowStatus: 'submitted',
      submittedToSecretariat: true,
      submittedToSecretariatDate: new Date()
    });

    // Log activity
    await logActivity(
      req.user.id,
      'SUBMIT_TO_SECRETARIAT',
      'Project',
      project.id,
      `Submitted project ${project.name} (${project.projectCode}) to Secretariat for approval`
    );

    res.json({
      success: true,
      message: 'Project submitted to Secretariat successfully',
      project
    });

  } catch (error) {
    console.error('Submit to Secretariat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit project to Secretariat'
    });
  }
});

// Secretariat approve project
router.post('/:projectId/secretariat-approve', authenticateToken, requireRole(['secretariat', 'LGU-PMT-MPMEC-SECRETARIAT']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { remarks } = req.body;

    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if project is submitted to Secretariat
    if (project.workflowStatus !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Project must be submitted to Secretariat before approval'
      });
    }

    // Update project status
    await project.update({
      workflowStatus: 'secretariat_approved',
      approvedBySecretariat: true,
      secretariatApprovalDate: new Date(),
      secretariatApprovedBy: req.user.id,
      status: 'ongoing' // Change status to ongoing
    });

    // Log activity
    await logActivity(
      req.user.id,
      'SECRETARIAT_APPROVE',
      'Project',
      project.id,
      `Secretariat approved project ${project.name} (${project.projectCode})`
    );

    res.json({
      success: true,
      message: 'Project approved by Secretariat successfully',
      project
    });

  } catch (error) {
    console.error('Secretariat approve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve project'
    });
  }
});

// Secretariat reject project
router.post('/:projectId/secretariat-reject', authenticateToken, requireRole(['secretariat', 'LGU-PMT-MPMEC-SECRETARIAT']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { remarks } = req.body;

    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if project is submitted to Secretariat
    if (project.workflowStatus !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Project must be submitted to Secretariat before rejection'
      });
    }

    // Update project status back to draft
    await project.update({
      workflowStatus: 'draft',
      submittedToSecretariat: false,
      submittedToSecretariatDate: null
    });

    // Log activity
    await logActivity(
      req.user.id,
      'SECRETARIAT_REJECT',
      'Project',
      project.id,
      `Secretariat rejected project ${project.name} (${project.projectCode}): ${remarks}`
    );

    res.json({
      success: true,
      message: 'Project rejected by Secretariat',
      project
    });

  } catch (error) {
    console.error('Secretariat reject error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject project'
    });
  }
});

// ===== SECRETARIAT COMPILATION & VALIDATION ENDPOINTS =====

// Get compilation summary organized by department/office
router.get('/compilation/summary', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: {
        workflowStatus: {
          [Op.in]: ['ongoing', 'compiled_for_secretariat', 'validated_by_secretariat']
        }
      },
      include: [
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'email', 'department']
        }
      ]
    });

    // Group projects by implementing office
    const officeGroups = {};
    let totalProjects = 0;
    let totalReports = 0;
    let totalCompletion = 0;
    let timelineStats = { onSchedule: 0, slightlyDelayed: 0, significantlyDelayed: 0 };
    let budgetStats = { withinBudget: 0, minorOverrun: 0, majorOverrun: 0 };
    let validationStats = { pending: 0, approved: 0, rejected: 0 };

    // Calculate progress for each project using ProgressCalculationService
    const projectsWithProgress = await Promise.all(projects.map(async (project) => {
      const progress = await calculateProjectProgress(project, req.user.role);
      return {
        ...project.toJSON(),
        progress
      };
    }));

    projectsWithProgress.forEach(project => {
      totalProjects++;
      totalCompletion += parseFloat(project.progress?.overallProgress || project.overallProgress || 0);

      // Count compiled reports
      if (project.workflowStatus === 'compiled_for_secretariat') {
        totalReports++;
        validationStats.pending++;
      } else if (project.workflowStatus === 'validated_by_secretariat') {
        validationStats.approved++;
      }

      // Timeline status analysis
      const timelineProgress = parseFloat(project.progress?.timelineProgress || project.timelineProgress || 0);
      if (timelineProgress >= 80) {
        timelineStats.onSchedule++;
      } else if (timelineProgress >= 50) {
        timelineStats.slightlyDelayed++;
      } else {
        timelineStats.significantlyDelayed++;
      }

      // Budget status analysis (simplified - would need actual budget vs actual spending)
      budgetStats.withinBudget++;

      // Group by implementing office
      const officeName = project.implementingOfficeName || 'Unknown Office';
      if (!officeGroups[officeName]) {
        officeGroups[officeName] = [];
      }

      officeGroups[officeName].push({
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        overallProgress: project.progress?.overallProgress || project.overallProgress,
        timelineProgress: project.progress?.timelineProgress || project.timelineProgress,
        budgetProgress: project.progress?.budgetProgress || project.budgetProgress,
        physicalProgress: project.progress?.physicalProgress || project.physicalProgress,
        totalBudget: project.totalBudget,
        implementingOffice: project.implementingOfficeName,
        eiuPartner: project.eiuPersonnel?.name || 'Not assigned',
        status: project.workflowStatus,
        hasCompiledReport: project.workflowStatus === 'compiled_for_secretariat'
      });
    });

    // Convert to array format for frontend
    const officeSummary = Object.keys(officeGroups).map(office => ({
      office: office,
      projects: officeGroups[office]
    }));

    const overallStats = {
      totalProjects,
      totalReports,
      averageCompletion: totalProjects > 0 ? (totalCompletion / totalProjects).toFixed(2) : 0,
      timelineStatus: timelineStats,
      budgetStatus: budgetStats,
      validationStatus: validationStats
    };

    res.json({
      success: true,
      overallStats,
      officeSummary
    });
  } catch (error) {
    console.error('Error fetching compilation summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compilation summary'
    });
  }
});

// Get validation queue data
router.get('/validation/queue', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    const { status, priority, office, daysPending } = req.query;

    // Build where clause for validation queue
    const whereClause = {};
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    // Get validation queue with project and user details
    const validations = await ProjectValidation.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'role', 'subRole']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Filter by office if specified
    let filteredValidations = validations;
    if (office) {
      filteredValidations = validations.filter(v => 
        v.project?.implementingOffice?.name?.toLowerCase().includes(office.toLowerCase())
      );
    }

    // Filter by days pending if specified
    if (daysPending) {
      const days = parseInt(daysPending);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filteredValidations = filteredValidations.filter(v => 
        new Date(v.createdAt) <= cutoffDate
      );
    }

    // Transform data for frontend
    const validationQueue = filteredValidations.map(validation => ({
      id: validation.id,
      reportName: `${validation.project?.name || 'Unknown Project'} - ${validation.reportType.replace('_', ' ').toUpperCase()}`,
      office: validation.project?.implementingOffice?.name || 'Unknown Office',
      priority: validation.priority,
      issues: validation.issues ? validation.issues.length : 0,
      submitted: validation.createdAt,
      status: validation.status,
      projectId: validation.projectId,
      projectName: validation.project?.name || 'Unknown Project',
      reportType: validation.reportType,
      validator: validation.validator?.name || null,
      validatedAt: validation.validatedAt,
      comments: validation.comments
    }));

    // Calculate validation statistics
    const today = new Date().toDateString();
    const stats = {
      pendingValidation: validationQueue.filter(item => item.status === 'pending').length,
      validatedToday: validationQueue.filter(item => {
        const validatedDate = new Date(item.validatedAt).toDateString();
        return item.status === 'validated' && validatedDate === today;
      }).length,
      issuesFlagged: validationQueue.filter(item => item.issues > 0).length,
      returnedForRevision: validationQueue.filter(item => item.status === 'returned').length
    };

    res.json({
      success: true,
      validationQueue,
      stats
    });

  } catch (error) {
    console.error('Get validation queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch validation queue'
    });
  }
});

// Final validation and progress update for compiled reports
router.post('/compiled-report/:projectId/validate', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    const { projectId } = req.params;
    const { validated, comments, progressUpdate } = req.body;

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.workflowStatus !== 'compiled_for_secretariat') {
      return res.status(400).json({
        success: false,
        error: 'Project is not in compiled status for validation'
      });
    }

    // Get the latest compiled report to calculate milestone weights
    const compiledReport = await ProjectUpdate.findOne({
      where: {
        projectId: projectId,
        updateType: {
          [Op.in]: ['milestone', 'milestone_update']
        },
        status: 'iu_approved'
      },
      order: [['createdAt', 'DESC']]
    });

    // Update project status based on validation
    if (validated) {
      project.workflowStatus = 'validated_by_secretariat';
      project.validatedBySecretariat = true;
      project.validatedBySecretariatDate = new Date();
      project.secretariatComments = comments;

      // Calculate progress based on milestone weights from compiled report
      if (compiledReport && compiledReport.milestoneUpdates) {
        let milestoneUpdates = [];
        try {
          milestoneUpdates = typeof compiledReport.milestoneUpdates === 'string' 
            ? JSON.parse(compiledReport.milestoneUpdates) 
            : compiledReport.milestoneUpdates;
        } catch (e) {
          console.error('Error parsing milestone updates:', e);
          milestoneUpdates = [];
        }

        // Calculate total approved weight from compiled report
        const approvedWeight = milestoneUpdates.reduce((total, milestone) => {
          if (milestone.status === 'completed') {
            return total + (parseFloat(milestone.weight) || 0);
          }
          return total;
        }, 0);

        // Apply progress update based on milestone weight
        if (progressUpdate && progressUpdate.fullWeight) {
          // Full weight approval: Apply the approved milestone weight to overall progress
          const milestoneWeight = approvedWeight; // This is the weight from the compiled report
          
          // Update overall progress to match the milestone weight
          project.overallProgress = Math.min(100, milestoneWeight);
          
          // Distribute the milestone weight across the 3 divisions (33.33% each)
          const divisionWeight = milestoneWeight / 3; // Each division gets equal share
          
          // Update each division progress
          const currentTimeline = parseFloat(project.timelineProgress) || 0;
          const currentBudget = parseFloat(project.budgetProgress) || 0;
          const currentPhysical = parseFloat(project.physicalProgress) || 0;
          
          project.timelineProgress = Math.min(100, currentTimeline + divisionWeight);
          project.budgetProgress = Math.min(100, currentBudget + divisionWeight);
          project.physicalProgress = Math.min(100, currentPhysical + divisionWeight);
          
        } else if (progressUpdate) {
          // Partial progress approval: Use the provided values
          const { timelineProgress, budgetProgress, physicalProgress } = progressUpdate;
          
          project.timelineProgress = Math.min(100, parseFloat(timelineProgress) || 0);
          project.budgetProgress = Math.min(100, parseFloat(budgetProgress) || 0);
          project.physicalProgress = Math.min(100, parseFloat(physicalProgress) || 0);
          
          // Calculate overall progress as average of the three divisions
          project.overallProgress = (
            (project.timelineProgress + project.budgetProgress + project.physicalProgress) / 3
          );
        }
      }
    } else {
      // Reject the compiled report
      project.workflowStatus = 'ongoing'; // Return to ongoing status
      project.validatedBySecretariat = false;
      project.secretariatComments = comments;
      project.rejectedBySecretariatDate = new Date();
    }

    await project.save();

    // Log the activity
    await ActivityLog.create({
      projectId: project.id,
      userId: req.user.id,
      action: validated ? 'Compiled report approved by Secretariat' : 'Compiled report rejected by Secretariat',
      details: comments || (validated ? 'Report approved with progress updates' : 'Report rejected'),
      category: 'secretariat_validation'
    });

    res.json({
      success: true,
      message: validated ? 'Compiled report approved successfully' : 'Compiled report rejected',
      project: {
        id: project.id,
        workflowStatus: project.workflowStatus,
        overallProgress: project.overallProgress,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress
      }
    });

  } catch (error) {
    console.error('Error validating compiled report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate compiled report'
    });
  }
});

// Get project activity history
router.get('/:projectId/activity-history', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const activities = await ActivityLog.findAll({
      where: {
        entityType: 'Project',
        entityId: projectId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'role', 'subRole']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      activities: activities
    });

  } catch (error) {
    console.error('Get activity history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity history'
    });
  }
});

// Generate project report
router.get('/:projectId/generate-report', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['name', 'role', 'subRole']
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['name', 'role', 'subRole']
        },
        {
          model: ProjectUpdate,
          as: 'updates',
          where: { status: 'iu_approved' },
          required: false,
          include: [
            {
              model: User,
              as: 'submitter',
              attributes: ['name', 'role']
            }
          ]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Generate a simple JSON report (in a real app, you'd generate PDF/Excel)
    const report = {
      projectInfo: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        implementingOffice: project.implementingOffice?.name,
        category: project.category,
        location: project.location,
        totalBudget: project.totalBudget,
        startDate: project.startDate,
        endDate: project.endDate
      },
      progress: {
        overallProgress: project.overallProgress,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress,
        automatedProgress: project.automatedProgress
      },
      workflow: {
        status: project.status,
        workflowStatus: project.workflowStatus,
        submittedToSecretariat: project.submittedToSecretariat,
        submittedToSecretariatDate: project.submittedToSecretariatDate
      },
      approvedUpdates: project.updates?.map(update => ({
        id: update.id,
        title: update.title,
        submittedBy: update.submitter?.name,
        submittedAt: update.submittedAt,
        milestoneUpdates: update.milestoneUpdates
      })) || []
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="project-report-${project.projectCode}.json"`);
    res.json(report);

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// Export compilation data
router.get('/compilation/export', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    const projects = await Project.findAll({
      where: {
        approvedBySecretariat: true
      },
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['name', 'role', 'subRole']
        },
        {
          model: ProjectUpdate,
          as: 'updates',
          where: { status: 'iu_approved' },
          required: false
        }
      ]
    });

    const compilationData = projects.map(project => ({
      projectCode: project.projectCode,
      name: project.name,
      implementingOffice: project.implementingOffice?.name,
      category: project.category,
      totalBudget: project.totalBudget,
      overallProgress: project.overallProgress,
      workflowStatus: project.workflowStatus,
      reportsSubmitted: project.updates?.length || 0,
      submittedToSecretariatDate: project.submittedToSecretariatDate
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="compilation-export.json"');
    res.json(compilationData);

  } catch (error) {
    console.error('Export compilation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export compilation data'
    });
  }
});

// Validate a report
router.post('/validation/:validationId/validate', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    const { validationId } = req.params;
    const { validated, comments, issues, validationChecklist, validationScore, complianceStatus } = req.body;

    const validation = await ProjectValidation.findByPk(validationId, {
      include: [
        {
          model: Project,
          as: 'project'
        }
      ]
    });

    if (!validation) {
      return res.status(404).json({
        success: false,
        error: 'Validation record not found'
      });
    }

    // Update validation record
    validation.status = validated ? 'validated' : 'flagged';
    validation.comments = comments;
    validation.issues = issues || [];
    validation.validationChecklist = validationChecklist;
    validation.validatedBy = req.user.id;
    validation.validatedAt = new Date();
    validation.validationScore = validationScore;
    validation.complianceStatus = complianceStatus;

    if (!validated) {
      validation.returnedForRevision = true;
      validation.revisionReason = comments;
    }

    await validation.save();

    // Log the activity
    await logActivity(
      req.user.id,
      validated ? 'VALIDATE_REPORT' : 'FLAG_REPORT',
      'ProjectValidation',
      validation.id,
      `${validated ? 'Validated' : 'Flagged'} ${validation.reportType} for project: ${validation.project?.name || 'Unknown Project'}${comments ? ` - ${comments}` : ''}`
    );

    // If validated, update project status if needed
    if (validated && validation.project) {
      const project = validation.project;
      
      // Update project validation status based on report type
      if (validation.reportType === 'progress_report') {
        project.validatedBySecretariat = true;
        project.validatedBySecretariatDate = new Date();
        project.secretariatComments = comments;
      }
      
      await project.save();
    }

    res.json({
      success: true,
      message: validated ? 'Report validated successfully' : 'Report flagged for issues',
      validation: {
        id: validation.id,
        status: validation.status,
        validated,
        comments,
        issues,
        validatedAt: validation.validatedAt,
        validator: req.user.name
      }
    });

  } catch (error) {
    console.error('Validate report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate report'
    });
  }
});

// Flag an issue for a validation
router.post('/validation/:validationId/flag', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    const { validationId } = req.params;
    const { issue, priority } = req.body;

    const validation = await ProjectValidation.findByPk(validationId, {
      include: [
        {
          model: Project,
          as: 'project'
        }
      ]
    });

    if (!validation) {
      return res.status(404).json({
        success: false,
        error: 'Validation record not found'
      });
    }

    // Add issue to existing issues array
    const currentIssues = validation.issues || [];
    currentIssues.push({
      issue,
      priority: priority || 'medium',
      flaggedBy: req.user.id,
      flaggedAt: new Date()
    });

    validation.issues = currentIssues;
    validation.status = 'flagged';
    validation.priority = priority || validation.priority;
    await validation.save();

    // Log the activity
    await logActivity(
      req.user.id,
      'FLAG_ISSUE',
      'ProjectValidation',
      validation.id,
      `Flagged issue in ${validation.reportType} for project: ${validation.project?.name || 'Unknown Project'} - ${issue}`
    );

    res.json({
      success: true,
      message: 'Issue flagged successfully',
      validation: {
        id: validation.id,
        issues: validation.issues,
        status: validation.status
      }
    });

  } catch (error) {
    console.error('Flag issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flag issue'
    });
  }
});

// Return validation for revision
router.post('/validation/:validationId/return', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    const { validationId } = req.params;
    const { reason, requiredChanges } = req.body;

    const validation = await ProjectValidation.findByPk(validationId, {
      include: [
        {
          model: Project,
          as: 'project'
        }
      ]
    });

    if (!validation) {
      return res.status(404).json({
        success: false,
        error: 'Validation record not found'
      });
    }

    validation.status = 'returned';
    validation.returnedForRevision = true;
    validation.revisionReason = reason;
    validation.comments = reason;
    validation.validatedBy = req.user.id;
    validation.validatedAt = new Date();

    await validation.save();

    // Log the activity
    await logActivity(
      req.user.id,
      'RETURN_FOR_REVISION',
      'ProjectValidation',
      validation.id,
      `Returned ${validation.reportType} for revision - Project: ${validation.project?.name || 'Unknown Project'} - Reason: ${reason}`
    );

    res.json({
      success: true,
      message: 'Report returned for revision',
      validation: {
        id: validation.id,
        status: validation.status,
        revisionReason: validation.revisionReason,
        returnedAt: validation.validatedAt
      }
    });

  } catch (error) {
    console.error('Return for revision error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to return report for revision'
    });
  }
});

// ===== PROJECT UPDATES =====

// Submit project update
router.post('/:id/updates', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      updateType,
      title,
      description,
      currentProgress,
      comments,
      amountSpent,
      documentsUploaded,
      mediaFiles,
      milestoneAchieved,
      nextMilestone
    } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Determine submittedByRole based on user role
    let submittedByRole;
    switch (req.user.role) {
      case 'eiu':
        submittedByRole = 'eiu';
        break;
      case 'iu':
        submittedByRole = 'iu';
        break;
      case 'secretariat':
        submittedByRole = 'secretariat';
        break;
      case 'mpmec':
        submittedByRole = 'mpmec';
        break;
      default:
        submittedByRole = 'iu';
    }

    // Get previous progress for this update type
    const previousUpdate = await ProjectUpdate.findOne({
      where: {
        projectId: id,
        updateType
      },
      order: [['createdAt', 'DESC']]
    });

    const previousProgress = previousUpdate ? previousUpdate.currentProgress : 0;
    const progressChange = currentProgress - previousProgress;

    // Create update
    const update = await ProjectUpdate.create({
      projectId: id,
      updateType,
      updateFrequency: project[`${updateType}UpdateFrequency`],
      previousProgress,
      currentProgress,
      progressChange,
      title,
      description,
      comments,
      amountSpent: amountSpent || 0,
      budgetUtilization: amountSpent ? (amountSpent / project.totalBudget) * 100 : 0,
      documentsUploaded,
      mediaFiles,
      milestoneAchieved,
      nextMilestone,
      status: 'pending',
      submittedBy: req.user.id,
      submittedByRole
    });

    // Update project progress based on update type
    const progressField = `${updateType}Progress`;
    await project.update({
      [progressField]: currentProgress,
      overallProgress: calculateProjectProgress(project).overallProgress
    });

    // Log activity
    await logActivity(
      req.user.id,
      'SUBMIT_UPDATE',
      'ProjectUpdate',
      update.id,
      `Submitted ${updateType} update for project: ${project.name}`
    );

    res.status(201).json({
      success: true,
      message: 'Project update submitted successfully',
      update
    });

  } catch (error) {
    console.error('Submit update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit project update'
    });
  }
});

// Get project updates
router.get('/:id/updates', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { updateType, status } = req.query;

    const whereClause = { projectId: id };
    if (updateType) whereClause.updateType = updateType;
    if (status) whereClause.status = status;

    const updates = await ProjectUpdate.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'username', 'role']
        }
      ]
    });

    // Add cache-busting headers to prevent stale data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0'
    });

    res.json({
      success: true,
      updates
    });

  } catch (error) {
    console.error('Get updates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project updates'
    });
  }
});

// Approve/reject project update (IU or Secretariat)
router.post('/:id/updates/:updateId/approve', authenticateToken, requireRole(['iu', 'secretariat', 'LGU-IU', 'LGU-PMT']), async (req, res) => {
  try {
    const { id, updateId } = req.params;
    const { approved, comments } = req.body;

    const update = await ProjectUpdate.findByPk(updateId, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!update || update.projectId !== id) {
      return res.status(404).json({
        success: false,
        error: 'Update not found'
      });
    }

    // Check authorization based on role
    if (req.user.role === 'iu' && update.submittedByRole !== 'eiu') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to approve this update'
      });
    }

    if (req.user.role === 'secretariat' && update.submittedByRole !== 'iu') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to approve this update'
      });
    }

    await update.update({
      status: approved ? 'approved' : 'rejected',
      approvedBy: req.user.id,
      approvalDate: new Date(),
      approvalComments: comments
    });

    // Log activity
    await logActivity(
      req.user.id,
      approved ? 'APPROVE_UPDATE' : 'REJECT_UPDATE',
      'ProjectUpdate',
      update.id,
      `${approved ? 'Approved' : 'Rejected'} ${update.updateType} update for project: ${update.project.name}`
    );

    res.json({
      success: true,
      message: `Update ${approved ? 'approved' : 'rejected'} successfully`,
      update
    });

  } catch (error) {
    console.error('Approve update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve update'
    });
  }
});

// ===== PROJECT MILESTONES =====

// Create milestone
router.post('/:id/milestones', authenticateToken, requireRole(['iu', 'LGU-IU']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      dueDate,
      priority,
      dependsOn
    } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const milestone = await ProjectMilestone.create({
      projectId: id,
      title,
      description,
      dueDate,
      priority: priority || 'medium',
      dependsOn,
      status: 'pending',
      progress: 0
    });

    // Log activity
    await logActivity(
      req.user.id,
      'CREATE_MILESTONE',
      'ProjectMilestone',
      milestone.id,
      `Created milestone: ${milestone.title} for project: ${project.name}`
    );

    res.status(201).json({
      success: true,
      message: 'Milestone created successfully',
      milestone
    });

  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create milestone'
    });
  }
});

// Get project milestones
router.get('/:id/milestones', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const milestones = await ProjectMilestone.findAll({
      where: { projectId: id },
      order: [['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      milestones
    });

  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milestones'
    });
  }
});

// Update milestone
router.put('/:id/milestones/:milestoneId', authenticateToken, async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const updateData = req.body;

    const milestone = await ProjectMilestone.findOne({
      where: { id: milestoneId, projectId: id }
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found'
      });
    }

    await milestone.update(updateData);

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_MILESTONE',
      'ProjectMilestone',
      milestone.id,
      `Updated milestone: ${milestone.title}`
    );

    res.json({
      success: true,
      message: 'Milestone updated successfully',
      milestone
    });

  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update milestone'
    });
  }
});

// ===== DASHBOARD STATISTICS =====

// Get dashboard statistics based on user role
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const whereClause = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'eiu':
      case 'EIU':
        whereClause.hasExternalPartner = true;
        break;
      case 'iu':
      case 'LGU-IU':
        whereClause.implementingOfficeId = req.user.id;
        break;
      case 'secretariat':
        // Secretariat sees all projects
        break;
      case 'mpmec':
        whereClause.approvedBySecretariat = true;
        break;
    }

    const projects = await Project.findAll({ where: whereClause });

    const stats = {
      total: projects.length,
      pending: projects.filter(p => p.status === 'pending').length,
      ongoing: projects.filter(p => p.status === 'ongoing').length,
      delayed: projects.filter(p => p.status === 'delayed').length,
      complete: projects.filter(p => p.status === 'complete').length,
      averageProgress: 0
    };

    if (projects.length > 0) {
      const ProgressCalculationService = require('../services/progressCalculationService');
      let totalProgress = 0;
      
      for (const project of projects) {
        try {
          const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, req.user.role);
          totalProgress += progressData.progress.overall;
        } catch (error) {
          console.error(`Error calculating progress for project ${project.id}:`, error);
          // Fallback to simple calculation if ProgressCalculationService fails
          const progress = calculateProjectProgress(project);
          totalProgress += progress.overallProgress;
        }
      }
      stats.averageProgress = Math.round((totalProgress / projects.length) * 100) / 100;
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Approve project update
router.post('/project-updates/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, iuReviewRemarks } = req.body;

    const update = await ProjectUpdate.findByPk(id);
    if (!update) {
      return res.status(404).json({
        success: false,
        error: 'Project update not found'
      });
    }

    // Update the project update
    await update.update({
      status: status || 'iu_approved',
      iuReviewer: req.user.id,
      iuReviewDate: new Date(),
      iuReviewRemarks: iuReviewRemarks || 'Approved by Implementing Office'
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'APPROVE_PROJECT_UPDATE',
      entityType: 'ProjectUpdate',
      entityId: update.id,
      details: `Approved project update: ${update.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Project update approved successfully',
      update: update
    });

  } catch (error) {
    console.error('Approve project update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve project update'
    });
  }
});

// Reject project update
router.post('/project-updates/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, iuReviewRemarks } = req.body;

    if (!iuReviewRemarks) {
      return res.status(400).json({
        success: false,
        error: 'Rejection remarks are required'
      });
    }

    const update = await ProjectUpdate.findByPk(id);
    if (!update) {
      return res.status(404).json({
        success: false,
        error: 'Project update not found'
      });
    }

    // Update the project update
    await update.update({
      status: status || 'iu_rejected',
      iuReviewer: req.user.id,
      iuReviewDate: new Date(),
      iuReviewRemarks: iuReviewRemarks
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'REJECT_PROJECT_UPDATE',
      entityType: 'ProjectUpdate',
      entityId: update.id,
      details: `Rejected project update: ${update.title} - ${iuReviewRemarks}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Project update rejected successfully',
      update: update
    });

  } catch (error) {
    console.error('Reject project update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject project update'
    });
  }
});

// Compile and submit to Secretariat
router.post('/:id/compile-and-submit', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { compiledReport, submittedAt } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if there's an approved milestone update
    const approvedUpdates = await ProjectUpdate.findAll({
      where: {
        projectId: id,
        status: 'iu_approved'
      }
    });

    const approvedMilestone = approvedUpdates.find(update => update.updateType === 'milestone');
    
    if (!approvedMilestone) {
      return res.status(400).json({
        success: false,
        error: 'No approved milestone update found. Please approve a milestone update first.'
      });
    }

    // Check if the milestone update contains milestone data
    if (!approvedMilestone.milestoneUpdates) {
      return res.status(400).json({
        success: false,
        error: 'The approved milestone update does not contain milestone data.'
      });
    }

    try {
      const milestones = approvedMilestone.milestoneUpdates;
      if (!milestones || milestones.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'The approved milestone update does not contain valid milestone data.'
        });
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Error parsing milestone data. Please try again.'
      });
    }

    // Update project status
    await project.update({
      workflowStatus: 'compiled_for_secretariat',
      submittedToSecretariat: true,
      submittedToSecretariatDate: submittedAt || new Date()
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'COMPILE_AND_SUBMIT_TO_SECRETARIAT',
      entityType: 'Project',
      entityId: project.id,
      details: `Compiled and submitted progress report to Secretariat for project: ${project.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Progress report compiled and submitted to Secretariat successfully',
      project: project
    });

  } catch (error) {
    console.error('Compile and submit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compile and submit to Secretariat'
    });
  }
});

// Get project timeline data
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id, {
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 'status', 'order'],
          order: [['order', 'ASC']]
        },
        {
          model: ProjectUpdate,
          as: 'updates',
          where: {
            updateType: {
              [Op.in]: ['milestone', 'milestone_update']
            }
          },
          required: false,
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get milestone progress from latest update
    let milestoneUpdates = [];
    if (project.updates && project.updates.length > 0) {
      const latestUpdate = project.updates[0];
      if (latestUpdate.milestoneUpdates) {
        try {
          milestoneUpdates = typeof latestUpdate.milestoneUpdates === 'string' 
            ? JSON.parse(latestUpdate.milestoneUpdates) 
            : latestUpdate.milestoneUpdates;
        } catch (e) {
          console.error('Error parsing milestone updates:', e);
        }
      }
    }

    // Map milestones with progress
    const milestones = project.milestones.map(milestone => {
      const update = milestoneUpdates.find(u => u.milestoneId === milestone.id);
      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        weight: parseFloat(milestone.weight || 0),
        plannedBudget: milestone.plannedBudget,
        dueDate: milestone.dueDate,
        status: update?.status || 'pending',
        progress: update?.progress || 0
      };
    });

    // Calculate progress summary
    const progress = {
      overall: parseFloat(project.overallProgress) || 0,
      timeline: parseFloat(project.timelineProgress) || 0,
      budget: parseFloat(project.budgetProgress) || 0,
      physical: parseFloat(project.physicalProgress) || 0
    };

    res.json({
      success: true,
      timeline: {
        milestones: milestones,
        startDate: project.startDate,
        endDate: project.endDate
      },
      milestones: milestones,
      progress: progress
    });

  } catch (error) {
    console.error('Error fetching project timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project timeline'
    });
  }
});

// Get project history data
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id, {
      include: [
        {
          model: ProjectUpdate,
          as: 'updates',
          order: [['createdAt', 'DESC']],
          limit: 50
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get activity logs using entityId instead of projectId
    const activities = await ActivityLog.findAll({
      where: { 
        entityId: id,
        entityType: 'project'
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Format updates
    const updates = project.updates.map(update => ({
      id: update.id,
      title: update.title,
      description: update.description,
      updateType: update.updateType,
      status: update.status,
      claimedProgress: parseFloat(update.claimedProgress) || 0,
      createdAt: update.createdAt,
      submittedByRole: update.submittedByRole
    }));

    // Format activities
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      category: activity.module || 'general',
      createdAt: activity.createdAt
    }));

    res.json({
      success: true,
      updates: updates,
      activities: formattedActivities
    });

  } catch (error) {
    console.error('Error fetching project history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project history'
    });
  }
});

// Export project report
router.get('/:id/export-report', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 'status', 'order'],
          order: [['order', 'ASC']]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Create a simple HTML report (you can enhance this with a proper PDF library)
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Project Report - ${project.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          .section h2 { color: #333; border-bottom: 2px solid #EB3C3C; padding-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
          .info-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
          .progress-bar { width: 100%; height: 20px; background: #ddd; border-radius: 10px; overflow: hidden; }
          .progress-fill { height: 100%; background: #EB3C3C; transition: width 0.3s; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Project Report</h1>
          <h2>${project.name}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
          <h2>Project Information</h2>
          <div class="info-grid">
            <div class="info-item"><strong>Project Code:</strong> ${project.projectCode}</div>
            <div class="info-item"><strong>Category:</strong> ${project.category}</div>
            <div class="info-item"><strong>Status:</strong> ${project.status}</div>
            <div class="info-item"><strong>Workflow Status:</strong> ${project.workflowStatus}</div>
            <div class="info-item"><strong>Start Date:</strong> ${project.startDate}</div>
            <div class="info-item"><strong>End Date:</strong> ${project.endDate}</div>
            <div class="info-item"><strong>Total Budget:</strong> ₱${parseFloat(project.totalBudget).toLocaleString()}</div>
            <div class="info-item"><strong>Implementing Office:</strong> ${project.implementingOffice?.name || 'N/A'}</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Progress Overview</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>Overall Progress:</strong> ${parseFloat(project.overallProgress).toFixed(2)}%
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.overallProgress}%"></div>
              </div>
            </div>
            <div class="info-item">
              <strong>Timeline Progress:</strong> ${parseFloat(project.timelineProgress).toFixed(2)}%
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.timelineProgress}%"></div>
              </div>
            </div>
            <div class="info-item">
              <strong>Budget Progress:</strong> ${parseFloat(project.budgetProgress).toFixed(2)}%
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.budgetProgress}%"></div>
              </div>
            </div>
            <div class="info-item">
              <strong>Physical Progress:</strong> ${parseFloat(project.physicalProgress).toFixed(2)}%
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.physicalProgress}%"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Milestones</h2>
          <table>
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Weight</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Budget</th>
              </tr>
            </thead>
            <tbody>
              ${project.milestones.map(milestone => `
                <tr>
                  <td>${milestone.title}</td>
                  <td>${milestone.weight}%</td>
                  <td>${milestone.dueDate}</td>
                  <td>${milestone.status}</td>
                  <td>₱${parseFloat(milestone.plannedBudget || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Project Description</h2>
          <p>${project.description || 'No description available'}</p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="project-report-${project.projectCode}.html"`);
    res.send(reportHtml);

  } catch (error) {
    console.error('Error exporting project report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export project report'
    });
  }
});

// Export project history
router.get('/:id/export-history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id, {
      include: [
        {
          model: ProjectUpdate,
          as: 'updates',
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get activity logs
    const activities = await ActivityLog.findAll({
      where: { projectId: id },
      order: [['createdAt', 'DESC']]
    });

    // Create CSV data
    const csvData = [
      ['Date', 'Action', 'Details', 'Category'],
      ...activities.map(activity => [
        new Date(activity.createdAt).toLocaleDateString(),
        activity.action,
        activity.details || '',
        activity.category || ''
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="project-history-${project.projectCode}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting project history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export project history'
    });
  }
});

module.exports = router; 
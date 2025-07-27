const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { Project, ProjectUpdate, ProjectMilestone, ProjectValidation, User } = require('../../models');
const { createNotification, createNotificationForRole } = require('../notifications');
const { Op } = require('sequelize');
const ProgressCalculationService = require('../../services/progressCalculationService');

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

    // Store project details for notifications before deletion
    const projectDetails = {
      id: project.id,
      name: project.name,
      projectCode: project.projectCode,
      implementingOfficeId: project.implementingOfficeId,
      eiuPersonnelId: project.eiuPersonnelId
    };

    // Create notifications for project deletion
    try {
      console.log('Starting notification creation for project deletion (IU route):', project.name);
      
      // Notification for Implementing Office (project owner)
      if (project.implementingOfficeId) {
        await createNotification(
          project.implementingOfficeId,
          'Project Deleted',
          `Your project "${project.name}" (${project.projectCode}) has been successfully deleted.`,
          'Info',
          'Project',
          'Project',
          project.id,
          'Medium'
        );
        console.log(`✅ Notification created for Implementing Office: ${project.implementingOfficeId}`);
      }

      // Notification for EIU Partner (if assigned)
      if (project.eiuPersonnelId) {
        await createNotification(
          project.eiuPersonnelId,
          'Project Deleted',
          `The project "${project.name}" (${project.projectCode}) that you were assigned to has been deleted by the Implementing Office.`,
          'Warning',
          'Project',
          'Project',
          project.id,
          'Medium'
        );
        console.log(`✅ Notification created for EIU Partner: ${project.eiuPersonnelId}`);
      }

      // Notification for Secretariat (LGU-PMT role)
      await createNotificationForRole(
        'LGU-PMT',
        'Project Deleted',
        `A project has been deleted: ${project.name} (${project.projectCode}) by ${req.user.name}`,
        'Info',
        'Project',
        'Project',
        project.id,
        'Medium'
      );
      console.log(`✅ Notification created for Secretariat (LGU-PMT)`);

      // Notify Executive users
      const executiveUsers = await User.findAll({
        where: { subRole: 'EXECUTIVE' }
      });

      if (executiveUsers.length > 0) {
        console.log(`👑 Creating deletion notifications for ${executiveUsers.length} Executive users...`);
        for (const executive of executiveUsers) {
          const executiveNotification = await createNotification(
            executive.id,
            'Project Deleted',
            `A project has been deleted: ${project.name} (${project.projectCode}) by ${req.user.name}`,
            'Info',
            'Project',
            'Project',
            project.id,
            'Medium'
          );
          console.log(`✅ Executive deletion notification created for ${executive.name}:`, executiveNotification ? 'Success' : 'Failed');
        }
      } else {
        console.log('ℹ️ No Executive users found for deletion notification');
      }

      console.log(`✅ All notifications created successfully for project deletion (IU route): ${project.name}`);
    } catch (notificationError) {
      console.error('❌ Error creating notifications for project deletion (IU route):', notificationError);
      console.error('Error details:', {
        message: notificationError.message,
        stack: notificationError.stack,
        projectId: project.id,
        projectName: project.name
      });
      // Don't fail the project deletion if notifications fail
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

// Debug EIU personnel endpoint
router.get('/debug-eiu/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Debug EIU endpoint called with project ID:', req.params.id);
    
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        implementingOfficeId: req.user.id
      },
      include: [
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'email', 'role', 'subRole']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get all EIU users
    const eiuUsers = await User.findAll({
      where: {
        role: 'EIU'
      },
      attributes: ['id', 'name', 'email', 'role', 'subRole']
    });

    res.json({
      success: true,
      debug: {
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        eiuPersonnelId: project.eiuPersonnelId,
        eiuPersonnelName: project.eiuPersonnelName,
        eiuPersonnel: project.eiuPersonnel,
        allEIUUsers: eiuUsers,
        hasExternalPartner: project.hasExternalPartner
      }
    });
  } catch (error) {
    console.error('Debug EIU endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug EIU endpoint failed',
      error: error.message
    });
  }
});

// Debug endpoint to check project data
router.get('/debug/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Debug endpoint called with project ID:', req.params.id);
    console.log('User ID:', req.user.id);
    
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

    // Get all project fields
    const projectData = project.toJSON();
    
    res.json({
      success: true,
      debug: {
        projectId: project.id,
        name: project.name,
        projectCode: project.projectCode,
        status: project.status,
        workflowStatus: project.workflowStatus,
        overallProgress: project.overallProgress,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress,
        totalBudget: project.totalBudget,
        amountSpent: project.amountSpent,
        startDate: project.startDate,
        endDate: project.endDate,
        createdDate: project.createdDate,
        implementingOfficeName: project.implementingOfficeName,
        location: project.location,
        description: project.description,
        expectedOutputs: project.expectedOutputs,
        targetBeneficiaries: project.targetBeneficiaries,
        eiuPersonnelName: project.eiuPersonnelName,
        fundingSource: project.fundingSource,
        approvedBySecretariat: project.approvedBySecretariat,
        submittedToSecretariat: project.submittedToSecretariat,
        secretariatApprovalDate: project.secretariatApprovalDate,
        allFields: Object.keys(projectData)
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: error.message
    });
  }
});

// Test endpoint to debug issues
router.get('/test/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Test endpoint called with project ID:', req.params.id);
    console.log('User ID:', req.user.id);
    
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

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        projectCode: project.projectCode,
        status: project.status,
        overallProgress: project.overallProgress,
        timelineProgress: project.timelineProgress,
        budgetProgress: project.budgetProgress,
        physicalProgress: project.physicalProgress,
        approvedBySecretariat: project.approvedBySecretariat,
        submittedToSecretariat: project.submittedToSecretariat
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
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
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get compilation reports
    const compilationReports = await ProjectUpdate.findAll({
      where: {
        projectId: project.id,
        updateType: 'compilation_report'
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`🔍 Found ${compilationReports.length} compilation reports for project ${project.id}`);
    compilationReports.forEach((report, index) => {
      console.log(`📋 Compilation Report ${index + 1}:`, {
        id: report.id,
        title: report.title,
        status: report.status,
        createdAt: report.createdAt,
        updateType: report.updateType
      });
    });

    // Get project milestones
    const milestones = await ProjectMilestone.findAll({
      where: { projectId: project.id },
      order: [['order', 'ASC']]
    });

    // Calculate total amount spent from project updates
    const allUpdates = await ProjectUpdate.findAll({
      where: { projectId: project.id },
      attributes: ['amountSpent']
    });
    
    const totalAmountSpent = allUpdates.reduce((sum, update) => {
      return sum + parseFloat(update.amountSpent || 0);
    }, 0);

    // Determine Secretariat approval status
    let secretariatStatus = 'pending';
    let secretariatStatusText = 'Pending Secretariat Approval';
    
    if (project.approvedBySecretariat === true) {
      secretariatStatus = 'approved';
      secretariatStatusText = 'Approved by Secretariat';
    } else if (project.submittedToSecretariat === true) {
      secretariatStatus = 'under_review';
      secretariatStatusText = 'Under Secretariat Review';
    }

    // Get latest compilation report
    const latestCompilation = compilationReports.length > 0 ? compilationReports[0] : null;

    // Calculate progress using ProgressCalculationService
    const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, 'iu');
    const overallProgress = progressData.progress?.overall || 0;
    const timelineProgress = progressData.progress?.internalTimeline || 0;
    const budgetProgress = progressData.progress?.internalBudget || 0;
    const physicalProgress = progressData.progress?.internalPhysical || 0;

    // Calculate budget utilization
    const totalBudget = parseFloat(project.totalBudget || 0);
    const amountSpent = totalAmountSpent;
    const budgetUtilization = totalBudget > 0 ? (amountSpent / totalBudget) * 100 : 0;
    const remainingBudget = totalBudget - amountSpent;

    // Get EIU partner name from association or fallback to direct field
    let eiuPartnerName = 'Not assigned';
    
    if (project.hasExternalPartner === true) {
      // Project should have an EIU partner
      if (project.eiuPersonnel?.name) {
        eiuPartnerName = project.eiuPersonnel.name;
      } else if (project.eiuPersonnelName) {
        eiuPartnerName = project.eiuPersonnelName;
      } else {
        eiuPartnerName = 'EIU Partner Pending Assignment';
      }
    } else {
      // Project doesn't have external partner
      eiuPartnerName = 'No External Partner Required';
    }

    res.json({
      success: true,
      summary: {
        projectId: project.id,
        name: project.name,
        projectCode: project.projectCode,
        status: project.status,
        workflowStatus: project.workflowStatus,
        
        // Progress data
        progress: {
          overall: overallProgress,
          timeline: timelineProgress,
          budget: budgetProgress,
          physical: physicalProgress,
          internalTimeline: progressData.progress?.internalTimeline || 0,
          internalBudget: progressData.progress?.internalBudget || 0,
          internalPhysical: progressData.progress?.internalPhysical || 0
        },
        milestones: milestones,
        
        // Project details
        startDate: project.startDate,
        endDate: project.endDate,
        totalBudget: totalBudget,
        amountSpent: amountSpent,
        implementingOffice: project.implementingOfficeName,
        location: project.location,
        description: project.description,
        expectedOutputs: project.expectedOutputs,
        targetBeneficiaries: project.targetBeneficiaries,
        eiuPartner: eiuPartnerName,
        fundingSource: project.fundingSource,
        createdDate: project.createdDate,
        
        // Secretariat approval data
        secretariat: {
          approvalStatus: secretariatStatus,
          approvalStatusText: secretariatStatusText,
          approvedBySecretariat: project.approvedBySecretariat,
          submittedToSecretariat: project.submittedToSecretariat,
          secretariatApprovalDate: project.secretariatApprovalDate,
          compilationReports: compilationReports.length,
          latestCompilation: latestCompilation ? {
            id: latestCompilation.id,
            submittedAt: latestCompilation.createdAt,
            status: latestCompilation.status,
            title: latestCompilation.title,
            description: latestCompilation.description
          } : null,
          validations: []
        },
        
        // Recent updates
        recentUpdates: project.updates,
        
        // Efficiency metrics
        efficiency: overallProgress > 0 ? (overallProgress / 100) : 0,
        timelineAdherence: timelineProgress > 0 ? (timelineProgress / 100) : 0,
        
        // Budget utilization
        budgetUtilization: budgetUtilization,
        remainingBudget: remainingBudget
      }
    });
    
    console.log('📊 Secretariat data being sent to frontend:', {
      approvalStatus: secretariatStatus,
      compilationReports: compilationReports.length,
      latestCompilation: latestCompilation ? latestCompilation.title : 'None'
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
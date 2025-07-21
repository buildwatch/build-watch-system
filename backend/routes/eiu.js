const express = require('express');
const { Project, ProjectUpdate, User, ActivityLog } = require('../models');
const { authenticateToken, requireEIU } = require('../middleware/auth');

const router = express.Router();

// Mock data for compliance and reminders (to be replaced with real data)
const mockComplianceData = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Solar Streetlight Installation',
    complianceType: 'Environmental Compliance',
    requirements: ['EIA Certificate', 'Waste Management Plan', 'Environmental Monitoring'],
    completedRequirements: ['EIA Certificate'],
    pendingRequirements: ['Waste Management Plan', 'Environmental Monitoring'],
    status: 'In Progress',
    dueDate: '2024-12-31',
    lastUpdated: '2024-01-15',
    remarks: 'EIA Certificate obtained, working on waste management plan'
  },
  {
    id: 2,
    projectId: 1,
    projectName: 'Solar Streetlight Installation',
    complianceType: 'Safety Compliance',
    requirements: ['Safety Protocols', 'Training Certificates', 'Safety Equipment'],
    completedRequirements: ['Safety Protocols', 'Training Certificates'],
    pendingRequirements: ['Safety Equipment'],
    status: 'In Progress',
    dueDate: '2024-11-30',
    lastUpdated: '2024-01-10',
    remarks: 'Safety protocols and training completed, equipment procurement in progress'
  }
];

const mockReminders = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Solar Streetlight Installation',
    title: 'Submit Monthly Progress Report',
    description: 'Submit detailed progress report for January 2024',
    dueDate: '2024-01-31',
    priority: 'High',
    status: 'Pending',
    type: 'Report'
  },
  {
    id: 2,
    projectId: 1,
    projectName: 'Solar Streetlight Installation',
    title: 'Site Inspection',
    description: 'Conduct monthly site inspection at Barangay 1',
    dueDate: '2024-01-25',
    priority: 'Medium',
    status: 'Pending',
    type: 'Inspection'
  }
];

// Get EIU dashboard statistics
router.get('/dashboard/stats', authenticateToken, requireEIU, async (req, res) => {
  try {
    // Get EIU projects (projects assigned to this specific EIU Personnel)
    const projects = await Project.findAll({
      where: { 
        eiuPersonnelId: req.user.id
      }
    });

    // Get recent updates
    const recentUpdates = await ProjectUpdate.findAll({
      where: { 
        submittedBy: req.user.id,
        submittedByRole: 'eiu'
      },
      include: [{
        model: Project,
        as: 'project',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Calculate statistics using ProgressCalculationService for accurate progress
    const ProgressCalculationService = require('../services/progressCalculationService');
    let totalProgress = 0;
    
    for (const project of projects) {
      try {
        const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, 'eiu');
        totalProgress += progressData.progress.overall;
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        // Fallback to simple calculation if ProgressCalculationService fails
        const progress = (parseFloat(project.timelineProgress || 0) + parseFloat(project.budgetProgress || 0) + parseFloat(project.physicalProgress || 0)) / 3;
        totalProgress += progress;
      }
    }

    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'ongoing').length,
      completedProjects: projects.filter(p => p.status === 'complete').length,
      pendingUpdates: projects.filter(p => p.status === 'ongoing').length,
      averageProgress: projects.length > 0 ? Math.round((totalProgress / projects.length) * 100) / 100 : 0,
      recentUpdates: recentUpdates.length
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Get EIU dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Get EIU projects
router.get('/projects', authenticateToken, requireEIU, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { 
      eiuPersonnelId: req.user.id // Only show projects assigned to this EIU Personnel
    };

    // Add filters
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.like]: `%${search}%` } },
        { description: { [require('sequelize').Op.like]: `%${search}%` } },
        { location: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
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
    const ProgressCalculationService = require('../services/progressCalculationService');
    const projectsWithProgress = await Promise.all(projects.map(async (project) => {
      try {
        const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, 'eiu');
        return {
          ...project.toJSON(),
          timelineProgress: progressData.progress.timeline,
          budgetProgress: progressData.progress.budget,
          physicalProgress: progressData.progress.physical,
          overallProgress: Math.round(progressData.progress.overall * 100) / 100
        };
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        // Fallback to simple calculation if ProgressCalculationService fails
        const timelineProgress = parseFloat(project.timelineProgress) || 0;
        const budgetProgress = parseFloat(project.budgetProgress) || 0;
        const physicalProgress = parseFloat(project.physicalProgress) || 0;
        const overallProgress = (timelineProgress + budgetProgress + physicalProgress) / 3;
        
        return {
          ...project.toJSON(),
          timelineProgress,
          budgetProgress,
          physicalProgress,
          overallProgress: Math.round(overallProgress * 100) / 100
        };
      }
    }));

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
    console.error('Get EIU projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

// Get compliance tracker data
router.get('/compliance', authenticateToken, requireEIU, async (req, res) => {
  try {
    const { projectId, status } = req.query;
    
    let filteredCompliance = [...mockComplianceData];
    
    if (projectId) {
      filteredCompliance = filteredCompliance.filter(c => c.projectId === parseInt(projectId));
    }
    
    if (status) {
      filteredCompliance = filteredCompliance.filter(c => c.status === status);
    }

    res.json({
      success: true,
      compliance: filteredCompliance
    });

  } catch (error) {
    console.error('Get compliance data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance data'
    });
  }
});

// Update compliance status
router.patch('/compliance/:id', authenticateToken, requireEIU, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedRequirements, remarks } = req.body;

    const compliance = mockComplianceData.find(c => c.id === parseInt(id));
    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance record not found'
      });
    }

    // Update compliance data
    compliance.status = status;
    if (completedRequirements) {
      compliance.completedRequirements = completedRequirements;
      compliance.pendingRequirements = compliance.requirements.filter(
        req => !completedRequirements.includes(req)
      );
    }
    compliance.lastUpdated = new Date().toISOString().split('T')[0];
    compliance.remarks = remarks;

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_COMPLIANCE',
      entityType: 'Compliance',
      entityId: parseInt(id),
      details: `Updated compliance status for ${compliance.complianceType}: ${status}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Compliance status updated successfully',
      compliance: compliance
    });

  } catch (error) {
    console.error('Update compliance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update compliance status'
    });
  }
});

// Get reminders and timeline
router.get('/reminders', authenticateToken, requireEIU, async (req, res) => {
  try {
    const { projectId, priority, status, type } = req.query;
    
    let filteredReminders = [...mockReminders];
    
    if (projectId) {
      filteredReminders = filteredReminders.filter(r => r.projectId === parseInt(projectId));
    }
    
    if (priority) {
      filteredReminders = filteredReminders.filter(r => r.priority === priority);
    }
    
    if (status) {
      filteredReminders = filteredReminders.filter(r => r.status === status);
    }
    
    if (type) {
      filteredReminders = filteredReminders.filter(r => r.type === type);
    }

    // Sort by due date
    filteredReminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({
      success: true,
      reminders: filteredReminders
    });

  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reminders'
    });
  }
});

// Create new reminder
router.post('/reminders', authenticateToken, requireEIU, async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      dueDate,
      priority,
      type
    } = req.body;

    if (!projectId || !title || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Project ID, title, and due date are required'
      });
    }

    const newReminder = {
      id: mockReminders.length + 1,
      projectId: parseInt(projectId),
      projectName: 'Sample Project', // TODO: Get from database
      title,
      description: description || '',
      dueDate,
      priority: priority || 'Medium',
      status: 'Pending',
      type: type || 'General'
    };

    mockReminders.push(newReminder);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE_REMINDER',
      entityType: 'Reminder',
      entityId: newReminder.id,
      details: `Created reminder: ${title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      reminder: newReminder
    });

  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reminder'
    });
  }
});

// Update reminder
router.patch('/reminders/:id', authenticateToken, requireEIU, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, priority, status, type } = req.body;

    const reminder = mockReminders.find(r => r.id === parseInt(id));
    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    // Update reminder
    if (title) reminder.title = title;
    if (description !== undefined) reminder.description = description;
    if (dueDate) reminder.dueDate = dueDate;
    if (priority) reminder.priority = priority;
    if (status) reminder.status = status;
    if (type) reminder.type = type;

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_REMINDER',
      entityType: 'Reminder',
      entityId: parseInt(id),
      details: `Updated reminder: ${reminder.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Reminder updated successfully',
      reminder: reminder
    });

  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reminder'
    });
  }
});

// Delete reminder
router.delete('/reminders/:id', authenticateToken, requireEIU, async (req, res) => {
  try {
    const { id } = req.params;

    const reminderIndex = mockReminders.findIndex(r => r.id === parseInt(id));
    if (reminderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    const deletedReminder = mockReminders.splice(reminderIndex, 1)[0];

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_REMINDER',
      entityType: 'Reminder',
      entityId: parseInt(id),
      details: `Deleted reminder: ${deletedReminder.title}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete reminder'
    });
  }
});

// Test endpoint to check JSON parsing
router.post('/test-json', (req, res) => {
  console.log('=== TEST JSON ENDPOINT ===');
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);
  console.log('Body:', req.body);
  console.log('Raw body:', JSON.stringify(req.body, null, 2));
  res.json({
    success: true,
    received: req.body,
    type: typeof req.body
  });
});

// Test endpoint with authentication
router.post('/test-auth', authenticateToken, requireEIU, (req, res) => {
  console.log('=== TEST AUTH ENDPOINT ===');
  console.log('User ID:', req.user.id);
  console.log('User name:', req.user.name);
  console.log('User role:', req.user.role);
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    }
  });
});

// Test endpoint without authentication
router.post('/test-json-no-auth', (req, res) => {
  console.log('=== TEST JSON NO AUTH ENDPOINT ===');
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);
  console.log('Body:', req.body);
  console.log('Raw body:', JSON.stringify(req.body, null, 2));
  res.json({
    success: true,
    received: req.body,
    type: typeof req.body
  });
});

// Submit milestone updates to implementing office for review
router.post('/submit-update', authenticateToken, requireEIU, async (req, res) => {
  try {
    console.log('=== SUBMIT-UPDATE ENDPOINT REACHED ===');
    console.log('User ID:', req.user.id);
    console.log('User name:', req.user.name);
    console.log('User role:', req.user.role);
    console.log('Auth header:', req.headers.authorization);
    console.log('Token extracted:', req.headers.authorization?.split(' ')[1]);
    
    const { projectId, updateType, milestoneUpdates } = req.body;
    
    console.log('Received data:');
    console.log('projectId:', projectId);
    console.log('updateType:', updateType);
    console.log('milestoneUpdates type:', typeof milestoneUpdates);
    console.log('milestoneUpdates:', milestoneUpdates);
    
    if (!projectId || !updateType || !milestoneUpdates) {
      return res.status(400).json({
        success: false,
        error: 'Project ID, update type, and milestone updates are required'
      });
    }

    // Verify the project is assigned to this EIU personnel
    const project = await Project.findOne({
      where: {
        id: projectId,
        eiuPersonnelId: req.user.id
      },
      include: [{
        model: User,
        as: 'implementingOffice',
        attributes: ['id', 'name', 'username', 'role']
      }]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or not assigned to you'
      });
    }

    console.log('Project found:', project.name);
    console.log('Implementing office:', project.implementingOffice.name);

    // Parse milestone updates (handle both string and object formats)
    let updates;
    if (typeof milestoneUpdates === 'string') {
      try {
        updates = JSON.parse(milestoneUpdates);
      } catch (parseError) {
        console.error('Failed to parse milestoneUpdates string:', milestoneUpdates);
        return res.status(400).json({
          success: false,
          error: 'Invalid milestone updates format'
        });
      }
    } else if (Array.isArray(milestoneUpdates)) {
      updates = milestoneUpdates;
    } else {
      console.error('Invalid milestoneUpdates type:', typeof milestoneUpdates, milestoneUpdates);
      return res.status(400).json({
        success: false,
        error: 'Milestone updates must be an array'
      });
    }
    
    console.log('Parsed updates:', updates);
    
          // Create project update record
      const projectUpdate = await ProjectUpdate.create({
        projectId: projectId,
        updateType: updateType,
        submittedBy: req.user.id, // Use real user ID
        submittedByRole: 'eiu',
        submittedTo: project.implementingOffice.id,
        status: 'submitted',
        milestoneUpdates: updates, // Store as JSON object
        claimedProgress: 0,
        currentProgress: 0,
        updateFrequency: 'weekly',
        title: 'Milestone Update',
        description: `Milestone updates submitted by EIU personnel: ${req.user.name}`,
        remarks: `Milestone updates submitted by EIU personnel: ${req.user.name}`,
        submittedAt: new Date()
      });

    console.log('Project update created:', projectUpdate.id);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'SUBMIT_MILESTONE_UPDATE',
      entityType: 'ProjectUpdate',
      entityId: projectUpdate.id,
      details: `Submitted milestone updates for project: ${project.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.log('Activity logged successfully');

    res.status(201).json({
      success: true,
      message: 'Milestone updates submitted successfully to implementing office for review',
      updateId: projectUpdate.id,
      submittedTo: project.implementingOffice.name
    });

  } catch (error) {
    console.error('Submit milestone update error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to submit milestone updates',
      details: error.message
    });
  }
});

module.exports = router; 
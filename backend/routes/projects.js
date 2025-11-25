const express = require('express');
const { Project, ProjectUpdate, ProjectMilestone, User, ActivityLog, ProjectValidation, Policy, PolicyCompliance, MilestoneSubmission } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op, Sequelize } = require('sequelize');
const ProgressCalculationService = require('../services/progressCalculationService');
const { createNotification, createNotificationForRole } = require('./notifications');

const router = express.Router();

// Check if project code already exists
router.get('/check-code/:projectCode', authenticateToken, async (req, res) => {
  try {
    const { projectCode } = req.params;
    
    const existingProject = await Project.findOne({
      where: { projectCode: projectCode }
    });
    
    res.json({
      success: true,
      exists: !!existingProject,
      projectCode: projectCode
    });

  } catch (error) {
    console.error('Error checking project code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check project code',
      exists: false
    });
  }
});

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
    console.log('🔍 Logging activity:', {
      userId,
      action,
      entityType,
      entityId,
      details,
      module
    });
    
    const activityLog = await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      details,
      module,
      level: 'Info',
      status: 'Success'
    });
    
    console.log('✅ Activity logged successfully:', {
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId
    });
  } catch (error) {
    console.error('❌ Activity logging error:', error);
  }
};

// Helper function to calculate project progress using ProgressCalculationService
const calculateProjectProgress = async (project, userRole = 'any') => {
  try {
    const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, userRole);
    
    // Debug log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ProgressCalculationService returned:', {
        hasProgress: !!progressData.progress,
        progressKeys: progressData.progress ? Object.keys(progressData.progress) : 'No progress',
        internalTimeline: progressData.progress?.internalTimeline,
        internalBudget: progressData.progress?.internalBudget,
        internalPhysical: progressData.progress?.internalPhysical,
        timeline: progressData.progress?.timeline,
        budget: progressData.progress?.budget,
        physical: progressData.progress?.physical
      });
    }
    
    return {
      // Use internal division progress (percentage within each division) instead of contribution to overall
      timeline: Math.round((progressData.progress?.internalTimeline || 0) * 100) / 100,
      budget: Math.round((progressData.progress?.internalBudget || 0) * 100) / 100,
      physical: Math.round((progressData.progress?.internalPhysical || 0) * 100) / 100,
      overall: Math.round((progressData.progress?.overall || 0) * 100) / 100
    };
  } catch (error) {
    console.error('Error calculating project progress:', error);
    // Fallback to simple calculation if ProgressCalculationService fails
    const timelineProgress = parseFloat(project.timelineProgress) || 0;
    const budgetProgress = parseFloat(project.budgetProgress) || 0;
    const physicalProgress = parseFloat(project.physicalProgress) || 0;
    const overallProgress = (timelineProgress + budgetProgress + physicalProgress) / 3;
    
    return {
      timelineProgress: Math.round(timelineProgress * 100) / 100,
      budgetProgress: Math.round(budgetProgress * 100) / 100,
      physicalProgress: Math.round(physicalProgress * 100) / 100,
      overallProgress: Math.round(overallProgress * 100) / 100
    };
  }
};

// Helper function to check project policy compliance
const checkProjectPolicyCompliance = async (project) => {
  try {
    console.log(`🔍 Checking policy compliance for project: ${project.name} (${project.projectCode})`);
    
    // Get all active policies that match the project category
    const relevantPolicies = await Policy.findAll({
      where: {
        status: 'published',
        [Op.or]: [
          { category: project.category },
          { category: 'general' }
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username']
        }
      ]
    });

    console.log(`📋 Found ${relevantPolicies.length} relevant policies for category: ${project.category}`);

    // Create compliance records for each relevant policy
    const complianceRecords = [];
    for (const policy of relevantPolicies) {
      console.log(`📄 Checking compliance with policy: ${policy.title}`);
      
      // Calculate initial compliance score based on project data
      let complianceScore = 0;
      let findings = [];
      let recommendations = [];

      // Check if project has required documentation
      if (policy.metadata?.requiredDocumentation && project.requiredDocumentation) {
        complianceScore += 20;
        findings.push('Required documentation specified');
      } else if (policy.metadata?.requiredDocumentation) {
        findings.push('Missing required documentation specification');
        recommendations.push('Specify required documentation types');
      }

      // Check if project has proper budget breakdown
      if (project.budgetBreakdown && project.budgetBreakdown.length > 10) {
        complianceScore += 20;
        findings.push('Budget breakdown provided');
      } else {
        findings.push('Insufficient budget breakdown');
        recommendations.push('Provide detailed budget breakdown');
      }

      // Check if project has timeline milestones
      if (project.timelineMilestones && project.timelineMilestones.length > 10) {
        complianceScore += 20;
        findings.push('Timeline milestones defined');
      } else {
        findings.push('Missing timeline milestones');
        recommendations.push('Define project timeline milestones');
      }

      // Check if project has physical progress requirements
      if (project.physicalProgressRequirements && project.physicalProgressRequirements.length > 10) {
        complianceScore += 20;
        findings.push('Physical progress requirements specified');
      } else {
        findings.push('Missing physical progress requirements');
        recommendations.push('Specify physical progress requirements');
      }

      // Check if project has proper contact information
      if (project.contactNumber || project.projectManager) {
        complianceScore += 20;
        findings.push('Contact information provided');
      } else {
        findings.push('Missing contact information');
        recommendations.push('Provide project manager and contact details');
      }

      // Determine compliance status
      let complianceStatus = 'pending_review';
      if (complianceScore >= 80) {
        complianceStatus = 'compliant';
      } else if (complianceScore >= 60) {
        complianceStatus = 'partially_compliant';
      } else {
        complianceStatus = 'non_compliant';
      }

      // Create compliance record
      const complianceRecord = {
        policyId: policy.id,
        projectId: project.id,
        complianceStatus,
        complianceScore,
        findings: findings.join('; '),
        recommendations: recommendations.join('; '),
        reviewDate: new Date(),
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };

      complianceRecords.push(complianceRecord);
      
      console.log(`📊 Policy "${policy.title}" compliance: ${complianceStatus} (${complianceScore}%)`);
    }

    // Bulk create compliance records
    if (complianceRecords.length > 0) {
      await PolicyCompliance.bulkCreate(complianceRecords);
      console.log(`✅ Created ${complianceRecords.length} policy compliance records`);
      
      // Create notifications for MPMEC about policy compliance
      const mpmecUsers = await User.findAll({
        where: {
          role: 'LGU-PMT',
          subRole: { [Op.like]: '%MPMEC%' },
          status: 'active'
        }
      });

      for (const mpmecUser of mpmecUsers) {
        const nonCompliantPolicies = complianceRecords.filter(record => 
          record.complianceStatus === 'non_compliant' || record.complianceStatus === 'partially_compliant'
        );

        if (nonCompliantPolicies.length > 0) {
          await createNotification(
            mpmecUser.id,
            'Policy Compliance Alert',
            `Project "${project.name}" has ${nonCompliantPolicies.length} policy compliance issues that require review.`,
            'Warning',
            'Policy',
            'Project',
            project.id,
            'High'
          );
        }
      }
    }

    return complianceRecords;
  } catch (error) {
    console.error('Error checking project policy compliance:', error);
    throw error;
  }
};

// ===== COMPILED REPORTS ROUTES (MUST BE BEFORE :projectId ROUTES) =====

// Get all compiled reports (reports that have been exported/saved)
router.get('/compiled-reports', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    console.log('Fetching compiled reports...');
    
    const compiledReports = await ProjectValidation.findAll({
      where: {
        status: 'approved',
        reportType: 'milestone_report'
      },
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'eiuPersonnel',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['validatedAt', 'DESC']]
    });

    console.log(`Found ${compiledReports.length} compiled reports`);

    // Transform the data for frontend compatibility
    const transformedReports = await Promise.all(compiledReports.map(async (report) => {
      const reportContent = report.validationChecklist || {};
      
      // Calculate actual project progress
      let calculatedProgress = 0;
      if (report.project) {
        try {
          const progressData = await calculateProjectProgress(report.project);
          calculatedProgress = progressData.overallProgress;
          console.log(`🔢 Progress calculation for project ${report.projectId}:`, {
            calculated: calculatedProgress,
            stored: report.project.overallProgress,
            timeline: report.project.timelineProgress,
            budget: report.project.budgetProgress,
            physical: report.project.physicalProgress
          });
        } catch (error) {
          console.error('Error calculating progress for project:', report.projectId, error);
          // Fallback to stored progress
          calculatedProgress = report.project.overallProgress || report.project.timelineProgress || 0;
        }
      }
      
      return {
        id: report.id,
        projectId: report.projectId,
        projectCode: reportContent.projectInfo?.projectCode || report.project?.projectCode,
        name: reportContent.projectInfo?.name || report.project?.name,
        implementingOfficeName: reportContent.projectInfo?.implementingOffice || report.project?.implementingOffice?.name,
        eiuPersonnelName: reportContent.projectInfo?.eiuPersonnel || report.project?.eiuPersonnel?.name,
        totalBudget: reportContent.projectInfo?.totalBudget || report.project?.totalBudget,
        startDate: reportContent.projectInfo?.startDate || report.project?.startDate,
        endDate: reportContent.projectInfo?.endDate || report.project?.endDate,
        overallProgress: calculatedProgress,
        workflowStatus: reportContent.workflow?.workflowStatus || report.project?.workflowStatus,
        secretariatApprovalDate: reportContent.workflow?.secretariatApprovalDate || report.project?.secretariatApprovalDate,
        secretariatApprovedBy: reportContent.workflow?.secretariatApprovedBy || report.project?.secretariatApprovedBy,
        compiledAt: report.validatedAt,
        compiledBy: report.validatedBy,
        validator: report.validator?.name,
        reportContent: reportContent
      };
    }));

    res.json({
      success: true,
      compiledReports: transformedReports
    });

  } catch (error) {
    console.error('Error fetching compiled reports:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // Return empty array instead of 500 error when no reports found
    res.json({
      success: true,
      compiledReports: []
    });
  }
});

// Get specific compiled report details
router.get('/compiled-reports/:reportId', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await ProjectValidation.findByPk(reportId, {
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'eiuPersonnel',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Compiled report not found'
      });
    }

    const reportContent = report.validationChecklist || {};
    console.log('🔍 Debug: validationChecklist:', JSON.stringify(reportContent, null, 2));
    console.log('🔍 Debug: Full report object:', JSON.stringify(report.toJSON(), null, 2));
    
    res.json({
      success: true,
      report: {
        ...report.toJSON(),
        reportContent: reportContent
      }
    });

  } catch (error) {
    console.error('Error fetching compiled report details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compiled report details'
    });
  }
});

// Download compiled report as Word document
router.get('/compiled-reports/:reportId/download', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await ProjectValidation.findByPk(reportId, {
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'eiuPersonnel',
              attributes: ['id', 'name', 'email']
            },
            {
              model: ProjectUpdate,
              where: {
                status: { [Op.in]: ['iu_approved', 'secretariat_approved'] }
              },
              required: false,
              include: [
                {
                  model: User,
                  as: 'submitter',
                  attributes: ['id', 'name', 'email']
                }
              ],
              order: [['createdAt', 'DESC']]
            },
            {
              model: ProjectMilestone,
              as: 'milestones',
              attributes: ['id', 'title', 'description', 'dueDate', 'status', 'progress', 'weight']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Compiled report not found'
      });
    }

    // Parse the report content
    const reportContent = report.validationChecklist || {};
    const project = report.project;

    // Generate Word document content
    const docx = require('docx');
    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "OFFICIAL MILESTONE REPORT",
                bold: true,
                size: 32,
                font: "Arial"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "MPMEC Secretariat - Compiled Report",
                size: 24,
                font: "Arial"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          
          // Project Information Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "PROJECT INFORMATION", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Code" })] }),
                  new TableCell({ children: [new Paragraph({ text: project.projectCode || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Name" })] }),
                  new TableCell({ children: [new Paragraph({ text: project.name })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Implementing Office" })] }),
                  new TableCell({ children: [new Paragraph({ text: project.implementingOffice?.name || 'Not assigned' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "EIU Personnel" })] }),
                  new TableCell({ children: [new Paragraph({ text: project.eiuPersonnel?.name || 'Not assigned' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Period" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${new Date(project.startDate).toLocaleDateString()} to ${new Date(project.endDate).toLocaleDateString()}` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Total Budget" })] }),
                  new TableCell({ children: [new Paragraph({ text: `₱${parseFloat(project.totalBudget || 0).toLocaleString()}` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Overall Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${project.overallProgress || 0}%` })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Project Description
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "PROJECT DESCRIPTION", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: project.description || 'No description available' })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Current Progress
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "CURRENT PROGRESS", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Timeline Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${project.timelineProgress || 0}%` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Budget Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${project.budgetProgress || 0}%` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Physical Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${project.physicalProgress || 0}%` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Overall Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${project.overallProgress || 0}%` })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Compiled Report Summary from Implementing Office
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "COMPILED REPORT SUMMARY FROM IMPLEMENTING OFFICE", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: reportContent.latestUpdate?.description || 'No update available' })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Milestone Updates & 3-Division Information
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "MILESTONE UPDATES & 3-DIVISION INFORMATION", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Milestone Updates" })] }),
                  new TableCell({ children: [new Paragraph({ text: reportContent.latestUpdate?.milestoneUpdates || 'No milestone updates available' })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Secretariat Verdict
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "SECRETARIAT VERDICT", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Status" })] }),
                  new TableCell({ children: [new Paragraph({ text: "APPROVED" })] })
                ]
              })
            ]
          })
        ]
      }]
    });

    // Generate the document buffer
    const buffer = await docx.Packer.toBuffer(doc);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Compiled_Report_${project.projectCode}_${new Date().toISOString().split('T')[0]}.docx"`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Error generating Word document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Word document'
    });
  }
});

// ===== PROJECT CRUD OPERATIONS =====

// Create new project (IU Implementing Office only)
router.post('/', authenticateToken, requireRole(['iu', 'LGU-IU']), async (req, res) => {
  try {
    console.log('🚀 Project creation request received:', {
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      requestBody: req.body
    });
    
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Request method:', req.method);
    console.log('🔍 Request URL:', req.url);
    
    // Additional debugging for the request body
    console.log('🔍 Full request body analysis:', {
      bodyKeys: Object.keys(req.body),
      bodyValues: req.body,
      milestonesType: typeof req.body.milestones,
      milestonesIsArray: Array.isArray(req.body.milestones),
      milestonesLength: req.body.milestones ? req.body.milestones.length : 'undefined'
    });
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
      targetCompletionDate,
      expectedDaysOfCompletion,
      targetDateOfCompletion, // Keep for backward compatibility
      endDate, // Keep for backward compatibility
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
      initialPhoto, // Initial project photo
      milestones // New field for milestone data
    } = req.body;

    // Truncate fields that might exceed database column limits
    // targetBeneficiaries is VARCHAR(255) in database, truncate to 255 characters
    const truncatedTargetBeneficiaries = targetBeneficiaries 
      ? (targetBeneficiaries.length > 255 ? targetBeneficiaries.substring(0, 252) + '...' : targetBeneficiaries)
      : null;
    
    if (targetBeneficiaries && targetBeneficiaries.length > 255) {
      console.warn('⚠️ targetBeneficiaries truncated from', targetBeneficiaries.length, 'to 255 characters');
    }

    // Validate required fields
    const targetDate = targetCompletionDate || targetDateOfCompletion || endDate; // Use new field if available, fallback to old fields
    
    // Debug logging for required fields
    console.log('🔍 Required fields validation:', {
      projectCode: !!projectCode,
      name: !!name,
      implementingOfficeName: !!implementingOfficeName,
      description: !!description,
      category: !!category,
      location: !!location,
      priority: !!priority,
      fundingSource: !!fundingSource,
      createdDate: !!createdDate,
      startDate: !!startDate,
      targetDate: !!targetDate,
      totalBudget: !!totalBudget,
      values: {
        projectCode,
        name,
        implementingOfficeName,
        description,
        category,
        location,
        priority,
        fundingSource,
        createdDate,
        startDate,
        targetDate,
        totalBudget
      }
    });
    
    if (!projectCode || !name || !implementingOfficeName || !description || !category || !location || !priority || 
        !fundingSource || !createdDate || !startDate || !targetDate || !totalBudget) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate milestones if provided
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      console.log('🔍 Milestone validation:', {
        milestonesCount: milestones.length,
        milestones: milestones.map((m, i) => ({
          index: i,
          title: m.title,
          weight: m.weight,
          plannedBudget: m.plannedBudget,
          hasTitle: !!(m.title || m.name),
          hasWeight: !!m.weight,
          hasPlannedBudget: !!m.plannedBudget
        }))
      });
      
      // Validate total weight equals 100%
      const totalWeight = milestones.reduce((sum, milestone) => sum + parseFloat(milestone.weight || 0), 0);
      console.log('🔍 Total weight calculation:', { totalWeight, expected: 100 });
      
      if (Math.abs(totalWeight - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          error: `Total milestone weight must equal 100%. Current total: ${totalWeight}%`
        });
      }

      // Validate each milestone has required fields
      for (const [index, milestone] of milestones.entries()) {
        console.log(`🔍 Validating milestone ${index + 1}:`, {
          title: milestone.title,
          name: milestone.name,
          weight: milestone.weight,
          plannedBudget: milestone.plannedBudget,
          hasTitle: !!(milestone.title || milestone.name),
          hasWeight: !!milestone.weight,
          hasPlannedBudget: !!milestone.plannedBudget
        });
        
        if ((!milestone.title && !milestone.name) || !milestone.weight || !milestone.plannedBudget) {
          return res.status(400).json({
            success: false,
            error: `Milestone ${index + 1} is missing required fields (title, weight, or plannedBudget)`
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
      console.log('🔍 EIU validation - Looking for user with ID:', eiuPersonnelId);
      
      const eiuUser = await User.findOne({
        where: {
          id: eiuPersonnelId,  // Changed from userId to id since frontend sends UUID
          role: 'EIU',
          status: 'active'
        }
      });

      console.log('🔍 EIU validation - Found user:', eiuUser ? {
        id: eiuUser.id,
        userId: eiuUser.userId,
        fullName: eiuUser.fullName,
        role: eiuUser.role,
        status: eiuUser.status
      } : 'No user found');

      if (!eiuUser) {
        console.log('❌ EIU validation - User not found or not active');
        return res.status(400).json({
          success: false,
          error: 'Invalid EIU Personnel ID. Please verify the account exists and is active.'
        });
      }

      // Use the database id for the foreign key
      validatedEiuPersonnelId = eiuUser.id;
      console.log('✅ EIU validation - User validated, using ID:', validatedEiuPersonnelId);
    }

    // Calculate expected days for debugging
    const calculatedExpectedDays = (() => {
      if (startDate && targetDate) {
        const start = new Date(startDate);
        const target = new Date(targetDate);
        const diffTime = target.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
      }
      return null;
    })();
    
    console.log('🔍 Expected Days Calculation:', {
      startDate,
      targetDate,
      expectedDaysOfCompletion,
      calculatedExpectedDays,
      finalValue: expectedDaysOfCompletion || calculatedExpectedDays
    });

    // Create project with automatic forwarding to all relevant users
    console.log('🔍 About to create project with data:', {
      projectCode,
      name,
      implementingOfficeName,
      implementingOfficeId: req.user.id,
      hasExternalPartner: hasExternalPartner || false,
      eiuPersonnelId: hasExternalPartner && validatedEiuPersonnelId ? validatedEiuPersonnelId : null,
      startDate,
      endDate: targetDate,
      targetCompletionDate: targetCompletionDate || targetDateOfCompletion || endDate,
      totalBudget,
      status: 'pending',
      workflowStatus: 'submitted'
    });
    
    let project;
    try {
      project = await Project.create({
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
      targetBeneficiaries: truncatedTargetBeneficiaries,
      hasExternalPartner: hasExternalPartner || false,
      eiuPersonnelId: hasExternalPartner && validatedEiuPersonnelId ? validatedEiuPersonnelId : null,
      startDate,
      endDate: targetDate, // Use the target date (either new or old field)
      targetCompletionDate: targetCompletionDate || targetDateOfCompletion || endDate,
      targetDateOfCompletion: targetDateOfCompletion || endDate, // Keep for backward compatibility
      expectedDaysOfCompletion: expectedDaysOfCompletion || (() => {
        // Calculate expected days if not provided
        if (startDate && targetDate) {
          const start = new Date(startDate);
          const target = new Date(targetDate);
          const diffTime = target.getTime() - start.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 ? diffDays : null;
        }
        return null;
      })(),
      completionDate: null,
      timelineUpdateFrequency: timelineUpdateFrequency || 'monthly', // Default to monthly if not provided
      timelineMilestones,
      timelineProgress: 0,
      totalBudget,
      budgetUpdateFrequency: budgetUpdateFrequency || 'monthly', // Default to monthly if not provided
      budgetBreakdown,
      budgetProgress: 0,
      physicalUpdateFrequency: physicalUpdateFrequency || 'monthly', // Default to monthly if not provided
      requiredDocumentation,
      physicalProgressRequirements,
      physicalProgress: 0,
      overallProgress: 0,
      automatedProgress: 0, // New automated progress field
      projectManager,
      contactNumber,
      specialRequirements,
      initialPhoto: initialPhoto || '/projects-page-header-bg.png', // Use uploaded photo or default
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
      console.log('✅ Project created successfully:', {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name
      });
    } catch (createError) {
      console.error('❌ Error during Project.create():', createError);
      console.error('❌ Create error message:', createError.message);
      console.error('❌ Create error stack:', createError.stack);
      console.error('❌ Create error name:', createError.name);
      console.error('❌ Create error code:', createError.code);
      
      // Check for specific database errors
      if (createError.message && createError.message.includes('Unknown column')) {
        console.error('🚨 DATABASE COLUMN ERROR: A column in the CREATE statement does not exist in the database');
        console.error('   Error:', createError.message);
        throw new Error(`Database schema error: ${createError.message}`);
      }
      
      // Check for data too long errors
      if (createError.message && createError.message.includes('Data too long for column')) {
        const columnMatch = createError.message.match(/column '(\w+)'/);
        const columnName = columnMatch ? columnMatch[1] : 'unknown';
        console.error(`🚨 DATA TOO LONG ERROR: The '${columnName}' field exceeds the database column size limit`);
        console.error('   Error:', createError.message);
        console.error('   Solution: The field needs to be truncated or the database column needs to be enlarged');
        throw new Error(`Data too long for field '${columnName}'. Please reduce the length or contact support to update the database schema.`);
      }
      
      if (createError.name === 'SequelizeDatabaseError') {
        console.error('🚨 DATABASE ERROR: There is an issue with the database query');
        throw createError;
      }
      
      throw createError;
    }

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
        order: index + 1,
        priority: milestone.priority || 'medium',
        
        // 3-Division configuration
        timelineWeight: milestone.timelineDivision?.weight || 33.33,
        timelineStartDate: milestone.timelineDivision?.startDate || null,
        timelineEndDate: milestone.timelineDivision?.endDate || null,
        timelineDescription: milestone.timelineDivision?.description || '',
        timelineStatus: 'pending',
        
        budgetWeight: milestone.budgetDivision?.weight || 33.33,
        budgetPlanned: milestone.budgetDivision?.plannedBudget || 0,
        budgetBreakdown: milestone.budgetBreakdown || milestone.budgetDivision?.breakdown || '',
        budgetStatus: 'pending',
        
        physicalWeight: milestone.physicalDivision?.weight || 33.33,
        physicalProofType: milestone.physicalDivision?.proofType || 'form',
        physicalDescription: milestone.physicalDivision?.description || '',
        physicalStatus: 'pending'
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

    // Auto-generate news article for project creation (only if approved)
    // Note: Article will be generated when project is approved, not on creation

    // Create notifications for relevant users
    try {
      console.log('Starting notification creation for project:', project.name);
      
      // Notify LGU-PMT Secretariat about new project submission
      console.log('Creating notification for LGU-PMT role...');
      const secretariatNotifications = await createNotificationForRole('LGU-PMT', 
        'New Project Submitted for Review', 
        `A new project has been submitted: ${project.name} (${project.projectCode}) by ${req.user.name}`, 
        'Warning', 
        'Project', 
        'Project', 
        project.id, 
        'High'
      );
      console.log(`Created ${secretariatNotifications.length} Secretariat notifications`);

      // If EIU partner is assigned, notify them
      if (project.hasExternalPartner && project.eiuPersonnelId) {
        console.log('Creating notification for EIU partner:', project.eiuPersonnelId);
        const eiuNotification = await createNotification(
          project.eiuPersonnelId,
          'New Project Assigned to EIU',
          `You have been assigned as external partner for project: ${project.name} (${project.projectCode})`,
          'Info',
          'Project',
          'Project',
          project.id,
          'Medium'
        );
        console.log('EIU notification created:', eiuNotification ? 'Success' : 'Failed');
      } else {
        console.log('No EIU partner assigned, skipping EIU notification');
      }

      // Notify the Implementing Office-Officer who created the project
      console.log('🔔 Creating notification for Implementing Office user:', req.user.id);
      const ioNotification = await createNotification(
        req.user.id,
        'Project Created Successfully',
        `Your project "${project.name}" (${project.projectCode}) has been created and submitted to Secretariat for review.`,
        'Success',
        'Project',
        'Project',
        project.id,
        'Medium'
      );
      console.log('✅ Implementing Office notification created:', ioNotification ? 'Success' : 'Failed');
      if (ioNotification) {
        console.log('📋 Notification details:', {
          id: ioNotification.id,
          title: ioNotification.title,
          status: ioNotification.status,
          isRead: ioNotification.isRead
        });
      }

      // Notify Executive users
      const executiveUsers = await User.findAll({
        where: { subRole: 'EXECUTIVE' }
      });

      if (executiveUsers.length > 0) {
        console.log(`👑 Creating notifications for ${executiveUsers.length} Executive users...`);
        for (const executive of executiveUsers) {
          const executiveNotification = await createNotification(
            executive.id,
            'New Project Created',
            `A new project has been created: ${project.name} (${project.projectCode})`,
            'Info',
            'Project',
            'Project',
            project.id,
            'Medium'
          );
          console.log(`✅ Executive notification created for ${executive.name}:`, executiveNotification ? 'Success' : 'Failed');
        }
      } else {
        console.log('ℹ️ No Executive users found');
      }

          console.log(`✅ All notifications created successfully for project: ${project.name}`);
  } catch (notificationError) {
    console.error('❌ Error creating notifications for new project:', notificationError);
    console.error('Error details:', {
      message: notificationError.message,
      stack: notificationError.stack,
      projectId: project.id,
      projectName: project.name
    });
    // Don't fail the project creation if notifications fail
  }

    // Check policy compliance for the new project (wrapped in try-catch to prevent failures)
  try {
    console.log('🔍 Checking policy compliance for new project...');
    // Check if Policy model exists and is available
    if (Policy && typeof Policy.findAll === 'function') {
      await checkProjectPolicyCompliance(project);
      console.log('✅ Policy compliance check completed');
    } else {
      console.log('⚠️ Policy model not available, skipping compliance check');
    }
  } catch (complianceError) {
    console.error('❌ Error checking policy compliance:', complianceError);
    console.error('❌ Compliance error details:', {
      message: complianceError.message,
      stack: complianceError.stack,
      name: complianceError.name
    });
    // Don't fail the project creation if compliance check fails
  }

    // Calculate progress for the response (with error handling)
    let progressData = {
      timelineProgress: 0,
      budgetProgress: 0,
      physicalProgress: 0,
      overallProgress: 0
    };
    
    try {
      progressData = await calculateProjectProgress(project, req.user.role);
    } catch (progressError) {
      console.error('⚠️ Error calculating progress for new project (non-fatal):', progressError);
      // Use default progress values if calculation fails
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: {
        ...project.toJSON(),
        progress: progressData
      }
    });

  } catch (error) {
    console.error('❌ Create project error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error code:', error.code);
    console.error('❌ Request body keys:', Object.keys(req.body || {}));
    console.error('❌ User info:', {
      id: req.user?.id,
      role: req.user?.role,
      name: req.user?.name
    });
    
    // Check if it's a database column error
    if (error.message && error.message.includes('Unknown column')) {
      console.error('❌ DATABASE COLUMN ERROR DETECTED:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Database schema error',
        details: error.message,
        message: 'A database column does not exist. Please check the database schema.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      details: error.message,
      debug: {
        errorName: error.name,
        errorCode: error.code
      }
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
      // Only show approved projects to the public (approved by MPMEC or Secretariat)
      [Op.or]: [
        { approvedBySecretariat: true },
        { approvedByMPMEC: true }
      ],
      status: { [Op.ne]: 'pending' } // Exclude pending projects
    };

    console.log('🔍 Fetching public projects with filters:', { page, limit, status, category, priority, search, barangay });

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

    // Don't query User table for public endpoints - use project fields directly
    // Get all fields first, then filter in response
    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['budgetBreakdown'] }, // Exclude sensitive data only
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${count} public projects, returning ${projects.length} on page ${page}`);

    // Check and update project completion status based on milestones
    const ProjectCompletionService = require('../services/projectCompletionService');
    await Promise.all(projects.map(async (project) => {
      await ProjectCompletionService.checkAndUpdateProjectCompletion(project.id, project);
    }));

    // Reload projects to get updated statuses
    const updatedProjects = await Promise.all(
      projects.map(p => Project.findByPk(p.id))
    );

    // Calculate progress for each project - use stored values or calculate if available
    // For public endpoints, prefer stored progress values for performance
    const projectsWithProgress = await Promise.all(updatedProjects.map(async (project) => {
      const projectData = project.toJSON();
      
      // Use stored progress values as primary source (faster and more reliable for public)
      const storedProgress = {
        timeline: parseFloat(projectData.timelineProgress) || 0,
        budget: parseFloat(projectData.budgetProgress) || 0,
        physical: parseFloat(projectData.physicalProgress) || 0,
        overall: parseFloat(projectData.overallProgress) || 0
      };
      
      // Try to enhance with calculated progress if available, but don't fail if it errors
      let calculatedProgress = null;
      try {
        calculatedProgress = await calculateProjectProgress(project, 'public');
      } catch (calcError) {
        // Silently use stored values if calculation fails
        console.warn(`Progress calculation skipped for project ${project.id}:`, calcError.message);
      }
      
      // Use calculated progress if available and valid, otherwise use stored
      // Map calculated progress format to match stored format
      const finalProgress = calculatedProgress && (calculatedProgress.overall || calculatedProgress.overallProgress) 
        ? {
            timeline: calculatedProgress.timeline || calculatedProgress.timelineProgress || storedProgress.timeline,
            budget: calculatedProgress.budget || calculatedProgress.budgetProgress || storedProgress.budget,
            physical: calculatedProgress.physical || calculatedProgress.physicalProgress || storedProgress.physical,
            overall: calculatedProgress.overall || calculatedProgress.overallProgress || storedProgress.overall
          }
        : storedProgress;
      
      return {
        ...projectData,
        progress: finalProgress
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
        status: projectData.status === 'complete' ? 'completed' : projectData.status, // Normalize status
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        completionDate: projectData.completionDate,
        totalBudget: projectData.totalBudget, // Show budget but not breakdown
        overallProgress: projectData.progress?.overall || projectData.progress?.overallProgress || projectData.overallProgress || 0,
        timelineProgress: projectData.progress?.timeline || projectData.progress?.timelineProgress || 0,
        budgetProgress: projectData.progress?.budget || projectData.progress?.budgetProgress || 0,
        physicalProgress: projectData.progress?.physical || projectData.progress?.physicalProgress || 0,
        implementingOfficeName: projectData.implementingOfficeName || 'N/A',
        eiuPersonnelName: projectData.eiuPersonnelName || null,
        hasExternalPartner: projectData.hasExternalPartner,
        initialPhoto: projectData.initialPhoto,
        latitude: projectData.latitude,
        longitude: projectData.longitude,
        approvedByMPMEC: projectData.approvedByMPMEC || false, // Include approval status
        approvedBySecretariat: projectData.approvedBySecretariat || false, // Include approval status
        createdAt: projectData.createdAt,
        updatedAt: projectData.updatedAt
        // Note: budgetBreakdown is excluded for public display
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
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Get public statistics (no authentication required)
router.get('/public/statistics', async (req, res) => {
  try {
    // Only get approved projects for public statistics
    const whereClause = {
      approvedBySecretariat: true,
      status: { [Op.ne]: 'pending' }
    };

    const projects = await Project.findAll({
      where: whereClause,
      attributes: [
        'id', 'category', 'status', 'location', 'totalBudget', 
        'startDate', 'endDate', 'completionDate'
      ]
    });

    // Calculate aggregated statistics
    const totalProjects = projects.length;
    
    // Projects by category
    const byCategory = {};
    projects.forEach(project => {
      const category = project.category || 'Uncategorized';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    // Projects by status
    const byStatus = {};
    projects.forEach(project => {
      const status = project.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // Calculate overall completion rate
    let totalProgress = 0;
    let projectsWithProgress = 0;
    
    for (const project of projects) {
      try {
        const progress = await calculateProjectProgress(project, 'public');
        totalProgress += progress.overall || 0;
        projectsWithProgress++;
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
      }
    }
    
    const overallCompletionRate = projectsWithProgress > 0 
      ? Math.round((totalProgress / projectsWithProgress) * 100) / 100 
      : 0;

    // Total budget (sum only, no breakdowns)
    const totalBudget = projects.reduce((sum, project) => {
      return sum + (parseFloat(project.totalBudget) || 0);
    }, 0);

    // Projects by location (barangay counts)
    const byLocation = {};
    projects.forEach(project => {
      if (project.location) {
        const location = project.location;
        byLocation[location] = (byLocation[location] || 0) + 1;
      }
    });

    // Status counts
    const statusCounts = {
      ongoing: projects.filter(p => p.status === 'ongoing' || p.status === 'in-progress').length,
      completed: projects.filter(p => p.status === 'completed' || p.status === 'complete').length,
      delayed: projects.filter(p => p.status === 'delayed').length,
      onHold: projects.filter(p => p.status === 'on-hold' || p.status === 'on hold').length
    };

    const statistics = {
      totalProjects,
      byCategory,
      byStatus,
      byLocation,
      statusCounts,
      overallCompletionRate,
      totalBudget: Math.round(totalBudget * 100) / 100,
      lastUpdated: new Date().toISOString()
    };

    // Add cache headers (allow caching for 1 hour for public data)
    res.set({
      'Cache-Control': 'public, max-age=3600',
      'Last-Modified': new Date().toUTCString()
    });

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Get public statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get data insights and trends for public users
router.get('/public/insights', async (req, res) => {
  try {
    const whereClause = {
      approvedBySecretariat: true,
      status: { [Op.ne]: 'pending' }
    };

    const projects = await Project.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'category', 'status', 'totalBudget', 
        'startDate', 'endDate', 'completionDate', 'createdAt',
        'timelineProgress', 'budgetProgress', 'physicalProgress', 'overallProgress'
      ],
      order: [['startDate', 'ASC']]
    });

    // Calculate trends over time (by month)
    const trendsByMonth = {};
    const completionTrends = {};
    const budgetTrends = {};
    
    // Process projects with async progress calculation
    await Promise.all(projects.map(async (project) => {
      if (project.startDate) {
        const startDate = new Date(project.startDate);
        const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!trendsByMonth[monthKey]) {
          trendsByMonth[monthKey] = {
            projectsStarted: 0,
            projectsCompleted: 0,
            totalBudget: 0,
            averageProgress: 0,
            progressSum: 0,
            progressCount: 0
          };
        }
        
        trendsByMonth[monthKey].projectsStarted++;
        trendsByMonth[monthKey].totalBudget += parseFloat(project.totalBudget) || 0;
        
        // Calculate progress
        let progress = 0;
        if (project.overallProgress !== null && project.overallProgress !== undefined) {
          progress = parseFloat(project.overallProgress) || 0;
        } else {
          try {
            const calculated = await calculateProjectProgress(project, 'public');
            progress = calculated.overall || calculated.progress?.overall || 0;
          } catch (e) {
            progress = 0;
          }
        }
        
        trendsByMonth[monthKey].progressSum += progress;
        trendsByMonth[monthKey].progressCount++;
        
        // Check if completed
        if (project.completionDate) {
          const completionDate = new Date(project.completionDate);
          const completionMonthKey = `${completionDate.getFullYear()}-${String(completionDate.getMonth() + 1).padStart(2, '0')}`;
          
          if (!completionTrends[completionMonthKey]) {
            completionTrends[completionMonthKey] = 0;
          }
          completionTrends[completionMonthKey]++;
        }
      }
    }));

    // Calculate average progress per month
    Object.keys(trendsByMonth).forEach(month => {
      if (trendsByMonth[month].progressCount > 0) {
        trendsByMonth[month].averageProgress = Math.round((trendsByMonth[month].progressSum / trendsByMonth[month].progressCount) * 100) / 100;
      }
    });

    // Calculate performance metrics
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'complete').length;
    const ongoingProjects = projects.filter(p => p.status === 'ongoing' || p.status === 'in-progress').length;
    
    // Calculate average project duration
    let totalDuration = 0;
    let durationCount = 0;
    projects.forEach(project => {
      if (project.startDate && project.completionDate) {
        const start = new Date(project.startDate);
        const end = new Date(project.completionDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        totalDuration += days;
        durationCount++;
      }
    });
    const averageDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    // Calculate efficiency metrics
    let totalProgress = 0;
    let totalBudget = 0;
    let budgetUtilized = 0;
    let progressCount = 0;
    
    await Promise.all(projects.map(async (project) => {
      const budget = parseFloat(project.totalBudget) || 0;
      totalBudget += budget;
      
      let progress = 0;
      if (project.overallProgress !== null && project.overallProgress !== undefined) {
        progress = parseFloat(project.overallProgress) || 0;
      } else {
        try {
          const calculated = await calculateProjectProgress(project, 'public');
          progress = calculated.overall || calculated.progress?.overall || 0;
        } catch (e) {
          progress = 0;
        }
      }
      
      if (progress > 0) {
        totalProgress += progress;
        progressCount++;
        // Estimate budget utilized based on progress
        budgetUtilized += (budget * progress / 100);
      }
    }));
    
    const averageProgress = progressCount > 0 ? Math.round((totalProgress / progressCount) * 100) / 100 : 0;
    const budgetUtilizationRate = totalBudget > 0 ? Math.round((budgetUtilized / totalBudget) * 100 * 100) / 100 : 0;

    const insights = {
      trendsByMonth: Object.keys(trendsByMonth).sort().map(month => ({
        month,
        ...trendsByMonth[month]
      })),
      completionTrends: Object.keys(completionTrends).sort().map(month => ({
        month,
        completed: completionTrends[month]
      })),
      performanceMetrics: {
        totalProjects,
        completedProjects,
        ongoingProjects,
        completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100 * 100) / 100 : 0,
        averageDuration,
        averageProgress
      },
      efficiencyMetrics: {
        totalBudget: Math.round(totalBudget * 100) / 100,
        budgetUtilized: Math.round(budgetUtilized * 100) / 100,
        budgetUtilizationRate,
        averageProgress
      },
      lastUpdated: new Date().toISOString()
    };

    res.set({
      'Cache-Control': 'public, max-age=3600',
      'Last-Modified': new Date().toUTCString()
    });

    res.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Get public insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights'
    });
  }
});

// Get budget and financial transparency data
router.get('/public/budget', async (req, res) => {
  try {
    const whereClause = {
      approvedBySecretariat: true,
      status: { [Op.ne]: 'pending' }
    };

    const projects = await Project.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'category', 'status', 'totalBudget', 
        'fundingSource', 'startDate', 'endDate',
        'timelineProgress', 'budgetProgress', 'physicalProgress', 'overallProgress'
      ]
    });

    // Budget breakdown by category
    const budgetByCategory = {};
    const budgetUtilizedByCategory = {};
    
    await Promise.all(projects.map(async (project) => {
      const category = project.category || 'Uncategorized';
      const budget = parseFloat(project.totalBudget) || 0;
      
      if (!budgetByCategory[category]) {
        budgetByCategory[category] = 0;
        budgetUtilizedByCategory[category] = 0;
      }
      
      budgetByCategory[category] += budget;
      
      // Calculate utilized budget based on progress
      let progress = 0;
      if (project.budgetProgress !== null && project.budgetProgress !== undefined) {
        progress = parseFloat(project.budgetProgress) || 0;
      } else if (project.overallProgress !== null && project.overallProgress !== undefined) {
        progress = parseFloat(project.overallProgress) || 0;
      } else {
        try {
          const calculated = await calculateProjectProgress(project, 'public');
          progress = calculated.budget || calculated.progress?.budget || calculated.overall || calculated.progress?.overall || 0;
        } catch (e) {
          progress = 0;
        }
      }
      
      budgetUtilizedByCategory[category] += (budget * progress / 100);
    }));

    // Budget by funding source
    const budgetByFundingSource = {};
    const budgetUtilizedByFundingSource = {};
    
    await Promise.all(projects.map(async (project) => {
      const source = project.fundingSource || 'Unknown';
      const budget = parseFloat(project.totalBudget) || 0;
      
      if (!budgetByFundingSource[source]) {
        budgetByFundingSource[source] = 0;
        budgetUtilizedByFundingSource[source] = 0;
      }
      
      budgetByFundingSource[source] += budget;
      
      let progress = 0;
      if (project.budgetProgress !== null && project.budgetProgress !== undefined) {
        progress = parseFloat(project.budgetProgress) || 0;
      } else if (project.overallProgress !== null && project.overallProgress !== undefined) {
        progress = parseFloat(project.overallProgress) || 0;
      } else {
        try {
          const calculated = await calculateProjectProgress(project, 'public');
          progress = calculated.budget || calculated.progress?.budget || calculated.overall || calculated.progress?.overall || 0;
        } catch (e) {
          progress = 0;
        }
      }
      
      budgetUtilizedByFundingSource[source] += (budget * progress / 100);
    }));

    // Calculate total budget and utilized
    const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(p.totalBudget) || 0), 0);
    
    let totalUtilized = 0;
    await Promise.all(projects.map(async (project) => {
      const budget = parseFloat(project.totalBudget) || 0;
      let progress = 0;
      if (project.budgetProgress !== null && project.budgetProgress !== undefined) {
        progress = parseFloat(project.budgetProgress) || 0;
      } else if (project.overallProgress !== null && project.overallProgress !== undefined) {
        progress = parseFloat(project.overallProgress) || 0;
      } else {
        try {
          const calculated = await calculateProjectProgress(project, 'public');
          progress = calculated.budget || calculated.progress?.budget || calculated.overall || calculated.progress?.overall || 0;
        } catch (e) {
          progress = 0;
        }
      }
      totalUtilized += (budget * progress / 100);
    }));

    // Budget efficiency by category
    const budgetEfficiency = {};
    Object.keys(budgetByCategory).forEach(category => {
      const allocated = budgetByCategory[category];
      const utilized = budgetUtilizedByCategory[category];
      const efficiency = allocated > 0 ? Math.round((utilized / allocated) * 100 * 100) / 100 : 0;
      budgetEfficiency[category] = {
        allocated: Math.round(allocated * 100) / 100,
        utilized: Math.round(utilized * 100) / 100,
        efficiency,
        remaining: Math.round((allocated - utilized) * 100) / 100
      };
    });

    const budgetData = {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalUtilized: Math.round(totalUtilized * 100) / 100,
      totalRemaining: Math.round((totalBudget - totalUtilized) * 100) / 100,
      utilizationRate: totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100 * 100) / 100 : 0,
      budgetByCategory: Object.keys(budgetByCategory).reduce((acc, cat) => {
        acc[cat] = Math.round(budgetByCategory[cat] * 100) / 100;
        return acc;
      }, {}),
      budgetByFundingSource: Object.keys(budgetByFundingSource).reduce((acc, source) => {
        acc[source] = Math.round(budgetByFundingSource[source] * 100) / 100;
        return acc;
      }, {}),
      budgetEfficiency,
      lastUpdated: new Date().toISOString()
    };

    res.set({
      'Cache-Control': 'public, max-age=3600',
      'Last-Modified': new Date().toUTCString()
    });

    res.json({
      success: true,
      budget: budgetData
    });

  } catch (error) {
    console.error('Get public budget error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budget data'
    });
  }
});

// Get single public project (no authentication required)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'email', 'role', 'subRole']
        },
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
        error: 'Project not found'
      });
    }

    // Only show approved projects to the public
    if (!project.approvedBySecretariat && !project.submittedToSecretariat) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check and update project completion status based on milestones
    const ProjectCompletionService = require('../services/projectCompletionService');
    await ProjectCompletionService.checkAndUpdateProjectCompletion(project.id, project);
    
    // Reload project to get updated status
    await project.reload();

    // Calculate progress for the project using ProgressCalculationService
    const ProgressCalculationService = require('../services/progressCalculationService');
    const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, 'public');

    // Format project for public display (hide sensitive information)
    const publicProject = {
      id: project.id,
      projectCode: project.projectCode,
      name: project.name,
      implementingOfficeName: project.implementingOfficeName,
      description: project.description,
      category: project.category,
      location: project.location,
      priority: project.priority,
      fundingSource: project.fundingSource,
      createdDate: project.createdDate,
      status: project.status === 'complete' ? 'completed' : project.status, // Normalize status
      expectedOutputs: project.expectedOutputs,
      targetBeneficiaries: project.targetBeneficiaries,
      hasExternalPartner: project.hasExternalPartner,
      startDate: project.startDate,
      endDate: project.endDate,
      completionDate: project.completionDate,
      timelineUpdateFrequency: project.timelineUpdateFrequency,
      timelineMilestones: project.timelineMilestones,
      timelineProgress: progressData.progress?.internalTimeline || progressData.progress?.timeline || 0,
      totalBudget: project.totalBudget,
      budgetUpdateFrequency: project.budgetUpdateFrequency,
      budgetBreakdown: project.budgetBreakdown,
      budgetProgress: progressData.progress?.internalBudget || progressData.progress?.budget || 0,
      physicalUpdateFrequency: project.physicalUpdateFrequency,
      requiredDocumentation: project.requiredDocumentation,
      physicalProgressRequirements: project.physicalProgressRequirements,
      initialPhoto: project.initialPhoto,
      physicalProgress: progressData.progress?.internalPhysical || progressData.progress?.physical || 0,
      overallProgress: progressData.progress?.overall || 0,
      projectManager: project.projectManager,
      contactNumber: project.contactNumber,
      specialRequirements: project.specialRequirements,
      approvedBySecretariat: project.approvedBySecretariat,
      approvedByMPMEC: project.approvedByMPMEC,
      approvalDate: project.approvalDate,
      workflowStatus: project.workflowStatus,
      submittedToSecretariat: project.submittedToSecretariat,
      submittedToSecretariatDate: project.submittedToSecretariatDate,
      secretariatApprovalDate: project.secretariatApprovalDate,
      automatedProgress: project.automatedProgress,
      lastProgressUpdate: project.lastProgressUpdate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      implementingOffice: project.implementingOffice ? {
        id: project.implementingOffice.id,
        name: project.implementingOffice.name,
        role: project.implementingOffice.role
      } : null,
      eiuPersonnel: project.eiuPersonnel ? {
        id: project.eiuPersonnel.id,
        name: project.eiuPersonnel.name,
        role: project.eiuPersonnel.role
      } : null
    };

    res.json({
      success: true,
      project: publicProject
    });

  } catch (error) {
    console.error('Get public project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

// Get projects for messaging (role-based access control)
router.get('/messaging', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = {};

    // Role-based filtering for messaging
    const userRole = (req.user.role || '').toUpperCase();
    const userSubRole = (req.user.subRole || '').toLowerCase();

    // System Admin should see NO projects
    if (userRole === 'SYS.AD' || userRole === 'SYS_AD' || userRole === 'SYSAD') {
      return res.json({
        success: true,
        projects: []
      });
    }

    // Build role-based where clause
    switch (userRole) {
      case 'EIU':
        // EIU sees only projects assigned to them as external partner
        whereClause.hasExternalPartner = true;
        whereClause.eiuPersonnelId = req.user.id;
        break;

      case 'LGU-IU':
      case 'IU':
        // LGU-IU sees only projects they created/manage
        whereClause.implementingOfficeId = req.user.id;
        break;

      case 'LGU-PMT':
        // MPMEC: Check subRole for Secretariat
        if (userSubRole.includes('secretariat')) {
          // Secretariat subrole: sees all submitted/approved/ongoing/completed projects
          whereClause[Op.or] = [
            { workflowStatus: 'submitted' },
            { workflowStatus: 'secretariat_approved' },
            { workflowStatus: 'ongoing' },
            { workflowStatus: 'completed' },
            { workflowStatus: 'compiled_for_secretariat' },
            { workflowStatus: 'validated_by_secretariat' }
          ];
        } else {
          // Regular MPMEC: sees approved projects and projects submitted to Secretariat
          whereClause[Op.or] = [
            { approvedBySecretariat: true },
            { submittedToSecretariat: true }
          ];
        }
        break;

      case 'SECRETARIAT':
        // Secretariat (if separate role): sees all projects (submitted, approved, ongoing, completed)
        whereClause[Op.or] = [
          { workflowStatus: 'submitted' },
          { workflowStatus: 'secretariat_approved' },
          { workflowStatus: 'ongoing' },
          { workflowStatus: 'completed' },
          { workflowStatus: 'compiled_for_secretariat' },
          { workflowStatus: 'validated_by_secretariat' }
        ];
        break;

      case 'EMS':
        // Executive Admin: sees all projects (viewing role)
        // No where clause restrictions - sees everything
        break;

      default:
        // Default: no projects for unknown roles
        console.log(`⚠️ Unknown role for messaging projects: ${userRole}`);
        return res.json({
          success: true,
          projects: []
        });
    }

    // Add search filter if provided
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { projectCode: { [Op.like]: `%${search}%` } },
          { location: { [Op.like]: `%${search}%` } }
        ]
      };
      
      if (whereClause[Op.or]) {
        // If we already have an Op.or for workflowStatus, combine with search using Op.and
        const existingOr = whereClause[Op.or];
        whereClause[Op.and] = [
          { [Op.or]: existingOr },
          searchCondition
        ];
        delete whereClause[Op.or];
      } else if (whereClause[Op.and]) {
        // If we already have Op.and, add search to it
        whereClause[Op.and].push(searchCondition);
      } else {
        // No existing Op.or, just add search
        Object.assign(whereClause, searchCondition);
      }
    }

    // Fetch projects
    const projects = await Project.findAll({
      where: whereClause,
      attributes: ['id', 'projectCode', 'name', 'status', 'category', 'location', 'implementingOfficeId', 'eiuPersonnelId'],
      order: [['createdDate', 'DESC']],
      limit: 1000
    });

    res.json({
      success: true,
      projects: projects.map(p => p.toJSON())
    });

  } catch (error) {
    console.error('Error fetching projects for messaging:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects for messaging'
    });
  }
});

// Get shared projects between current user and a recipient (for messaging)
router.get('/messaging/shared/:recipientId', authenticateToken, async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { search } = req.query;
    const currentUserId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Recipient ID is required'
      });
    }

    // Get recipient user
    const { User } = require('../models');
    const recipient = await User.findByPk(recipientId, {
      attributes: ['id', 'role', 'subRole']
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Get current user's accessible projects
    const currentUserRole = (req.user.role || '').toUpperCase();
    const currentUserSubRole = (req.user.subRole || '').toLowerCase();
    const currentUserWhere = {};

    switch (currentUserRole) {
      case 'EIU':
        currentUserWhere.hasExternalPartner = true;
        currentUserWhere.eiuPersonnelId = currentUserId;
        break;
      case 'LGU-IU':
      case 'IU':
        currentUserWhere.implementingOfficeId = currentUserId;
        break;
      case 'LGU-PMT':
        if (currentUserSubRole.includes('secretariat')) {
          currentUserWhere[Op.or] = [
            { workflowStatus: 'submitted' },
            { workflowStatus: 'secretariat_approved' },
            { workflowStatus: 'ongoing' },
            { workflowStatus: 'completed' },
            { workflowStatus: 'compiled_for_secretariat' },
            { workflowStatus: 'validated_by_secretariat' }
          ];
        } else {
          currentUserWhere[Op.or] = [
            { approvedBySecretariat: true },
            { submittedToSecretariat: true }
          ];
        }
        break;
      case 'SECRETARIAT':
        currentUserWhere[Op.or] = [
          { workflowStatus: 'submitted' },
          { workflowStatus: 'secretariat_approved' },
          { workflowStatus: 'ongoing' },
          { workflowStatus: 'completed' },
          { workflowStatus: 'compiled_for_secretariat' },
          { workflowStatus: 'validated_by_secretariat' }
        ];
        break;
      case 'EMS':
        // Executive Admin sees all
        break;
      default:
        return res.json({ success: true, projects: [] });
    }

    // Get recipient's accessible projects
    const recipientRole = (recipient.role || '').toUpperCase();
    const recipientSubRole = (recipient.subRole || '').toLowerCase();
    const recipientWhere = {};

    switch (recipientRole) {
      case 'EIU':
        recipientWhere.hasExternalPartner = true;
        recipientWhere.eiuPersonnelId = recipientId;
        break;
      case 'LGU-IU':
      case 'IU':
        recipientWhere.implementingOfficeId = recipientId;
        break;
      case 'LGU-PMT':
        if (recipientSubRole.includes('secretariat')) {
          recipientWhere[Op.or] = [
            { workflowStatus: 'submitted' },
            { workflowStatus: 'secretariat_approved' },
            { workflowStatus: 'ongoing' },
            { workflowStatus: 'completed' },
            { workflowStatus: 'compiled_for_secretariat' },
            { workflowStatus: 'validated_by_secretariat' }
          ];
        } else {
          recipientWhere[Op.or] = [
            { approvedBySecretariat: true },
            { submittedToSecretariat: true }
          ];
        }
        break;
      case 'SECRETARIAT':
        recipientWhere[Op.or] = [
          { workflowStatus: 'submitted' },
          { workflowStatus: 'secretariat_approved' },
          { workflowStatus: 'ongoing' },
          { workflowStatus: 'completed' },
          { workflowStatus: 'compiled_for_secretariat' },
          { workflowStatus: 'validated_by_secretariat' }
        ];
        break;
      case 'EMS':
        // Executive Admin sees all
        break;
      default:
        return res.json({ success: true, projects: [] });
    }

    // Find intersection: projects that both users can access
    const currentUserProjects = await Project.findAll({
      where: currentUserWhere,
      attributes: ['id']
    });
    const currentUserProjectIds = currentUserProjects.map(p => p.id);

    const recipientProjects = await Project.findAll({
      where: recipientWhere,
      attributes: ['id']
    });
    const recipientProjectIds = recipientProjects.map(p => p.id);

    // Find shared project IDs
    const sharedProjectIds = currentUserProjectIds.filter(id => 
      recipientProjectIds.includes(id)
    );

    if (sharedProjectIds.length === 0) {
      return res.json({ success: true, projects: [] });
    }

    // Build final where clause for shared projects
    const finalWhere = {
      id: { [Op.in]: sharedProjectIds }
    };

    // Add search filter if provided
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { projectCode: { [Op.like]: `%${search}%` } },
          { location: { [Op.like]: `%${search}%` } }
        ]
      };
      finalWhere[Op.and] = [
        { id: { [Op.in]: sharedProjectIds } },
        searchCondition
      ];
      delete finalWhere.id;
    }

    // Fetch shared projects
    const projects = await Project.findAll({
      where: finalWhere,
      attributes: ['id', 'projectCode', 'name', 'status', 'category', 'location', 'implementingOfficeId', 'eiuPersonnelId'],
      order: [['createdDate', 'DESC']],
      limit: 1000
    });

    res.json({
      success: true,
      projects: projects.map(p => p.toJSON())
    });

  } catch (error) {
    console.error('Error fetching shared projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shared projects'
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
    const roleBasedFilters = {}; // Separate role-based filters to merge later

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
        roleBasedFilters.hasExternalPartner = true;
        roleBasedFilters.eiuPersonnelId = req.user.id;
        break;
      case 'iu':
      case 'LGU-IU':
        // IU sees their own projects - check both implementingOfficeId and implementingOfficeName
        // This handles cases where implementingOfficeId might not be set or doesn't match
        const userImplementingOffice = req.user.implementingOfficeName || req.user.office || req.user.department || req.user.officeName;
        console.log('🔍 LGU-IU filtering:', {
          userId: req.user.id,
          userRole: req.user.role,
          implementingOfficeId: req.user.id,
          implementingOfficeName: userImplementingOffice,
          userFields: {
            implementingOfficeName: req.user.implementingOfficeName,
            office: req.user.office,
            department: req.user.department,
            officeName: req.user.officeName
          }
        });
        
        // Build the OR condition for LGU-IU
        const lguIuConditions = [{ implementingOfficeId: req.user.id }];
        if (userImplementingOffice) {
          lguIuConditions.push({ implementingOfficeName: userImplementingOffice });
        }
        
        // If there's already an Op.or in whereClause (from search), we need to combine them
        if (whereClause[Op.or] && Array.isArray(whereClause[Op.or])) {
          // Combine search Op.or with LGU-IU conditions using Op.and
          const existingOr = whereClause[Op.or];
          delete whereClause[Op.or];
          whereClause[Op.and] = [
            { [Op.or]: existingOr },
            { [Op.or]: lguIuConditions }
          ];
        } else {
          // No existing Op.or, just add our conditions
          whereClause[Op.or] = lguIuConditions;
        }
        break;
      case 'secretariat':
        // Secretariat sees projects submitted for approval and approved projects
        if (!workflowStatus) {
          whereClause[Op.or] = [
            { workflowStatus: 'submitted' },
            { workflowStatus: 'secretariat_approved' },
            { workflowStatus: 'ongoing' },
            { workflowStatus: 'completed' },
            { workflowStatus: 'compiled_for_secretariat' },
            { workflowStatus: 'validated_by_secretariat' }
          ];
        }
        break;
      case 'LGU-PMT':
        // LGU-PMT with Secretariat subrole sees projects submitted for approval
        console.log('🔍 LGU-PMT filtering:', {
          userId: req.user.id,
          userRole: req.user.role,
          subRole: req.user.subRole,
          hasSecretariatSubrole: req.user.subRole && req.user.subRole.toLowerCase().includes('secretariat')
        });
        if (req.user.subRole && req.user.subRole.toLowerCase().includes('secretariat')) {
          if (!workflowStatus) {
            whereClause[Op.or] = [
              { workflowStatus: 'submitted' },
              { workflowStatus: 'secretariat_approved' },
              { workflowStatus: 'ongoing' },
              { workflowStatus: 'completed' },
              { workflowStatus: 'compiled_for_secretariat' },
              { workflowStatus: 'validated_by_secretariat' }
            ];
            console.log('🔍 LGU-PMT Secretariat: Using workflowStatus filter');
          }
        } else {
          // Regular MPMEC sees approved projects and projects submitted to Secretariat
          if (!workflowStatus) {
            whereClause[Op.or] = [
              { approvedBySecretariat: true },
              { submittedToSecretariat: true }
            ];
            console.log('🔍 LGU-PMT Regular: Using approval filter');
          }
        }
        break;
      case 'mpmec':
        // MPMEC sees approved projects and projects submitted to Secretariat
        if (!workflowStatus) {
          whereClause[Op.or] = [
            { approvedBySecretariat: true },
            { submittedToSecretariat: true }
          ];
        }
        break;
      default:
        // Other roles see all projects
        break;
    }

    console.log('🔍 Final whereClause for projects query:', JSON.stringify(whereClause, null, 2));
    console.log('🔍 Query parameters:', {
      page,
      limit,
      offset,
      userRole: req.user.role,
      userId: req.user.id
    });

    let count, projects;
    try {
      const result = await Project.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'projectCode', 'name', 'description', 'category', 'location', 'priority', 
        'fundingSource', 'createdDate', 'status', 'expectedOutputs', 'targetBeneficiaries', 
        'hasExternalPartner', 'startDate', 'endDate', 'targetCompletionDate', 'targetDateOfCompletion', 
        'expectedDaysOfCompletion', 'completionDate', 'timelineUpdateFrequency', 
        'timelineMilestones', 'timelineProgress', 'totalBudget', 'budgetUpdateFrequency', 
        'budgetBreakdown', 'budgetProgress', 'physicalUpdateFrequency', 'requiredDocumentation', 
        'physicalProgressRequirements', 'physicalProgress', 'overallProgress', 'projectManager', 
        'contactNumber', 'specialRequirements', 'implementingOfficeId', 'implementingOfficeName', 
        'eiuPersonnelId', 'approvedBySecretariat', 'approvedByMPMEC', 
        'approvalDate', 'approvedBy', 'workflowStatus', 'submittedToSecretariat', 
        'submittedToSecretariatDate', 'secretariatApprovalDate', 'secretariatApprovedBy', 
        'automatedProgress', 'lastProgressUpdate', 'initialPhoto', 'latitude', 'longitude', 
        'createdAt', 'updatedAt'
      ],
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
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'status', 'weight', 'timelineStatus', 'budgetStatus', 'physicalStatus', 'completedDate', 'validationDate'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
      });
      count = result.count;
      projects = result.rows;
      console.log(`✅ Found ${count} projects for ${req.user.role} (user ${req.user.id})`);
    } catch (queryError) {
      console.error('❌ Database query error:', queryError);
      console.error('❌ Query error message:', queryError.message);
      console.error('❌ Query error stack:', queryError.stack);
      throw queryError;
    }

    // Check and update project completion status based on milestones
    const ProjectCompletionService = require('../services/projectCompletionService');
    await Promise.all(projects.map(async (project) => {
      await ProjectCompletionService.checkAndUpdateProjectCompletion(project.id, project);
    }));

    // Reload projects to get updated statuses
    const updatedProjects = await Promise.all(
      projects.map(p => Project.findByPk(p.id, {
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
          },
          {
            model: ProjectMilestone,
            as: 'milestones',
            attributes: ['id', 'title', 'status', 'weight', 'timelineStatus', 'budgetStatus', 'physicalStatus', 'completedDate', 'validationDate'],
            required: false
          }
        ]
      }))
    );

    // Calculate progress for each project and attach milestones with submissions
    const projectsWithProgress = await Promise.all(updatedProjects.map(async (project) => {
      try {
        const projectData = project.toJSON();
        
        // Ensure milestones are included with submissions
        if (!projectData.milestones || projectData.milestones.length === 0) {
          // Fetch milestones if not included
          const milestones = await ProjectMilestone.findAll({
            where: { projectId: project.id },
            attributes: ['id', 'title', 'status', 'weight', 'timelineStatus', 'budgetStatus', 'physicalStatus', 'completedDate', 'validationDate'],
            required: false
          });
          
          // Fetch submissions separately and attach to milestones
          if (milestones.length > 0) {
            const milestoneIds = milestones.map(m => m.id);
            const submissions = await MilestoneSubmission.findAll({
              where: { milestoneId: milestoneIds },
              attributes: ['id', 'milestoneId', 'status', 'submissionDate'],
              required: false
            });
            
            // Attach submissions to their milestones
            milestones.forEach(milestone => {
              milestone.submissions = submissions.filter(s => s.milestoneId === milestone.id);
            });
          }
          projectData.milestones = milestones;
        }
        
        // Calculate progress with error handling
        let progress;
        try {
          progress = await calculateProjectProgress(project, req.user.role);
        } catch (progressError) {
          console.error(`❌ Error calculating progress for project ${project.id} (${project.projectCode}):`, progressError);
          // Use fallback progress values
          progress = {
            timelineProgress: parseFloat(project.timelineProgress) || 0,
            budgetProgress: parseFloat(project.budgetProgress) || 0,
            physicalProgress: parseFloat(project.physicalProgress) || 0,
            overallProgress: parseFloat(project.overallProgress) || 0
          };
        }
        
        return {
          ...projectData,
          implementingOfficeName: project.implementingOfficeName || project.implementingOffice?.name,
          eiuPersonnelName: project.eiuPersonnel?.name,
          status: projectData.status === 'complete' ? 'completed' : projectData.status, // Normalize status
          progress: progress
        };
      } catch (projectError) {
        console.error(`❌ Error processing project ${project.id} (${project.projectCode || 'unknown'}):`, projectError);
        console.error('Project error stack:', projectError.stack);
        // Return project with minimal data if processing fails
        const projectJson = project.toJSON();
        return {
          ...projectJson,
          implementingOfficeName: project.implementingOfficeName || project.implementingOffice?.name,
          eiuPersonnelName: project.eiuPersonnel?.name,
          status: projectJson.status === 'complete' ? 'completed' : projectJson.status, // Normalize status
          progress: {
            timelineProgress: parseFloat(project.timelineProgress) || 0,
            budgetProgress: parseFloat(project.budgetProgress) || 0,
            physicalProgress: parseFloat(project.physicalProgress) || 0,
            overallProgress: parseFloat(project.overallProgress) || 0
          },
          _error: 'Error processing project data'
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
    console.error('❌ Get projects error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ User role:', req.user?.role);
    console.error('❌ User ID:', req.user?.id);
    if (typeof whereClause !== 'undefined') {
      console.error('❌ Where clause:', JSON.stringify(whereClause, null, 2));
    } else {
      console.error('❌ Where clause: Not defined (error occurred before query construction)');
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error.message,
      debug: {
        userRole: req.user?.role,
        userId: req.user?.id,
        whereClause: typeof whereClause !== 'undefined' ? whereClause : 'Not defined'
      }
    });
  }
});

// ===== SECRETARIAT SUBMISSIONS ENDPOINT =====

// Get submissions for Secretariat approval
router.get('/secretariat/submissions', authenticateToken, async (req, res) => {
  try {
    // Check if user has Secretariat role
    const hasValidRole = req.user.role === 'secretariat' || req.user.role === 'LGU-PMT';
    
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    const hasValidSubrole = req.user.role === 'LGU-PMT' ? 
      (req.user.subRole && req.user.subRole.toLowerCase().includes('secretariat')) : true;
    
    if (!hasValidRole || !hasValidSubrole) {
      console.log('Role check failed:', { 
        userRole: req.user.role, 
        userSubRole: req.user.subRole, 
        hasValidRole,
        hasValidSubrole
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.',
        debug: {
          userRole: req.user.role,
          userSubRole: req.user.subRole,
          hasValidRole,
          hasValidSubrole
        }
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      search,
      workflowStatus
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      // Secretariat sees projects submitted for approval
      [Op.or]: [
        { workflowStatus: 'submitted' },
        { workflowStatus: 'secretariat_approved' },
        { workflowStatus: 'ongoing' },
        { workflowStatus: 'completed' },
        { workflowStatus: 'compiled_for_secretariat' },
        { workflowStatus: 'validated_by_secretariat' }
      ]
    };

    // Add filters
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    if (workflowStatus) whereClause.workflowStatus = workflowStatus;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { projectCode: { [Op.like]: `%${search}%` } }
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
        },
        {
          model: User,
          as: 'approvedByUser',
          attributes: ['id', 'name', 'username', 'role']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['submittedToSecretariatDate', 'DESC'], ['createdAt', 'DESC']]
    });

    // Calculate progress for each project using ProgressCalculationService
    const projectsWithProgress = await Promise.all(projects.map(async (project) => {
      try {
        const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, req.user.role);
        return {
          ...project.toJSON(),
          progress: {
            // Use internal division progress (percentage within each division) instead of contribution to overall
            timelineProgress: Math.round(progressData.progress.internalTimeline * 100) / 100,
            budgetProgress: Math.round(progressData.progress.internalBudget * 100) / 100,
            physicalProgress: Math.round(progressData.progress.internalPhysical * 100) / 100,
            overallProgress: Math.round(progressData.progress.overall * 100) / 100
          }
        };
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        // Fallback to simple calculation
        return {
          ...project.toJSON(),
          progress: await calculateProjectProgress(project, req.user.role)
        };
      }
    }));

    // Calculate submission statistics
    const stats = {
      totalSubmissions: count,
      pendingReview: projects.filter(p => p.workflowStatus === 'submitted').length,
      approved: projects.filter(p => p.workflowStatus === 'secretariat_approved' || p.workflowStatus === 'ongoing' || p.workflowStatus === 'validated_by_secretariat').length,
      overdue: projects.filter(p => {
        if (p.workflowStatus === 'submitted' && p.endDate) {
          return new Date(p.endDate) < new Date();
        }
        return false;
      }).length
    };

    res.json({
      success: true,
      projects: projectsWithProgress,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get Secretariat submissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions'
    });
  }
});

// Get all milestones for user's accessible projects
// IMPORTANT: This route must come BEFORE /:id to avoid route conflicts
router.get('/all-milestones', authenticateToken, async (req, res) => {
  try {
    console.log('📅 [all-milestones] Request received from user:', req.user.id, 'role:', req.user.role);
    const whereClause = {};

    // Role-based filtering for projects
    switch (req.user.role) {
      case 'eiu':
      case 'EIU':
        // EIU sees only projects assigned to them
        whereClause.hasExternalPartner = true;
        whereClause.eiuPersonnelId = req.user.id;
        break;
      case 'iu':
      case 'LGU-IU':
        // LGU-IU sees only projects they created/manage
        whereClause.implementingOfficeId = req.user.id;
        break;
      case 'secretariat':
        // Secretariat sees all projects
        break;
      case 'mpmec':
      case 'LGU-PMT':
        // Check if user has Secretariat subrole
        if (req.user.subRole && req.user.subRole.toLowerCase().includes('secretariat')) {
          // MPMEC Secretariat sees all projects
          break;
        } else {
          // Regular MPMEC sees approved projects
          whereClause.approvedBySecretariat = true;
        }
        break;
      case 'executive':
      case 'EMS':
        // Executive Viewer sees all projects
        break;
      default:
        // Default: no projects
        whereClause.id = { [Op.eq]: null }; // This will return no projects
        break;
    }

    console.log('📅 [all-milestones] Where clause:', JSON.stringify(whereClause));

    // Get accessible projects
    const projects = await Project.findAll({
      where: whereClause,
      attributes: ['id', 'name']
    });

    console.log('📅 [all-milestones] Found projects:', projects.length);

    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      console.log('📅 [all-milestones] No projects found, returning empty milestones');
      return res.json({
        success: true,
        milestones: []
      });
    }

    console.log('📅 [all-milestones] Project IDs:', projectIds);
    
    // Try to fetch milestones without include first to see if that's the issue
    let milestones;
    try {
      milestones = await ProjectMilestone.findAll({
        where: { projectId: { [Op.in]: projectIds } },
        order: [['order', 'ASC'], ['dueDate', 'ASC']],
        attributes: [
          'id', 'projectId', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 
          'completedDate', 'status', 'progress', 'priority', 'order',
          'timelineWeight', 'timelineStartDate', 'timelineEndDate', 'timelineDescription', 'timelineStatus',
          'budgetWeight', 'budgetPlanned', 'budgetBreakdown', 'budgetStatus',
          'physicalWeight', 'physicalProofType', 'physicalDescription', 'physicalStatus',
          'validationDate', 'validationComments', 'completionNotes'
        ]
      });
      
      console.log('📅 [all-milestones] Found milestones:', milestones.length);
      
      // Get project names separately to avoid association issues
      const projectMap = {};
      projects.forEach(p => {
        projectMap[p.id] = p.name;
      });
      
      // Get milestone used budget from latest approved submissions
      const milestoneIds = milestones.map(m => m.id);
      
      // Fetch latest approved submissions for each milestone to get used budget
      // Note: Status values in MilestoneSubmission are: 'pending_review', 'under_review', 'approved', 'needs_revision', 'rejected'
      const latestSubmissions = await MilestoneSubmission.findAll({
        where: {
          milestoneId: { [Op.in]: milestoneIds },
          status: 'approved'
        },
        attributes: ['milestoneId', 'usedBudget'],
        order: [['submittedAt', 'DESC']],
        raw: true
      });
      
      // Create a map of milestone ID to latest used budget
      const milestoneBudgetMap = {};
      latestSubmissions.forEach(submission => {
        if (!milestoneBudgetMap[submission.milestoneId]) {
          milestoneBudgetMap[submission.milestoneId] = parseFloat(submission.usedBudget || 0);
        }
      });
      
      // Add project name and used budget to each milestone
      const milestonesWithProjectName = milestones.map(milestone => {
        const milestoneData = milestone.toJSON();
        const usedBudget = milestoneBudgetMap[milestoneData.id] || 0;
        
        return {
          ...milestoneData,
          projectName: projectMap[milestoneData.projectId] || 'Unknown Project',
          usedBudget: usedBudget
        };
      });

      console.log('📅 [all-milestones] Returning', milestonesWithProjectName.length, 'milestones');
      
      res.json({
        success: true,
        milestones: milestonesWithProjectName
      });
    } catch (milestoneError) {
      console.error('📅 [all-milestones] Error fetching milestones:', milestoneError);
      console.error('📅 [all-milestones] Error stack:', milestoneError.stack);
      throw milestoneError;
    }

  } catch (error) {
    console.error('📅 [all-milestones] Get milestones error:', error);
    console.error('📅 [all-milestones] Error message:', error.message);
    console.error('📅 [all-milestones] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milestones',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get project details with comprehensive progress
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check and update project completion status based on milestones
    const ProjectCompletionService = require('../services/projectCompletionService');
    const project = await Project.findByPk(id);
    if (project) {
      await ProjectCompletionService.checkAndUpdateProjectCompletion(id, project);
    }
    
    const progressData = await ProgressCalculationService.calculateProjectProgress(id, req.user.role);
    
    // Use the helper function to get properly formatted progress values
    const formattedProgress = await calculateProjectProgress({ id }, req.user.role);
    
    // Check for delayed status and update milestone statuses if needed
    const delayedStatusService = require('../services/delayedStatusService');
    let delayInfo = null;
    
    console.log(`🔍 [API] Checking delayed status for project ${id} with status: ${progressData.project?.status}`);
    
    if (progressData.project && (progressData.project.status === 'ongoing' || progressData.project.status === 'delayed')) {
      try {
        console.log(`🔄 [API] Running delayedStatusService.checkProjectDelayedStatus for ${id}`);
        const delayCheck = await delayedStatusService.checkProjectDelayedStatus(id);
        
        console.log(`📊 [API] Delay check result:`, {
          isDelayed: delayCheck.isDelayed,
          overdueMilestoneCount: delayCheck.delayInfo.overdueMilestoneCount,
          maxDaysOverdue: delayCheck.delayInfo.maxDaysOverdue,
          overdueMilestones: delayCheck.overdueMilestones.map(m => m.title)
        });
        
        delayInfo = {
          isDelayed: delayCheck.isDelayed,
          overdueMilestoneCount: delayCheck.delayInfo.overdueMilestoneCount,
          maxDaysOverdue: delayCheck.delayInfo.maxDaysOverdue,
          severity: delayCheck.delayInfo.severity,
          overdueMilestones: delayCheck.overdueMilestones
        };
        
        // Auto-update status if needed
        if (delayCheck.isDelayed && progressData.project.status !== 'delayed') {
          console.log(`🔄 [API] Updating project status from ${progressData.project.status} to delayed`);
          await delayedStatusService.updateProjectDelayedStatus(id);
          progressData.project.status = 'delayed'; // Update in memory for response
        }
        
        // Update milestone statuses in the response if they're overdue
        if (delayCheck.overdueMilestones && delayCheck.overdueMilestones.length > 0 && progressData.milestones) {
          console.log(`🔄 [API] Updating ${delayCheck.overdueMilestones.length} overdue milestone statuses`);
          delayCheck.overdueMilestones.forEach(overdueMilestone => {
            const milestone = progressData.milestones.find(m => m.id === overdueMilestone.id || m.title === overdueMilestone.title);
            if (milestone) {
              console.log(`✅ [API] Updated milestone "${milestone.title}" from "${milestone.status}" to "delayed"`);
              milestone.status = 'delayed';
            } else {
              console.log(`❌ [API] Could not find milestone "${overdueMilestone.title}" in progressData.milestones`);
            }
          });
        } else {
          console.log(`ℹ️ [API] No overdue milestones to update or no milestones data`);
        }
        
      } catch (delayError) {
        console.error(`❌ [API] Error checking delayed status for project ${id}:`, delayError);
      }
    } else {
      console.log(`ℹ️ [API] Skipping delayed status check - project status is ${progressData.project?.status}`);
    }
    
    // Add cache-busting headers to prevent stale data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0'
    });
    
    // Fetch recent updates including delay notifications
    let recentUpdates = [];
    try {
      console.log(`🔍 [API] Fetching recent updates for project ${id}`);
      const updates = await ProjectUpdate.findAll({
        where: { projectId: id },
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      recentUpdates = updates || [];
      console.log(`📋 [API] Found ${recentUpdates.length} recent updates`);
    } catch (updateError) {
      console.error(`❌ [API] Error fetching updates for project ${id}:`, updateError);
    }

    // Debug: Log the project data being returned
    console.log('🔍 Project Details API - Returning project data:', {
      id: progressData.project?.id,
      name: progressData.project?.name,
      expectedDaysOfCompletion: progressData.project?.expectedDaysOfCompletion,
      startDate: progressData.project?.startDate,
      endDate: progressData.project?.endDate,
      targetCompletionDate: progressData.project?.targetCompletionDate,
      allFields: Object.keys(progressData.project || {})
    });

    res.json({
      success: true,
      project: {
        ...progressData.project,
        milestones: progressData.milestones || [],
        updates: recentUpdates, // Include recent updates
        progress: formattedProgress,
        compiledReport: progressData.compiledReport,
        lastUpdate: progressData.lastUpdate,
        automatedProgress: progressData.automatedProgress,
        delayInfo // Add delay information to the response
      }
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
        order: index + 1,
        priority: milestone.priority || 'medium',
        
        // 3-Division configuration
        timelineWeight: milestone.timelineDivision?.weight || 33.33,
        timelineStartDate: milestone.timelineDivision?.startDate || null,
        timelineEndDate: milestone.timelineDivision?.endDate || null,
        timelineDescription: milestone.timelineDivision?.description || '',
        timelineStatus: 'pending',
        
        budgetWeight: milestone.budgetDivision?.weight || 33.33,
        budgetPlanned: milestone.budgetDivision?.plannedBudget || 0,
        budgetBreakdown: milestone.budgetBreakdown || milestone.budgetDivision?.breakdown || '',
        budgetStatus: 'pending',
        
        physicalWeight: milestone.physicalDivision?.weight || 33.33,
        physicalProofType: milestone.physicalDivision?.proofType || 'form',
        physicalDescription: milestone.physicalDivision?.description || '',
        physicalStatus: 'pending'
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
    console.log('🗑️ Project deletion request received:', {
      projectId: req.params.id,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role
    });
    
    const { id } = req.params;

    const project = await Project.findByPk(id);
    console.log('🔍 Project lookup result:', {
      found: !!project,
      projectId: id,
      projectName: project?.name,
      projectStatus: project?.status,
      implementingOfficeId: project?.implementingOfficeId,
      requestingUserId: req.user.id
    });
    
    if (!project) {
      console.log('❌ Project not found for deletion');
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user owns this project
    console.log('🔐 Authorization check:', {
      projectOwnerId: project.implementingOfficeId,
      requestingUserId: req.user.id,
      authorized: project.implementingOfficeId === req.user.id
    });
    
    if (project.implementingOfficeId !== req.user.id) {
      console.log('❌ User not authorized to delete this project');
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this project'
      });
    }

    // TEMPORARILY DISABLED: Only allow deletion if project is pending
    console.log('📋 Status check (TEMPORARILY BYPASSED):', {
      projectStatus: project.status,
      canDelete: 'ALLOWED (temporary override)'
    });
    
    // Temporarily commenting out status check for project recreation
    /*
    if (project.status !== 'pending') {
      console.log('❌ Project status does not allow deletion');
      return res.status(400).json({
        success: false,
        error: 'Cannot delete project that is not pending'
      });
    }
    */

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
      console.log('Starting notification creation for project deletion:', project.name);
      
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

      console.log(`✅ All notifications created successfully for project deletion: ${project.name}`);
    } catch (notificationError) {
      console.error('❌ Error creating notifications for project deletion:', notificationError);
      console.error('Error details:', {
        message: notificationError.message,
        stack: notificationError.stack,
        projectId: project.id,
        projectName: project.name
      });
      // Don't fail the project deletion if notifications fail
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
    const hasValidRole = req.user.role === 'secretariat' || req.user.role === 'LGU-PMT';
    
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    const hasValidSubrole = req.user.role === 'LGU-PMT' ? 
      (req.user.subRole && req.user.subRole.toLowerCase().includes('secretariat')) : true;
    
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

      // Auto-generate news article for project approval
      try {
        const AutoNewsGenerator = require('../services/autoNewsGenerator');
        await AutoNewsGenerator.generateArticle('PROJECT_APPROVED', project, {
          userId: req.user.id
        });
      } catch (newsError) {
        console.error('Error generating auto news for project approval:', newsError);
        // Don't fail the approval if news generation fails
      }

      // Send notifications to all relevant parties
      try {
        console.log(`🎉 Project approved! Sending notifications for project: ${project.name}`);

        // 1. Notify Implementing Office (project creator)
        if (project.implementingOfficeId) {
          const implementingOfficeNotification = await createNotification(
            project.implementingOfficeId,
            'Project Approved by Secretariat',
            `Your project "${project.name}" (${project.projectCode}) has been approved by the Secretariat and is now ONGOING.`,
            'Success',
            'Project',
            'Project',
            project.id,
            'High'
          );
          console.log(`✅ Implementing Office notification created:`, implementingOfficeNotification ? 'Success' : 'Failed');
        }

        // 2. Notify EIU Partner (if assigned)
        if (project.eiuPersonnelId) {
          const eiuNotification = await createNotification(
            project.eiuPersonnelId,
            'Project Approved - Ready for Updates',
            `The project "${project.name}" (${project.projectCode}) has been approved by the Secretariat. You can now submit milestone updates.`,
            'Info',
            'Project',
            'Project',
            project.id,
            'Medium'
          );
          console.log(`✅ EIU Partner notification created:`, eiuNotification ? 'Success' : 'Failed');
        }

        // 3. Notify MPMEC (LGU-PMT role)
        const mpmecNotification = await createNotificationForRole(
          'LGU-PMT',
          'Project Approved by Secretariat',
          `Project "${project.name}" (${project.projectCode}) has been approved and is now ONGOING.`,
          'Info',
          'Project',
          'Project',
          project.id,
          'Medium'
        );
        console.log(`✅ MPMEC notification created:`, mpmecNotification ? 'Success' : 'Failed');

        // 4. Notify Executive users
        const executiveUsers = await User.findAll({
          where: { subRole: 'EXECUTIVE' }
        });

        if (executiveUsers.length > 0) {
          console.log(`👑 Creating approval notifications for ${executiveUsers.length} Executive users...`);
          for (const executive of executiveUsers) {
            const executiveNotification = await createNotification(
              executive.id,
              'Project Approved by Secretariat',
              `Project "${project.name}" (${project.projectCode}) has been approved by the Secretariat and is now ONGOING.`,
              'Info',
              'Project',
              'Project',
              project.id,
              'Medium'
            );
            console.log(`✅ Executive notification created for ${executive.name}:`, executiveNotification ? 'Success' : 'Failed');
          }
        } else {
          console.log('ℹ️ No Executive users found');
        }

        console.log(`✅ All approval notifications sent successfully for project: ${project.name}`);
      } catch (notificationError) {
        console.error('❌ Error sending approval notifications:', notificationError);
        // Don't fail the approval if notifications fail
      }

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

      // Send rejection notifications
      try {
        console.log(`❌ Project rejected! Sending rejection notifications for project: ${project.name}`);

        // 1. Notify Implementing Office (project creator)
        if (project.implementingOfficeId) {
          const implementingOfficeNotification = await createNotification(
            project.implementingOfficeId,
            'Project Rejected by Secretariat',
            `Your project "${project.name}" (${project.projectCode}) has been rejected by the Secretariat. Please review and resubmit.`,
            'Warning',
            'Project',
            'Project',
            project.id,
            'High'
          );
          console.log(`✅ Implementing Office rejection notification created:`, implementingOfficeNotification ? 'Success' : 'Failed');
        }

        // 2. Notify MPMEC (LGU-PMT role)
        const mpmecNotification = await createNotificationForRole(
          'LGU-PMT',
          'Project Rejected by Secretariat',
          `Project "${project.name}" (${project.projectCode}) has been rejected and needs to be resubmitted.`,
          'Warning',
          'Project',
          'Project',
          project.id,
          'Medium'
        );
        console.log(`✅ MPMEC rejection notification created:`, mpmecNotification ? 'Success' : 'Failed');

        // 3. Notify Executive users
        const executiveUsers = await User.findAll({
          where: { subRole: 'EXECUTIVE' }
        });

        if (executiveUsers.length > 0) {
          console.log(`👑 Creating rejection notifications for ${executiveUsers.length} Executive users...`);
          for (const executive of executiveUsers) {
            const executiveNotification = await createNotification(
              executive.id,
              'Project Rejected by Secretariat',
              `Project "${project.name}" (${project.projectCode}) has been rejected and needs to be resubmitted.`,
              'Warning',
              'Project',
              'Project',
              project.id,
              'Medium'
            );
            console.log(`✅ Executive rejection notification created for ${executive.name}:`, executiveNotification ? 'Success' : 'Failed');
          }
        } else {
          console.log('ℹ️ No Executive users found for rejection notification');
        }

        console.log(`✅ All rejection notifications sent successfully for project: ${project.name}`);
      } catch (notificationError) {
        console.error('❌ Error sending rejection notifications:', notificationError);
        // Don't fail the rejection if notifications fail
      }

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

    // Auto-generate news article for project approval
    try {
      const AutoNewsGenerator = require('../services/autoNewsGenerator');
      await AutoNewsGenerator.generateArticle('PROJECT_APPROVED', project, {
        userId: req.user.id
      });
    } catch (newsError) {
      console.error('Error generating auto news for project approval:', newsError);
      // Don't fail the approval if news generation fails
    }

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
      // Remove workflowStatus filter to include all projects
      // where: {
      //   workflowStatus: {
      //     [Op.in]: ['ongoing', 'compiled_for_secretariat', 'validated_by_secretariat']
      //   }
      // },
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
      try {
        const progressData = await ProgressCalculationService.calculateProjectProgress(project.id, req.user.role);
        return {
          ...project.toJSON(),
          progress: {
            // Use internal division progress (percentage within each division) instead of contribution to overall
            timelineProgress: Math.round(progressData.progress.internalTimeline * 100) / 100,
            budgetProgress: Math.round(progressData.progress.internalBudget * 100) / 100,
            physicalProgress: Math.round(progressData.progress.internalPhysical * 100) / 100,
            overallProgress: Math.round(progressData.progress.overall * 100) / 100
          }
        };
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        // Fallback to simple calculation
        const progress = await calculateProjectProgress(project, req.user.role);
        return {
          ...project.toJSON(),
          progress
        };
      }
    }));

    projectsWithProgress.forEach(project => {
      totalProjects++;
      totalCompletion += parseFloat(project.progress?.overallProgress || project.overallProgress || 0);

      // Count compiled reports - handle projects without workflowStatus
      if (project.workflowStatus === 'compiled_for_secretariat') {
        totalReports++;
        validationStats.pending++;
      } else if (project.workflowStatus === 'validated_by_secretariat') {
        validationStats.approved++;
      } else if (!project.workflowStatus) {
        // For projects without workflowStatus, consider them as ongoing
        validationStats.pending++;
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
        status: project.workflowStatus || 'ongoing',
        secretariatApprovalDate: project.secretariatApprovalDate,
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

    if (project.workflowStatus === 'validated_by_secretariat') {
      return res.status(400).json({
        success: false,
        error: 'Project is already validated by Secretariat. No further validation needed.'
      });
    }
    
    if (project.workflowStatus !== 'compiled_for_secretariat') {
      return res.status(400).json({
        success: false,
        error: 'Project is not in compiled status for validation. Current status: ' + project.workflowStatus
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

    // Get milestone details for notification
    let milestone = null;
    if (compiledReport && compiledReport.milestoneUpdates) {
      try {
        const milestoneUpdates = typeof compiledReport.milestoneUpdates === 'string' 
          ? JSON.parse(compiledReport.milestoneUpdates) 
          : compiledReport.milestoneUpdates;
        
        if (milestoneUpdates && milestoneUpdates.length > 0) {
          const milestoneId = milestoneUpdates[0].milestoneId;
          milestone = await ProjectMilestone.findByPk(milestoneId);
        }
      } catch (e) {
        console.error('Error parsing milestone data for notification:', e);
      }
    }

    // Create notifications for Secretariat verdict
    try {
      const ProjectNotificationService = require('../services/projectNotificationService');
      
      // Create verdict object based on validation result
      const verdicts = {
        timeline: validated ? 'approved' : 'rejected',
        budget: validated ? 'approved' : 'rejected',
        physical: validated ? 'approved' : 'rejected'
      };

      await ProjectNotificationService.notifySecretariatVerdict(compiledReport, project, milestone, verdicts);
      console.log('✅ Notifications created for Secretariat verdict');
    } catch (notificationError) {
      console.error('Failed to create notifications:', notificationError);
      // Don't fail the entire request if notification creation fails
    }

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
          attributes: ['id', 'name', 'email', 'role', 'subRole', 'department', 'profilePictureUrl', 'fullName']
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

// Get compiled report for Secretariat review
router.get('/:projectId/compiled-report', authenticateToken, async (req, res) => {
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
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 'status', 'progress', 'plannedStartDate', 'plannedEndDate', 'timelineStartDate', 'timelineEndDate']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Process milestone updates from approved updates
    const processedMilestoneUpdates = [];
    
    if (project.updates && project.updates.length > 0) {
      project.updates.forEach(update => {
        if (update.milestoneUpdates && update.updateType === 'milestone') {
          try {
            const milestoneData = typeof update.milestoneUpdates === 'string' 
              ? JSON.parse(update.milestoneUpdates) 
              : update.milestoneUpdates;
            
            if (Array.isArray(milestoneData)) {
              milestoneData.forEach(milestoneUpdate => {
                // Find the corresponding milestone for additional data
                const originalMilestone = project.milestones?.find(m => m.id === milestoneUpdate.milestoneId);
                
                                 processedMilestoneUpdates.push({
                   ...milestoneUpdate,
                   submittedBy: update.submitter?.name || 'EIU Personnel',
                   submittedByRole: update.submittedByRole,
                   submittedAt: update.submittedAt,
                   status: update.status,
                   updateId: update.id,
                   milestoneTitle: originalMilestone?.title,
                   milestoneWeight: originalMilestone?.weight,
                   plannedBudget: originalMilestone?.plannedBudget,
                   plannedStartDate: originalMilestone?.plannedStartDate || originalMilestone?.timelineStartDate,
                   plannedEndDate: originalMilestone?.plannedEndDate || originalMilestone?.timelineEndDate,
                   secretariatNote: update.secretariatNote || null
                 });
              });
            } else if (milestoneData && typeof milestoneData === 'object') {
              // Handle single milestone update object
              const originalMilestone = project.milestones?.find(m => m.id === milestoneData.milestoneId);
              
              processedMilestoneUpdates.push({
                ...milestoneData,
                submittedBy: update.submitter?.name || 'EIU Personnel',
                submittedByRole: update.submittedByRole,
                submittedAt: update.submittedAt,
                status: update.status,
                updateId: update.id,
                milestoneTitle: originalMilestone?.title,
                milestoneWeight: originalMilestone?.weight,
                plannedBudget: originalMilestone?.plannedBudget,
                plannedStartDate: originalMilestone?.plannedStartDate || originalMilestone?.timelineStartDate,
                plannedEndDate: originalMilestone?.plannedEndDate || originalMilestone?.timelineEndDate
              });
            }
          } catch (error) {
            console.error('Error parsing milestone updates:', error);
          }
        }
      });
    }

    const report = {
      projectInfo: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        implementingOffice: project.implementingOffice?.name,
        eiuPartner: project.eiuPersonnel?.name,
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
      milestoneUpdates: processedMilestoneUpdates,
      approvedUpdates: project.updates?.map(update => ({
        id: update.id,
        title: update.title,
        submittedBy: update.submitter?.name,
        submittedAt: update.submittedAt,
        status: update.status
      })) || []
    };

    res.json({
      success: true,
      report: report
    });

  } catch (error) {
    console.error('Compiled report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate compiled report'
    });
  }
});

// Generate project report
router.get('/:projectId/generate-report', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Fetch comprehensive project data
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
          where: { 
            status: { [Op.in]: ['iu_approved', 'secretariat_approved'] },
            updateType: { [Op.in]: ['milestone', 'milestone_update', 'progress_update'] }
          },
          required: false,
          include: [
            {
              model: User,
              as: 'submitter',
              attributes: ['name', 'role']
            }
          ],
          order: [['createdAt', 'DESC']]
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'description', 'dueDate', 'status', 'progress', 'weight', 'plannedStartDate', 'plannedEndDate', 'timelineStartDate', 'timelineEndDate', 'timelineDescription', 'timelineStatus', 'budgetWeight', 'budgetPlanned', 'budgetBreakdown', 'budgetStatus', 'physicalWeight', 'physicalProofType', 'physicalDescription', 'physicalStatus', 'validationDate', 'validationComments', 'completionNotes', 'order'],
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

    // Get the latest milestone update for compiled report
    const latestUpdate = project.updates && project.updates.length > 0 ? project.updates[0] : null;
    console.log('🔍 Latest update data:', {
      id: latestUpdate?.id,
      title: latestUpdate?.title,
      milestoneId: latestUpdate?.milestoneId,
      milestoneUpdates: latestUpdate?.milestoneUpdates
    });

    // Calculate REAL progress using ProgressCalculationService
    const realProgress = await calculateProjectProgress(project, req.user.role);
    console.log('🔢 Real progress calculation for export:', realProgress);

    // Create compiled report record in database
    const compiledReport = await ProjectValidation.create({
      projectId: project.id,
      reportId: latestUpdate?.milestoneId || null, // Use reportId instead of milestoneId
      reportType: 'milestone_report',
      status: 'approved', // Use 'approved' instead of 'compiled' since 'compiled' is not in the ENUM
      priority: 'medium',
      validatedBy: req.user.id,
      validatedAt: new Date(),
      validationChecklist: {
        projectInfo: {
          id: project.id,
          projectCode: project.projectCode,
          name: project.name,
          implementingOffice: project.implementingOffice?.name || project.implementingOfficeName,
          implementingPartner: project.eiuPersonnel?.name || 'N/A',
          eiuPersonnel: project.eiuPersonnel?.name,
          category: project.category,
          location: project.location,
          totalBudget: project.totalBudget,
          startDate: project.startDate,
          endDate: project.endDate,
          description: project.description,
          expectedOutputs: project.expectedOutputs,
          targetBeneficiaries: project.targetBeneficiaries,
          createdDate: project.createdDate,
          status: project.status
        },
        progress: {
          overallProgress: realProgress.overallProgress,
          timelineProgress: realProgress.timelineProgress,
          budgetProgress: realProgress.budgetProgress,
          physicalProgress: realProgress.physicalProgress,
          automatedProgress: project.automatedProgress
        },
        workflow: {
          status: project.status,
          workflowStatus: project.workflowStatus,
          submittedToSecretariat: project.submittedToSecretariat,
          submittedToSecretariatDate: project.submittedToSecretariatDate,
          secretariatApprovalDate: project.secretariatApprovalDate,
          secretariatApprovedBy: project.secretariatApprovedBy
        },
        latestUpdate: latestUpdate ? {
          id: latestUpdate.id,
          title: latestUpdate.title,
          description: latestUpdate.description,
          submittedBy: latestUpdate.submitter?.name,
          submittedAt: latestUpdate.submittedAt,
          status: latestUpdate.status,
          milestoneUpdates: latestUpdate.milestoneUpdates,
          claimedProgress: latestUpdate.claimedProgress,
          adjustedProgress: latestUpdate.adjustedProgress,
          finalProgress: latestUpdate.finalProgress,
          budgetUsed: latestUpdate.budgetUsed,
          remarks: latestUpdate.remarks,
          milestoneId: latestUpdate.milestoneId
        } : null,
        milestones: (() => {
          console.log('🚨 WORD DOCUMENT GENERATION STARTED 🚨');
          
          // Show ALL milestones in correct order
          if (!project.milestones || project.milestones.length === 0) {
            console.log('❌ No project milestones found');
            return [];
          }
          
          console.log(`✅ Found ${project.milestones.length} project milestones`);
          
          return project.milestones.sort((a, b) => (a.order || 0) - (b.order || 0)).map(milestone => {
          // Find the corresponding milestone update from the latest update
          let milestoneUpdate = null;
          if (latestUpdate && latestUpdate.milestoneUpdates) {
            try {
              const milestoneUpdates = typeof latestUpdate.milestoneUpdates === 'string' 
                ? JSON.parse(latestUpdate.milestoneUpdates) 
                : latestUpdate.milestoneUpdates;
              
              milestoneUpdate = milestoneUpdates.find(update => update.milestoneId === milestone.id);
            } catch (error) {
              console.error('Error parsing milestone updates:', error);
            }
          }

          return {
            id: milestone.id,
            title: milestone.title,
            description: milestone.description,
            dueDate: milestone.dueDate,
            status: milestone.status,
            progress: milestone.progress,
            weight: milestone.weight,
            order: milestone.order,
            timelineStartDate: milestone.timelineStartDate,
            timelineEndDate: milestone.timelineEndDate,
            timelineDescription: milestone.timelineDescription,
            timelineStatus: milestone.timelineStatus,
            budgetPlanned: milestone.budgetPlanned,
            budgetStatus: milestone.budgetStatus,
            physicalDescription: milestone.physicalDescription,
            physicalStatus: milestone.physicalStatus,
            validationDate: milestone.validationDate,
            validationComments: milestone.validationComments,
            // 3-Division Information from milestone updates with complete data
            timelineActivities: milestoneUpdate?.timeline?.activities || milestone.timelineDescription || 'Site preparation and excavation activities including clearing, leveling, and foundation work',
            timelinePlannedStart: milestoneUpdate?.timeline?.plannedStart || milestone.timelineStartDate,
            timelinePlannedDue: milestoneUpdate?.timeline?.plannedDue || milestone.timelineEndDate,
            timelineWeight: milestoneUpdate?.timeline?.weight || milestone.timelineWeight || '13.33%',
            timelineStatus: milestoneUpdate?.timeline?.status || milestone.timelineStatus || 'approved',
            timelineVerdict: milestoneUpdate?.timeline?.verdict || 'Approved',
            timelineRemarks: milestoneUpdate?.timeline?.remarks || 'Timeline division requirements met',
            budgetUsed: milestoneUpdate?.budget?.used || 0,
            budgetBreakdown: milestoneUpdate?.budget?.breakdown || milestone.budgetPlanned || 'Budget allocation for site preparation and excavation materials',
            budgetWeight: milestoneUpdate?.budget?.weight || milestone.budgetWeight || '13.33%',
            budgetStatus: milestoneUpdate?.budget?.status || milestone.budgetStatus || 'approved',
            budgetVerdict: milestoneUpdate?.budget?.verdict || 'Approved',
            budgetRemarks: milestoneUpdate?.budget?.remarks || 'Budget division requirements met',
            physicalRequirements: milestoneUpdate?.physical?.requirements || milestone.physicalDescription || 'Physical completion of site preparation and excavation work',
            physicalProofType: milestoneUpdate?.physical?.proofType || milestone.physicalProofType || 'form',
            physicalWeight: milestoneUpdate?.physical?.weight || milestone.physicalWeight || '13.33%',
            physicalStatus: milestoneUpdate?.physical?.status || milestone.physicalStatus || 'approved',
            physicalVerdict: milestoneUpdate?.physical?.verdict || 'Approved',
            physicalRemarks: milestoneUpdate?.physical?.remarks || 'Physical division requirements met',
            supportingFiles: milestoneUpdate?.supportingFiles || []
          };
        });
        })()
      }
    });

    // Generate Word document - SIMPLE WORKING VERSION
    const docx = require('docx');
    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({
                text: "REPUBLIC OF THE PHILIPPINES",
                bold: true,
                size: 28,
                font: "Arial",
                color: "2F2F2F"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "PROVINCE OF LAGUNA",
                bold: true,
                size: 28,
                font: "Arial",
                color: "2F2F2F"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "MUNICIPALITY OF SANTA CRUZ",
                bold: true,
                size: 28,
                font: "Arial",
                color: "2F2F2F"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          // Main Title
          new Paragraph({
            children: [
              new TextRun({
                text: "OFFICIAL MILESTONE REPORT",
                bold: true,
                size: 36,
                font: "Arial",
                color: "1F4E79"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: "MPMEC Secretariat - Compiled Report",
                size: 24,
                font: "Arial",
                color: "666666"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          
          // Report Date
          new Paragraph({
            children: [
              new TextRun({
                text: `Report Generated: ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}`,
                size: 20,
                font: "Arial",
                color: "666666"
              })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 800 }
          }),
          
          // Section 1: Project Information
          new Paragraph({
            children: [
              new TextRun({
                text: "SECTION 1: PROJECT INFORMATION",
                bold: true,
                size: 24,
                font: "Arial",
                color: "1F4E79"
              })
            ],
            spacing: { before: 400, after: 300 }
          }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      text: "PROJECT INFORMATION", 
                      bold: true,
                      size: 20,
                      color: "FFFFFF"
                    })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "1F4E79" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Project Code", bold: true, size: 18 })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ text: project.projectCode || 'N/A', size: 18 })],
                    width: { size: 70, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Project Name", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ text: project.name, size: 18 })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Implementing Office", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ text: project.implementingOffice?.name || 'Not assigned', size: 18 })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "EIU Personnel", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ text: project.eiuPersonnel?.name || 'Not assigned', size: 18 })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Project Period", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ 
                      text: `${new Date(project.startDate).toLocaleDateString()} to ${new Date(project.endDate).toLocaleDateString()}`, 
                      size: 18 
                    })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Total Budget", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ 
                      text: `₱${parseFloat(project.totalBudget || 0).toLocaleString()}`, 
                      size: 18 
                    })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Overall Progress", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ 
                      text: `${realProgress.overallProgress.toFixed(2)}%`, 
                      size: 18,
                      color: realProgress.overallProgress >= 80 ? "008000" : realProgress.overallProgress >= 50 ? "FFA500" : "FF0000"
                    })]
                  })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Section 2: Project Description
          new Paragraph({
            children: [
              new TextRun({
                text: "SECTION 2: PROJECT DESCRIPTION",
                bold: true,
                size: 24,
                font: "Arial",
                color: "1F4E79"
              })
            ],
            spacing: { before: 400, after: 300 }
          }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      text: "PROJECT DESCRIPTION", 
                      bold: true,
                      size: 20,
                      color: "FFFFFF"
                    })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "1F4E79" }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: project.description || 'No description provided', 
                      size: 18 
                    })],
                    width: { size: 70, type: WidthType.PERCENTAGE }
                  })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Section 3: Current Progress
          new Paragraph({
            children: [
              new TextRun({
                text: "SECTION 3: CURRENT PROGRESS",
                bold: true,
                size: 24,
                font: "Arial",
                color: "1F4E79"
              })
            ],
            spacing: { before: 400, after: 300 }
          }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      text: "CURRENT PROGRESS", 
                      bold: true,
                      size: 20,
                      color: "FFFFFF"
                    })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "1F4E79" }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: `${realProgress.overallProgress.toFixed(2)}%`, 
                      size: 18,
                      color: realProgress.overallProgress >= 80 ? "008000" : realProgress.overallProgress >= 50 ? "FFA500" : "FF0000"
                    })],
                    width: { size: 70, type: WidthType.PERCENTAGE }
                  })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Section 4: Milestone Information
          new Paragraph({
            children: [
              new TextRun({
                text: "SECTION 4: MILESTONE INFORMATION",
                bold: true,
                size: 24,
                font: "Arial",
                color: "1F4E79"
              })
            ],
            spacing: { before: 400, after: 300 }
          }),
          
          // Simple milestone display
          ...(project.milestones && project.milestones.length > 0 ? project.milestones
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((milestone, index) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Milestone ${milestone.order}: ${milestone.title}`,
                    bold: true,
                    size: 20,
                    font: "Arial",
                    color: "1F4E79"
                  })
                ],
                spacing: { before: 300, after: 200 }
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" }
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ 
                        children: [new Paragraph({ text: "Due Date", bold: true, size: 18 })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        shading: { fill: "F8F9FA" }
                      }),
                      new TableCell({ 
                        children: [new Paragraph({ 
                          text: new Date(milestone.dueDate).toLocaleDateString(), 
                          size: 18 
                        })],
                        width: { size: 80, type: WidthType.PERCENTAGE }
                      })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ 
                        children: [new Paragraph({ text: "Status", bold: true, size: 18 })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        shading: { fill: "F8F9FA" }
                      }),
                      new TableCell({ 
                        children: [new Paragraph({ 
                          text: milestone.status || 'Pending', 
                          size: 18,
                          color: milestone.status === 'completed' ? "008000" : milestone.status === 'in_progress' ? "FFA500" : "FF0000"
                        })],
                        width: { size: 80, type: WidthType.PERCENTAGE }
                      })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ 
                        children: [new Paragraph({ text: "Weight", bold: true, size: 18 })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        shading: { fill: "F8F9FA" }
                      }),
                      new TableCell({ 
                        children: [new Paragraph({ 
                          text: `${milestone.weight || '0'}%`, 
                          size: 18 
                        })],
                        width: { size: 80, type: WidthType.PERCENTAGE }
                      })
                    ]
                  })
                ]
              }),
              new Paragraph({ spacing: { after: 300 } })
            ]).flat() : []),
          
          // Section 5: Secretariat Verdict
          new Paragraph({
            children: [
              new TextRun({
                text: "SECTION 5: SECRETARIAT VERDICT",
                bold: true,
                size: 24,
                font: "Arial",
                color: "1F4E79"
              })
            ],
            spacing: { before: 400, after: 300 }
          }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      text: "SECRETARIAT VERDICT", 
                      bold: true,
                      size: 20,
                      color: "FFFFFF"
                    })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "1F4E79" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Workflow Status", bold: true, size: 18 })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ 
                      text: project.workflowStatus || 'Pending', 
                      size: 18,
                      color: project.workflowStatus === 'compiled_for_secretariat' ? "008000" : "FF0000"
                    })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Approval Date", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ 
                      text: project.secretariatApprovalDate ? new Date(project.secretariatApprovalDate).toLocaleDateString() : 'Not approved yet', 
                      size: 18 
                    })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Approved By", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ text: req.user.name || 'N/A', size: 18 })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [new Paragraph({ text: "Overall Status", bold: true, size: 18 })],
                    shading: { fill: "F8F9FA" }
                  }),
                  new TableCell({ 
                    children: [new Paragraph({ 
                      text: project.status || 'Ongoing', 
                      size: 18,
                      color: project.status === 'completed' ? "008000" : "FFA500"
                    })]
                  })
                ]
              })
            ]
          }),
          
          // Footer
          new Paragraph({ spacing: { after: 800 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: "This is an official document generated by the MPMEC Secretariat Build Watch LGU Project Management System",
                size: 16,
                font: "Arial",
                color: "666666"
              })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }]
    });

    const buffer = await docx.Packer.toBuffer(doc);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="project-report-${project.projectCode || projectId}-${new Date().toISOString().split('T')[0]}.docx"`);
    res.send(buffer);

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

// ===== MILESTONE APPROVAL PROGRESS UPDATE =====

// Update project progress when milestone is approved
router.post('/:projectId/milestones/:milestoneId/approve-progress', authenticateToken, requireRole(['LGU-PMT', 'secretariat', 'LGU-IU', 'iu']), async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;
    const { 
      timelineWeight, 
      budgetWeight, 
      physicalWeight, 
      budgetDivisionUtilized 
    } = req.body;

    console.log('🔍 Approving milestone progress API called:', {
      projectId,
      milestoneId,
      timelineWeight,
      budgetWeight,
      physicalWeight,
      budgetDivisionUtilized,
      userId: req.user.id,
      userRole: req.user.role
    });

    // Find the project
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Find the milestone
    const milestone = await ProjectMilestone.findOne({
      where: { id: milestoneId, projectId }
    });
    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found'
      });
    }

    // Get current project progress
    const currentTimelineProgress = parseFloat(project.timelineProgress) || 0;
    const currentBudgetProgress = parseFloat(project.budgetProgress) || 0;
    const currentPhysicalProgress = parseFloat(project.physicalProgress) || 0;

    // Calculate new progress values
    const newTimelineProgress = Math.min(100, currentTimelineProgress + parseFloat(timelineWeight || 0));
    const newBudgetProgress = Math.min(100, currentBudgetProgress + parseFloat(budgetDivisionUtilized || budgetWeight || 0));
    const newPhysicalProgress = Math.min(100, currentPhysicalProgress + parseFloat(physicalWeight || 0));

    // Calculate overall progress as sum of all three divisions
    const newOverallProgress = Math.min(100, newTimelineProgress + newBudgetProgress + newPhysicalProgress);

    console.log('📊 Progress calculation:', {
      current: {
        timeline: currentTimelineProgress,
        budget: currentBudgetProgress,
        physical: currentPhysicalProgress
      },
      new: {
        timeline: newTimelineProgress,
        budget: newBudgetProgress,
        physical: newPhysicalProgress,
        overall: newOverallProgress
      },
      weights: {
        timeline: timelineWeight,
        budget: budgetWeight,
        physical: physicalWeight,
        budgetUtilized: budgetDivisionUtilized
      }
    });

    // Update project progress
    await project.update({
      timelineProgress: newTimelineProgress,
      budgetProgress: newBudgetProgress,
      physicalProgress: newPhysicalProgress,
      overallProgress: newOverallProgress,
      lastProgressUpdate: new Date()
    });

    // Update milestone status to completed
    await milestone.update({
      status: 'completed',
      timelineStatus: 'approved',
      budgetStatus: 'approved',
      physicalStatus: 'approved',
      completedDate: new Date(),
      validationDate: new Date(),
      validatedBy: req.user.id
    });

    // Check if all milestones are completed using the completion service
    // This service checks milestone status, division approvals, and approved submissions
    const ProjectCompletionService = require('../services/projectCompletionService');
    const completionResult = await ProjectCompletionService.checkAndUpdateProjectCompletion(projectId, project);
    
    if (completionResult.wasUpdated) {
      console.log(`✅ Project ${project.projectCode} marked as completed - all milestones are completed/approved`);
    } else if (completionResult.isCompleted) {
      console.log(`✅ Project ${project.projectCode} is already marked as completed`);
    }

    // Log activity (don't fail if logging fails)
    try {
      await logActivity(
        req.user.id,
        'MILESTONE_APPROVED',
        'ProjectMilestone',
        milestoneId,
        `Approved milestone: ${milestone.title} for project: ${project.name}. Progress updated: Timeline: ${newTimelineProgress}%, Budget: ${newBudgetProgress}%, Physical: ${newPhysicalProgress}%, Overall: ${newOverallProgress}%`
      );
    } catch (logError) {
      console.warn('⚠️ Failed to log activity (non-critical):', logError);
    }

    res.json({
      success: true,
      message: 'Milestone approved and project progress updated successfully',
      progress: {
        timeline: newTimelineProgress,
        budget: newBudgetProgress,
        physical: newPhysicalProgress,
        overall: newOverallProgress
      },
      projectCompleted: allMilestonesCompleted
    });

  } catch (error) {
    console.error('❌ Error approving milestone progress:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      success: false,
      error: 'Failed to approve milestone and update progress',
      details: error.message
    });
  }
});

// ===== TEMPORARY QA ENDPOINT =====
// Add a temporary endpoint to reset project progress for QA purposes
router.post('/:projectId/reset-progress', authenticateToken, requireRole(['LGU-PMT', 'secretariat', 'LGU-IU', 'iu']), async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log(`🔍 Attempting to reset progress for project: ${projectId}`);

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Store old progress values for logging
    const oldProgress = {
      overall: project.overallProgress,
      timeline: project.timelineProgress,
      budget: project.budgetProgress,
      physical: project.physicalProgress
    };

    // Reset progress fields
    await project.update({
      overallProgress: 0,
      timelineProgress: 0,
      budgetProgress: 0,
      physicalProgress: 0,
      lastProgressUpdate: new Date()
    });

    // Log activity
    await logActivity(
      req.user.id,
      'PROJECT_PROGRESS_RESET',
      'Project',
      projectId,
      `Reset project progress for QA testing. Old progress: Overall: ${oldProgress.overall}%, Timeline: ${oldProgress.timeline}%, Budget: ${oldProgress.budget}%, Physical: ${oldProgress.physical}%`
    );

    console.log(`✅ Project progress for ${projectId} reset successfully.`);
    res.json({ 
      success: true, 
      message: 'Project progress reset successfully for QA testing',
      project: {
        id: project.id,
        name: project.name,
        projectCode: project.projectCode,
        progress: {
          overall: 0,
          timeline: 0,
          budget: 0,
          physical: 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error resetting project progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset project progress', 
      details: error.message 
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

    // Reload project with full data for news generation
    const project = await Project.findByPk(update.projectId);

    // Auto-generate news article when project update is approved
    if (approved && project) {
      try {
        const AutoNewsGenerator = require('../services/autoNewsGenerator');
        await AutoNewsGenerator.generateArticle('PROJECT_UPDATED', project, {
          userId: req.user.id,
          additionalData: {
            updateDetails: `Project update approved: ${update.updateType || 'Progress update'}`
          }
        });
      } catch (newsError) {
        console.error('Error generating auto news for project update approval:', newsError);
        // Don't fail the approval if news generation fails
      }
    }

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

    // Get milestones
    const milestones = await ProjectMilestone.findAll({
      where: { projectId: id },
      order: [['order', 'ASC'], ['dueDate', 'ASC']],
      attributes: [
        'id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 
        'completedDate', 'status', 'progress', 'priority', 'order',
        'timelineWeight', 'timelineStartDate', 'timelineEndDate', 'timelineDescription', 'timelineStatus',
        'budgetWeight', 'budgetPlanned', 'budgetBreakdown', 'budgetStatus',
        'physicalWeight', 'physicalProofType', 'physicalDescription', 'physicalStatus',
        'validationDate', 'validationComments', 'completionNotes'
      ]
    });

    // Get approved milestone submissions
    const approvedSubmissions = await MilestoneSubmission.findAll({
      where: {
        projectId: id,
        status: 'approved'
      },
      attributes: ['milestoneId', 'status', 'reviewedAt']
    });

    // Get the latest project update to check Secretariat verdict
    const latestUpdate = await ProjectUpdate.findOne({
      where: { 
        projectId: id,
        updateType: 'milestone'
      },
      order: [['createdAt', 'DESC']]
    });

    // Update milestone statuses based on latest Secretariat verdict and approved submissions
    const updatedMilestones = milestones.map(milestone => {
      let updatedMilestone = { ...milestone.toJSON() };
      
      // Check if milestone has an approved submission
      const hasApprovedSubmission = approvedSubmissions.some(
        sub => sub.milestoneId === milestone.id
      );
      
      // If milestone has approved submission, set status to completed
      if (hasApprovedSubmission && milestone.status !== 'completed') {
        updatedMilestone.status = 'completed';
        if (!updatedMilestone.completedDate) {
          const approvedSubmission = approvedSubmissions.find(s => s.milestoneId === milestone.id);
          updatedMilestone.completedDate = approvedSubmission?.reviewedAt || new Date();
        }
      }
      
      if (latestUpdate && latestUpdate.milestoneUpdates) {
        try {
          const milestoneUpdates = typeof latestUpdate.milestoneUpdates === 'string' 
            ? JSON.parse(latestUpdate.milestoneUpdates) 
            : latestUpdate.milestoneUpdates;
          
          // Find the corresponding milestone update
          const milestoneUpdate = milestoneUpdates.find(update => update.milestoneId === milestone.id);
          
          if (milestoneUpdate) {
            // Update division statuses based on Secretariat verdict
            updatedMilestone.timelineStatus = milestoneUpdate.timelineStatus || milestone.timelineStatus;
            updatedMilestone.budgetStatus = milestoneUpdate.budgetStatus || milestone.budgetStatus;
            updatedMilestone.physicalStatus = milestoneUpdate.physicalStatus || milestone.physicalStatus;
            
            // Update milestone status based on division verdicts
            const timelineStatus = milestoneUpdate.timelineStatus || 'pending';
            const budgetStatus = milestoneUpdate.budgetStatus || 'pending';
            const physicalStatus = milestoneUpdate.physicalStatus || 'pending';
            
            // Determine overall milestone status
            if (timelineStatus === 'approved' && budgetStatus === 'approved' && physicalStatus === 'approved') {
              updatedMilestone.status = 'completed';
            } else if (timelineStatus === 'rejected' || budgetStatus === 'rejected' || physicalStatus === 'rejected') {
              updatedMilestone.status = 'revision_request';
            } else if (timelineStatus === 'revision_requested' || budgetStatus === 'revision_requested' || physicalStatus === 'revision_requested') {
              updatedMilestone.status = 'revision_request';
            } else if (timelineStatus === 'approved' || budgetStatus === 'approved' || physicalStatus === 'approved') {
              updatedMilestone.status = 'in_progress';
            } else {
              updatedMilestone.status = 'pending';
            }
          }
        } catch (error) {
          console.error('Error parsing milestone updates:', error);
        }
      }
      
      return updatedMilestone;
    });

    res.json({
      success: true,
      milestones: updatedMilestones
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

    // Get milestone details for notification
    const milestoneData = approvedMilestone.milestoneUpdates;
    let milestone = null;
    if (milestoneData && milestoneData.length > 0) {
      const milestoneId = milestoneData[0].milestoneId;
      milestone = await ProjectMilestone.findByPk(milestoneId);
    }

    // Create notifications for Secretariat submission
    try {
      const ProjectNotificationService = require('../services/projectNotificationService');
      await ProjectNotificationService.notifySecretariatSubmission(approvedMilestone, project, milestone);
      console.log('✅ Notifications created for Secretariat submission');
    } catch (notificationError) {
      console.error('Failed to create notifications:', notificationError);
      // Don't fail the entire request if notification creation fails
    }

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

// Approve specific division
router.post('/:projectId/milestones/:updateId/divisions/:divisionType/approve', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { projectId, updateId, divisionType } = req.params;
    const { approved, comments, validatedBy } = req.body;

    if (!projectId || !updateId || !divisionType) {
      return res.status(400).json({
        success: false,
        error: 'Project ID, update ID, and division type are required'
      });
    }

    // Find the project update directly by updateId
    const projectUpdate = await ProjectUpdate.findOne({
      where: { 
        id: updateId,
        projectId: projectId
      }
    });

    if (!projectUpdate) {
      return res.status(404).json({
        success: false,
        error: 'Project update not found'
      });
    }

    // Parse milestone updates to update specific division status
    let milestoneUpdates = [];
    try {
      milestoneUpdates = typeof projectUpdate.milestoneUpdates === 'string' 
        ? JSON.parse(projectUpdate.milestoneUpdates) 
        : projectUpdate.milestoneUpdates || [];
    } catch (error) {
      console.error('Error parsing milestone updates:', error);
      milestoneUpdates = [];
    }

    // Update the specific division status
    if (milestoneUpdates.length > 0) {
      // Since we're using updateId, we'll update the first milestone in the update
      const milestoneUpdate = milestoneUpdates[0];
      if (milestoneUpdate) {
        // Set the division status
        const divisionStatusField = `${divisionType}Status`;
        milestoneUpdate[divisionStatusField] = approved ? 'approved' : 'rejected';
        
        // Set milestone title if not already set
        if (!milestoneUpdate.milestoneTitle && !milestoneUpdate.title) {
          milestoneUpdate.milestoneTitle = 'Site Preparation and Excavation'; // Default title
        }
        
        // Set division weights if not already set (each division gets 33.33% of milestone weight)
        const milestoneWeight = parseFloat(milestoneUpdate.weight || 40); // Default to 40% if not set
        const divisionWeight = milestoneWeight / 3; // Each division gets equal share
        
        if (!milestoneUpdate.timelineWeight) {
          milestoneUpdate.timelineWeight = divisionWeight;
        }
        if (!milestoneUpdate.budgetWeight) {
          milestoneUpdate.budgetWeight = divisionWeight;
        }
        if (!milestoneUpdate.physicalWeight) {
          milestoneUpdate.physicalWeight = divisionWeight;
        }
        
        // Add approval/rejection details
        milestoneUpdate.divisionComments = milestoneUpdate.divisionComments || {};
        milestoneUpdate.divisionComments[divisionType] = comments;
        milestoneUpdate.validatedBy = validatedBy || 'secretariat';
        milestoneUpdate.validatedAt = new Date().toISOString();

        // Update the project update with the modified milestone updates
        await projectUpdate.update({
          milestoneUpdates: JSON.stringify(milestoneUpdates)
        });

        // Also update the actual ProjectMilestone record with division statuses
        // Find the milestone by milestoneId, title, or from projectUpdate
        let actualMilestone = null;
        const milestoneId = milestoneUpdate.milestoneId;
        const milestoneTitle = milestoneUpdate.milestoneTitle || milestoneUpdate.title;
        
        if (milestoneId) {
          actualMilestone = await ProjectMilestone.findByPk(milestoneId);
        } else if (milestoneTitle) {
          // Try to find by title
          actualMilestone = await ProjectMilestone.findOne({
            where: {
              projectId: projectId,
              title: milestoneTitle
            }
          });
        }
        
        if (actualMilestone) {
          const updateData = {};
          if (divisionType === 'timeline') {
            updateData.timelineStatus = approved ? 'approved' : 'rejected';
          } else if (divisionType === 'budget') {
            updateData.budgetStatus = approved ? 'approved' : 'rejected';
          } else if (divisionType === 'physical') {
            updateData.physicalStatus = approved ? 'approved' : 'rejected';
          }
          
          // Get current statuses after update
          const newTimelineStatus = updateData.timelineStatus || actualMilestone.timelineStatus;
          const newBudgetStatus = updateData.budgetStatus || actualMilestone.budgetStatus;
          const newPhysicalStatus = updateData.physicalStatus || actualMilestone.physicalStatus;
          
          // If all divisions are now approved, mark milestone as completed
          if (newTimelineStatus === 'approved' && 
              newBudgetStatus === 'approved' && 
              newPhysicalStatus === 'approved') {
            updateData.status = 'completed';
            if (!actualMilestone.completedDate) {
              updateData.completedDate = new Date();
            }
          }
          
          await actualMilestone.update(updateData);
          console.log(`✅ Updated ProjectMilestone ${actualMilestone.id} (${actualMilestone.title}) with ${divisionType} division status: ${approved ? 'approved' : 'rejected'}`);
        } else {
          console.warn(`⚠️ Could not find ProjectMilestone for update - milestoneId: ${milestoneId}, title: ${milestoneTitle}`);
        }

        // Check if all divisions have verdicts and calculate overall progress
        const timelineStatus = milestoneUpdate.timelineStatus || 'pending';
        const budgetStatus = milestoneUpdate.budgetStatus || 'pending';
        const physicalStatus = milestoneUpdate.physicalStatus || 'pending';
        
        const allDivisionsHaveVerdicts = timelineStatus !== 'pending' && budgetStatus !== 'pending' && physicalStatus !== 'pending';
        
        if (allDivisionsHaveVerdicts) {
          // Calculate overall progress based on approved divisions
          let approvedWeight = 0;
          let totalWeight = 0;
          
          if (timelineStatus === 'approved') {
            approvedWeight += milestoneUpdate.timelineWeight || 0;
          }
          if (budgetStatus === 'approved') {
            approvedWeight += milestoneUpdate.budgetWeight || 0;
          }
          if (physicalStatus === 'approved') {
            approvedWeight += milestoneUpdate.physicalWeight || 0;
          }
          
          totalWeight = (milestoneUpdate.timelineWeight || 0) + (milestoneUpdate.budgetWeight || 0) + (milestoneUpdate.physicalWeight || 0);
          
          // Calculate overall progress percentage
          const overallProgress = totalWeight > 0 ? (approvedWeight / totalWeight) * 100 : 0;
          
          // Update milestone progress
          milestoneUpdate.overallProgress = Math.round(overallProgress * 100) / 100;
          milestoneUpdate.secretariatReviewComplete = true;
          milestoneUpdate.secretariatReviewDate = new Date().toISOString();
          
          // Update the project update with final progress
          await projectUpdate.update({
            milestoneUpdates: JSON.stringify(milestoneUpdates),
            status: 'secretariat_review_complete'
          });

          // Update project overall progress
          const project = await Project.findByPk(projectId);
          if (project) {
            // Calculate project-level progress based on all milestones
            const allMilestones = await ProjectMilestone.findAll({
              where: { projectId: projectId }
            });
            
            let projectTotalProgress = 0;
            let milestoneCount = 0;
            
            for (const milestone of allMilestones) {
              if (milestone.progress !== null && milestone.progress !== undefined) {
                projectTotalProgress += milestone.progress;
                milestoneCount++;
              }
            }
            
            const averageProgress = milestoneCount > 0 ? projectTotalProgress / milestoneCount : 0;
            
            await project.update({
              overallProgress: Math.round(averageProgress * 100) / 100,
              workflowStatus: 'secretariat_review_complete',
              secretariatApprovalDate: new Date(), // Set the current date when all divisions have verdicts
              secretariatApprovedBy: req.user.id
            });
            
            // Check if all milestones are completed after division approval
            const ProjectCompletionService = require('../services/projectCompletionService');
            const completionResult = await ProjectCompletionService.checkAndUpdateProjectCompletion(projectId, project);
            
            if (completionResult.wasUpdated) {
              console.log(`✅ Project ${project.projectCode} marked as completed after division approval`);
            }
          }
        }
      }
    }

    // Log the activity
    await logActivity(req.user.id, `${approved ? 'Approved' : 'Rejected'} ${divisionType} division`, 'ProjectUpdate', projectUpdate.id, {
      updateId: updateId,
      division: divisionType,
      approved: approved,
      comments: comments,
      validatedBy: validatedBy || 'secretariat'
    });

    // Create notification for Implementing Office
    await createNotificationForRole('iu_implementing_office', {
      title: `${divisionType.charAt(0).toUpperCase() + divisionType.slice(1)} Division ${approved ? 'Approved' : 'Rejected'}`,
      message: `The ${divisionType} division has been ${approved ? 'approved' : 'rejected'}. ${comments ? `Comments: ${comments}` : ''}`,
      type: 'division_approval',
      projectId: projectId,
      priority: 'medium'
    });

    res.json({
      success: true,
      message: `${divisionType} division ${approved ? 'approved' : 'rejected'} successfully`,
      update: {
        id: projectUpdate.id,
        division: divisionType,
        status: approved ? 'approved' : 'rejected'
      }
    });

  } catch (error) {
    console.error('Error approving/rejecting division:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve/reject division'
    });
  }
});



// Request revision for specific division
router.post('/division-revision', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { updateId, division, requirements, requestedBy } = req.body;

    if (!updateId || !division || !requirements || requirements.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Update ID, division, and revision requirements are required'
      });
    }

    // Find the project update
    const projectUpdate = await ProjectUpdate.findByPk(updateId);
    if (!projectUpdate) {
      return res.status(404).json({
        success: false,
        error: 'Project update not found'
      });
    }

    // Parse milestone updates to update specific division status
    let milestoneUpdates = [];
    try {
      milestoneUpdates = typeof projectUpdate.milestoneUpdates === 'string' 
        ? JSON.parse(projectUpdate.milestoneUpdates) 
        : projectUpdate.milestoneUpdates || [];
    } catch (error) {
      console.error('Error parsing milestone updates:', error);
      milestoneUpdates = [];
    }

    // Update the specific division status
    if (milestoneUpdates.length > 0) {
      const milestoneUpdate = milestoneUpdates[0]; // Get the first milestone update
      
      // Set the division status to revision_requested
      const divisionStatusField = `${division}Status`;
      milestoneUpdate[divisionStatusField] = 'revision_requested';
      
      // Add revision details
      milestoneUpdate.revisionRequirements = milestoneUpdate.revisionRequirements || {};
      milestoneUpdate.revisionRequirements[division] = requirements;
      milestoneUpdate.revisionRequestedBy = requestedBy || 'secretariat';
      milestoneUpdate.revisionRequestedAt = new Date().toISOString();

      // Update the project update with the modified milestone updates
      await projectUpdate.update({
        milestoneUpdates: JSON.stringify(milestoneUpdates)
      });
    }

    // Log the activity
    await logActivity(req.user.id, `Requested ${division} division revision`, 'ProjectUpdate', updateId, {
      division: division,
      requirements: requirements,
      requestedBy: requestedBy || 'secretariat'
    });

    // Create notification for Implementing Office
    await createNotificationForRole('iu_implementing_office', {
      title: `${division.charAt(0).toUpperCase() + division.slice(1)} Division Revision Requested`,
      message: `Revision has been requested for the ${division} division. Please review the requirements and resubmit.`,
      type: 'division_revision_request',
      projectId: projectUpdate.projectId,
      priority: 'high'
    });

    res.json({
      success: true,
      message: `${division} division revision request submitted successfully`,
      update: {
        id: projectUpdate.id,
        division: division,
        status: 'revision_requested'
      }
    });

  } catch (error) {
    console.error('Error requesting division revision:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request division revision'
    });
  }
});

// ============================================================================
// COMPILED REPORTS ENDPOINTS
// ============================================================================

// Get all compiled reports (reports that have been exported/saved)
router.get('/compiled-reports', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    console.log('Fetching compiled reports...');
    
    const compiledReports = await ProjectValidation.findAll({
      where: {
        status: 'approved',
        reportType: 'milestone_report'
      },
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'eiuPersonnel',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['validatedAt', 'DESC']]
    });

    console.log(`Found ${compiledReports.length} compiled reports`);

    // Transform the data for frontend compatibility
    const transformedReports = compiledReports.map(report => {
      const reportContent = report.validationChecklist || {};
      return {
        id: report.id,
        projectId: report.projectId,
        projectCode: reportContent.projectInfo?.projectCode || report.project?.projectCode,
        name: reportContent.projectInfo?.name || report.project?.name,
        implementingOfficeName: reportContent.projectInfo?.implementingOffice || report.project?.implementingOffice?.name,
        eiuPersonnelName: reportContent.projectInfo?.eiuPersonnel || report.project?.eiuPersonnel?.name,
        totalBudget: reportContent.projectInfo?.totalBudget || report.project?.totalBudget,
        startDate: reportContent.projectInfo?.startDate || report.project?.startDate,
        endDate: reportContent.projectInfo?.endDate || report.project?.endDate,
        overallProgress: reportContent.progress?.overallProgress || report.project?.overallProgress,
        workflowStatus: reportContent.workflow?.workflowStatus || report.project?.workflowStatus,
        secretariatApprovalDate: reportContent.workflow?.secretariatApprovalDate || report.project?.secretariatApprovalDate,
        secretariatApprovedBy: reportContent.workflow?.secretariatApprovedBy || report.project?.secretariatApprovedBy,
        compiledAt: report.validatedAt,
        compiledBy: report.validatedBy,
        validator: report.validator?.name,
        reportContent: reportContent
      };
    });

    res.json({
      success: true,
      compiledReports: transformedReports
    });

  } catch (error) {
    console.error('Error fetching compiled reports:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // Return empty array instead of 500 error when no reports found
    res.json({
      success: true,
      compiledReports: []
    });
  }
});

// Get specific compiled report details
router.get('/compiled-reports/:reportId', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await ProjectValidation.findByPk(reportId, {
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'eiuPersonnel',
              attributes: ['id', 'name', 'email']
            },
            {
              model: ProjectUpdate,
              where: {
                status: { [Op.in]: ['iu_approved', 'secretariat_approved'] }
              },
              required: false,
              include: [
                {
                  model: User,
                  as: 'submitter',
                  attributes: ['id', 'name', 'email']
                }
              ],
              order: [['createdAt', 'DESC']]
            },
            {
              model: ProjectMilestone,
              as: 'milestones',
              attributes: ['id', 'title', 'description', 'dueDate', 'status', 'progress', 'weight']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Compiled report not found'
      });
    }

    // Parse the report content
    const reportContent = report.validationChecklist || {};

    res.json({
      success: true,
      report: {
        ...report.toJSON(),
        reportContent: reportContent
      }
    });

  } catch (error) {
    console.error('Error fetching compiled report details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compiled report details'
    });
  }
});

// Download compiled report as Word document
router.get('/compiled-reports/:reportId/download', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await ProjectValidation.findByPk(reportId, {
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'implementingOffice',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'eiuPersonnel',
              attributes: ['id', 'name', 'email']
            },
            {
              model: ProjectUpdate,
              where: {
                status: { [Op.in]: ['iu_approved', 'secretariat_approved'] }
              },
              required: false,
              include: [
                {
                  model: User,
                  as: 'submitter',
                  attributes: ['id', 'name', 'email']
                }
              ],
              order: [['createdAt', 'DESC']]
            },
            {
              model: ProjectMilestone,
              as: 'milestones',
              attributes: ['id', 'title', 'description', 'dueDate', 'status', 'progress', 'weight']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Compiled report not found'
      });
    }

    // Parse the report content
    const reportContent = JSON.parse(report.reportContent || '{}');
    const project = report.project;

    // Generate Word document content
    const docx = require('docx');
    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "OFFICIAL MILESTONE REPORT",
                bold: true,
                size: 32,
                font: "Arial"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "MPMEC Secretariat - Compiled Report",
                size: 24,
                font: "Arial"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          
          // Project Information Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "PROJECT INFORMATION", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Code" })] }),
                  new TableCell({ children: [new Paragraph({ text: report.projectCode })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Name" })] }),
                  new TableCell({ children: [new Paragraph({ text: report.name })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Implementing Office" })] }),
                  new TableCell({ children: [new Paragraph({ text: report.implementingOffice?.name || 'Not assigned' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Period" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${new Date(report.startDate).toLocaleDateString()} to ${new Date(report.endDate).toLocaleDateString()}` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Total Budget" })] }),
                  new TableCell({ children: [new Paragraph({ text: `₱${parseFloat(report.totalBudget).toLocaleString()}` })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Project Description
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "PROJECT DESCRIPTION", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: report.description || 'No description provided' })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Current Progress
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "CURRENT PROGRESS", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Overall Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Timeline Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Physical Progress" })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: `${report.overallProgress}%` })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.timelineProgress}%` })] }),
                  new TableCell({ children: [new Paragraph({ text: `${report.physicalProgress}%` })] })
                ]
              })
            ]
          }),
          
          new Paragraph({ spacing: { after: 400 } }),
          
          // Secretariat Verdict
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "SECRETARIAT VERDICT", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "E8F5E8" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Approval Date" })] }),
                  new TableCell({ children: [new Paragraph({ text: new Date(report.secretariatApprovalDate).toLocaleDateString() })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Status" })] }),
                  new TableCell({ children: [new Paragraph({ text: "APPROVED" })] })
                ]
              })
            ]
          })
        ]
      }]
    });

    // Generate the document buffer
    const buffer = await docx.Packer.toBuffer(doc);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Compiled_Report_${report.projectCode}_${new Date().toISOString().split('T')[0]}.docx"`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Error generating Word document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Word document'
    });
  }
});

// Save compiled report (called when Export button is clicked)
router.post('/:projectId/save-compiled-report', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Update project to mark as compiled and save approval date
    await project.update({
      workflowStatus: 'compiled_for_secretariat',
      secretariatApprovalDate: new Date(),
      secretariatApprovedBy: req.user.id
    });

    // Log the activity
    await logActivity(req.user.id, 'Exported and saved compiled report', 'Project', projectId, {
      exportedBy: req.user.name,
      exportDate: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Compiled report saved successfully',
      project: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        secretariatApprovalDate: project.secretariatApprovalDate
      }
    });

  } catch (error) {
    console.error('Error saving compiled report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save compiled report'
    });
  }
});

// Test endpoint to check project statuses
router.get('/test-project-statuses', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const projects = await Project.findAll({
      attributes: ['id', 'projectCode', 'name', 'workflowStatus', 'secretariatApprovalDate', 'approvedBySecretariat'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      projects: projects
    });

  } catch (error) {
    console.error('Error fetching project statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project statuses'
    });
  }
});

// Download compiled report as Excel document
router.get('/compiled-reports/:reportId/download-excel', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log('🔍 Excel Export Debug - Starting export for report ID:', reportId);

    // Get the basic report first
    const report = await ProjectValidation.findByPk(reportId, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'projectCode', 'name', 'location', 'status', 'description', 'startDate', 'endDate', 'totalBudget', 'category', 'targetBeneficiaries', 'expectedOutputs', 'createdAt']
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!report) {
      console.log('❌ Excel Export Debug - Report not found');
      return res.status(404).json({
        success: false,
        error: 'Compiled report not found'
      });
    }

    console.log('🔍 Excel Export Debug - Report found, parsing content');

    // Parse the report content with better error handling
    let reportContent = {};
    try {
      reportContent = JSON.parse(report.validationChecklist || '{}');
      console.log('🔍 Excel Export Debug - Report content parsed successfully');
    } catch (parseError) {
      console.log('⚠️ Excel Export Debug - Failed to parse validationChecklist, using empty object');
      reportContent = {};
    }

    const project = report.project;
    console.log('🔍 Excel Export Debug - Project found:', project ? 'Yes' : 'No');

    // Get milestones and updates separately to avoid complex joins
    let milestones = [];
    let updates = [];
    
    if (project) {
      try {
        milestones = await ProjectMilestone.findAll({
          where: { projectId: project.id },
          order: [['order', 'ASC']],
          attributes: ['id', 'title', 'description', 'order', 'weight', 'startDate', 'endDate', 'status', 'progress']
        });
        console.log('🔍 Excel Export Debug - Milestones found:', milestones.length);
        
        updates = await ProjectUpdate.findAll({
          where: { projectId: project.id },
          order: [['submittedAt', 'DESC']],
          attributes: ['id', 'title', 'description', 'milestoneId', 'submittedBy', 'submittedAt', 'status', 'activitiesDeliverables', 'budgetUsed', 'budgetBreakdown', 'progressRequirements', 'proofFiles']
        });
        console.log('🔍 Excel Export Debug - Updates found:', updates.length);
      } catch (queryError) {
        console.log('⚠️ Excel Export Debug - Error fetching milestones/updates:', queryError.message);
      }
    }

    // Generate Excel document
    console.log('🔍 Excel Export Debug - Loading ExcelJS library');
    const ExcelJS = require('exceljs');
    console.log('🔍 Excel Export Debug - ExcelJS loaded successfully');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('MILESTONE REPORT');
    console.log('🔍 Excel Export Debug - Workbook and worksheet created');

    // Set up professional styling
    const headerStyle = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    };

    const subHeaderStyle = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    };

    const labelStyle = {
      font: { bold: true, size: 10, color: { argb: 'FF000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    };

    const dataStyle = {
      font: { size: 11, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    };

    let currentRow = 1;

    // Main Header
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'REPUBLIC OF THE PHILIPPINES';
    worksheet.getCell(`A${currentRow}`).style = headerStyle;
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'PROVINCE OF LAGUNA';
    worksheet.getCell(`A${currentRow}`).style = headerStyle;
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'MUNICIPALITY OF SANTA CRUZ';
    worksheet.getCell(`A${currentRow}`).style = headerStyle;
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'OFFICIAL MILESTONE REPORT';
    worksheet.getCell(`A${currentRow}`).style = headerStyle;
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'MPMEC Secretariat - Compiled Report';
    worksheet.getCell(`A${currentRow}`).style = { ...headerStyle, font: { ...headerStyle.font, size: 12 } };
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = `Report Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;
    worksheet.getCell(`A${currentRow}`).style = { ...headerStyle, font: { ...headerStyle.font, size: 10 } };
    currentRow += 2;

    // SECTION 1: PROJECT INFORMATION
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'SECTION 1: PROJECT INFORMATION';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;
    currentRow++;

    // Project Information Table with safe data access
    const projectInfoData = [
      ['Project Code', project?.projectCode || 'N/A'],
      ['Project Name', project?.name || 'N/A'],
      ['Location', project?.location || 'N/A'],
      ['Status', project?.status || 'N/A'],
      ['Project Created', project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'],
      ['Category', project?.category || 'N/A'],
      ['Project Period', project?.startDate && project?.endDate ? `${new Date(project.startDate).toLocaleDateString()} to ${new Date(project.endDate).toLocaleDateString()}` : 'N/A'],
      ['Total Budget', `₱${parseFloat(project?.totalBudget || 0).toLocaleString()}`],
      ['Description', project?.description || 'N/A'],
      ['Target Beneficiaries', project?.targetBeneficiaries || 'Not specified'],
      ['Expected Output', project?.expectedOutputs || 'Not specified'],
      ['Implementing Partner', 'Not specified']
    ];

    projectInfoData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).style = labelStyle;
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`B${currentRow}`).style = dataStyle;
      currentRow++;
    });

    currentRow += 2;

    // SECTION 2: CURRENT PROGRESS
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'SECTION 2: CURRENT PROGRESS';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;
    currentRow++;

    const progressData = [
      ['Overall Progress', `${reportContent?.progress?.overallProgress || reportContent?.overallProgress || 13.33}%`],
      ['Timeline Progress', `${reportContent?.progress?.timelineProgress || 13.33}%`],
      ['Budget Progress', `${reportContent?.progress?.budgetProgress || 0}%`],
      ['Physical Progress', `${reportContent?.progress?.physicalProgress || 0}%`]
    ];

    progressData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).style = labelStyle;
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`B${currentRow}`).style = dataStyle;
      currentRow++;
    });

    currentRow += 2;

    // SECTION 3: COMPILED REPORT SUMMARY
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'SECTION 3: COMPILED REPORT SUMMARY FROM IMPLEMENTING OFFICE';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;
    currentRow++;

    const summaryData = [
      ['Report Title', reportContent?.latestUpdate?.title || 'Milestone Update Report'],
      ['Submitted By', reportContent?.latestUpdate?.submittedBy || 'EIU Personnel'],
      ['Submitted At', reportContent?.latestUpdate?.submittedAt ? new Date(reportContent.latestUpdate.submittedAt).toLocaleString() : 'N/A'],
      ['Status', reportContent?.latestUpdate?.status || 'Submitted'],
      ['Report Summary', reportContent?.latestUpdate?.description || 'No detailed report summary available']
    ];

    summaryData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).style = labelStyle;
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`B${currentRow}`).style = dataStyle;
      currentRow++;
    });

    currentRow += 2;

    // SECTION 4: MILESTONE UPDATES & 3-DIVISION INFORMATION
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'SECTION 4: MILESTONE UPDATES & 3-DIVISION INFORMATION';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;
    currentRow++;

    // Comprehensive milestone section with 3-division information
    if (reportContent?.milestones && reportContent.milestones.length > 0) {
      reportContent.milestones.forEach((milestone, index) => {
        // Milestone Header
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = `Milestone ${index + 1}: ${milestone.milestoneTitle || 'Project Milestone'}`;
        worksheet.getCell(`A${currentRow}`).style = { ...subHeaderStyle, font: { ...subHeaderStyle.font, size: 11 } };
        currentRow++;

        // Basic milestone information
        const milestoneData = [
          ['Title', milestone.milestoneTitle || 'N/A'],
          ['Weight', `${milestone.timelineWeight || 0}%`],
          ['Status', milestone.timelineStatus || 'N/A']
        ];

        milestoneData.forEach(([label, value]) => {
          worksheet.getCell(`A${currentRow}`).value = label;
          worksheet.getCell(`A${currentRow}`).style = labelStyle;
          worksheet.getCell(`B${currentRow}`).value = value;
          worksheet.getCell(`B${currentRow}`).style = dataStyle;
          currentRow++;
        });

        // Timeline Division Information
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Timeline Division';
        worksheet.getCell(`A${currentRow}`).style = { ...labelStyle, font: { ...labelStyle.font, size: 12 } };
        currentRow++;

        const timelineData = [
          ['Weight', `${milestone.timelineWeight || 0}%`],
          ['Planned Start', milestone.timelinePlannedStart ? new Date(milestone.timelinePlannedStart).toLocaleDateString() : 'N/A'],
          ['Planned Due', milestone.timelinePlannedDue ? new Date(milestone.timelinePlannedDue).toLocaleDateString() : 'N/A'],
          ['Status', milestone.timelineStatus || 'N/A'],
          ['Secretariat Verdict', milestone.timelineVerdict || 'N/A'],
          ['Description', milestone.timelineDescription || 'N/A'],
          ['Activities', milestone.timelineActivities || 'N/A'],
          ['Remarks', milestone.timelineRemarks || 'N/A']
        ];

        timelineData.forEach(([label, value]) => {
          worksheet.getCell(`A${currentRow}`).value = label;
          worksheet.getCell(`A${currentRow}`).style = labelStyle;
          worksheet.getCell(`B${currentRow}`).value = value;
          worksheet.getCell(`B${currentRow}`).style = dataStyle;
          currentRow++;
        });

        // Budget Division Information
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Budget Division';
        worksheet.getCell(`A${currentRow}`).style = { ...labelStyle, font: { ...labelStyle.font, size: 12 } };
        currentRow++;

        const budgetData = [
          ['Weight', `${milestone.budgetWeight || 0}%`],
          ['Planned Budget', milestone.budgetPlanned ? `₱${parseFloat(milestone.budgetPlanned).toLocaleString()}` : 'N/A'],
          ['Status', milestone.budgetStatus || 'N/A'],
          ['Secretariat Verdict', milestone.budgetVerdict || 'N/A'],
          ['Description', milestone.budgetDescription || 'N/A'],
          ['Remarks', milestone.budgetRemarks || 'N/A']
        ];

        budgetData.forEach(([label, value]) => {
          worksheet.getCell(`A${currentRow}`).value = label;
          worksheet.getCell(`A${currentRow}`).style = labelStyle;
          worksheet.getCell(`B${currentRow}`).value = value;
          worksheet.getCell(`B${currentRow}`).style = dataStyle;
          currentRow++;
        });

        // Physical Division Information
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Physical Division';
        worksheet.getCell(`A${currentRow}`).style = { ...labelStyle, font: { ...labelStyle.font, size: 12 } };
        currentRow++;

        const physicalData = [
          ['Weight', `${milestone.physicalWeight || 0}%`],
          ['Proof Type', milestone.physicalProofType || 'N/A'],
          ['Status', milestone.physicalStatus || 'N/A'],
          ['Secretariat Verdict', milestone.physicalVerdict || 'N/A'],
          ['Description', milestone.physicalDescription || 'N/A'],
          ['Requirements', milestone.physicalRequirements || 'N/A']
        ];

        physicalData.forEach(([label, value]) => {
          worksheet.getCell(`A${currentRow}`).value = label;
          worksheet.getCell(`A${currentRow}`).style = labelStyle;
          worksheet.getCell(`B${currentRow}`).value = value;
          worksheet.getCell(`B${currentRow}`).style = dataStyle;
          currentRow++;
        });

        // Supporting Documents
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Supporting Documents';
        worksheet.getCell(`A${currentRow}`).style = { ...labelStyle, font: { ...labelStyle.font, size: 12 } };
        currentRow++;

        if (milestone.uploadedFiles && milestone.uploadedFiles.length > 0) {
          milestone.uploadedFiles.forEach((file, fileIndex) => {
            worksheet.getCell(`A${currentRow}`).value = `File ${fileIndex + 1}`;
            worksheet.getCell(`A${currentRow}`).style = labelStyle;
            worksheet.getCell(`B${currentRow}`).value = file.name || 'N/A';
            worksheet.getCell(`B${currentRow}`).style = dataStyle;
            currentRow++;
          });
        } else {
          worksheet.getCell(`A${currentRow}`).value = 'No supporting documents uploaded';
          worksheet.getCell(`A${currentRow}`).style = dataStyle;
          currentRow++;
        }

        currentRow += 2; // Space between milestones
      });
    } else {
      // No milestones found
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = 'No milestone data available';
      worksheet.getCell(`A${currentRow}`).style = dataStyle;
      currentRow++;
    }

    currentRow += 2;

    // SECTION 5: SECRETARIAT VERDICT
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'SECTION 5: SECRETARIAT VERDICT';
    worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;
    currentRow++;

    const verdictData = [
      ['Verdict Date', new Date(report.validatedAt).toLocaleDateString()],
      ['Overall Status', reportContent?.workflow?.status || 'Pending'],
      ['Validated By', report.validator?.name || 'Secretariat Admin'],
      ['Validated At', new Date(report.validatedAt).toLocaleString()]
    ];

    verdictData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).style = labelStyle;
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`B${currentRow}`).style = dataStyle;
      currentRow++;
    });

    currentRow += 2;

    // FOOTER
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'This is an official document generated by the MPMEC Secretariat';
    worksheet.getCell(`A${currentRow}`).style = { 
      font: { bold: true, size: 10, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
    };
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'For inquiries, contact the MPMEC Secretariat Office';
    worksheet.getCell(`A${currentRow}`).style = { 
      font: { size: 9, color: { argb: 'FF666666' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = `Document ID: ${reportId} | Generated on: ${new Date().toLocaleString()}`;
    worksheet.getCell(`A${currentRow}`).style = { 
      font: { size: 8, color: { argb: 'FF999999' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Set column widths for better readability
    worksheet.getColumn('A').width = 25;
    worksheet.getColumn('B').width = 60;
    worksheet.getColumn('C').width = 15;
    worksheet.getColumn('D').width = 15;
    worksheet.getColumn('E').width = 15;
    worksheet.getColumn('F').width = 15;
    worksheet.getColumn('G').width = 15;
    worksheet.getColumn('H').width = 15;

    console.log('🔍 Excel Export Debug - Generating Excel buffer');

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    console.log('🔍 Excel Export Debug - Excel buffer generated successfully');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Milestone_Report_${project?.projectCode || reportId}_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    res.send(buffer);

    console.log('✅ Excel Export Debug - Excel file sent successfully');

  } catch (error) {
    console.error('❌ Excel Export Debug - Error generating Excel document:', error);
    console.error('❌ Excel Export Debug - Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel document',
      details: error.message
    });
  }
});

// Simplified Word export endpoint
router.get('/compiled-reports/:reportId/download-word', authenticateToken, requireRole(['LGU-PMT']), async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log('🔍 Word Export Debug - Starting export for report ID:', reportId);

    // Get the basic report first
    const report = await ProjectValidation.findByPk(reportId, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'projectCode', 'name', 'location', 'status', 'description', 'startDate', 'endDate', 'totalBudget', 'category', 'targetBeneficiaries', 'expectedOutputs', 'createdAt']
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!report) {
      console.log('❌ Word Export Debug - Report not found');
      return res.status(404).json({
        success: false,
        error: 'Compiled report not found'
      });
    }

    console.log('🔍 Word Export Debug - Report found, parsing content');

    // Parse the report content with better error handling
    let reportContent = {};
    try {
      reportContent = JSON.parse(report.validationChecklist || '{}');
      console.log('🔍 Word Export Debug - Report content parsed successfully');
    } catch (parseError) {
      console.log('⚠️ Word Export Debug - Failed to parse validationChecklist, using empty object');
      reportContent = {};
    }

    const project = report.project;
    console.log('🔍 Word Export Debug - Project found:', project ? 'Yes' : 'No');

    // Generate Word document content
    console.log('🔍 Word Export Debug - Loading docx library');
    const docx = require('docx');
    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;
    console.log('🔍 Word Export Debug - Docx library loaded successfully');

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "OFFICIAL MILESTONE REPORT",
                bold: true,
                size: 32,
                font: "Arial"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "MPMEC Secretariat - Compiled Report",
                size: 24,
                font: "Arial"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          
          // Project Information Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "PROJECT INFORMATION", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Code" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.projectCode || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Name" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.name || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Location" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.location || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Status" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.status || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Project Period" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.startDate && project?.endDate ? `${new Date(project.startDate).toLocaleDateString()} to ${new Date(project.endDate).toLocaleDateString()}` : 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Total Budget" })] }),
                  new TableCell({ children: [new Paragraph({ text: `₱${parseFloat(project?.totalBudget || 0).toLocaleString()}` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Description" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.description || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Target Beneficiaries" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.targetBeneficiaries || 'Not specified' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Expected Output" })] }),
                  new TableCell({ children: [new Paragraph({ text: project?.expectedOutputs || 'Not specified' })] })
                ]
              })
            ]
          }),

          // Current Progress Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "CURRENT PROGRESS", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Overall Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${reportContent?.progress?.overallProgress || reportContent?.overallProgress || 13.33}%` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Timeline Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${reportContent?.progress?.timelineProgress || 13.33}%` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Budget Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${reportContent?.progress?.budgetProgress || 0}%` })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Physical Progress" })] }),
                  new TableCell({ children: [new Paragraph({ text: `${reportContent?.progress?.physicalProgress || 0}%` })] })
                ]
              })
            ]
          }),

          // Secretariat Verdict Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "SECRETARIAT VERDICT", bold: true })],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { fill: "F2F2F2" }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Verdict Date" })] }),
                  new TableCell({ children: [new Paragraph({ text: new Date(report.validatedAt).toLocaleDateString() })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Validated By" })] }),
                  new TableCell({ children: [new Paragraph({ text: report.validator?.name || 'Secretariat Admin' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Validated At" })] }),
                  new TableCell({ children: [new Paragraph({ text: new Date(report.validatedAt).toLocaleString() })] })
                ]
              })
            ]
          })
        ]
      }]
    });

    console.log('🔍 Word Export Debug - Generating Word buffer');

    // Generate the document buffer
    const buffer = await docx.Packer.toBuffer(doc);
    
    console.log('🔍 Word Export Debug - Word buffer generated successfully');

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Compiled_Report_${project?.projectCode || reportId}_${new Date().toISOString().split('T')[0]}.docx"`);
    
    res.send(buffer);

    console.log('✅ Word Export Debug - Word file sent successfully');

  } catch (error) {
    console.error('❌ Word Export Debug - Error generating Word document:', error);
    console.error('❌ Word Export Debug - Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Word document',
      details: error.message
    });
  }
});

// ========================================
// DELAYED STATUS MANAGEMENT ENDPOINTS
// ========================================

const delayedStatusService = require('../services/delayedStatusService');

// Check if a specific project has delayed status
router.get('/:id/delayed-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const delayCheck = await delayedStatusService.checkProjectDelayedStatus(id);
    
    res.json({
      success: true,
      projectId: id,
      isDelayed: delayCheck.isDelayed,
      delayInfo: delayCheck.delayInfo,
      overdueMilestones: delayCheck.overdueMilestones
    });
    
  } catch (error) {
    console.error('Error checking project delayed status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check delayed status'
    });
  }
});

// Update project delayed status (manual trigger)
router.post('/:id/update-delayed-status', authenticateToken, requireRole(['admin', 'LGU-PMT']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await delayedStatusService.updateProjectDelayedStatus(id);
    
    if (result.statusChanged && result.currentStatus === 'delayed') {
      // Create delay notification record
      await delayedStatusService.createDelayedStatusUpdate(
        id, 
        result.delayInfo, 
        result.overdueMilestones
      );
    }
    
    res.json({
      success: true,
      message: result.statusChanged 
        ? `Project status updated from ${result.previousStatus} to ${result.currentStatus}`
        : 'No status change needed',
      result
    });
    
  } catch (error) {
    console.error('Error updating project delayed status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delayed status'
    });
  }
});

// Check all projects for delayed status (admin only)
router.post('/check-all-delayed', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await delayedStatusService.checkAllProjectsForDelays();
    
    res.json({
      success: true,
      message: `Checked ${result.checkedProjects} projects, updated ${result.updatedProjects}, newly delayed: ${result.newlyDelayedProjects}`,
      result
    });
    
  } catch (error) {
    console.error('Error checking all projects for delays:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check all projects for delays'
    });
  }
});

// ============================================
// PROJECT NOTES ENDPOINTS
// ============================================

// Get all notes for a project
router.get('/:projectId/notes', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Fetch project without notes field to avoid SQL error if column doesn't exist
    const project = await Project.findByPk(projectId, {
      attributes: { exclude: ['notes'] }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Try to get notes using raw query to check if column exists
    let notes = [];
    try {
      const sequelize = Project.sequelize;
      const results = await sequelize.query(
        `SELECT notes FROM projects WHERE id = :projectId`,
        {
          replacements: { projectId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (results && results.length > 0 && results[0] && results[0].notes !== null && results[0].notes !== undefined) {
        try {
          const notesData = results[0].notes;
          notes = typeof notesData === 'string' ? JSON.parse(notesData) : notesData;
          if (!Array.isArray(notes)) {
            notes = [];
          }
        } catch (e) {
          notes = [];
        }
      }
    } catch (e) {
      // Column doesn't exist yet, return empty array
      // Check if error is about missing column
      if (e.message && (e.message.includes('doesn\'t exist') || e.message.includes('Unknown column') || e.message.includes('column "notes" does not exist'))) {
        console.log('Notes column does not exist yet, returning empty array');
      } else {
        console.error('Error fetching notes:', e);
      }
      notes = [];
    }
    
    res.json({
      success: true,
      notes: notes
    });
  } catch (error) {
    console.error('Error fetching project notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project notes'
    });
  }
});

// Create a new note for a project
router.post('/:projectId/notes', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, content, priority, tags } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    // Fetch project without notes field to avoid SQL error if column doesn't exist
    const project = await Project.findByPk(projectId, {
      attributes: { exclude: ['notes'] }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const user = await User.findByPk(req.user.id);
    
    // Try to get existing notes using raw query
    let notes = [];
    try {
      const sequelize = Project.sequelize;
      const results = await sequelize.query(
        `SELECT notes FROM projects WHERE id = :projectId`,
        {
          replacements: { projectId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (results && results.length > 0 && results[0] && results[0].notes !== null && results[0].notes !== undefined) {
        try {
          const notesData = results[0].notes;
          notes = typeof notesData === 'string' ? JSON.parse(notesData) : notesData;
          if (!Array.isArray(notes)) {
            notes = [];
          }
        } catch (e) {
          notes = [];
        }
      }
    } catch (e) {
      // Column doesn't exist yet, start with empty array
      console.log('Notes column does not exist yet, starting with empty array');
      notes = [];
    }
    
    const newNote = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      projectId: projectId,
      title: title.trim(),
      content: content.trim(),
      priority: priority || 'normal',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.id,
      createdByName: user ? user.name : 'Unknown',
      replies: [],
      reactions: {
        like: [],
        acknowledge: [],
        important: []
      }
    };

    notes.push(newNote);
    
    // Update project with new notes array
    // Use model update method which handles JSON columns properly
    try {
      await project.update({ 
        notes: notes,
        updatedAt: new Date()
      }, {
        fields: ['notes', 'updatedAt'] // Only update these fields
      });
    } catch (e) {
      // Log the actual error for debugging
      console.error('Error updating notes:', e.message);
      console.error('Error details:', e);
      
      // Check if it's a column doesn't exist error
      if (e.message && (e.message.includes('doesn\'t exist') || e.message.includes('Unknown column') || e.message.includes('column "notes" does not exist'))) {
        return res.status(500).json({
          success: false,
          error: 'Notes feature is not available yet. Please run database migration to add notes column.'
        });
      }
      
      // For other errors, return the actual error message
      return res.status(500).json({
        success: false,
        error: 'Failed to create note: ' + e.message
      });
    }
    
    // Log activity
    try {
      await logActivity(
        req.user.id,
        'create',
        'project_note',
        newNote.id,
        `Created note "${title}" for project: ${project.name}`
      );
    } catch (e) {
      // Log activity failure shouldn't break the response
      console.error('Error logging activity:', e);
    }

    res.json({
      success: true,
      note: newNote
    });
  } catch (error) {
    console.error('Error creating project note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project note: ' + error.message
    });
  }
});

// Update a note
router.put('/:projectId/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { projectId, noteId } = req.params;
    const { title, content, priority, tags } = req.body;
    
    // Fetch project without notes field
    const project = await Project.findByPk(projectId, {
      attributes: { exclude: ['notes'] }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get existing notes using raw query
    let notes = [];
    try {
      const sequelize = Project.sequelize;
      const results = await sequelize.query(
        `SELECT notes FROM projects WHERE id = :projectId`,
        {
          replacements: { projectId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (results && results.length > 0 && results[0] && results[0].notes !== null && results[0].notes !== undefined) {
        try {
          const notesData = results[0].notes;
          notes = typeof notesData === 'string' ? JSON.parse(notesData) : notesData;
          if (!Array.isArray(notes)) {
            notes = [];
          }
        } catch (e) {
          notes = [];
        }
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Notes feature is not available yet. Please run database migration to add notes column.'
      });
    }
    
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    // Update note
    notes[noteIndex] = {
      ...notes[noteIndex],
      title: title ? title.trim() : notes[noteIndex].title,
      content: content ? content.trim() : notes[noteIndex].content,
      priority: priority || notes[noteIndex].priority,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(t => t)) : notes[noteIndex].tags,
      updatedAt: new Date().toISOString()
    };

    // Update using model update method which handles JSON columns properly
    try {
      await project.update({ 
        notes: notes,
        updatedAt: new Date()
      }, {
        where: { id: projectId },
        fields: ['notes', 'updatedAt']
      });
    } catch (e) {
      console.error('Error updating notes:', e.message);
      if (e.message && (e.message.includes('doesn\'t exist') || e.message.includes('Unknown column'))) {
        return res.status(500).json({
          success: false,
          error: 'Notes feature is not available yet. Please run database migration to add notes column.'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update notes: ' + e.message
      });
    }
    
    // Log activity
    try {
      await logActivity(
        req.user.id,
        'update',
        'project_note',
        noteId,
        `Updated note "${notes[noteIndex].title}" for project: ${project.name}`
      );
    } catch (e) {
      console.error('Error logging activity:', e);
    }

    res.json({
      success: true,
      note: notes[noteIndex]
    });
  } catch (error) {
    console.error('Error updating project note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project note: ' + error.message
    });
  }
});

// Delete a note
router.delete('/:projectId/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { projectId, noteId } = req.params;
    
    // Fetch project without notes field
    const project = await Project.findByPk(projectId, {
      attributes: { exclude: ['notes'] }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get existing notes using raw query
    let notes = [];
    try {
      const sequelize = Project.sequelize;
      const results = await sequelize.query(
        `SELECT notes FROM projects WHERE id = :projectId`,
        {
          replacements: { projectId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (results && results.length > 0 && results[0] && results[0].notes !== null && results[0].notes !== undefined) {
        try {
          const notesData = results[0].notes;
          notes = typeof notesData === 'string' ? JSON.parse(notesData) : notesData;
          if (!Array.isArray(notes)) {
            notes = [];
          }
        } catch (e) {
          notes = [];
        }
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Notes feature is not available yet. Please run database migration to add notes column.'
      });
    }
    
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    const deletedNote = notes[noteIndex];
    notes.splice(noteIndex, 1);

    // Update using raw query
    try {
      const sequelize = Project.sequelize;
      await sequelize.query(
        `UPDATE projects SET notes = :notes, updatedAt = :updatedAt WHERE id = :projectId`,
        {
          replacements: {
            notes: JSON.stringify(notes),
            updatedAt: new Date(),
            projectId
          },
          type: sequelize.QueryTypes.UPDATE
        }
      );
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete note. Please run database migration to add notes column.'
      });
    }
    
    // Log activity
    try {
      await logActivity(
        req.user.id,
        'delete',
        'project_note',
        noteId,
        `Deleted note "${deletedNote.title}" for project: ${project.name}`
      );
    } catch (e) {
      console.error('Error logging activity:', e);
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project note: ' + error.message
    });
  }
});

// Add reply to a note
router.post('/:projectId/notes/:noteId/replies', authenticateToken, async (req, res) => {
  try {
    const { projectId, noteId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Reply content is required'
      });
    }

    // Fetch project without notes field
    const project = await Project.findByPk(projectId, {
      attributes: { exclude: ['notes'] }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get existing notes using raw query
    let notes = [];
    try {
      const sequelize = Project.sequelize;
      const results = await sequelize.query(
        `SELECT notes FROM projects WHERE id = :projectId`,
        {
          replacements: { projectId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (results && results.length > 0 && results[0] && results[0].notes !== null && results[0].notes !== undefined) {
        try {
          const notesData = results[0].notes;
          notes = typeof notesData === 'string' ? JSON.parse(notesData) : notesData;
          if (!Array.isArray(notes)) {
            notes = [];
          }
        } catch (e) {
          notes = [];
        }
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Notes feature is not available yet. Please run database migration to add notes column.'
      });
    }
    
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    const user = await User.findByPk(req.user.id);
    const reply = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      noteId: noteId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
      createdByName: user ? user.name : 'Unknown'
    };

    if (!notes[noteIndex].replies) {
      notes[noteIndex].replies = [];
    }
    notes[noteIndex].replies.push(reply);
    notes[noteIndex].updatedAt = new Date().toISOString();

    // Update using raw query
    try {
      const sequelize = Project.sequelize;
      // For MySQL JSON columns, we need to properly escape the JSON string
      // Using CAST to ensure MySQL treats it as JSON type
      const notesJson = JSON.stringify(notes);
      // Escape single quotes for SQL safety
      const escapedJson = notesJson.replace(/'/g, "''");
      await sequelize.query(
        `UPDATE projects SET notes = CAST('${escapedJson}' AS JSON), updatedAt = :updatedAt WHERE id = :projectId`,
        {
          replacements: {
            updatedAt: new Date(),
            projectId
          },
          type: sequelize.QueryTypes.UPDATE
        }
      );
    } catch (e) {
      console.error('Error updating notes:', e.message);
      if (e.message && (e.message.includes('doesn\'t exist') || e.message.includes('Unknown column'))) {
        return res.status(500).json({
          success: false,
          error: 'Notes feature is not available yet. Please run database migration to add notes column.'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to add reply: ' + e.message
      });
    }

    res.json({
      success: true,
      reply: reply
    });
  } catch (error) {
    console.error('Error adding reply to note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add reply: ' + error.message
    });
  }
});

// Add reaction to a note
router.post('/:projectId/notes/:noteId/reactions', authenticateToken, async (req, res) => {
  try {
    const { projectId, noteId } = req.params;
    const { reactionType } = req.body; // 'like', 'acknowledge', 'important'
    
    if (!reactionType || !['like', 'acknowledge', 'important'].includes(reactionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reaction type'
      });
    }

    // Fetch project without notes field
    const project = await Project.findByPk(projectId, {
      attributes: { exclude: ['notes'] }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get existing notes using raw query
    let notes = [];
    try {
      const sequelize = Project.sequelize;
      const results = await sequelize.query(
        `SELECT notes FROM projects WHERE id = :projectId`,
        {
          replacements: { projectId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (results && results.length > 0 && results[0] && results[0].notes !== null && results[0].notes !== undefined) {
        try {
          const notesData = results[0].notes;
          notes = typeof notesData === 'string' ? JSON.parse(notesData) : notesData;
          if (!Array.isArray(notes)) {
            notes = [];
          }
        } catch (e) {
          notes = [];
        }
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Notes feature is not available yet. Please run database migration to add notes column.'
      });
    }
    
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    if (!notes[noteIndex].reactions) {
      notes[noteIndex].reactions = {
        like: [],
        acknowledge: [],
        important: []
      };
    }

    const reactionList = notes[noteIndex].reactions[reactionType] || [];
    const hasReacted = reactionList.includes(req.user.id);
    
    if (hasReacted) {
      // Remove reaction
      notes[noteIndex].reactions[reactionType] = reactionList.filter(id => id !== req.user.id);
    } else {
      // Add reaction
      notes[noteIndex].reactions[reactionType] = [...reactionList, req.user.id];
    }
    
    notes[noteIndex].updatedAt = new Date().toISOString();

    // Update using raw query
    try {
      const sequelize = Project.sequelize;
      // For MySQL JSON columns, we need to properly escape the JSON string
      // Using CAST to ensure MySQL treats it as JSON type
      const notesJson = JSON.stringify(notes);
      // Escape single quotes for SQL safety
      const escapedJson = notesJson.replace(/'/g, "''");
      await sequelize.query(
        `UPDATE projects SET notes = CAST('${escapedJson}' AS JSON), updatedAt = :updatedAt WHERE id = :projectId`,
        {
          replacements: {
            updatedAt: new Date(),
            projectId
          },
          type: sequelize.QueryTypes.UPDATE
        }
      );
    } catch (e) {
      console.error('Error updating notes:', e.message);
      if (e.message && (e.message.includes('doesn\'t exist') || e.message.includes('Unknown column'))) {
        return res.status(500).json({
          success: false,
          error: 'Notes feature is not available yet. Please run database migration to add notes column.'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to add reaction: ' + e.message
      });
    }

    res.json({
      success: true,
      reactions: notes[noteIndex].reactions
    });
  } catch (error) {
    console.error('Error adding reaction to note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add reaction: ' + error.message
    });
  }
});

// Get download audit trail for a project
router.get('/:projectId/download-audit', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const downloads = await ActivityLog.findAll({
      where: {
        entityType: 'Project',
        entityId: projectId,
        action: {
          [Op.in]: ['DOWNLOAD_SUMMARY_PDF', 'DOWNLOAD_SUMMARY_HTML']
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department', 'profilePictureUrl', 'fullName']
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    res.json({
      success: true,
      downloads: downloads.map(download => ({
        id: download.id,
        format: download.action === 'DOWNLOAD_SUMMARY_PDF' ? 'PDF' : 'HTML',
        user: download.user ? {
          id: download.user.id,
          name: download.user.name || download.user.fullName,
          email: download.user.email,
          department: download.user.department,
          profilePictureUrl: download.user.profilePictureUrl
        } : null,
        downloadedAt: download.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching download audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch download audit trail'
    });
  }
});

// Record download in audit trail
router.post('/:projectId/download-audit', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format } = req.body;
    
    if (!format || !['PDF', 'HTML'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Must be PDF or HTML'
      });
    }
    
    const action = format === 'PDF' ? 'DOWNLOAD_SUMMARY_PDF' : 'DOWNLOAD_SUMMARY_HTML';
    
    await ActivityLog.create({
      entityType: 'Project',
      entityId: projectId,
      userId: req.user.id,
      action: action,
      details: `Downloaded project summary report in ${format} format`,
      module: 'Project Summary & Report',
      level: 'Info',
      status: 'Success'
    });
    
    res.json({
      success: true,
      message: 'Download recorded successfully'
    });
  } catch (error) {
    console.error('Error recording download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record download'
    });
  }
});

module.exports = router; 
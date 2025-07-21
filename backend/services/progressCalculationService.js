const { Project, ProjectMilestone, ProjectUpdate, User } = require('../models');
const { Op } = require('sequelize');

class ProgressCalculationService {
  
  /**
   * Calculate comprehensive project progress for any user role
   * @param {string} projectId - Project ID
   * @param {string} userRole - User role (eiu, iu, secretariat, mpmec, executive)
   * @returns {Object} Comprehensive progress data
   */
  static async calculateProjectProgress(projectId, userRole = null) {
    try {
      // Fetch project with all related data
      const project = await Project.findByPk(projectId, {
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
            attributes: ['id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 'status', 'order']
          },
          {
            model: ProjectUpdate,
            as: 'updates',
            where: {
              updateType: {
                [Op.in]: ['milestone', 'milestone_update', 'progress_update']
              }
            },
            required: false,
            order: [['createdAt', 'DESC']],
            limit: 10
          }
        ]
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Get the latest compiled report
      const compiledReport = await ProjectUpdate.findOne({
        where: {
          projectId: projectId,
          updateType: {
            [Op.in]: ['milestone', 'milestone_update']
          },
          status: {
            [Op.in]: ['iu_approved', 'secretariat_approved']
          }
        },
        order: [['createdAt', 'DESC']]
      });

      // Calculate milestone-based progress
      const milestoneProgress = await this.calculateMilestoneProgress(projectId);
      
      // Calculate division-based progress
      const divisionProgress = await this.calculateDivisionProgress(projectId);
      
      // Calculate overall progress based on approved milestone weight
      const overallProgress = this.calculateOverallProgress(divisionProgress, milestoneProgress.appliedWeight);

      // Calculate amount spent from approved milestones
      const amountSpent = milestoneProgress.appliedWeight > 0 ? 
        (project.totalBudget * milestoneProgress.appliedWeight / 100) : 0;

      // Prepare response based on user role
      const response = {
        project: {
          id: project.id,
          projectCode: project.projectCode,
          name: project.name,
          description: project.description,
          category: project.category,
          location: project.location,
          priority: project.priority,
          fundingSource: project.fundingSource,
          createdDate: project.createdDate,
          startDate: project.startDate,
          endDate: project.endDate,
          totalBudget: project.totalBudget,
          amountSpent: amountSpent,
          workflowStatus: project.workflowStatus,
          approvedBySecretariat: project.approvedBySecretariat,
          implementingOffice: project.implementingOffice?.name || project.implementingOfficeName,
          implementingOfficeName: project.implementingOffice?.name || project.implementingOfficeName,
          eiuPartner: project.eiuPersonnel?.name || 'Not assigned',
          projectManager: project.projectManager,
          contactNumber: project.contactNumber
        },
        progress: {
          overall: overallProgress,
          timeline: divisionProgress.timeline,
          budget: divisionProgress.budget,
          physical: divisionProgress.physical
        },
        milestones: milestoneProgress,
        compiledReport: compiledReport ? {
          exists: true,
          submittedAt: compiledReport.submittedAt,
          submittedBy: compiledReport.submittedBy,
          submittedByRole: compiledReport.submittedByRole || 'EIU',
          iuReviewer: compiledReport.iuReviewer,
          iuReviewDate: compiledReport.iuReviewDate,
          iuReviewRemarks: compiledReport.iuReviewRemarks,
          title: compiledReport.title,
          description: compiledReport.description,
          claimedProgress: compiledReport.claimedProgress,
          adjustedProgress: compiledReport.adjustedProgress,
          finalProgress: compiledReport.finalProgress,
          budgetUsed: compiledReport.budgetUsed,
          remarks: compiledReport.remarks,
          milestoneUpdates: this.parseMilestoneUpdates(compiledReport.milestoneUpdates),
          totalWeight: milestoneProgress.totalWeight,
          appliedWeight: milestoneProgress.appliedWeight,
          remainingWeight: milestoneProgress.remainingWeight
        } : {
          exists: false
        },
        lastUpdate: project.lastProgressUpdate,
        automatedProgress: project.automatedProgress
      };

      return response;

    } catch (error) {
      console.error('Error calculating project progress:', error);
      throw error;
    }
  }

  /**
   * Calculate milestone-based progress
   */
  static async calculateMilestoneProgress(projectId) {
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      order: [['order', 'ASC']]
    });

    const latestUpdate = await ProjectUpdate.findOne({
      where: {
        projectId,
        updateType: {
          [Op.in]: ['milestone', 'milestone_update']
        }
      },
      order: [['createdAt', 'DESC']]
    });

    let milestoneUpdates = [];
    if (latestUpdate && latestUpdate.milestoneUpdates) {
      try {
        milestoneUpdates = typeof latestUpdate.milestoneUpdates === 'string' 
          ? JSON.parse(latestUpdate.milestoneUpdates) 
          : latestUpdate.milestoneUpdates;
      } catch (e) {
        console.error('Error parsing milestone updates:', e);
        milestoneUpdates = [];
      }
    }

    const totalWeight = milestones.reduce((sum, m) => sum + parseFloat(m.weight || 0), 0);
    let appliedWeight = 0;

    const milestoneStatus = milestones.map(milestone => {
      const update = milestoneUpdates.find(u => u.milestoneId === milestone.id);
      const progress = update?.progress || 0;
      const weight = parseFloat(milestone.weight || 0);
      
      if (update?.status === 'completed') {
        appliedWeight += weight;
      }

      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        weight: weight,
        plannedBudget: milestone.plannedBudget,
        dueDate: milestone.dueDate,
        status: update?.status || 'pending',
        progress: progress,
        completedDate: update?.completedDate || null,
        remarks: update?.remarks || '',
        budgetAllocation: update?.budgetAllocation || 0,
        budgetBreakdown: update?.budgetBreakdown || '',
        uploadedFiles: update?.uploadedFiles || []
      };
    });

    return {
      milestones: milestoneStatus,
      totalWeight,
      appliedWeight,
      remainingWeight: totalWeight - appliedWeight
    };
  }

  /**
   * Calculate division-based progress (Timeline, Budget, Physical)
   * This should reflect only the approved milestone weights
   */
  static async calculateDivisionProgress(projectId) {
    const project = await Project.findByPk(projectId);
    
    // Get milestone progress to determine the actual approved weight
    const milestoneProgress = await this.calculateMilestoneProgress(projectId);
    const approvedWeight = milestoneProgress.appliedWeight;
    
    // Get latest progress update
    const latestUpdate = await ProjectUpdate.findOne({
      where: {
        projectId,
        updateType: 'progress_update'
      },
      order: [['createdAt', 'DESC']]
    });

    let timelineProgress = parseFloat(project.timelineProgress) || 0;
    let budgetProgress = parseFloat(project.budgetProgress) || 0;
    let physicalProgress = parseFloat(project.physicalProgress) || 0;

    // If there's a latest update, use those values
    if (latestUpdate) {
      timelineProgress = parseFloat(latestUpdate.timelineProgress) || timelineProgress;
      budgetProgress = parseFloat(latestUpdate.budgetProgress) || budgetProgress;
      physicalProgress = parseFloat(latestUpdate.physicalProgress) || physicalProgress;
    }

    // Ensure division progress doesn't exceed the approved milestone weight
    const maxDivisionProgress = approvedWeight / 3; // Each division gets equal share
    
    return {
      timeline: Math.min(100, Math.max(0, Math.min(timelineProgress, maxDivisionProgress))),
      budget: Math.min(100, Math.max(0, Math.min(budgetProgress, maxDivisionProgress))),
      physical: Math.min(100, Math.max(0, Math.min(physicalProgress, maxDivisionProgress)))
    };
  }

  /**
   * Calculate overall progress from approved milestone weights
   */
  static calculateOverallProgress(divisionProgress, approvedWeight = 0) {
    // Overall progress should be based on approved milestone weight, not division average
    return Math.min(100, Math.max(0, approvedWeight));
  }

  /**
   * Parse milestone updates from JSON or object
   */
  static parseMilestoneUpdates(milestoneUpdates) {
    if (!milestoneUpdates) return [];
    
    try {
      if (typeof milestoneUpdates === 'string') {
        return JSON.parse(milestoneUpdates);
      }
      return milestoneUpdates;
    } catch (e) {
      console.error('Error parsing milestone updates:', e);
      return [];
    }
  }

  /**
   * Get projects with progress for a specific user role
   */
  static async getProjectsWithProgress(userRole, userId = null) {
    let whereClause = {};
    
    // Filter projects based on user role
    switch (userRole) {
      case 'eiu':
        whereClause.eiuPersonnelId = userId;
        break;
      case 'iu':
      case 'LGU-IU':
        whereClause.implementingOfficeId = userId;
        break;
      case 'secretariat':
      case 'mpmec':
      case 'executive':
        // These roles can see all projects
        break;
      default:
        throw new Error('Invalid user role');
    }

    const projects = await Project.findAll({
      where: whereClause,
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
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate progress for each project
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const progress = await this.calculateProjectProgress(project.id, userRole);
        return {
          ...project.toJSON(),
          progress: progress.progress,
          hasCompiledReport: progress.compiledReport.exists
        };
      })
    );

    return projectsWithProgress;
  }
}

module.exports = ProgressCalculationService; 
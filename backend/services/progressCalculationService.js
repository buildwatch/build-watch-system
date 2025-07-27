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
            attributes: [
              'id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 
              'completedDate', 'status', 'progress', 'priority', 'order',
              'timelineWeight', 'timelineStartDate', 'timelineEndDate', 'timelineDescription', 'timelineStatus',
              'budgetWeight', 'budgetPlanned', 'budgetBreakdown', 'budgetStatus',
              'physicalWeight', 'physicalProofType', 'physicalDescription', 'physicalStatus',
              'validationDate', 'validationComments', 'completionNotes'
            ]
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
      
      // Calculate division-based progress based on Secretariat approval verdicts (contribution to overall)
      const divisionProgress = await this.calculateDivisionProgress(projectId);
      
      // Calculate internal division progress (percentage within each division)
      const internalDivisionProgress = await this.calculateInternalDivisionProgress(projectId);
      
      // Calculate overall progress based on approved divisions
      const overallProgress = this.calculateOverallProgress(divisionProgress);

      // Calculate amount spent from approved divisions only
      // Only budget division contributes to utilized budget
      const amountSpent = divisionProgress.budget > 0 ? 
        (parseFloat(project.totalBudget) * divisionProgress.budget / 100) : 0;

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
          eiuPersonnelId: project.eiuPersonnelId,
          eiuPersonnelName: project.eiuPersonnel?.name,
          expectedOutputs: project.expectedOutputs,
          targetBeneficiaries: project.targetBeneficiaries,
          projectManager: project.projectManager,
          contactNumber: project.contactNumber
        },
        progress: {
          overall: overallProgress,
          timeline: divisionProgress.timeline,
          budget: divisionProgress.budget,
          physical: divisionProgress.physical,
          // Internal division progress (percentage within each division)
          internalTimeline: internalDivisionProgress.timeline,
          internalBudget: internalDivisionProgress.budget,
          internalPhysical: internalDivisionProgress.physical
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
          appliedWeight: overallProgress, // Use division-based overall progress
          remainingWeight: milestoneProgress.totalWeight - overallProgress
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
        uploadedFiles: update?.uploadedFiles || [],
        // Three-division fields from milestone update
        timelineWeight: update?.timelineWeight || milestone.timelineWeight,
        timelineStartDate: update?.timelineStartDate || milestone.timelineStartDate,
        timelineEndDate: update?.timelineEndDate || milestone.timelineEndDate,
        timelineDescription: update?.timelineDescription || milestone.timelineDescription,
        timelineStatus: update?.timelineStatus || milestone.timelineStatus,
        budgetWeight: update?.budgetWeight || milestone.budgetWeight,
        budgetPlanned: update?.budgetPlanned || milestone.budgetPlanned,
        budgetStatus: update?.budgetStatus || milestone.budgetStatus,
        physicalWeight: update?.physicalWeight || milestone.physicalWeight,
        physicalProofType: update?.physicalProofType || milestone.physicalProofType,
        physicalDescription: update?.physicalDescription || milestone.physicalDescription,
        physicalStatus: update?.physicalStatus || milestone.physicalStatus,
        validationDate: milestone.validationDate,
        validationComments: milestone.validationComments,
        completionNotes: milestone.completionNotes,
        priority: milestone.priority,
        order: milestone.order
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
   * This should reflect only the approved division verdicts from Secretariat
   */
  static async calculateDivisionProgress(projectId) {
    const project = await Project.findByPk(projectId);
    
    // Get the latest milestone update to check division approval statuses
    const latestMilestoneUpdate = await ProjectUpdate.findOne({
      where: {
        projectId,
        updateType: {
          [Op.in]: ['milestone', 'milestone_update']
        }
      },
      order: [['createdAt', 'DESC']]
    });

    let timelineProgress = 0;
    let budgetProgress = 0;
    let physicalProgress = 0;

    if (latestMilestoneUpdate && latestMilestoneUpdate.milestoneUpdates) {
      try {
        const milestoneUpdates = typeof latestMilestoneUpdate.milestoneUpdates === 'string' 
          ? JSON.parse(latestMilestoneUpdate.milestoneUpdates) 
          : latestMilestoneUpdate.milestoneUpdates;

        // Calculate progress based on approved divisions
        milestoneUpdates.forEach(milestoneUpdate => {
          const timelineStatus = milestoneUpdate.timelineStatus || 'pending';
          const budgetStatus = milestoneUpdate.budgetStatus || 'pending';
          const physicalStatus = milestoneUpdate.physicalStatus || 'pending';
          
          // Only approved divisions contribute to progress
          if (timelineStatus === 'approved') {
            timelineProgress += parseFloat(milestoneUpdate.timelineWeight || 0);
          }
          if (budgetStatus === 'approved') {
            budgetProgress += parseFloat(milestoneUpdate.budgetWeight || 0);
          }
          if (physicalStatus === 'approved') {
            physicalProgress += parseFloat(milestoneUpdate.physicalWeight || 0);
          }
        });
      } catch (e) {
        console.error('Error parsing milestone updates for division progress:', e);
      }
    }

    // Round to 2 decimal places
    return {
      timeline: Math.round(Math.min(100, Math.max(0, timelineProgress)) * 100) / 100,
      budget: Math.round(Math.min(100, Math.max(0, budgetProgress)) * 100) / 100,
      physical: Math.round(Math.min(100, Math.max(0, physicalProgress)) * 100) / 100
    };
  }

  /**
   * Calculate internal division progress (percentage of milestones approved within each division)
   * This shows how much of each division is completed, not contribution to overall progress
   */
  static async calculateInternalDivisionProgress(projectId) {
    console.log(`🔍 calculateInternalDivisionProgress called for projectId: ${projectId}`);
    
    // Get actual project milestones from database
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      order: [['order', 'ASC']]
    });

    console.log(`📋 Found ${milestones.length} milestones for project ${projectId}`);

    // Get the latest milestone update to check division approval statuses
    const latestMilestoneUpdate = await ProjectUpdate.findOne({
      where: {
        projectId,
        updateType: {
          [Op.in]: ['milestone', 'milestone_update']
        }
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`📝 Latest milestone update found:`, !!latestMilestoneUpdate);

    let timelineApproved = 0;
    let budgetApproved = 0;
    let physicalApproved = 0;
    let totalMilestones = milestones.length;

    if (latestMilestoneUpdate && latestMilestoneUpdate.milestoneUpdates) {
      try {
        const milestoneUpdates = typeof latestMilestoneUpdate.milestoneUpdates === 'string' 
          ? JSON.parse(latestMilestoneUpdate.milestoneUpdates) 
          : latestMilestoneUpdate.milestoneUpdates;

        console.log(`📊 Parsed ${milestoneUpdates.length} milestone updates`);
        
        // Count approved milestones for each division by matching with actual milestones
        milestones.forEach(milestone => {
          const update = milestoneUpdates.find(u => u.milestoneId === milestone.id);
          const timelineStatus = update?.timelineStatus || milestone.timelineStatus || 'pending';
          const budgetStatus = update?.budgetStatus || milestone.budgetStatus || 'pending';
          const physicalStatus = update?.physicalStatus || milestone.physicalStatus || 'pending';
          
          console.log(`🎯 Milestone ${milestone.id} (${milestone.title}): timeline=${timelineStatus}, budget=${budgetStatus}, physical=${physicalStatus}`);
          
          if (timelineStatus === 'approved') {
            timelineApproved++;
          }
          if (budgetStatus === 'approved') {
            budgetApproved++;
          }
          if (physicalStatus === 'approved') {
            physicalApproved++;
          }
        });
      } catch (e) {
        console.error('Error parsing milestone updates for internal division progress:', e);
      }
    }

    console.log(`📈 Approval counts: timeline=${timelineApproved}, budget=${budgetApproved}, physical=${physicalApproved} out of ${totalMilestones} total milestones`);
    
    // Calculate percentage of milestones approved within each division
    const timelineProgress = totalMilestones > 0 ? (timelineApproved / totalMilestones) * 100 : 0;
    const budgetProgress = totalMilestones > 0 ? (budgetApproved / totalMilestones) * 100 : 0;
    const physicalProgress = totalMilestones > 0 ? (physicalApproved / totalMilestones) * 100 : 0;

    console.log(`📊 Calculated progress: timeline=${timelineProgress}%, budget=${budgetProgress}%, physical=${physicalProgress}%`);

    // Round to 2 decimal places
    const result = {
      timeline: Math.round(Math.min(100, Math.max(0, timelineProgress)) * 100) / 100,
      budget: Math.round(Math.min(100, Math.max(0, budgetProgress)) * 100) / 100,
      physical: Math.round(Math.min(100, Math.max(0, physicalProgress)) * 100) / 100
    };
    
    console.log(`✅ Final result:`, result);
    return result;
  }

  /**
   * Calculate overall progress from approved division verdicts
   */
  static calculateOverallProgress(divisionProgress, approvedWeight = 0) {
    // Overall progress should be the sum of all approved division weights
    const totalApprovedWeight = divisionProgress.timeline + divisionProgress.budget + divisionProgress.physical;
    return Math.round(Math.min(100, Math.max(0, totalApprovedWeight)) * 100) / 100;
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
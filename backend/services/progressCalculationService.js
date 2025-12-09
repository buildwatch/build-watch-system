const { Project, ProjectMilestone, ProjectUpdate, User, ActivityLog, MilestoneSubmission } = require('../models');
const { Op } = require('sequelize');

// Helper function for conditional debug logging (only in development)
const debugLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

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
            attributes: [
              'id', 'name', 'email', 'department', 'profilePictureUrl', 'contactNumber',
              'group', 'subRole', 'externalCompanyName', 'role', 'username', 'birthdate'
            ]
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

      // Fetch activity logs for this project (including milestone-related activities)
      const milestoneIds = project.milestones ? project.milestones.map(m => m.id) : [];
      
      // Get ProjectUpdate IDs for this project
      const projectUpdates = await ProjectUpdate.findAll({
        where: { projectId: projectId },
        attributes: ['id']
      });
      const projectUpdateIds = projectUpdates.map(update => update.id);
      
      const activityLogs = await ActivityLog.findAll({
        where: { 
          [Op.or]: [
            { entityId: projectId, entityType: 'project' },
            { entityId: projectId, entityType: 'Project' },
            { entityId: { [Op.in]: milestoneIds }, entityType: 'ProjectMilestone' },
            { entityId: { [Op.in]: projectUpdateIds }, entityType: 'ProjectUpdate' }
          ]
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'username']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      // Debug: Log the expectedDaysOfCompletion field and activity logs
      debugLog('🔍 ProgressCalculationService - Project data:', {
        id: project.id,
        name: project.name,
        expectedDaysOfCompletion: project.expectedDaysOfCompletion,
        startDate: project.startDate,
        targetCompletionDate: project.targetCompletionDate,
        endDate: project.endDate,
        milestoneCount: project.milestones ? project.milestones.length : 0,
        milestoneIds: milestoneIds,
        projectUpdateIds: projectUpdateIds,
        activityLogsCount: activityLogs.length,
        activityLogs: activityLogs.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          createdAt: log.createdAt
        }))
      });

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

      // ALWAYS use new milestone-based calculation (NEW SYSTEM)
      // Do not use cached direct progress fields - always recalculate for accuracy
      debugLog(`🔍 [calculateProjectProgress] Using NEW milestone-based calculation for project ${projectId}`);
      
      let overallProgress, divisionProgress, internalDivisionProgress;
      
      // Calculate milestone-based progress (NEW SYSTEM: evenly split milestones)
        const milestoneProgressData = await this.calculateMilestoneProgress(projectId);
        
      // Calculate Budget Division progress separately (utilized/allocated per milestone)
        divisionProgress = await this.calculateDivisionProgress(projectId);
        
        // Calculate internal division progress (percentage within each division)
        internalDivisionProgress = await this.calculateInternalDivisionProgress(projectId);
        
      // NEW OVERALL PROGRESS CALCULATION:
      // Overall progress is based on evenly split milestones
      // Only milestones with Physical Division input AND approved by LGU-IU count
      // Each milestone contributes its full allotted weight (e.g., 3 milestones = 33.33% each)
        const totalWeight = milestoneProgressData.totalWeight || 100;
        const calculatedProgress = totalWeight > 0 
          ? (milestoneProgressData.appliedWeight / totalWeight) * 100 
          : 0;
        overallProgress = Math.round(Math.min(100, Math.max(0, calculatedProgress)) * 100) / 100;
      
      console.log(`📊 [calculateProjectProgress] NEW calculation results:`, {
        overall: overallProgress,
        budget: divisionProgress.budget,
        appliedWeight: milestoneProgressData.appliedWeight,
        totalWeight: milestoneProgressData.totalWeight
      });
      
      // Calculate milestone-based progress for milestone data (already calculated above, but need for response)
      const milestoneProgress = await this.calculateMilestoneProgress(projectId);

      // Calculate amount spent from actual usedBudget in approved milestone submissions
      // This is more accurate than calculating from budget progress percentage
      let amountSpent = 0;
      try {
        // Get all milestones for the project
        const allMilestones = await ProjectMilestone.findAll({
          where: { projectId: projectId },
          attributes: ['id']
        });
        
        const milestoneIds = allMilestones.map(m => m.id);
        
        if (milestoneIds.length > 0) {
          // Get latest approved submission for each milestone (to avoid double counting)
          const approvedSubmissions = await MilestoneSubmission.findAll({
            where: {
              milestoneId: { [Op.in]: milestoneIds },
              status: {
                [Op.in]: ['approved', 'iu_approved']
              }
            },
            attributes: ['milestoneId', 'usedBudget', 'submittedAt'],
            order: [['submittedAt', 'DESC']],
            raw: true
          });
          
          // Get latest approved submission for each milestone
          const latestSubmissionMap = {};
          approvedSubmissions.forEach(submission => {
            if (!latestSubmissionMap[submission.milestoneId]) {
              latestSubmissionMap[submission.milestoneId] = parseFloat(submission.usedBudget || 0);
            }
          });
          
          // Sum up all used budgets
          amountSpent = Object.values(latestSubmissionMap).reduce((sum, budget) => sum + budget, 0);
        }
      } catch (budgetError) {
        console.warn('⚠️ Error calculating amountSpent from submissions, falling back to percentage:', budgetError);
        // Fallback to percentage-based calculation if submission-based calculation fails
        amountSpent = divisionProgress.budget > 0 ? 
          (parseFloat(project.totalBudget) * divisionProgress.budget / 100) : 0;
      }

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
          targetCompletionDate: project.targetCompletionDate,
          targetDateOfCompletion: project.targetDateOfCompletion,
          expectedDaysOfCompletion: project.expectedDaysOfCompletion,
          totalBudget: project.totalBudget,
          budgetBreakdown: project.budgetBreakdown,
          physicalProgressRequirements: project.physicalProgressRequirements,
          amountSpent: amountSpent,
          status: project.status === 'complete' ? 'completed' : project.status, // Normalize status for API
          overallProgress: overallProgress, // Always use calculated value (NEW SYSTEM)
          budgetProgress: divisionProgress.budget, // Always use calculated value (NEW SYSTEM)
          budgetUtilizationPercentage: divisionProgress.budget, // Alias for clarity
          completionDate: project.completionDate,
          actualCompletionDate: project.actualCompletionDate,
          workflowStatus: project.workflowStatus,
          approvedBySecretariat: project.approvedBySecretariat,
          implementingOffice: project.implementingOffice?.name || project.implementingOfficeName,
          implementingOfficeName: project.implementingOffice?.name || project.implementingOfficeName,
          eiuPartner: project.eiuPersonnel?.name || 'Not assigned',
          eiuPersonnelId: project.eiuPersonnelId,
          eiuPersonnelName: project.eiuPersonnel?.name,
          // Include complete EIU personnel data for ProjectDetailsModal
          eiuPersonnel: project.eiuPersonnel,
          // Include raw milestones data for ProjectDetailsModal
          milestones: project.milestones,
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
          budgetUtilizationPercentage: divisionProgress.budget, // Alias for clarity
          // Internal division progress (percentage within each division)
          internalTimeline: internalDivisionProgress.timeline,
          internalBudget: internalDivisionProgress.budget,
          internalPhysical: internalDivisionProgress.physical
        },
        milestones: milestoneProgress,
        // Include raw milestone data for ProjectDetailsModal
        projectMilestones: project.milestones,
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
        automatedProgress: project.automatedProgress,
        // Include activity logs for Recent Updates section
        activityLogs: activityLogs.map(activity => ({
          id: activity.id,
          action: activity.action,
          details: activity.details,
          category: activity.module || 'general',
          createdAt: activity.createdAt,
          user: activity.user ? {
            id: activity.user.id,
            name: activity.user.name,
            username: activity.user.username
          } : null
        }))
      };

      return response;

    } catch (error) {
      console.error('Error calculating project progress:', error);
      throw error;
    }
  }

  /**
   * Calculate milestone-based progress (NEW SYSTEM)
   * Overall Progress is based on evenly split milestones
   * Only milestones with Physical Division input AND approved by LGU-IU count
   */
  static async calculateMilestoneProgress(projectId) {
    debugLog(`🔍 [calculateMilestoneProgress] Starting NEW calculation for project ${projectId}`);
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      order: [['order', 'ASC']]
    });

    // NEW SYSTEM: Milestones are split evenly (e.g., 10 milestones = 10% each)
    const milestoneCount = milestones.length;
    const evenWeightPerMilestone = milestoneCount > 0 ? 100 / milestoneCount : 0;
    
    debugLog(`📊 [calculateMilestoneProgress] Milestone count: ${milestoneCount}, Even weight per milestone: ${evenWeightPerMilestone}%`);

    // Get approved milestone submissions (approved by LGU-IU)
    const approvedSubmissions = await MilestoneSubmission.findAll({
      where: {
        projectId: projectId,
        status: 'approved' // Approved by LGU-IU
      },
      attributes: ['milestoneId', 'status', 'physicalProgressDescription'],
      order: [['submittedAt', 'DESC']]
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

    // Total weight is always 100% (evenly split)
    const totalWeight = 100;
    let appliedWeight = 0;

    const milestoneStatus = milestones.map((milestone, index) => {
      const update = milestoneUpdates.find(u => u.milestoneId === milestone.id);
      
      // Use even weight per milestone (NEW SYSTEM)
      const milestoneWeight = evenWeightPerMilestone;
      
      // Check if milestone has an approved submission
      const approvedSubmission = approvedSubmissions.find(
        sub => sub.milestoneId === milestone.id
      );
      
      // Check if milestone has Physical Division input
      // Priority: approvedSubmission > milestone.physicalStatus > milestone.physicalDescription > update
      const hasPhysicalInput = 
        (approvedSubmission && approvedSubmission.physicalProgressDescription && 
         approvedSubmission.physicalProgressDescription.trim() !== '') ||
        milestone.physicalStatus === 'approved' ||
        (milestone.physicalDescription && milestone.physicalDescription.trim() !== '') ||
        (update && update.physicalDescription && update.physicalDescription.trim() !== '');
      
      // Check if milestone is approved by LGU-IU
      // Priority: approvedSubmission > milestone.status > milestone.physicalStatus
      const isApproved = approvedSubmission !== undefined ||
                         milestone.status === 'approved' ||
                         milestone.status === 'completed' ||
                         milestone.physicalStatus === 'approved';
      
      debugLog(`🔍 [calculateMilestoneProgress] Milestone "${milestone.title}" check:`, {
        hasApprovedSubmission: approvedSubmission !== undefined,
        milestoneStatus: milestone.status,
        physicalStatus: milestone.physicalStatus,
        hasPhysicalDescription: !!(milestone.physicalDescription && milestone.physicalDescription.trim() !== ''),
        hasPhysicalInput: hasPhysicalInput,
        isApproved: isApproved
      });
      
      // NEW LOGIC: Only count milestones with Physical Division input AND approved by LGU-IU
      let status = milestone.status || update?.status || 'pending';
      if (isApproved && hasPhysicalInput) {
        status = 'approved';
        // Add full milestone weight (not partial)
        appliedWeight += milestoneWeight;
        debugLog(`✅ [calculateMilestoneProgress] Milestone "${milestone.title}" approved with Physical input: +${milestoneWeight}%`);
      } else {
        // Don't count this milestone
        debugLog(`⏸️ [calculateMilestoneProgress] Milestone "${milestone.title}" not counted: approved=${isApproved}, hasPhysicalInput=${hasPhysicalInput}`);
      }

      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        weight: milestoneWeight, // Even weight per milestone
        plannedBudget: milestone.plannedBudget,
        dueDate: milestone.dueDate,
        status: status,
        progress: status === 'approved' ? milestoneWeight : 0,
        completedDate: update?.completedDate || null,
        remarks: update?.remarks || '',
        budgetAllocation: update?.budgetAllocation || 0,
        budgetBreakdown: update?.budgetBreakdown || milestone.budgetBreakdown || '',
        uploadedFiles: update?.uploadedFiles || [],
        // Three-division fields from milestone update
        timelineWeight: update?.timelineWeight || milestone.timelineWeight,
        timelineStartDate: update?.timelineStartDate || milestone.timelineStartDate,
        timelineEndDate: update?.timelineEndDate || milestone.timelineEndDate,
        timelineDescription: update?.timelineDescription || milestone.timelineDescription,
        timelineStatus: milestone.timelineStatus || update?.timelineStatus,
        budgetWeight: update?.budgetWeight || milestone.budgetWeight,
        budgetPlanned: update?.budgetPlanned || milestone.budgetPlanned,
        budgetStatus: milestone.budgetStatus || update?.budgetStatus,
        physicalWeight: update?.physicalWeight || milestone.physicalWeight,
        physicalProofType: update?.physicalProofType || milestone.physicalProofType,
        physicalDescription: update?.physicalDescription || milestone.physicalDescription,
        physicalStatus: milestone.physicalStatus || update?.physicalStatus,
        validationDate: milestone.validationDate,
        validationComments: milestone.validationComments,
        completionNotes: milestone.completionNotes,
        priority: milestone.priority,
        order: milestone.order
      };
    });

    const result = {
      milestones: milestoneStatus,
      totalWeight,
      appliedWeight,
      remainingWeight: totalWeight - appliedWeight
    };
    
    debugLog(`📊 [calculateMilestoneProgress] Final calculation result (NEW SYSTEM):`, {
      totalWeight: result.totalWeight,
      appliedWeight: result.appliedWeight,
      remainingWeight: result.remainingWeight,
      calculatedOverallProgress: result.totalWeight > 0 ? (result.appliedWeight / result.totalWeight) * 100 : 0
    });
    
    return result;
  }

  /**
   * Calculate Budget Division progress (NEW SYSTEM)
   * Budget Division progress is calculated as weighted utilization per milestone
   * Formula: (usedBudget / plannedBudget) * (milestoneWeight / 100) for each milestone, then sum
   * Example: Phase 1 with 33.33% weight, 2M used / 2.5M planned = 80% utilization
   * Budget Division = 80% * 33.33% = 26.66%
   * This is NOT added to overall progress - it's a separate metric
   */
  static async calculateDivisionProgress(projectId) {
    const project = await Project.findByPk(projectId);
    
    // NEW SYSTEM: Calculate Budget Division as weighted utilization
    let budgetProgress = 0;
    let totalWeightedUtilization = 0;

    console.log(`🔍 [calculateDivisionProgress] Starting NEW Budget Division calculation for project ${projectId}`);
    
    // Get all milestones for the project
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      order: [['order', 'ASC']]
    });

    // Calculate even weight per milestone (same as overall progress calculation)
    const milestoneCount = milestones.length;
    const evenWeightPerMilestone = milestoneCount > 0 ? 100 / milestoneCount : 0;

    // Get approved milestone submissions to get budget data
    const approvedSubmissions = await MilestoneSubmission.findAll({
      where: {
        projectId: projectId,
        status: 'approved'
      },
      include: [
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title', 'plannedBudget', 'budgetPlanned']
        }
      ]
    });

    console.log(`📊 [calculateDivisionProgress] Found ${approvedSubmissions.length} approved submissions and ${milestones.length} milestones`);
    console.log(`📊 [calculateDivisionProgress] Even weight per milestone: ${evenWeightPerMilestone}%`);
    console.log(`📊 [calculateDivisionProgress] Approved submissions details:`, approvedSubmissions.map(s => ({
      id: s.id,
      milestoneId: s.milestoneId,
      usedBudget: s.usedBudget,
      plannedBudget: s.plannedBudget,
      budgetUtilizationPercentage: s.budgetUtilizationPercentage
    })));

    // Calculate weighted budget utilization for each milestone
    // IMPORTANT: Only calculate for milestones that have approved submissions with budget data
    milestones.forEach((milestone) => {
      const submission = approvedSubmissions.find(s => s.milestoneId === milestone.id);
      
      // Skip if no approved submission for this milestone
      if (!submission) {
        console.log(`⏸️ [calculateDivisionProgress] Milestone "${milestone.title}" (ID: ${milestone.id}) has no approved submission, skipping`);
        return;
      }
      
      // Get planned/allocated budget (prioritize milestone, then submission)
      // Handle DECIMAL types from Sequelize - convert to number first
      const milestonePlanned = parseFloat(milestone.plannedBudget || milestone.budgetPlanned || 0);
      const submissionPlanned = parseFloat(submission?.plannedBudget || submission?.budgetPlanned || 0);
      // Use milestone planned budget if > 0, otherwise use submission planned budget
      const plannedBudget = milestonePlanned > 0 ? milestonePlanned : submissionPlanned;
      
      // Get used/utilized budget (prioritize submission, then milestone)
      // Handle DECIMAL types from Sequelize - convert to number first
      const submissionUsed = parseFloat(submission?.usedBudget || submission?.budgetDivision?.usedBudget || 0);
      const milestoneUsed = parseFloat(milestone.usedBudget || 0);
      // Use submission used budget if > 0, otherwise use milestone used budget
      const usedBudget = submissionUsed > 0 ? submissionUsed : milestoneUsed;
      
      console.log(`🔍 [calculateDivisionProgress] Milestone "${milestone.title}" budget data extraction:`, {
        milestonePlannedBudget: milestone.plannedBudget,
        milestoneBudgetPlanned: milestone.budgetPlanned,
        submissionPlannedBudget: submission?.plannedBudget,
        submissionBudgetPlanned: submission?.budgetPlanned,
        finalPlannedBudget: plannedBudget,
        submissionUsedBudget: submission?.usedBudget,
        milestoneUsedBudget: milestone.usedBudget,
        finalUsedBudget: usedBudget
      });
      
      // Get milestone weight (use even weight per milestone)
      const milestoneWeight = evenWeightPerMilestone;
      
      // Only calculate if milestone has planned budget AND used budget (to avoid division by zero and meaningless calculations)
      if (plannedBudget > 0 && usedBudget > 0) {
        // Calculate utilization percentage for this milestone
        // Example: 1M / 2.5M = 40% utilization
        const milestoneUtilizationPercent = (usedBudget / plannedBudget) * 100;
        
        // Calculate weighted contribution: utilization * (weight / 100)
        // Example: 40% utilization * (33.33% / 100) = 13.33%
        // Formula: (usedBudget / plannedBudget) * (milestoneWeight / 100)
        const weightedContribution = milestoneUtilizationPercent * (milestoneWeight / 100);
        totalWeightedUtilization += weightedContribution;
        
        console.log(`💰 [calculateDivisionProgress] Milestone "${milestone.title}" (ID: ${milestone.id}):`, {
          hasApprovedSubmission: true,
          submissionId: submission.id,
          plannedBudget: plannedBudget,
          usedBudget: usedBudget,
          utilizationPercent: milestoneUtilizationPercent.toFixed(2) + '%',
          milestoneWeight: milestoneWeight.toFixed(2) + '%',
          weightedContribution: weightedContribution.toFixed(2) + '%',
          calculation: `(${usedBudget} / ${plannedBudget}) * (${milestoneWeight}% / 100) = ${weightedContribution.toFixed(2)}%`,
          runningTotal: totalWeightedUtilization.toFixed(2) + '%'
        });
      } else {
        // Milestone has no planned budget or no used budget
        console.log(`⏸️ [calculateDivisionProgress] Milestone "${milestone.title}" (ID: ${milestone.id}) skipped:`, {
          plannedBudget: plannedBudget,
          usedBudget: usedBudget,
          reason: plannedBudget === 0 ? 'no planned budget' : 'no used budget'
        });
      }
    });

    // Budget Division Progress is the sum of all weighted contributions
    budgetProgress = totalWeightedUtilization;

    console.log(`📈 Final Budget Division progress for project ${projectId}:`, {
      budgetProgress: budgetProgress.toFixed(2) + '%',
      totalWeightedUtilization: totalWeightedUtilization.toFixed(2) + '%'
    });

    // Round to 2 decimal places
    // Timeline and Physical are no longer calculated here
    return {
      timeline: 0, // No longer used
      budget: Math.round(Math.min(100, Math.max(0, budgetProgress)) * 100) / 100,
      physical: 0 // No longer used
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
          attributes: [
            'id', 'name', 'email', 'department', 'profilePictureUrl', 'contactNumber',
            'group', 'subRole', 'externalCompanyName'
          ]
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
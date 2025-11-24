const { Project, ProjectMilestone, MilestoneSubmission, ActivityLog, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Check if all milestones for a project are completed/approved
 * and update project status to 'completed' if needed
 * 
 * @param {string} projectId - The project ID to check
 * @param {Object} project - Optional project instance (to avoid re-fetching)
 * @returns {Promise<Object>} - { isCompleted: boolean, wasUpdated: boolean, project: Project }
 */
async function checkAndUpdateProjectCompletion(projectId, project = null) {
  try {
    // Fetch project if not provided
    if (!project) {
      project = await Project.findByPk(projectId);
      if (!project) {
        console.error(`Project ${projectId} not found`);
        return { isCompleted: false, wasUpdated: false, project: null };
      }
    }

    // Skip if already marked as completed
    // Note: Database ENUM uses 'complete' not 'completed'
    if (project.status === 'complete' || project.status === 'completed') {
      return { isCompleted: true, wasUpdated: false, project };
    }

    // Get all milestones for the project
    const allMilestones = await ProjectMilestone.findAll({
      where: { projectId: projectId },
      attributes: ['id', 'status', 'timelineStatus', 'budgetStatus', 'physicalStatus']
    });

    // If no milestones, don't mark as completed (project might be in early stage)
    if (allMilestones.length === 0) {
      return { isCompleted: false, wasUpdated: false, project };
    }

    // Check if all milestones are completed/approved
    // A milestone is considered completed if:
    // 1. status is 'completed' or 'approved'
    // 2. OR it has approved submissions
    // 3. OR all divisions (timeline, budget, physical) are approved
    const milestoneChecks = await Promise.all(
      allMilestones.map(async (milestone) => {
        // Check milestone status
        const statusCompleted = milestone.status === 'completed' || milestone.status === 'approved';
        
        // Check if all divisions are approved
        const divisionsApproved = 
          milestone.timelineStatus === 'approved' &&
          milestone.budgetStatus === 'approved' &&
          milestone.physicalStatus === 'approved';
        
        // Check for approved submissions
        const approvedSubmissions = await MilestoneSubmission.count({
          where: {
            milestoneId: milestone.id,
            status: {
              [Op.in]: ['approved', 'iu_approved']
            }
          }
        });
        
        return statusCompleted || divisionsApproved || approvedSubmissions > 0;
      })
    );

    const allMilestonesCompleted = milestoneChecks.every(check => check === true);

    // If all milestones are completed, update project status
    // Note: Database ENUM uses 'complete' not 'completed'
    if (allMilestonesCompleted) {
      const completionDate = new Date();
      const wasAlreadyCompleted = project.status === 'complete' || project.status === 'completed';
      
      await project.update({
        status: 'complete', // Database ENUM value is 'complete', not 'completed'
        completionDate: completionDate,
        actualCompletionDate: completionDate
      });
      
      console.log(`✅ Project ${project.projectCode} (${project.name}) marked as completed - all ${allMilestones.length} milestones are completed`);
      
      // Log project completion activity if it's a new completion
      if (!wasAlreadyCompleted) {
        try {
          // Try to find who approved the last milestone (if available)
          const lastMilestone = allMilestones[allMilestones.length - 1];
          let completedByUserId = null;
          
          if (lastMilestone && lastMilestone.validatedBy) {
            completedByUserId = lastMilestone.validatedBy;
          } else {
            // Try to find from milestone submissions
            const lastSubmission = await MilestoneSubmission.findOne({
              where: {
                milestoneId: { [Op.in]: allMilestones.map(m => m.id) },
                status: { [Op.in]: ['approved', 'iu_approved'] }
              },
              order: [['reviewedAt', 'DESC'], [['createdAt', 'DESC']]],
              attributes: ['reviewedBy', 'milestoneId']
            });
            
            if (lastSubmission && lastSubmission.reviewedBy) {
              completedByUserId = lastSubmission.reviewedBy;
            }
          }
          
          // Log project completion
          await ActivityLog.create({
            userId: completedByUserId || project.implementingOfficeId || null,
            action: 'PROJECT_COMPLETED',
            entityType: 'Project',
            entityId: project.id,
            details: `Project completed: ${project.name} (${project.projectCode}). All ${allMilestones.length} milestone(s) have been approved and completed. Completion Date: ${completionDate.toLocaleString()}`,
            module: 'Project Management',
            level: 'Info',
            status: 'Success'
          });
          
          console.log(`✅ Project completion logged in audit trail`);
        } catch (logError) {
          console.warn('⚠️ Failed to log project completion activity (non-critical):', logError);
        }
      }
      
      // Reload project to get updated data
      await project.reload();
      
      return { isCompleted: true, wasUpdated: !wasAlreadyCompleted, project };
    }

    return { isCompleted: false, wasUpdated: false, project };
  } catch (error) {
    console.error(`Error checking project completion for ${projectId}:`, error);
    return { isCompleted: false, wasUpdated: false, project: project || null };
  }
}

/**
 * Check and update completion status for multiple projects
 * 
 * @param {Array<string>} projectIds - Array of project IDs
 * @returns {Promise<Object>} - { updated: number, projects: Array<Project> }
 */
async function checkAndUpdateMultipleProjects(projectIds) {
  try {
    const results = await Promise.all(
      projectIds.map(id => checkAndUpdateProjectCompletion(id))
    );
    
    const updated = results.filter(r => r.wasUpdated).length;
    
    return {
      updated,
      projects: results.map(r => r.project).filter(p => p !== null)
    };
  } catch (error) {
    console.error('Error checking multiple projects completion:', error);
    return { updated: 0, projects: [] };
  }
}

/**
 * Ensure project status is correct based on milestones (for single project fetch)
 * This is a lighter version that doesn't update, just returns the correct status
 * 
 * @param {Object} project - Project instance
 * @returns {Promise<string>} - Correct status ('completed' or original status)
 */
async function getCorrectProjectStatus(project) {
  try {
    // If already completed, return as is
    // Note: Database ENUM uses 'complete' not 'completed', but we normalize to 'completed' for API responses
    if (project.status === 'complete' || project.status === 'completed') {
      return 'completed';
    }

    // Get all milestones
    const allMilestones = await ProjectMilestone.findAll({
      where: { projectId: project.id },
      attributes: ['id', 'status', 'timelineStatus', 'budgetStatus', 'physicalStatus']
    });

    // If no milestones, return original status
    if (allMilestones.length === 0) {
      return project.status;
    }

    // Check if all milestones are completed
    const milestoneChecks = await Promise.all(
      allMilestones.map(async (milestone) => {
        const statusCompleted = milestone.status === 'completed' || milestone.status === 'approved';
        const divisionsApproved = 
          milestone.timelineStatus === 'approved' &&
          milestone.budgetStatus === 'approved' &&
          milestone.physicalStatus === 'approved';
        
        const approvedSubmissions = await MilestoneSubmission.count({
          where: {
            milestoneId: milestone.id,
            status: {
              [Op.in]: ['approved', 'iu_approved']
            }
          }
        });
        
        return statusCompleted || divisionsApproved || approvedSubmissions > 0;
      })
    );

    const allMilestonesCompleted = milestoneChecks.every(check => check === true);
    
    // Return 'completed' for API consistency (database stores 'complete')
    return allMilestonesCompleted ? 'completed' : project.status;
  } catch (error) {
    console.error(`Error getting correct status for project ${project.id}:`, error);
    return project.status; // Return original status on error
  }
}

module.exports = {
  checkAndUpdateProjectCompletion,
  checkAndUpdateMultipleProjects,
  getCorrectProjectStatus
};


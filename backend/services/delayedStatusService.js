const { Project, ProjectMilestone, ProjectUpdate } = require('../models');
const { Op } = require('sequelize');

class DelayedStatusService {
  
  /**
   * Check if any milestones are overdue for a project
   * @param {string} projectId - Project ID
   * @returns {Object} - { isDelayed: boolean, overdueMilestones: Array, delayInfo: Object }
   */
  async checkProjectDelayedStatus(projectId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to beginning of day for accurate comparison
      
      // Get all milestones for the project
      const milestones = await ProjectMilestone.findAll({
        where: { 
          projectId,
          status: {
            [Op.notIn]: ['completed'] // Only check non-completed milestones
          }
        },
        order: [['dueDate', 'ASC']]
      });

      const overdueMilestones = [];
      
      for (const milestone of milestones) {
        const dueDate = new Date(milestone.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // Check if milestone is overdue
        if (dueDate < today) {
          const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          
          overdueMilestones.push({
            id: milestone.id,
            title: milestone.title,
            dueDate: milestone.dueDate,
            daysOverdue,
            weight: milestone.weight,
            status: milestone.status,
            plannedBudget: milestone.plannedBudget
          });
        }
      }

      const isDelayed = overdueMilestones.length > 0;
      
      // Calculate delay severity
      let maxDaysOverdue = 0;
      let totalOverdueWeight = 0;
      
      overdueMilestones.forEach(milestone => {
        if (milestone.daysOverdue > maxDaysOverdue) {
          maxDaysOverdue = milestone.daysOverdue;
        }
        totalOverdueWeight += parseFloat(milestone.weight) || 0;
      });

      const delayInfo = {
        overdueMilestoneCount: overdueMilestones.length,
        maxDaysOverdue,
        totalOverdueWeight,
        firstOverdueDate: overdueMilestones.length > 0 ? overdueMilestones[0].dueDate : null,
        severity: this.calculateDelaySeverity(maxDaysOverdue, totalOverdueWeight)
      };

      return {
        isDelayed,
        overdueMilestones,
        delayInfo
      };
      
    } catch (error) {
      console.error('Error checking project delayed status:', error);
      throw error;
    }
  }

  /**
   * Calculate delay severity based on days overdue and weight
   * @param {number} maxDaysOverdue 
   * @param {number} totalOverdueWeight 
   * @returns {string} - 'low', 'medium', 'high', 'critical'
   */
  calculateDelaySeverity(maxDaysOverdue, totalOverdueWeight) {
    if (maxDaysOverdue >= 30 || totalOverdueWeight >= 50) {
      return 'critical';
    } else if (maxDaysOverdue >= 14 || totalOverdueWeight >= 30) {
      return 'high';
    } else if (maxDaysOverdue >= 7 || totalOverdueWeight >= 15) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Update project status to delayed if milestones are overdue
   * @param {string} projectId - Project ID
   * @returns {Object} - Updated project status info
   */
  async updateProjectDelayedStatus(projectId) {
    try {
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const delayCheck = await this.checkProjectDelayedStatus(projectId);
      
      let updatedStatus = project.status;
      let statusChanged = false;

      if (delayCheck.isDelayed && project.status !== 'delayed' && project.status !== 'completed') {
        // Update project status to delayed
        updatedStatus = 'delayed';
        statusChanged = true;
        
        await project.update({
          status: 'delayed',
          lastProgressUpdate: new Date()
        });

        // Update overdue milestones status
        for (const overdueMilestone of delayCheck.overdueMilestones) {
          await ProjectMilestone.update(
            { status: 'delayed' },
            { where: { id: overdueMilestone.id } }
          );
        }

        console.log(`✅ Project ${projectId} status updated to DELAYED - ${delayCheck.overdueMilestones.length} overdue milestones`);
        
      } else if (!delayCheck.isDelayed && project.status === 'delayed') {
        // If no longer delayed, update back to ongoing (if appropriate)
        const hasOngoingMilestones = await ProjectMilestone.findOne({
          where: { 
            projectId,
            status: {
              [Op.in]: ['pending', 'in_progress']
            }
          }
        });

        if (hasOngoingMilestones) {
          updatedStatus = 'ongoing';
          statusChanged = true;
          
          await project.update({
            status: 'ongoing',
            lastProgressUpdate: new Date()
          });

          console.log(`✅ Project ${projectId} status updated back to ONGOING - no more overdue milestones`);
        }
      }

      return {
        projectId,
        previousStatus: project.status,
        currentStatus: updatedStatus,
        statusChanged,
        delayInfo: delayCheck.delayInfo,
        overdueMilestones: delayCheck.overdueMilestones
      };
      
    } catch (error) {
      console.error('Error updating project delayed status:', error);
      throw error;
    }
  }

  /**
   * Create a delayed status update record for tracking
   * @param {string} projectId 
   * @param {Object} delayInfo 
   * @param {Array} overdueMilestones 
   */
  async createDelayedStatusUpdate(projectId, delayInfo, overdueMilestones) {
    try {
      // Create a special project update record to track the delay
      const delayUpdate = await ProjectUpdate.create({
        projectId,
        submittedBy: null, // System-generated
        updateType: 'system_delay_notification',
        description: `Project automatically marked as delayed due to ${delayInfo.overdueMilestoneCount} overdue milestone(s)`,
        status: 'system_generated',
        submissionDate: new Date(),
        
        // Store delay details in milestoneUpdates field as JSON
        milestoneUpdates: JSON.stringify({
          type: 'delay_notification',
          delayInfo,
          overdueMilestones,
          timestamp: new Date().toISOString(),
          reason: 'milestone_overdue'
        })
      });

      console.log(`✅ Created delayed status update record for project ${projectId}`);
      return delayUpdate;
      
    } catch (error) {
      console.error('Error creating delayed status update:', error);
      throw error;
    }
  }

  /**
   * Check all active projects for delayed status (cron job function)
   */
  async checkAllProjectsForDelays() {
    try {
      console.log('🔍 Starting delayed status check for all active projects...');
      
      const activeProjects = await Project.findAll({
        where: {
          status: {
            [Op.in]: ['ongoing', 'delayed'] // Check both ongoing and already delayed projects
          }
        }
      });

      let updatedProjects = 0;
      let newlyDelayedProjects = 0;

      for (const project of activeProjects) {
        try {
          const result = await this.updateProjectDelayedStatus(project.id);
          
          if (result.statusChanged) {
            updatedProjects++;
            
            if (result.currentStatus === 'delayed') {
              newlyDelayedProjects++;
              
              // Create delay notification record
              await this.createDelayedStatusUpdate(
                project.id, 
                result.delayInfo, 
                result.overdueMilestones
              );
            }
          }
        } catch (error) {
          console.error(`Error checking project ${project.id} for delays:`, error);
        }
      }

      console.log(`✅ Delayed status check complete: ${updatedProjects} projects updated, ${newlyDelayedProjects} newly delayed`);
      
      return {
        checkedProjects: activeProjects.length,
        updatedProjects,
        newlyDelayedProjects
      };
      
    } catch (error) {
      console.error('Error in bulk delayed status check:', error);
      throw error;
    }
  }
}

module.exports = new DelayedStatusService(); 
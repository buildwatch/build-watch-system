const { Notification, User, Project, ProjectUpdate, ProjectMilestone } = require('../models');

class ProjectNotificationService {
  // Create notification for milestone submission from EIU
  static async notifyMilestoneSubmission(projectUpdate, project, milestone) {
    try {
      const eiuUser = await User.findByPk(projectUpdate.submittedById);
      const projectName = project.name || 'Unknown Project';
      const milestoneTitle = milestone.title || 'Unknown Milestone';

      // Get the assigned implementing office user for this project
      const implementingOfficeUser = await User.findByPk(project.implementingOfficeId);
      
      if (!implementingOfficeUser) {
        console.error(`❌ No implementing office user assigned to project: ${project.id}`);
        return;
      }

      if (implementingOfficeUser.status !== 'active') {
        console.error(`❌ Assigned implementing office user is not active: ${implementingOfficeUser.id}`);
        return;
      }

      console.log(`🎯 Creating notification for assigned implementing office user: ${implementingOfficeUser.name} (ID: ${implementingOfficeUser.id})`);

      // Create notification only for the assigned implementing office user
      await Notification.create({
        userId: implementingOfficeUser.id,
        title: 'New Milestone Submission Received',
        message: `EIU Partner ${eiuUser?.name || 'Unknown'} has submitted milestone "${milestoneTitle}" for project "${projectName}". Please review and compile for Secretariat approval.`,
        type: 'Info',
        category: 'Project',
        entityType: 'ProjectUpdate',
        entityId: projectUpdate.id,
        priority: 'High',
        actionUrl: `/dashboard/iu-implementing-office/modules/progress-timeline?projectId=${project.id}`,
        actionText: 'Review Submission',
        metadata: JSON.stringify({
          projectId: project.id,
          projectName: projectName,
          milestoneId: milestone.id,
          milestoneTitle: milestoneTitle,
          submittedBy: eiuUser?.name || 'Unknown',
          submittedById: projectUpdate.submittedById,
          updateType: 'milestone_submission'
        }),
        isRead: false,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ Created notification for assigned implementing office user: ${implementingOfficeUser.name}`);
    } catch (error) {
      console.error('Error creating milestone submission notifications:', error);
    }
  }

  // Create notification for milestone compilation and submission to Secretariat
  static async notifySecretariatSubmission(projectUpdate, project, milestone) {
    try {
      const iuUser = await User.findByPk(projectUpdate.submittedById);
      const projectName = project.name || 'Unknown Project';
      const milestoneTitle = milestone.title || 'Unknown Milestone';

      // Notify Secretariat users
      const secretariatUsers = await User.findAll({
        where: {
          role: 'SECRETARIAT',
          status: 'active'
        }
      });

      const notificationPromises = secretariatUsers.map(user => 
        Notification.create({
          userId: user.id,
          title: 'Milestone Ready for Secretariat Review',
          message: `Implementing Office Officer ${iuUser?.name || 'Unknown'} has compiled and submitted milestone "${milestoneTitle}" for project "${projectName}". Please review and provide verdict.`,
          type: 'Info',
          category: 'Project',
          entityType: 'ProjectUpdate',
          entityId: projectUpdate.id,
          priority: 'High',
          actionUrl: `/dashboard/lgu-pmt-mpmec-secretariat/modules/compilation?projectId=${project.id}`,
          actionText: 'Review Milestone',
          metadata: {
            projectId: project.id,
            projectName: projectName,
            milestoneId: milestone.id,
            milestoneTitle: milestoneTitle,
            submittedBy: iuUser?.name || 'Unknown',
            submittedById: projectUpdate.submittedById,
            updateType: 'secretariat_submission'
          }
        })
      );

      await Promise.all(notificationPromises);
      console.log(`✅ Created ${secretariatUsers.length} notifications for Secretariat submission`);
    } catch (error) {
      console.error('Error creating Secretariat submission notifications:', error);
    }
  }

  // Create notification for Secretariat verdict on milestone divisions
  static async notifySecretariatVerdict(projectUpdate, project, milestone, verdicts) {
    try {
      const secretariatUser = await User.findByPk(projectUpdate.secretariatReviewer);
      const projectName = project.name || 'Unknown Project';
      const milestoneTitle = milestone.title || 'Unknown Milestone';

      // Get the original EIU user who submitted the milestone
      const originalSubmission = await ProjectUpdate.findOne({
        where: {
          projectId: project.id,
          milestoneId: milestone.id,
          updateType: 'milestone'
        },
        order: [['createdAt', 'ASC']]
      });

      const eiuUserId = originalSubmission?.submittedById;
      const iuUserId = projectUpdate.submittedById;

      const notifications = [];

      // Notify EIU Partner about verdict
      if (eiuUserId) {
        const verdictSummary = this.getVerdictSummary(verdicts);
        const needsResubmission = Object.values(verdicts).some(v => v === 'rejected');
        
        notifications.push(
          Notification.create({
            userId: eiuUserId,
            title: needsResubmission ? 'Milestone Revision Required' : 'Milestone Approved',
            message: `Secretariat has reviewed your milestone "${milestoneTitle}" for project "${projectName}". ${verdictSummary} ${needsResubmission ? 'Please resubmit the rejected divisions.' : 'All divisions have been approved.'}`,
            type: needsResubmission ? 'Warning' : 'Success',
            category: 'Project',
            entityType: 'ProjectUpdate',
            entityId: projectUpdate.id,
            priority: 'High',
            actionUrl: `/dashboard/eiu/modules/submit-update?projectId=${project.id}`,
            actionText: needsResubmission ? 'Resubmit Milestone' : 'View Details',
            metadata: {
              projectId: project.id,
              projectName: projectName,
              milestoneId: milestone.id,
              milestoneTitle: milestoneTitle,
              verdicts: verdicts,
              needsResubmission: needsResubmission,
              updateType: 'secretariat_verdict'
            }
          })
        );
      }

      // Notify Implementing Office Officer about verdict
      if (iuUserId) {
        const verdictSummary = this.getVerdictSummary(verdicts);
        notifications.push(
          Notification.create({
            userId: iuUserId,
            title: 'Secretariat Verdict Issued',
            message: `Secretariat has issued a verdict for milestone "${milestoneTitle}" in project "${projectName}". ${verdictSummary}`,
            type: 'Info',
            category: 'Project',
            entityType: 'ProjectUpdate',
            entityId: projectUpdate.id,
            priority: 'Medium',
            actionUrl: `/dashboard/iu-implementing-office/modules/progress-timeline?projectId=${project.id}`,
            actionText: 'View Verdict',
            metadata: {
              projectId: project.id,
              projectName: projectName,
              milestoneId: milestone.id,
              milestoneTitle: milestoneTitle,
              verdicts: verdicts,
              updateType: 'secretariat_verdict'
            }
          })
        );
      }

      // Notify Executive Viewer about project progress update
      const executiveUsers = await User.findAll({
        where: {
          role: 'EXECUTIVE_VIEWER',
          status: 'active'
        }
      });

      const executiveNotifications = executiveUsers.map(user => 
        Notification.create({
          userId: user.id,
          title: 'Project Progress Update',
          message: `Project "${projectName}" has received a Secretariat verdict for milestone "${milestoneTitle}". Project progress has been updated.`,
          type: 'Info',
          category: 'Project',
          entityType: 'Project',
          entityId: project.id,
          priority: 'Medium',
          actionUrl: `/dashboard/executive-viewer/modules/heatmap?projectId=${project.id}`,
          actionText: 'View Project',
          metadata: {
            projectId: project.id,
            projectName: projectName,
            milestoneId: milestone.id,
            milestoneTitle: milestoneTitle,
            updateType: 'project_progress_update'
          }
        })
      );

      notifications.push(...executiveNotifications);

      await Promise.all(notifications);
      console.log(`✅ Created ${notifications.length} notifications for Secretariat verdict`);
    } catch (error) {
      console.error('Error creating Secretariat verdict notifications:', error);
    }
  }

  // Create notification for milestone resubmission
  static async notifyMilestoneResubmission(projectUpdate, project, milestone) {
    try {
      const eiuUser = await User.findByPk(projectUpdate.submittedById);
      const projectName = project.name || 'Unknown Project';
      const milestoneTitle = milestone.title || 'Unknown Milestone';

      // Notify Implementing Office Officers about resubmission
      const implementingOfficeUsers = await User.findAll({
        where: {
          role: 'IU',
          status: 'active'
        }
      });

      const notificationPromises = implementingOfficeUsers.map(user => 
        Notification.create({
          userId: user.id,
          title: 'Milestone Resubmission Received',
          message: `EIU Partner ${eiuUser?.name || 'Unknown'} has resubmitted milestone "${milestoneTitle}" for project "${projectName}" after Secretariat revision request. Please review and recompile.`,
          type: 'Info',
          category: 'Project',
          entityType: 'ProjectUpdate',
          entityId: projectUpdate.id,
          priority: 'High',
          actionUrl: `/dashboard/iu-implementing-office/modules/progress-timeline?projectId=${project.id}`,
          actionText: 'Review Resubmission',
          metadata: {
            projectId: project.id,
            projectName: projectName,
            milestoneId: milestone.id,
            milestoneTitle: milestoneTitle,
            submittedBy: eiuUser?.name || 'Unknown',
            submittedById: projectUpdate.submittedById,
            updateType: 'milestone_resubmission'
          }
        })
      );

      await Promise.all(notificationPromises);
      console.log(`✅ Created ${implementingOfficeUsers.length} notifications for milestone resubmission`);
    } catch (error) {
      console.error('Error creating milestone resubmission notifications:', error);
    }
  }

  // Create notification for project completion
  static async notifyProjectCompletion(project) {
    try {
      const projectName = project.name || 'Unknown Project';

      // Notify all relevant users about project completion
      const users = await User.findAll({
        where: {
          role: ['EIU', 'IU', 'SECRETARIAT', 'EXECUTIVE_VIEWER', 'LGU_PMT'],
          status: 'active'
        }
      });

      const notificationPromises = users.map(user => 
        Notification.create({
          userId: user.id,
          title: 'Project Completed Successfully',
          message: `Project "${projectName}" has been completed successfully. All milestones have been approved and the project is now finished.`,
          type: 'Success',
          category: 'Project',
          entityType: 'Project',
          entityId: project.id,
          priority: 'Medium',
          actionUrl: `/dashboard/${this.getUserDashboardPath(user.role)}?projectId=${project.id}`,
          actionText: 'View Project',
          metadata: {
            projectId: project.id,
            projectName: projectName,
            updateType: 'project_completion'
          }
        })
      );

      await Promise.all(notificationPromises);
      console.log(`✅ Created ${users.length} notifications for project completion`);
    } catch (error) {
      console.error('Error creating project completion notifications:', error);
    }
  }

  // Helper method to get verdict summary
  static getVerdictSummary(verdicts) {
    const approved = Object.values(verdicts).filter(v => v === 'approved').length;
    const rejected = Object.values(verdicts).filter(v => v === 'rejected').length;
    const total = Object.keys(verdicts).length;

    if (approved === total) {
      return 'All divisions have been approved.';
    } else if (rejected === total) {
      return 'All divisions have been rejected and require revision.';
    } else {
      return `${approved} division(s) approved, ${rejected} division(s) rejected.`;
    }
  }

  // Helper method to get user dashboard path
  static getUserDashboardPath(role) {
    const paths = {
      'EIU': 'eiu',
      'IU': 'iu-implementing-office',
      'SECRETARIAT': 'lgu-pmt-mpmec-secretariat',
      'EXECUTIVE_VIEWER': 'executive-viewer',
      'LGU_PMT': 'lgu-pmt-mpmec'
    };
    return paths[role] || 'dashboard';
  }

  // Create notification for overdue milestones
  static async notifyOverdueMilestone(project, milestone) {
    try {
      const projectName = project.name || 'Unknown Project';
      const milestoneTitle = milestone.title || 'Unknown Milestone';

      // Get EIU users assigned to this project
      const eiuUsers = await User.findAll({
        where: {
          role: 'EIU',
          status: 'active'
        }
      });

      const notificationPromises = eiuUsers.map(user => 
        Notification.create({
          userId: user.id,
          title: 'Milestone Overdue',
          message: `Milestone "${milestoneTitle}" for project "${projectName}" is overdue. Please submit updates as soon as possible.`,
          type: 'Warning',
          category: 'Reminder',
          entityType: 'ProjectMilestone',
          entityId: milestone.id,
          priority: 'High',
          actionUrl: `/dashboard/eiu/modules/submit-update?projectId=${project.id}`,
          actionText: 'Submit Update',
          metadata: {
            projectId: project.id,
            projectName: projectName,
            milestoneId: milestone.id,
            milestoneTitle: milestoneTitle,
            dueDate: milestone.dueDate,
            updateType: 'milestone_overdue'
          }
        })
      );

      await Promise.all(notificationPromises);
      console.log(`✅ Created ${eiuUsers.length} notifications for overdue milestone`);
    } catch (error) {
      console.error('Error creating overdue milestone notifications:', error);
    }
  }
}

module.exports = ProjectNotificationService; 
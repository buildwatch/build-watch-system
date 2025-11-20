const { Article, Project, ProjectMilestone, MilestoneSubmission } = require('../models');

/**
 * Auto News Generator Service
 * Automatically generates news articles/blog posts when project events occur
 */
class AutoNewsGenerator {
  /**
   * Generate article title based on event type and project data
   */
  static generateTitle(eventType, project, milestone = null) {
    const projectName = project.name || 'Project';
    const projectCode = project.projectCode || '';
    const milestoneTitle = milestone?.title || '';
    
    switch (eventType) {
      case 'PROJECT_CREATED':
        return `New Project Launched: ${projectName}${projectCode ? ` (${projectCode})` : ''}`;
      
      case 'PROJECT_APPROVED':
        return `${projectName} Approved for Implementation${projectCode ? ` (${projectCode})` : ''}`;
      
      case 'PROJECT_UPDATED':
        return `Progress Update: ${projectName}${projectCode ? ` (${projectCode})` : ''}`;
      
      case 'MILESTONE_APPROVED':
        if (milestoneTitle) {
          return `${milestoneTitle} Milestone Completed for ${projectName}`;
        }
        return `Milestone Completed for ${projectName}${projectCode ? ` (${projectCode})` : ''}`;
      
      case 'PROJECT_COMPLETED':
        return `${projectName} Successfully Completed${projectCode ? ` (${projectCode})` : ''}`;
      
      case 'PROJECT_STATUS_CHANGED':
        const status = project.status || 'ongoing';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        return `${projectName} Status: ${statusText}${projectCode ? ` (${projectCode})` : ''}`;
      
      default:
        return `Update: ${projectName}${projectCode ? ` (${projectCode})` : ''}`;
    }
  }

  /**
   * Generate article summary based on event type and project data
   */
  static generateSummary(eventType, project, milestone = null, additionalData = {}) {
    const projectName = project.name || 'the project';
    const location = project.location || 'Santa Cruz, Laguna';
    const implementingOffice = project.implementingOfficeName || project.implementingOffice || 'Municipal Government';
    const budget = project.totalBudget ? `₱${parseFloat(project.totalBudget).toLocaleString('en-PH')}` : 'funded';
    const progress = project.overallProgress || project.progress || 0;
    const milestoneTitle = milestone?.title || '';
    
    switch (eventType) {
      case 'PROJECT_CREATED':
        return `The Municipality of Santa Cruz, Laguna announces the launch of ${projectName}, a new infrastructure initiative located in ${location}. This project, managed by ${implementingOffice}, has a total budget of ${budget} and aims to improve local infrastructure and community services.`;
      
      case 'PROJECT_APPROVED':
        return `${projectName} has been officially approved for implementation by the Municipal Project Monitoring and Evaluation Committee (MPMEC). The project, located in ${location}, will be managed by ${implementingOffice} with a total budget of ${budget}. Implementation is set to begin soon.`;
      
      case 'PROJECT_UPDATED':
        const progressText = progress > 0 ? `currently at ${progress.toFixed(1)}% completion` : 'in progress';
        return `Latest progress update for ${projectName}: The project is ${progressText} and continues to make steady progress. Located in ${location}, this initiative managed by ${implementingOffice} is on track to deliver its expected outcomes.`;
      
      case 'MILESTONE_APPROVED':
        if (milestoneTitle) {
          return `Great progress on ${projectName}! The "${milestoneTitle}" milestone has been successfully completed and approved. This achievement brings the project one step closer to completion, demonstrating continued commitment to infrastructure development in ${location}.`;
        }
        return `A significant milestone has been reached for ${projectName}. The milestone has been completed and approved, marking important progress in this infrastructure initiative located in ${location}.`;
      
      case 'PROJECT_COMPLETED':
        return `${projectName} has been successfully completed! This infrastructure project, located in ${location} and managed by ${implementingOffice}, has reached 100% completion. The project, with a total budget of ${budget}, is now ready to serve the community and deliver its intended benefits.`;
      
      case 'PROJECT_STATUS_CHANGED':
        const status = project.status || 'ongoing';
        const statusDescription = {
          'ongoing': 'actively progressing',
          'delayed': 'experiencing delays',
          'completed': 'successfully completed',
          'on hold': 'temporarily on hold'
        }[status.toLowerCase()] || 'in progress';
        return `${projectName} status update: The project is now ${statusDescription}. Located in ${location} and managed by ${implementingOffice}, this initiative continues to be monitored closely to ensure successful completion.`;
      
      default:
        return `Update on ${projectName}: The project, located in ${location} and managed by ${implementingOffice}, continues to progress toward its goals.`;
    }
  }

  /**
   * Generate full article content
   */
  static generateContent(eventType, project, milestone = null, additionalData = {}) {
    const projectName = project.name || 'the project';
    const projectCode = project.projectCode || '';
    const location = project.location || 'Santa Cruz, Laguna';
    const implementingOffice = project.implementingOfficeName || project.implementingOffice || 'Municipal Government';
    const budget = project.totalBudget ? `₱${parseFloat(project.totalBudget).toLocaleString('en-PH')}` : 'funded';
    const description = project.description || 'This infrastructure project aims to improve local services and community welfare.';
    const progress = project.overallProgress || project.progress || 0;
    const milestoneTitle = milestone?.title || '';
    const milestoneDescription = milestone?.description || '';
    
    let content = `<h2>Project Overview</h2><p>${description}</p>`;
    content += `<p><strong>Location:</strong> ${location}</p>`;
    content += `<p><strong>Implementing Office:</strong> ${implementingOffice}</p>`;
    if (projectCode) {
      content += `<p><strong>Project Code:</strong> ${projectCode}</p>`;
    }
    content += `<p><strong>Total Budget:</strong> ${budget}</p>`;
    
    switch (eventType) {
      case 'PROJECT_CREATED':
        content += `<h2>Project Launch</h2><p>The Municipality of Santa Cruz, Laguna is pleased to announce the launch of ${projectName}. This new infrastructure initiative represents our continued commitment to improving local services and community welfare.</p>`;
        if (project.startDate) {
          content += `<p><strong>Start Date:</strong> ${new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
        }
        if (project.targetCompletionDate || project.endDate) {
          const targetDate = project.targetCompletionDate || project.endDate;
          content += `<p><strong>Target Completion:</strong> ${new Date(targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
        }
        break;
      
      case 'PROJECT_APPROVED':
        content += `<h2>Approval and Implementation</h2><p>${projectName} has received official approval from the Municipal Project Monitoring and Evaluation Committee (MPMEC). This approval marks an important milestone in the project lifecycle, allowing implementation to proceed.</p>`;
        content += `<p>The project will be closely monitored throughout its implementation to ensure adherence to timelines, budget, and quality standards.</p>`;
        break;
      
      case 'PROJECT_UPDATED':
        content += `<h2>Progress Update</h2><p>We are pleased to report that ${projectName} is making steady progress. The project is currently at ${progress.toFixed(1)}% completion.</p>`;
        if (additionalData.updateDetails) {
          content += `<p>${additionalData.updateDetails}</p>`;
        }
        content += `<p>Regular monitoring and evaluation continue to ensure the project stays on track to meet its objectives.</p>`;
        break;
      
      case 'MILESTONE_APPROVED':
        content += `<h2>Milestone Achievement</h2>`;
        if (milestoneTitle) {
          content += `<p>The "${milestoneTitle}" milestone has been successfully completed and approved for ${projectName}.</p>`;
          if (milestoneDescription) {
            content += `<p>${milestoneDescription}</p>`;
          }
        } else {
          content += `<p>A significant milestone has been reached for ${projectName}.</p>`;
        }
        content += `<p>This achievement demonstrates continued progress and commitment to delivering quality infrastructure for the community.</p>`;
        content += `<p><strong>Current Overall Progress:</strong> ${progress.toFixed(1)}%</p>`;
        break;
      
      case 'PROJECT_COMPLETED':
        content += `<h2>Project Completion</h2><p>We are delighted to announce that ${projectName} has been successfully completed! This achievement represents months of dedicated work and collaboration.</p>`;
        if (project.completionDate || project.actualCompletionDate) {
          const completionDate = project.completionDate || project.actualCompletionDate;
          content += `<p><strong>Completion Date:</strong> ${new Date(completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
        }
        content += `<p>The project is now ready to serve the community and deliver its intended benefits to the residents of ${location}.</p>`;
        break;
      
      default:
        content += `<h2>Project Update</h2><p>${projectName} continues to progress toward its goals. Regular monitoring ensures that the project maintains high standards of quality and efficiency.</p>`;
    }
    
    content += `<h2>Transparency and Monitoring</h2><p>This project is part of the Build Watch system, which promotes transparency and accountability in local governance. All project information, progress updates, and documentation are available to the public through the Build Watch platform.</p>`;
    
    return content;
  }

  /**
   * Get cover image for article
   * Priority: milestone photo > project initial photo > default
   */
  static async getCoverImage(project, milestone = null, milestoneSubmission = null) {
    // First, try to get photo from milestone submission (if milestone was just approved)
    if (milestoneSubmission) {
      const submissionData = milestoneSubmission.toJSON ? milestoneSubmission.toJSON() : milestoneSubmission;
      
      // Check for photo evidence
      if (submissionData.photoEvidence && Array.isArray(submissionData.photoEvidence) && submissionData.photoEvidence.length > 0) {
        const firstPhoto = submissionData.photoEvidence[0];
        const photoUrl = firstPhoto.url || firstPhoto.src || firstPhoto;
        if (photoUrl && photoUrl !== 'None' && photoUrl !== '') {
          return photoUrl.startsWith('http') ? photoUrl : `http://localhost:3000${photoUrl.startsWith('/') ? photoUrl : '/' + photoUrl}`;
        }
      }
    }
    
    // Second, try project initial photo
    if (project.initialPhoto && project.initialPhoto !== '' && project.initialPhoto !== 'None' && project.initialPhoto !== 'null') {
      return project.initialPhoto.startsWith('http') ? project.initialPhoto : `http://localhost:3000${project.initialPhoto.startsWith('/') ? project.initialPhoto : '/' + project.initialPhoto}`;
    }
    
    // Default: return null (frontend can handle fallback)
    return null;
  }

  /**
   * Generate tags based on project and event
   */
  static generateTags(eventType, project, milestone = null) {
    const tags = [];
    
    // Add event type tag
    tags.push(eventType.toLowerCase().replace(/_/g, '-'));
    
    // Add project category
    if (project.category) {
      tags.push(project.category.toLowerCase());
    }
    
    // Add location tags
    if (project.location) {
      const locationParts = project.location.split(',').map(part => part.trim().toLowerCase());
      tags.push(...locationParts);
    }
    
    // Add implementing office tag
    if (project.implementingOfficeName || project.implementingOffice) {
      const office = (project.implementingOfficeName || project.implementingOffice).toLowerCase().replace(/\s+/g, '-');
      tags.push(office);
    }
    
    // Add milestone tag if applicable
    if (milestone && milestone.title) {
      tags.push('milestone', milestone.title.toLowerCase().replace(/\s+/g, '-'));
    }
    
    // Add project status
    if (project.status) {
      tags.push(project.status.toLowerCase());
    }
    
    // Add common tags
    tags.push('build-watch', 'santa-cruz', 'laguna', 'infrastructure', 'public-projects');
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Determine article category based on event type
   */
  static getCategory(eventType) {
    switch (eventType) {
      case 'PROJECT_CREATED':
      case 'PROJECT_APPROVED':
        return 'News';
      case 'PROJECT_UPDATED':
      case 'MILESTONE_APPROVED':
        return 'Update';
      case 'PROJECT_COMPLETED':
        return 'News';
      case 'PROJECT_STATUS_CHANGED':
        return 'Announcement';
      default:
        return 'News';
    }
  }

  /**
   * Main method to generate and save article
   */
  static async generateArticle(eventType, project, options = {}) {
    try {
      const { milestone = null, milestoneSubmission = null, userId = null, additionalData = {} } = options;
      
      // Ensure project is a full object (fetch if needed)
      let projectData = project;
      if (typeof project === 'string' || (project && !project.name)) {
        projectData = await Project.findByPk(project);
        if (!projectData) {
          console.error('Project not found for article generation');
          return null;
        }
      }
      
      // Generate article data
      const title = this.generateTitle(eventType, projectData, milestone);
      const summary = this.generateSummary(eventType, projectData, milestone, additionalData);
      const content = this.generateContent(eventType, projectData, milestone, additionalData);
      const category = this.getCategory(eventType);
      const tags = this.generateTags(eventType, projectData, milestone);
      const imageUrl = await this.getCoverImage(projectData, milestone, milestoneSubmission);
      
      // Determine if article should be featured (new projects and completions)
      const isFeatured = eventType === 'PROJECT_CREATED' || eventType === 'PROJECT_APPROVED' || eventType === 'PROJECT_COMPLETED';
      
      // Create the article
      const article = await Article.create({
        title,
        summary,
        content,
        author: 'Build Watch System',
        authorId: userId,
        publishDate: new Date(),
        imageUrl,
        category,
        tags,
        isFeatured,
        projectId: projectData.id,
        status: 'Published',
        metadata: {
          eventType,
          autoGenerated: true,
          projectCode: projectData.projectCode,
          milestoneId: milestone?.id || null
        }
      });
      
      console.log(`✅ Auto-generated article: "${title}" (ID: ${article.id})`);
      
      return article;
    } catch (error) {
      console.error('Error generating auto article:', error);
      // Don't throw - article generation should not break the main workflow
      return null;
    }
  }
}

module.exports = AutoNewsGenerator;


import { apiClient } from './api.js';

class ProjectService {
  // ===== PROJECT CRUD OPERATIONS =====

  // Create new project
  async createProject(projectData) {
    try {
      const response = await apiClient.post('/api/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  // Get projects based on user role
  async getProjects(params = {}) {
    try {
      const response = await apiClient.projects.getProjects(params);
      return response;
    } catch (error) {
      console.error('Get projects error:', error);
      throw error;
    }
  }

  // Get project by ID with detailed information
  async getProject(id) {
    try {
      const response = await apiClient.projects.getProject(id);
      return response;
    } catch (error) {
      console.error('Get project error:', error);
      throw error;
    }
  }

  // Update project
  async updateProject(id, updateData) {
    try {
      const response = await apiClient.projects.updateProject(id, updateData);
      return response;
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  // Delete project
  async deleteProject(id) {
    try {
      const response = await apiClient.projects.deleteProject(id);
      return response;
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  // ===== PROJECT APPROVAL WORKFLOW =====

  // Approve/reject project (Secretariat only)
  async approveProject(id, { approved, comments }) {
    try {
      const response = await apiClient.projects.approveProject(id, { approved, comments });
      return response;
    } catch (error) {
      console.error('Approve project error:', error);
      throw error;
    }
  }

  // ===== PROJECT UPDATES =====

  // Submit project update
  async submitUpdate(projectId, updateData) {
    try {
      const response = await apiClient.projects.submitUpdate(projectId, updateData);
      return response;
    } catch (error) {
      console.error('Submit update error:', error);
      throw error;
    }
  }

  // Get project updates
  async getProjectUpdates(projectId, params = {}) {
    try {
      const response = await apiClient.projects.getProjectUpdates(projectId, params);
      return response;
    } catch (error) {
      console.error('Get updates error:', error);
      throw error;
    }
  }

  // Approve/reject project update
  async approveUpdate(projectId, updateId, { approved, comments }) {
    try {
      const response = await apiClient.projects.approveUpdate(projectId, updateId, { approved, comments });
      return response;
    } catch (error) {
      console.error('Approve update error:', error);
      throw error;
    }
  }

  // ===== PROJECT MILESTONES =====

  // Create milestone
  async createMilestone(projectId, milestoneData) {
    try {
      const response = await apiClient.projects.createMilestone(projectId, milestoneData);
      return response;
    } catch (error) {
      console.error('Create milestone error:', error);
      throw error;
    }
  }

  // Get project milestones
  async getProjectMilestones(projectId) {
    try {
      const response = await apiClient.projects.getProjectMilestones(projectId);
      return response;
    } catch (error) {
      console.error('Get milestones error:', error);
      throw error;
    }
  }

  // Update milestone
  async updateMilestone(projectId, milestoneId, updateData) {
    try {
      const response = await apiClient.projects.updateMilestone(projectId, milestoneId, updateData);
      return response;
    } catch (error) {
      console.error('Update milestone error:', error);
      throw error;
    }
  }

  // ===== DASHBOARD STATISTICS =====

  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const response = await apiClient.projects.getDashboardStats();
      return response;
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  // Calculate project progress
  calculateProgress(project) {
    const timelineProgress = parseFloat(project.timelineProgress) || 0;
    const budgetProgress = parseFloat(project.budgetProgress) || 0;
    const physicalProgress = parseFloat(project.physicalProgress) || 0;
    
    // Each division contributes 33.33% to overall progress
    const overallProgress = (timelineProgress + budgetProgress + physicalProgress) / 3;
    
    return {
      timelineProgress: Math.round(timelineProgress * 100) / 100,
      budgetProgress: Math.round(budgetProgress * 100) / 100,
      physicalProgress: Math.round(physicalProgress * 100) / 100,
      overallProgress: Math.round(overallProgress * 100) / 100
    };
  }

  // Get status color
  getStatusColor(status) {
    switch (status) {
      case 'pending':
        return 'yellow';
      case 'ongoing':
        return 'blue';
      case 'delayed':
        return 'red';
      case 'complete':
        return 'green';
      default:
        return 'gray';
    }
  }

  // Get priority color
  getPriorityColor(priority) {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  }

  // Get category color
  getCategoryColor(category) {
    const colors = {
      infrastructure: 'blue',
      health: 'green',
      education: 'purple',
      agriculture: 'orange',
      social: 'pink',
      environment: 'teal',
      transportation: 'indigo'
    };
    return colors[category] || 'gray';
  }

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  // Format date
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format datetime
  formatDateTime(date) {
    return new Date(date).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Validate project data
  validateProjectData(data) {
    const errors = [];

    if (!data.name?.trim()) errors.push('Project name is required');
    if (!data.description?.trim()) errors.push('Project description is required');
    if (!data.category) errors.push('Project category is required');
    if (!data.location?.trim()) errors.push('Project location is required');
    if (!data.priority) errors.push('Project priority is required');
    if (!data.startDate) errors.push('Start date is required');
    if (!data.endDate) errors.push('End date is required');
    if (!data.totalBudget || data.totalBudget <= 0) errors.push('Total budget must be greater than 0');
    if (!data.timelineUpdateFrequency) errors.push('Timeline update frequency is required');
    if (!data.budgetUpdateFrequency) errors.push('Budget update frequency is required');
    if (!data.physicalUpdateFrequency) errors.push('Physical update frequency is required');

    // Validate dates
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
    }

    return errors;
  }

  // Validate update data
  validateUpdateData(data) {
    const errors = [];

    if (!data.updateType) errors.push('Update type is required');
    if (!data.title?.trim()) errors.push('Update title is required');
    if (!data.description?.trim()) errors.push('Update description is required');
    if (data.currentProgress === undefined || data.currentProgress < 0 || data.currentProgress > 100) {
      errors.push('Current progress must be between 0 and 100');
    }

    return errors;
  }

  // Get update type label
  getUpdateTypeLabel(updateType) {
    const labels = {
      timeline: 'Timeline Update',
      budget: 'Budget Update',
      physical: 'Physical Update',
      overall: 'Overall Update'
    };
    return labels[updateType] || updateType;
  }

  // Get update frequency label
  getUpdateFrequencyLabel(frequency) {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly'
    };
    return labels[frequency] || frequency;
  }

  // Get status label
  getStatusLabel(status) {
    const labels = {
      pending: 'Pending',
      ongoing: 'Ongoing',
      delayed: 'Delayed',
      complete: 'Complete'
    };
    return labels[status] || status;
  }

  // Get priority label
  getPriorityLabel(priority) {
    const labels = {
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };
    return labels[priority] || priority;
  }

  // Get category label
  getCategoryLabel(category) {
    const labels = {
      infrastructure: 'Infrastructure',
      health: 'Health',
      education: 'Education',
      agriculture: 'Agriculture',
      social: 'Social Services',
      environment: 'Environment',
      transportation: 'Transportation'
    };
    return labels[category] || category;
  }
}

export const projectService = new ProjectService();
export default projectService; 
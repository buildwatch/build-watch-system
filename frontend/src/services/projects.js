import api from './api';

const projectService = {
  // Get all projects
  getAllProjects: async (params = {}) => {
    try {
      const response = await api.get('/projects', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch projects' };
    }
  },

  // Get project by ID
  getProjectById: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch project' };
    }
  },

  // Create new project
  createProject: async (projectData) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create project' };
    }
  },

  // Update project
  updateProject: async (projectId, updateData) => {
    try {
      const response = await api.put(`/projects/${projectId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update project' };
    }
  },

  // Submit project progress update
  submitProgressUpdate: async (projectId, updateData) => {
    try {
      const response = await api.post(`/projects/${projectId}/updates`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to submit progress update' };
    }
  },

  // Validate project update (LGU-PMT)
  validateProjectUpdate: async (updateId, validationData) => {
    try {
      const response = await api.patch(`/projects/updates/${updateId}/validate`, validationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to validate project update' };
    }
  },

  // Report project issue
  reportIssue: async (projectId, issueData) => {
    try {
      const response = await api.post(`/projects/${projectId}/issues`, issueData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to report issue' };
    }
  },

  // Get projects by implementing unit
  getProjectsByUnit: async (unit) => {
    try {
      const response = await api.get(`/projects/unit/${unit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch projects by unit' };
    }
  },

  // Get project statistics
  getProjectStats: async () => {
    try {
      const response = await api.get('/projects/stats/overview');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch project statistics' };
    }
  },

  // Get project categories
  getProjectCategories: () => {
    return [
      'Infrastructure',
      'Education',
      'Health',
      'Agriculture',
      'Social Services',
      'Environment',
      'Economic Development',
      'Disaster Risk Reduction'
    ];
  },

  // Get project priorities
  getProjectPriorities: () => {
    return ['Low', 'Medium', 'High', 'Critical'];
  },

  // Get project statuses
  getProjectStatuses: () => {
    return [
      'Planning',
      'Ongoing',
      'On Hold',
      'Delayed',
      'Near Completion',
      'Completed',
      'Cancelled'
    ];
  },

  // Get implementing units
  getImplementingUnits: () => {
    return ['EIU', 'LGU-IU'];
  },

  // Validate project data
  validateProjectData: (projectData) => {
    const errors = [];

    if (!projectData.name?.trim()) {
      errors.push('Project name is required');
    }

    if (!projectData.description?.trim()) {
      errors.push('Project description is required');
    }

    if (!projectData.location?.trim()) {
      errors.push('Project location is required');
    }

    if (!projectData.budget || projectData.budget <= 0) {
      errors.push('Valid budget amount is required');
    }

    if (!projectData.startDate) {
      errors.push('Start date is required');
    }

    if (!projectData.targetDate) {
      errors.push('Target completion date is required');
    }

    if (!projectData.implementingUnit) {
      errors.push('Implementing unit is required');
    }

    if (!projectData.category) {
      errors.push('Project category is required');
    }

    if (!projectData.priority) {
      errors.push('Project priority is required');
    }

    return errors;
  },

  // Validate progress update data
  validateProgressUpdate: (updateData) => {
    const errors = [];

    if (!updateData.progress || updateData.progress < 0 || updateData.progress > 100) {
      errors.push('Progress must be between 0 and 100');
    }

    if (!updateData.costSpent || updateData.costSpent < 0) {
      errors.push('Valid cost spent amount is required');
    }

    if (!updateData.remarks?.trim()) {
      errors.push('Remarks are required');
    }

    return errors;
  },

  // Format budget amount to Philippine Peso
  formatBudget: (amount) => {
    const numericAmount = parseFloat(amount) || 0;
    return `₱${numericAmount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  },

  // Calculate total budget from projects array
  calculateTotalBudget: (projects) => {
    return projects.reduce((sum, project) => {
      const budget = parseFloat(project.totalBudget) || 0;
      return sum + budget;
    }, 0);
  },

  // Calculate utilized budget based on approved budget divisions only
  calculateUtilizedBudget: (projects) => {
    return projects.reduce((sum, project) => {
      const budget = parseFloat(project.totalBudget) || 0;
      // Use budget division progress for utilized budget calculation (only approved divisions)
      const budgetProgress = parseFloat(project.progress?.budget || project.budgetProgress || 0);
      return sum + (budget * budgetProgress / 100);
    }, 0);
  },

  // Calculate average progress
  calculateAverageProgress: (projects) => {
    if (projects.length === 0) return 0;
    const totalProgress = projects.reduce((sum, project) => {
      return sum + (parseFloat(project.overallProgress) || 0);
    }, 0);
    return Math.round(totalProgress / projects.length);
  }
};

export default projectService; 
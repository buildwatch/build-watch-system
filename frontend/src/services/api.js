// API Service Layer for Build Watch LGU Frontend
// Connects to Node.js + Express.js + MySQL Backend

const API_BASE_URL = 'http://localhost:3000/api';

// Export API_BASE_URL for other services
export { API_BASE_URL as apiBaseUrl };

// Utility function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add authorization header if token exists
  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Simple axios-like API object for policy service
const api = {
  get: async (endpoint, options = {}) => {
    const data = await apiCall(endpoint, { ...options, method: 'GET' });
    return { data };
  },
  post: async (endpoint, body, options = {}) => {
    const data = await apiCall(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
    return { data };
  },
  put: async (endpoint, body, options = {}) => {
    const data = await apiCall(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
    return { data };
  },
  delete: async (endpoint, options = {}) => {
    const data = await apiCall(endpoint, { ...options, method: 'DELETE' });
    return { data };
  }
};

// Export the api object as default for policy service
export default api;

// Authentication API
export const authAPI = {
  // Login user
  async login(username, password) {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  // Logout user
  async logout() {
    return apiCall('/auth/logout', {
      method: 'POST'
    });
  },

  // Verify token
  async verifyToken() {
    return apiCall('/auth/verify', {
      method: 'GET'
    });
  },

  // Get user profile
  async getProfile() {
    return apiCall('/auth/profile', {
      method: 'GET'
    });
  }
};

// Projects API
export const projectsAPI = {
  // Get all projects with pagination and filters
  async getProjects(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/projects?${queryParams}`, {
      method: 'GET'
    });
  },

  // Get project by ID
  async getProject(id) {
    return apiCall(`/projects/${id}`, {
      method: 'GET'
    });
  },

  // Create new project
  async createProject(projectData) {
    return apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },

  // Update project
  async updateProject(id, projectData) {
    return apiCall(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  },

  // Delete project
  async deleteProject(id) {
    return apiCall(`/projects/${id}`, {
      method: 'DELETE'
    });
  },

  // Get project statistics for dashboard
  async getProjectStats() {
    return apiCall('/projects/stats', {
      method: 'GET'
    });
  },

  // Approve/reject project (Secretariat only)
  async approveProject(id, { approved, comments }) {
    return apiCall(`/projects/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, comments })
    });
  },

  // Submit project update
  async submitUpdate(projectId, updateData) {
    return apiCall(`/projects/${projectId}/updates`, {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
  },

  // Get project updates
  async getProjectUpdates(projectId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/projects/${projectId}/updates?${queryParams}`, {
      method: 'GET'
    });
  },

  // Approve/reject project update
  async approveUpdate(projectId, updateId, { approved, comments }) {
    return apiCall(`/projects/${projectId}/updates/${updateId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, comments })
    });
  },

  // Create milestone
  async createMilestone(projectId, milestoneData) {
    return apiCall(`/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(milestoneData)
    });
  },

  // Get project milestones
  async getProjectMilestones(projectId) {
    return apiCall(`/projects/${projectId}/milestones`, {
      method: 'GET'
    });
  },

  // Update milestone
  async updateMilestone(projectId, milestoneId, updateData) {
    return apiCall(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Get dashboard stats
  async getDashboardStats() {
    return apiCall('/projects/dashboard/stats', {
      method: 'GET'
    });
  }
};

// Users API
export const usersAPI = {
  // Get all users
  async getUsers(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/users?${queryParams}`, {
      method: 'GET'
    });
  },

  // Get user by ID
  async getUser(id) {
    return apiCall(`/users/${id}`, {
      method: 'GET'
    });
  },

  // Create new user
  async createUser(userData) {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Update user
  async updateUser(id, userData) {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  // Delete user
  async deleteUser(id) {
    return apiCall(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};

// RPMES API
export const rpmesAPI = {
  // Get all RPMES forms
  async getForms(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/rpmes?${queryParams}`, {
      method: 'GET'
    });
  },

  // Get RPMES form by ID
  async getForm(id) {
    return apiCall(`/rpmes/${id}`, {
      method: 'GET'
    });
  },

  // Submit RPMES form
  async submitForm(formData) {
    return apiCall('/rpmes', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  },

  // Update RPMES form
  async updateForm(id, formData) {
    return apiCall(`/rpmes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });
  },

  // Export RPMES forms
  async exportForms(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/rpmes/export?${queryParams}`, {
      method: 'GET'
    });
  }
};

// Monitoring API
export const monitoringAPI = {
  // Get monitoring reports
  async getReports(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/monitoring?${queryParams}`, {
      method: 'GET'
    });
  },

  // Get monitoring report by ID
  async getReport(id) {
    return apiCall(`/monitoring/${id}`, {
      method: 'GET'
    });
  },

  // Create monitoring report
  async createReport(reportData) {
    return apiCall('/monitoring', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  },

  // Update monitoring report
  async updateReport(id, reportData) {
    return apiCall(`/monitoring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reportData)
    });
  }
};

// Reports API
export const reportsAPI = {
  // Get all reports
  async getReports(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/reports?${queryParams}`, {
      method: 'GET'
    });
  },

  // Generate dashboard reports
  async getDashboardReports() {
    return apiCall('/reports/dashboard', {
      method: 'GET'
    });
  },

  // Export reports
  async exportReport(type, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/reports/export/${type}?${queryParams}`, {
      method: 'GET'
    });
  }
};

// Uploads API
export const uploadsAPI = {
  // Upload file
  async uploadFile(file, category = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return apiCall('/uploads', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData
    });
  },

  // Get uploads
  async getUploads(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/uploads?${queryParams}`, {
      method: 'GET'
    });
  },

  // Delete upload
  async deleteUpload(id) {
    return apiCall(`/uploads/${id}`, {
      method: 'DELETE'
    });
  }
};

// Dashboard API
export const dashboardAPI = {
  // Get dashboard statistics
  async getStats() {
    return apiCall('/dashboard/stats', {
      method: 'GET'
    });
  },

  // Get recent activity
  async getRecentActivity(limit = 10) {
    return apiCall(`/dashboard/activity?limit=${limit}`, {
      method: 'GET'
    });
  },

  // Get role-specific dashboard data
  async getRoleDashboard(role) {
    return apiCall(`/dashboard/${role}`, {
      method: 'GET'
    });
  }
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Get current user from localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Set authentication data
  setAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Clear authentication data
  clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Handle API errors
  handleError(error) {
    console.error('API Error:', error);
    
    // Handle authentication errors
    if (error.message.includes('401') || error.message.includes('Invalid token')) {
      apiUtils.clearAuthData();
      window.location.href = '/login';
      return;
    }

    // Return user-friendly error message
    return error.message || 'An unexpected error occurred';
  }
};

// Export all APIs as named export
export const apiClient = {
  auth: authAPI,
  projects: projectsAPI,
  users: usersAPI,
  rpmes: rpmesAPI,
  monitoring: monitoringAPI,
  reports: reportsAPI,
  uploads: uploadsAPI,
  dashboard: dashboardAPI,
  utils: apiUtils
}; 
// EIU Dashboard API Service
// Connects EIU frontend modules to backend endpoints

const API_BASE_URL = 'http://localhost:3000/api';

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
    console.error('EIU API call failed:', error);
    throw error;
  }
}

// EIU Dashboard API
export const eiuAPI = {
  // Get EIU dashboard statistics
  async getDashboardStats() {
    return apiCall('/eiu/dashboard/stats', {
      method: 'GET'
    });
  },

  // Get EIU projects (filtered for EIU role)
  async getProjects(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/projects?${queryParams}`, {
      method: 'GET'
    });
  },

  // Submit project progress update
  async submitProgressUpdate(projectId, updateData) {
    return apiCall(`/projects/${projectId}/updates`, {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
  },

  // Upload documents
  async uploadDocument(file, projectId, category, description) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('category', category);
    formData.append('description', description);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/uploads/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  },

  // Get uploaded documents
  async getUploads(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/uploads?${queryParams}`, {
      method: 'GET'
    });
  },

  // Get compliance tracker data
  async getComplianceData(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/eiu/compliance?${queryParams}`, {
      method: 'GET'
    });
  },

  // Update compliance status
  async updateComplianceStatus(complianceId, updateData) {
    return apiCall(`/eiu/compliance/${complianceId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  },

  // Get reminders and timeline
  async getReminders(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/eiu/reminders?${queryParams}`, {
      method: 'GET'
    });
  },

  // Create new reminder
  async createReminder(reminderData) {
    return apiCall('/eiu/reminders', {
      method: 'POST',
      body: JSON.stringify(reminderData)
    });
  },

  // Update reminder status
  async updateReminderStatus(reminderId, updateData) {
    return apiCall(`/eiu/reminders/${reminderId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  },

  // Get feedback for EIU projects
  async getFeedback(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/eiu/feedback?${queryParams}`, {
      method: 'GET'
    });
  },

  // Get user profile
  async getUserProfile() {
    return apiCall('/users/me', {
      method: 'GET'
    });
  },

  // Update user profile
  async updateUserProfile(profileData) {
    return apiCall('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  // Get user activity logs
  async getActivityLogs(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/users/me/logs?${queryParams}`, {
      method: 'GET'
    });
  }
};

// EIU-specific data validation
export const eiuValidation = {
  // Validate progress update data
  validateProgressUpdate(data) {
    const errors = [];

    if (!data.progress || data.progress < 0 || data.progress > 100) {
      errors.push('Progress must be between 0 and 100');
    }

    if (!data.costSpent || data.costSpent < 0) {
      errors.push('Valid cost spent amount is required');
    }

    if (!data.accomplishments?.trim()) {
      errors.push('Accomplishments are required');
    }

    if (!data.remarks?.trim()) {
      errors.push('Remarks are required');
    }

    return errors;
  },

  // Validate reminder data
  validateReminder(data) {
    const errors = [];

    if (!data.projectId) {
      errors.push('Project ID is required');
    }

    if (!data.title?.trim()) {
      errors.push('Reminder title is required');
    }

    if (!data.dueDate) {
      errors.push('Due date is required');
    }

    return errors;
  },

  // Validate profile update data
  validateProfileUpdate(data) {
    const errors = [];

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Valid email address is required');
    }

    if (data.contactNumber && !/^[\d\s\-\+\(\)]+$/.test(data.contactNumber)) {
      errors.push('Valid contact number is required');
    }

    return errors;
  }
};

// EIU utility functions
export const eiuUtils = {
  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  },

  // Format date
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Get status color
  getStatusColor(status) {
    const colors = {
      'Active': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-blue-100 text-blue-800',
      'Delayed': 'bg-red-100 text-red-800',
      'Compliant': 'bg-green-100 text-green-800',
      'Non-Compliant': 'bg-red-100 text-red-800',
      'Under Review': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  // Get priority color
  getPriorityColor(priority) {
    const colors = {
      'High': 'bg-red-100 text-red-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  }
};

export default eiuAPI; 
import { apiBaseUrl } from './api.js';

// Authentication helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// ===== AUDIT TRAIL API =====

export const auditTrailAPI = {
  // Get audit trail logs
  async getLogs(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${apiBaseUrl}/admin/audit-trail?${queryParams}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }
      
      return response.json();
    } catch (error) {
      throw new Error('Failed to fetch audit trail');
    }
  },

  // Export audit trail as CSV
  async exportLogs(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${apiBaseUrl}/admin/audit-trail/export?${queryParams}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to export audit trail');
      }
      
      return response.blob();
    } catch (error) {
      throw new Error('Failed to export audit trail');
    }
  }
};

// ===== CONFIGURATION API =====

export const configurationAPI = {
  // Get system configuration
  async getConfiguration() {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/configuration`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }
      
      return response.json();
    } catch (error) {
      throw new Error('Failed to fetch configuration');
    }
  },

  // Update system configuration
  async updateConfiguration(config) {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/configuration`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }
      
      return response.json();
    } catch (error) {
      throw new Error('Failed to update configuration');
    }
  }
};

// ===== SECURITY API =====

export const securityAPI = {
  // Get security settings
  async getSecuritySettings() {
    const response = await fetch(`${apiBaseUrl}/admin/security`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch security settings');
    }
    
    return response.json();
  },

  // Update security settings
  async updateSecuritySettings(settings) {
    const response = await fetch(`${apiBaseUrl}/admin/security`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update security settings');
    }
    
    return response.json();
  },

  // Get security monitoring data
  async getSecurityMonitoring() {
    const response = await fetch(`${apiBaseUrl}/admin/security/monitoring`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch security monitoring data');
    }
    
    return response.json();
  }
};

// ===== ANNOUNCEMENTS API =====

export const announcementsAPI = {
  // Get announcements
  async getAnnouncements(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }
    
    return response.json();
  },

  // Create announcement
  async createAnnouncement(announcement) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(announcement)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create announcement');
    }
    
    return response.json();
  },

  // Update announcement
  async updateAnnouncement(id, announcement) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(announcement)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update announcement');
    }
    
    return response.json();
  },

  // Delete announcement
  async deleteAnnouncement(id) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete announcement');
    }
    
    return response.json();
  },

  // Get public announcements (for all users)
  async getPublicAnnouncements(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/public/announcements?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }
    
    return response.json();
  }
};

// ===== OFFICE & GROUPS API =====

export const officeGroupsAPI = {
  // Get departments
  async getDepartments() {
    const response = await fetch(`${apiBaseUrl}/admin/departments`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch departments');
    }
    
    return response.json();
  },

  // Get groups
  async getGroups() {
    const response = await fetch(`${apiBaseUrl}/admin/groups`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch groups');
    }
    
    return response.json();
  }
};

// ===== BACKUP & MAINTENANCE API =====

export const backupMaintenanceAPI = {
  // Get backups
  async getBackups() {
    const response = await fetch(`${apiBaseUrl}/admin/backups`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch backups');
    }
    
    return response.json();
  },

  // Create backup
  async createBackup(type = 'Full Database') {
    const response = await fetch(`${apiBaseUrl}/admin/backups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create backup');
    }
    
    return response.json();
  }
};

// ===== SYSTEM HEALTH API =====

export const systemHealthAPI = {
  // Get system health metrics
  async getSystemHealth() {
    const response = await fetch(`${apiBaseUrl}/admin/system-health`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch system health');
    }
    
    return response.json();
  },

  // Get dashboard statistics
  async getDashboardStats() {
    const response = await fetch(`${apiBaseUrl}/admin/dashboard-stats`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard statistics');
    }
    
    return response.json();
  }
};

// ===== USER MANAGEMENT API (Enhanced) =====

export const userManagementAPI = {
  // Get users with enhanced filtering
  async getUsers(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/users?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    return response.json();
  },

  // Create user
  async createUser(userData) {
    const response = await fetch(`${apiBaseUrl}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    
    return response.json();
  },

  // Update user
  async updateUser(id, userData) {
    const response = await fetch(`${apiBaseUrl}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }
    
    return response.json();
  },

  // Delete user
  async deleteUser(id) {
    const response = await fetch(`${apiBaseUrl}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
    
    return response.json();
  },

  // Update user status
  async updateUserStatus(id, status) {
    const response = await fetch(`${apiBaseUrl}/users/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user status');
    }
    
    return response.json();
  },

  // Assign user role
  async assignUserRole(id, role, subRole) {
    const response = await fetch(`${apiBaseUrl}/users/${id}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, subRole })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to assign user role');
    }
    
    return response.json();
  },

  // Reset user password
  async resetUserPassword(id) {
    const response = await fetch(`${apiBaseUrl}/users/${id}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset user password');
    }
    
    return response.json();
  }
};

// ===== UTILITY FUNCTIONS =====

// Error handler
export const handleAPIError = (error) => {
  console.error('API Error:', error);
  
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    // Redirect to login if unauthorized
    localStorage.removeItem('token');
    window.location.href = '/login';
    return 'Session expired. Please login again.';
  }
  
  return error.message || 'An unexpected error occurred';
};

// Success handler
export const handleAPISuccess = (message) => {
  return message || 'Operation completed successfully';
};

// Download file helper
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}; 
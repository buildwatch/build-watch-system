const API_BASE_URL = 'http://localhost:3000/api';

class ExecutiveService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authentication token
  getToken() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Make authenticated API request
  async makeRequest(endpoint, options = {}) {
    const token = this.getToken();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...defaultOptions,
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get executive dashboard statistics
  async getDashboardStats() {
    try {
      const response = await this.makeRequest('/home/stats');
      return {
        totalProjects: response.totalProjects || 0,
        ongoingProjects: response.ongoingProjects || 0,
        completedProjects: response.completedProjects || 0,
        delayedProjects: response.delayedProjects || 0,
        totalBudget: this.formatBudget(response.totalBudget || 0),
        utilizedBudget: this.formatBudget(response.utilizedBudget || 0),
        budgetUtilization: response.budgetUtilization || 0,
        activeDepartments: response.activeDepartments || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalProjects: 0,
        ongoingProjects: 0,
        completedProjects: 0,
        delayedProjects: 0,
        totalBudget: '₱0',
        utilizedBudget: '₱0',
        budgetUtilization: 0,
        activeDepartments: 0
      };
    }
  }

  // Get all projects for executive view
  async getAllProjects(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      if (filters.department && filters.department !== 'all') {
        queryParams.append('department', filters.department);
      }
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      if (filters.limit) {
        queryParams.append('limit', filters.limit);
      }

      const endpoint = `/projects?${queryParams.toString()}`;
      const response = await this.makeRequest(endpoint);
      
      return response.projects || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  // Get recent projects
  async getRecentProjects(limit = 5) {
    try {
      const response = await this.makeRequest(`/home/featured-projects?limit=${limit}`);
      return response.projects || [];
    } catch (error) {
      console.error('Error fetching recent projects:', error);
      return [];
    }
  }

  // Get critical alerts/notifications
  async getCriticalAlerts() {
    try {
      const response = await this.makeRequest('/notifications?priority=high&limit=10');
      return response.notifications || [];
    } catch (error) {
      console.error('Error fetching critical alerts:', error);
      return [];
    }
  }

  // Get department performance data
  async getDepartmentPerformance() {
    try {
      const response = await this.makeRequest('/reports/department-performance');
      return response.departments || [];
    } catch (error) {
      console.error('Error fetching department performance:', error);
      return [];
    }
  }

  // Get project locations for heatmap
  async getProjectLocations() {
    try {
      const response = await this.makeRequest('/home/project-locations');
      return response.projects || [];
    } catch (error) {
      console.error('Error fetching project locations:', error);
      return [];
    }
  }

  // Get reports data
  async getReports(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.type) {
        queryParams.append('type', filters.type);
      }
      if (filters.dateRange) {
        queryParams.append('dateRange', filters.dateRange);
      }

      const endpoint = `/reports?${queryParams.toString()}`;
      const response = await this.makeRequest(endpoint);
      
      return response.reports || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  }

  // Get notices/announcements
  async getNotices(limit = 10) {
    try {
      const response = await this.makeRequest(`/admin/announcements?limit=${limit}`);
      return response.announcements || [];
    } catch (error) {
      console.error('Error fetching notices:', error);
      return [];
    }
  }

  // Export data
  async exportData(type, filters = {}) {
    try {
      const response = await this.makeRequest(`/reports/export/${type}`, {
        method: 'POST',
        body: JSON.stringify(filters)
      });
      return response;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Format budget to currency
  formatBudget(amount) {
    if (!amount) return '₱0';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  }

  // Format date
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get status color class
  getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'ongoing':
        return 'bg-blue-100 text-blue-700';
      case 'delayed':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'planning':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Get risk color class
  getRiskColor(risk) {
    switch (risk?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      case 'none':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Get priority color class
  getPriorityColor(priority) {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}

export default new ExecutiveService(); 
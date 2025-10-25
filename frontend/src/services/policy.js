import api from './api.js';

export const policyService = {
  // Get all policies with filtering and pagination
  async getPolicies(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const response = await api.get(`/policies?${queryParams.toString()}`);
    return response.data;
  },

  // Get policy by ID
  async getPolicy(id) {
    const response = await api.get(`/policies/${id}`);
    return response.data;
  },

  // Create new policy
  async createPolicy(policyData) {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(policyData).forEach(key => {
      if (key !== 'file' && policyData[key] !== undefined && policyData[key] !== null) {
        if (typeof policyData[key] === 'object') {
          formData.append(key, JSON.stringify(policyData[key]));
        } else {
          formData.append(key, policyData[key]);
        }
      }
    });

    // Add file if present
    if (policyData.file) {
      formData.append('file', policyData.file);
    }

    const response = await api.post('/policies', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update policy
  async updatePolicy(id, policyData) {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(policyData).forEach(key => {
      if (key !== 'file' && policyData[key] !== undefined && policyData[key] !== null) {
        if (typeof policyData[key] === 'object') {
          formData.append(key, JSON.stringify(policyData[key]));
        } else {
          formData.append(key, policyData[key]);
        }
      }
    });

    // Add file if present
    if (policyData.file) {
      formData.append('file', policyData.file);
    }

    const response = await api.put(`/policies/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete policy
  async deletePolicy(id) {
    const response = await api.delete(`/policies/${id}`);
    return response.data;
  },

  // Download policy file
  async downloadPolicy(id) {
    const response = await api.get(`/policies/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get policy analytics
  async getPolicyAnalytics() {
    const response = await api.get('/policies/analytics/overview');
    return response.data;
  },

  // Get policy compliance
  async getPolicyCompliance(policyId) {
    const response = await api.get(`/policies/${policyId}/compliance`);
    return response.data;
  },

  // Update policy compliance
  async updatePolicyCompliance(policyId, complianceData) {
    const response = await api.post(`/policies/${policyId}/compliance`, complianceData);
    return response.data;
  },

  // Generate compliance report
  async generateComplianceReport(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const response = await api.get(`/policies/reports/compliance?${queryParams.toString()}`);
    return response.data;
  },

  // Helper function to download file
  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}; 
import api from './api';

const monitoringService = {
  // Get all monitoring activities
  getAllMonitoring: async (params = {}) => {
    try {
      const response = await api.get('/monitoring', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch monitoring activities' };
    }
  },

  // Get monitoring activity by ID
  getMonitoringById: async (monitoringId) => {
    try {
      const response = await api.get(`/monitoring/${monitoringId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch monitoring activity' };
    }
  },

  // Submit monitoring report
  submitMonitoringReport: async (reportData) => {
    try {
      const response = await api.post('/monitoring', reportData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to submit monitoring report' };
    }
  },

  // Update monitoring report
  updateMonitoringReport: async (monitoringId, updateData) => {
    try {
      const response = await api.put(`/monitoring/${monitoringId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update monitoring report' };
    }
  },

  // Validate project update (LGU-PMT)
  validateProjectUpdate: async (updateId, validationData) => {
    try {
      const response = await api.patch(`/monitoring/validate/${updateId}`, validationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to validate project update' };
    }
  },

  // Provide feedback on project
  provideFeedback: async (projectId, feedbackData) => {
    try {
      const response = await api.post(`/monitoring/${projectId}/feedback`, feedbackData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to provide feedback' };
    }
  },

  // Schedule site visit
  scheduleSiteVisit: async (visitData) => {
    try {
      const response = await api.post('/monitoring/site-visits', visitData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to schedule site visit' };
    }
  },

  // Update site visit
  updateSiteVisit: async (visitId, updateData) => {
    try {
      const response = await api.put(`/monitoring/site-visits/${visitId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update site visit' };
    }
  },

  // Get site visits by project
  getSiteVisitsByProject: async (projectId) => {
    try {
      const response = await api.get(`/monitoring/site-visits/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch site visits' };
    }
  },

  // Get monitoring by project
  getMonitoringByProject: async (projectId) => {
    try {
      const response = await api.get(`/monitoring/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch project monitoring' };
    }
  },

  // Get monitoring statistics
  getMonitoringStats: async () => {
    try {
      const response = await api.get('/monitoring/stats/overview');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch monitoring statistics' };
    }
  },

  // Get monitoring types
  getMonitoringTypes: () => {
    return [
      'Physical Progress Validation',
      'Financial Progress Review',
      'Quality Assessment',
      'Compliance Check',
      'Site Visit',
      'Stakeholder Interview',
      'Document Review'
    ];
  },

  // Get validation statuses
  getValidationStatuses: () => {
    return ['Pending', 'Approved', 'Rejected', 'Under Review', 'Requires Revision'];
  },

  // Get site visit statuses
  getSiteVisitStatuses: () => {
    return ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled'];
  },

  // Validate monitoring report data
  validateMonitoringData: (reportData) => {
    const errors = [];

    if (!reportData.projectId) {
      errors.push('Project is required');
    }

    if (!reportData.monitoringType) {
      errors.push('Monitoring type is required');
    }

    if (!reportData.findings?.trim()) {
      errors.push('Findings are required');
    }

    if (!reportData.recommendations?.trim()) {
      errors.push('Recommendations are required');
    }

    if (!reportData.monitoringDate) {
      errors.push('Monitoring date is required');
    }

    return errors;
  },

  // Validate site visit data
  validateSiteVisitData: (visitData) => {
    const errors = [];

    if (!visitData.projectId) {
      errors.push('Project is required');
    }

    if (!visitData.scheduledDate) {
      errors.push('Scheduled date is required');
    }

    if (!visitData.purpose?.trim()) {
      errors.push('Visit purpose is required');
    }

    if (!visitData.participants || visitData.participants.length === 0) {
      errors.push('At least one participant is required');
    }

    return errors;
  },

  // Get monitoring checklist
  getMonitoringChecklist: (monitoringType) => {
    const checklists = {
      'Physical Progress Validation': [
        'Verify actual vs planned physical progress',
        'Check quality of completed works',
        'Assess compliance with specifications',
        'Document any deviations or issues'
      ],
      'Financial Progress Review': [
        'Review financial reports and documentation',
        'Verify budget utilization',
        'Check cost efficiency',
        'Assess financial risks'
      ],
      'Quality Assessment': [
        'Inspect workmanship quality',
        'Check material specifications',
        'Verify safety standards compliance',
        'Assess environmental impact'
      ],
      'Site Visit': [
        'Conduct physical site inspection',
        'Interview project personnel',
        'Review on-site documentation',
        'Assess site conditions and progress'
      ]
    };

    return checklists[monitoringType] || [];
  }
};

export default monitoringService; 
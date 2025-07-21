import api from './api';

const reportService = {
  // Get all available reports
  getAvailableReports: async () => {
    try {
      const response = await api.get('/reports');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch available reports' };
    }
  },

  // Generate project progress report
  generateProgressReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/progress', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate progress report' };
    }
  },

  // Generate financial report
  generateFinancialReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/financial', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate financial report' };
    }
  },

  // Generate RPMES compliance report
  generateRPMESReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/rpmes', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate RPMES report' };
    }
  },

  // Generate monitoring report
  generateMonitoringReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/monitoring', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate monitoring report' };
    }
  },

  // Generate executive summary
  generateExecutiveSummary: async (params = {}) => {
    try {
      const response = await api.get('/reports/executive-summary', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate executive summary' };
    }
  },

  // Generate dashboard analytics
  generateDashboardAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/reports/dashboard-analytics', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate dashboard analytics' };
    }
  },

  // Export report to PDF
  exportToPDF: async (reportType, params = {}) => {
    try {
      const response = await api.get(`/reports/export/pdf/${reportType}`, { 
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to export report to PDF' };
    }
  },

  // Export report to Excel
  exportToExcel: async (reportType, params = {}) => {
    try {
      const response = await api.get(`/reports/export/excel/${reportType}`, { 
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to export report to Excel' };
    }
  },

  // Get report templates
  getReportTemplates: async () => {
    try {
      const response = await api.get('/reports/templates');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch report templates' };
    }
  },

  // Schedule automated report
  scheduleReport: async (scheduleData) => {
    try {
      const response = await api.post('/reports/schedule', scheduleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to schedule report' };
    }
  },

  // Get scheduled reports
  getScheduledReports: async () => {
    try {
      const response = await api.get('/reports/scheduled');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch scheduled reports' };
    }
  },

  // Get report history
  getReportHistory: async (params = {}) => {
    try {
      const response = await api.get('/reports/history', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch report history' };
    }
  },

  // Get available report types
  getReportTypes: () => {
    return [
      { value: 'progress', label: 'Project Progress Report' },
      { value: 'financial', label: 'Financial Report' },
      { value: 'rpmes', label: 'RPMES Compliance Report' },
      { value: 'monitoring', label: 'Monitoring Report' },
      { value: 'executive-summary', label: 'Executive Summary' },
      { value: 'dashboard-analytics', label: 'Dashboard Analytics' }
    ];
  },

  // Get export formats
  getExportFormats: () => {
    return [
      { value: 'pdf', label: 'PDF Document' },
      { value: 'excel', label: 'Excel Spreadsheet' },
      { value: 'csv', label: 'CSV File' }
    ];
  },

  // Get report periods
  getReportPeriods: () => {
    return [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'custom', label: 'Custom Range' }
    ];
  },

  // Validate report parameters
  validateReportParams: (params) => {
    const errors = [];

    if (!params.reportType) {
      errors.push('Report type is required');
    }

    if (params.startDate && params.endDate) {
      if (new Date(params.startDate) > new Date(params.endDate)) {
        errors.push('Start date cannot be after end date');
      }
    }

    if (params.exportFormat && !['pdf', 'excel', 'csv'].includes(params.exportFormat)) {
      errors.push('Invalid export format');
    }

    return errors;
  },

  // Download report file
  downloadReport: (blob, filename) => {
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

export default reportService; 
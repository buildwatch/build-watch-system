import api from './api';

const uploadService = {
  // Upload single file
  uploadFile: async (file, category = 'general') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const response = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upload file' };
    }
  },

  // Upload multiple files
  uploadMultipleFiles: async (files, category = 'general') => {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', file);
      });
      formData.append('category', category);

      const response = await api.post('/uploads/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upload files' };
    }
  },

  // Upload project document
  uploadProjectDocument: async (projectId, file, documentType) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('projectId', projectId);

      const response = await api.post(`/uploads/project/${projectId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upload project document' };
    }
  },

  // Upload RPMES form attachment
  uploadRPMESAttachment: async (formId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/uploads/rpmes/${formId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upload RPMES attachment' };
    }
  },

  // Get uploaded files
  getUploadedFiles: async (params = {}) => {
    try {
      const response = await api.get('/uploads', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch uploaded files' };
    }
  },

  // Get files by category
  getFilesByCategory: async (category) => {
    try {
      const response = await api.get(`/uploads/category/${category}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch files by category' };
    }
  },

  // Get project documents
  getProjectDocuments: async (projectId) => {
    try {
      const response = await api.get(`/uploads/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch project documents' };
    }
  },

  // Download file
  downloadFile: async (fileId) => {
    try {
      const response = await api.get(`/uploads/download/${fileId}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to download file' };
    }
  },

  // Delete file
  deleteFile: async (fileId) => {
    try {
      const response = await api.delete(`/uploads/${fileId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete file' };
    }
  },

  // Update file metadata
  updateFileMetadata: async (fileId, metadata) => {
    try {
      const response = await api.patch(`/uploads/${fileId}`, metadata);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update file metadata' };
    }
  },

  // Get file categories
  getFileCategories: () => {
    return [
      'general',
      'project-documents',
      'rpmes-forms',
      'monitoring-reports',
      'financial-documents',
      'photos',
      'videos',
      'presentations'
    ];
  },

  // Get document types
  getDocumentTypes: () => {
    return [
      'Project Proposal',
      'Feasibility Study',
      'Engineering Plans',
      'Financial Documents',
      'Progress Reports',
      'Completion Reports',
      'Photos',
      'Videos',
      'Other'
    ];
  },

  // Validate file upload
  validateFileUpload: (file, maxSize = 10 * 1024 * 1024) => { // 10MB default
    const errors = [];

    if (!file) {
      errors.push('File is required');
      return errors;
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not supported. Please upload PDF, Word, Excel, images, or ZIP files.');
    }

    return errors;
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get file icon based on type
  getFileIcon: (fileType) => {
    const icons = {
      'image/jpeg': '📷',
      'image/png': '📷',
      'image/gif': '📷',
      'application/pdf': '📄',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/vnd.ms-excel': '📊',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
      'text/plain': '📄',
      'application/zip': '📦',
      'application/x-zip-compressed': '📦'
    };
    return icons[fileType] || '📄';
  }
};

export default uploadService; 
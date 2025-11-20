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
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch announcements');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Create announcement (with file upload support)
  async createAnnouncement(announcementData, attachments = []) {
    const formData = new FormData();
    
    // Add all announcement fields to FormData
    Object.keys(announcementData).forEach(key => {
      if (announcementData[key] !== null && announcementData[key] !== undefined) {
        formData.append(key, announcementData[key]);
      }
    });
    
    // Add attachments
    attachments.forEach((file, index) => {
      formData.append('attachments', file);
    });
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/admin/announcements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type, let browser set it for FormData
      },
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to create announcement');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Update announcement (with file upload support)
  async updateAnnouncement(id, announcementData, attachments = [], deleteAttachmentIds = []) {
    const formData = new FormData();
    
    // Add all announcement fields to FormData
    Object.keys(announcementData).forEach(key => {
      if (announcementData[key] !== null && announcementData[key] !== undefined) {
        formData.append(key, announcementData[key]);
      }
    });
    
    // Add attachments
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
    
    // Add delete attachment IDs
    if (deleteAttachmentIds.length > 0) {
      formData.append('deleteAttachmentIds', JSON.stringify(deleteAttachmentIds));
    }
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type, let browser set it for FormData
      },
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to update announcement');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Delete announcement
  async deleteAnnouncement(id) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to delete announcement');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Get public announcements (for all users)
  async getPublicAnnouncements(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/public/announcements?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch announcements');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Mark announcement as read
  async markAsRead(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to mark as read');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Acknowledge announcement
  async acknowledgeAnnouncement(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/acknowledge`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to acknowledge announcement');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Get read status
  async getReadStatus(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/read-status`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to get read status');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Download attachment
  downloadAttachment(attachmentId) {
    const token = localStorage.getItem('token');
    // Use the download endpoint with token in header (handled by getAuthHeaders)
    return `${apiBaseUrl}/admin/announcements/attachments/${attachmentId}/download`;
  },

  // Bulk operations
  async bulkDeleteAnnouncements(announcementIds) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ announcementIds })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to bulk delete announcements');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async bulkMarkAsRead(announcementIds) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/bulk-mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ announcementIds })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to bulk mark as read');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async bulkAcknowledge(announcementIds) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/bulk-acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ announcementIds })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to bulk acknowledge');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async bulkUpdateStatus(announcementIds, status) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/bulk-update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ announcementIds, status })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to bulk update status');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Toggle pin status
  async togglePin(id) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${id}/toggle-pin`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to toggle pin status');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Export to CSV
  async exportToCSV(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/export/csv?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to export announcements');
    }
    
    const blob = await response.blob();
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(blob, filename);
    return { success: true, filename };
  },

  // Export to Excel
  async exportToExcel(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/export/excel?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to export announcements');
    }
    
    const blob = await response.blob();
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadFile(blob, filename);
    return { success: true, filename };
  },

  // Export to PDF (returns HTML that can be printed to PDF)
  async exportToPDF(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/export/pdf?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to export announcements');
    }
    
    const blob = await response.blob();
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.html`;
    downloadFile(blob, filename);
    return { success: true, filename };
  },

  // Export to HTML
  async exportToHTML(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/export/html?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to export announcements');
    }
    
    const blob = await response.blob();
    const filename = `announcements_export_${new Date().toISOString().split('T')[0]}.html`;
    downloadFile(blob, filename);
    return { success: true, filename };
  },

  // ===== PHASE 3A: ENGAGEMENT & INTERACTION API =====

  // Comments
  async getComments(announcementId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/comments?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch comments');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async createComment(announcementId, content, parentCommentId = null) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, parentCommentId })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to create comment');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async updateComment(commentId, content) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/comments/${commentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to update comment');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async deleteComment(commentId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to delete comment');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Reactions
  async getReactions(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/reactions`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch reactions');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async toggleReaction(announcementId, reactionType) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/reactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reactionType })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to toggle reaction');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Favorites
  async getFavorites(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/favorites?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch favorites');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async checkFavorite(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/favorite`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to check favorite');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async toggleFavorite(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/favorite`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to toggle favorite');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Sharing
  async getShareLink(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/share`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to generate share link');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // ===== PHASE 3B: DUPLICATION & ANALYTICS =====

  // Duplicate announcement
  async duplicateAnnouncement(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to duplicate announcement');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Get announcement analytics
  async getAnnouncementAnalytics(announcementId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/analytics?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch analytics');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Get analytics overview
  async getAnalyticsOverview(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseUrl}/admin/announcements/analytics/overview?${queryParams}`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch analytics overview');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // ===== PHASE 3C: ADVANCED MANAGEMENT FEATURES =====

  // Version History
  async getAnnouncementVersions(announcementId) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/versions`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch versions');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Categories
  async getCategories() {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/categories`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch categories');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async createCategory(categoryData) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/categories`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(categoryData)
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to create category');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Tags
  async getTags() {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/tags`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch tags');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async createTag(tagData) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/tags`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tagData)
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to create tag');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Assign categories/tags to announcement
  async assignCategories(announcementId, categoryIds) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/categories`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ categoryIds })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to assign categories');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async assignTags(announcementId, tagIds) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/tags`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tagIds })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to assign tags');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Approval Workflow
  async approveAnnouncement(announcementId, comments, approvalLevel = 1) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/approve`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comments, approvalLevel })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to approve announcement');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async rejectAnnouncement(announcementId, comments, approvalLevel = 1) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/${announcementId}/reject`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comments, approvalLevel })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to reject announcement');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Notification Preferences
  async getNotificationPreferences() {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/notification-preferences`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch notification preferences');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  async updateNotificationPreferences(preferences) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/notification-preferences`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferences)
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to update notification preferences');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  }
};

// ===== ANNOUNCEMENT TEMPLATES API =====

export const announcementTemplatesAPI = {
  // Get all templates
  async getTemplates() {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/templates`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch templates');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Get single template
  async getTemplate(id) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/templates/${id}`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch template');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Create template
  async createTemplate(templateData) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(templateData)
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to create template');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Update template
  async updateTemplate(id, templateData) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/templates/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(templateData)
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to update template');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
  },

  // Delete template
  async deleteTemplate(id) {
    const response = await fetch(`${apiBaseUrl}/admin/announcements/templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to delete template');
      error.response = response;
      error.data = data;
      throw error;
    }
    
    return data;
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

// ===== AUTH API =====
export const authAPI = {
  // Verify own password
  async verifyOwnPassword(password) {
    const response = await fetch(`${apiBaseUrl}/auth/verify-own-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Password verification failed');
    }
    
    return data;
  }
}; 
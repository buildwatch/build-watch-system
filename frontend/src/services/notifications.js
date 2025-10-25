const API_BASE_URL = 'http://localhost:3000/api';

class NotificationService {
  constructor() {
    this.notificationCount = 0;
    this.notifications = [];
    this.updateCallbacks = [];
    this.pollingInterval = null;
    this.startPolling();
  }

  // Get auth token
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Get notification count for Topbar badge
  async getNotificationCount() {
    try {
      const token = this.getAuthToken();
      if (!token) return 0;

      const response = await fetch(`${API_BASE_URL}/notifications/count?isRead=false&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.notificationCount = data.count;
        this.notifyUpdateCallbacks();
        return data.count;
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
    return 0;
  }

  // Get notifications list
  async getNotifications(page = 1, limit = 20) {
    try {
      const token = this.getAuthToken();
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/notifications?page=${page}&limit=${limit}&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.notifications = data.notifications;
        return data;
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    return { notifications: [], pagination: { total: 0, pages: 0 } };
  }

  // Get recent activity notifications
  async getRecentActivity(limit = 10) {
    try {
      const token = this.getAuthToken();
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/notifications/recent-activity?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.notifications;
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
    return [];
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const token = this.getAuthToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local count
        await this.getNotificationCount();
        return true;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    return false;
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const token = this.getAuthToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local count
        await this.getNotificationCount();
        return true;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
    return false;
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const token = this.getAuthToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local count
        await this.getNotificationCount();
        return true;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
    return false;
  }

  // Delete all read notifications
  async deleteAllRead() {
    try {
      const token = this.getAuthToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/notifications/delete-read`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local count
        await this.getNotificationCount();
        return true;
      }
    } catch (error) {
      console.error('Error deleting all read notifications:', error);
    }
    return false;
  }

  // Subscribe to notification updates
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Notify all update callbacks
  notifyUpdateCallbacks() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback({
          count: this.notificationCount,
          notifications: this.notifications
        });
      } catch (error) {
        console.error('Error in notification update callback:', error);
      }
    });
  }

  // Start polling for updates
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      await this.getNotificationCount();
    }, 10000); // Poll every 10 seconds for faster updates
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Get current notification count
  getCurrentCount() {
    return this.notificationCount;
  }

  // Get current notifications
  getCurrentNotifications() {
    return this.notifications;
  }

  // Force refresh notifications (for immediate updates)
  async forceRefresh() {
    console.log('🔄 Force refreshing notifications...');
    await this.getNotificationCount();
    await this.getNotifications();
    this.notifyUpdateCallbacks();
  }

  // Format notification time
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  }

  // Get notification icon based on type and category
  getNotificationIcon(type, category = null, metadata = null) {
    // Project-specific icons
    if (category === 'Project') {
      if (metadata?.updateType === 'milestone_submission') {
        return `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>`;
      }
      if (metadata?.updateType === 'secretariat_submission') {
        return `<svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
      }
      if (metadata?.updateType === 'secretariat_verdict') {
        return `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
      }
      if (metadata?.updateType === 'milestone_resubmission') {
        return `<svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>`;
      }
      if (metadata?.updateType === 'project_completion') {
        return `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
      }
      if (metadata?.updateType === 'project_progress_update') {
        return `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
        </svg>`;
      }
    }

    // Reminder-specific icons
    if (category === 'Reminder') {
      if (metadata?.updateType === 'milestone_overdue') {
        return `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
      }
    }

    // Default icons based on type
    const icons = {
      'Info': `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
      'Success': `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
      'Warning': `<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>`,
      'Error': `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
      'Alert': `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>`
    };
    return icons[type] || icons['Info'];
  }

  // Get notification color based on type
  getNotificationColor(type) {
    const colors = {
      'Info': 'bg-blue-50 border-blue-200',
      'Success': 'bg-green-50 border-green-200',
      'Warning': 'bg-yellow-50 border-yellow-200',
      'Error': 'bg-red-50 border-red-200',
      'Alert': 'bg-red-50 border-red-200'
    };
    return colors[type] || colors['Info'];
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 
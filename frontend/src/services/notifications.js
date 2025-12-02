class NotificationService {
  constructor() {
    this.notificationCount = 0;
    this.notifications = [];
    this.updateCallbacks = [];
    this.pollingInterval = null;
    this.isClient = false;
    this.isPolling = false; // Flag to prevent multiple polling instances
    this.lastRequestTime = 0; // Track last request time for throttling
    this.requestQueue = []; // Queue for pending requests
    this.isProcessingQueue = false; // Flag to prevent concurrent queue processing
    this.backoffDelay = 10000; // Initial backoff delay (10 seconds)
    this.maxBackoffDelay = 60000; // Maximum backoff delay (60 seconds)
    this.consecutiveErrors = 0; // Track consecutive 429 errors
    
    // DO NOT start polling in constructor - it will be started explicitly from client side
    // This prevents SSR issues where window might be defined but localStorage is not
  }

  // Get API URL dynamically (works for both localhost and production)
  getApiUrl() {
    if (typeof window === 'undefined') {
      // Server-side: return default
      return 'http://localhost:3000/api';
    }
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProd 
      ? `${window.location.protocol}//${window.location.hostname}/api`
      : 'http://localhost:3000/api';
  }

  // Get auth token (safe for SSR)
  getAuthToken() {
    // Multiple checks to ensure we're in browser context
    if (typeof window === 'undefined') {
      return null;
    }
    if (!window.localStorage) {
      return null;
    }
    try {
      // Use window.localStorage explicitly to be safe
      return window.localStorage.getItem('token');
    } catch (error) {
      // Silently return null if localStorage is not available
      // Don't log errors during SSR
      if (typeof window !== 'undefined') {
        console.error('Error accessing localStorage:', error);
      }
      return null;
    }
  }

  // Get notification count for Topbar badge (with throttling and error handling)
  async getNotificationCount() {
    try {
      // Only run on client side
      if (typeof window === 'undefined') {
        return 0;
      }
      
      const token = this.getAuthToken();
      if (!token) return 0;

      // Throttle requests - minimum 2 seconds between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < 2000) {
        // Queue the request instead of making it immediately
        return new Promise((resolve) => {
          this.requestQueue.push({ type: 'count', resolve });
          this.processRequestQueue();
        });
      }

      const apiUrl = this.getApiUrl();
      this.lastRequestTime = now;
      
      const response = await fetch(`${apiUrl}/notifications/count?isRead=false&_t=${Date.now()}`, {
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
        this.consecutiveErrors = 0; // Reset error count on success
        this.backoffDelay = 10000; // Reset backoff delay
        return data.count;
      } else if (response.status === 429) {
        // Too Many Requests - implement exponential backoff
        this.consecutiveErrors++;
        this.backoffDelay = Math.min(this.backoffDelay * 2, this.maxBackoffDelay);
        console.warn(`⚠️ Rate limited (429). Backing off for ${this.backoffDelay}ms. Consecutive errors: ${this.consecutiveErrors}`);
        
        // Stop polling temporarily if we get too many 429s
        if (this.consecutiveErrors >= 3) {
          this.stopPolling();
          console.warn('⚠️ Too many rate limit errors. Polling stopped. Will resume after backoff period.');
          
          // Resume polling after backoff period
          setTimeout(() => {
            this.consecutiveErrors = 0;
            this.backoffDelay = 10000;
            if (this.isPolling) {
              this.startPolling();
            }
          }, this.backoffDelay);
        }
        
        return this.notificationCount; // Return cached count
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
    return this.notificationCount || 0; // Return cached count on error
  }
  
  // Process queued requests with throttling
  async processRequestQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < 2000) {
        // Wait before processing next request
        await new Promise(resolve => setTimeout(resolve, 2000 - timeSinceLastRequest));
      }
      
      const request = this.requestQueue.shift();
      if (request.type === 'count') {
        try {
          const count = await this.getNotificationCount();
          request.resolve(count);
        } catch (error) {
          request.resolve(this.notificationCount || 0);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  // Get notifications list (with throttling and error handling)
  async getNotifications(page = 1, limit = 20) {
    try {
      // Only run on client side
      if (typeof window === 'undefined') {
        return { notifications: [], pagination: { total: 0, pages: 0 } };
      }
      
      const token = this.getAuthToken();
      if (!token) return { notifications: [], pagination: { total: 0, pages: 0 } };

      // Throttle requests - minimum 2 seconds between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < 2000) {
        // Return cached notifications if request is too soon
        return { notifications: this.notifications, pagination: { total: this.notifications.length, pages: 1 } };
      }

      const apiUrl = this.getApiUrl();
      this.lastRequestTime = now;
      
      const response = await fetch(`${apiUrl}/notifications?page=${page}&limit=${limit}&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.notifications = data.notifications;
        this.consecutiveErrors = 0; // Reset error count on success
        this.backoffDelay = 10000; // Reset backoff delay
        return data;
      } else if (response.status === 429) {
        // Too Many Requests - return cached notifications
        console.warn('⚠️ Rate limited (429) when fetching notifications. Returning cached data.');
        return { notifications: this.notifications, pagination: { total: this.notifications.length, pages: 1 } };
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    return { notifications: this.notifications || [], pagination: { total: 0, pages: 0 } };
  }

  // Get recent activity notifications
  async getRecentActivity(limit = 10) {
    try {
      // Only run on client side
      if (typeof window === 'undefined') {
        return [];
      }
      
      const token = this.getAuthToken();
      if (!token) return [];

      const apiUrl = this.getApiUrl();
      const response = await fetch(`${apiUrl}/notifications/recent-activity?limit=${limit}`, {
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
      // Only run on client side
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = this.getAuthToken();
      if (!token) return false;

      const apiUrl = this.getApiUrl();
      const response = await fetch(`${apiUrl}/notifications/${notificationId}/read`, {
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
      // Only run on client side
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = this.getAuthToken();
      if (!token) return false;

      const apiUrl = this.getApiUrl();
      const response = await fetch(`${apiUrl}/notifications/read-all`, {
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
      // Only run on client side
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = this.getAuthToken();
      if (!token) return false;

      const apiUrl = this.getApiUrl();
      const response = await fetch(`${apiUrl}/notifications/${notificationId}`, {
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
      // Only run on client side
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = this.getAuthToken();
      if (!token) return false;

      const apiUrl = this.getApiUrl();
      const response = await fetch(`${apiUrl}/notifications/delete-read`, {
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

  // Start polling for updates (only on client side)
  startPolling() {
    // Only start polling on client side - strict checks
    if (typeof window === 'undefined') {
      return;
    }
    if (typeof setInterval === 'undefined') {
      return;
    }
    if (!window.localStorage) {
      return;
    }
    
    // Prevent multiple polling instances
    if (this.isPolling && this.pollingInterval) {
      console.log('⚠️ Polling already active, skipping duplicate start');
      return;
    }
    
    // Clear any existing interval
    if (this.pollingInterval) {
      if (typeof clearInterval !== 'undefined') {
        clearInterval(this.pollingInterval);
      }
      this.pollingInterval = null;
    }

    this.isPolling = true;
    
    // Use longer polling interval to reduce load (30 seconds instead of 10)
    const pollingInterval = 30000; // 30 seconds

    // Create interval with strict checks in callback
    this.pollingInterval = setInterval(() => {
      // Strict check - must be in browser with localStorage
      if (typeof window === 'undefined' || !window.localStorage) {
        this.stopPolling();
        return;
      }
      
      // Skip if we're still in backoff period
      if (this.consecutiveErrors >= 3) {
        console.log('⏸️ Skipping poll due to rate limiting backoff');
        return;
      }
      
      // Use async IIFE to handle async operations safely
      (async () => {
        try {
          // Final check before making API call
          if (typeof window !== 'undefined' && window.localStorage) {
            await this.getNotificationCount();
          }
        } catch (error) {
          // If localStorage error, stop polling
          if (error && (error.message?.includes('localStorage') || error.name === 'ReferenceError')) {
            this.stopPolling();
            return;
          }
          // Only log non-localStorage errors
          if (typeof window !== 'undefined') {
            console.error('Error in polling callback:', error);
          }
        }
      })();
    }, pollingInterval);
    
    console.log(`✅ Notification polling started (interval: ${pollingInterval}ms)`);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('⏹️ Notification polling stopped');
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

// Create singleton instance - lazy initialization to prevent SSR issues
let notificationServiceInstance = null;

function getNotificationService() {
  // Only create instance on client side
  if (typeof window !== 'undefined') {
    if (!notificationServiceInstance) {
      notificationServiceInstance = new NotificationService();
    }
    return notificationServiceInstance;
  }
  
  // For SSR, return a mock service that does nothing
  if (!notificationServiceInstance) {
    notificationServiceInstance = {
      getNotificationCount: () => Promise.resolve(0),
      getNotifications: () => Promise.resolve({ notifications: [], pagination: { total: 0, pages: 0 } }),
      markAsRead: () => Promise.resolve(false),
      markAllAsRead: () => Promise.resolve(false),
      deleteNotification: () => Promise.resolve(false),
      deleteAllRead: () => Promise.resolve(false),
      onUpdate: () => () => {},
      startPolling: () => {},
      stopPolling: () => {},
      getCurrentCount: () => 0,
      getCurrentNotifications: () => [],
      forceRefresh: () => Promise.resolve(),
      formatTime: (timestamp) => new Date(timestamp).toLocaleDateString(),
      getNotificationIcon: () => '',
      getNotificationColor: () => '',
      getAuthToken: () => null,
      getApiUrl: () => 'http://localhost:3000/api'
    };
  }
  return notificationServiceInstance;
}

// Create a proxy that always returns the current service instance
const notificationService = new Proxy({}, {
  get(target, prop) {
    const service = getNotificationService();
    const value = service[prop];
    // If it's a function, bind it to the service instance
    if (typeof value === 'function') {
      return value.bind(service);
    }
    return value;
  }
});

// Re-initialize on client side when window is available
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        notificationServiceInstance = new NotificationService();
        // Start polling only after instance is created and we're sure we're in browser
        if (notificationServiceInstance && typeof notificationServiceInstance.startPolling === 'function') {
          notificationServiceInstance.startPolling();
        }
      }
    });
  } else {
    // DOM already ready, create instance immediately
    if (typeof window !== 'undefined' && window.localStorage) {
      notificationServiceInstance = new NotificationService();
      // Start polling only after instance is created and we're sure we're in browser
      if (notificationServiceInstance && typeof notificationServiceInstance.startPolling === 'function') {
        notificationServiceInstance.startPolling();
      }
    }
  }
}

export default notificationService; 
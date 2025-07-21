// Session Management Service for Build Watch LGU
// Handles session recording, validation, and cross-browser session protection

class SessionService {
  constructor() {
    this.sessionKey = 'buildwatch_session_id';
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.init();
  }

  // Initialize session
  init() {
    // Generate or retrieve session ID
    let sessionId = this.getSessionId();
    if (!sessionId) {
      sessionId = this.generateSessionId();
      this.setSessionId(sessionId);
    }

    // Set session timestamp
    this.updateSessionTimestamp();
  }

  // Generate unique session ID
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const userAgent = navigator.userAgent.substring(0, 50);
    return `${timestamp}-${random}-${this.hashString(userAgent)}`;
  }

  // Simple hash function for user agent
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Get current session ID
  getSessionId() {
    return localStorage.getItem(this.sessionKey);
  }

  // Set session ID
  setSessionId(sessionId) {
    localStorage.setItem(this.sessionKey, sessionId);
  }

  // Get session timestamp
  getSessionTimestamp() {
    const timestamp = localStorage.getItem(`${this.sessionKey}_timestamp`);
    return timestamp ? parseInt(timestamp) : null;
  }

  // Update session timestamp
  updateSessionTimestamp() {
    localStorage.setItem(`${this.sessionKey}_timestamp`, Date.now().toString());
  }

  // Check if session is valid
  isSessionValid() {
    const timestamp = this.getSessionTimestamp();
    if (!timestamp) {
      return false;
    }

    const now = Date.now();
    const sessionAge = now - timestamp;

    // Check if session has expired
    if (sessionAge > this.sessionTimeout) {
      this.clearSession();
      return false;
    }

    // Update timestamp if session is still valid
    this.updateSessionTimestamp();
    return true;
  }

  // Clear session data
  clearSession() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(`${this.sessionKey}_timestamp`);
  }

  // Validate session for protected routes
  validateSession() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      return false;
    }

    // Check if session is valid
    if (!this.isSessionValid()) {
      return false;
    }

    return true;
  }

  // Redirect to home if session is invalid
  redirectIfInvalidSession() {
    if (!this.validateSession()) {
      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.clearSession();
      
      // Redirect to home page
      window.location.href = '/';
      return false;
    }
    return true;
  }

  // Get session info for debugging
  getSessionInfo() {
    return {
      sessionId: this.getSessionId(),
      timestamp: this.getSessionTimestamp(),
      isValid: this.isSessionValid(),
      age: this.getSessionTimestamp() ? Date.now() - this.getSessionTimestamp() : null
    };
  }
}

// Create global instance
const sessionService = new SessionService();

// Export for use in other modules
export default sessionService; 
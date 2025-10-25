// Client-side Authentication Service for Build Watch LGU
// Handles login, logout, token management, and user session state

import { authAPI, apiUtils } from './api.js';
import sessionService from './session.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.init();
  }

  // Initialize authentication state
  init() {
    this.isAuthenticated = apiUtils.isAuthenticated();
    this.currentUser = apiUtils.getCurrentUser();
    
    // Verify token on page load
    if (this.isAuthenticated) {
      this.verifyToken();
    }
  }

  // Login user
  async login(username, password) {
    try {
      const response = await authAPI.login(username, password);
      
      if (response.success) {
        // Store authentication data
        apiUtils.setAuthData(response.token, response.user);
        
        // Initialize session for this login
        sessionService.init();
        
        // Update local state
        this.isAuthenticated = true;
        this.currentUser = response.user;

        // Show modern success toast notification
        let waited = false;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        try {
          if (window && typeof window.showAppToast === 'function') {
            // Determine theme color from user account
            const theme = (response.user && (response.user.theme || response.user.role)) || 'blue';
            const palettes = {
              blue: {from:'#2563eb',to:'#1d4ed8'},
              emerald: {from:'#10b981',to:'#059669'},
              purple: {from:'#7c3aed',to:'#4c1d95'},
              orange: {from:'#f59e0b',to:'#d97706'}
            };
            const colors = palettes[theme] || palettes.blue;
            const maybe = window.showAppToast({
              title: 'Welcome back',
              message: `${response.user.name || response.user.username} successfully signed in`,
              variant: 'success',
              duration: 2000,
              from: colors.from,
              to: colors.to
            });
            if (maybe && typeof maybe.then === 'function') {
              await maybe; // wait if the toast returns a promise
              waited = true;
            }
          } else {
            // Create lightweight toast if global not available
            const theme = (response.user && (response.user.theme || response.user.role)) || 'blue';
            const palettes = {
              blue: {from:'#2563eb',to:'#1d4ed8'},
              emerald: {from:'#10b981',to:'#059669'},
              purple: {from:'#7c3aed',to:'#4c1d95'},
              orange: {from:'#f59e0b',to:'#d97706'}
            };
            const colors = palettes[theme] || palettes.blue;
            const toast = document.createElement('div');
            toast.id = 'login-success-toast';
            toast.className = 'fixed top-5 right-5 z-[9999]';
            toast.innerHTML = `
              <div class="group min-w-[280px] max-w-[360px] bg-white/95 backdrop-blur-xl border border-emerald-200/60 shadow-2xl rounded-2xl overflow-hidden animate-[toastIn_.5s_ease]">
                <div class="px-5 py-4 flex items-start gap-3">
                  <div class="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-md" style="background: linear-gradient(to bottom right, ${colors.from}, ${colors.to});">✓</div>
                  <div class="flex-1">
                    <div class="text-emerald-800 font-bold">Welcome back</div>
                    <div class="text-emerald-700/80 text-sm">${response.user.name || response.user.username} successfully signed in</div>
                  </div>
                  <button aria-label="Close" class="text-emerald-700/60 hover:text-emerald-800" onclick="this.closest('#login-success-toast')?.remove()">✕</button>
                </div>
                <div class="h-1 bg-emerald-200/60">
                  <div class="h-full animate-[bar_2s_linear]" style="background: linear-gradient(to right, ${colors.from}, ${colors.to});"></div>
                </div>
              </div>
              <style>
                @keyframes toastIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes bar { from { width: 100%; } to { width: 0%; } }
              </style>
            `;
            document.body.appendChild(toast);
            await wait(2000);
            toast.remove();
            waited = true;
          }
        } catch { /* no-op */ }
        
        // Ensure notification fully finishes before redirecting
        if (!waited) { await wait(2000); }
        this.redirectToDashboard(response.user.role, response.user.subRole);
        
        return {
          success: true,
          user: response.user
        };
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: apiUtils.handleError(error)
      };
    }
  }

  // Logout user with confirmation modal
  async logout() {
    // Show confirmation modal
    if (window.logoutModal) {
      window.logoutModal.show(async () => {
        await this.performLogout();
      });
    } else {
      // Fallback to direct logout if modal is not available
      await this.performLogout();
    }
  }

  // Perform actual logout
  async performLogout() {
    // Get current user role before clearing auth
    const currentRole = this.getUserRole();
    const currentSubRole = this.getUserSubRole();
    
    // Clear local data immediately (don't wait for API)
    this.clearAuth();
    
    // Clear session data
    sessionService.clearSession();
    
    // Redirect to login page immediately
    window.location.href = '/login/lgu-pmt';
    
    // Call logout API in background (non-blocking)
    try {
      authAPI.logout().catch(error => {
        console.error('Logout API error (non-blocking):', error);
      });
    } catch (error) {
      console.error('Logout API error (non-blocking):', error);
    }
  }

  // Verify token validity (non-blocking)
  async verifyToken() {
    // Don't block the UI for token verification
    authAPI.verifyToken()
      .then(response => {
        if (response.success) {
          // Update user data
          this.currentUser = response.user;
        } else {
          this.clearAuth();
        }
      })
      .catch(error => {
        console.error('Token verification error (non-blocking):', error);
        // Don't clear auth on network errors during development
        // this.clearAuth();
      });
    
    // Return true if we have local user data
    return this.currentUser !== null;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser;
  }

  // Check if user has specific role
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles) {
    return this.currentUser && roles.includes(this.currentUser.role);
  }

  // Get user's role
  getUserRole() {
    return this.currentUser ? this.currentUser.role : null;
  }

  // Get user's sub-role
  getUserSubRole() {
    return this.currentUser ? this.currentUser.subRole : null;
  }

  // Clear authentication data
  clearAuth() {
          apiUtils.clearAuthData();
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  // Check session validity
  checkSession() {
    return sessionService.validateSession();
  }

  // Redirect if session is invalid
  redirectIfInvalidSession() {
    return sessionService.redirectIfInvalidSession();
  }

  // Redirect to appropriate dashboard based on role
  redirectToDashboard(role, subRole = null) {
    // Special handling for SYS.AD role with different subRoles
    if (role === 'SYS.AD') {
      if (subRole === 'EXECUTIVE') {
        window.location.href = '/dashboard/executive-viewer/ExecutiveDashboard';
        return;
      } else {
        // Default System Admin dashboard
        window.location.href = '/dashboard/sysadmin/SysAdminDashboard';
        return;
      }
    }

    // Special handling for LGU-PMT role with different subRoles
    if (role === 'LGU-PMT') {
      if (subRole && typeof subRole === 'string' && subRole.toLowerCase() === 'mpmec') {
        window.location.href = '/dashboard/lgu-pmt-mpmec/MPMECDashboard';
        return;
      } else if (subRole && typeof subRole === 'string' && subRole.toLowerCase().includes('secretariat')) {
        window.location.href = '/dashboard/lgu-pmt-mpmec-secretariat/SECRETARIATDashboard';
        return;
      } else {
        // Default LGU-PMT dashboard (for other sub-roles)
        window.location.href = '/dashboard/lgu-pmt-mpmec/MPMECDashboard';
        return;
      }
    }

    // Updated dashboard routes
    const dashboardRoutes = {
      'EIU': '/dashboard/eiu/EIUDashboard',
      'EMS': '/dashboard/EMSDashboard',
      'LGU-IU': '/dashboard/iu-implementing-office/ImplementingOfficeDashboard',
      'IU': '/dashboard/iu-implementing-office/ImplementingOfficeDashboard'
    };

    const route = dashboardRoutes[role];
    if (route) {
      window.location.href = route;
    } else {
      // Default fallback
      window.location.href = '/dashboard/lgu-pmt-mpmec/MPMECDashboard';
    }
  }

  // Get login page URL based on role
  getLoginPageUrl(role) {
    // All users now use the single login page
    return '/login/lgu-pmt';
  }

  // Handle authentication errors
  handleAuthError(error) {
    console.error('Authentication error:', error);
    
    // Clear auth data on authentication errors
    if (error.message.includes('401') || 
        error.message.includes('Invalid token') || 
        error.message.includes('Token expired')) {
      this.clearAuth();
      window.location.href = '/';
    }
    
    return apiUtils.handleError(error);
  }

  // Check if user can access a specific route
  canAccessRoute(route) {
    if (!this.isAuthenticated) {
      return false;
    }

    // Define route permissions
    const routePermissions = {
      '/dashboard/LGUPMTDashboard': ['LGU-PMT'],
      '/dashboard/lgu-pmt-mpmec/MPMECDashboard': ['LGU-PMT'],
      '/dashboard/lgu-pmt-mpmec-secretariat/SECRETARIATDashboard': ['LGU-PMT'],
      '/dashboard/eiu/EIUDashboard': ['EIU'],
      '/dashboard/EMSDashboard': ['EMS'],
      '/dashboard/IUDashboard': ['LGU-IU', 'IU'],
      '/dashboard/sysadmin/SysAdminDashboard': ['SYS.AD'],
      '/dashboard/executive-viewer/ExecutiveDashboard': ['SYS.AD'],
      '/dashboard/executive-viewer/projects': ['SYS.AD'],
      '/dashboard/executive-viewer/heatmap': ['SYS.AD'],
      '/dashboard/executive-viewer/reports': ['SYS.AD'],
      '/dashboard/executive-viewer/export': ['SYS.AD'],
      '/dashboard/executive-viewer/search': ['SYS.AD'],
      '/dashboard/executive-viewer/notices': ['SYS.AD'],
      '/admin': ['SYS.AD'],
      '/projects': ['LGU-PMT', 'EIU', 'EMS', 'LGU-IU', 'IU', 'SYS.AD'],
      '/reports': ['LGU-PMT', 'EIU', 'EMS', 'LGU-IU', 'IU', 'SYS.AD'],
      '/monitoring': ['LGU-PMT', 'EIU', 'EMS', 'LGU-IU', 'IU', 'SYS.AD']
    };

    const allowedRoles = routePermissions[route];
    if (!allowedRoles) {
      return true; // No specific permissions required
    }

    // Special handling for Executive Viewer routes
    if (route.startsWith('/dashboard/executive-viewer/')) {
      return this.currentUser.role === 'SYS.AD' && this.currentUser.subRole === 'EXECUTIVE';
    }

    // Special handling for LGU-PMT MPMEC routes
    if (route.startsWith('/dashboard/lgu-pmt-mpmec/')) {
      return this.currentUser.role === 'LGU-PMT' && this.currentUser.subRole === 'MPMEC';
    }

    // Special handling for LGU-PMT Secretariat routes
    if (route.startsWith('/dashboard/lgu-pmt-mpmec-secretariat/')) {
      return this.currentUser.role === 'LGU-PMT' && typeof this.currentUser.subRole === 'string' && this.currentUser.subRole.toLowerCase().includes('secretariat');
    }

    return allowedRoles.includes(this.currentUser.role);
  }

  // Get user display name
  getUserDisplayName() {
    if (!this.currentUser) {
      return 'Guest';
    }
    return this.currentUser.name || this.currentUser.username;
  }

  // Get user initials for avatar
  getUserInitials() {
    if (!this.currentUser || !this.currentUser.name) {
      return 'U';
    }
    
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Get role display name
  getRoleDisplayName() {
    if (!this.currentUser) {
      return '';
    }

    const roleNames = {
      'LGU-PMT': 'LGU-PMT',
      'EIU': 'EIU',
      'EMS': 'EMS',
      'LGU-IU': 'LGU-IU',
      'SYS.AD': 'System Administrator',
      'EXEC': 'Executive Viewer'
    };

    return roleNames[this.currentUser.role] || this.currentUser.role;
  }
}

// Create singleton instance
const authService = new AuthService();

// Export the service
export default authService;

// Export individual methods for convenience
export const {
  login,
  logout,
  verifyToken,
  getCurrentUser,
  isUserAuthenticated,
  hasRole,
  hasAnyRole,
  getUserRole,
  getUserSubRole,
  clearAuth,
  redirectToDashboard,
  getLoginPageUrl,
  handleAuthError,
  canAccessRoute,
  getUserDisplayName,
  getUserInitials,
  getRoleDisplayName
} = authService; 
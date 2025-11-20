// Global Profile Picture Manager for System Administrator
// This script ensures profile pictures are synchronized across all SysAdmin modules
// ✅ FIXED: Only runs for System Administrator users to prevent cross-user contamination

class ProfilePictureManager {
  constructor() {
    this.profilePictureUrl = null;
    this.isInitialized = false;
    
    // ✅ FIXED: Check if this should run for current user before initializing
    if (this.shouldRunForCurrentUser()) {
      this.init();
    } else {
      console.log('🚫 System Admin Profile Picture Manager: Not running for non-SysAdmin user');
    }
  }

  // ✅ FIXED: Check if current user is System Administrator
  shouldRunForCurrentUser() {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        
        // Only run for System Administrator users
        if (user.role === 'SYS.AD' || user.role === 'System Administrator') {
          console.log('✅ System Admin Profile Picture Manager: Running for SysAdmin user:', user.email);
          return true;
        } else {
          console.log('🚫 System Admin Profile Picture Manager: Current user is not SysAdmin:', {
            role: user.role,
            email: user.email,
            name: user.fullName || user.name
          });
          return false;
        }
      }
    } catch (error) {
      console.log('⚠️ System Admin Profile Picture Manager: Error checking user data:', error);
    }
    
    return false;
  }

  async init() {
    console.log('🚀 Initializing System Admin Global Profile Picture Manager...');
    
    // Set up event listeners first
    this.setupEventListeners();
    
    // Load profile picture
    await this.loadProfilePicture();
    
    this.isInitialized = true;
    console.log('✅ System Admin Global Profile Picture Manager initialized');
  }

  async loadProfilePicture() {
    try {
      // ✅ FIXED: Double-check user is still System Admin before proceeding
      if (!this.shouldRunForCurrentUser()) {
        console.log('❌ System Admin Manager: User verification failed during load, stopping');
        return;
      }
      
      console.log('🔍 Fetching System Admin profile picture from server...');
      // Determine API URL based on environment
      const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const API_URL = isProd 
        ? `${window.location.protocol}//${window.location.hostname}/api`
        : 'http://localhost:3000/api';
      const response = await fetch(`${API_URL}/profile/picture/SA-001`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profilePictureUrl) {
          this.profilePictureUrl = data.profilePictureUrl;
          localStorage.setItem('sysadmin_profile_picture', data.profilePictureUrl);
          localStorage.setItem('profilePictureUrl', data.profilePictureUrl);
          console.log('✅ System Admin profile picture loaded from server:', this.profilePictureUrl);
          this.updateAllProfilePictures();
          return;
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to load from server, trying localStorage:', error);
    }

    // Fallback to localStorage - check both keys
    const storedUrl = localStorage.getItem('sysadmin_profile_picture') || localStorage.getItem('profilePictureUrl');
    if (storedUrl) {
      this.profilePictureUrl = storedUrl;
      localStorage.setItem('sysadmin_profile_picture', storedUrl);
      localStorage.setItem('profilePictureUrl', storedUrl);
      console.log('✅ System Admin profile picture loaded from localStorage:', this.profilePictureUrl);
      this.updateAllProfilePictures();
    } else {
      console.log('⚠️ No System Admin profile picture found');
    }
  }

  setupEventListeners() {
    // Listen for profile picture updates from any SysAdmin module
    window.addEventListener('profilePictureUpdated', (e) => {
      console.log('🌍 System Admin Global Manager received profilePictureUpdated event:', e.detail);
      if (e.detail.profilePictureUrl && this.shouldRunForCurrentUser()) {
        this.profilePictureUrl = e.detail.profilePictureUrl;
        localStorage.setItem('sysadmin_profile_picture', this.profilePictureUrl);
        localStorage.setItem('profilePictureUrl', this.profilePictureUrl);
        this.updateAllProfilePictures();
      }
    });

    // Listen for System Admin specific event
    window.addEventListener('sysadminProfilePictureUpdated', (e) => {
      console.log('🌍 System Admin Global Manager received sysadminProfilePictureUpdated event:', e.detail);
      if (e.detail.profilePictureUrl && this.shouldRunForCurrentUser()) {
        this.profilePictureUrl = e.detail.profilePictureUrl;
        localStorage.setItem('sysadmin_profile_picture', this.profilePictureUrl);
        localStorage.setItem('profilePictureUrl', this.profilePictureUrl);
        this.updateAllProfilePictures();
        
        // Also dispatch the generic event for backward compatibility
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: e.detail
        }));
      }
    });

    // Listen for page visibility changes to refresh profile pictures
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.shouldRunForCurrentUser()) {
        console.log('🔄 Page became visible, refreshing System Admin profile pictures...');
        this.updateAllProfilePictures();
      }
    });

    // Listen for navigation events
    window.addEventListener('popstate', () => {
      if (this.shouldRunForCurrentUser()) {
        console.log('🔄 Navigation detected, updating System Admin profile pictures...');
        setTimeout(() => this.updateAllProfilePictures(), 100);
      }
    });
  }

  async convertToDataURL(serverUrl) {
    try {
      console.log(`🔄 Converting server URL to data URL: ${serverUrl}`);
      const response = await fetch(serverUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        console.log(`✅ Successfully converted to data URL`);
        return dataUrl;
      }
    } catch (error) {
      console.log(`⚠️ Failed to convert server URL to data URL:`, error);
    }
    return serverUrl; // Fallback to original URL
  }

  async updateProfilePictureElement(element, elementName) {
    if (!element || !this.profilePictureUrl) return;

    try {
      console.log(`🎯 Updating System Admin ${elementName} with:`, this.profilePictureUrl);
      
      // Convert to data URL for better reliability
      const dataUrl = await this.convertToDataURL(this.profilePictureUrl);
      
      // Hide fallback immediately before updating to prevent flicker
      const fallbackDiv = element.nextElementSibling;
      if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
        fallbackDiv.style.display = 'none';
      }
      
      // Remove any existing error handlers
      element.onerror = null;
      
      // Update the image source
      element.src = dataUrl;
      element.style.display = 'block';
      
      // Add error handler for fallback
      element.onerror = () => {
        console.log(`⚠️ System Admin ${elementName} failed to load, showing fallback`);
        element.style.display = 'none';
        if (fallbackDiv) {
          fallbackDiv.style.display = 'flex';
        }
      };
      
      console.log(`✅ System Admin ${elementName} updated successfully`);
      
    } catch (error) {
      console.log(`❌ Error updating System Admin ${elementName}:`, error);
    }
  }

  updateAllProfilePictures() {
    // ✅ FIXED: Only update if user is still System Admin
    if (!this.shouldRunForCurrentUser()) {
      console.log('❌ System Admin Manager: User is no longer SysAdmin, skipping update');
      return;
    }
    
    if (!this.profilePictureUrl) {
      console.log('⚠️ No System Admin profile picture URL available for update');
      return;
    }

    console.log('🔄 System Admin Manager: Updating all profile pictures...');
    
    // Update sidebar profile picture
    const sidebarProfilePic = document.querySelector('#sidebar-profile-picture');
    if (sidebarProfilePic) {
      this.updateProfilePictureElement(sidebarProfilePic, 'sidebar');
    }
    
    // Update topbar profile picture
    const topbarProfilePic = document.querySelector('#topbar-profile-picture');
    if (topbarProfilePic) {
      this.updateProfilePictureElement(topbarProfilePic, 'topbar');
    }
    
    // Update dropdown profile picture
    const dropdownProfilePic = document.querySelector('#dropdown-profile-picture');
    if (dropdownProfilePic) {
      this.updateProfilePictureElement(dropdownProfilePic, 'dropdown');
    }
    
    // Update logout modal profile picture
    const logoutProfilePic = document.querySelector('#logoutProfilePicture');
    if (logoutProfilePic) {
      this.updateProfilePictureElement(logoutProfilePic, 'logout modal');
    }
    
    console.log('🎉 System Admin Manager: All profile pictures updated');
  }

  // Public method to force refresh
  forceRefresh() {
    if (this.shouldRunForCurrentUser()) {
      console.log('🔄 Force refreshing all System Admin profile pictures...');
      this.loadProfilePicture();
    }
  }

  // Public method to set new profile picture
  setProfilePicture(url) {
    if (this.shouldRunForCurrentUser()) {
      console.log('🔄 Setting new System Admin profile picture globally:', url);
      this.profilePictureUrl = url;
      localStorage.setItem('sysadmin_profile_picture', url);
      localStorage.setItem('profilePictureUrl', url);
      this.updateAllProfilePictures();
      
      // Dispatch events for other components
      window.dispatchEvent(new CustomEvent('sysadminProfilePictureUpdated', {
        detail: { profilePictureUrl: url }
      }));
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
        detail: { profilePictureUrl: url }
      }));
    }
  }
}

// ✅ FIXED: Only initialize if this is actually a System Admin user
console.log('⚡ System Admin: Checking if profile picture manager should initialize...');

// Initialize the global manager with user validation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.profilePictureManager = new ProfilePictureManager();
  });
} else {
  // If DOM is already loaded, start immediately
  window.profilePictureManager = new ProfilePictureManager();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfilePictureManager;
}

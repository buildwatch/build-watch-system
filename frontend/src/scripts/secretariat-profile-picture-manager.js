// Global Profile Picture Manager for Secretariat
// This script ensures profile pictures are synchronized across all Secretariat modules
// Based on EIU's proven approach

class SecretariatProfilePictureManager {
  constructor() {
    this.profilePictureUrl = null;
    this.isInitialized = false;
    this.failedUrls = new Set(); // Track failed URLs to avoid retrying
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Secretariat Global Profile Picture Manager...');
    
    // Temporarily disable profile picture loading to stop console spam
    console.log('⏸️ Temporarily disabling profile picture loading to stop console spam');
    this.isInitialized = true;
    return;
    
    // Check if profile picture loading is disabled
    if (localStorage.getItem('disable_profile_pictures') === 'true') {
      console.log('⏸️ Profile picture loading is disabled');
      this.isInitialized = true;
      return;
    }
    
    // Try to load from server first, then localStorage
    await this.loadProfilePicture();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Force update all profile pictures on initialization - delay to avoid interfering with user data loading
    setTimeout(() => {
      this.updateAllProfilePictures();
    }, 500); // Longer delay to ensure user data loading completes first
    
    this.isInitialized = true;
    console.log('✅ Secretariat Global Profile Picture Manager initialized');
  }

  async loadProfilePicture() {
    try {
      // Try to fetch from server first
      const userData = localStorage.getItem('userData') || localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Try different user identifier fields
        const userId = user.id || user.userId || user.employeeId || user.username || 'SEC-0001';
        
        console.log('🔍 Fetching Secretariat profile picture from server for user:', userId);
        console.log('🔍 User data:', { id: user.id, userId: user.userId, employeeId: user.employeeId, username: user.username });
        
        // Determine API URL based on environment
        const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const API_URL = isProd 
          ? `${window.location.protocol}//${window.location.hostname}/api`
          : 'http://localhost:3000/api';
        const response = await fetch(`${API_URL}/profile/picture/${userId}`);
        console.log('📡 Profile picture API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Profile picture API response data:', data);
          
          if (data.success && data.profilePictureUrl) {
            this.profilePictureUrl = data.profilePictureUrl;
            console.log('✅ Secretariat Profile picture loaded from server:', this.profilePictureUrl);
            return;
          } else {
            console.log('⚠️ No profile picture URL in API response');
          }
        } else {
          console.log('⚠️ Profile picture API request failed with status:', response.status);
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to load from server, trying localStorage:', error);
      // Don't let profile picture errors interfere with user data loading
    }

    // Fallback to localStorage
    const storedUrl = localStorage.getItem('secretariat_profile_picture');
    if (storedUrl) {
      this.profilePictureUrl = storedUrl;
      console.log('✅ Secretariat Profile picture loaded from localStorage:', this.profilePictureUrl);
    } else {
      console.log('⚠️ No Secretariat profile picture found in localStorage');
    }
  }

  setupEventListeners() {
    // Listen for profile picture updates from any Secretariat module
    window.addEventListener('secretariatProfilePictureUpdated', (e) => {
      console.log('🌍 Secretariat Global Manager received secretariatProfilePictureUpdated event:', e.detail);
      if (e.detail.profilePictureUrl) {
        this.profilePictureUrl = e.detail.profilePictureUrl;
        localStorage.setItem('secretariat_profile_picture', this.profilePictureUrl);
        this.updateAllProfilePictures();
      }
    });

    // Listen for page visibility changes to refresh profile pictures
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing Secretariat profile pictures...');
        this.updateAllProfilePictures();
      }
    });

    // Listen for navigation events
    window.addEventListener('popstate', () => {
      console.log('🔄 Navigation detected, updating Secretariat profile pictures...');
      setTimeout(() => this.updateAllProfilePictures(), 100);
    });
    
    // Periodic check for logout modal updates
    setInterval(() => {
      this.checkAndUpdateLogoutModal();
    }, 1000); // Check every second
  }
  
  checkAndUpdateLogoutModal() {
    // Check if logout modal is visible and update it if needed
    const logoutModal = document.getElementById('logout-modal');
    if (logoutModal && !logoutModal.classList.contains('hidden')) {
      console.log('🔄 Logout modal is visible, checking profile picture...');
      this.updateLogoutModalProfilePicture();
    }
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
      console.log(`🎯 Updating Secretariat ${elementName} with:`, this.profilePictureUrl);
      
      // Remove any existing error handlers
      element.onerror = null;
      
      // Convert server URL to data URL if needed (only in development)
      let finalUrl = this.profilePictureUrl;
      const isLocalhost = this.profilePictureUrl.startsWith('http://localhost:3000') || this.profilePictureUrl.startsWith('http://127.0.0.1:3000');
      if (isLocalhost && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        finalUrl = await this.convertToDataURL(this.profilePictureUrl);
      }
      
      // Skip if this URL has already failed
      if (this.failedUrls.has(finalUrl)) {
        console.log(`⏭️ Skipping failed URL for ${elementName}: ${finalUrl}`);
        element.src = '/default-profile.png';
        return;
      }
      
      // Update the image source
      element.src = finalUrl;
      element.style.display = 'block';
      
      // Hide fallback div if it exists
      const fallbackDiv = element.nextElementSibling;
      if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
        fallbackDiv.style.display = 'none';
      }
      
      // Visual feedback
      element.style.transform = 'scale(1.1)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
      
      // Add error handler for fallback
      element.onerror = (error) => {
        console.log(`⚠️ Secretariat ${elementName} failed to load:`, error);
        console.log(`⚠️ Failed URL: ${finalUrl}`);
        
        // Track this URL as failed
        this.failedUrls.add(finalUrl);
        
        // Try localStorage fallback
        const fallbackUrl = localStorage.getItem('secretariat_profile_picture');
        if (fallbackUrl && fallbackUrl !== finalUrl && !this.failedUrls.has(fallbackUrl)) {
          console.log(`🔄 Trying localStorage fallback: ${fallbackUrl}`);
          element.src = fallbackUrl;
        } else {
          // Use default placeholder
          console.log(`🔄 Using default placeholder for ${elementName}`);
          element.src = '/default-profile.png';
        }
      };
      
      console.log(`✅ Secretariat ${elementName} updated successfully`);
      
    } catch (error) {
      console.log(`❌ Error updating Secretariat ${elementName}:`, error);
    }
  }

  updateAllProfilePictures() {
    if (!this.profilePictureUrl) {
      console.log('⚠️ No Secretariat profile picture URL available for update');
      return;
    }

    console.log('🔄 Updating all Secretariat profile pictures globally...');
    console.log('🔄 Current profile picture URL:', this.profilePictureUrl);
    
    // Update sidebar profile picture
    const sidebarProfilePic = document.querySelector('#secretariat-sidebar-profile-picture');
    console.log('🔍 Sidebar profile picture found:', sidebarProfilePic);
    if (sidebarProfilePic) {
      this.updateProfilePictureElement(sidebarProfilePic, 'sidebar profile picture');
    } else {
      console.log('❌ Sidebar profile picture NOT found!');
    }
    
    // Update topbar profile picture
    const topbarProfilePic = document.querySelector('#secretariat-profile-picture');
    console.log('🔍 Topbar profile picture found:', topbarProfilePic);
    if (topbarProfilePic) {
      this.updateProfilePictureElement(topbarProfilePic, 'topbar profile picture');
    } else {
      console.log('❌ Topbar profile picture NOT found!');
    }
    
    // Update dropdown profile picture
    const dropdownProfilePic = document.querySelector('#secretariat-dropdown-photo');
    console.log('🔍 Dropdown profile picture found:', dropdownProfilePic);
    if (dropdownProfilePic) {
      this.updateProfilePictureElement(dropdownProfilePic, 'dropdown profile picture');
    } else {
      console.log('❌ Dropdown profile picture NOT found!');
    }
    
    // Update logout modal profile picture immediately
    this.updateLogoutModalProfilePicture();
    
    // Update any other profile pictures
    const allProfilePics = document.querySelectorAll('img[src*="SEC"], img[src*="unsplash"], img[src*="default"], img[alt*="Secretariat"], img[alt*="Secretariat Personnel"]');
    allProfilePics.forEach((img, index) => {
      if (img.id !== 'secretariatMainProfilePicture' && img.id !== 'currentProfilePic') {
        this.updateProfilePictureElement(img, `additional Secretariat profile picture ${index + 1}`);
      }
    });
  }
  
  updateLogoutModalProfilePicture() {
    // Update the logout modal profile picture if it exists
    const logoutProfilePic = document.getElementById('logoutProfilePicture');
    if (logoutProfilePic && this.profilePictureUrl) {
      console.log('🎯 Updating logout modal profile picture with Secretariat image');
      
      // Remove any existing error handlers
      logoutProfilePic.onerror = null;
      
      // Update the image source immediately
      logoutProfilePic.src = this.profilePictureUrl;
      logoutProfilePic.style.display = 'block';
      
      // Hide fallback if it exists
      const fallbackDiv = logoutProfilePic.nextElementSibling;
      if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
        fallbackDiv.style.display = 'none';
      }
      
      // Add error handler for fallback
      logoutProfilePic.onerror = () => {
        console.log('⚠️ Logout modal profile picture failed to load, using fallback');
        logoutProfilePic.style.display = 'none';
        if (fallbackDiv) {
          fallbackDiv.style.display = 'flex';
        }
      };
      
      console.log('✅ Logout modal profile picture updated successfully');
    } else {
      console.log('🔍 Logout modal profile picture element not found or no URL available');
    }
  }

  // Public method to force refresh
  forceRefresh() {
    console.log('🔄 Force refreshing all Secretariat profile pictures...');
    this.updateAllProfilePictures();
  }

  // Public method to set new profile picture
  setProfilePicture(url) {
    console.log('🔄 Setting new Secretariat profile picture globally:', url);
    this.profilePictureUrl = url;
    localStorage.setItem('secretariat_profile_picture', url);
    this.updateAllProfilePictures();
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('secretariatProfilePictureUpdated', {
      detail: { profilePictureUrl: url }
    }));
  }
  
  // Public method to update logout modal specifically
  updateLogoutModal() {
    console.log('🎯 Force updating logout modal profile picture...');
    this.updateLogoutModalProfilePicture();
  }
}

// Initialize the global manager when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.secretariatProfilePictureManager = new SecretariatProfilePictureManager();
  });
} else {
  window.secretariatProfilePictureManager = new SecretariatProfilePictureManager();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecretariatProfilePictureManager;
}
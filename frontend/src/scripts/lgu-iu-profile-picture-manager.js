// Global Profile Picture Manager for LGU-IU IOO
// This script ensures profile pictures are synchronized across all LGU-IU IOO modules
// Based on EIU's proven approach

class LGUIUProfilePictureManager {
  constructor() {
    this.profilePictureUrl = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    console.log('🚀 Initializing LGU-IU IOO Global Profile Picture Manager...');
    
    // Try to load from server first, then localStorage
    await this.loadProfilePicture();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Force update all profile pictures on initialization
    setTimeout(() => {
      this.updateAllProfilePictures();
    }, 100); // Small delay to ensure DOM is ready
    
    this.isInitialized = true;
    console.log('✅ LGU-IU IOO Global Profile Picture Manager initialized');
  }

  async loadProfilePicture() {
    try {
      // Try to fetch from server first
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const employeeId = user.employeeId || user.username || user.id || user.userId || 'LGU-IU-0001';
        
        console.log('🔍 Fetching LGU-IU IOO profile picture from server for:', employeeId);
        const response = await fetch(`http://localhost:3000/api/profile/picture/${employeeId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profilePictureUrl) {
            this.profilePictureUrl = data.profilePictureUrl;
            console.log('✅ LGU-IU IOO Profile picture loaded from server:', this.profilePictureUrl);
            return;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to load from server, trying localStorage:', error);
    }

    // Fallback to localStorage
    const storedUrl = localStorage.getItem('lgu_iu_profile_picture');
    if (storedUrl) {
      this.profilePictureUrl = storedUrl;
      console.log('✅ LGU-IU IOO Profile picture loaded from localStorage:', this.profilePictureUrl);
    } else {
      console.log('⚠️ No LGU-IU IOO profile picture found in localStorage');
    }
  }

  setupEventListeners() {
    // Listen for profile picture updates from any LGU-IU IOO module
    window.addEventListener('lguIuProfilePictureUpdated', (e) => {
      console.log('🌍 LGU-IU IOO Global Manager received lguIuProfilePictureUpdated event:', e.detail);
      if (e.detail.profilePictureUrl) {
        this.profilePictureUrl = e.detail.profilePictureUrl;
        localStorage.setItem('lgu_iu_profile_picture', this.profilePictureUrl);
        this.updateAllProfilePictures();
      }
    });

    // Listen for page visibility changes to refresh profile pictures
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing LGU-IU IOO profile pictures...');
        this.updateAllProfilePictures();
      }
    });

    // Listen for navigation events
    window.addEventListener('popstate', () => {
      console.log('🔄 Navigation detected, updating LGU-IU IOO profile pictures...');
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
      console.log(`🎯 Updating LGU-IU IOO ${elementName} with:`, this.profilePictureUrl);
      
      // Remove any existing error handlers
      element.onerror = null;
      
      // Convert server URL to data URL if needed
      let finalUrl = this.profilePictureUrl;
      if (this.profilePictureUrl.startsWith('http://localhost:3000')) {
        finalUrl = await this.convertToDataURL(this.profilePictureUrl);
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
      element.onerror = () => {
        console.log(`⚠️ LGU-IU IOO ${elementName} failed to load, using localStorage fallback`);
        const fallbackUrl = localStorage.getItem('lgu_iu_profile_picture');
        if (fallbackUrl && fallbackUrl !== finalUrl) {
          element.src = fallbackUrl;
        }
      };
      
      console.log(`✅ LGU-IU IOO ${elementName} updated successfully`);
      
    } catch (error) {
      console.log(`❌ Error updating LGU-IU IOO ${elementName}:`, error);
    }
  }

  updateAllProfilePictures() {
    if (!this.profilePictureUrl) {
      console.log('⚠️ No LGU-IU IOO profile picture URL available for update');
      return;
    }

    console.log('🔄 Updating all LGU-IU IOO profile pictures globally...');
    console.log('🔄 Current profile picture URL:', this.profilePictureUrl);
    
    // Update sidebar profile picture
    const sidebarProfilePic = document.querySelector('#lgu-iu-sidebar-profile-picture');
    console.log('🔍 Sidebar profile picture found:', sidebarProfilePic);
    if (sidebarProfilePic) {
      this.updateProfilePictureElement(sidebarProfilePic, 'sidebar profile picture');
    } else {
      console.log('❌ Sidebar profile picture NOT found!');
    }
    
    // Update topbar profile picture
    const topbarProfilePic = document.querySelector('#lgu-iu-profile-picture');
    console.log('🔍 Topbar profile picture found:', topbarProfilePic);
    if (topbarProfilePic) {
      this.updateProfilePictureElement(topbarProfilePic, 'topbar profile picture');
    } else {
      console.log('❌ Topbar profile picture NOT found!');
    }
    
    // Update dropdown profile picture
    const dropdownProfilePic = document.querySelector('#lgu-iu-dropdown-photo');
    console.log('🔍 Dropdown profile picture found:', dropdownProfilePic);
    if (dropdownProfilePic) {
      this.updateProfilePictureElement(dropdownProfilePic, 'dropdown profile picture');
    } else {
      console.log('❌ Dropdown profile picture NOT found!');
    }
    
    // Update logout modal profile picture immediately
    this.updateLogoutModalProfilePicture();
    
    // Update any other profile pictures
    const allProfilePics = document.querySelectorAll('img[src*="ME"], img[src*="unsplash"], img[src*="default"], img[alt*="LGU-IU"], img[alt*="Municipal Engineer"]');
    allProfilePics.forEach((img, index) => {
      if (img.id !== 'lguIuMainProfilePicture' && img.id !== 'currentProfilePic') {
        this.updateProfilePictureElement(img, `additional LGU-IU IOO profile picture ${index + 1}`);
      }
    });
  }
  
  updateLogoutModalProfilePicture() {
    // Update the logout modal profile picture if it exists
    const logoutProfilePic = document.getElementById('logoutProfilePicture');
    if (logoutProfilePic && this.profilePictureUrl) {
      console.log('🎯 Updating logout modal profile picture with LGU-IU IOO image');
      
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
    console.log('🔄 Force refreshing all LGU-IU IOO profile pictures...');
    this.updateAllProfilePictures();
  }

  // Public method to set new profile picture
  setProfilePicture(url) {
    console.log('🔄 Setting new LGU-IU IOO profile picture globally:', url);
    this.profilePictureUrl = url;
    localStorage.setItem('lgu_iu_profile_picture', url);
    this.updateAllProfilePictures();
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('lguIuProfilePictureUpdated', {
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
    window.lguIuProfilePictureManager = new LGUIUProfilePictureManager();
  });
} else {
  window.lguIuProfilePictureManager = new LGUIUProfilePictureManager();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LGUIUProfilePictureManager;
}

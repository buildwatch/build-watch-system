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
      // Try to fetch from server first (server is the source of truth)
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        
        // CRITICAL: Priority order - userId (LGU-IU-0001) > id > employeeId > username
        const userId = user.userId || user.id || user.employeeId || user.username || 'LGU-IU-0001';
        
        // FIRST: Check if user data already has profilePictureUrl (from database) - like office-groups.astro
        if (user.profilePictureUrl && user.profilePictureUrl.startsWith('http')) {
          console.log('✅ LGU-IU Manager: Using profilePictureUrl from user data (database):', user.profilePictureUrl.substring(0, 50) + '...');
          this.profilePictureUrl = user.profilePictureUrl;
          
          // Store in both keys for consistency
          localStorage.setItem('iu_profile_picture', user.profilePictureUrl);
          localStorage.setItem('lgu_iu_profile_picture', user.profilePictureUrl);
          return;
        }
        
        // SECOND: Fetch from server
        console.log('🔍 Fetching LGU-IU IOO profile picture from server for:', userId);
        // Determine API URL based on environment
        const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const API_URL = isProd 
          ? `${window.location.protocol}//${window.location.hostname}/api`
          : 'http://localhost:3000/api';
        const response = await fetch(`${API_URL}/profile/picture/${userId}?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profilePictureUrl) {
            this.profilePictureUrl = data.profilePictureUrl;
            
            // CRITICAL: Sync both localStorage keys with server value (server is source of truth)
            // Prefer HTTP URL over base64 data URL for consistency
            let urlToStore = data.profilePictureUrl;
            
            // If server returns base64 but user data has HTTP URL, prefer HTTP URL
            if (data.profilePictureUrl.startsWith('data:') && user.profilePictureUrl && user.profilePictureUrl.startsWith('http')) {
              urlToStore = user.profilePictureUrl;
              this.profilePictureUrl = user.profilePictureUrl;
              console.log('🔄 Using HTTP URL from user data instead of base64 from server');
            }
            
            // Store in both keys for consistency
            localStorage.setItem('iu_profile_picture', urlToStore);
            localStorage.setItem('lgu_iu_profile_picture', urlToStore);
            
            // Also update user data if it's different
            if (user.profilePictureUrl !== urlToStore) {
              user.profilePictureUrl = urlToStore;
              localStorage.setItem('user', JSON.stringify(user));
            }
            
            console.log('✅ LGU-IU IOO Profile picture loaded from server:', this.profilePictureUrl.substring(0, 50) + '...');
            return;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to load from server, trying localStorage:', error);
    }

    // Fallback to localStorage - check both keys for compatibility
    const iuProfile = localStorage.getItem('iu_profile_picture');
    const lguIuProfile = localStorage.getItem('lgu_iu_profile_picture');
    
    // Prefer HTTP URL over base64 data URL
    let storedUrl = null;
    if (iuProfile && lguIuProfile) {
      // If both exist, prefer HTTP URL
      if (iuProfile.startsWith('http') && !lguIuProfile.startsWith('http')) {
        storedUrl = iuProfile;
      } else if (lguIuProfile.startsWith('http') && !iuProfile.startsWith('http')) {
        storedUrl = lguIuProfile;
      } else {
        // Both same type, use iu_profile_picture
        storedUrl = iuProfile;
      }
    } else {
      storedUrl = iuProfile || lguIuProfile;
    }
    
    if (storedUrl) {
      this.profilePictureUrl = storedUrl;
      // Store in both keys for consistency
      localStorage.setItem('iu_profile_picture', storedUrl);
      localStorage.setItem('lgu_iu_profile_picture', storedUrl);
      console.log('✅ LGU-IU IOO Profile picture loaded from localStorage:', storedUrl.substring(0, 50) + '...');
    } else {
      console.log('⚠️ No LGU-IU IOO profile picture found in localStorage');
    }
  }

  setupEventListeners() {
    // Listen for profile picture updates from any LGU-IU IOO module
    // Listen for both event names for compatibility
    window.addEventListener('iuProfilePictureUpdated', (e) => {
      console.log('🌍 LGU-IU IOO Global Manager received iuProfilePictureUpdated event:', e.detail);
      if (e.detail.profilePictureUrl) {
        let urlToStore = e.detail.profilePictureUrl;
        
        // Prefer HTTP URL over base64 data URL for consistency
        // If we have userData with HTTP URL, prefer that
        if (e.detail.userData && e.detail.userData.profilePictureUrl) {
          const userUrl = e.detail.userData.profilePictureUrl;
          if (userUrl.startsWith('http') && urlToStore.startsWith('data:')) {
            urlToStore = userUrl;
            console.log('🔄 Using HTTP URL from userData instead of base64 from event');
          }
        }
        
        this.profilePictureUrl = urlToStore;
        
        // Store in both localStorage keys for compatibility
        localStorage.setItem('iu_profile_picture', urlToStore);
        localStorage.setItem('lgu_iu_profile_picture', urlToStore);
        
        // Also update user data in localStorage if available
        if (e.detail.userData) {
          const userData = e.detail.userData;
          userData.profilePictureUrl = urlToStore;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        this.updateAllProfilePictures();
      }
    });
    
    // Also listen for the old event name for backward compatibility
    window.addEventListener('lguIuProfilePictureUpdated', (e) => {
      console.log('🌍 LGU-IU IOO Global Manager received lguIuProfilePictureUpdated event:', e.detail);
      if (e.detail.profilePictureUrl) {
        let urlToStore = e.detail.profilePictureUrl;
        
        // Prefer HTTP URL over base64 data URL
        if (e.detail.userData && e.detail.userData.profilePictureUrl) {
          const userUrl = e.detail.userData.profilePictureUrl;
          if (userUrl.startsWith('http') && urlToStore.startsWith('data:')) {
            urlToStore = userUrl;
            console.log('🔄 Using HTTP URL from userData instead of base64 from event');
          }
        }
        
        this.profilePictureUrl = urlToStore;
        localStorage.setItem('iu_profile_picture', urlToStore);
        localStorage.setItem('lgu_iu_profile_picture', urlToStore);
        
        if (e.detail.userData) {
          const userData = e.detail.userData;
          userData.profilePictureUrl = urlToStore;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        this.updateAllProfilePictures();
      }
    });

    // Listen for page visibility changes to refresh profile pictures
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // CRITICAL FIX: Skip updates if we're on a messaging page
        if (this.isOnMessagingPage()) {
          console.log('⏭️ Skipping LGU-IU profile picture update - on messaging page');
          return;
        }
        console.log('🔄 Page became visible, refreshing LGU-IU IOO profile pictures...');
        this.updateAllProfilePictures();
      }
    });

    // Listen for navigation events
    window.addEventListener('popstate', () => {
      // CRITICAL FIX: Skip updates if we're on a messaging page
      if (this.isOnMessagingPage()) {
        console.log('⏭️ Skipping LGU-IU profile picture update - on messaging page');
        return;
      }
      console.log('🔄 Navigation detected, updating LGU-IU IOO profile pictures...');
      setTimeout(() => this.updateAllProfilePictures(), 100);
    });
    
    // Periodic check for logout modal updates
    setInterval(() => {
      this.checkAndUpdateLogoutModal();
    }, 1000); // Check every second
  }

  // Check if we're on a messaging page
  isOnMessagingPage() {
    const path = window.location.pathname;
    return path.includes('/messaging') || path.includes('/message-center') || path.includes('/communication');
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
      console.log(`🎯 Updating LGU-IU IOO ${elementName} with:`, this.profilePictureUrl.substring(0, 50) + '...');
      
      // Remove any existing error handlers
      element.onerror = null;
      
      // Convert server URL to data URL if needed (only in development)
      let finalUrl = this.profilePictureUrl;
      const isLocalhost = this.profilePictureUrl.startsWith('http://localhost:3000') || this.profilePictureUrl.startsWith('http://127.0.0.1:3000');
      if (isLocalhost && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        finalUrl = await this.convertToDataURL(this.profilePictureUrl);
      }
      
      // CRITICAL: Hide fallback BEFORE updating to prevent flicker
      const fallbackDiv = element.nextElementSibling;
      if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
        fallbackDiv.style.display = 'none';
      }
      
      // Preload image to prevent flickering
      const preloadImg = new Image();
      preloadImg.onload = () => {
        // Only update src after image is fully loaded
        element.src = finalUrl;
        element.style.display = 'block';
        
        // Ensure fallback stays hidden
        if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
          fallbackDiv.style.display = 'none';
        }
        
        // Visual feedback (subtle)
        element.style.opacity = '0';
        setTimeout(() => {
          element.style.opacity = '1';
          element.style.transition = 'opacity 0.2s ease-in-out';
        }, 10);
        
        console.log(`✅ LGU-IU IOO ${elementName} updated successfully`);
      };
      
      preloadImg.onerror = () => {
        console.log(`⚠️ LGU-IU IOO ${elementName} failed to preload, trying direct update`);
        // Fallback: try direct update
        element.src = finalUrl;
        element.style.display = 'block';
        if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
          fallbackDiv.style.display = 'none';
        }
      };
      
      // Start preloading
      preloadImg.src = finalUrl;
      
      // Add error handler for the actual element
      element.onerror = () => {
        console.log(`⚠️ LGU-IU IOO ${elementName} failed to load, showing fallback`);
        element.style.display = 'none';
        if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
          fallbackDiv.style.display = 'flex';
        }
      };
      
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
    const sidebarProfilePic = document.getElementById('iu-sidebar-profile-picture');
    console.log('🔍 Sidebar profile picture found:', sidebarProfilePic);
    if (sidebarProfilePic) {
      this.updateProfilePictureElement(sidebarProfilePic, 'sidebar profile picture');
    } else {
      console.log('❌ Sidebar profile picture NOT found!');
    }
    
    // Update topbar profile picture
    const topbarProfilePic = document.getElementById('iu-profile-picture');
    console.log('🔍 Topbar profile picture found:', topbarProfilePic);
    if (topbarProfilePic) {
      this.updateProfilePictureElement(topbarProfilePic, 'topbar profile picture');
    } else {
      console.log('❌ Topbar profile picture NOT found!');
    }
    
    // Update dropdown profile picture
    const dropdownProfilePic = document.getElementById('iu-dropdown-photo');
    console.log('🔍 Dropdown profile picture found:', dropdownProfilePic);
    if (dropdownProfilePic) {
      this.updateProfilePictureElement(dropdownProfilePic, 'dropdown profile picture');
    } else {
      console.log('❌ Dropdown profile picture NOT found!');
    }
    
    // Update logout modal profile picture immediately
    this.updateLogoutModalProfilePicture();
    
    // CRITICAL: Skip ALL updates if we're on a messaging page
    if (this.isOnMessagingPage()) {
      console.log('⏭️ Skipping updateAllProfilePictures - on messaging page');
      return;
    }

    // Update any other profile pictures - EXCLUDE messaging center images
    // Find messaging center container (check for common messaging center class/id patterns)
    const messagingCenter = document.querySelector('[class*="messaging"], [id*="messaging"], [class*="message"], [id*="message"]');
    
    const allProfilePics = document.querySelectorAll('img[src*="ME"], img[src*="unsplash"], img[src*="default"], img[alt*="LGU-IU"], img[alt*="Municipal Engineer"]');
    allProfilePics.forEach((img, index) => {
      // CRITICAL: Skip images inside messaging center to prevent overwriting conversation profile pictures
      if (messagingCenter && messagingCenter.contains(img)) {
        console.log(`⏭️ Skipping messaging center image ${index + 1}`);
        return;
      }
      
      // Skip blob URLs and data URLs (used by messaging center ProfilePictureImage component)
      const src = img.src || '';
      if (src.startsWith('blob:') || src.startsWith('data:')) {
        // Skip ALL blob/data URLs - they're likely from messaging center
        console.log(`⏭️ Skipping blob/data URL image ${index + 1} (likely from messaging)`);
        return;
      }
      
      // Skip known profile picture IDs
      if (img.id !== 'lguIuMainProfilePicture' && img.id !== 'currentProfilePic') {
        // Additional check: Skip if image is inside a conversation/chat container
        const isInConversation = img.closest('[class*="conversation"], [class*="message"], [class*="chat"], [class*="messaging"]');
        if (isInConversation) {
          console.log(`⏭️ Skipping conversation image ${index + 1}`);
          return;
        }
        
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
    // Store in both localStorage keys for compatibility
    localStorage.setItem('iu_profile_picture', url);
    localStorage.setItem('lgu_iu_profile_picture', url);
    this.updateAllProfilePictures();
    
    // Dispatch event for other components (use the standard event name)
    window.dispatchEvent(new CustomEvent('iuProfilePictureUpdated', {
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

// Global Profile Picture Manager for MPMEC
// This script ensures profile pictures are synchronized across all MPMEC modules
// ✅ COMPREHENSIVE LONG-TERM SOLUTION with robust error handling and validation

class MPMECProfilePictureManager {
  constructor() {
    this.profilePictureUrl = null;
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
    this.imageValidationCache = new Map(); // Cache for validated images
    
    // ✅ FIXED: Check if this should run for current user before initializing
    if (this.shouldRunForCurrentUser()) {
      this.init();
    } else {
      console.log('🚫 MPMEC Profile Picture Manager: Not running for non-MPMEC user');
    }
  }

  // ✅ FIXED: Check if current user is MPMEC user
  shouldRunForCurrentUser() {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        
        // Only run for LGU-PMT users (MPMEC)
        if (user.role === 'LGU-PMT') {
          console.log('✅ MPMEC Profile Picture Manager: Running for MPMEC user:', user.email);
          return true;
        } else {
          console.log('🚫 MPMEC Profile Picture Manager: Current user is not LGU-PMT:', {
            role: user.role,
            email: user.email,
            name: user.fullName || user.name
          });
          return false;
        }
      }
    } catch (error) {
      console.log('⚠️ MPMEC Profile Picture Manager: Error checking user data:', error);
    }
    
    return false;
  }

  async init() {
    console.log('🚀 Initializing MPMEC Global Profile Picture Manager...');
    
    // ✅ FIXED: Clear any System Admin contamination immediately
    this.clearSystemAdminContamination();
    
    // Set up event listeners first
    this.setupEventListeners();
    
    // Load profile picture with retry mechanism
    await this.loadProfilePictureWithRetry();
    
    // ✅ FIXED: Start continuous monitoring to override any wrong profile pictures
    this.startContinuousMonitoring();
    
    this.isInitialized = true;
    console.log('✅ MPMEC Global Profile Picture Manager initialized with monitoring');
  }

  // ✅ NEW: Enhanced profile picture loading with retry mechanism
  async loadProfilePictureWithRetry() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.log(`🔄 MPMEC Manager: Loading profile picture (attempt ${attempt}/${this.maxRetries})`);
      
      const success = await this.loadProfilePicture();
      if (success) {
        console.log('✅ MPMEC Manager: Profile picture loaded successfully');
        return true;
      }
      
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * attempt; // Exponential backoff
        console.log(`⏳ MPMEC Manager: Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log('❌ MPMEC Manager: Failed to load profile picture after all attempts');
    return false;
  }

  // ✅ NEW: Validate image URL by attempting to load it
  async validateImageUrl(url) {
    if (this.imageValidationCache.has(url)) {
      return this.imageValidationCache.get(url);
    }
    
    try {
      console.log(`🔍 MPMEC Manager: Validating image URL: ${url}`);
      
      // Try to fetch the image to validate it exists and is accessible
      const response = await fetch(url, { 
        method: 'HEAD', // Only get headers, not the full image
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const isValidImage = contentType && contentType.startsWith('image/');
        
        if (isValidImage) {
          console.log(`✅ MPMEC Manager: Image URL is valid: ${url}`);
          this.imageValidationCache.set(url, true);
          return true;
        } else {
          console.log(`❌ MPMEC Manager: URL is not an image: ${url} (${contentType})`);
        }
      } else {
        console.log(`❌ MPMEC Manager: Image URL returned ${response.status}: ${url}`);
      }
    } catch (error) {
      console.log(`❌ MPMEC Manager: Error validating image URL: ${url}`, error);
    }
    
    this.imageValidationCache.set(url, false);
    return false;
  }

  // ✅ FIXED: Clear System Admin profile picture contamination
  clearSystemAdminContamination() {
    console.log('🧹 MPMEC Manager: Clearing any System Admin profile picture contamination...');
    
    // Clear System Admin localStorage keys
    const systemAdminKey = localStorage.getItem('profilePictureUrl');
    if (systemAdminKey && (systemAdminKey.includes('sys-admin') || systemAdminKey.includes('system-admin'))) {
      console.log('🗑️ MPMEC Manager: Removing System Admin profile picture from general localStorage');
      localStorage.removeItem('profilePictureUrl');
    }
    
    // Clear any MPMEC cache that might have System Admin pictures
    const mpmecCachedUrl = localStorage.getItem('mpmec_profile_picture');
    if (mpmecCachedUrl && (mpmecCachedUrl.includes('sys-admin') || mpmecCachedUrl.includes('system-admin'))) {
      console.log('🗑️ MPMEC Manager: Clearing System Admin profile picture from MPMEC cache');
      localStorage.removeItem('mpmec_profile_picture');
    }
  }

  startContinuousMonitoring() {
    console.log('🔍 MPMEC Manager: Starting continuous monitoring for profile picture integrity');
    
    // Monitor every 5 seconds (less aggressive)
    setInterval(() => {
      if (this.profilePictureUrl && this.shouldRunForCurrentUser()) {
        this.enforceProfilePictureIntegrity();
      }
    }, 5000);
  }

  enforceProfilePictureIntegrity() {
    const elements = [
      { selector: '#lgu-pmt-sidebar-profile-picture', name: 'sidebar' },
      { selector: '#lgu-pmt-topbar-profile-picture', name: 'topbar' },
      { selector: '#lgu-pmt-dropdown-photo', name: 'dropdown' }
    ];

    elements.forEach(({ selector, name }) => {
      const element = document.querySelector(selector);
      if (element) {
        // Check if element has wrong profile picture (System Admin or other users)
        if (element.src && 
            (element.src.includes('sys-admin') || 
             element.src.includes('system-admin') || 
             element.src.includes('SA-001') ||
             (element.src !== this.profilePictureUrl && element.src !== '' && !element.src.includes('data:')))) {
          
          console.log(`🚨 MPMEC Manager: Detected wrong profile picture in ${name}, correcting...`);
          console.log(`🚨 Wrong URL: ${element.src}`);
          console.log(`🚨 Correct URL: ${this.profilePictureUrl}`);
          
          // Force correct the profile picture
          this.updateSingleProfilePicture(element, name);
        }
      }
    });
  }

  async loadProfilePicture() {
    try {
      // ✅ FIXED: Double-check user is still MPMEC before proceeding
      if (!this.shouldRunForCurrentUser()) {
        console.log('❌ MPMEC Manager: User verification failed during load, stopping');
        return false;
      }
      
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        
        // ✅ FIXED: Use the actual user's email or userId for API call
        const employeeId = user.email || user.userId || user.username;
        
        console.log('🔍 Fetching MPMEC profile picture from server for user:', employeeId);
        // Determine API URL based on environment
        const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const API_URL = isProd 
          ? `${window.location.protocol}//${window.location.hostname}/api`
          : 'http://localhost:3000/api';
        const response = await fetch(`${API_URL}/profile/picture/${employeeId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 MPMEC API Response:', data);
          
          if (data.success && data.profilePictureUrl) {
            // ✅ FIXED: Validate the returned profile picture URL doesn't belong to System Admin
            if (data.profilePictureUrl.includes('sys-admin') || 
                data.profilePictureUrl.includes('system-admin') || 
                data.profilePictureUrl.includes('SA-001')) {
              console.log('❌ MPMEC Manager: API returned System Admin profile picture, rejecting');
              localStorage.removeItem('mpmec_profile_picture');
              this.profilePictureUrl = null;
              return false;
            }
            
            // ✅ NEW: Validate the image URL before using it
            const isValidImage = await this.validateImageUrl(data.profilePictureUrl);
            if (!isValidImage) {
              console.log('❌ MPMEC Manager: Profile picture URL validation failed');
              return false;
            }
            
            this.profilePictureUrl = data.profilePictureUrl;
            localStorage.setItem('mpmec_profile_picture', data.profilePictureUrl);
            console.log('✅ MPMEC Profile picture loaded and validated from server:', this.profilePictureUrl);
            
            // ✅ FIXED: Force immediate update of all components
            setTimeout(() => {
              this.updateAllProfilePictures();
            }, 100);
            return true;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to load from server, trying localStorage:', error);
    }

    // Fallback to localStorage with validation
    const storedUrl = localStorage.getItem('mpmec_profile_picture');
    if (storedUrl) {
      // ✅ FIXED: Validate stored URL doesn't belong to System Admin
      if (storedUrl.includes('sys-admin') || 
          storedUrl.includes('system-admin') || 
          storedUrl.includes('SA-001')) {
        console.log('❌ MPMEC Manager: Stored URL is System Admin profile picture, clearing');
        localStorage.removeItem('mpmec_profile_picture');
        this.profilePictureUrl = null;
        return false;
      }
      
      // ✅ NEW: Validate stored image URL
      const isValidImage = await this.validateImageUrl(storedUrl);
      if (!isValidImage) {
        console.log('❌ MPMEC Manager: Stored profile picture URL validation failed, clearing');
        localStorage.removeItem('mpmec_profile_picture');
        this.profilePictureUrl = null;
        return false;
      }
      
      this.profilePictureUrl = storedUrl;
      console.log('✅ MPMEC Profile picture loaded and validated from localStorage:', this.profilePictureUrl);
      
      // ✅ FIXED: Force immediate update of all components
      setTimeout(() => {
        this.updateAllProfilePictures();
      }, 100);
      return true;
    } else {
      console.log('⚠️ No MPMEC profile picture found in localStorage');
      return false;
    }
  }

  setupEventListeners() {
    // Listen for profile picture updates from any MPMEC module
    window.addEventListener('mpmecProfilePictureUpdated', (e) => {
      console.log('🌍 MPMEC Global Manager received mpmecProfilePictureUpdated event:', e.detail);
      if (e.detail.profilePictureUrl) {
        this.profilePictureUrl = e.detail.profilePictureUrl;
        localStorage.setItem('mpmec_profile_picture', this.profilePictureUrl);
        this.updateAllProfilePictures();
      }
    });

    // Listen for page visibility changes to refresh profile pictures
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.shouldRunForCurrentUser()) {
        console.log('🔄 Page became visible, refreshing MPMEC profile pictures...');
        setTimeout(() => {
          this.clearSystemAdminContamination();
          this.updateAllProfilePictures();
        }, 200);
      }
    });

    // Listen for navigation events
    window.addEventListener('popstate', () => {
      if (this.shouldRunForCurrentUser()) {
        console.log('🔄 Navigation detected, updating MPMEC profile pictures...');
        setTimeout(() => this.updateAllProfilePictures(), 200);
      }
    });
    
    // Periodic check for logout modal updates
    setInterval(() => {
      if (this.shouldRunForCurrentUser()) {
        this.checkAndUpdateLogoutModal();
      }
    }, 2000); // Check every 2 seconds
  }
  
  checkAndUpdateLogoutModal() {
    // Check if logout modal is visible and update it if needed
    const logoutModal = document.getElementById('logout-modal');
    if (logoutModal && !logoutModal.classList.contains('hidden')) {
      console.log('🔄 Logout modal is visible, checking profile picture...');
      this.updateLogoutModalProfilePicture();
    }
  }

  // ✅ NEW: Enhanced single profile picture update with better error handling
  async updateSingleProfilePicture(element, elementName) {
    if (!element || !this.profilePictureUrl) {
      console.log(`⚠️ MPMEC Manager: Cannot update ${elementName} - missing element or URL`);
      return;
    }

    try {
      console.log(`🎯 Updating MPMEC ${elementName} with:`, this.profilePictureUrl);
      
      // ✅ CRITICAL FIX: Hide fallback immediately and show loading state
      const fallbackDiv = element.nextElementSibling;
      if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
        fallbackDiv.style.display = 'none';
      }
      
      // ✅ NEW: Show loading state while processing
      element.style.display = 'none'; // Hide any existing content
      
      // ✅ CRITICAL FIX: Convert server URL to data URL to bypass CORS issues
      let imageUrl = this.profilePictureUrl;
      
      // If it's a localhost URL in development, convert to data URL to avoid CORS issues
      const isLocalhost = imageUrl.startsWith('http://localhost:3000/uploads/') || imageUrl.startsWith('http://127.0.0.1:3000/uploads/');
      if (isLocalhost && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.log(`🔄 MPMEC ${elementName}: Converting server URL to data URL to bypass CORS...`);
        try {
          const dataUrl = await this.convertToDataURL(imageUrl);
          if (dataUrl) {
            imageUrl = dataUrl;
            console.log(`✅ MPMEC ${elementName}: Successfully converted to data URL`);
          } else {
            console.log(`⚠️ MPMEC ${elementName}: Failed to convert to data URL, using original URL`);
          }
        } catch (conversionError) {
          console.log(`⚠️ MPMEC ${elementName}: Data URL conversion failed:`, conversionError);
        }
      }
      
      // Remove any existing error handlers
      element.onerror = null;
      element.onload = null;
      
      // Set up proper error and load handlers
      const handleError = () => {
        console.log(`⚠️ MPMEC ${elementName} failed to load, trying alternative methods...`);
        
        // Try converting to data URL as fallback (only in development)
        const isLocalhost = this.profilePictureUrl.startsWith('http://localhost:3000/uploads/') || this.profilePictureUrl.startsWith('http://127.0.0.1:3000/uploads/');
        if (isLocalhost && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          console.log(`🔄 MPMEC ${elementName}: Attempting data URL conversion as fallback...`);
          this.convertToDataURL(this.profilePictureUrl).then(dataUrl => {
            if (dataUrl) {
              console.log(`✅ MPMEC ${elementName}: Fallback data URL conversion successful`);
              element.src = dataUrl;
              element.style.display = 'block';
              if (fallbackDiv) {
                fallbackDiv.style.display = 'none';
              }
            } else {
              console.log(`❌ MPMEC ${elementName}: All methods failed, showing fallback`);
              element.style.display = 'none';
              if (fallbackDiv) {
                fallbackDiv.style.display = 'flex';
              }
            }
          }).catch(() => {
            console.log(`❌ MPMEC ${elementName}: Fallback conversion failed, showing letter fallback`);
            element.style.display = 'none';
            if (fallbackDiv) {
              fallbackDiv.style.display = 'flex';
            }
          });
        } else {
          // Show fallback for non-server URLs
          element.style.display = 'none';
          if (fallbackDiv) {
            fallbackDiv.style.display = 'flex';
          }
        }
        
        // Mark this URL as invalid in cache
        this.imageValidationCache.set(this.profilePictureUrl, false);
      };
      
      const handleLoad = () => {
        console.log(`✅ MPMEC ${elementName} loaded successfully - showing image immediately`);
        element.style.display = 'block';
        if (fallbackDiv) {
          fallbackDiv.style.display = 'none';
        }
        
        // Mark this URL as valid in cache
        this.imageValidationCache.set(this.profilePictureUrl, true);
      };
      
      element.onerror = handleError;
      element.onload = handleLoad;
      
      // ✅ CRITICAL: Set image source and wait for it to load before showing
      if (imageUrl.startsWith('data:')) {
        // For data URLs, we can show immediately since they don't need network loading
        element.src = imageUrl;
        // Data URLs load synchronously, so we can show immediately
        setTimeout(() => {
          element.style.display = 'block';
          if (fallbackDiv) {
            fallbackDiv.style.display = 'none';
          }
        }, 10); // Tiny delay to ensure DOM updates
      } else {
        // For regular URLs, set source but keep hidden until onload fires
        element.src = imageUrl;
      }
      
      console.log(`🔄 MPMEC ${elementName} source updated with ${imageUrl.startsWith('data:') ? 'data URL' : 'server URL'}`);
      
    } catch (error) {
      console.log(`❌ Error updating MPMEC ${elementName}:`, error);
      // Show fallback on any error
      element.style.display = 'none';
      const fallbackDiv = element.nextElementSibling;
      if (fallbackDiv && fallbackDiv.tagName === 'DIV') {
        fallbackDiv.style.display = 'flex';
      }
    }
  }

  async convertToDataURL(serverUrl) {
    try {
      console.log(`🔄 Converting server URL to data URL: ${serverUrl}`);
      
      // Use fetch with proper CORS handling
      const response = await fetch(serverUrl, { 
        mode: 'cors',
        credentials: 'same-origin',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        console.log(`✅ Successfully converted to data URL (${dataUrl.length} chars)`);
        return dataUrl;
      } else {
        console.log(`❌ Failed to fetch image: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`⚠️ Failed to convert server URL to data URL:`, error);
    }
    return null;
  }

  async updateProfilePictureElement(element, elementName) {
    return this.updateSingleProfilePicture(element, elementName);
  }

  updateAllProfilePictures() {
    // ✅ FIXED: Only update if user is still MPMEC
    if (!this.shouldRunForCurrentUser()) {
      console.log('❌ MPMEC Manager: User is no longer MPMEC, skipping update');
      return;
    }
    
    if (!this.profilePictureUrl) {
      console.log('⚠️ No MPMEC profile picture URL available for update');
      return;
    }

    console.log('🔄 MPMEC Manager: FORCEFULLY updating all profile pictures with MPMEC user\'s image...');
    console.log('🔄 MPMEC Manager: Using URL:', this.profilePictureUrl);
    
    // ✅ FIXED: Force update sidebar profile picture (override any existing image)
    const sidebarProfilePic = document.querySelector('#lgu-pmt-sidebar-profile-picture');
    if (sidebarProfilePic) {
      console.log('🎯 MPMEC Manager: Force updating sidebar profile picture');
      this.updateSingleProfilePicture(sidebarProfilePic, 'sidebar');
    } else {
      console.log('❌ MPMEC Manager: Sidebar profile picture element not found');
    }
    
    // ✅ FIXED: Force update topbar profile picture (override any existing image)
    const topbarProfilePic = document.querySelector('#lgu-pmt-topbar-profile-picture');
    if (topbarProfilePic) {
      console.log('🎯 MPMEC Manager: Force updating topbar profile picture');
      this.updateSingleProfilePicture(topbarProfilePic, 'topbar');
    } else {
      console.log('❌ MPMEC Manager: Topbar profile picture element not found');
    }
    
    // ✅ FIXED: Force update dropdown profile picture (override any existing image)
    const dropdownProfilePic = document.querySelector('#lgu-pmt-dropdown-photo');
    if (dropdownProfilePic) {
      console.log('🎯 MPMEC Manager: Force updating dropdown profile picture');
      this.updateSingleProfilePicture(dropdownProfilePic, 'dropdown');
    } else {
      console.log('❌ MPMEC Manager: Dropdown profile picture element not found');
    }
    
    // Update logout modal profile picture
    this.updateLogoutModalProfilePicture();
    
    console.log('🎉 MPMEC Manager: All profile pictures forcefully updated with MPMEC user\'s image');
  }
  
  updateLogoutModalProfilePicture() {
    // Update the logout modal profile picture if it exists
    const logoutProfilePic = document.getElementById('logoutProfilePicture');
    if (logoutProfilePic && this.profilePictureUrl) {
      console.log('🎯 Updating logout modal profile picture with MPMEC image');
      this.updateSingleProfilePicture(logoutProfilePic, 'logout modal');
    } else {
      console.log('🔍 Logout modal profile picture element not found or no URL available');
    }
  }

  // Public method to force refresh
  forceRefresh() {
    if (this.shouldRunForCurrentUser()) {
      console.log('🔄 Force refreshing all MPMEC profile pictures...');
      this.clearSystemAdminContamination();
      this.loadProfilePictureWithRetry();
    }
  }

  // Public method to set new profile picture
  setProfilePicture(url) {
    if (this.shouldRunForCurrentUser()) {
      console.log('🔄 Setting new MPMEC profile picture globally:', url);
      this.profilePictureUrl = url;
      localStorage.setItem('mpmec_profile_picture', url);
      this.updateAllProfilePictures();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('mpmecProfilePictureUpdated', {
        detail: { profilePictureUrl: url }
      }));
    }
  }
  
  // Public method to update logout modal specifically
  updateLogoutModal() {
    if (this.shouldRunForCurrentUser()) {
      console.log('🎯 Force updating logout modal profile picture...');
      this.updateLogoutModalProfilePicture();
    }
  }

  // ✅ NEW: Public method to get current profile picture status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      profilePictureUrl: this.profilePictureUrl,
      shouldRun: this.shouldRunForCurrentUser(),
      validationCacheSize: this.imageValidationCache.size
    };
  }
}

// ✅ FIXED: Clear any System Admin profile picture from MPMEC cache immediately
console.log('⚡ MPMEC: Initializing profile picture system...');

// Immediately check and clear System Admin profile pictures from MPMEC cache
const currentCachedUrl = localStorage.getItem('mpmec_profile_picture');
if (currentCachedUrl && (currentCachedUrl.includes('sys-admin') || currentCachedUrl.includes('system-admin') || currentCachedUrl.includes('SA-001'))) {
  console.log('🗑️ MPMEC: Clearing System Admin profile picture from MPMEC cache:', currentCachedUrl);
  localStorage.removeItem('mpmec_profile_picture');
}

// ✅ FIXED: Immediate MPMEC Profile Picture Manager initialization for better UX
// Initialize the global manager immediately for faster profile picture loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting MPMEC Profile Picture Manager immediately after DOM ready...');
    window.mpmecProfilePictureManager = new MPMECProfilePictureManager();
  });
} else {
  // If DOM is already loaded, start immediately
  console.log('🚀 Starting MPMEC Profile Picture Manager immediately...');
  window.mpmecProfilePictureManager = new MPMECProfilePictureManager();
}

// ✅ NEW: Global function for debugging
window.getMPMECProfileStatus = () => {
  if (window.mpmecProfilePictureManager) {
    return window.mpmecProfilePictureManager.getStatus();
  }
  return { error: 'Manager not initialized' };
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MPMECProfilePictureManager;
}

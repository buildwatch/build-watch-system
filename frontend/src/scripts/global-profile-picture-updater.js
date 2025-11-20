// Global Profile Picture Update Utility
// This script listens for profile picture updates and updates all components in real-time

(function() {
  'use strict';

  console.log('🔧 Global Profile Picture Updater initialized');

  /**
   * Update profile picture in sidebar
   */
  function updateSidebarProfilePicture(userId, profilePictureUrl, role) {
    try {
      // Map role to sidebar profile picture element IDs
      const sidebarElementIds = {
        'LGU-IU': 'iu-sidebar-profile-picture',
        'LGU-PMT': 'lgu-pmt-sidebar-profile-picture',
        'MPMEC Secretariat': 'secretariat-sidebar-profile-picture',
        'EIU': 'eiu-sidebar-profile-picture',
        'SYS.AD': 'sidebar-profile-picture',
        'Executive Viewer': 'executive-sidebar-profile-picture'
      };

      const elementId = sidebarElementIds[role];
      if (!elementId) return;

      const sidebarImg = document.getElementById(elementId);
      if (sidebarImg) {
        // Preload image to prevent blinking
        const img = new Image();
        img.onload = function() {
          sidebarImg.src = profilePictureUrl;
          sidebarImg.style.display = 'block';
          
          // Hide fallback if it exists
          const fallback = sidebarImg.nextElementSibling;
          if (fallback && fallback.tagName === 'DIV') {
            fallback.style.display = 'none';
          }
          
          console.log(`✅ Sidebar profile picture updated for ${role}`);
        };
        img.onerror = function() {
          console.log(`⚠️ Failed to load sidebar profile picture for ${role}`);
        };
        img.src = profilePictureUrl;
      }
    } catch (error) {
      console.error('Error updating sidebar profile picture:', error);
    }
  }

  /**
   * Update profile picture in topbar
   */
  function updateTopbarProfilePicture(userId, profilePictureUrl, role) {
    try {
      // Map role to topbar profile picture element IDs
      const topbarElementIds = {
        'LGU-IU': 'iu-topbar-profile-picture',
        'LGU-PMT': 'lgu-pmt-topbar-profile-picture',
        'MPMEC Secretariat': 'secretariat-topbar-profile-picture',
        'EIU': 'eiu-topbar-profile-picture',
        'SYS.AD': 'sysadmin-topbar-profile-picture',
        'Executive Viewer': 'executive-topbar-profile-picture'
      };

      const elementId = topbarElementIds[role];
      if (!elementId) {
        // Try generic selectors
        const genericSelectors = [
          '[id*="topbar-profile-picture"]',
          '[id*="topbar-profile"]',
          '.topbar-profile-picture img',
          '.profile-picture img'
        ];
        
        let topbarImg = null;
        for (const selector of genericSelectors) {
          topbarImg = document.querySelector(selector);
          if (topbarImg) break;
        }
        
        if (topbarImg) {
          const img = new Image();
          img.onload = function() {
            topbarImg.src = profilePictureUrl;
            topbarImg.style.display = 'block';
            const fallback = topbarImg.nextElementSibling;
            if (fallback && fallback.tagName === 'DIV') {
              fallback.style.display = 'none';
            }
            console.log(`✅ Topbar profile picture updated (generic)`);
          };
          img.src = profilePictureUrl;
        }
        return;
      }

      const topbarImg = document.getElementById(elementId);
      if (topbarImg) {
        const img = new Image();
        img.onload = function() {
          topbarImg.src = profilePictureUrl;
          topbarImg.style.display = 'block';
          const fallback = topbarImg.nextElementSibling;
          if (fallback && fallback.tagName === 'DIV') {
            fallback.style.display = 'none';
          }
          console.log(`✅ Topbar profile picture updated for ${role}`);
        };
        img.src = profilePictureUrl;
      }
    } catch (error) {
      console.error('Error updating topbar profile picture:', error);
    }
  }

  /**
   * Update profile picture in logout modal
   */
  function updateLogoutModalProfilePicture(userId, profilePictureUrl) {
    try {
      const logoutImg = document.getElementById('logoutProfilePicture');
      if (logoutImg) {
        const img = new Image();
        img.onload = function() {
          logoutImg.src = profilePictureUrl;
          logoutImg.style.display = 'block';
          
          const fallback = document.getElementById('logoutProfileFallback');
          if (fallback) {
            fallback.style.display = 'none';
          }
          
          console.log('✅ Logout modal profile picture updated');
        };
        img.onerror = function() {
          console.log('⚠️ Failed to load logout modal profile picture');
        };
        img.src = profilePictureUrl;
      }
    } catch (error) {
      console.error('Error updating logout modal profile picture:', error);
    }
  }

  /**
   * Update profile picture in user management table
   */
  function updateUserManagementTableProfilePicture(userId, profilePictureUrl) {
    try {
      // Find the profile picture image in the user management table
      const profileImg = document.getElementById(`profile-img-${userId}`);
      if (profileImg) {
        const img = new Image();
        img.onload = function() {
          profileImg.src = profilePictureUrl;
          profileImg.style.display = 'block';
          
          // Hide fallback
          const fallback = profileImg.nextElementSibling;
          if (fallback && fallback.classList.contains('profile-picture-fallback')) {
            fallback.style.display = 'none';
          }
          
          console.log(`✅ User management table profile picture updated for ${userId}`);
        };
        img.onerror = function() {
          console.log(`⚠️ Failed to load user management table profile picture for ${userId}`);
        };
        img.src = profilePictureUrl;
      }
      
      // Also update history profile pictures if they exist
      const historyImg = document.getElementById(`history-profile-img-${userId}`);
      if (historyImg) {
        const img = new Image();
        img.onload = function() {
          historyImg.src = profilePictureUrl;
          historyImg.style.display = 'block';
          
          const fallback = historyImg.nextElementSibling;
          if (fallback && fallback.classList.contains('profile-picture-fallback')) {
            fallback.style.display = 'none';
          }
          
          console.log(`✅ History profile picture updated for ${userId}`);
        };
        img.src = profilePictureUrl;
      }
    } catch (error) {
      console.error('Error updating user management table profile picture:', error);
    }
  }

  /**
   * Main event listener for profile picture updates
   */
  window.addEventListener('profilePictureUpdated', function(event) {
    const { profilePictureUrl, userId, userData } = event.detail;
    
    if (!profilePictureUrl || !userId) {
      console.warn('⚠️ Invalid profile picture update event data');
      return;
    }

    console.log('🔄 Profile picture update event received:', { userId, profilePictureUrl });

    const role = userData?.role || 'LGU-IU';

    // Update all components
    updateSidebarProfilePicture(userId, profilePictureUrl, role);
    updateTopbarProfilePicture(userId, profilePictureUrl, role);
    updateLogoutModalProfilePicture(userId, profilePictureUrl);
    updateUserManagementTableProfilePicture(userId, profilePictureUrl);

    // Also trigger a custom event for any other components that might be listening
    window.dispatchEvent(new CustomEvent('profilePictureRefresh', {
      detail: { userId, profilePictureUrl, userData }
    }));
  });

  console.log('✅ Global Profile Picture Updater ready');
})();


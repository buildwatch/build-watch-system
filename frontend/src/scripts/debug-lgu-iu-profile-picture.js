// Comprehensive Debugging Script for LGU-IU Profile Picture Issues
// Run this in the browser console to diagnose profile picture synchronization problems

(function() {
  'use strict';
  
  console.log('🔍 ========================================');
  console.log('🔍 LGU-IU Profile Picture Debugging Tool');
  console.log('🔍 ========================================');
  
  const debug = {
    // Check localStorage values
    checkLocalStorage() {
      console.log('\n📦 LOCALSTORAGE CHECK:');
      const iuProfile = localStorage.getItem('iu_profile_picture');
      const lguIuProfile = localStorage.getItem('lgu_iu_profile_picture');
      const userData = localStorage.getItem('user');
      
      console.log('  ✅ iu_profile_picture:', iuProfile ? `✅ Found (${iuProfile.substring(0, 50)}...)` : '❌ Not found');
      console.log('  ✅ lgu_iu_profile_picture:', lguIuProfile ? `✅ Found (${lguIuProfile.substring(0, 50)}...)` : '❌ Not found');
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('  ✅ user data:', {
            role: user.role,
            employeeId: user.employeeId,
            userId: user.userId,
            username: user.username,
            profilePictureUrl: user.profilePictureUrl
          });
        } catch (e) {
          console.log('  ❌ Error parsing user data:', e);
        }
      } else {
        console.log('  ❌ No user data in localStorage');
      }
      
      // Check for mismatches
      if (iuProfile && lguIuProfile && iuProfile !== lguIuProfile) {
        console.log('  ⚠️ WARNING: localStorage keys have different values!');
      }
    },
    
    // Check DOM elements
    checkDOMElements() {
      console.log('\n🎯 DOM ELEMENTS CHECK:');
      
      const elements = {
        'Sidebar': document.getElementById('iu-sidebar-profile-picture'),
        'Topbar': document.getElementById('iu-profile-picture'),
        'Dropdown': document.getElementById('iu-dropdown-photo'),
        'Logout Modal': document.getElementById('logoutProfilePicture')
      };
      
      Object.entries(elements).forEach(([name, element]) => {
        if (element) {
          console.log(`  ✅ ${name}:`, {
            found: true,
            id: element.id,
            src: element.src ? element.src.substring(0, 50) + '...' : 'empty',
            display: window.getComputedStyle(element).display,
            visible: element.offsetParent !== null
          });
        } else {
          console.log(`  ❌ ${name}: NOT FOUND`);
        }
      });
    },
    
    // Check Profile Picture Manager
    checkProfilePictureManager() {
      console.log('\n🔧 PROFILE PICTURE MANAGER CHECK:');
      
      if (window.lguIuProfilePictureManager) {
        const manager = window.lguIuProfilePictureManager;
        console.log('  ✅ Manager exists:', {
          initialized: manager.isInitialized,
          profilePictureUrl: manager.profilePictureUrl ? manager.profilePictureUrl.substring(0, 50) + '...' : 'null',
          hasSetProfilePicture: typeof manager.setProfilePicture === 'function',
          hasUpdateAll: typeof manager.updateAllProfilePictures === 'function'
        });
      } else {
        console.log('  ❌ Profile Picture Manager NOT FOUND');
      }
    },
    
    // Check event listeners
    checkEventListeners() {
      console.log('\n📡 EVENT LISTENERS CHECK:');
      
      // Check if events are being dispatched
      let eventCount = 0;
      const testHandler = () => {
        eventCount++;
        console.log('  ✅ Event received!');
      };
      
      window.addEventListener('iuProfilePictureUpdated', testHandler, { once: true });
      window.addEventListener('lguIuProfilePictureUpdated', testHandler, { once: true });
      
      // Try to trigger a test event
      setTimeout(() => {
        if (eventCount === 0) {
          console.log('  ⚠️ No events received (this is normal if no update happened)');
        }
      }, 1000);
      
      console.log('  ℹ️ Listening for iuProfilePictureUpdated and lguIuProfilePictureUpdated events');
    },
    
    // Check API/Server state
    async checkServerState() {
      console.log('\n🌐 SERVER STATE CHECK:');
      
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          console.log('  ❌ No user data to check server state');
          return;
        }
        
        const user = JSON.parse(userData);
        const employeeId = user.employeeId || user.username || user.id || user.userId;
        
        if (!employeeId) {
          console.log('  ❌ No employeeId found');
          return;
        }
        
        console.log(`  🔍 Fetching profile picture for: ${employeeId}`);
        const response = await fetch(`http://localhost:3000/api/profile/picture/${employeeId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('  ✅ Server response:', {
            success: data.success,
            profilePictureUrl: data.profilePictureUrl ? data.profilePictureUrl.substring(0, 50) + '...' : 'null'
          });
          
          // Compare with localStorage
          const localUrl = localStorage.getItem('iu_profile_picture');
          if (localUrl && data.profilePictureUrl && localUrl !== data.profilePictureUrl) {
            console.log('  ⚠️ WARNING: Server and localStorage have different URLs!');
          }
        } else {
          console.log('  ❌ Server request failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.log('  ❌ Error checking server state:', error);
      }
    },
    
    // Test profile picture update
    async testProfilePictureUpdate() {
      console.log('\n🧪 TEST PROFILE PICTURE UPDATE:');
      
      if (!window.lguIuProfilePictureManager) {
        console.log('  ❌ Profile Picture Manager not available');
        return;
      }
      
      const testUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23FF0000"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" dy=".3em" fill="white"%3ETEST%3C/text%3E%3C/svg%3E';
      
      console.log('  🔄 Setting test profile picture...');
      window.lguIuProfilePictureManager.setProfilePicture(testUrl);
      
      setTimeout(() => {
        console.log('  ✅ Test update completed. Check if all profile pictures updated.');
        console.log('  ℹ️ If they did, the manager is working. If not, check the DOM elements.');
      }, 500);
    },
    
    // Force refresh all profile pictures
    forceRefresh() {
      console.log('\n🔄 FORCE REFRESH:');
      
      if (window.lguIuProfilePictureManager) {
        console.log('  🔄 Calling forceRefresh()...');
        window.lguIuProfilePictureManager.forceRefresh();
        console.log('  ✅ Force refresh completed');
      } else {
        console.log('  ❌ Profile Picture Manager not available');
      }
    },
    
    // Run all checks
    async runAll() {
      this.checkLocalStorage();
      this.checkDOMElements();
      this.checkProfilePictureManager();
      this.checkEventListeners();
      await this.checkServerState();
      
      console.log('\n✅ ========================================');
      console.log('✅ All checks completed!');
      console.log('✅ ========================================');
      console.log('\n💡 TIPS:');
      console.log('  - If localStorage has values but DOM elements are empty, the manager might not be updating');
      console.log('  - If server has different URL than localStorage, there might be a sync issue');
      console.log('  - Run debug.testProfilePictureUpdate() to test if the manager works');
      console.log('  - Run debug.forceRefresh() to force update all profile pictures');
    }
  };
  
  // Make debug available globally
  window.debugLguIuProfilePicture = debug;
  
  // Auto-run all checks
  debug.runAll();
  
  console.log('\n💡 Available commands:');
  console.log('  - debugLguIuProfilePicture.runAll() - Run all checks');
  console.log('  - debugLguIuProfilePicture.checkLocalStorage() - Check localStorage');
  console.log('  - debugLguIuProfilePicture.checkDOMElements() - Check DOM elements');
  console.log('  - debugLguIuProfilePicture.checkProfilePictureManager() - Check manager');
  console.log('  - debugLguIuProfilePicture.checkServerState() - Check server state');
  console.log('  - debugLguIuProfilePicture.testProfilePictureUpdate() - Test update');
  console.log('  - debugLguIuProfilePicture.forceRefresh() - Force refresh');
  
})();


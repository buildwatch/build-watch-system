// Comprehensive Debugging Script for EIU Profile Picture Issues
// Run this in the browser console to diagnose profile picture synchronization problems

(function() {
  'use strict';
  
  console.log('🔍 ========================================');
  console.log('🔍 EIU Profile Picture Debugging Tool');
  console.log('🔍 ========================================');
  
  const debug = {
    // Check localStorage values
    checkLocalStorage() {
      console.log('\n📦 LOCALSTORAGE CHECK:');
      const eiuProfile = localStorage.getItem('eiu_profile_picture');
      const userData = localStorage.getItem('user');
      
      console.log('  ✅ eiu_profile_picture:', eiuProfile ? `✅ Found (${eiuProfile.substring(0, 50)}...)` : '❌ Not found');
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('  ✅ user data:', {
            role: user.role,
            userId: user.userId,
            id: user.id,
            employeeId: user.employeeId,
            username: user.username,
            email: user.email,
            profilePictureUrl: user.profilePictureUrl ? user.profilePictureUrl.substring(0, 50) + '...' : 'null'
          });
          
          // Check for mismatches
          if (eiuProfile && user.profilePictureUrl && eiuProfile !== user.profilePictureUrl) {
            console.log('  ⚠️ WARNING: localStorage and user.profilePictureUrl have different values!');
            console.log('    eiu_profile_picture:', eiuProfile.substring(0, 50) + '...');
            console.log('    user.profilePictureUrl:', user.profilePictureUrl.substring(0, 50) + '...');
          }
        } catch (e) {
          console.log('  ❌ Error parsing user data:', e);
        }
      } else {
        console.log('  ❌ No user data in localStorage');
      }
    },
    
    // Check DOM elements
    checkDOMElements() {
      console.log('\n🎯 DOM ELEMENTS CHECK:');
      const elements = {
        'Sidebar': document.getElementById('eiu-sidebar-profile-picture'),
        'Topbar': document.getElementById('eiu-profile-picture'),
        'Dropdown': document.getElementById('eiu-dropdown-photo'),
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
      if (window.eiuProfilePictureManager) {
        const manager = window.eiuProfilePictureManager;
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
      console.log('  ℹ️ Listening for eiuProfilePictureUpdated events');
      
      // Check if events are being dispatched
      let eventCount = 0;
      const testHandler = () => {
        eventCount++;
        console.log('  ✅ Event received!');
      };
      
      window.addEventListener('eiuProfilePictureUpdated', testHandler, { once: true });
      
      // Try to trigger a test event
      setTimeout(() => {
        if (eventCount === 0) {
          console.log('  ⚠️ No events received (this is normal if no update happened)');
        }
      }, 1000);
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
        const userId = user.userId || user.id || user.employeeId || user.username || 'EIU-0001';
        
        console.log(`  🔍 Fetching profile picture for userId: ${userId}`);
        const response = await fetch(`http://localhost:3000/api/profile/picture/${encodeURIComponent(userId)}?t=${Date.now()}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('  ✅ Server response:', {
            success: data.success,
            profilePictureUrl: data.profilePictureUrl ? data.profilePictureUrl.substring(0, 50) + '...' : 'null'
          });
          
          // Compare with localStorage
          const localUrl = localStorage.getItem('eiu_profile_picture');
          const userUrl = user.profilePictureUrl;
          
          if (localUrl && data.profilePictureUrl && localUrl !== data.profilePictureUrl) {
            console.log('  ⚠️ WARNING: Server and localStorage have different URLs!');
            console.log('    localStorage:', localUrl.substring(0, 50) + '...');
            console.log('    Server:', data.profilePictureUrl.substring(0, 50) + '...');
          }
          
          if (userUrl && data.profilePictureUrl && userUrl !== data.profilePictureUrl) {
            console.log('  ⚠️ WARNING: Server and user.profilePictureUrl have different URLs!');
            console.log('    user.profilePictureUrl:', userUrl.substring(0, 50) + '...');
            console.log('    Server:', data.profilePictureUrl.substring(0, 50) + '...');
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
      if (!window.eiuProfilePictureManager) {
        console.log('  ❌ Profile Picture Manager not available');
        return;
      }
      
      const testUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%2300FF00"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" dy=".3em" fill="white"%3ETEST%3C/text%3E%3C/svg%3E';
      
      console.log('  🔄 Setting test profile picture...');
      window.eiuProfilePictureManager.setProfilePicture(testUrl);
      
      setTimeout(() => {
        console.log('  ✅ Test update completed. Check if all profile pictures updated.');
        console.log('  ℹ️ If they did, the manager is working. If not, check the DOM elements.');
      }, 500);
    },
    
    // Force refresh
    forceRefresh() {
      console.log('\n🔄 FORCE REFRESH:');
      if (window.eiuProfilePictureManager) {
        console.log('  🔄 Calling forceRefresh()...');
        window.eiuProfilePictureManager.forceRefresh();
        console.log('  ✅ Force refresh completed');
      } else {
        console.log('  ❌ Profile Picture Manager not available');
      }
    },
    
    // Sync localStorage with user data
    syncLocalStorage() {
      console.log('\n🔄 SYNCING LOCALSTORAGE:');
      const userData = localStorage.getItem('user');
      if (!userData) {
        console.log('  ❌ No user data found');
        return;
      }
      
      try {
        const user = JSON.parse(userData);
        if (user.profilePictureUrl && user.profilePictureUrl.startsWith('http')) {
          console.log('  ✅ Found user.profilePictureUrl:', user.profilePictureUrl.substring(0, 50) + '...');
          localStorage.setItem('eiu_profile_picture', user.profilePictureUrl);
          console.log('  ✅ Synced eiu_profile_picture with user.profilePictureUrl');
          
          if (window.eiuProfilePictureManager) {
            window.eiuProfilePictureManager.profilePictureUrl = user.profilePictureUrl;
            window.eiuProfilePictureManager.updateAllProfilePictures();
            console.log('  ✅ Updated Profile Picture Manager and refreshed all pictures');
          }
        } else {
          console.log('  ⚠️ No valid user.profilePictureUrl found');
        }
      } catch (error) {
        console.log('  ❌ Error syncing:', error);
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
      console.log('  - Run debug.syncLocalStorage() to sync localStorage with user.profilePictureUrl');
    }
  };
  
  // Make debug available globally
  window.debugEIUProfilePicture = debug;
  
  // Auto-run all checks
  debug.runAll();
  
  console.log('\n💡 Available commands:');
  console.log('  - debugEIUProfilePicture.runAll() - Run all checks');
  console.log('  - debugEIUProfilePicture.checkLocalStorage() - Check localStorage');
  console.log('  - debugEIUProfilePicture.checkDOMElements() - Check DOM elements');
  console.log('  - debugEIUProfilePicture.checkProfilePictureManager() - Check manager');
  console.log('  - debugEIUProfilePicture.checkServerState() - Check server state');
  console.log('  - debugEIUProfilePicture.testProfilePictureUpdate() - Test update');
  console.log('  - debugEIUProfilePicture.forceRefresh() - Force refresh');
  console.log('  - debugEIUProfilePicture.syncLocalStorage() - Sync localStorage with user data');
})();


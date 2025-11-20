// Comprehensive Debugging Script for MPMEC Secretariat Logout Modal Profile Picture
// Run this in the browser console to diagnose profile picture synchronization problems

(function() {
  'use strict';
  
  console.log('🔍 ========================================');
  console.log('🔍 MPMEC Secretariat Logout Modal Debugging Tool');
  console.log('🔍 ========================================');
  
  const debug = {
    // Check current user data
    checkCurrentUser() {
      console.log('\n👤 CURRENT USER DATA:');
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('  ✅ User data found:', {
            role: user.role,
            subRole: user.subRole,
            userId: user.userId,
            id: user.id,
            employeeId: user.employeeId,
            username: user.username,
            email: user.email,
            profilePictureUrl: user.profilePictureUrl ? user.profilePictureUrl.substring(0, 50) + '...' : 'null'
          });
          
          // Check if user is Secretariat
          const isSecretariat = user.role === 'MPMEC Secretariat' || 
                               user.role === 'Secretariat' || 
                               user.role === 'secretariat' ||
                               (user.role === 'LGU-PMT' && user.subRole && 
                                (user.subRole.toLowerCase() === 'mpmec secretariat' || 
                                 user.subRole.toLowerCase() === 'secretariat'));
          
          console.log('  🔍 Is Secretariat?', isSecretariat);
          if (!isSecretariat) {
            console.log('  ⚠️ WARNING: Current user does not appear to be Secretariat!');
            console.log('    This might explain why the logout modal is not updating.');
          }
          
          return user;
        } catch (e) {
          console.log('  ❌ Error parsing user data:', e);
          return null;
        }
      } else {
        console.log('  ❌ No user data in localStorage');
        return null;
      }
    },
    
    // Check localStorage values
    checkLocalStorage() {
      console.log('\n📦 LOCALSTORAGE CHECK:');
      const secretariatProfile = localStorage.getItem('secretariat_profile_picture');
      const mpmecProfile = localStorage.getItem('mpmec_profile_picture');
      const lguPmtProfile = localStorage.getItem('lgu_pmt_profile_picture');
      const userData = localStorage.getItem('user');
      
      console.log('  ✅ secretariat_profile_picture:', secretariatProfile ? `✅ Found (${secretariatProfile.substring(0, 50)}...)` : '❌ Not found');
      console.log('  ✅ mpmec_profile_picture:', mpmecProfile ? `✅ Found (${mpmecProfile.substring(0, 50)}...)` : '❌ Not found');
      console.log('  ✅ lgu_pmt_profile_picture:', lguPmtProfile ? `✅ Found (${lguPmtProfile.substring(0, 50)}...)` : '❌ Not found');
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('  ✅ user.profilePictureUrl:', user.profilePictureUrl ? user.profilePictureUrl.substring(0, 50) + '...' : 'null');
          
          // Check for mismatches
          if (secretariatProfile && user.profilePictureUrl && secretariatProfile !== user.profilePictureUrl) {
            console.log('  ⚠️ WARNING: secretariat_profile_picture and user.profilePictureUrl have different values!');
          }
        } catch (e) {
          console.log('  ❌ Error parsing user data:', e);
        }
      }
    },
    
    // Check logout modal DOM elements
    checkLogoutModal() {
      console.log('\n🎯 LOGOUT MODAL DOM ELEMENTS CHECK:');
      const modal = document.getElementById('logout-modal');
      const profilePicture = document.getElementById('logoutProfilePicture');
      const profileFallback = document.getElementById('logoutProfileFallback');
      
      console.log('  Modal element:', modal ? '✅ Found' : '❌ Not found');
      console.log('  Profile picture element:', profilePicture ? '✅ Found' : '❌ Not found');
      console.log('  Profile fallback element:', profileFallback ? '✅ Found' : '❌ Not found');
      
      if (profilePicture) {
        console.log('  Current profile picture src:', profilePicture.src ? profilePicture.src.substring(0, 50) + '...' : 'empty');
        console.log('  Profile picture display:', window.getComputedStyle(profilePicture).display);
        console.log('  Profile picture visible:', profilePicture.offsetParent !== null);
      }
      
      if (profileFallback) {
        console.log('  Fallback display:', window.getComputedStyle(profileFallback).display);
        console.log('  Fallback visible:', profileFallback.offsetParent !== null);
      }
      
      // Check if modal is visible
      if (modal) {
        const isVisible = !modal.classList.contains('hidden') && modal.style.display !== 'none';
        console.log('  Modal visible:', isVisible);
      }
      
      return { modal, profilePicture, profileFallback };
    },
    
    // Check Profile Picture Manager
    checkProfilePictureManager() {
      console.log('\n🔧 PROFILE PICTURE MANAGER CHECK:');
      if (window.secretariatProfilePictureManager) {
        const manager = window.secretariatProfilePictureManager;
        console.log('  ✅ Manager exists:', {
          initialized: manager.isInitialized,
          profilePictureUrl: manager.profilePictureUrl ? manager.profilePictureUrl.substring(0, 50) + '...' : 'null',
          hasSetProfilePicture: typeof manager.setProfilePicture === 'function',
          hasUpdateAll: typeof manager.updateAllProfilePictures === 'function'
        });
      } else {
        console.log('  ❌ Secretariat Profile Picture Manager NOT FOUND');
      }
    },
    
    // Check event listeners
    checkEventListeners() {
      console.log('\n📡 EVENT LISTENERS CHECK:');
      console.log('  ℹ️ Checking if secretariatProfilePictureUpdated event is being listened to...');
      
      // Check if LogoutModal instance exists
      if (window.logoutModal) {
        console.log('  ✅ LogoutModal instance found');
      } else {
        console.log('  ⚠️ LogoutModal instance not found in window object');
      }
      
      // Try to find the event listener
      let eventReceived = false;
      const testHandler = (e) => {
        eventReceived = true;
        console.log('  ✅ secretariatProfilePictureUpdated event received!', e.detail);
      };
      
      window.addEventListener('secretariatProfilePictureUpdated', testHandler, { once: true });
      
      // Dispatch a test event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('secretariatProfilePictureUpdated', {
          detail: { profilePictureUrl: 'test-url' }
        }));
        
        setTimeout(() => {
          if (eventReceived) {
            console.log('  ✅ Event listener is working');
          } else {
            console.log('  ⚠️ Event listener might not be set up correctly');
          }
        }, 100);
      }, 100);
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
        const userId = user.userId || user.id || user.employeeId || user.username || 'LGU-PMT-0001';
        
        console.log(`  🔍 Fetching profile picture for userId: ${userId}`);
        const response = await fetch(`http://localhost:3000/api/profile/picture/${encodeURIComponent(userId)}?t=${Date.now()}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('  ✅ Server response:', {
            success: data.success,
            profilePictureUrl: data.profilePictureUrl ? data.profilePictureUrl.substring(0, 50) + '...' : 'null'
          });
          
          // Compare with localStorage
          const localUrl = localStorage.getItem('secretariat_profile_picture');
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
          
          return data.profilePictureUrl;
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
      const user = this.checkCurrentUser();
      if (!user) {
        console.log('  ❌ No user data found');
        return;
      }
      
      const testUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%2300FF00"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" dy=".3em" fill="white"%3ETEST%3C/text%3E%3C/svg%3E';
      
      console.log('  🔄 Dispatching test secretariatProfilePictureUpdated event...');
      window.dispatchEvent(new CustomEvent('secretariatProfilePictureUpdated', {
        detail: { 
          profilePictureUrl: testUrl,
          userId: user.userId || user.id,
          userData: user
        }
      }));
      
      setTimeout(() => {
        const profilePicture = document.getElementById('logoutProfilePicture');
        if (profilePicture && profilePicture.src === testUrl) {
          console.log('  ✅ Test update successful! Profile picture updated in logout modal.');
        } else {
          console.log('  ❌ Test update failed! Profile picture not updated in logout modal.');
          console.log('    Current src:', profilePicture ? profilePicture.src : 'element not found');
        }
      }, 500);
    },
    
    // Force update logout modal
    forceUpdateLogoutModal() {
      console.log('\n🔄 FORCE UPDATE LOGOUT MODAL:');
      const user = this.checkCurrentUser();
      if (!user) {
        console.log('  ❌ No user data found');
        return;
      }
      
      const profileUrl = localStorage.getItem('secretariat_profile_picture') || 
                        localStorage.getItem('mpmec_profile_picture') || 
                        localStorage.getItem('lgu_pmt_profile_picture') ||
                        user.profilePictureUrl;
      
      if (!profileUrl) {
        console.log('  ❌ No profile picture URL found');
        return;
      }
      
      console.log('  🔄 Forcing update with URL:', profileUrl.substring(0, 50) + '...');
      
      if (window.logoutModal && typeof window.logoutModal.updateProfilePicture === 'function') {
        window.logoutModal.updateProfilePicture(profileUrl);
        console.log('  ✅ Called logoutModal.updateProfilePicture()');
      } else {
        // Direct DOM update
        const profilePicture = document.getElementById('logoutProfilePicture');
        const profileFallback = document.getElementById('logoutProfileFallback');
        
        if (profilePicture) {
          if (profileFallback) {
            profileFallback.style.display = 'none';
          }
          
          const img = new Image();
          img.onload = function() {
            profilePicture.src = profileUrl;
            profilePicture.style.display = 'block';
            console.log('  ✅ Profile picture updated directly in DOM');
          };
          img.onerror = function() {
            console.log('  ❌ Failed to load profile picture');
          };
          img.src = profileUrl;
        } else {
          console.log('  ❌ Profile picture element not found');
        }
      }
    },
    
    // Check role detection
    checkRoleDetection() {
      console.log('\n🔍 ROLE DETECTION CHECK:');
      const user = this.checkCurrentUser();
      if (!user) {
        console.log('  ❌ No user data found');
        return;
      }
      
      const roleChecks = [
        { name: 'user.role === "MPMEC Secretariat"', result: user.role === 'MPMEC Secretariat' },
        { name: 'user.role === "Secretariat"', result: user.role === 'Secretariat' },
        { name: 'user.role === "secretariat"', result: user.role === 'secretariat' },
        { name: 'LGU-PMT with subRole "mpmec secretariat"', result: user.role === 'LGU-PMT' && user.subRole && user.subRole.toLowerCase() === 'mpmec secretariat' },
        { name: 'LGU-PMT with subRole "secretariat"', result: user.role === 'LGU-PMT' && user.subRole && user.subRole.toLowerCase() === 'secretariat' }
      ];
      
      roleChecks.forEach(check => {
        console.log(`  ${check.result ? '✅' : '❌'} ${check.name}: ${check.result}`);
      });
      
      const isSecretariat = user.role === 'MPMEC Secretariat' || 
                           user.role === 'Secretariat' || 
                           user.role === 'secretariat' ||
                           (user.role === 'LGU-PMT' && user.subRole && 
                            (user.subRole.toLowerCase() === 'mpmec secretariat' || 
                             user.subRole.toLowerCase() === 'secretariat'));
      
      console.log('  🔍 Final isSecretariat result:', isSecretariat);
      
      if (!isSecretariat) {
        console.log('  ⚠️ WARNING: User is NOT detected as Secretariat!');
        console.log('    This is why the logout modal event listener is ignoring updates.');
      }
    },
    
    // Run all checks
    async runAll() {
      this.checkCurrentUser();
      this.checkLocalStorage();
      this.checkLogoutModal();
      this.checkProfilePictureManager();
      this.checkEventListeners();
      this.checkRoleDetection();
      await this.checkServerState();
      
      console.log('\n✅ ========================================');
      console.log('✅ All checks completed!');
      console.log('✅ ========================================');
      console.log('\n💡 TIPS:');
      console.log('  - If role detection fails, the event listener will ignore updates');
      console.log('  - If localStorage has values but DOM elements are empty, the update function might not be called');
      console.log('  - Run debug.testProfilePictureUpdate() to test if the event listener works');
      console.log('  - Run debug.forceUpdateLogoutModal() to force update the logout modal');
    }
  };
  
  // Make debug available globally
  window.debugSecretariatLogoutModal = debug;
  
  // Auto-run all checks
  debug.runAll();
  
  console.log('\n💡 Available commands:');
  console.log('  - debugSecretariatLogoutModal.runAll() - Run all checks');
  console.log('  - debugSecretariatLogoutModal.checkCurrentUser() - Check current user data');
  console.log('  - debugSecretariatLogoutModal.checkLocalStorage() - Check localStorage');
  console.log('  - debugSecretariatLogoutModal.checkLogoutModal() - Check logout modal DOM');
  console.log('  - debugSecretariatLogoutModal.checkRoleDetection() - Check role detection');
  console.log('  - debugSecretariatLogoutModal.testProfilePictureUpdate() - Test update');
  console.log('  - debugSecretariatLogoutModal.forceUpdateLogoutModal() - Force update');
})();


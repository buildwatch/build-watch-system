// Comprehensive Debugging Script for User Management Profile Picture Updates
// Run this in the browser console to diagnose why profile pictures aren't updating in user-management table

(function() {
  'use strict';
  
  console.log('🔍 ========================================');
  console.log('🔍 User Management Profile Picture Debug Tool');
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
            userId: user.userId,
            id: user.id,
            employeeId: user.employeeId,
            username: user.username,
            email: user.email,
            role: user.role,
            profilePictureUrl: user.profilePictureUrl ? user.profilePictureUrl.substring(0, 50) + '...' : 'null'
          });
          return user;
        } catch (e) {
          console.log('  ❌ Error parsing user data:', e);
        }
      } else {
        console.log('  ❌ No user data in localStorage');
      }
      return null;
    },
    
    // Check all profile picture elements in user-management table
    checkTableElements() {
      console.log('\n📊 USER MANAGEMENT TABLE ELEMENTS:');
      
      // Find all profile picture elements
      const allProfileImgs = document.querySelectorAll('[id^="profile-img-"]');
      console.log(`  Found ${allProfileImgs.length} profile picture elements in table`);
      
      const elements = [];
      allProfileImgs.forEach(img => {
        const id = img.id;
        const userId = id.replace('profile-img-', '');
        const row = img.closest('tr');
        let userInfo = {};
        
        if (row) {
          // Try to extract user info from the row
          const nameElement = row.querySelector('.font-semibold, [class*="font-semibold"]');
          const emailElement = row.querySelector('td:nth-child(3), [data-field="email"]');
          
          userInfo = {
            elementId: id,
            userId: userId,
            name: nameElement ? nameElement.textContent.trim() : 'Unknown',
            email: emailElement ? emailElement.textContent.trim() : 'Unknown',
            currentSrc: img.src ? img.src.substring(0, 50) + '...' : 'empty',
            isVisible: img.offsetParent !== null,
            display: window.getComputedStyle(img).display
          };
        } else {
          userInfo = {
            elementId: id,
            userId: userId,
            currentSrc: img.src ? img.src.substring(0, 50) + '...' : 'empty'
          };
        }
        
        elements.push(userInfo);
      });
      
      console.table(elements);
      return elements;
    },
    
    // Check event listeners
    checkEventListeners() {
      console.log('\n📡 EVENT LISTENERS CHECK:');
      
      // Check if events are being dispatched
      let eventReceived = false;
      const testHandler = (eventName) => {
        return (e) => {
          eventReceived = true;
          console.log(`  ✅ ${eventName} event received!`, {
            profilePictureUrl: e.detail.profilePictureUrl ? e.detail.profilePictureUrl.substring(0, 50) + '...' : 'null',
            userId: e.detail.userId,
            userData: e.detail.userData ? {
              userId: e.detail.userData.userId,
              email: e.detail.userData.email
            } : null
          });
        };
      };
      
      window.addEventListener('iuProfilePictureUpdated', testHandler('iuProfilePictureUpdated'), { once: true });
      window.addEventListener('profilePictureUpdated', testHandler('profilePictureUpdated'), { once: true });
      
      setTimeout(() => {
        if (!eventReceived) {
          console.log('  ⚠️ No events received yet (this is normal if no update happened)');
          console.log('  💡 Try updating your profile picture now to see if events are dispatched');
        }
      }, 2000);
      
      console.log('  ℹ️ Listening for iuProfilePictureUpdated and profilePictureUpdated events');
    },
    
    // Test profile picture update manually
    async testManualUpdate() {
      console.log('\n🧪 TEST MANUAL UPDATE:');
      
      const user = this.checkCurrentUser();
      if (!user) {
        console.log('  ❌ Cannot test - no user data found');
        return;
      }
      
      const testUrl = user.profilePictureUrl || localStorage.getItem('iu_profile_picture');
      if (!testUrl) {
        console.log('  ❌ No profile picture URL found to test with');
        return;
      }
      
      console.log('  🔄 Testing update with URL:', testUrl.substring(0, 50) + '...');
      console.log('  🔄 Testing with userId:', user.userId);
      
      // Try to find the element
      const elementId = `profile-img-${user.userId}`;
      const profileImg = document.getElementById(elementId);
      
      if (profileImg) {
        console.log(`  ✅ Found element: ${elementId}`);
        
        // Test update
        const img = new Image();
        img.onload = function() {
          const fallback = profileImg.nextElementSibling;
          if (fallback && fallback.classList.contains('profile-picture-fallback')) {
            fallback.style.display = 'none';
          }
          profileImg.src = testUrl;
          profileImg.style.display = 'block';
          console.log('  ✅ Manual update successful!');
        };
        img.onerror = function() {
          console.log('  ❌ Failed to load test image');
        };
        img.src = testUrl;
      } else {
        console.log(`  ❌ Element not found: ${elementId}`);
        console.log('  💡 Trying alternative IDs...');
        
        // Try alternatives
        const alternatives = [
          `profile-img-${user.id}`,
          `profile-img-${user.employeeId}`,
          `profile-img-${user.username}`,
          `profile-img-${user.email}`
        ];
        
        alternatives.forEach(altId => {
          const altElement = document.getElementById(altId);
          if (altElement) {
            console.log(`  ✅ Found alternative element: ${altId}`);
          }
        });
      }
    },
    
    // Find user by email in table
    findUserByEmail(email) {
      console.log(`\n🔍 SEARCHING FOR USER BY EMAIL: ${email}`);
      
      const allRows = document.querySelectorAll('tr[class*="border-b"]');
      let found = false;
      
      allRows.forEach((row, index) => {
        const rowText = row.textContent || '';
        if (rowText.includes(email)) {
          found = true;
          const profileImg = row.querySelector('[id^="profile-img-"]');
          const nameElement = row.querySelector('.font-semibold, [class*="font-semibold"]');
          const emailElement = Array.from(row.querySelectorAll('td')).find(td => td.textContent.includes('@'));
          
          console.log(`  ✅ Found user row #${index + 1}!`, {
            elementId: profileImg ? profileImg.id : 'NOT FOUND',
            userId: profileImg ? profileImg.id.replace('profile-img-', '') : 'N/A',
            name: nameElement ? nameElement.textContent.trim() : 'Unknown',
            email: emailElement ? emailElement.textContent.trim() : 'Unknown',
            currentSrc: profileImg && profileImg.src ? profileImg.src.substring(0, 50) + '...' : 'empty',
            rowHTML: row.innerHTML.substring(0, 200) + '...'
          });
        }
      });
      
      if (!found) {
        console.log('  ❌ User not found in table');
        console.log('  💡 Available emails in table:');
        allRows.forEach((row, index) => {
          const emailElement = Array.from(row.querySelectorAll('td')).find(td => td.textContent.includes('@'));
          if (emailElement) {
            console.log(`    - Row ${index + 1}: ${emailElement.textContent.trim()}`);
          }
        });
      }
    },
    
    // Find LGU-IU users in table
    findLGUUsers() {
      console.log('\n🔍 SEARCHING FOR LGU-IU USERS IN TABLE:');
      
      const allRows = document.querySelectorAll('tr[class*="border-b"]');
      const lguUsers = [];
      
      allRows.forEach((row, index) => {
        const rowText = row.textContent || '';
        // Look for LGU-IU role tag or LGU-IU in the row
        if (rowText.includes('LGU-IU') || row.querySelector('[class*="LGU-IU"], [data-role*="LGU-IU"]')) {
          const profileImg = row.querySelector('[id^="profile-img-"]');
          const nameElement = row.querySelector('.font-semibold, [class*="font-semibold"]');
          const emailElement = Array.from(row.querySelectorAll('td')).find(td => td.textContent.includes('@'));
          const roleTag = row.querySelector('[class*="tag"], [class*="badge"], [class*="role"]');
          
          const userInfo = {
            rowIndex: index + 1,
            elementId: profileImg ? profileImg.id : 'NOT FOUND',
            userId: profileImg ? profileImg.id.replace('profile-img-', '') : 'N/A',
            name: nameElement ? nameElement.textContent.trim() : 'Unknown',
            email: emailElement ? emailElement.textContent.trim() : 'Unknown',
            role: roleTag ? roleTag.textContent.trim() : 'LGU-IU',
            currentSrc: profileImg && profileImg.src ? profileImg.src.substring(0, 50) + '...' : 'empty'
          };
          
          lguUsers.push(userInfo);
        }
      });
      
      if (lguUsers.length > 0) {
        console.log(`  ✅ Found ${lguUsers.length} LGU-IU user(s):`);
        console.table(lguUsers);
        return lguUsers;
      } else {
        console.log('  ❌ No LGU-IU users found in table');
        return [];
      }
    },
    
    // Simulate profile picture update event
    simulateUpdate() {
      console.log('\n🎭 SIMULATING PROFILE PICTURE UPDATE EVENT:');
      
      const user = this.checkCurrentUser();
      if (!user) {
        console.log('  ❌ Cannot simulate - no user data found');
        return;
      }
      
      const testUrl = user.profilePictureUrl || localStorage.getItem('iu_profile_picture');
      if (!testUrl) {
        console.log('  ❌ No profile picture URL found');
        return;
      }
      
      const event = new CustomEvent('iuProfilePictureUpdated', {
        detail: {
          profilePictureUrl: testUrl,
          userId: user.userId || user.id,
          userData: user
        }
      });
      
      console.log('  🔄 Dispatching event:', {
        profilePictureUrl: testUrl.substring(0, 50) + '...',
        userId: user.userId || user.id,
        userData: { userId: user.userId, email: user.email }
      });
      
      window.dispatchEvent(event);
      
      setTimeout(() => {
        console.log('  ✅ Event dispatched. Check if table updated.');
      }, 500);
    },
    
    // Check if updateUserManagementProfilePicture function exists
    checkUpdateFunction() {
      console.log('\n🔧 CHECKING UPDATE FUNCTION:');
      
      // Try to access the function (it's in a closure, so we'll check if events work)
      console.log('  ℹ️ updateUserManagementProfilePicture is in a closure');
      console.log('  ℹ️ Checking if event listeners are set up...');
      
      // Check if we can see any event listeners
      const hasListener = window.addEventListener.toString().includes('native code') ? 'Native' : 'Custom';
      console.log('  ✅ window.addEventListener is available');
      
      // Try to trigger a test event
      console.log('  💡 Run debug.simulateUpdate() to test if the update function works');
    },
    
    // Run all checks
    async runAll() {
      const user = this.checkCurrentUser();
      this.checkTableElements();
      this.checkEventListeners();
      this.checkUpdateFunction();
      
      // Always check for LGU-IU users
      const lguUsers = this.findLGUUsers();
      
      if (user) {
        this.findUserByEmail(user.email);
        await this.testManualUpdate();
      }
      
      // If LGU users found, show how to test
      if (lguUsers.length > 0) {
        console.log('\n💡 TO TEST LGU-IU PROFILE PICTURE UPDATE:');
        console.log('  1. Open LGU-IU profile page in another tab/window');
        console.log('  2. Update the profile picture there');
        console.log('  3. Watch this console for event logs');
        console.log('  4. Or run: debug.testUpdateForLGUUser("meoencoderadmin@gmail.com")');
      }
      
      console.log('\n✅ ========================================');
      console.log('✅ All checks completed!');
      console.log('✅ ========================================');
      console.log('\n💡 AVAILABLE COMMANDS:');
      console.log('  - debug.runAll() - Run all checks');
      console.log('  - debug.checkCurrentUser() - Check current user data');
      console.log('  - debug.checkTableElements() - Check all table elements');
      console.log('  - debug.findLGUUsers() - Find all LGU-IU users in table');
      console.log('  - debug.findUserByEmail(email) - Find user in table');
      console.log('  - debug.testManualUpdate() - Test manual update');
      console.log('  - debug.simulateUpdate() - Simulate profile picture update event');
      console.log('  - debug.testUpdateForLGUUser(email) - Test update for specific LGU user');
      console.log('\n💡 TIPS:');
      console.log('  1. Update LGU-IU profile picture in another tab and watch for event logs');
      console.log('  2. Check if userId matches the element ID in the table');
      console.log('  3. Run debug.simulateUpdate() to test if the update function works');
      console.log('  4. Check console for any error messages');
    },
    
    // Test update for specific LGU user
    testUpdateForLGUUser(email) {
      console.log(`\n🧪 TESTING UPDATE FOR LGU USER: ${email}`);
      
      const lguUsers = this.findLGUUsers();
      const targetUser = lguUsers.find(u => u.email === email);
      
      if (!targetUser) {
        console.log(`  ❌ User with email ${email} not found in LGU users`);
        return;
      }
      
      console.log('  ✅ Found user:', targetUser);
      
      // Get profile picture URL from localStorage (if available)
      const profileUrl = localStorage.getItem('iu_profile_picture') || 
                        localStorage.getItem('lgu_iu_profile_picture');
      
      if (!profileUrl) {
        console.log('  ⚠️ No profile picture URL in localStorage');
        console.log('  💡 Update the profile picture first, then run this test');
        return;
      }
      
      console.log('  🔄 Testing update with URL:', profileUrl.substring(0, 50) + '...');
      
      // Find the element
      const profileImg = document.getElementById(targetUser.elementId);
      if (profileImg) {
        console.log(`  ✅ Found element: ${targetUser.elementId}`);
        
        // Test update
        const img = new Image();
        img.onload = function() {
          const fallback = profileImg.nextElementSibling;
          if (fallback && fallback.classList.contains('profile-picture-fallback')) {
            fallback.style.display = 'none';
          }
          profileImg.src = profileUrl;
          profileImg.style.display = 'block';
          console.log('  ✅ Manual update successful!');
        };
        img.onerror = function() {
          console.log('  ❌ Failed to load test image');
        };
        img.src = profileUrl;
      } else {
        console.log(`  ❌ Element not found: ${targetUser.elementId}`);
      }
    }
  };
  
  // Make debug available globally
  window.debugUserManagementProfilePicture = debug;
  
  // Auto-run all checks
  debug.runAll();
  
})();


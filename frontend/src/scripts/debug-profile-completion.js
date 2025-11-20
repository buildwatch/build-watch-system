// Comprehensive Debugging Script for Profile Completion Issues
// Run this in the browser console to diagnose why profile completion is showing 0%

(function() {
  'use strict';
  
  console.log('🔍 ========================================');
  console.log('🔍 Profile Completion Debugging Tool');
  console.log('🔍 ========================================');
  
  const debug = {
    // Check current user data
    async checkUserData() {
      console.log('\n👤 CHECKING USER DATA:');
      try {
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] || 
                     localStorage.getItem('token') || 
                     localStorage.getItem('authToken');
        
        if (!token) {
          console.log('  ❌ No authentication token found');
          return null;
        }
        
        console.log('  ✅ Token found');
        
        const response = await fetch('http://localhost:3000/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.log('  ❌ Failed to fetch profile:', response.status, response.statusText);
          return null;
        }
        
        const data = await response.json();
        if (data.success && data.user) {
          const user = data.user;
          console.log('  ✅ User data retrieved:', {
            id: user.id,
            userId: user.userId,
            role: user.role,
            subRole: user.subRole,
            name: user.name || user.fullName,
            email: user.email,
            contactNumber: user.contactNumber,
            birthdate: user.birthdate,
            department: user.department,
            position: user.position,
            address: user.address,
            location: user.location,
            profilePictureUrl: user.profilePictureUrl ? user.profilePictureUrl.substring(0, 50) + '...' : 'null'
          });
          
          // Check each field
          const fieldChecks = {
            name: !!(user.name || user.fullName),
            email: !!user.email,
            contactNumber: !!user.contactNumber,
            birthdate: !!user.birthdate,
            department: !!user.department,
            position: !!user.position,
            address: !!(user.address || user.location),
            profilePictureUrl: !!(user.profilePictureUrl && 
                                 user.profilePictureUrl !== 'null' && 
                                 user.profilePictureUrl !== 'undefined' &&
                                 !user.profilePictureUrl.startsWith('data:image/svg+xml'))
          };
          
          console.log('  📊 Field completion status:');
          Object.entries(fieldChecks).forEach(([field, filled]) => {
            console.log(`    ${filled ? '✅' : '❌'} ${field}: ${filled ? 'FILLED' : 'MISSING'}`);
            if (!filled) {
              const value = user[field] || user[field === 'name' ? 'fullName' : field] || user[field === 'address' ? 'location' : null];
              console.log(`      Value: ${value || 'null/undefined'}`);
            }
          });
          
          const filledCount = Object.values(fieldChecks).filter(v => v).length;
          const totalCount = Object.keys(fieldChecks).length;
          const expectedPercentage = Math.round((filledCount / totalCount) * 100);
          
          console.log(`  📈 Expected completion: ${filledCount}/${totalCount} = ${expectedPercentage}%`);
          
          return user;
        } else {
          console.log('  ❌ Invalid response format:', data);
          return null;
        }
      } catch (error) {
        console.log('  ❌ Error fetching user data:', error);
        return null;
      }
    },
    
    // Check profile completion API
    async checkProfileCompletion() {
      console.log('\n📊 CHECKING PROFILE COMPLETION API:');
      try {
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] || 
                     localStorage.getItem('token') || 
                     localStorage.getItem('authToken');
        
        if (!token) {
          console.log('  ❌ No authentication token found');
          return null;
        }
        
        const response = await fetch('http://localhost:3000/api/auth/profile/completion', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.log('  ❌ Failed to fetch completion:', response.status, response.statusText);
          const errorText = await response.text();
          console.log('  Error details:', errorText);
          return null;
        }
        
        const data = await response.json();
        console.log('  ✅ API Response:', data);
        
        if (data.success && data.completion) {
          const completion = data.completion;
          console.log('  📊 Completion Details:', {
            percentage: completion.percentage,
            filledFields: completion.filledFields,
            totalFields: completion.totalFields,
            missingFields: completion.missingFields
          });
          
          if (completion.percentage === 0) {
            console.log('  ⚠️ WARNING: Completion is 0%!');
            console.log('  Missing fields:', completion.missingFields);
            console.log('  Filled fields:', completion.filledFields, 'out of', completion.totalFields);
          }
          
          return completion;
        } else {
          console.log('  ❌ Invalid response format:', data);
          return null;
        }
      } catch (error) {
        console.log('  ❌ Error fetching completion:', error);
        console.log('  Error details:', error.message, error.stack);
        return null;
      }
    },
    
    // Check localStorage
    checkLocalStorage() {
      console.log('\n📦 CHECKING LOCALSTORAGE:');
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('  ✅ User data in localStorage:', {
            role: user.role,
            subRole: user.subRole,
            position: user.position,
            address: user.address,
            location: user.location
          });
        } catch (e) {
          console.log('  ❌ Error parsing localStorage user data:', e);
        }
      } else {
        console.log('  ⚠️ No user data in localStorage');
      }
    },
    
    // Check frontend state
    checkFrontendState() {
      console.log('\n🖥️ CHECKING FRONTEND STATE:');
      
      // Try to find React component state (if using React DevTools)
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('  ✅ React DevTools detected');
      }
      
      // Check if ProfileCenter component is mounted
      const profileCompletionElements = document.querySelectorAll('[class*="completion"], [id*="completion"]');
      console.log('  Profile completion elements found:', profileCompletionElements.length);
      
      // Check for any error messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="red"]');
      if (errorElements.length > 0) {
        console.log('  ⚠️ Found potential error elements:', errorElements.length);
      }
    },
    
    // Test field validation logic
    testFieldValidation() {
      console.log('\n🧪 TESTING FIELD VALIDATION LOGIC:');
      
      const testCases = [
        { name: 'Valid string', value: 'test', expected: true },
        { name: 'Empty string', value: '', expected: false },
        { name: 'Null', value: null, expected: false },
        { name: 'Undefined', value: undefined, expected: false },
        { name: 'String "null"', value: 'null', expected: false },
        { name: 'String "undefined"', value: 'undefined', expected: false },
        { name: 'String "-"', value: '-', expected: false },
        { name: 'SVG placeholder', value: 'data:image/svg+xml;base64,...', expected: false }
      ];
      
      testCases.forEach(testCase => {
        const isValid = testCase.value && 
                       testCase.value !== '' && 
                       testCase.value !== 'null' && 
                       testCase.value !== 'undefined' &&
                       testCase.value !== '-';
        const passed = isValid === testCase.expected;
        console.log(`  ${passed ? '✅' : '❌'} ${testCase.name}: ${isValid} (expected ${testCase.expected})`);
      });
    },
    
    // Force refresh profile completion
    async forceRefreshCompletion() {
      console.log('\n🔄 FORCING PROFILE COMPLETION REFRESH:');
      try {
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] || 
                     localStorage.getItem('token') || 
                     localStorage.getItem('authToken');
        
        if (!token) {
          console.log('  ❌ No authentication token found');
          return;
        }
        
        // First, update the profile to ensure fields are set
        console.log('  🔄 Step 1: Fetching profile to trigger auto-fill...');
        const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log('  ✅ Profile fetched, fields should be auto-filled');
          console.log('  Updated fields:', {
            address: profileData.user?.address,
            location: profileData.user?.location,
            position: profileData.user?.position
          });
        }
        
        // Wait a bit for database to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Then fetch completion
        console.log('  🔄 Step 2: Fetching completion...');
        const completionResponse = await fetch('http://localhost:3000/api/auth/profile/completion', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (completionResponse.ok) {
          const completionData = await completionResponse.json();
          console.log('  ✅ Completion fetched:', completionData.completion);
          
          // Try to trigger a page refresh of the completion component
          console.log('  🔄 Step 3: Triggering page reload...');
          console.log('  💡 You may need to manually reload the page to see the updated completion');
        }
      } catch (error) {
        console.log('  ❌ Error during force refresh:', error);
      }
    },
    
    // Run all checks
    async runAll() {
      this.checkLocalStorage();
      await this.checkUserData();
      await this.checkProfileCompletion();
      this.checkFrontendState();
      this.testFieldValidation();
      
      console.log('\n✅ ========================================');
      console.log('✅ All checks completed!');
      console.log('✅ ========================================');
      console.log('\n💡 TIPS:');
      console.log('  - If completion is 0%, check the missingFields array');
      console.log('  - Compare user data fields with expected fields');
      console.log('  - Check if address/location/position are being set correctly');
      console.log('  - Run debug.forceRefreshCompletion() to force update');
      console.log('  - Check browser console for any API errors');
    }
  };
  
  // Make debug available globally
  window.debugProfileCompletion = debug;
  
  // Auto-run all checks
  debug.runAll();
  
  console.log('\n💡 Available commands:');
  console.log('  - debugProfileCompletion.runAll() - Run all checks');
  console.log('  - debugProfileCompletion.checkUserData() - Check user data from API');
  console.log('  - debugProfileCompletion.checkProfileCompletion() - Check completion API');
  console.log('  - debugProfileCompletion.forceRefreshCompletion() - Force refresh completion');
  console.log('  - debugProfileCompletion.testFieldValidation() - Test validation logic');
})();


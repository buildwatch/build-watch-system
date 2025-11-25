// ============================================
// PROFILE PICTURE DEBUGGING SCRIPT
// ============================================
// Copy and paste this entire script into your browser console
// while viewing the Project Summary & Report page with the Report tab active

(function() {
  console.log('🔍 ========== PROFILE PICTURE DEBUG SCRIPT ==========');
  
  // Get API URL
  const getApiUrl = () => {
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProd 
      ? `${window.location.protocol}//${window.location.hostname}/api`
      : 'http://localhost:3000/api';
  };
  
  const API_URL = getApiUrl();
  console.log('✅ API URL:', API_URL);
  
  // Get token
  const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  if (!token) {
    console.error('❌ No authentication token found!');
    return;
  }
  console.log('✅ Token found:', token.substring(0, 20) + '...');
  
  // Get selected project ID - try multiple methods
  let selectedProjectId = null;
  
  // Method 1: Try to get from React DevTools (if available)
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('💡 React DevTools detected, trying to find selectedProject...');
  }
  
  // Method 2: Try to get from the project selector dropdown
  const projectSelect = document.querySelector('select[value]');
  if (projectSelect && projectSelect.value) {
    selectedProjectId = projectSelect.value;
    console.log('✅ Found project ID from dropdown:', selectedProjectId);
  }
  
  // Method 3: Try to get from data attributes
  if (!selectedProjectId) {
    const projectElement = document.querySelector('[data-project-id]');
    if (projectElement) {
      selectedProjectId = projectElement.getAttribute('data-project-id');
      console.log('✅ Found project ID from data attribute:', selectedProjectId);
    }
  }
  
  // Method 4: Try to get from URL params
  if (!selectedProjectId) {
    const urlParams = new URLSearchParams(window.location.search);
    selectedProjectId = urlParams.get('projectId');
    if (selectedProjectId) {
      console.log('✅ Found project ID from URL params:', selectedProjectId);
    }
  }
  
  // Method 5: Try to extract from audit trail data in the DOM
  if (!selectedProjectId) {
    // Look for any activity elements that might have project info
    const activityElements = document.querySelectorAll('[data-activity-id], [data-entity-id]');
    if (activityElements.length > 0) {
      const firstActivity = activityElements[0];
      const entityId = firstActivity.getAttribute('data-entity-id') || 
                       firstActivity.getAttribute('data-project-id');
      if (entityId && entityId.length > 10) { // UUIDs are typically long
        selectedProjectId = entityId;
        console.log('✅ Found project ID from activity element:', selectedProjectId);
      }
    }
  }
  
  if (!selectedProjectId) {
    console.error('❌ No project ID found!');
    console.log('💡 Available project data:', {
      windowSelectedProject: window.selectedProject,
      urlParams: new URLSearchParams(window.location.search).toString(),
      projectSelectValue: projectSelect?.value,
      projectSelectOptions: projectSelect ? Array.from(projectSelect.options).map(opt => ({ value: opt.value, text: opt.text })) : []
    });
    console.log('💡 Please select a project from the dropdown first, then run this script again.');
    return;
  }
  console.log('✅ Project ID:', selectedProjectId);
  
  // Debug function to check profile pictures
  async function debugProfilePictures() {
    try {
      console.log('\n📡 Fetching activity history...');
      
      // Fetch activity history
      const activityResponse = await fetch(`${API_URL}/projects/${selectedProjectId}/activity-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!activityResponse.ok) {
        console.error('❌ Failed to fetch activity history:', activityResponse.status, activityResponse.statusText);
        return;
      }
      
      const activityResult = await activityResponse.json();
      const activities = activityResult.activities || [];
      
      console.log('✅ Activities fetched:', activities.length);
      
      // Analyze each activity
      console.log('\n📊 ========== ACTIVITY ANALYSIS ==========');
      activities.forEach((activity, index) => {
        console.log(`\n--- Activity ${index + 1} ---`);
        console.log('Action:', activity.action);
        console.log('User Object:', activity.user);
        console.log('User Name:', activity.user?.name || activity.userName);
        console.log('User ID:', activity.user?.id || activity.userId);
        console.log('Profile Picture URL (raw):', activity.user?.profilePictureUrl);
        console.log('Profile Picture URL (type):', typeof activity.user?.profilePictureUrl);
        console.log('Profile Picture URL (value):', activity.user?.profilePictureUrl ? JSON.stringify(activity.user.profilePictureUrl) : 'null/undefined');
        
        // Check if profile picture URL exists and what format it's in
        if (activity.user?.profilePictureUrl) {
          const url = activity.user.profilePictureUrl;
          console.log('✅ Profile picture URL exists');
          console.log('  - Starts with data::', url.startsWith('data:'));
          console.log('  - Starts with blob::', url.startsWith('blob:'));
          console.log('  - Starts with http://:', url.startsWith('http://'));
          console.log('  - Starts with https://:', url.startsWith('https://'));
          console.log('  - Starts with /api/:', url.startsWith('/api/'));
          console.log('  - Starts with /uploads/:', url.startsWith('/uploads/'));
          console.log('  - Contains /api/profile/picture/:', url.includes('/api/profile/picture/'));
          
          // Try to normalize it
          let normalizedUrl = url;
          if (url.startsWith('data:') || url.startsWith('blob:')) {
            normalizedUrl = url;
            console.log('  ✅ Already a data/blob URL');
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            normalizedUrl = url;
            console.log('  ✅ Already a full URL');
          } else if (url.startsWith('/api/') || url.includes('/api/profile/picture/')) {
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
              ? 'http://localhost:3000'
              : `${window.location.protocol}//${window.location.hostname}`;
            normalizedUrl = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
            console.log('  🔄 Normalized API endpoint:', normalizedUrl);
          } else if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
              ? 'http://localhost:3000'
              : `${window.location.protocol}//${window.location.hostname}`;
            normalizedUrl = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
            console.log('  🔄 Normalized uploads path:', normalizedUrl);
          } else {
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
              ? 'http://localhost:3000'
              : `${window.location.protocol}//${window.location.hostname}`;
            normalizedUrl = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
            console.log('  🔄 Normalized default path:', normalizedUrl);
          }
          
          // Test if the URL is accessible
          console.log('  🧪 Testing URL accessibility...');
          fetch(normalizedUrl, {
            method: 'HEAD',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          })
            .then(res => {
              console.log('  ✅ URL is accessible:', res.status, res.statusText);
              if (res.status === 200) {
                console.log('  ✅ Profile picture should load correctly!');
              } else {
                console.warn('  ⚠️ URL returned status:', res.status);
              }
            })
            .catch(err => {
              console.error('  ❌ URL is NOT accessible:', err.message);
              console.log('  💡 This might be why the profile picture is not showing');
            });
        } else {
          console.log('❌ Profile picture URL is missing!');
          console.log('  - User object keys:', activity.user ? Object.keys(activity.user) : 'No user object');
          console.log('  - Activity keys:', Object.keys(activity));
          
          // Try to fetch user profile picture from user API
          if (activity.user?.id || activity.userId) {
            const userId = activity.user?.id || activity.userId;
            console.log('  🔍 Attempting to fetch user profile picture from API...');
            fetch(`${API_URL}/users/${userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
              .then(res => res.json())
              .then(userData => {
                console.log('  📦 User data from API:', userData);
                if (userData.user?.profilePictureUrl || userData.profilePictureUrl) {
                  console.log('  ✅ Found profile picture in user API:', userData.user?.profilePictureUrl || userData.profilePictureUrl);
                } else {
                  console.log('  ❌ Profile picture not found in user API either');
                }
              })
              .catch(err => {
                console.error('  ❌ Failed to fetch user data:', err);
              });
          }
        }
      });
      
      // Check React component state
      console.log('\n⚛️ ========== REACT COMPONENT STATE ==========');
      console.log('💡 To check React component state, you can try:');
      console.log('  - Look for React DevTools in your browser');
      console.log('  - Check the Network tab for profile picture requests');
      console.log('  - Check the Console for image loading errors');
      
      // Check DOM elements
      console.log('\n🌐 ========== DOM ELEMENTS CHECK ==========');
      const profileImages = document.querySelectorAll('img[alt*="User"], img[alt*="user"]');
      console.log('Found profile image elements:', profileImages.length);
      profileImages.forEach((img, index) => {
        console.log(`\nImage ${index + 1}:`);
        console.log('  - src:', img.src);
        console.log('  - alt:', img.alt);
        console.log('  - className:', img.className);
        console.log('  - naturalWidth:', img.naturalWidth);
        console.log('  - naturalHeight:', img.naturalHeight);
        console.log('  - complete:', img.complete);
        console.log('  - onerror:', img.onerror ? 'Has error handler' : 'No error handler');
        
        // Check if image loaded successfully
        if (img.complete && img.naturalWidth === 0) {
          console.log('  ⚠️ Image failed to load (naturalWidth is 0)');
        } else if (img.complete && img.naturalWidth > 0) {
          console.log('  ✅ Image loaded successfully');
        } else {
          console.log('  ⏳ Image is still loading...');
        }
      });
      
      // Summary
      console.log('\n📋 ========== SUMMARY ==========');
      const activitiesWithPictures = activities.filter(a => a.user?.profilePictureUrl);
      const activitiesWithoutPictures = activities.filter(a => !a.user?.profilePictureUrl);
      
      console.log(`Total activities: ${activities.length}`);
      console.log(`Activities with profile pictures: ${activitiesWithPictures.length}`);
      console.log(`Activities without profile pictures: ${activitiesWithoutPictures.length}`);
      
      if (activitiesWithoutPictures.length > 0) {
        console.log('\n⚠️ Activities missing profile pictures:');
        activitiesWithoutPictures.forEach((activity, index) => {
          console.log(`  ${index + 1}. ${activity.action} by ${activity.user?.name || activity.userName || 'Unknown'}`);
        });
      }
      
      console.log('\n💡 ========== RECOMMENDATIONS ==========');
      if (activitiesWithoutPictures.length > 0) {
        console.log('1. Check if the backend is including profilePictureUrl in the activity response');
        console.log('2. Verify that users have profile pictures uploaded');
        console.log('3. Check if the backend needs to populate user data with profile pictures');
      }
      if (activitiesWithPictures.length > 0) {
        console.log('1. Verify the normalizeProfilePictureUrl function is working correctly');
        console.log('2. Check if profile picture URLs need authentication tokens');
        console.log('3. Verify CORS settings if images are on a different domain');
      }
      
      console.log('\n🔍 ========== DEBUG SCRIPT COMPLETE ==========');
      
    } catch (error) {
      console.error('❌ Error during debugging:', error);
      console.error('Error stack:', error.stack);
    }
  }
  
  // Run the debug function
  debugProfilePictures();
  
  // Also provide a helper function to test a specific URL
  window.testProfilePictureUrl = function(url) {
    console.log('🧪 Testing profile picture URL:', url);
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image loaded successfully!', {
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    };
    img.onerror = (err) => {
      console.error('❌ Image failed to load:', err);
      console.log('💡 Try checking:');
      console.log('  - Is the URL correct?');
      console.log('  - Does it require authentication?');
      console.log('  - Is CORS enabled?');
      console.log('  - Does the file exist on the server?');
    };
    img.src = url;
  };
  
  console.log('✅ Test function created: window.testProfilePictureUrl(url)');
  console.log('💡 Example: testProfilePictureUrl("https://example.com/profile.jpg")');
})();


// Debug script for Activity History - Run this in browser console
// Copy and paste this entire script into the browser console
// This will automatically find the user ID from the "Activity Made" buttons on the page

(async function debugActivityHistory() {
  console.log('🔍 Starting Activity History Debug...\n');
  
  // Try to automatically find user IDs from the page
  const activityButtons = document.querySelectorAll('button[data-user-id]');
  console.log(`📋 Found ${activityButtons.length} activity buttons on the page\n`);
  
  if (activityButtons.length === 0) {
    console.log('❌ No activity buttons found. Please click on "1 comment posted" first, then run this script.');
    console.log('Alternatively, you can manually find the user ID by:');
    console.log('1. Right-click on the "1 comment posted" button');
    console.log('2. Select "Inspect Element"');
    console.log('3. Look for data-user-id="..." in the HTML');
    return;
  }
  
  // Show available user IDs
  const userIds = Array.from(activityButtons).map(btn => ({
    userId: btn.getAttribute('data-user-id'),
    userName: btn.getAttribute('data-user-name'),
    commentCount: btn.getAttribute('data-comment-count')
  }));
  
  console.log('📋 Available Users with Activity:\n');
  userIds.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.userName || 'Unknown'} (${user.commentCount} comments)`);
    console.log(`   User ID: ${user.userId}\n`);
  });
  
  // If only one user, use it automatically; otherwise ask
  let userId;
  if (userIds.length === 1) {
    userId = userIds[0].userId;
    console.log(`✅ Auto-selected user: ${userIds[0].userName || 'Unknown'} (${userId})\n`);
  } else {
    const selection = prompt(`Found ${userIds.length} users. Enter the number (1-${userIds.length}) or paste the User ID directly:`);
    if (!selection) {
      console.log('❌ No selection provided');
      return;
    }
    
    // Check if it's a number (selection) or UUID (direct ID)
    if (/^\d+$/.test(selection)) {
      const index = parseInt(selection) - 1;
      if (index >= 0 && index < userIds.length) {
        userId = userIds[index].userId;
        console.log(`✅ Selected user: ${userIds[index].userName || 'Unknown'} (${userId})\n`);
      } else {
        console.log('❌ Invalid selection number');
        return;
      }
    } else {
      userId = selection;
      console.log(`✅ Using provided User ID: ${userId}\n`);
    }
  }
  
  if (!userId) {
    console.log('❌ No user ID available');
    return;
  }
  
  // Get token
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No authentication token found');
    return;
  }
  console.log('✅ Token found\n');
  
  // Determine API URL
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const PROJECT_COMMENTS_API_URL = isProduction 
    ? (window.location.protocol === 'https:' 
        ? `${window.location.protocol}//${window.location.hostname}/api/project-comments`
        : `http://${window.location.hostname}:3000/api/project-comments`)
    : 'http://localhost:3000/api/project-comments';
  
  console.log(`🌐 API URL: ${PROJECT_COMMENTS_API_URL}\n`);
  
  try {
    // Fetch activity history
    console.log('📡 Fetching activity history...');
    const response = await fetch(`${PROJECT_COMMENTS_API_URL}/user/${userId}/activity`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response:', data);
    console.log(`📝 Total activities: ${data.total}\n`);
    
    if (data.activities && data.activities.length > 0) {
      console.log('📋 Activity Details:\n');
      data.activities.forEach((activity, index) => {
        console.log(`--- Activity ${index + 1} ---`);
        console.log('ID:', activity.id);
        console.log('Type:', activity.type);
        console.log('Is Deleted:', activity.isDeleted);
        console.log('Project ID:', activity.projectId);
        console.log('Project Name:', activity.projectName);
        console.log('Content:', activity.content?.substring(0, 50) + '...');
        console.log('Created At:', activity.createdAt);
        if (activity.deletedAt) {
          console.log('Deleted At:', activity.deletedAt);
        }
        console.log('');
      });
      
      // Check for Unknown Projects
      const unknownProjects = data.activities.filter(a => a.projectName === 'Unknown Project');
      if (unknownProjects.length > 0) {
        console.log(`⚠️ Found ${unknownProjects.length} activities with Unknown Project:\n`);
        unknownProjects.forEach((activity, index) => {
          console.log(`Unknown Project Activity ${index + 1}:`);
          console.log('  Project ID:', activity.projectId);
          console.log('  Comment ID:', activity.id);
          console.log('  Type:', activity.type);
          console.log('');
        });
        
        // Try to fetch projects directly
        console.log('🔍 Attempting to fetch projects directly...\n');
        for (const activity of unknownProjects) {
          if (activity.projectId) {
            try {
              // Try to fetch project from projects API
              const projectResponse = await fetch(`http://localhost:3000/api/projects/${activity.projectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (projectResponse.ok) {
                const projectData = await projectResponse.json();
                console.log(`✅ Project ${activity.projectId} found:`, {
                  name: projectData.name,
                  title: projectData.title,
                  projectCode: projectData.projectCode
                });
              } else {
                console.log(`❌ Could not fetch project ${activity.projectId}: ${projectResponse.status}`);
              }
            } catch (err) {
              console.error(`❌ Error fetching project ${activity.projectId}:`, err);
            }
          }
        }
      }
    } else {
      console.log('⚠️ No activities found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', error.message, error.stack);
  }
  
  console.log('\n✅ Debug complete!');
})();


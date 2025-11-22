/**
 * Debugging script for Projects API
 * 
 * Run this in the browser console on the dashboard page to diagnose issues
 * with project fetching for LGU-IU and MPMEC Secretariat roles.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: await debugProjectsAPI()
 */

async function debugProjectsAPI() {
  console.log('🔍 Starting Projects API Debug...\n');
  
  // Get token from cookies
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1];
  
  if (!token) {
    console.error('❌ No token found in cookies. Please log in first.');
    return;
  }
  
  console.log('✅ Token found:', token.substring(0, 20) + '...');
  
  const API_URL = 'http://localhost:3000/api';
  
  try {
    // Step 1: Check user profile
    console.log('\n📋 Step 1: Checking user profile...');
    const profileRes = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!profileRes.ok) {
      console.error(`❌ Profile fetch failed: ${profileRes.status} ${profileRes.statusText}`);
      const errorText = await profileRes.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const profileData = await profileRes.json();
    if (profileData.success && profileData.user) {
      const user = profileData.user;
      console.log('✅ User profile:', {
        id: user.id,
        name: user.name,
        role: user.role,
        subRole: user.subRole,
        implementingOfficeName: user.implementingOfficeName,
        office: user.office,
        department: user.department,
        officeName: user.officeName
      });
    } else {
      console.error('❌ Invalid profile response:', profileData);
      return;
    }
    
    // Step 2: Try fetching projects
    console.log('\n📋 Step 2: Fetching projects...');
    const projectsRes = await fetch(`${API_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`Response status: ${projectsRes.status} ${projectsRes.statusText}`);
    
    if (!projectsRes.ok) {
      console.error(`❌ Projects fetch failed: ${projectsRes.status} ${projectsRes.statusText}`);
      const errorText = await projectsRes.text();
      console.error('Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Error details:', errorJson);
        if (errorJson.debug) {
          console.error('Debug info:', errorJson.debug);
        }
      } catch (e) {
        console.error('Could not parse error as JSON');
      }
      return;
    }
    
    const projectsData = await projectsRes.json();
    console.log('✅ Projects response received');
    console.log('Response structure:', {
      success: projectsData.success,
      projectsCount: projectsData.projects?.length || 0,
      pagination: projectsData.pagination
    });
    
    if (projectsData.success && projectsData.projects) {
      console.log(`\n✅ Found ${projectsData.projects.length} projects`);
      
      if (projectsData.projects.length === 0) {
        console.warn('⚠️ No projects found. This could mean:');
        console.warn('  1. No projects match the role-based filter');
        console.warn('  2. Projects exist but implementingOfficeId/Name mismatch');
        console.warn('  3. Projects exist but workflowStatus doesn\'t match');
        
        // Check if projects exist in submissions endpoint
        console.log('\n📋 Step 3: Checking submissions endpoint...');
        const submissionsRes = await fetch(`${API_URL}/projects/secretariat/submissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json();
          if (submissionsData.success && submissionsData.projects) {
            console.log(`✅ Found ${submissionsData.projects.length} projects in submissions endpoint`);
            if (submissionsData.projects.length > 0) {
              console.warn('⚠️ Projects exist in submissions but not in main endpoint!');
              console.warn('   This suggests a filtering issue in the GET /projects endpoint.');
              console.log('\nSample project from submissions:', {
                id: submissionsData.projects[0].id,
                projectCode: submissionsData.projects[0].projectCode,
                name: submissionsData.projects[0].name,
                implementingOfficeId: submissionsData.projects[0].implementingOfficeId,
                implementingOfficeName: submissionsData.projects[0].implementingOfficeName,
                workflowStatus: submissionsData.projects[0].workflowStatus
              });
            }
          }
        }
      } else {
        console.log('\n📊 Sample projects:');
        projectsData.projects.slice(0, 3).forEach((project, index) => {
          console.log(`\nProject ${index + 1}:`, {
            id: project.id,
            projectCode: project.projectCode,
            name: project.name,
            implementingOfficeId: project.implementingOfficeId,
            implementingOfficeName: project.implementingOfficeName,
            workflowStatus: project.workflowStatus,
            status: project.status,
            hasProgress: !!project.progress
          });
        });
      }
    } else {
      console.error('❌ Invalid projects response:', projectsData);
    }
    
    // Step 4: Check backend logs
    console.log('\n📋 Step 4: Debugging Tips');
    console.log('Check the backend server console for:');
    console.log('  - 🔍 LGU-IU filtering: (for LGU-IU role)');
    console.log('  - 🔍 LGU-PMT filtering: (for MPMEC Secretariat role)');
    console.log('  - 🔍 Final whereClause for projects query:');
    console.log('  - ✅ Found X projects for...');
    console.log('  - ❌ Error messages');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
    console.error('Error stack:', error.stack);
  }
  
  console.log('\n✅ Debug complete!');
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('🔍 Projects API Debug Script Loaded');
  console.log('Run: await debugProjectsAPI()');
}


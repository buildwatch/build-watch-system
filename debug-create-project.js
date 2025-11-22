/**
 * Debugging script for Project Creation API
 * 
 * Run this in the browser console on the project creation page to diagnose issues
 * with creating projects.
 * 
 * Usage:
 * 1. Open browser console (F12) on the project creation form
 * 2. Fill out the form (or leave it as is to test with current data)
 * 3. Copy and paste this entire script
 * 4. Run: await debugCreateProject()
 * 
 * Or to test with specific data:
 * await debugCreateProject({ name: 'Test Project', ... })
 */

async function debugCreateProject(formData = null) {
  console.log('🔍 Starting Project Creation API Debug...\n');
  
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
        department: user.department
      });
      
      // Check if user has permission to create projects
      if (user.role !== 'iu' && user.role !== 'LGU-IU') {
        console.warn('⚠️ User role may not have permission to create projects');
        console.warn('   Required roles: iu, LGU-IU');
        console.warn('   User role:', user.role);
      }
    } else {
      console.error('❌ Invalid profile response:', profileData);
      return;
    }
    
    // Step 2: Get form data
    console.log('\n📋 Step 2: Collecting form data...');
    
    let projectData = formData;
    
    if (!projectData) {
      // Try to get data from the form
      console.log('📝 Attempting to extract data from form...');
      
      // Common form field selectors (adjust based on your actual form)
      const getFormValue = (selector, defaultValue = '') => {
        const element = document.querySelector(selector);
        return element ? (element.value || element.textContent || defaultValue) : defaultValue;
      };
      
      projectData = {
        projectCode: getFormValue('input[name="projectCode"], #projectCode'),
        name: getFormValue('input[name="name"], #projectName'),
        implementingOfficeName: profileData.user.implementingOfficeName || profileData.user.office || profileData.user.department || '',
        description: getFormValue('textarea[name="description"], #description'),
        category: getFormValue('select[name="category"], #category'),
        location: getFormValue('input[name="location"], #location'),
        priority: getFormValue('select[name="priority"], #priority'),
        fundingSource: getFormValue('select[name="fundingSource"], #fundingSource'),
        createdDate: getFormValue('input[name="createdDate"], #createdDate') || new Date().toISOString().split('T')[0],
        startDate: getFormValue('input[name="startDate"], #startDate'),
        targetCompletionDate: getFormValue('input[name="targetCompletionDate"], #targetCompletionDate'),
        totalBudget: getFormValue('input[name="totalBudget"], #totalBudget')
      };
      
      console.log('📊 Extracted form data:', projectData);
      
      // Check for required fields
      const requiredFields = ['projectCode', 'name', 'implementingOfficeName', 'description', 'category', 'location', 'priority', 'fundingSource', 'createdDate', 'startDate', 'targetCompletionDate', 'totalBudget'];
      const missingFields = requiredFields.filter(field => !projectData[field]);
      
      if (missingFields.length > 0) {
        console.warn('⚠️ Missing required fields:', missingFields);
        console.warn('   Please fill out the form or provide data as parameter');
        console.warn('   Example: await debugCreateProject({ projectCode: "PRJ-TEST-001", name: "Test", ... })');
        return;
      }
    }
    
    // Step 3: Validate data structure
    console.log('\n📋 Step 3: Validating data structure...');
    console.log('Project data keys:', Object.keys(projectData));
    console.log('Project data:', JSON.stringify(projectData, null, 2));
    
    // Step 4: Try to create project
    console.log('\n📋 Step 4: Attempting to create project...');
    console.log('Sending POST request to:', `${API_URL}/projects`);
    
    const createRes = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });
    
    console.log(`Response status: ${createRes.status} ${createRes.statusText}`);
    
    const responseText = await createRes.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Response is not valid JSON:', responseText);
      return;
    }
    
    if (createRes.ok) {
      console.log('✅ Project created successfully!');
      console.log('Response data:', responseData);
      if (responseData.project) {
        console.log('Created project:', {
          id: responseData.project.id,
          projectCode: responseData.project.projectCode,
          name: responseData.project.name,
          status: responseData.project.status,
          workflowStatus: responseData.project.workflowStatus
        });
      }
    } else {
      console.error(`❌ Project creation failed: ${createRes.status} ${createRes.statusText}`);
      console.error('Error response:', responseData);
      
      if (responseData.details) {
        console.error('Error details:', responseData.details);
        
        // Check for database column errors
        if (responseData.details.includes('Unknown column')) {
          console.error('🚨 DATABASE COLUMN ERROR DETECTED!');
          console.error('   This means a column in the code does not exist in the database.');
          console.error('   Check backend logs for the exact column name.');
        }
      }
      
      if (responseData.debug) {
        console.error('Debug info:', responseData.debug);
      }
      
      // Common error patterns
      if (responseData.error === 'Missing required fields') {
        console.warn('💡 Tip: Make sure all required fields are filled in the form');
      }
      
      if (responseData.details && responseData.details.includes('Duplicate entry')) {
        console.warn('💡 Tip: Project code already exists. Try a different project code.');
      }
    }
    
    // Step 5: Check backend logs
    console.log('\n📋 Step 5: Debugging Tips');
    console.log('Check the backend server console for:');
    console.log('  - 🚀 Project creation request received:');
    console.log('  - 🔍 Required fields validation:');
    console.log('  - ❌ Create project error: (if any)');
    console.log('  - ❌ Error message: (if any)');
    console.log('  - ❌ DATABASE COLUMN ERROR DETECTED: (if any)');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
    console.error('Error stack:', error.stack);
  }
  
  console.log('\n✅ Debug complete!');
}

// Helper function to test with minimal data
async function testCreateProjectMinimal() {
  const testData = {
    projectCode: `PRJ-TEST-${Date.now()}`,
    name: 'Test Project Debug',
    implementingOfficeName: 'Test Office',
    description: 'This is a test project for debugging',
    category: 'infrastructure',
    location: 'Test Location',
    priority: 'medium',
    fundingSource: 'local_fund',
    createdDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    targetCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalBudget: '1000000'
  };
  
  console.log('🧪 Testing with minimal data...');
  await debugCreateProject(testData);
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('🔍 Project Creation API Debug Script Loaded');
  console.log('Run: await debugCreateProject()');
  console.log('Or: await testCreateProjectMinimal()');
}


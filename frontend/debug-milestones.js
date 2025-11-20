// Debug script for milestone fetching issues
// Copy and paste this into the browser console

(async function debugMilestones() {
  console.log('🔍 Starting milestone debugging...');
  
  try {
    // Get auth token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }
    console.log('✅ Auth token found');
    
    // Get API URL
    const API_URL = window.location.origin.replace(':4321', ':3000') + '/api';
    console.log('📡 API URL:', API_URL);
    
    // Test 1: Check if endpoint is accessible
    console.log('\n📋 Test 1: Checking endpoint accessibility...');
    const testResponse = await fetch(`${API_URL}/projects/all-milestones`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', testResponse.status);
    console.log('Response status text:', testResponse.statusText);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('❌ Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ Error JSON:', errorJson);
        if (errorJson.message) {
          console.error('❌ Error message:', errorJson.message);
        }
        if (errorJson.details) {
          console.error('❌ Error details:', errorJson.details);
        }
      } catch (e) {
        console.error('❌ Could not parse error as JSON');
      }
    } else {
      const data = await testResponse.json();
      console.log('✅ Success! Data:', data);
      console.log('✅ Milestones count:', data.milestones?.length || 0);
      
      if (data.milestones && data.milestones.length > 0) {
        console.log('\n📋 Sample milestone:', data.milestones[0]);
        console.log('\n📋 All milestone IDs:', data.milestones.map(m => m.id));
        console.log('\n📋 Milestones with due dates:', data.milestones.filter(m => m.dueDate).length);
        
        // Check for milestones in current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        const currentMonthMilestones = data.milestones.filter(m => {
          if (!m.dueDate) return false;
          const dueDate = new Date(m.dueDate);
          return dueDate.getFullYear() === currentYear && dueDate.getMonth() + 1 === currentMonth;
        });
        
        console.log(`\n📅 Milestones in ${currentMonth}/${currentYear}:`, currentMonthMilestones.length);
        if (currentMonthMilestones.length > 0) {
          console.log('📅 Sample current month milestone:', currentMonthMilestones[0]);
        }
      }
    }
    
    // Test 2: Check user info
    console.log('\n📋 Test 2: Checking user info...');
    const userInfo = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    console.log('User ID:', userInfo.id);
    console.log('User Role:', userInfo.role);
    
    // Test 3: Check projects
    console.log('\n📋 Test 3: Checking accessible projects...');
    const projectsResponse = await fetch(`${API_URL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      console.log('✅ Projects found:', projectsData.projects?.length || 0);
      if (projectsData.projects && projectsData.projects.length > 0) {
        console.log('📋 Project IDs:', projectsData.projects.map(p => p.id));
      }
    } else {
      console.error('❌ Could not fetch projects');
    }
    
    console.log('\n✅ Debugging complete!');
    
  } catch (error) {
    console.error('❌ Debugging error:', error);
    console.error('❌ Error stack:', error.stack);
  }
})();


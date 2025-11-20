/**
 * Debug Script for EIU Project Budget Issue
 * 
 * Run this in the browser console to debug why Total Budget Allocation shows 0 in EIU projects modal.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: debugEIUProjectBudget()
 * 
 * This will show:
 * - All projects from EIU API
 * - Budget fields in each project
 * - What the modal receives when opened
 * - Comparison with other modules
 */

// Get API URL from window or use default
const API_URL = window.API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000/api' 
  : `${window.location.protocol}//${window.location.hostname}:3000/api`);

// Get auth token
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Get auth headers
function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

/**
 * Main debugging function
 */
async function debugEIUProjectBudget() {
  console.log('🔍 [EIU Budget Debug] Starting Budget Debugging...\n');
  
  try {
    // 1. Check projects from EIU API
    console.log('📅 Step 1: Fetching projects from EIU API...');
    const eiuResponse = await fetch(`${API_URL}/eiu/projects`, {
      headers: getAuthHeaders()
    });
    
    if (!eiuResponse.ok) {
      console.error('❌ Failed to fetch EIU projects:', eiuResponse.status, eiuResponse.statusText);
      return;
    }
    
    const eiuData = await eiuResponse.json();
    if (!eiuData.success || !eiuData.projects) {
      console.error('❌ No projects in EIU response');
      return;
    }
    
    console.log(`✅ Found ${eiuData.projects.length} projects from EIU API\n`);
    
    // 2. Analyze budget fields in each project
    console.log('💰 Step 2: Analyzing budget fields in EIU projects...');
    for (const project of eiuData.projects) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 Project: ${project.name || 'Unknown'} (ID: ${project.id})`);
      console.log(`${'='.repeat(80)}`);
      
      // Check all budget-related fields
      const budgetFields = {
        totalBudget: project.totalBudget,
        budgetAllocation: project.budgetAllocation,
        budget: project.budget,
        totalBudgetAllocation: project.totalBudgetAllocation,
        allocatedBudget: project.allocatedBudget,
        plannedBudget: project.plannedBudget
      };
      
      console.log('💰 Budget Fields:', budgetFields);
      
      // Find all keys that contain 'budget'
      const budgetKeys = Object.keys(project).filter(key => 
        key.toLowerCase().includes('budget') || 
        key.toLowerCase().includes('allocation')
      );
      console.log('🔑 All budget-related keys:', budgetKeys);
      
      // Calculate what the modal would use
      const calculatedBudget = parseFloat(
        project.totalBudget || 
        project.budgetAllocation || 
        project.budget || 
        project.totalBudgetAllocation ||
        project.allocatedBudget ||
        project.plannedBudget ||
        0
      );
      
      console.log('📊 Calculated Budget:', calculatedBudget);
      console.log('📊 Formatted Budget:', calculatedBudget > 0 
        ? `₱${calculatedBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : '₱0.00');
      
      // 3. Check single project endpoint
      console.log('\n🔍 Step 3: Checking single project endpoint...');
      const singleResponse = await fetch(`${API_URL}/projects/${project.id}`, {
        headers: getAuthHeaders()
      });
      
      if (singleResponse.ok) {
        const singleData = await singleResponse.json();
        if (singleData.success && singleData.project) {
          const singleProject = singleData.project;
          const singleBudgetFields = {
            totalBudget: singleProject.totalBudget,
            budgetAllocation: singleProject.budgetAllocation,
            budget: singleProject.budget,
            totalBudgetAllocation: singleProject.totalBudgetAllocation,
            allocatedBudget: singleProject.allocatedBudget,
            plannedBudget: singleProject.plannedBudget
          };
          
          console.log('💰 Single Project Endpoint Budget Fields:', singleBudgetFields);
          
          const singleBudgetKeys = Object.keys(singleProject).filter(key => 
            key.toLowerCase().includes('budget') || 
            key.toLowerCase().includes('allocation')
          );
          console.log('🔑 Single Project Endpoint budget-related keys:', singleBudgetKeys);
          
          const singleCalculatedBudget = parseFloat(
            singleProject.totalBudget || 
            singleProject.budgetAllocation || 
            singleProject.budget || 
            singleProject.totalBudgetAllocation ||
            singleProject.allocatedBudget ||
            singleProject.plannedBudget ||
            0
          );
          
          console.log('📊 Single Project Endpoint Calculated Budget:', singleCalculatedBudget);
          
          // Compare
          if (calculatedBudget !== singleCalculatedBudget) {
            console.log('⚠️ WARNING: Budget mismatch between EIU API and single project endpoint!');
            console.log(`   EIU API: ${calculatedBudget}`);
            console.log(`   Single Endpoint: ${singleCalculatedBudget}`);
          }
        }
      }
      
      // 4. Check window.assignedProjects (if available)
      if (window.assignedProjects && Array.isArray(window.assignedProjects)) {
        const windowProject = window.assignedProjects.find(p => p.id === project.id);
        if (windowProject) {
          console.log('\n🔍 Step 4: Checking window.assignedProjects...');
          const windowBudgetFields = {
            totalBudget: windowProject.totalBudget,
            budgetAllocation: windowProject.budgetAllocation,
            budget: windowProject.budget
          };
          console.log('💰 window.assignedProjects Budget Fields:', windowBudgetFields);
        }
      }
    }
    
    // 5. Check modal state
    console.log('\n🔍 Step 5: Checking modal state...');
    const modal = document.getElementById('projectDetailsModal');
    if (modal) {
      const totalBudgetElement = document.getElementById('totalBudget');
      if (totalBudgetElement) {
        console.log('💰 Modal Total Budget Element:', {
          textContent: totalBudgetElement.textContent,
          innerText: totalBudgetElement.innerText,
          innerHTML: totalBudgetElement.innerHTML
        });
      }
    }
    
    console.log('\n✅ [EIU Budget Debug] Debugging complete!');
    console.log('\n💡 Tips:');
    console.log('- Check if totalBudget field exists in EIU API response');
    console.log('- Verify single project endpoint returns totalBudget');
    console.log('- Check if modal is receiving project data correctly');
    console.log('- Compare with other modules that work correctly');
    
  } catch (error) {
    console.error('❌ [EIU Budget Debug] Error:', error);
  }
}

/**
 * Quick check for a specific project
 */
async function checkProjectBudget(projectId) {
  try {
    console.log(`🔍 Checking budget for project ${projectId}...`);
    
    // Check EIU API
    const eiuResponse = await fetch(`${API_URL}/eiu/projects`, {
      headers: getAuthHeaders()
    });
    
    if (eiuResponse.ok) {
      const eiuData = await eiuResponse.json();
      if (eiuData.success && eiuData.projects) {
        const project = eiuData.projects.find(p => p.id === projectId);
        if (project) {
          console.log('📊 EIU API Project:', {
            id: project.id,
            name: project.name,
            totalBudget: project.totalBudget,
            allKeys: Object.keys(project)
          });
        }
      }
    }
    
    // Check single project endpoint
    const singleResponse = await fetch(`${API_URL}/projects/${projectId}`, {
      headers: getAuthHeaders()
    });
    
    if (singleResponse.ok) {
      const singleData = await singleResponse.json();
      if (singleData.success && singleData.project) {
        console.log('📊 Single Project Endpoint:', {
          id: singleData.project.id,
          name: singleData.project.name,
          totalBudget: singleData.project.totalBudget,
          allKeys: Object.keys(singleData.project)
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Export functions to global scope
if (typeof window !== 'undefined') {
  window.debugEIUProjectBudget = debugEIUProjectBudget;
  window.checkProjectBudget = checkProjectBudget;
  
  console.log('✅ EIU Budget debug functions loaded!');
  console.log('Run: debugEIUProjectBudget() to start debugging');
  console.log('Run: checkProjectBudget("project-id") to check a specific project');
}


/**
 * Debug Script for Submit Update Budget Issue
 * 
 * Run this in the browser console to debug why Total Budget Assigned and Budget Utilized show 0.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: debugSubmitUpdateBudget()
 */

// Get API URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000/api' 
  : `${window.location.protocol}//${window.location.hostname}:3000/api`;

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
async function debugSubmitUpdateBudget() {
  console.log('🔍 [Submit Update Budget Debug] Starting Budget Debugging...\n');
  
  try {
    // 1. Check if elements exist
    console.log('📋 Step 1: Checking DOM elements...');
    const totalBudgetEl = document.getElementById('totalBudgetAssigned');
    const utilizedEl = document.getElementById('budgetUtilized');
    
    console.log('  - totalBudgetAssigned element:', {
      found: !!totalBudgetEl,
      currentValue: totalBudgetEl?.textContent,
      id: totalBudgetEl?.id
    });
    
    console.log('  - budgetUtilized element:', {
      found: !!utilizedEl,
      currentValue: utilizedEl?.textContent,
      id: utilizedEl?.id
    });
    
    if (!totalBudgetEl || !utilizedEl) {
      console.error('❌ Budget elements not found in DOM!');
      console.log('   Available elements with "budget" in ID:', 
        Array.from(document.querySelectorAll('[id*="budget"], [id*="Budget"]')).map(el => ({
          id: el.id,
          textContent: el.textContent
        }))
      );
    }
    
    // 2. Check if fetchBudgetData function exists
    console.log('\n📋 Step 2: Checking if fetchBudgetData function exists...');
    console.log('  - window.fetchBudgetData:', typeof window.fetchBudgetData);
    console.log('  - fetchBudgetData in scope:', typeof fetchBudgetData);
    
    // 3. Fetch from /api/home/stats
    console.log('\n📋 Step 3: Fetching budget data from /api/home/stats...');
    const token = getToken();
    if (!token) {
      console.error('❌ No authentication token found!');
      return;
    }
    
    const response = await fetch(`${API_URL}/home/stats`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch from /api/home/stats:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Response from /api/home/stats:', data);
    
    if (data.success) {
      const totalBudget = parseFloat(data.totalBudget) || 0;
      const utilizedBudget = parseFloat(data.utilizedBudget) || 0;
      const budgetUtilization = totalBudget > 0 ? (utilizedBudget / totalBudget) * 100 : 0;
      
      console.log('\n💰 Budget Data:');
      console.log('  - Total Budget:', totalBudget);
      console.log('  - Utilized Budget:', utilizedBudget);
      console.log('  - Utilization Percentage:', budgetUtilization.toFixed(1) + '%');
      
      // 4. Try to update elements manually
      console.log('\n📋 Step 4: Attempting to update elements manually...');
      
      if (totalBudgetEl) {
        const formattedTotal = totalBudget.toLocaleString('en-PH', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
        totalBudgetEl.textContent = formattedTotal;
        console.log('  ✅ Updated totalBudgetAssigned to:', formattedTotal);
        console.log('  - Element value after update:', totalBudgetEl.textContent);
      } else {
        console.error('  ❌ totalBudgetAssigned element not found!');
      }
      
      if (utilizedEl) {
        utilizedEl.textContent = budgetUtilization.toFixed(1);
        console.log('  ✅ Updated budgetUtilized to:', budgetUtilization.toFixed(1));
        console.log('  - Element value after update:', utilizedEl.textContent);
      } else {
        console.error('  ❌ budgetUtilized element not found!');
      }
      
      // 5. Check if elements were actually updated
      console.log('\n📋 Step 5: Verifying updates...');
      setTimeout(() => {
        console.log('  - totalBudgetAssigned after 1 second:', totalBudgetEl?.textContent);
        console.log('  - budgetUtilized after 1 second:', utilizedEl?.textContent);
        
        if (totalBudgetEl?.textContent === '0' || totalBudgetEl?.textContent === '0.00') {
          console.warn('  ⚠️ totalBudgetAssigned is still 0 - element may be getting reset!');
        }
        if (utilizedEl?.textContent === '0' || utilizedEl?.textContent === '0.0') {
          console.warn('  ⚠️ budgetUtilized is still 0 - element may be getting reset!');
        }
      }, 1000);
      
    } else {
      console.error('❌ API response indicates failure:', data);
    }
    
    // 6. Check projects data
    console.log('\n📋 Step 6: Checking projects data...');
    if (window.allProjects && Array.isArray(window.allProjects)) {
      console.log('  - Projects count:', window.allProjects.length);
      const totalBudgetFromProjects = window.allProjects.reduce((sum, p) => sum + parseFloat(p.totalBudget || 0), 0);
      console.log('  - Total budget from projects:', totalBudgetFromProjects);
      console.log('  - Projects with budget:', window.allProjects.filter(p => parseFloat(p.totalBudget || 0) > 0).length);
    } else {
      console.log('  - window.allProjects not found or not an array');
    }
    
    console.log('\n✅ [Submit Update Budget Debug] Debugging complete!');
    console.log('\n💡 Summary:');
    console.log('- Check if elements exist in DOM');
    console.log('- Verify /api/home/stats returns correct data');
    console.log('- Check if elements are being updated');
    console.log('- Verify elements are not being reset by other code');
    
  } catch (error) {
    console.error('❌ [Submit Update Budget Debug] Error:', error);
    console.error('Error stack:', error.stack);
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.debugSubmitUpdateBudget = debugSubmitUpdateBudget;
  
  console.log('✅ Submit Update Budget debug functions loaded!');
  console.log('Run: debugSubmitUpdateBudget() to start debugging');
}


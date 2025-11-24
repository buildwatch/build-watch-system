/**
 * 🔍 DASHBOARD RECENT PROJECTS DEBUGGING SCRIPT
 * 
 * This script helps diagnose why ProjectCard components are not displaying
 * in the "Recent Projects" section of the dashboard.
 * 
 * Instructions:
 * 1. Open the browser console (F12)
 * 2. Navigate to the dashboard page (LGU-IU or EIU)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 * 5. Review the output to identify the issue
 */

console.log('🔍 ============================================');
console.log('🔍 DASHBOARD RECENT PROJECTS DEBUGGING SCRIPT');
console.log('🔍 ============================================\n');

// STEP 1: Check if Astro-rendered project cards container exists
console.log('📋 STEP 1: Checking Astro-rendered project cards container');
const astroContainer = document.getElementById('dashboard-project-cards-astro');
if (astroContainer) {
  console.log('✅ Found: #dashboard-project-cards-astro');
  console.log('   - Hidden class:', astroContainer.classList.contains('hidden'));
  console.log('   - Children count:', astroContainer.children.length);
  console.log('   - HTML content length:', astroContainer.innerHTML.length);
  
  if (astroContainer.children.length > 0) {
    console.log('   - First child tag:', astroContainer.children[0].tagName);
    console.log('   - First child classes:', astroContainer.children[0].className);
  } else {
    console.warn('   ⚠️ Container exists but has no children!');
  }
} else {
  console.error('   ❌ NOT FOUND: #dashboard-project-cards-astro');
  console.error('   This means the Astro page did not render project cards.');
}

console.log('');

// STEP 2: Check if React project cards container exists
console.log('📋 STEP 2: Checking React project cards container');
const reactContainer = document.getElementById('dashboard-project-cards');
if (reactContainer) {
  console.log('✅ Found: #dashboard-project-cards');
  console.log('   - Parent element:', reactContainer.parentElement?.tagName);
  console.log('   - Children count:', reactContainer.children.length);
  console.log('   - Visible:', reactContainer.offsetParent !== null);
  
  if (reactContainer.children.length > 0) {
    console.log('   - First child tag:', reactContainer.children[0].tagName);
    console.log('   - First child classes:', reactContainer.children[0].className);
  } else {
    console.warn('   ⚠️ Container exists but has no children!');
  }
} else {
  console.error('   ❌ NOT FOUND: #dashboard-project-cards');
  console.error('   This means DashboardCenter.jsx did not render the container.');
}

console.log('');

// STEP 3: Check if Recent Projects section exists
console.log('📋 STEP 3: Checking Recent Projects section visibility');
const recentProjectsSection = reactContainer?.closest('.bg-white.rounded-2xl');
if (recentProjectsSection) {
  console.log('✅ Found: Recent Projects section');
  console.log('   - Visible:', recentProjectsSection.offsetParent !== null);
  console.log('   - Display style:', window.getComputedStyle(recentProjectsSection).display);
  console.log('   - Has "Recent Projects" heading:', recentProjectsSection.textContent.includes('Recent Projects'));
} else {
  console.warn('   ⚠️ Recent Projects section not found');
}

console.log('');

// STEP 4: Check DashboardCenter React component state
console.log('📋 STEP 4: Checking DashboardCenter React component');
try {
  // Try to find React component instance
  const reactRoot = document.querySelector('#root') || document.body;
  const reactFiber = reactRoot._reactInternalInstance || reactRoot._reactInternalFiber;
  
  if (reactFiber) {
    console.log('✅ React component tree found');
  } else {
    console.log('ℹ️ React component tree not accessible (this is normal)');
  }
} catch (e) {
  console.log('ℹ️ Cannot access React internals (this is normal)');
}

console.log('');

// STEP 5: Check if projects data is available
console.log('📋 STEP 5: Checking projects data availability');
try {
  // Check if projects are stored in window
  if (window.projects) {
    console.log('✅ Found: window.projects');
    console.log('   - Count:', window.projects.length);
    console.log('   - First project:', window.projects[0]?.name || 'N/A');
  } else {
    console.log('ℹ️ window.projects not found');
  }
  
  // Check localStorage for projects
  const storedProjects = localStorage.getItem('projects');
  if (storedProjects) {
    const parsed = JSON.parse(storedProjects);
    console.log('✅ Found: localStorage.projects');
    console.log('   - Count:', Array.isArray(parsed) ? parsed.length : 'Not an array');
  } else {
    console.log('ℹ️ localStorage.projects not found');
  }
} catch (e) {
  console.error('   ❌ Error checking projects data:', e);
}

console.log('');

// STEP 6: Check API response
console.log('📋 STEP 6: Checking API response');
console.log('   ℹ️ To check API response, look for fetch calls in Network tab');
console.log('   ℹ️ Expected endpoints:');
console.log('      - /api/eiu/projects (for EIU dashboard)');
console.log('      - /api/projects (for LGU-IU dashboard)');

console.log('');

// STEP 7: Manual injection test
console.log('📋 STEP 7: Testing manual injection');
if (astroContainer && reactContainer) {
  console.log('   ℹ️ Attempting manual injection...');
  try {
    const astroChildren = Array.from(astroContainer.children);
    console.log('   - Astro children to move:', astroChildren.length);
    
    if (astroChildren.length > 0) {
      astroChildren.forEach((child, index) => {
        reactContainer.appendChild(child);
        console.log(`   ✅ Moved child ${index + 1}`);
      });
      console.log('   ✅ Manual injection completed!');
      console.log('   - React container now has:', reactContainer.children.length, 'children');
    } else {
      console.warn('   ⚠️ No children to move');
    }
  } catch (e) {
    console.error('   ❌ Error during manual injection:', e);
  }
} else {
  console.warn('   ⚠️ Cannot test injection - missing containers');
}

console.log('');

// STEP 8: Summary and recommendations
console.log('📋 STEP 8: SUMMARY AND RECOMMENDATIONS');
console.log('===========================================\n');

const issues = [];
const recommendations = [];

if (!astroContainer) {
  issues.push('Astro container (#dashboard-project-cards-astro) not found');
  recommendations.push('Check if projects.length > 0 in the Astro page (EIUDashboard.astro or ImplementingOfficeDashboard.astro)');
  recommendations.push('Verify that projects are being fetched correctly from the API');
}

if (!reactContainer) {
  issues.push('React container (#dashboard-project-cards) not found');
  recommendations.push('Check if DashboardCenter.jsx is rendering the container');
  recommendations.push('Verify that !isSystemAdmin && projects.length > 0 condition is true');
}

if (astroContainer && reactContainer && astroContainer.children.length > 0 && reactContainer.children.length === 0) {
  issues.push('Cards exist in Astro container but not injected into React container');
  recommendations.push('Check if the useEffect in DashboardCenter.jsx (lines 353-381) is running');
  recommendations.push('Verify that the injection logic is executing after DOM is ready');
  recommendations.push('Check browser console for any errors during injection');
}

if (astroContainer && astroContainer.children.length === 0) {
  issues.push('Astro container exists but has no project cards');
  recommendations.push('Check if projects array is empty in the Astro page');
  recommendations.push('Verify API response contains projects');
  recommendations.push('Check if projects are being filtered out (e.g., by approval status)');
}

if (issues.length === 0) {
  console.log('✅ No obvious issues found!');
  console.log('   If cards are still not visible, check:');
  console.log('   1. CSS visibility/display properties');
  console.log('   2. React component re-renders');
  console.log('   3. Timing issues with DOM ready state');
} else {
  console.log('⚠️ ISSUES FOUND:');
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  
  console.log('\n💡 RECOMMENDATIONS:');
  recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
}

console.log('\n🔍 ============================================');
console.log('🔍 DEBUGGING COMPLETE');
console.log('🔍 ============================================');


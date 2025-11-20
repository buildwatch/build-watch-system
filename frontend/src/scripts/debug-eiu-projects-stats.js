/**
 * Debug Script for EIU Projects Stats (Active Projects & Average Progress)
 * 
 * Run this in the browser console on the "My Projects" page to debug why:
 * - Active Projects shows 0 (should include delayed projects)
 * - Average Progress shows 10% (verify if correct)
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Navigate to "My Projects" page
 * 3. Copy and paste this entire script
 * 4. Run: debugEIUProjectsStats()
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
async function debugEIUProjectsStats() {
  console.log('🔍 [EIU Projects Stats Debug] Starting Stats Debugging...\n');
  
  try {
    // 1. Check if window.assignedProjects exists
    console.log('📋 Step 1: Checking window.assignedProjects...');
    const assignedProjects = window.assignedProjects || [];
    console.log('  - window.assignedProjects found:', !!window.assignedProjects);
    console.log('  - Projects count:', assignedProjects.length);
    
    if (assignedProjects.length === 0) {
      console.warn('⚠️ No projects in window.assignedProjects, fetching from API...');
      
      // Fetch from API
      const token = getToken();
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }
      
      const response = await fetch(`${API_URL}/eiu/projects`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.projects) {
          console.log('✅ Fetched projects from API:', data.projects.length);
          assignedProjects.push(...data.projects);
        }
      }
    }
    
    // 2. Analyze each project's status
    console.log('\n📋 Step 2: Analyzing project statuses...');
    const statusBreakdown = {};
    assignedProjects.forEach(project => {
      const status = project.status || 'unknown';
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = [];
      }
      statusBreakdown[status].push({
        id: project.id,
        name: project.name,
        status: status
      });
    });
    
    console.log('  - Status breakdown:', statusBreakdown);
    console.log('  - Projects by status:');
    Object.keys(statusBreakdown).forEach(status => {
      console.log(`    ${status}: ${statusBreakdown[status].length} projects`);
    });
    
    // 3. Calculate Active Projects (should include 'ongoing' and 'delayed')
    console.log('\n📋 Step 3: Calculating Active Projects...');
    const activeProjects = assignedProjects.filter(p => 
      p.status === 'ongoing' || p.status === 'delayed'
    );
    console.log('  - Active Projects (ongoing + delayed):', activeProjects.length);
    console.log('  - Active projects details:', activeProjects.map(p => ({
      name: p.name,
      status: p.status
    })));
    
    // 4. Calculate Average Progress
    console.log('\n📋 Step 4: Calculating Average Progress...');
    let totalProgress = 0;
    let projectsWithProgress = 0;
    
    assignedProjects.forEach(project => {
      const progress = parseFloat(
        project.overallProgress || 
        project.progress?.overall || 
        project.progress?.overallProgress || 
        0
      );
      
      console.log(`  - ${project.name}:`, {
        status: project.status,
        overallProgress: project.overallProgress,
        progressObject: project.progress,
        calculatedProgress: progress,
        allProgressKeys: Object.keys(project).filter(k => k.toLowerCase().includes('progress'))
      });
      
      if (progress > 0 || project.status === 'ongoing' || project.status === 'delayed') {
        totalProgress += progress;
        projectsWithProgress++;
      }
    });
    
    const averageProgress = assignedProjects.length > 0 
      ? totalProgress / assignedProjects.length 
      : 0;
    
    console.log('  - Total Progress Sum:', totalProgress);
    console.log('  - Projects Count:', assignedProjects.length);
    console.log('  - Projects With Progress:', projectsWithProgress);
    console.log('  - Average Progress:', averageProgress.toFixed(2) + '%');
    console.log('  - Rounded Average Progress:', Math.round(averageProgress) + '%');
    
    // 5. Check DOM elements
    console.log('\n📋 Step 5: Checking DOM elements...');
    const activeProjectsEl = document.getElementById('activeProjects');
    const averageProgressEl = document.getElementById('averageProgress');
    
    console.log('  - activeProjects element:', {
      found: !!activeProjectsEl,
      currentValue: activeProjectsEl?.textContent,
      expectedValue: activeProjects.length
    });
    
    console.log('  - averageProgress element:', {
      found: !!averageProgressEl,
      currentValue: averageProgressEl?.textContent,
      expectedValue: Math.round(averageProgress) + '%'
    });
    
    // 6. Update elements if they're wrong
    console.log('\n📋 Step 6: Updating elements if needed...');
    if (activeProjectsEl) {
      const currentValue = parseInt(activeProjectsEl.textContent) || 0;
      if (currentValue !== activeProjects.length) {
        activeProjectsEl.textContent = activeProjects.length;
        console.log(`  ✅ Updated activeProjects from ${currentValue} to ${activeProjects.length}`);
      } else {
        console.log(`  ✅ activeProjects is already correct: ${currentValue}`);
      }
    }
    
    if (averageProgressEl) {
      const expectedValue = Math.round(averageProgress) + '%';
      const currentValue = averageProgressEl.textContent;
      if (currentValue !== expectedValue) {
        averageProgressEl.textContent = expectedValue;
        console.log(`  ✅ Updated averageProgress from ${currentValue} to ${expectedValue}`);
      } else {
        console.log(`  ✅ averageProgress is already correct: ${currentValue}`);
      }
    }
    
    // 7. Summary
    console.log('\n✅ [EIU Projects Stats Debug] Debugging complete!');
    console.log('\n💡 Summary:');
    console.log(`- Total Projects: ${assignedProjects.length}`);
    console.log(`- Active Projects (ongoing + delayed): ${activeProjects.length}`);
    console.log(`- Average Progress: ${averageProgress.toFixed(2)}% (rounded: ${Math.round(averageProgress)}%)`);
    console.log('\n📊 Project Status Breakdown:');
    Object.keys(statusBreakdown).forEach(status => {
      console.log(`  - ${status}: ${statusBreakdown[status].length} project(s)`);
      statusBreakdown[status].forEach(p => {
        console.log(`    • ${p.name}`);
      });
    });
    
    // Return data for further inspection
    return {
      totalProjects: assignedProjects.length,
      activeProjects: activeProjects.length,
      averageProgress: averageProgress,
      roundedAverageProgress: Math.round(averageProgress),
      statusBreakdown: statusBreakdown,
      projects: assignedProjects.map(p => ({
        name: p.name,
        status: p.status,
        overallProgress: p.overallProgress || p.progress?.overall || 0
      }))
    };
    
  } catch (error) {
    console.error('❌ [EIU Projects Stats Debug] Error:', error);
    console.error('Error stack:', error.stack);
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.debugEIUProjectsStats = debugEIUProjectsStats;
  
  console.log('✅ EIU Projects Stats debug functions loaded!');
  console.log('Run: debugEIUProjectsStats() to start debugging');
}


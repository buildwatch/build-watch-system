/**
 * COMPREHENSIVE DEBUGGING SCRIPT FOR HOME PAGE
 * 
 * This script helps diagnose:
 * 1. Average Progress calculation accuracy
 * 2. Why only 2 projects are showing on the map
 * 
 * INSTRUCTIONS:
 * 1. Open the browser console (F12)
 * 2. Navigate to the home page (http://localhost:4321/home)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter
 * 
 * The script will:
 * - Check the /home/stats API endpoint
 * - Verify average progress calculation
 * - Check the /home/project-locations endpoint
 * - Compare with /projects/public endpoint
 * - Identify approval status issues
 */

console.log('🔍 ============================================================');
console.log('🔍 HOME PAGE & MAP DEBUGGING SCRIPT');
console.log('🔍 ============================================================');

(async function debugHomeAndMap() {
  try {
    const getApiUrl = () => {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
      }
      return `${protocol}//${hostname}/api`;
    };
    
    const apiUrl = getApiUrl();
    const timestamp = new Date().getTime();
    
    // ============================================================
    // STEP 1: Check /home/stats endpoint
    // ============================================================
    console.log('\n📊 STEP 1: Checking /home/stats Endpoint');
    console.log('============================================================');
    
    const statsResponse = await fetch(`${apiUrl}/home/stats?_t=${timestamp}`);
    if (!statsResponse.ok) {
      console.error('❌ Failed to fetch /home/stats:', statsResponse.status);
      return;
    }
    
    const statsData = await statsResponse.json();
    console.log('Stats API Response:', statsData);
    
    console.log('\n📈 Average Progress Analysis:');
    console.log('   Reported Average Progress:', statsData.averageProgress, '%');
    console.log('   Total Projects:', statsData.totalProjects);
    console.log('   Ongoing Projects:', statsData.ongoingProjects);
    console.log('   Completed Projects:', statsData.completedProjects);
    
    // ============================================================
    // STEP 2: Check /home/project-locations endpoint
    // ============================================================
    console.log('\n📍 STEP 2: Checking /home/project-locations Endpoint');
    console.log('============================================================');
    
    const locationsResponse = await fetch(`${apiUrl}/home/project-locations?_t=${timestamp}`);
    if (!locationsResponse.ok) {
      console.error('❌ Failed to fetch /home/project-locations:', locationsResponse.status);
      return;
    }
    
    const locationsData = await locationsResponse.json();
    const locations = locationsData.locations || [];
    console.log('Project Locations API Response:', locationsData);
    console.log('Total locations/projects from API:', locations.length);
    
    // Analyze each project
    console.log('\n📋 Project Details from /home/project-locations:');
    locations.forEach((loc, index) => {
      console.log(`\n   Project ${index + 1}:`, {
        id: loc.id,
        name: loc.name,
        status: loc.status,
        location: loc.location,
        progress: loc.progress,
        hasApproval: {
          MPMEC: loc.approvedByMPMEC,
          Secretariat: loc.approvedBySecretariat
        }
      });
    });
    
    // ============================================================
    // STEP 3: Check /projects/public endpoint
    // ============================================================
    console.log('\n📋 STEP 3: Checking /projects/public Endpoint');
    console.log('============================================================');
    
    let publicData = null;
    const publicResponse = await fetch(`${apiUrl}/projects/public?page=1&limit=100&_t=${timestamp}`);
    if (publicResponse.ok) {
      publicData = await publicResponse.json();
      console.log('Public projects response:', publicData);
      
      if (publicData.success && publicData.projects) {
        console.log('Total public projects:', publicData.projects.length);
        
        // Group by status
        const statusCounts = {};
        publicData.projects.forEach(p => {
          const status = (p.status || 'unknown').toLowerCase();
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log('Public projects by status:', statusCounts);
        
        // Check approval status
        const approvalCounts = {
          mpmec: 0,
          secretariat: 0,
          both: 0,
          neither: 0
        };
        
        publicData.projects.forEach(p => {
          const hasMPMEC = p.approvedByMPMEC === true;
          const hasSecretariat = p.approvedBySecretariat === true;
          
          if (hasMPMEC && hasSecretariat) {
            approvalCounts.both++;
          } else if (hasMPMEC) {
            approvalCounts.mpmec++;
          } else if (hasSecretariat) {
            approvalCounts.secretariat++;
          } else {
            approvalCounts.neither++;
          }
        });
        
        console.log('Approval status breakdown:', approvalCounts);
        
        // Find projects missing from locations
        const locationIds = new Set(locations.map(l => l.id));
        const missingFromLocations = publicData.projects.filter(p => !locationIds.has(p.id));
        
        if (missingFromLocations.length > 0) {
          console.warn('\n⚠️ Projects in /projects/public but NOT in /home/project-locations:');
          missingFromLocations.forEach(p => {
            console.warn('   -', p.name, `(${p.projectCode})`, {
              status: p.status,
              approvedByMPMEC: p.approvedByMPMEC,
              approvedBySecretariat: p.approvedBySecretariat,
              location: p.location
            });
          });
        }
      }
    } else {
      console.error('❌ Failed to fetch /projects/public:', publicResponse.status);
    }
    
    // Store locationIds in outer scope for STEP 6
    const locationIds = locations.length > 0 ? new Set(locations.map(l => l.id)) : new Set();
    
    // ============================================================
    // STEP 4: Check individual project progress
    // ============================================================
    console.log('\n📊 STEP 4: Checking Individual Project Progress');
    console.log('============================================================');
    
    // Declare variables in outer scope for use in STEP 7
    let totalProgress = 0;
    let projectsWithProgress = 0;
    let calculatedAverageAll = 0;
    let calculatedAverageNonZero = 0;
    const progressDetails = [];
    
    if (publicData && publicData.projects) {
      
      for (const project of publicData.projects) {
        const progress = parseFloat(project.overallProgress || project.progress?.overall || 0);
        progressDetails.push({
          name: project.name,
          code: project.projectCode,
          progress: progress,
          status: project.status
        });
        
        if (progress > 0) {
          totalProgress += progress;
          projectsWithProgress++;
        }
      }
      
      // Calculate average including ALL projects (even 0% progress) - matches backend logic
      calculatedAverageAll = progressDetails.length > 0 
        ? Math.round((totalProgress / progressDetails.length) * 100) / 100 
        : 0;
      
      // Calculate average only for projects with progress > 0 (old logic)
      calculatedAverageNonZero = projectsWithProgress > 0 
        ? Math.round((totalProgress / projectsWithProgress) * 100) / 100 
        : 0;
      
      console.log('Progress Details:');
      progressDetails.forEach(p => {
        console.log(`   ${p.name} (${p.code}): ${p.progress}% - ${p.status}`);
      });
      
      console.log('\n📊 Average Progress Calculation:');
      console.log('   Total Progress Sum:', totalProgress);
      console.log('   Total Projects:', progressDetails.length);
      console.log('   Projects with Progress > 0:', projectsWithProgress);
      console.log('   Calculated Average (ALL projects):', calculatedAverageAll, '%');
      console.log('   Calculated Average (only > 0%):', calculatedAverageNonZero, '%');
      console.log('   API Reported Average:', statsData.averageProgress, '%');
      console.log('   Match (ALL projects):', Math.abs(calculatedAverageAll - statsData.averageProgress) < 0.01 ? '✅' : '❌ MISMATCH');
      
      if (Math.abs(calculatedAverageAll - statsData.averageProgress) > 0.01) {
        console.warn('   ⚠️ Average progress mismatch detected!');
        console.warn('   Backend includes ALL projects (even 0% progress) in average calculation.');
        console.warn('   This is the correct behavior - average should reflect all approved projects.');
        console.warn('   If mismatch persists, check:');
        console.warn('   1. Backend uses "public" role for progress calculation');
        console.warn('   2. All projects are included in the calculation (not just those with progress > 0)');
        console.warn('   3. Progress calculation method matches between endpoints');
      } else {
        console.log('   ✅ Average progress calculation matches backend!');
      }
    }
    
    // ============================================================
    // STEP 5: Check map markers
    // ============================================================
    console.log('\n🗺️ STEP 5: Checking Map Markers');
    console.log('============================================================');
    
    const mapContainers = document.querySelectorAll('[id*="map"], [class*="map"]');
    console.log('Map containers found:', mapContainers.length);
    
    const markers = document.querySelectorAll('.leaflet-marker-icon, .custom-marker');
    console.log('Leaflet markers found in DOM:', markers.length);
    console.log('Expected markers (from API):', locations.length);
    console.log('Match:', markers.length === locations.length ? '✅' : '❌ MISMATCH');
    
    if (markers.length < locations.length) {
      console.warn('   ⚠️ Fewer markers on map than projects in API response!');
      console.warn('   Missing:', locations.length - markers.length, 'markers');
    }
    
    // ============================================================
    // STEP 6: Check approval status for all projects
    // ============================================================
    console.log('\n✅ STEP 6: Checking Approval Status');
    console.log('============================================================');
    
    if (publicData && publicData.projects) {
      const approvalIssues = [];
      
      publicData.projects.forEach(p => {
        const hasMPMEC = p.approvedByMPMEC === true;
        const hasSecretariat = p.approvedBySecretariat === true;
        const isInLocations = locationIds.has(p.id);
        
        if (!hasMPMEC && !hasSecretariat) {
          approvalIssues.push({
            project: p.name,
            code: p.projectCode,
            issue: 'Not approved by MPMEC or Secretariat',
            inLocations: isInLocations
          });
        } else if (!isInLocations) {
          approvalIssues.push({
            project: p.name,
            code: p.projectCode,
            issue: 'Approved but missing from locations',
            approvedByMPMEC: hasMPMEC,
            approvedBySecretariat: hasSecretariat
          });
        }
      });
      
      if (approvalIssues.length > 0) {
        console.warn('⚠️ Approval Status Issues Found:');
        approvalIssues.forEach(issue => {
          console.warn('   -', issue.project, `(${issue.code}):`, issue.issue);
        });
      } else {
        console.log('✅ All projects have proper approval status');
      }
    }
    
    // ============================================================
    // STEP 7: Recommendations
    // ============================================================
    console.log('\n💡 STEP 7: Recommendations');
    console.log('============================================================');
    
    if (locations.length < publicData?.projects?.length) {
      console.log('🔧 ISSUE: project-locations returns fewer projects than projects/public');
      console.log('   Expected:', publicData.projects.length);
      console.log('   Got:', locations.length);
      console.log('   SOLUTION: Check backend/routes/home.js - /home/project-locations endpoint');
      console.log('   ACTION: Verify approval status filtering logic');
    }
    
    if (markers.length < locations.length) {
      console.log('🔧 ISSUE: Fewer markers on map than projects in API');
      console.log('   Expected:', locations.length);
      console.log('   Got:', markers.length);
      console.log('   SOLUTION: Check CentralizedProjectMap component');
      console.log('   ACTION: Verify projects prop is passed correctly and coordinate generation');
    }
    
    if (progressDetails.length > 0 && Math.abs(calculatedAverageAll - statsData.averageProgress) > 0.01) {
      console.log('🔧 ISSUE: Average progress mismatch');
      console.log('   Frontend calculated (ALL projects):', calculatedAverageAll, '%');
      console.log('   Backend reported:', statsData.averageProgress, '%');
      console.log('   SOLUTION: Backend may be using different projects or calculation method');
      console.log('   ACTION: Check if backend uses "public" role for progress calculation');
    } else if (progressDetails.length > 0) {
      console.log('✅ Average progress calculation verified in STEP 4');
    }
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n✅ Debugging complete!');
    console.log('============================================================');
    console.log('\n📋 SUMMARY:');
    console.log('   - Stats API projects:', statsData.totalProjects);
    console.log('   - Project locations:', locations.length);
    console.log('   - Public projects:', publicData?.projects?.length || 0);
    console.log('   - Map markers:', markers.length);
    console.log('   - Average progress:', statsData.averageProgress, '%');
    console.log('   - Status:', 
      locations.length === publicData?.projects?.length && 
      markers.length === locations.length ? '✅ All Good' : '❌ Issues Found'
    );
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error('Stack trace:', error.stack);
  }
})();


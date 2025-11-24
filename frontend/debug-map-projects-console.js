/**
 * DEBUGGING SCRIPT FOR CENTRALIZED PROJECT MAP
 * 
 * This script helps diagnose why only 2 projects are showing on the map
 * 
 * INSTRUCTIONS:
 * 1. Open the browser console (F12)
 * 2. Navigate to the projects page (http://localhost:4321/projects)
 * 3. Switch to Map view
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter
 * 
 * The script will:
 * - Check the API endpoint response
 * - Verify project data structure
 * - Check map component props
 * - Identify filtering issues
 */

console.log('🔍 ============================================================');
console.log('🔍 CENTRALIZED PROJECT MAP DEBUGGING SCRIPT');
console.log('🔍 ============================================================');

(async function debugMapProjects() {
  try {
    // Step 1: Check API endpoint directly
    console.log('\n📡 STEP 1: Checking API Endpoint');
    console.log('============================================================');
    
    const getApiUrl = () => {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
      }
      return `${protocol}//${hostname}/api`;
    };
    
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/home/project-locations`;
    const timestamp = new Date().getTime();
    
    console.log('API URL:', endpoint);
    console.log('Fetching with timestamp:', timestamp);
    
    const response = await fetch(`${endpoint}?_t=${timestamp}`);
    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    
    // Step 2: Analyze project locations data
    console.log('\n📊 STEP 2: Analyzing Project Locations Data');
    console.log('============================================================');
    
    const locations = data.locations || data.projects || [];
    console.log('Total locations/projects from API:', locations.length);
    
    if (locations.length === 0) {
      console.warn('⚠️ No projects found in API response!');
      return;
    }
    
    // Group by status
    const statusCounts = {};
    locations.forEach(loc => {
      const status = (loc.status || 'unknown').toLowerCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('Projects by status:', statusCounts);
    
    // Check for completed projects
    const completedProjects = locations.filter(p => 
      p.status?.toLowerCase() === 'completed' || 
      p.status?.toLowerCase() === 'complete'
    );
    console.log('Completed projects:', completedProjects.length);
    if (completedProjects.length > 0) {
      console.log('Completed project details:', completedProjects.map(p => ({
        id: p.id,
        name: p.name,
        code: p.projectCode,
        status: p.status,
        location: p.location
      })));
    }
    
    // Check for approved projects
    const approvedProjects = locations.filter(p => 
      p.approvedByMPMEC || 
      p.approvedBySecretariat ||
      p.approvedBySecretariat === true ||
      p.approvedByMPMEC === true
    );
    console.log('Approved projects (MPMEC or Secretariat):', approvedProjects.length);
    
    // Check location data
    console.log('\n📍 STEP 3: Checking Location Data');
    console.log('============================================================');
    locations.forEach((loc, index) => {
      console.log(`Project ${index + 1}:`, {
        id: loc.id,
        name: loc.name,
        code: loc.projectCode,
        status: loc.status,
        location: loc.location,
        hasLatLng: !!(loc.latitude && loc.longitude),
        latitude: loc.latitude,
        longitude: loc.longitude,
        approvedByMPMEC: loc.approvedByMPMEC,
        approvedBySecretariat: loc.approvedBySecretariat
      });
    });
    
    // Step 4: Check projects from /projects/public endpoint
    console.log('\n📋 STEP 4: Checking /projects/public Endpoint');
    console.log('============================================================');
    
    let publicData = null;
    const publicResponse = await fetch(`${apiUrl}/projects/public?page=1&limit=100&_t=${timestamp}`);
    if (publicResponse.ok) {
      publicData = await publicResponse.json();
      console.log('Public projects response:', publicData);
      
      if (publicData.success && publicData.projects) {
        console.log('Total public projects:', publicData.projects.length);
        const publicStatusCounts = {};
        publicData.projects.forEach(p => {
          const status = (p.status || 'unknown').toLowerCase();
          publicStatusCounts[status] = (publicStatusCounts[status] || 0) + 1;
        });
        console.log('Public projects by status:', publicStatusCounts);
        
        // Compare with project-locations
        console.log('\n🔍 STEP 5: Comparing Endpoints');
        console.log('============================================================');
        console.log('project-locations count:', locations.length);
        console.log('projects/public count:', publicData.projects.length);
        console.log('Difference:', publicData.projects.length - locations.length);
        
        // Find projects in public but not in locations
        const publicProjectIds = new Set(publicData.projects.map(p => p.id));
        const locationProjectIds = new Set(locations.map(l => l.id));
        const missingInLocations = publicData.projects.filter(p => !locationProjectIds.has(p.id));
        const missingInPublic = locations.filter(l => !publicProjectIds.has(l.id));
        
        if (missingInLocations.length > 0) {
          console.warn('⚠️ Projects in /projects/public but NOT in /home/project-locations:');
          missingInLocations.forEach(p => {
            console.warn('  -', p.name, `(${p.projectCode})`, '- Status:', p.status, '- Approved:', {
              MPMEC: p.approvedByMPMEC,
              Secretariat: p.approvedBySecretariat
            });
          });
        }
        
        if (missingInPublic.length > 0) {
          console.warn('⚠️ Projects in /home/project-locations but NOT in /projects/public:');
          missingInPublic.forEach(l => {
            console.warn('  -', l.name, `(${l.projectCode})`, '- Status:', l.status);
          });
        }
      }
    } else {
      console.error('❌ Failed to fetch /projects/public:', publicResponse.status);
    }
    
    // Step 6: Check React component state (if available)
    console.log('\n⚛️ STEP 6: Checking React Component State');
    console.log('============================================================');
    
    // Try to find the map component in the DOM
    const mapContainers = document.querySelectorAll('[id*="map"], [class*="map"]');
    console.log('Map containers found:', mapContainers.length);
    mapContainers.forEach((container, index) => {
      console.log(`Map container ${index + 1}:`, {
        id: container.id,
        className: container.className,
        hasMarkers: container.querySelectorAll('.leaflet-marker-icon, .custom-marker').length
      });
    });
    
    // Check for Leaflet markers
    const markers = document.querySelectorAll('.leaflet-marker-icon, .custom-marker');
    console.log('Leaflet markers found in DOM:', markers.length);
    
    // Step 7: Check React component state
    console.log('\n⚛️ STEP 7: Checking React Component State');
    console.log('============================================================');
    
    // Try to access React component state via window or global
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected - you can inspect component state in React DevTools');
    }
    
    // Check if projects are stored in any global state
    const possibleStateKeys = ['projects', 'projectData', 'mapProjects', 'allProjects'];
    possibleStateKeys.forEach(key => {
      if (window[key]) {
        console.log(`Found window.${key}:`, window[key]);
      }
    });
    
    // Step 8: Recommendations
    console.log('\n💡 STEP 8: Recommendations');
    console.log('============================================================');
    
    if (locations.length < publicData?.projects?.length) {
      console.log('🔧 ISSUE FOUND: project-locations endpoint returns fewer projects than projects/public');
      console.log('   Expected:', publicData.projects.length, 'projects');
      console.log('   Got:', locations.length, 'projects');
      console.log('   Missing:', publicData.projects.length - locations.length, 'projects');
      console.log('   Possible causes:');
      console.log('   1. Status filtering in backend (checking for "complete" vs "completed")');
      console.log('   2. Approval status filtering (MPMEC or Secretariat approval required)');
      console.log('   3. Deleted projects not being excluded properly');
      console.log('   4. Status normalization issue (backend uses "complete", frontend expects "completed")');
      console.log('   SOLUTION: Check backend/routes/home.js - /home/project-locations endpoint');
      console.log('   ACTION: Verify status values match between endpoints');
    }
    
    if (completedProjects.length === 0 && publicData?.projects?.some(p => 
      p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'complete'
    )) {
      console.log('🔧 ISSUE FOUND: Completed projects exist but not in project-locations');
      const completedInPublic = publicData.projects.filter(p => 
        p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'complete'
      );
      console.log('   Completed projects in /projects/public:', completedInPublic.length);
      completedInPublic.forEach(p => {
        console.log('     -', p.name, `(${p.projectCode})`, '- Status:', p.status, '- Approved:', {
          MPMEC: p.approvedByMPMEC,
          Secretariat: p.approvedBySecretariat
        });
      });
      console.log('   SOLUTION: Backend may be filtering out completed projects or using wrong status value');
      console.log('   ACTION: Check if backend uses "complete" (DB) vs "completed" (frontend)');
    }
    
    if (markers.length < locations.length) {
      console.log('🔧 ISSUE FOUND: Fewer markers on map than projects in API response');
      console.log('   Expected markers:', locations.length);
      console.log('   Actual markers:', markers.length);
      console.log('   Missing:', locations.length - markers.length, 'markers');
      console.log('   Possible causes:');
      console.log('   1. Projects missing location data (latitude/longitude)');
      console.log('   2. Projects outside Santa Cruz bounds (filtered by map bounds)');
      console.log('   3. Map component not receiving all projects as props');
      console.log('   4. Coordinate generation failing for some projects');
      console.log('   SOLUTION: Check CentralizedProjectMap component props and coordinate generation');
      console.log('   ACTION: Verify projects prop is passed correctly to MiniMap component');
    }
    
    // Check for specific project
    const targetProject = locations.find(p => 
      p.projectCode === 'PRJ-MEO-20250090' || 
      p.name?.includes('Rehabilitation and Improvement of Drainage System')
    );
    if (targetProject) {
      console.log('\n🎯 TARGET PROJECT FOUND IN API:');
      console.log('   Name:', targetProject.name);
      console.log('   Code:', targetProject.projectCode);
      console.log('   Status:', targetProject.status);
      console.log('   Location:', targetProject.location);
      console.log('   Has coordinates:', !!(targetProject.latitude && targetProject.longitude));
      console.log('   Approved:', {
        MPMEC: targetProject.approvedByMPMEC,
        Secretariat: targetProject.approvedBySecretariat
      });
    } else {
      console.log('\n⚠️ TARGET PROJECT NOT FOUND IN API RESPONSE');
      console.log('   Looking for: PRJ-MEO-20250090 or "Rehabilitation and Improvement of Drainage System"');
      console.log('   This project should be in the API response but is missing!');
    }
    
    console.log('\n✅ Debugging complete!');
    console.log('============================================================');
    console.log('\n📋 SUMMARY:');
    console.log('   - API projects:', locations.length);
    console.log('   - Public projects:', publicData?.projects?.length || 0);
    console.log('   - Completed projects:', completedProjects.length);
    console.log('   - Map markers:', markers.length);
    console.log('   - Status:', locations.length === publicData?.projects?.length ? '✅ Match' : '❌ Mismatch');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error('Stack trace:', error.stack);
  }
})();


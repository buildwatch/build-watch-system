/**
 * Debug script for Calendar Milestone Progress
 * 
 * Run this in the browser console to debug milestone progress issues in the calendar tooltip.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: debugMilestoneProgress()
 * 
 * Or run specific functions:
 * - debugMilestoneProgress() - Main debugging function
 * - getMilestoneEvents() - Get all milestone events from calendar
 * - getMilestoneData(milestoneId) - Get specific milestone data from API
 */

// Get API URL from window or use default
const API_URL = window.API_URL || 'http://localhost:3000/api';

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
async function debugMilestoneProgress() {
  console.log('🔍 [Debug] Starting Milestone Progress Debugging...\n');
  
  try {
    // 1. Get calendar events from the component state
    console.log('📅 Step 1: Checking calendar events in component state...');
    const calendarEvents = await getMilestoneEvents();
    console.log(`Found ${calendarEvents.length} milestone events\n`);
    
    // 2. For each milestone event, fetch detailed data from API
    console.log('📊 Step 2: Fetching detailed milestone data from API...');
    for (const event of calendarEvents) {
      if (event.milestoneId) {
        console.log(`\n--- Milestone: ${event.milestoneTitle || 'Unknown'} (ID: ${event.milestoneId}) ---`);
        console.log('Event Data:', {
          milestoneProgress: event.milestoneProgress,
          milestoneWeight: event.milestoneWeight,
          milestoneStatus: event.milestoneStatus,
          projectProgress: event.progress
        });
        
        // Fetch detailed milestone data
        const milestoneData = await getMilestoneData(event.milestoneId);
        if (milestoneData) {
          console.log('API Milestone Data:', {
            progress: milestoneData.progress,
            weight: milestoneData.weight,
            status: milestoneData.status,
            timelineStatus: milestoneData.timelineStatus,
            budgetStatus: milestoneData.budgetStatus,
            physicalStatus: milestoneData.physicalStatus,
            timelineWeight: milestoneData.timelineWeight,
            budgetWeight: milestoneData.budgetWeight,
            physicalWeight: milestoneData.physicalWeight
          });
          
          // Calculate expected progress
          const calculatedProgress = calculateMilestoneProgress(milestoneData);
          console.log('Calculated Progress:', calculatedProgress);
          console.log('Expected Display:', `${calculatedProgress.toFixed(1)}%/${parseFloat(milestoneData.weight || 0).toFixed(1)}%`);
        }
      }
    }
    
    console.log('\n✅ [Debug] Debugging complete!');
    console.log('\n💡 Tips:');
    console.log('- Check if milestone.progress is 0 in the API response');
    console.log('- Verify milestone division statuses (timeline, budget, physical)');
    console.log('- Check if milestone submissions exist and are approved');
    
  } catch (error) {
    console.error('❌ [Debug] Error:', error);
  }
}

/**
 * Get milestone events from calendar
 */
function getMilestoneEvents() {
  return new Promise((resolve) => {
    // Try to get events from React component state
    // This is a workaround - we'll need to access the component's state
    const events = [];
    
    // Check if we can access the calendar events from the DOM or global state
    if (window.__CALENDAR_EVENTS__) {
      resolve(window.__CALENDAR_EVENTS__.filter(e => e.eventSubType === 'milestone_deadline'));
      return;
    }
    
    // Alternative: Try to find events in React DevTools
    console.warn('⚠️ Could not find calendar events in global state.');
    console.log('💡 Try:');
    console.log('1. Open React DevTools');
    console.log('2. Find DashboardCenter component');
    console.log('3. Check calendarEvents state');
    console.log('4. Or manually set: window.__CALENDAR_EVENTS__ = [your events array]');
    
    resolve(events);
  });
}

/**
 * Get milestone data from API
 */
async function getMilestoneData(milestoneId) {
  try {
    const response = await fetch(`${API_URL}/projects/all-milestones`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.milestones) {
        const milestone = data.milestones.find(m => m.id === milestoneId);
        return milestone || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching milestone data:', error);
    return null;
  }
}

/**
 * Calculate milestone progress from division statuses
 */
function calculateMilestoneProgress(milestone) {
  // If progress is already set and > 0, use it
  if (milestone.progress && parseFloat(milestone.progress) > 0) {
    return parseFloat(milestone.progress);
  }
  
  // Calculate from division statuses
  let progress = 0;
  const weight = parseFloat(milestone.weight || 0);
  
  if (milestone.timelineStatus && milestone.budgetStatus && milestone.physicalStatus) {
    // Each division contributes equally (33.33% of milestone weight)
    const timelineWeight = parseFloat(milestone.timelineWeight || weight / 3);
    const budgetWeight = parseFloat(milestone.budgetWeight || weight / 3);
    const physicalWeight = parseFloat(milestone.physicalWeight || weight / 3);
    
    // Calculate progress based on division completion
    // This is a simplified calculation - actual progress might be more complex
    const timelineProgress = (milestone.timelineStatus === 'completed' || milestone.timelineStatus === 'approved') ? timelineWeight : 0;
    const budgetProgress = (milestone.budgetStatus === 'completed' || milestone.budgetStatus === 'approved') ? budgetWeight : 0;
    const physicalProgress = (milestone.physicalStatus === 'completed' || milestone.physicalStatus === 'approved') ? physicalWeight : 0;
    
    progress = timelineProgress + budgetProgress + physicalProgress;
  }
  
  return progress;
}

// Export functions to global scope
if (typeof window !== 'undefined') {
  window.debugMilestoneProgress = debugMilestoneProgress;
  window.getMilestoneEvents = getMilestoneEvents;
  window.getMilestoneData = getMilestoneData;
  window.calculateMilestoneProgress = calculateMilestoneProgress;
  
  console.log('✅ Debug functions loaded!');
  console.log('Run: debugMilestoneProgress() to start debugging');
}


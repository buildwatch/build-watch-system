/**
 * Detailed Debug Script for Milestone Progress Calculation
 * 
 * Run this in the browser console to debug milestone progress issues.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: debugMilestoneProgressDetailed()
 * 
 * This will show:
 * - All milestone data from the API
 * - Division statuses and weights
 * - Budget utilization calculations
 * - Step-by-step progress calculation
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
async function debugMilestoneProgressDetailed() {
  console.log('🔍 [Detailed Debug] Starting Milestone Progress Debugging...\n');
  
  try {
    // 1. Get all milestones from API
    console.log('📅 Step 1: Fetching milestones from API...');
    const response = await fetch(`${API_URL}/projects/all-milestones`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch milestones:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    if (!data.success || !data.milestones) {
      console.error('❌ No milestones in response');
      return;
    }
    
    console.log(`✅ Found ${data.milestones.length} milestones\n`);
    
    // 2. For each milestone, analyze progress calculation
    for (const milestone of data.milestones) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 Milestone: ${milestone.title || 'Unknown'} (ID: ${milestone.id})`);
      console.log(`${'='.repeat(80)}`);
      
      // Basic info
      console.log('\n📋 Basic Information:');
      console.log({
        status: milestone.status,
        weight: milestone.weight,
        progress: milestone.progress,
        plannedBudget: milestone.plannedBudget,
        usedBudget: milestone.usedBudget
      });
      
      // Division info
      console.log('\n📊 Division Information:');
      console.log({
        timelineStatus: milestone.timelineStatus,
        timelineWeight: milestone.timelineWeight,
        budgetStatus: milestone.budgetStatus,
        budgetWeight: milestone.budgetWeight,
        physicalStatus: milestone.physicalStatus,
        physicalWeight: milestone.physicalWeight
      });
      
      // Calculate progress step by step
      console.log('\n🧮 Progress Calculation:');
      const milestoneWeight = parseFloat(milestone.weight || 0);
      const plannedBudget = parseFloat(milestone.plannedBudget || milestone.budgetPlanned || 0);
      const usedBudget = parseFloat(milestone.usedBudget || 0);
      
      // Get division weights
      const timelineWeight = parseFloat(milestone.timelineWeight || milestoneWeight / 3);
      const budgetWeight = parseFloat(milestone.budgetWeight || milestoneWeight / 3);
      const physicalWeight = parseFloat(milestone.physicalWeight || milestoneWeight / 3);
      
      console.log(`  Division Weights: Timeline=${timelineWeight.toFixed(2)}%, Budget=${budgetWeight.toFixed(2)}%, Physical=${physicalWeight.toFixed(2)}%`);
      
      // Calculate timeline progress
      let actualTimelineProgress = 0;
      if (milestone.timelineStatus === 'completed' || milestone.timelineStatus === 'approved' || milestone.timelineStatus === 'iu_approved' || milestone.timelineStatus === 'secretariat_approved') {
        actualTimelineProgress = timelineWeight;
        console.log(`  ✅ Timeline: ${actualTimelineProgress.toFixed(2)}% (Status: ${milestone.timelineStatus})`);
      } else if (milestone.timelineStatus === 'in_progress' || milestone.timelineStatus === 'ongoing') {
        actualTimelineProgress = timelineWeight * 0.5;
        console.log(`  ⏳ Timeline: ${actualTimelineProgress.toFixed(2)}% (Status: ${milestone.timelineStatus} - 50%)`);
      } else {
        console.log(`  ❌ Timeline: 0% (Status: ${milestone.timelineStatus || 'pending'})`);
      }
      
      // Calculate budget progress
      let actualBudgetProgress = 0;
      if (milestone.budgetStatus === 'completed' || milestone.budgetStatus === 'approved' || milestone.budgetStatus === 'iu_approved' || milestone.budgetStatus === 'secretariat_approved') {
        if (plannedBudget > 0 && usedBudget > 0) {
          const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
          actualBudgetProgress = budgetWeight * budgetUtilizationRatio;
          console.log(`  ✅ Budget: ${actualBudgetProgress.toFixed(2)}% (Status: ${milestone.budgetStatus}, Utilization: ${(budgetUtilizationRatio * 100).toFixed(1)}%)`);
          console.log(`     Budget Details: Used ₱${usedBudget.toLocaleString()} / Planned ₱${plannedBudget.toLocaleString()}`);
        } else {
          actualBudgetProgress = budgetWeight;
          console.log(`  ✅ Budget: ${actualBudgetProgress.toFixed(2)}% (Status: ${milestone.budgetStatus}, No budget data - using full weight)`);
        }
      } else if (milestone.budgetStatus === 'in_progress' || milestone.budgetStatus === 'ongoing') {
        if (plannedBudget > 0 && usedBudget > 0) {
          const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
          actualBudgetProgress = budgetWeight * budgetUtilizationRatio * 0.5;
          console.log(`  ⏳ Budget: ${actualBudgetProgress.toFixed(2)}% (Status: ${milestone.budgetStatus}, Utilization: ${(budgetUtilizationRatio * 100).toFixed(1)}% - 50%)`);
        } else {
          actualBudgetProgress = budgetWeight * 0.5;
          console.log(`  ⏳ Budget: ${actualBudgetProgress.toFixed(2)}% (Status: ${milestone.budgetStatus} - 50%)`);
        }
      } else {
        console.log(`  ❌ Budget: 0% (Status: ${milestone.budgetStatus || 'pending'})`);
      }
      
      // Calculate physical progress
      let actualPhysicalProgress = 0;
      if (milestone.physicalStatus === 'completed' || milestone.physicalStatus === 'approved' || milestone.physicalStatus === 'iu_approved' || milestone.physicalStatus === 'secretariat_approved') {
        actualPhysicalProgress = physicalWeight;
        console.log(`  ✅ Physical: ${actualPhysicalProgress.toFixed(2)}% (Status: ${milestone.physicalStatus})`);
      } else if (milestone.physicalStatus === 'in_progress' || milestone.physicalStatus === 'ongoing') {
        actualPhysicalProgress = physicalWeight * 0.5;
        console.log(`  ⏳ Physical: ${actualPhysicalProgress.toFixed(2)}% (Status: ${milestone.physicalStatus} - 50%)`);
      } else {
        console.log(`  ❌ Physical: 0% (Status: ${milestone.physicalStatus || 'pending'})`);
      }
      
      // Total calculated progress
      const calculatedProgress = actualTimelineProgress + actualBudgetProgress + actualPhysicalProgress;
      console.log(`\n  📈 Total Calculated Progress: ${calculatedProgress.toFixed(2)}%`);
      console.log(`  📊 Display Value: ${calculatedProgress.toFixed(1)}%/${milestoneWeight.toFixed(1)}%`);
      console.log(`  📋 Database Progress: ${milestone.progress || 0}%`);
      
      // Check calendar events
      if (window.__CALENDAR_EVENTS__) {
        const calendarEvent = window.__CALENDAR_EVENTS__.find(e => e.milestoneId === milestone.id);
        if (calendarEvent) {
          console.log(`\n  📅 Calendar Event Progress: ${calendarEvent.milestoneProgress || 0}%`);
          console.log(`  📅 Calendar Event Weight: ${calendarEvent.milestoneWeight || 0}%`);
        }
      }
      
      // Issues detection
      console.log('\n🔍 Issues Detection:');
      if (calculatedProgress === 0 && milestone.status === 'completed') {
        console.log('  ⚠️ WARNING: Milestone is completed but calculated progress is 0!');
        if (!milestone.timelineStatus && !milestone.budgetStatus && !milestone.physicalStatus) {
          console.log('  ⚠️ REASON: Division statuses are missing!');
        }
        if (plannedBudget === 0 || usedBudget === 0) {
          console.log('  ⚠️ REASON: Budget data is missing!');
        }
      }
      if (milestone.progress === 0 && calculatedProgress > 0) {
        console.log('  ✅ Calculated progress is available but not stored in database');
      }
    }
    
    console.log('\n✅ [Detailed Debug] Debugging complete!');
    console.log('\n💡 Tips:');
    console.log('- Check if division statuses (timelineStatus, budgetStatus, physicalStatus) are available');
    console.log('- Verify budget data (plannedBudget, usedBudget) is present');
    console.log('- Check if milestone submissions exist and are approved');
    console.log('- Review the calculation logic above for each milestone');
    
  } catch (error) {
    console.error('❌ [Detailed Debug] Error:', error);
  }
}

/**
 * Quick check for a specific milestone
 */
async function checkMilestone(milestoneId) {
  try {
    const response = await fetch(`${API_URL}/projects/all-milestones`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.milestones) {
        const milestone = data.milestones.find(m => m.id === milestoneId);
        if (milestone) {
          console.log('📊 Milestone Data:', milestone);
          return milestone;
        } else {
          console.log('❌ Milestone not found');
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Export functions to global scope
if (typeof window !== 'undefined') {
  window.debugMilestoneProgressDetailed = debugMilestoneProgressDetailed;
  window.checkMilestone = checkMilestone;
  
  console.log('✅ Detailed debug functions loaded!');
  console.log('Run: debugMilestoneProgressDetailed() to start debugging');
  console.log('Run: checkMilestone("milestone-id") to check a specific milestone');
}


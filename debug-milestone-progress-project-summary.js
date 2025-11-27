// ============================================
// MILESTONE PROGRESS DEBUGGING SCRIPT
// For Project Summary & Report - Milestones Tab
// ============================================
// Copy and paste this entire script into your browser console
// while viewing the Milestones tab in Project Summary & Report

(function() {
  console.log('🔍 ========== PROJECT SUMMARY MILESTONE PROGRESS DEBUG SCRIPT ==========');
  
  // Find the milestone "Site Preparation and Planning"
  const milestoneTitle = 'Site Preparation and Planning';
  
  // Get API URL
  const getApiUrl = window.getApiUrl || function() {
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProd 
      ? `${window.location.protocol}//${window.location.hostname}/api`
      : 'http://localhost:3000/api';
  };
  const API_URL = getApiUrl();
  
  // Get token
  const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  
  if (!token) {
    console.error('❌ No authentication token found!');
    return;
  }
  
  console.log('✅ Token found:', token.substring(0, 20) + '...');
  console.log('✅ API URL:', API_URL);
  
  // Get selected project ID from the dropdown
  const projectSelect = document.querySelector('select[class*="select"], select');
  let selectedProjectId = null;
  
  if (projectSelect) {
    selectedProjectId = projectSelect.value;
    console.log('✅ Project ID from dropdown:', selectedProjectId);
  } else {
    // Try to get from React state or window
    selectedProjectId = window.selectedProject?.id || 
                        document.querySelector('[data-project-id]')?.getAttribute('data-project-id') ||
                        new URLSearchParams(window.location.search).get('projectId');
    console.log('✅ Project ID from fallback:', selectedProjectId);
  }
  
  if (!selectedProjectId) {
    console.error('❌ No project ID found!');
    console.log('💡 Please select a project from the dropdown first');
    return;
  }
  
  console.log('✅ Project ID:', selectedProjectId);
  
  // Fetch project milestones and submissions
  async function debugMilestoneProgress() {
    try {
      console.log('\n📡 Fetching project milestones...');
      const milestonesResponse = await fetch(`${API_URL}/projects/${selectedProjectId}/milestones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!milestonesResponse.ok) {
        console.error('❌ Failed to fetch milestones:', milestonesResponse.status, milestonesResponse.statusText);
        return;
      }
      
      const milestonesData = await milestonesResponse.json();
      console.log('✅ Milestones data fetched:', milestonesData);
      
      const milestones = milestonesData.milestones || milestonesData.data || [];
      
      // Find the milestone
      let milestone = milestones.find(m => 
        m.title === milestoneTitle || 
        m.title?.toLowerCase().includes('site preparation') ||
        m.title?.toLowerCase().includes('planning')
      );
      
      if (!milestone) {
        console.error('❌ Milestone not found!');
        console.log('Available milestones:', milestones.map(m => m.title));
        return;
      }
      
      console.log('\n📊 ========== MILESTONE DATA ==========');
      console.log('Milestone:', milestone);
      console.log('Milestone ID:', milestone.id);
      console.log('Milestone Title:', milestone.title);
      console.log('Milestone Weight:', milestone.weight);
      console.log('Milestone Status:', milestone.status);
      console.log('Milestone Progress (from API):', milestone.progress);
      console.log('Planned Budget:', milestone.plannedBudget || milestone.budgetPlanned);
      console.log('Used Budget (from milestone):', milestone.usedBudget);
      
      // Fetch submissions
      console.log('\n📡 Fetching milestone submissions...');
      const submissionsResponse = await fetch(`${API_URL}/milestones/milestone-submissions?projectId=${selectedProjectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        const submissions = submissionsData.submissions || submissionsData.data || [];
        
        console.log('✅ Submissions fetched:', submissions.length);
        
        // Filter submissions for this milestone
        const milestoneSubmissions = submissions.filter(s => s.milestoneId === milestone.id);
        console.log(`✅ Found ${milestoneSubmissions.length} submissions for this milestone`);
        
        // Find approved submission
        const approvedSubmission = milestoneSubmissions.find(s => 
          s.status === 'approved' || s.status === 'iu_approved'
        );
        
        if (approvedSubmission) {
          console.log('\n📝 ========== APPROVED SUBMISSION DATA ==========');
          console.log('Approved Submission:', approvedSubmission);
          console.log('Submission Used Budget:', approvedSubmission.usedBudget);
          console.log('Submission Budget Utilization:', approvedSubmission.budgetUtilizationPercentage);
          console.log('Submission Planned Budget:', approvedSubmission.plannedBudget || approvedSubmission.budgetPlanned);
          
          // Attach to milestone for calculation
          milestone.usedBudget = milestone.usedBudget || parseFloat(approvedSubmission.usedBudget || 0);
          milestone.submissions = milestoneSubmissions;
        } else {
          console.log('⚠️ No approved submission found');
        }
      } else {
        console.warn('⚠️ Failed to fetch submissions:', submissionsResponse.status);
      }
      
      // Get division data
      console.log('\n📊 ========== DIVISION DATA ==========');
      console.log('Timeline Weight:', milestone.timelineWeight);
      console.log('Budget Weight:', milestone.budgetWeight);
      console.log('Physical Weight:', milestone.physicalWeight);
      console.log('Timeline Status:', milestone.timelineStatus);
      console.log('Budget Status:', milestone.budgetStatus);
      console.log('Physical Status:', milestone.physicalStatus);
      
      // Calculate progress using the same logic
      console.log('\n🧮 ========== PROGRESS CALCULATION ==========');
      
      const milestoneWeight = parseFloat(milestone.weight || 0);
      const timelineDivWeight = parseFloat(milestone.timelineWeight || milestoneWeight / 3);
      const budgetDivWeight = parseFloat(milestone.budgetWeight || milestoneWeight / 3);
      const physicalDivWeight = parseFloat(milestone.physicalWeight || milestoneWeight / 3);
      
      console.log('Division Weights:', {
        timeline: timelineDivWeight,
        budget: budgetDivWeight,
        physical: physicalDivWeight,
        total: timelineDivWeight + budgetDivWeight + physicalDivWeight,
        milestoneWeight: milestoneWeight
      });
      
      // Get budget data
      let plannedBudget = parseFloat(milestone.plannedBudget || milestone.budgetPlanned || 0);
      let usedBudget = parseFloat(milestone.usedBudget || 0);
      
      // Try to get from submission
      if ((plannedBudget === 0 || usedBudget === 0) && milestone.submissions && Array.isArray(milestone.submissions)) {
        const approvedSubmission = milestone.submissions.find(s => 
          s.status === 'approved' || s.status === 'iu_approved'
        );
        if (approvedSubmission) {
          if (plannedBudget === 0) plannedBudget = parseFloat(approvedSubmission.plannedBudget || approvedSubmission.budgetPlanned || 0);
          if (usedBudget === 0) usedBudget = parseFloat(approvedSubmission.usedBudget || 0);
          console.log('📝 Using budget data from submission:', { plannedBudget, usedBudget });
        }
      }
      
      console.log('Budget Data:', {
        plannedBudget,
        usedBudget,
        utilizationRatio: plannedBudget > 0 ? (usedBudget / plannedBudget) : 0,
        utilizationPercent: plannedBudget > 0 ? ((usedBudget / plannedBudget) * 100).toFixed(2) + '%' : 'N/A'
      });
      
      // Calculate division progress
      let actualTimelineProgress = 0;
      let actualBudgetProgress = 0;
      let actualPhysicalProgress = 0;
      
      // Timeline
      if (milestone.timelineStatus === 'completed' || milestone.timelineStatus === 'approved' || milestone.timelineStatus === 'iu_approved' || milestone.timelineStatus === 'secretariat_approved') {
        actualTimelineProgress = timelineDivWeight;
        console.log('✅ Timeline: Approved → Full weight:', actualTimelineProgress);
      } else if (milestone.timelineStatus === 'in_progress' || milestone.timelineStatus === 'ongoing') {
        actualTimelineProgress = timelineDivWeight * 0.5;
        console.log('⏳ Timeline: In Progress → Half weight:', actualTimelineProgress);
      } else {
        console.log('❌ Timeline: Not started → 0');
      }
      
      // Budget
      if (milestone.budgetStatus === 'completed' || milestone.budgetStatus === 'approved' || milestone.budgetStatus === 'iu_approved' || milestone.budgetStatus === 'secretariat_approved') {
        if (plannedBudget > 0 && usedBudget > 0) {
          const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
          actualBudgetProgress = budgetDivWeight * budgetUtilizationRatio;
          console.log('✅ Budget: Approved with utilization →', {
            utilizationRatio: budgetUtilizationRatio,
            budgetDivWeight,
            actualBudgetProgress
          });
        } else {
          actualBudgetProgress = budgetDivWeight;
          console.log('✅ Budget: Approved (no budget data) → Full weight:', actualBudgetProgress);
        }
      } else if (milestone.budgetStatus === 'in_progress' || milestone.budgetStatus === 'ongoing') {
        if (plannedBudget > 0 && usedBudget > 0) {
          const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
          actualBudgetProgress = budgetDivWeight * budgetUtilizationRatio * 0.5;
          console.log('⏳ Budget: In Progress with utilization →', {
            utilizationRatio: budgetUtilizationRatio,
            budgetDivWeight,
            actualBudgetProgress
          });
        } else {
          actualBudgetProgress = budgetDivWeight * 0.5;
          console.log('⏳ Budget: In Progress (no budget data) → Half weight:', actualBudgetProgress);
        }
      } else {
        console.log('❌ Budget: Not started → 0');
      }
      
      // Physical
      if (milestone.physicalStatus === 'completed' || milestone.physicalStatus === 'approved' || milestone.physicalStatus === 'iu_approved' || milestone.physicalStatus === 'secretariat_approved') {
        actualPhysicalProgress = physicalDivWeight;
        console.log('✅ Physical: Approved → Full weight:', actualPhysicalProgress);
      } else if (milestone.physicalStatus === 'in_progress' || milestone.physicalStatus === 'ongoing') {
        actualPhysicalProgress = physicalDivWeight * 0.5;
        console.log('⏳ Physical: In Progress → Half weight:', actualPhysicalProgress);
      } else {
        console.log('❌ Physical: Not started → 0');
      }
      
      // Calculate total
      const calculatedProgress = actualTimelineProgress + actualBudgetProgress + actualPhysicalProgress;
      
      console.log('\n🎯 ========== FINAL CALCULATION ==========');
      console.log('Timeline Progress:', actualTimelineProgress.toFixed(2) + '%');
      console.log('Budget Progress:', actualBudgetProgress.toFixed(2) + '%');
      console.log('Physical Progress:', actualPhysicalProgress.toFixed(2) + '%');
      console.log('TOTAL CALCULATED PROGRESS:', calculatedProgress.toFixed(2) + '%');
      console.log('Expected Progress (from Calendar): 96.6% or 96.7%');
      console.log('Current Display:', milestone.progress || 'N/A');
      
      // Check what's displayed in the UI
      const milestoneCards = Array.from(document.querySelectorAll('[class*="border-gray-200"]'));
      const targetCard = milestoneCards.find(card => 
        card.textContent?.includes(milestoneTitle)
      );
      
      if (targetCard) {
        const progressText = targetCard.textContent?.match(/\d+\.\d+%/);
        console.log('\n📺 ========== DISPLAYED VALUE ==========');
        console.log('Displayed Progress in UI:', progressText ? progressText[0] : 'Not found');
      }
      
      // Check if calculation matches expected
      const expectedProgress = 96.6;
      const difference = Math.abs(calculatedProgress - expectedProgress);
      
      console.log('\n✅ ========== VALIDATION ==========');
      if (difference < 1) {
        console.log('✅ Calculation is CORRECT! (within 1% of expected)');
      } else {
        console.log('❌ Calculation is WRONG!');
        console.log('Expected:', expectedProgress + '%');
        console.log('Calculated:', calculatedProgress.toFixed(2) + '%');
        console.log('Difference:', difference.toFixed(2) + '%');
        console.log('\n🔍 Possible issues:');
        if (actualTimelineProgress === timelineDivWeight && actualBudgetProgress === budgetDivWeight && actualPhysicalProgress === physicalDivWeight) {
          console.log('⚠️ All divisions are showing full weight - budget utilization might not be applied correctly');
        }
        if (plannedBudget === 0 || usedBudget === 0) {
          console.log('⚠️ Budget data is missing - cannot calculate accurate budget progress');
          console.log('   - plannedBudget:', plannedBudget);
          console.log('   - usedBudget:', usedBudget);
          console.log('   - milestone.usedBudget:', milestone.usedBudget);
          console.log('   - approvedSubmission?.usedBudget:', milestone.submissions?.find(s => s.status === 'approved')?.usedBudget);
        }
        if (milestone.budgetStatus !== 'approved' && milestone.budgetStatus !== 'completed') {
          console.log('⚠️ Budget status is not approved/completed:', milestone.budgetStatus);
        }
      }
      
      // Return data for further inspection
      return {
        milestone,
        calculatedProgress,
        expectedProgress: 96.6,
        difference,
        divisionProgress: {
          timeline: actualTimelineProgress,
          budget: actualBudgetProgress,
          physical: actualPhysicalProgress
        },
        budgetData: {
          plannedBudget,
          usedBudget,
          utilizationRatio: plannedBudget > 0 ? (usedBudget / plannedBudget) : 0
        }
      };
      
    } catch (error) {
      console.error('❌ Error during debugging:', error);
      console.error('Error stack:', error.stack);
    }
  }
  
  // Run the debug function
  debugMilestoneProgress().then(result => {
    if (result) {
      console.log('\n📦 ========== DEBUG RESULT OBJECT ==========');
      console.log('You can inspect this object:', result);
      window.debugMilestoneResult = result;
      console.log('💡 Result stored in: window.debugMilestoneResult');
    }
  });
  
  console.log('\n🔍 ========== DEBUG SCRIPT COMPLETE ==========');
  console.log('💡 Check the logs above to identify the issue');
})();


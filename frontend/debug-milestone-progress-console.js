/**
 * Browser Console Debugging Script for Milestone Progress
 * 
 * INSTRUCTIONS:
 * 1. Open the Progress Timeline page in your browser
 * 2. Select a project from the dropdown
 * 3. Open browser console (F12 -> Console tab)
 * 4. Copy and paste this ENTIRE script into the console
 * 5. Press Enter to run
 */

(function debugMilestoneProgress() {
  console.log('%c🔍 MILESTONE PROGRESS DEBUGGING SCRIPT', 'color: #2563eb; font-size: 16px; font-weight: bold;');
  console.log('='.repeat(60));
  
  // Try to access selectedProject from various sources
  let project = null;
  
  // Method 1: Check window.selectedProject
  if (window.selectedProject) {
    project = window.selectedProject;
    console.log('✅ Found selectedProject in window scope');
  } else {
    // Method 2: Try to get from the page's JavaScript
    console.warn('⚠️  selectedProject not in window scope. Trying alternative methods...');
    
    // Check if there's a project selector
    const projectSelect = document.querySelector('select[id*="project"], select[name*="project"]');
    if (projectSelect && projectSelect.value) {
      console.log('Found project selector with value:', projectSelect.value);
      console.warn('⚠️  Please ensure a project is selected and the page has fully loaded.');
    }
    
    // Try to access from global scope (might be in a closure)
    try {
      // Check if there's a way to access it
      if (typeof getSelectedProject === 'function') {
        project = getSelectedProject();
      }
    } catch (e) {
      // Ignore
    }
  }
  
  if (!project) {
    console.error('❌ selectedProject is not available.');
    console.log('💡 TROUBLESHOOTING:');
    console.log('   1. Make sure you are on the Progress Timeline page');
    console.log('   2. Select a project from the dropdown');
    console.log('   3. Wait for the page to fully load');
    console.log('   4. Run this script again');
    console.log('\n📋 Alternative: Check the page source for project data');
    
    // Try to find project data in the DOM
    const projectCards = document.querySelectorAll('[data-project-id]');
    if (projectCards.length > 0) {
      console.log(`\n✅ Found ${projectCards.length} project card(s) in DOM`);
      console.log('You can manually inspect project data by checking the page\'s JavaScript variables.');
    }
    
    return;
  }
  
  console.log('\n📋 PROJECT INFORMATION:');
  console.log('Project Name:', project.name);
  console.log('Project Code:', project.projectCode);
  console.log('Project ID:', project.id);
  console.log('Project Status:', project.status);
  console.log('Overall Progress:', project.overallProgress || project.progress?.overall || 0, '%');
  console.log('Timeline Progress:', project.timelineProgress || project.progress?.timeline || 0, '%');
  console.log('Budget Progress:', project.budgetProgress || project.progress?.budget || 0, '%');
  console.log('Physical Progress:', project.physicalProgress || project.progress?.physical || 0, '%');
  
  // Check milestones structure
  console.log('\n📊 MILESTONES DATA STRUCTURE:');
  console.log('selectedProject.milestones type:', typeof project.milestones);
  console.log('selectedProject.milestones isArray:', Array.isArray(project.milestones));
  console.log('selectedProject.milestones:', project.milestones);
  
  // Extract milestones array
  let milestones = [];
  if (Array.isArray(project.milestones)) {
    milestones = project.milestones;
    console.log('✅ Milestones is a direct array');
  } else if (project.milestones && Array.isArray(project.milestones.milestones)) {
    milestones = project.milestones.milestones;
    console.log('✅ Milestones is nested in milestones.milestones');
  } else if (project.milestones && typeof project.milestones === 'object') {
    const milestoneValues = Object.values(project.milestones);
    milestones = milestoneValues.filter(item => item && typeof item === 'object' && item.id);
    console.log('✅ Milestones extracted from object values');
  } else {
    console.error('❌ Cannot extract milestones array');
  }
  
  console.log('Total Milestones Found:', milestones.length);
  
  // Check if calculateMilestoneProgress function exists
  console.log('\n🔧 FUNCTION AVAILABILITY:');
  console.log('calculateMilestoneProgress exists:', typeof window.calculateMilestoneProgress === 'function');
  console.log('displayProjectMilestones exists:', typeof window.displayProjectMilestones === 'function');
  
  // Prepare progressData
  const progressData = {
    progress: {
      overall: parseFloat(project.overallProgress || project.progress?.overall || 0),
      timeline: parseFloat(project.timelineProgress || project.progress?.timeline || 0),
      budget: parseFloat(project.budgetProgress || project.progress?.budget || 0),
      physical: parseFloat(project.physicalProgress || project.progress?.physical || 0)
    },
    milestones: milestones.map(m => ({
      id: m.id,
      progress: m.progress || 0
    }))
  };
  
  console.log('\n📈 PROGRESS DATA PREPARED:');
  console.log('Progress Data:', progressData);
  
  // Debug each milestone
  console.log('\n🎯 MILESTONE DETAILS:');
  console.log('='.repeat(60));
  
  milestones.forEach((milestone, index) => {
    console.log(`\n${index + 1}. Milestone: ${milestone.title}`);
    console.log('   ID:', milestone.id);
    console.log('   Status:', milestone.status);
    console.log('   Weight:', milestone.weight, '%');
    console.log('   Progress (from DB):', milestone.progress || 0, '%');
    console.log('   Timeline Status:', milestone.timelineStatus || 'N/A');
    console.log('   Budget Status:', milestone.budgetStatus || 'N/A');
    console.log('   Physical Status:', milestone.physicalStatus || 'N/A');
    
    // Check if milestone is completed
    const isCompleted = milestone.status === 'completed' || milestone.status === 'approved' ||
                       (milestone.timelineStatus === 'approved' && milestone.budgetStatus === 'approved' && milestone.physicalStatus === 'approved');
    console.log('   Is Completed:', isCompleted);
    
    // Calculate expected progress
    let expectedProgress = milestone.progress || 0;
    
    if (isCompleted) {
      const milestoneWeight = parseFloat(milestone.weight || 0);
      if (milestoneWeight === 100) {
        expectedProgress = parseFloat(project.overallProgress || project.progress?.overall || 0);
        console.log('   ✅ Milestone is completed with 100% weight');
        console.log('   Expected Progress (from project overall):', expectedProgress, '%');
      } else {
        expectedProgress = parseFloat(project.overallProgress || project.progress?.overall || 0);
        console.log('   ✅ Milestone is completed');
        console.log('   Expected Progress (from project overall):', expectedProgress, '%');
      }
    }
    
    // Try to call calculateMilestoneProgress if available
    if (typeof window.calculateMilestoneProgress === 'function') {
      try {
        const calculatedProgress = window.calculateMilestoneProgress(milestone, progressData);
        console.log('   Calculated Progress (from function):', calculatedProgress, '%');
        
        if (calculatedProgress === 0 && isCompleted) {
          console.warn('   ⚠️  WARNING: Calculated progress is 0% but milestone is completed!');
          console.warn('   This indicates a problem with calculateMilestoneProgress function.');
        }
      } catch (error) {
        console.error('   ❌ Error calling calculateMilestoneProgress:', error);
      }
    } else {
      console.warn('   ⚠️  calculateMilestoneProgress function not available in window scope');
      console.warn('   This means the function is not exported to window. Check the code.');
    }
    
    // Check milestone submissions if available
    if (milestone.submissions && Array.isArray(milestone.submissions)) {
      const approvedSubmissions = milestone.submissions.filter(s => 
        s.status === 'approved' || s.status === 'iu_approved'
      );
      console.log('   Approved Submissions:', approvedSubmissions.length);
      
      if (approvedSubmissions.length > 0) {
        const latestSubmission = approvedSubmissions[0];
        console.log('   Latest Approved Submission:');
        console.log('     Budget Utilization:', latestSubmission.budgetUtilizationPercentage || 0, '%');
        console.log('     Milestone Utilization:', latestSubmission.milestoneUtilizationPercentage || 0, '%');
        console.log('     Used Budget:', latestSubmission.usedBudget || 0);
      }
    } else {
      console.log('   Submissions: Not available in milestone data');
    }
    
    console.log('   Expected Progress:', expectedProgress.toFixed(2), '%');
    const currentProgress = typeof milestone.progress === 'number' ? milestone.progress : parseFloat(milestone.progress || 0);
    console.log('   Current Progress (from DB):', currentProgress.toFixed(2), '%');
    
    if (Math.abs(expectedProgress - (milestone.progress || 0)) > 0.01) {
      console.warn('   ⚠️  MISMATCH: Expected', expectedProgress.toFixed(2), '% but milestone.progress is', (milestone.progress || 0).toFixed(2), '%');
    }
  });
  
  // Check DOM elements
  console.log('\n🌐 DOM ELEMENTS:');
  const container = document.getElementById('projectMilestonesContainer');
  console.log('projectMilestonesContainer exists:', !!container);
  
  if (container) {
    const milestoneCards = container.querySelectorAll('[id^="milestone-"]');
    console.log('Milestone cards in DOM:', milestoneCards.length);
    
    // Check progress display in DOM
    milestoneCards.forEach((card, index) => {
      const progressElement = card.querySelector('.text-xl.font-bold.text-yellow-600');
      if (progressElement) {
        console.log(`Card ${index + 1} progress display:`, progressElement.textContent);
      }
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('='.repeat(60));
  
  if (!Array.isArray(project.milestones) && !project.milestones?.milestones) {
    console.warn('⚠️  Milestones data structure is not as expected. Check backend API response.');
  }
  
  if (typeof window.calculateMilestoneProgress !== 'function') {
    console.warn('⚠️  calculateMilestoneProgress function is not available. Check if it\'s exported to window scope.');
    console.warn('   The function needs to be exported: window.calculateMilestoneProgress = calculateMilestoneProgress;');
  }
  
  if (project.overallProgress === 0 || !project.overallProgress) {
    console.warn('⚠️  Project overall progress is 0 or not available. Completed milestones should still show progress.');
  }
  
  console.log('\n✅ Debugging complete! Check the output above for issues.');
  console.log('='.repeat(60));
  
  // Return summary
  return {
    project: {
      id: project.id,
      name: project.name,
      overallProgress: project.overallProgress || project.progress?.overall || 0
    },
    milestones: milestones.map(m => ({
      id: m.id,
      title: m.title,
      status: m.status,
      weight: m.weight,
      progress: m.progress || 0,
      isCompleted: m.status === 'completed' || m.status === 'approved' ||
                   (m.timelineStatus === 'approved' && m.budgetStatus === 'approved' && m.physicalStatus === 'approved')
    })),
    progressData: progressData,
    functionsAvailable: {
      calculateMilestoneProgress: typeof window.calculateMilestoneProgress === 'function',
      displayProjectMilestones: typeof window.displayProjectMilestones === 'function'
    }
  };
})();

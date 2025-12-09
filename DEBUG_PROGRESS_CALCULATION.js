/**
 * DEBUG SCRIPT FOR PROGRESS CALCULATION
 * 
 * Run this in the browser console to debug progress calculation issues
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Navigate to the project management page
 * 3. Copy and paste this entire script
 * 4. Run: debugProgressCalculation('PRJ-MEO-20255012')
 *    Or run: debugProgressCalculation() to debug all projects
 */

async function debugProgressCalculation(projectCode = null) {
  console.log('🔍 ========== PROGRESS CALCULATION DEBUG ==========');
  
  // Get API URL
  const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const API_URL = isProd 
    ? `${window.location.protocol}//${window.location.hostname}/api`
    : 'http://localhost:3000/api';
  
  // Get auth token
  const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  
  if (!token) {
    console.error('❌ No auth token found. Please make sure you are logged in.');
    return;
  }
  
  try {
    // Fetch projects
    const response = await fetch(`${API_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch projects:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ API returned error:', data.error);
      return;
    }
    
    const projects = data.projects || [];
    console.log(`📊 Found ${projects.length} projects`);
    
    // Filter by project code if provided
    const targetProjects = projectCode 
      ? projects.filter(p => p.projectCode === projectCode || p.id === projectCode)
      : projects;
    
    if (targetProjects.length === 0) {
      console.error(`❌ No project found with code: ${projectCode}`);
      return;
    }
    
    // Debug each project
    targetProjects.forEach(project => {
      console.log(`\n📋 ========== PROJECT: ${project.name || project.projectName} ==========`);
      console.log(`   Code: ${project.projectCode || project.id}`);
      console.log(`   ID: ${project.id}`);
      
      // Check overall progress
      console.log(`\n📈 OVERALL PROGRESS:`);
      console.log(`   project.progress?.overall:`, project.progress?.overall);
      console.log(`   project.overallProgress:`, project.overallProgress);
      console.log(`   project.progress object:`, project.progress);
      
      const calculatedOverall = project.progress?.overall || project.overallProgress || 0;
      console.log(`   ✅ Calculated Overall Progress: ${calculatedOverall.toFixed(2)}%`);
      
      // Check budget progress
      console.log(`\n💰 BUDGET DIVISION UTILIZATION:`);
      console.log(`   project.progress?.budget:`, project.progress?.budget);
      console.log(`   project.budgetUtilizationPercentage:`, project.budgetUtilizationPercentage);
      console.log(`   project.budgetProgress:`, project.budgetProgress);
      
      const calculatedBudget = project.progress?.budget || project.budgetUtilizationPercentage || project.budgetProgress || 0;
      console.log(`   ✅ Calculated Budget Progress: ${calculatedBudget.toFixed(2)}%`);
      
      // Check milestones
      if (project.milestones && Array.isArray(project.milestones)) {
        console.log(`\n🎯 MILESTONES (${project.milestones.length} total):`);
        project.milestones.forEach((milestone, index) => {
          const weight = 100 / project.milestones.length;
          console.log(`   ${index + 1}. ${milestone.title || 'Untitled'}`);
          console.log(`      Status: ${milestone.status}`);
          console.log(`      Physical Status: ${milestone.physicalStatus}`);
          console.log(`      Has Physical Input: ${!!(milestone.physicalDescription || milestone.physicalStatus === 'approved')}`);
          console.log(`      Weight: ${weight.toFixed(2)}%`);
          console.log(`      Planned Budget: ₱${parseFloat(milestone.plannedBudget || 0).toLocaleString()}`);
          
          // Check for approved submissions
          if (milestone.submissions && Array.isArray(milestone.submissions)) {
            const approvedSubmissions = milestone.submissions.filter(s => s.status === 'approved');
            console.log(`      Approved Submissions: ${approvedSubmissions.length}`);
            approvedSubmissions.forEach(sub => {
              console.log(`         - Used Budget: ₱${parseFloat(sub.usedBudget || 0).toLocaleString()}`);
              console.log(`         - Planned Budget: ₱${parseFloat(sub.plannedBudget || 0).toLocaleString()}`);
              if (sub.plannedBudget > 0) {
                const utilization = (sub.usedBudget / sub.plannedBudget) * 100;
                const weighted = utilization * (weight / 100);
                console.log(`         - Utilization: ${utilization.toFixed(2)}%`);
                console.log(`         - Weighted Contribution: ${weighted.toFixed(2)}%`);
              }
            });
          }
        });
      }
      
      // Check what ProjectCard would display
      console.log(`\n🎨 PROJECTCARD DISPLAY VALUES:`);
      const cardOverall = project.progress?.overall || project.overallProgress || project.progress || 0;
      const cardBudget = project.progress?.budget || project.budgetUtilizationPercentage || project.budgetProgress || 0;
      console.log(`   Overall Progress: ${parseFloat(cardOverall).toFixed(1)}%`);
      console.log(`   Budget Utilization: ${parseFloat(cardBudget).toFixed(1)}%`);
      
      // Check DOM elements
      console.log(`\n🌐 DOM ELEMENTS:`);
      const cardElement = document.querySelector(`[data-project-id="${project.id}"]`);
      if (cardElement) {
        const overallBar = cardElement.querySelector('.progress-bar-fill');
        const budgetBar = cardElement.querySelector('.budget-progress-bar-fill');
        console.log(`   Card Element Found: ✅`);
        console.log(`   Overall Progress Bar Data:`, overallBar?.getAttribute('data-progress'));
        console.log(`   Budget Progress Bar Data:`, budgetBar?.getAttribute('data-progress'));
      } else {
        console.log(`   Card Element Not Found: ❌ (Card might not be rendered yet)`);
      }
    });
    
    console.log(`\n✅ ========== DEBUG COMPLETE ==========`);
    console.log(`\n💡 TIPS:`);
    console.log(`   - If overall progress is wrong, check milestone approval status`);
    console.log(`   - If budget progress is wrong, check approved submissions and budget data`);
    console.log(`   - Check server console logs for backend calculation details`);
    console.log(`   - Run: debugProgressCalculation('PROJECT_CODE') to debug specific project`);
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Also create a helper to check specific project by code
window.debugProgressCalculation = debugProgressCalculation;

console.log('✅ Debug script loaded!');
console.log('📝 Usage: debugProgressCalculation("PRJ-MEO-20255012")');
console.log('📝 Or: debugProgressCalculation() to debug all projects');


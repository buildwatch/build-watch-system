// Debug script for delayReason issue
// Run this in the browser console on the progress-timeline page

console.log('🔍 DELAY REASON DEBUGGING SCRIPT');
console.log('=====================================');

// Step 1: Check if submissions are loaded
console.log('\n📋 STEP 1: Check if submissions are available');
if (typeof window.submissions !== 'undefined' && Array.isArray(window.submissions)) {
  console.log(`✅ Found ${window.submissions.length} submissions in window.submissions`);
} else {
  console.log('⚠️ window.submissions not found, checking for submissions in DOM...');
  
  // Try to find submissions from the page
  const submissionCards = document.querySelectorAll('[id*="submission"]');
  console.log(`Found ${submissionCards.length} elements with "submission" in ID`);
}

// Step 2: Check a specific submission for delayReason
console.log('\n📋 STEP 2: Check delayReason in submissions');
const checkSubmission = async (submissionId) => {
  try {
    const API_URL = window.API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No token found in localStorage');
      return;
    }
    
    const response = await fetch(`${API_URL}/milestones/milestone-submissions/${submissionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch submission: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    if (data.success && data.submission) {
      const submission = data.submission;
      console.log('📊 Submission data structure:', {
        id: submission.id,
        status: submission.status,
        hasSubmitterInfo: !!submission.submitterInfo,
        submitterInfo: submission.submitterInfo,
        hasDelayInfo: !!submission.submitterInfo?.delayInfo,
        delayInfo: submission.submitterInfo?.delayInfo,
        delayReason: submission.delayReason,
        isDelayed: submission.isDelayed,
        submissionData: submission.submissionData
      });
      
      // Check all possible locations for delayReason
      const delayReasonSources = {
        'submitterInfo.delayInfo.delayReason': submission.submitterInfo?.delayInfo?.delayReason,
        'submitterInfo.delayInfo.isDelayed': submission.submitterInfo?.delayInfo?.isDelayed,
        'submission.delayReason': submission.delayReason,
        'submission.isDelayed': submission.isDelayed,
        'submissionData.delayReason': submission.submissionData?.delayReason,
        'submissionData.isDelayed': submission.submissionData?.isDelayed
      };
      
      console.log('\n🔍 Delay Reason Sources:', delayReasonSources);
      
      const foundDelayReason = Object.values(delayReasonSources).find(v => v !== undefined && v !== null);
      if (foundDelayReason) {
        console.log('✅ Found delayReason:', foundDelayReason);
      } else {
        console.log('❌ No delayReason found in any location');
      }
    } else {
      console.error('❌ Submission not found or invalid response');
    }
  } catch (error) {
    console.error('❌ Error checking submission:', error);
  }
};

// Step 3: List all submissions and their delayReason status
console.log('\n📋 STEP 3: List all submissions');
const listSubmissions = async () => {
  try {
    const API_URL = window.API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No token found in localStorage');
      return;
    }
    
    // Get project ID from URL or selectedProject
    let projectId = null;
    if (typeof selectedProject !== 'undefined' && selectedProject) {
      projectId = selectedProject.id;
    } else {
      // Try to get from URL
      const urlMatch = window.location.pathname.match(/\/projects\/([^\/]+)/);
      if (urlMatch) {
        projectId = urlMatch[1];
      }
    }
    
    if (!projectId) {
      console.error('❌ Could not determine project ID');
      return;
    }
    
    const response = await fetch(`${API_URL}/milestones/milestone-submissions?projectId=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch submissions: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    if (data.success && Array.isArray(data.submissions)) {
      console.log(`✅ Found ${data.submissions.length} submissions`);
      
      data.submissions.forEach((submission, index) => {
        const delayInfo = submission.submitterInfo?.delayInfo;
        const hasDelayReason = !!(delayInfo?.delayReason || submission.delayReason);
        const isDelayed = !!(delayInfo?.isDelayed || submission.isDelayed);
        
        console.log(`\n📄 Submission ${index + 1}:`, {
          id: submission.id,
          milestoneTitle: submission.milestone?.title,
          status: submission.status,
          isDelayed: isDelayed,
          hasDelayReason: hasDelayReason,
          delayReason: delayInfo?.delayReason || submission.delayReason || 'N/A',
          submitterInfoKeys: submission.submitterInfo ? Object.keys(submission.submitterInfo) : [],
          delayInfo: delayInfo
        });
      });
    } else {
      console.error('❌ Invalid response format');
    }
  } catch (error) {
    console.error('❌ Error listing submissions:', error);
  }
};

// Export functions to window for easy access
window.debugDelayReason = {
  checkSubmission,
  listSubmissions
};

console.log('\n✅ Debug functions available:');
console.log('  - window.debugDelayReason.checkSubmission(submissionId)');
console.log('  - window.debugDelayReason.listSubmissions()');
console.log('\n💡 Usage:');
console.log('  1. Run: window.debugDelayReason.listSubmissions()');
console.log('  2. Then: window.debugDelayReason.checkSubmission("submission-id-here")');


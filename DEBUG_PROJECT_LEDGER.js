// Debug script for Project Ledger - Public Page
// Run this in the browser console on the project-ledger page

(function debugProjectLedger() {
  console.log('🔍 ========== PROJECT LEDGER DEBUG ==========');
  
  // Find the ProjectLedgerCenter component
  const projectLedgerElement = document.querySelector('[data-project-ledger]') || 
                                document.querySelector('.project-ledger-container') ||
                                document.querySelector('div[class*="ProjectLedger"]');
  
  if (!projectLedgerElement) {
    console.log('❌ Could not find ProjectLedgerCenter element');
    console.log('💡 Try: document.querySelectorAll("div") to find the component');
    return;
  }
  
  console.log('✅ Found ProjectLedgerCenter element');
  
  // Try to access React component state (if available)
  const reactFiber = projectLedgerElement._reactInternalFiber || 
                     projectLedgerElement._reactInternalInstance ||
                     projectLedgerElement.__reactInternalInstance;
  
  if (reactFiber) {
    console.log('✅ Found React fiber');
    let fiber = reactFiber;
    let depth = 0;
    while (fiber && depth < 10) {
      if (fiber.memoizedState) {
        console.log(`📊 State at depth ${depth}:`, fiber.memoizedState);
      }
      fiber = fiber.child || fiber.return;
      depth++;
    }
  }
  
  // Check for projects data in window
  if (window.projectLedgerData) {
    console.log('✅ Found projectLedgerData in window:', window.projectLedgerData);
  }
  
  // Check localStorage
  const storedProjects = localStorage.getItem('projectLedgerProjects');
  if (storedProjects) {
    console.log('✅ Found projects in localStorage');
    try {
      const projects = JSON.parse(storedProjects);
      console.log('📋 Projects count:', projects.length);
      if (projects.length > 0) {
        const firstProject = projects[0];
        console.log('📋 First project:', {
          id: firstProject.id,
          name: firstProject.name,
          milestones: firstProject.milestones?.length || 0,
          hasExpectedOutputs: !!firstProject.expectedOutputs,
          hasTargetBeneficiaries: !!firstProject.targetBeneficiaries,
          hasBudgetDescription: !!(firstProject.budgetDescription || firstProject.budgetBreakdown),
          hasPhysicalDescription: !!(firstProject.physicalProgressRequirements || firstProject.generalDescription),
          milestonesData: firstProject.milestones?.map(m => ({
            id: m.id,
            title: m.title,
            hasSubmissions: !!m.submissions?.length,
            approvedSubmission: !!m.submissions?.find(s => s.status === 'approved' || s.status === 'iu_approved')
          }))
        });
      }
    } catch (e) {
      console.error('❌ Error parsing localStorage projects:', e);
    }
  }
  
  // Check table structure
  const verticalTable = document.querySelector('table tbody');
  if (verticalTable) {
    console.log('✅ Found vertical table');
    const rows = verticalTable.querySelectorAll('tr');
    console.log('📊 Table rows count:', rows.length);
    
    // Check for specific sections
    const sections = {
      'Expected Outputs': false,
      'Target Beneficiaries': false,
      'Budget Description': false,
      'General Description': false,
      'PROJECT PHASES UPDATE': false
    };
    
    rows.forEach((row, idx) => {
      const text = row.textContent || '';
      if (text.includes('Expected Outputs')) sections['Expected Outputs'] = true;
      if (text.includes('Target Beneficiaries')) sections['Target Beneficiaries'] = true;
      if (text.includes('Budget Description')) sections['Budget Description'] = true;
      if (text.includes('General Description')) sections['General Description'] = true;
      if (text.includes('PROJECT PHASES UPDATE')) sections['PROJECT PHASES UPDATE'] = true;
    });
    
    console.log('📋 Sections found:', sections);
    
    // Check for missing sections
    const missing = Object.entries(sections).filter(([key, found]) => !found);
    if (missing.length > 0) {
      console.warn('⚠️ Missing sections:', missing.map(([key]) => key));
    }
  }
  
  // Check horizontal table
  const horizontalTable = document.querySelector('table[class*="min-w"]');
  if (horizontalTable) {
    console.log('✅ Found horizontal table');
    const headers = horizontalTable.querySelectorAll('thead th');
    console.log('📊 Header count:', headers.length);
    
    const headerTexts = Array.from(headers).map(h => h.textContent?.trim()).filter(Boolean);
    console.log('📋 Headers:', headerTexts);
    
    // Check for specific headers
    const requiredHeaders = [
      'Expected Outputs',
      'Target Beneficiaries',
      'Budget Description',
      'General Description',
      'Phase (Item of Work)',
      'Description',
      'Planned Budget',
      'Breakdown Description',
      'Budget Alloted Weight',
      'Physical Accomplishment Weight',
      'Start Date',
      'Target Completion Date',
      'Submission Date',
      'Actual Phase Completion Date',
      'Timeline Activities & Deliverables',
      'Used Budget',
      'Remaining Budget',
      'Budget Breakdown & Allocation',
      'Physical Accomplishment Gained Weight',
      'Photo Proof',
      'Video Proof',
      'Document Proof',
      'Physical Progress Description',
      'Submitted By',
      'Remarks and Recommendation'
    ];
    
    const missingHeaders = requiredHeaders.filter(h => 
      !headerTexts.some(ht => ht.includes(h))
    );
    
    if (missingHeaders.length > 0) {
      console.warn('⚠️ Missing headers:', missingHeaders);
    } else {
      console.log('✅ All required headers found');
    }
  }
  
  // Check for phases data
  const tbody = document.querySelector('table tbody');
  if (tbody) {
    const phaseRows = Array.from(tbody.querySelectorAll('tr')).filter(row => {
      const text = row.textContent || '';
      return text.includes('Phase') || text.includes('CONTRACTOR UPDATE');
    });
    console.log('📊 Phase-related rows:', phaseRows.length);
    
    if (phaseRows.length === 0) {
      console.warn('⚠️ No phase rows found - phases array might be empty');
    }
  }
  
  // Try to get data from API
  const getApiUrl = () => {
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProd 
      ? `${window.location.protocol}//${window.location.hostname}/api`
      : 'http://localhost:3000/api';
  };
  
  const API_URL = getApiUrl();
  console.log('🌐 API URL:', API_URL);
  
  // Get project ID from URL or selected project
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId') || urlParams.get('id');
  
  if (projectId) {
    console.log('📋 Project ID from URL:', projectId);
    console.log('💡 Checking public project data...');
    
    // Check public project endpoint
    fetch(`${API_URL}/projects/public/${projectId}`)
      .then(r => r.json())
      .then(d => {
        console.log('📊 Public Project Data:', d);
        if (d.success && d.project) {
          const p = d.project;
          console.log('📋 Project Fields:', {
            hasExpectedOutputs: !!p.expectedOutputs,
            hasTargetBeneficiaries: !!p.targetBeneficiaries,
            hasBudgetDescription: !!(p.budgetDescription || p.budgetBreakdown),
            hasGeneralDescription: !!(p.generalDescription || p.physicalProgressRequirements),
            hasMilestones: !!p.milestones,
            milestonesCount: p.milestones?.length || 0
          });
        }
      })
      .catch(e => console.error('❌ Error fetching public project:', e));
    
    // Check public milestones endpoint
    fetch(`${API_URL}/milestones/project/${projectId}/public`)
      .then(r => r.json())
      .then(d => {
        console.log('📊 Public Milestones Data:', d);
        if (d.success && d.milestones) {
          console.log('📋 Milestones count:', d.milestones.length);
          d.milestones.forEach((m, idx) => {
            console.log(`📋 Milestone ${idx + 1}:`, {
              id: m.id,
              title: m.title,
              hasDescription: !!m.description,
              hasPlannedBudget: !!m.plannedBudget,
              hasBudgetBreakdown: !!m.budgetBreakdown,
              status: m.status
            });
          });
        }
      })
      .catch(e => console.error('❌ Error fetching public milestones:', e));
  } else {
    console.log('💡 To check API data for a specific project, add ?projectId=XXX to the URL');
    console.log(`   Or run: fetch('${API_URL}/projects/public').then(r => r.json()).then(d => console.log('Projects:', d))`);
  }
  
  console.log('🔍 ========== END DEBUG ==========');
  console.log('💡 If data is missing, check:');
  console.log('   1. Is the project approved for public viewing?');
  console.log('   2. Are milestones being fetched from the public endpoint?');
  console.log('   3. Is the phases array empty? (Check getProjectPhases function)');
})();


const express = require('express');
const router = express.Router();

// Mock reports data
const mockReports = [
  {
    id: 1,
    title: 'Q1 2024 Project Monitoring Report',
    type: 'Quarterly',
    period: 'Q1 2024',
    generatedBy: 'MPMEC Chair',
    generatedDate: '2024-04-01',
    status: 'Published',
    summary: {
      totalProjects: 15,
      ongoingProjects: 12,
      completedProjects: 3,
      totalBudget: 25000000,
      totalSpent: 18000000,
      budgetUtilization: 72
    }
  },
  {
    id: 2,
    title: 'Annual Report 2023',
    type: 'Annual',
    period: '2023',
    generatedBy: 'MPMEC Secretariat',
    generatedDate: '2024-01-15',
    status: 'Published',
    summary: {
      totalProjects: 45,
      ongoingProjects: 8,
      completedProjects: 37,
      totalBudget: 75000000,
      totalSpent: 72000000,
      budgetUtilization: 96
    }
  },
  {
    id: 3,
    title: 'Road Construction Project Summary',
    type: 'Project Specific',
    projectId: 1,
    projectName: 'Road Construction - Barangay A',
    generatedBy: 'EIU Manager',
    generatedDate: '2024-06-01',
    status: 'Draft',
    summary: {
      progress: 75,
      budget: 2000000,
      spent: 1500000,
      timeline: 'On Track'
    }
  }
];

const mockMunicipalReports = [
  {
    id: 1,
    title: 'Municipal Development Report Q1 2024',
    type: 'Quarterly',
    date: '2024-04-01',
    status: 'Published',
    content: 'Comprehensive report on municipal development projects',
    accessibleBy: ['PPMC', 'Executive']
  },
  {
    id: 2,
    title: 'Municipal Annual Report 2023',
    type: 'Annual',
    date: '2024-01-15',
    status: 'Published',
    content: 'Annual summary of municipal achievements and projects',
    accessibleBy: ['PPMC', 'Executive']
  }
];

// Get all reports
router.get('/', (req, res) => {
  const { type, status, period } = req.query;
  
  let filteredReports = [...mockReports];
  
  if (type) {
    filteredReports = filteredReports.filter(r => r.type === type);
  }
  
  if (status) {
    filteredReports = filteredReports.filter(r => r.status === status);
  }
  
  if (period) {
    filteredReports = filteredReports.filter(r => r.period === period);
  }
  
  res.json({
    success: true,
    reports: filteredReports
  });
});

// Get report by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const report = mockReports.find(r => r.id === parseInt(id));
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  res.json({
    success: true,
    report
  });
});

// Generate new report
router.post('/', (req, res) => {
  const reportData = req.body;
  
  const newReport = {
    id: mockReports.length + 1,
    ...reportData,
    generatedDate: new Date().toISOString().split('T')[0],
    status: 'Draft'
  };
  
  mockReports.push(newReport);
  
  res.status(201).json({
    success: true,
    message: 'Report generated successfully',
    report: newReport
  });
});

// Update report status
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const report = mockReports.find(r => r.id === parseInt(id));
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  report.status = status;
  report.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: `Report status updated to ${status}`,
    report
  });
});

// Generate quarterly report
router.post('/quarterly', (req, res) => {
  const { quarter, year } = req.body;
  
  // TODO: Generate actual quarterly report data from database
  const quarterlyReport = {
    id: mockReports.length + 1,
    title: `${quarter} ${year} Project Monitoring Report`,
    type: 'Quarterly',
    period: `${quarter} ${year}`,
    generatedBy: 'MPMEC Secretariat',
    generatedDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
    summary: {
      totalProjects: 15,
      ongoingProjects: 12,
      completedProjects: 3,
      totalBudget: 25000000,
      totalSpent: 18000000,
      budgetUtilization: 72
    },
    details: {
      projectsByCategory: {
        'Infrastructure': 8,
        'Education': 3,
        'Health': 2,
        'Agriculture': 2
      },
      projectsByStatus: {
        'On Track': 10,
        'Delayed': 3,
        'Completed': 2
      },
      budgetByImplementingUnit: {
        'EIU': 15000000,
        'LGU-IU': 10000000
      }
    }
  };
  
  mockReports.push(quarterlyReport);
  
  res.status(201).json({
    success: true,
    message: 'Quarterly report generated successfully',
    report: quarterlyReport
  });
});

// Generate annual report
router.post('/annual', (req, res) => {
  const { year } = req.body;
  
  // TODO: Generate actual annual report data from database
  const annualReport = {
    id: mockReports.length + 1,
    title: `Annual Report ${year}`,
    type: 'Annual',
    period: year.toString(),
    generatedBy: 'MPMEC Secretariat',
    generatedDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
    summary: {
      totalProjects: 45,
      ongoingProjects: 8,
      completedProjects: 37,
      totalBudget: 75000000,
      totalSpent: 72000000,
      budgetUtilization: 96
    },
    details: {
      yearInReview: 'Comprehensive overview of all projects completed and ongoing',
      achievements: 'List of major accomplishments and milestones',
      challenges: 'Issues faced and lessons learned',
      recommendations: 'Suggestions for improvement'
    }
  };
  
  mockReports.push(annualReport);
  
  res.status(201).json({
    success: true,
    message: 'Annual report generated successfully',
    report: annualReport
  });
});

// Generate project-specific report
router.post('/project/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { reportType } = req.body;
  
  // TODO: Get actual project data from database
  const projectReport = {
    id: mockReports.length + 1,
    title: `Project Report - ${reportType}`,
    type: 'Project Specific',
    projectId: parseInt(projectId),
    projectName: 'Sample Project',
    generatedBy: 'Project Manager',
    generatedDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
    summary: {
      progress: 75,
      budget: 2000000,
      spent: 1500000,
      timeline: 'On Track'
    },
    details: {
      milestones: 'List of completed and pending milestones',
      issues: 'Current issues and resolutions',
      nextSteps: 'Upcoming activities and timeline'
    }
  };
  
  mockReports.push(projectReport);
  
  res.status(201).json({
    success: true,
    message: 'Project report generated successfully',
    report: projectReport
  });
});

// Get municipal reports (for PPMC and Executive)
router.get('/municipal/all', (req, res) => {
  res.json({
    success: true,
    reports: mockMunicipalReports
  });
});

// Export report as PDF (mock)
router.post('/:id/export', (req, res) => {
  const { id } = req.params;
  const { format } = req.body;
  
  const report = mockReports.find(r => r.id === parseInt(id));
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  // TODO: Implement actual PDF generation
  const exportData = {
    reportId: id,
    format: format || 'PDF',
    downloadUrl: `/api/reports/${id}/download`,
    generatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: `Report exported as ${format}`,
    export: exportData
  });
});

// Get report statistics
router.get('/stats/overview', (req, res) => {
  const totalReports = mockReports.length;
  const publishedReports = mockReports.filter(r => r.status === 'Published').length;
  const draftReports = mockReports.filter(r => r.status === 'Draft').length;
  
  const reportsByType = {
    'Quarterly': mockReports.filter(r => r.type === 'Quarterly').length,
    'Annual': mockReports.filter(r => r.type === 'Annual').length,
    'Project Specific': mockReports.filter(r => r.type === 'Project Specific').length
  };
  
  res.json({
    success: true,
    stats: {
      totalReports,
      publishedReports,
      draftReports,
      reportsByType
    }
  });
});

// Get report templates
router.get('/templates/:type', (req, res) => {
  const { type } = req.params;
  
  const templates = {
    'quarterly': {
      title: 'Quarterly Report Template',
      sections: [
        'Executive Summary',
        'Project Overview',
        'Progress by Category',
        'Budget Analysis',
        'Issues and Challenges',
        'Recommendations'
      ]
    },
    'annual': {
      title: 'Annual Report Template',
      sections: [
        'Year in Review',
        'Project Portfolio',
        'Achievements and Milestones',
        'Financial Summary',
        'Lessons Learned',
        'Strategic Recommendations'
      ]
    },
    'project': {
      title: 'Project Report Template',
      sections: [
        'Project Overview',
        'Progress Summary',
        'Milestones',
        'Budget Status',
        'Issues and Risks',
        'Next Steps'
      ]
    }
  };
  
  const template = templates[type];
  if (!template) {
    return res.status(404).json({ error: 'Report template not found' });
  }
  
  res.json({
    success: true,
    template
  });
});

module.exports = router; 
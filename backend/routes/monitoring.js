const express = require('express');
const router = express.Router();

// Mock monitoring data
const mockValidationSchedule = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Road Construction - Barangay A',
    scheduledDate: '2024-06-05',
    assignedTo: 'MPMEC Member 1',
    status: 'Scheduled',
    type: 'Field Validation',
    location: 'Barangay A'
  },
  {
    id: 2,
    projectId: 2,
    projectName: 'School Renovation - Elementary School',
    scheduledDate: '2024-06-06',
    assignedTo: 'MPMEC Member 2',
    status: 'Pending',
    type: 'Document Review',
    location: 'Barangay B'
  }
];

const mockMonitoringFeedback = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Road Construction - Barangay A',
    submittedBy: 'Ms. Elena Torres',
    userRole: 'NGO Representative',
    feedback: 'Project is progressing well. Quality of materials meets standards.',
    transparencyScore: 4,
    checklist: true,
    date: '2024-06-01',
    photos: ['monitoring_1.jpg', 'monitoring_2.jpg']
  },
  {
    id: 2,
    projectId: 2,
    projectName: 'School Renovation - Elementary School',
    submittedBy: 'Mr. Antonio Silva',
    userRole: 'CSO Member',
    feedback: 'Some concerns about timeline delays. Need better communication.',
    transparencyScore: 3,
    checklist: false,
    date: '2024-06-02',
    photos: ['monitoring_3.jpg']
  }
];

const mockExceptionReports = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Road Construction - Barangay A',
    reportedBy: 'Ms. Elena Torres',
    exception: 'Discrepancy in material costs',
    severity: 'High',
    evidence: 'cost_comparison.pdf',
    status: 'Open',
    date: '2024-06-01',
    assignedTo: 'MPMEC Chair'
  },
  {
    id: 2,
    projectId: 2,
    projectName: 'School Renovation - Elementary School',
    reportedBy: 'Mr. Antonio Silva',
    exception: 'Delayed completion timeline',
    severity: 'Medium',
    evidence: 'timeline_analysis.pdf',
    status: 'Under Review',
    date: '2024-06-02',
    assignedTo: 'MPMEC Vice Chair'
  }
];

const mockEscalations = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Road Construction - Barangay A',
    escalatedBy: 'NGO Representative',
    issue: 'Quality concerns raised by community',
    priority: 'High',
    date: '2024-06-03',
    status: 'Open',
    description: 'Community members reported substandard materials being used'
  },
  {
    id: 2,
    projectId: 2,
    projectName: 'School Renovation - Elementary School',
    escalatedBy: 'CSO Member',
    issue: 'Budget transparency issues',
    priority: 'Medium',
    date: '2024-06-04',
    status: 'Under Review',
    description: 'Insufficient documentation for budget utilization'
  }
];

// Get validation schedule
router.get('/validation-schedule', (req, res) => {
  const { status, assignedTo } = req.query;
  
  let filteredSchedule = [...mockValidationSchedule];
  
  if (status) {
    filteredSchedule = filteredSchedule.filter(v => v.status === status);
  }
  
  if (assignedTo) {
    filteredSchedule = filteredSchedule.filter(v => v.assignedTo === assignedTo);
  }
  
  res.json({
    success: true,
    schedule: filteredSchedule
  });
});

// Create validation schedule
router.post('/validation-schedule', (req, res) => {
  const scheduleData = req.body;
  
  const newSchedule = {
    id: mockValidationSchedule.length + 1,
    ...scheduleData,
    status: 'Scheduled'
  };
  
  mockValidationSchedule.push(newSchedule);
  
  res.status(201).json({
    success: true,
    message: 'Validation schedule created successfully',
    schedule: newSchedule
  });
});

// Update validation status
router.patch('/validation-schedule/:id', (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  
  const schedule = mockValidationSchedule.find(s => s.id === parseInt(id));
  if (!schedule) {
    return res.status(404).json({ error: 'Validation schedule not found' });
  }
  
  schedule.status = status;
  schedule.remarks = remarks;
  schedule.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Validation status updated successfully',
    schedule
  });
});

// Submit monitoring feedback
router.post('/feedback', (req, res) => {
  const feedbackData = req.body;
  
  const newFeedback = {
    id: mockMonitoringFeedback.length + 1,
    ...feedbackData,
    date: new Date().toISOString().split('T')[0]
  };
  
  mockMonitoringFeedback.push(newFeedback);
  
  res.status(201).json({
    success: true,
    message: 'Monitoring feedback submitted successfully',
    feedback: newFeedback
  });
});

// Get monitoring feedback
router.get('/feedback', (req, res) => {
  const { projectId, userRole } = req.query;
  
  let filteredFeedback = [...mockMonitoringFeedback];
  
  if (projectId) {
    filteredFeedback = filteredFeedback.filter(f => f.projectId === parseInt(projectId));
  }
  
  if (userRole) {
    filteredFeedback = filteredFeedback.filter(f => f.userRole === userRole);
  }
  
  res.json({
    success: true,
    feedback: filteredFeedback
  });
});

// Submit exception report
router.post('/exceptions', (req, res) => {
  const exceptionData = req.body;
  
  const newException = {
    id: mockExceptionReports.length + 1,
    ...exceptionData,
    date: new Date().toISOString().split('T')[0],
    status: 'Open'
  };
  
  mockExceptionReports.push(newException);
  
  res.status(201).json({
    success: true,
    message: 'Exception report submitted successfully',
    exception: newException
  });
});

// Get exception reports
router.get('/exceptions', (req, res) => {
  const { projectId, severity, status } = req.query;
  
  let filteredExceptions = [...mockExceptionReports];
  
  if (projectId) {
    filteredExceptions = filteredExceptions.filter(e => e.projectId === parseInt(projectId));
  }
  
  if (severity) {
    filteredExceptions = filteredExceptions.filter(e => e.severity === severity);
  }
  
  if (status) {
    filteredExceptions = filteredExceptions.filter(e => e.status === status);
  }
  
  res.json({
    success: true,
    exceptions: filteredExceptions
  });
});

// Update exception status
router.patch('/exceptions/:id', (req, res) => {
  const { id } = req.params;
  const { status, assignedTo, remarks } = req.body;
  
  const exception = mockExceptionReports.find(e => e.id === parseInt(id));
  if (!exception) {
    return res.status(404).json({ error: 'Exception report not found' });
  }
  
  exception.status = status;
  exception.assignedTo = assignedTo;
  exception.remarks = remarks;
  exception.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Exception status updated successfully',
    exception
  });
});

// Submit escalation
router.post('/escalations', (req, res) => {
  const escalationData = req.body;
  
  const newEscalation = {
    id: mockEscalations.length + 1,
    ...escalationData,
    date: new Date().toISOString().split('T')[0],
    status: 'Open'
  };
  
  mockEscalations.push(newEscalation);
  
  res.status(201).json({
    success: true,
    message: 'Issue escalated successfully',
    escalation: newEscalation
  });
});

// Get escalations
router.get('/escalations', (req, res) => {
  const { projectId, priority, status } = req.query;
  
  let filteredEscalations = [...mockEscalations];
  
  if (projectId) {
    filteredEscalations = filteredEscalations.filter(e => e.projectId === parseInt(projectId));
  }
  
  if (priority) {
    filteredEscalations = filteredEscalations.filter(e => e.priority === priority);
  }
  
  if (status) {
    filteredEscalations = filteredEscalations.filter(e => e.status === status);
  }
  
  res.json({
    success: true,
    escalations: filteredEscalations
  });
});

// Get monitoring statistics
router.get('/stats', (req, res) => {
  const totalValidations = mockValidationSchedule.length;
  const completedValidations = mockValidationSchedule.filter(v => v.status === 'Completed').length;
  const pendingValidations = mockValidationSchedule.filter(v => v.status === 'Pending').length;
  
  const totalExceptions = mockExceptionReports.length;
  const openExceptions = mockExceptionReports.filter(e => e.status === 'Open').length;
  const highSeverityExceptions = mockExceptionReports.filter(e => e.severity === 'High').length;
  
  const totalEscalations = mockEscalations.length;
  const openEscalations = mockEscalations.filter(e => e.status === 'Open').length;
  const highPriorityEscalations = mockEscalations.filter(e => e.priority === 'High').length;
  
  res.json({
    success: true,
    stats: {
      validations: {
        total: totalValidations,
        completed: completedValidations,
        pending: pendingValidations
      },
      exceptions: {
        total: totalExceptions,
        open: openExceptions,
        highSeverity: highSeverityExceptions
      },
      escalations: {
        total: totalEscalations,
        open: openEscalations,
        highPriority: highPriorityEscalations
      }
    }
  });
});

module.exports = router; 
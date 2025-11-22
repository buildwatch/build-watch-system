import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

// Get token from localStorage
const getToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
};

// Get current user
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Get theme colors based on user role
const getThemeColors = (userRole) => {
  switch (userRole) {
    case 'EIU':
      return {
        primary: 'from-green-500 to-green-600',
        secondary: 'from-green-400 to-green-500',
        accent: 'green',
        bg: 'from-green-50 to-white',
        text: 'text-green-700',
        border: 'border-green-200',
        hover: 'hover:bg-green-50'
      };
    case 'LGU-IU':
      return {
        primary: 'from-orange-500 to-orange-600',
        secondary: 'from-orange-400 to-orange-500',
        accent: 'orange',
        bg: 'from-orange-50 to-white',
        text: 'text-orange-700',
        border: 'border-orange-200',
        hover: 'hover:bg-orange-50'
      };
    case 'MPMEC':
      return {
        primary: 'from-blue-500 to-blue-600',
        secondary: 'from-blue-400 to-blue-500',
        accent: 'blue',
        bg: 'from-blue-50 to-white',
        text: 'text-blue-700',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-50'
      };
    case 'MPMEC-SEC':
    case 'MPMEC Secretariat':
      return {
        primary: 'from-sky-500 to-sky-600',
        secondary: 'from-sky-400 to-sky-500',
        accent: 'sky',
        bg: 'from-sky-50 to-white',
        text: 'text-sky-700',
        border: 'border-sky-200',
        hover: 'hover:bg-sky-50'
      };
    case 'Executive Viewer':
    case 'EMS':
      return {
        primary: 'from-indigo-500 to-indigo-600',
        secondary: 'from-indigo-400 to-indigo-500',
        accent: 'indigo',
        bg: 'from-indigo-50 to-white',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        hover: 'hover:bg-indigo-50'
      };
    default:
      return {
        primary: 'from-blue-500 to-blue-600',
        secondary: 'from-blue-400 to-blue-500',
        accent: 'blue',
        bg: 'from-blue-50 to-white',
        text: 'text-blue-700',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-50'
      };
  }
};

export default function ProjectSummaryReportCenter({ userRole = null, accessLevel = 'all' }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMilestones, setProjectMilestones] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const currentUser = getCurrentUser();
  const theme = getThemeColors(userRole || currentUser?.role);
  const wsRef = useRef(null);
  const notificationCheckInterval = useRef(null);

  // Fetch projects based on access level
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      let url = '';
      
      if (accessLevel === 'assigned') {
        // EIU - only assigned projects
        url = `${API_URL}/eiu/projects`;
      } else if (accessLevel === 'implemented') {
        // LGU-IU - only implemented projects
        url = `${API_URL}/projects?implementingOfficeId=${currentUser?.id}`;
      } else {
        // MPMEC/Secretariat/Executive - all projects
        url = `${API_URL}/projects`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch projects');
      
      const result = await response.json();
      const projectsList = result.projects || result.data || [];
      setProjects(projectsList);
      
      // Auto-select first project if available
      if (projectsList.length > 0 && !selectedProject) {
        setSelectedProject(projectsList[0]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessLevel, currentUser?.id, selectedProject]);

  // Fetch project milestones with progress data
  const fetchMilestones = useCallback(async (projectId) => {
    if (!projectId) return;
    
    try {
      const token = getToken();
      
      // Fetch full project details to get milestones with submissions
      const projectResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (projectResponse.ok) {
        const projectResult = await projectResponse.json();
        const project = projectResult.project || projectResult;
        
        if (project.milestones && Array.isArray(project.milestones)) {
          // Enhance milestones with progress and status
          const enhancedMilestones = project.milestones.map(milestone => {
            const enhanced = { ...milestone };
            
            // Calculate actual progress from submissions
            if (milestone.submissions && Array.isArray(milestone.submissions)) {
              const approvedSubmission = milestone.submissions.find(s => 
                s.status === 'approved' || s.status === 'iu_approved'
              );
              
              if (approvedSubmission) {
                // Use progress from approved submission
                enhanced.progress = approvedSubmission.progress || 
                                  approvedSubmission.timelineProgress || 
                                  approvedSubmission.overallProgress || 
                                  milestone.progress || 0;
                
                // If milestone has approved submission, mark as completed
                if (milestone.status !== 'completed' && milestone.status !== 'approved') {
                  enhanced.status = 'completed';
                }
              }
            }
            
            // Also check if milestone status is already completed/approved
            if (milestone.status === 'completed' || milestone.status === 'approved') {
              enhanced.status = 'completed';
              // If milestone is completed but progress is 0, set progress to 100
              if (!enhanced.progress || enhanced.progress === 0) {
                enhanced.progress = 100;
              }
            }
            
            // Check if milestone is delayed (only if not completed/approved)
            if (enhanced.status !== 'completed' && milestone.dueDate) {
              const dueDate = new Date(milestone.dueDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              dueDate.setHours(0, 0, 0, 0);
              
              if (dueDate < today) {
                enhanced.status = 'delayed';
              }
            }
            
            return enhanced;
          });
          
          setProjectMilestones(enhancedMilestones);
          return;
        }
      }
      
      // Fallback: Try milestones endpoint
      const response = await fetch(`${API_URL}/projects/${projectId}/milestones`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const milestones = result.milestones || result.data || [];
        
        // Enhance milestones with delayed status and progress
        const enhancedMilestones = milestones.map(milestone => {
          const enhanced = { ...milestone };
          
          // Check if milestone is delayed
          if (milestone.dueDate && milestone.status !== 'completed' && milestone.status !== 'approved') {
            const dueDate = new Date(milestone.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
              enhanced.status = 'delayed';
            }
          }
          
          // If milestone is completed but progress is 0, set progress to 100
          if ((milestone.status === 'completed' || milestone.status === 'approved') && 
              (!enhanced.progress || enhanced.progress === 0)) {
            enhanced.progress = 100;
          }
          
          return enhanced;
        });
        
        setProjectMilestones(enhancedMilestones);
      } else {
        throw new Error('Failed to fetch milestones');
      }
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setProjectMilestones([]);
    }
  }, []);

  // Fetch audit trail for project (including milestone submissions and approvals)
  const fetchAuditTrail = useCallback(async (projectId) => {
    if (!projectId) return;
    
    try {
      const token = getToken();
      
      // Fetch activity history
      const activityResponse = await fetch(`${API_URL}/projects/${projectId}/activity-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const allActivities = [];
      
      if (activityResponse.ok) {
        const activityResult = await activityResponse.json();
        allActivities.push(...(activityResult.activities || []));
      }
      
      // Fetch milestone submissions directly from API
      try {
        const submissionsResponse = await fetch(`${API_URL}/milestones/milestone-submissions?projectId=${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (submissionsResponse.ok) {
          const submissionsResult = await submissionsResponse.json();
          const submissions = submissionsResult.submissions || submissionsResult.data || [];
          
          console.log(`📋 Found ${submissions.length} milestone submissions for audit trail`);
          
          submissions.forEach(submission => {
            // Add submission entry (from EIU)
            if (submission.status !== 'rejected') {
              allActivities.push({
                id: `submission-${submission.id}`,
                action: 'MILESTONE_SUBMITTED',
                entityType: 'MilestoneSubmission',
                entityId: submission.milestoneId,
                details: `Submitted milestone update: ${submission.milestone?.title || 'Milestone'}${submission.reviewNotes ? ` - ${submission.reviewNotes}` : ''}`,
                createdAt: submission.submittedAt || submission.createdAt,
                user: {
                  name: submission.submitter?.name || submission.submitterInfo?.name || 'EIU Personnel',
                  role: 'EIU',
                  department: submission.submitter?.department || submission.submitterInfo?.department
                },
                module: 'Milestone Submission'
              });
            }
            
            // Add approval entry (from LGU-IU)
            if (submission.status === 'approved' || submission.status === 'iu_approved') {
              allActivities.push({
                id: `approval-${submission.id}`,
                action: 'MILESTONE_APPROVED',
                entityType: 'MilestoneSubmission',
                entityId: submission.milestoneId,
                details: `Approved milestone submission: ${submission.milestone?.title || 'Milestone'}${submission.reviewNotes ? ` - ${submission.reviewNotes}` : ''}`,
                createdAt: submission.reviewedAt || submission.updatedAt || submission.createdAt,
                user: {
                  name: submission.reviewer?.name || 'LGU-IU Personnel',
                  role: 'LGU-IU',
                  department: submission.reviewer?.department
                },
                module: 'Milestone Approval'
              });
            }
          });
        }
      } catch (submissionError) {
        console.warn('⚠️ Could not fetch milestone submissions for audit trail:', submissionError);
      }
      
      // Fetch full project details to get milestone submissions and updates
      const projectResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (projectResponse.ok) {
        const projectResult = await projectResponse.json();
        const project = projectResult.project || projectResult;
        
        // Add milestone submissions as audit entries (fallback if direct API call didn't work)
        if (project.milestones && Array.isArray(project.milestones)) {
          project.milestones.forEach(milestone => {
            // Check if milestone has submissions (from milestone data or project updates)
            if (milestone.submissions && Array.isArray(milestone.submissions)) {
              milestone.submissions.forEach(submission => {
                // Only add if not already added from direct API call
                const alreadyAdded = allActivities.some(a => a.id === `submission-${submission.id}`);
                if (!alreadyAdded && (submission.status === 'approved' || submission.status === 'iu_approved' || submission.status === 'pending_review')) {
                  allActivities.push({
                    id: `submission-${submission.id}`,
                    action: 'MILESTONE_SUBMITTED',
                    entityType: 'Milestone',
                    entityId: milestone.id,
                    details: `Submitted milestone: ${milestone.title || milestone.name} (Status: ${submission.status})`,
                    createdAt: submission.submittedAt || submission.createdAt,
                    user: {
                      name: submission.submittedBy || 'EIU Personnel',
                      role: 'EIU'
                    }
                  });
                  
                  if (submission.status === 'iu_approved' || submission.status === 'approved') {
                    allActivities.push({
                      id: `approval-${submission.id}`,
                      action: 'MILESTONE_APPROVED',
                      entityType: 'Milestone',
                      entityId: milestone.id,
                      details: `Approved milestone submission: ${milestone.title || milestone.name}`,
                      createdAt: submission.approvedAt || submission.updatedAt || submission.createdAt,
                      user: {
                        name: submission.approvedBy || 'LGU-IU Personnel',
                        role: 'LGU-IU'
                      }
                    });
                  }
                }
              });
            }
          });
        }
        
        // Add project updates related to milestones
        if (project.updates && Array.isArray(project.updates)) {
          project.updates.forEach(update => {
            // Milestone submissions from EIU
            if (update.updateType === 'milestone' && update.status === 'submitted') {
              const milestoneTitle = update.milestoneUpdates ? 
                (typeof update.milestoneUpdates === 'string' ? 
                  (JSON.parse(update.milestoneUpdates)[0]?.title || 'Milestone') : 
                  (update.milestoneUpdates[0]?.title || 'Milestone')) : 
                'Milestone';
              
              allActivities.push({
                id: `submission-${update.id}`,
                action: 'MILESTONE_SUBMITTED',
                entityType: 'Milestone',
                entityId: update.milestoneId || update.id,
                details: `Submitted milestone update: ${milestoneTitle}`,
                createdAt: update.submittedAt || update.createdAt,
                user: {
                  name: update.submitter?.name || 'EIU Personnel',
                  role: 'EIU'
                }
              });
            }
            
            // Milestone approvals by LGU-IU
            if (update.updateType === 'milestone' && (update.status === 'iu_approved' || update.status === 'approved')) {
              const milestoneTitle = update.milestoneUpdates ? 
                (typeof update.milestoneUpdates === 'string' ? 
                  (JSON.parse(update.milestoneUpdates)[0]?.title || 'Milestone') : 
                  (update.milestoneUpdates[0]?.title || 'Milestone')) : 
                'Milestone';
              
              allActivities.push({
                id: `approval-${update.id}`,
                action: 'MILESTONE_APPROVED',
                entityType: 'Milestone',
                entityId: update.milestoneId || update.id,
                details: `Approved milestone submission: ${milestoneTitle}`,
                createdAt: update.approvedAt || update.updatedAt || update.createdAt,
                user: {
                  name: update.approvedBy || update.validator?.name || update.submitter?.name || 'LGU-IU Personnel',
                  role: 'LGU-IU'
                }
              });
            }
          });
        }
      }
      
      // Sort all activities by date (newest first)
      allActivities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0);
        const dateB = new Date(b.createdAt || b.timestamp || 0);
        return dateB - dateA;
      });
      
      // Group by department/organization
      const grouped = {};
      allActivities.forEach(activity => {
        const dept = activity.user?.role || 'System';
        if (!grouped[dept]) {
          grouped[dept] = [];
        }
        grouped[dept].push(activity);
      });
      
      setAuditTrail(grouped);
    } catch (err) {
      console.error('Error fetching audit trail:', err);
    }
  }, []);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token = getToken();
    if (!token) return;
    
    // WebSocket connection for real-time notifications
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'localhost:3000'
        : window.location.hostname;
      const wsUrl = `${wsProtocol}//${wsHost}/ws?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected for Project Summary');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'project_update' || data.type === 'milestone_update' || data.type === 'approval') {
            // Add to notifications
            setNotifications(prev => [{
              id: Date.now(),
              type: data.type,
              message: data.message || 'Project update received',
              timestamp: new Date(),
              projectId: data.projectId
            }, ...prev.slice(0, 49)]); // Keep last 50
            
            // Refresh data if it's for current project
            if (selectedProject && data.projectId === selectedProject.id) {
              fetchMilestones(data.projectId);
              fetchAuditTrail(data.projectId);
            }
            
            // Refresh projects list
            fetchProjects();
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(() => {
          if (wsRef.current) {
            wsRef.current = null;
            // Reconnect will happen on next render
          }
        }, 5000);
      };
      
      wsRef.current = ws;
    } catch (e) {
      console.warn('WebSocket not available, using polling instead');
    }
    
    // Fallback: Poll for updates every 30 seconds
    notificationCheckInterval.current = setInterval(() => {
      fetchProjects();
      if (selectedProject) {
        fetchMilestones(selectedProject.id);
        fetchAuditTrail(selectedProject.id);
      }
    }, 30000);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (notificationCheckInterval.current) {
        clearInterval(notificationCheckInterval.current);
      }
    };
  }, [selectedProject, fetchProjects, fetchMilestones, fetchAuditTrail]);

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Load milestones and audit trail when project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchMilestones(selectedProject.id);
      fetchAuditTrail(selectedProject.id);
    }
  }, [selectedProject, fetchMilestones, fetchAuditTrail]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '₱0.00';
    return `₱${parseFloat(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Get action icon
  const getActionIcon = (action) => {
    if (action.includes('CREATED')) {
      return 'M12 4v16m8-8H4';
    } else if (action.includes('UPDATED') || action.includes('UPDATE')) {
      return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
    } else if (action.includes('APPROVED') || action.includes('APPROVAL')) {
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    } else if (action.includes('EXPORT')) {
      return 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    } else if (action.includes('COMPLETED')) {
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
    return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  };

  // Get action color
  const getActionColor = (action) => {
    if (action.includes('CREATED')) return 'text-green-600 bg-green-100';
    if (action.includes('UPDATED') || action.includes('UPDATE')) return 'text-blue-600 bg-blue-100';
    if (action.includes('APPROVED') || action.includes('APPROVAL')) return 'text-purple-600 bg-purple-100';
    if (action.includes('EXPORT')) return 'text-orange-600 bg-orange-100';
    if (action.includes('COMPLETED')) return 'text-indigo-600 bg-indigo-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading && projects.length === 0) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme.bg} p-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-${theme.accent}-600`}></div>
              <p className="mt-4 text-gray-600">Loading projects...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} p-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${theme.primary} text-white rounded-2xl shadow-xl p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Project Summary & Report</h1>
              <p className="text-white/90">Comprehensive project monitoring and audit trail</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all ${notifications.length > 0 ? 'animate-pulse' : ''}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Recent Updates</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No new notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <p className="text-sm text-gray-900">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(notif.timestamp)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Project
          </label>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value);
              setSelectedProject(project);
            }}
            className={`w-full px-4 py-3 border-2 ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-${theme.accent}-500`}
          >
            <option value="">-- Select a project --</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name || project.projectTitle} - {project.projectCode || 'N/A'}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {selectedProject ? (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-6 py-4 font-medium transition-colors ${
                    activeTab === 'summary'
                      ? `text-${theme.accent}-600 border-b-2 border-${theme.accent}-600`
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Project Summary
                </button>
                <button
                  onClick={() => setActiveTab('milestones')}
                  className={`px-6 py-4 font-medium transition-colors ${
                    activeTab === 'milestones'
                      ? `text-${theme.accent}-600 border-b-2 border-${theme.accent}-600`
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Milestones
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-6 py-4 font-medium transition-colors ${
                    activeTab === 'audit'
                      ? `text-${theme.accent}-600 border-b-2 border-${theme.accent}-600`
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Audit Trail
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Project Summary Tab */}
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                        <h3 className="text-sm font-medium opacity-90 mb-2">Project Code</h3>
                        <p className="text-2xl font-bold">{selectedProject.projectCode || 'N/A'}</p>
                      </div>
                      <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                        <h3 className="text-sm font-medium opacity-90 mb-2">Status</h3>
                        <p className="text-2xl font-bold capitalize">{selectedProject.status || 'N/A'}</p>
                      </div>
                      <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                        <h3 className="text-sm font-medium opacity-90 mb-2">Overall Progress</h3>
                        <p className="text-2xl font-bold">
                          {parseFloat(selectedProject.overallProgress || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                        <h3 className="text-sm font-medium opacity-90 mb-2">Total Budget</h3>
                        <p className="text-2xl font-bold">{formatCurrency(selectedProject.totalBudget)}</p>
                      </div>
                      <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                        <h3 className="text-sm font-medium opacity-90 mb-2">Start Date</h3>
                        <p className="text-lg font-bold">{formatDate(selectedProject.startDate)}</p>
                      </div>
                      <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                        <h3 className="text-sm font-medium opacity-90 mb-2">Target Completion</h3>
                        <p className="text-lg font-bold">{formatDate(selectedProject.endDate)}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedProject.description || selectedProject.objectives || 'No description available.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Implementing Office</h3>
                        <p className="text-gray-700">
                          {selectedProject.implementingOfficeName || selectedProject.implementingOffice || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">EIU/Contractor</h3>
                        <p className="text-gray-700">
                          {selectedProject.eiuPersonnel?.name || selectedProject.assignedEIU?.name || 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Milestones Tab */}
                {activeTab === 'milestones' && (
                  <div className="space-y-4">
                    {projectMilestones.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No milestones found for this project.
                      </div>
                    ) : (
                      projectMilestones.map((milestone, idx) => {
                        // Determine status with priority: completed > delayed > in_progress > pending
                        let displayStatus = milestone.status || 'pending';
                        let statusColor = 'bg-gray-100 text-gray-800';
                        
                        if (milestone.status === 'completed' || milestone.status === 'approved') {
                          displayStatus = 'completed';
                          statusColor = 'bg-green-100 text-green-800';
                        } else if (milestone.status === 'delayed') {
                          displayStatus = 'delayed';
                          statusColor = 'bg-red-100 text-red-800';
                        } else if (milestone.status === 'in_progress' || milestone.status === 'in-progress') {
                          displayStatus = 'in_progress';
                          statusColor = 'bg-blue-100 text-blue-800';
                        } else {
                          // Check if milestone is delayed based on due date
                          if (milestone.dueDate) {
                            const dueDate = new Date(milestone.dueDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            dueDate.setHours(0, 0, 0, 0);
                            
                            if (dueDate < today) {
                              displayStatus = 'delayed';
                              statusColor = 'bg-red-100 text-red-800';
                            }
                          }
                        }
                        
                        // Calculate progress - use actual progress from submissions or milestone data
                        let progress = parseFloat(milestone.progress || 0);
                        
                        // If completed/approved but progress is 0, set to 100
                        if ((milestone.status === 'completed' || milestone.status === 'approved') && progress === 0) {
                          progress = 100;
                        }
                        
                        // Try to get progress from submissions
                        if (milestone.submissions && Array.isArray(milestone.submissions)) {
                          const approvedSubmission = milestone.submissions.find(s => 
                            s.status === 'approved' || s.status === 'iu_approved'
                          );
                          
                          if (approvedSubmission) {
                            progress = parseFloat(
                              approvedSubmission.progress || 
                              approvedSubmission.timelineProgress || 
                              approvedSubmission.overallProgress || 
                              progress
                            );
                          }
                        }
                        
                        return (
                          <div key={milestone.id || idx} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                  {milestone.title || milestone.name || `Milestone ${idx + 1}`}
                                </h3>
                                <p className="text-gray-600">{milestone.description || 'No description'}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColor}`}>
                                {displayStatus}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div>
                                <p className="text-sm text-gray-500">Weight</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {parseFloat(milestone.weight || 0).toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Budget</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(milestone.budget || milestone.plannedBudget)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Due Date</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatDate(milestone.dueDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Progress</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {progress.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Audit Trail Tab */}
                {activeTab === 'audit' && (
                  <div className="space-y-6">
                    {Object.keys(auditTrail).length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No audit trail data available for this project.
                      </div>
                    ) : (
                      Object.entries(auditTrail).map(([department, activities]) => (
                        <div key={department} className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            {department} Department
                          </h3>
                          <div className="space-y-4">
                            {activities.map((activity) => (
                              <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(activity.action)}`}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={getActionIcon(activity.action)} />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(activity.action)}`}>
                                      {activity.action}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      by {activity.user?.name || 'System'}
                                    </span>
                                  </div>
                                  {activity.details && (
                                    <p className="text-sm text-gray-700 mt-1">{activity.details}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">
                                    {formatDate(activity.createdAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-lg">Please select a project to view its summary and report.</p>
          </div>
        )}
      </div>
    </div>
  );
}


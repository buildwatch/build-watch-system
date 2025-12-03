import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

// Dynamic API URL helper - works for both localhost and production
const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/api'; // Server-side fallback
  }
  const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProd 
    ? `${window.location.protocol}//${window.location.hostname}/api`
  : 'http://localhost:3000/api';
};

const API_URL = getApiUrl();

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

// Normalize profile picture URL - handles relative paths, API endpoints, and full URLs
const normalizeProfilePictureUrl = (url) => {
  if (!url) return null;
  
  // If it's already a data URL or blob URL, use it directly
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // If it's a full URL (http/https), use it as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's an API endpoint, construct full URL
  if (url.startsWith('/api/') || url.includes('/api/profile/picture/')) {
    const baseUrl = typeof window !== 'undefined' 
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3000'
          : `${window.location.protocol}//${window.location.hostname}`)
      : 'http://localhost:3000';
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  }
  
  // If it's a relative path (starts with /uploads), construct full URL
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const baseUrl = typeof window !== 'undefined' 
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3000'
          : `${window.location.protocol}//${window.location.hostname}`)
      : 'http://localhost:3000';
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  }
  
  // Default: assume it's a relative path
  const baseUrl = typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : `${window.location.protocol}//${window.location.hostname}`)
    : 'http://localhost:3000';
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
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
        primary: 'from-[#0D7DB5] to-[#0A6A9A]',
        secondary: 'from-[#0A6A9A] to-[#075A85]',
        accent: 'blue',
        bg: 'from-blue-50 to-white',
        text: 'text-[#0D7DB5]',
        border: 'border-[#0D7DB5]/20',
        hover: 'hover:bg-blue-50'
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
  const [milestoneSubmissionsMap, setMilestoneSubmissionsMap] = useState({}); // Map of milestoneId -> submissions array
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [budgetData, setBudgetData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [downloadAuditTrail, setDownloadAuditTrail] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const currentUser = getCurrentUser();
  const resolvedUserRole = userRole || currentUser?.role;
  const theme = getThemeColors(resolvedUserRole);
  const socketRef = useRef(null);
  const notificationCheckInterval = useRef(null);
  
  // Calculate milestone progress from divisions (matches logic from progress-timeline.astro and submit-update.astro)
  const calculateMilestoneProgressFromDivisions = (milestone, approvedSubmission = null) => {
    const milestoneWeight = parseFloat(milestone.weight || 0);
    if (milestoneWeight === 0) return 0;
    
    // Get division weights (default to equal distribution if not set)
    const timelineDivWeight = parseFloat(milestone.timelineWeight || milestoneWeight / 3);
    const budgetDivWeight = parseFloat(milestone.budgetWeight || milestoneWeight / 3);
    const physicalDivWeight = parseFloat(milestone.physicalWeight || milestoneWeight / 3);
    
    // Get budget data from milestone or approved submission
    let plannedBudget = parseFloat(milestone.plannedBudget || milestone.budgetPlanned || 0);
    let usedBudget = parseFloat(milestone.usedBudget || 0);
    
    // Try to get from approved submission if not in milestone
    if ((plannedBudget === 0 || usedBudget === 0 || isNaN(usedBudget)) && approvedSubmission) {
      if (plannedBudget === 0) plannedBudget = parseFloat(approvedSubmission.plannedBudget || approvedSubmission.budgetPlanned || 0);
      if (usedBudget === 0 || isNaN(usedBudget)) {
        usedBudget = parseFloat(approvedSubmission.usedBudget || 0);
        // Also try to get from budgetUtilizationPercentage if usedBudget is still 0
        if (usedBudget === 0 && approvedSubmission.budgetUtilizationPercentage && plannedBudget > 0) {
          const utilizationPercent = parseFloat(approvedSubmission.budgetUtilizationPercentage) || 0;
          usedBudget = (plannedBudget * utilizationPercent) / 100;
        }
      }
    }
    
    // Calculate actual progress based on division statuses and budget utilization
    let actualTimelineProgress = 0;
    let actualBudgetProgress = 0;
    let actualPhysicalProgress = 0;
    
    // Timeline division: if approved/completed, use full weight
    if (milestone.timelineStatus === 'completed' || milestone.timelineStatus === 'approved' || milestone.timelineStatus === 'iu_approved' || milestone.timelineStatus === 'secretariat_approved') {
      actualTimelineProgress = timelineDivWeight;
    } else if (milestone.timelineStatus === 'in_progress' || milestone.timelineStatus === 'ongoing') {
      actualTimelineProgress = timelineDivWeight * 0.5;
    }
    
      // Budget division: calculate from actual budget utilization
      if (milestone.budgetStatus === 'completed' || milestone.budgetStatus === 'approved' || milestone.budgetStatus === 'iu_approved' || milestone.budgetStatus === 'secretariat_approved') {
        if (plannedBudget > 0 && usedBudget > 0) {
          const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
          actualBudgetProgress = budgetDivWeight * budgetUtilizationRatio;
          console.log(`💰 [${milestone.title}] Budget: Approved with utilization →`, {
            utilizationRatio: budgetUtilizationRatio,
            budgetDivWeight,
            actualBudgetProgress
          });
        } else {
          // Try to get budgetUtilizationPercentage from approved submission
          let budgetUtilizationRatio = 1.0; // Default to 100% if no data
          if (approvedSubmission && approvedSubmission.budgetUtilizationPercentage !== undefined && approvedSubmission.budgetUtilizationPercentage !== null) {
            budgetUtilizationRatio = Math.min(1, parseFloat(approvedSubmission.budgetUtilizationPercentage) / 100);
            console.log(`💰 [${milestone.title}] Budget: Using budgetUtilizationPercentage from submission:`, budgetUtilizationRatio);
          } else {
            console.log(`⚠️ [${milestone.title}] Budget: No budget data, defaulting to 100%`);
          }
          actualBudgetProgress = budgetDivWeight * budgetUtilizationRatio;
        }
      } else if (milestone.budgetStatus === 'in_progress' || milestone.budgetStatus === 'ongoing') {
        if (plannedBudget > 0 && usedBudget > 0) {
          const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
          actualBudgetProgress = budgetDivWeight * budgetUtilizationRatio * 0.5;
          console.log(`💰 [${milestone.title}] Budget: In Progress with utilization →`, {
            utilizationRatio: budgetUtilizationRatio,
            budgetDivWeight,
            actualBudgetProgress
          });
        } else {
          let budgetUtilizationRatio = 0.5; // Default to 50% if no data
          if (approvedSubmission && approvedSubmission.budgetUtilizationPercentage !== undefined && approvedSubmission.budgetUtilizationPercentage !== null) {
            budgetUtilizationRatio = Math.min(1, parseFloat(approvedSubmission.budgetUtilizationPercentage) / 100) * 0.5;
          }
          actualBudgetProgress = budgetDivWeight * budgetUtilizationRatio;
        }
      } else {
        console.log(`❌ [${milestone.title}] Budget: Not started → 0`);
      }
    
    // Physical division: if approved/completed, use full weight
    if (milestone.physicalStatus === 'completed' || milestone.physicalStatus === 'approved' || milestone.physicalStatus === 'iu_approved' || milestone.physicalStatus === 'secretariat_approved') {
      actualPhysicalProgress = physicalDivWeight;
    } else if (milestone.physicalStatus === 'in_progress' || milestone.physicalStatus === 'ongoing') {
      actualPhysicalProgress = physicalDivWeight * 0.5;
    }
    
      // Sum up the actual progress from all divisions
      const calculatedProgress = actualTimelineProgress + actualBudgetProgress + actualPhysicalProgress;
      
      console.log(`🎯 [${milestone.title}] Final calculation:`, {
        timeline: actualTimelineProgress.toFixed(2),
        budget: actualBudgetProgress.toFixed(2),
        physical: actualPhysicalProgress.toFixed(2),
        total: calculatedProgress.toFixed(2)
      });
      
      return calculatedProgress > 0 ? calculatedProgress : 0;
  };
  const budgetChartRef = useRef(null);
  const timelineChartRef = useRef(null);

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
        
        // Fetch submissions to get usedBudget
        let submissions = [];
        let submissionsMap = {}; // Declare outside try block for use in enhancement
        try {
          const submissionsResponse = await fetch(`${API_URL}/milestones/milestone-submissions?projectId=${projectId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (submissionsResponse.ok) {
            const submissionsResult = await submissionsResponse.json();
            submissions = submissionsResult.submissions || submissionsResult.data || [];
            
            // Create a map of milestoneId -> submissions array for persistent access
            const milestoneBudgetMap = {};
            
            submissions
              .filter(s => s.status === 'approved' || s.status === 'iu_approved')
              .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
              .forEach(submission => {
                if (!milestoneBudgetMap[submission.milestoneId] && submission.usedBudget) {
                  milestoneBudgetMap[submission.milestoneId] = parseFloat(submission.usedBudget || 0);
                }
              });
            
            // Create submissions map for all submissions (not just approved)
            submissions.forEach(submission => {
              if (!submissionsMap[submission.milestoneId]) {
                submissionsMap[submission.milestoneId] = [];
              }
              submissionsMap[submission.milestoneId].push(submission);
            });
            
            // Store submissions map in state for persistent access
            setMilestoneSubmissionsMap(submissionsMap);
            
            // Attach usedBudget to milestones
            if (project.milestones && Array.isArray(project.milestones)) {
              project.milestones.forEach(milestone => {
                if (milestoneBudgetMap[milestone.id] !== undefined) {
                  milestone.usedBudget = milestoneBudgetMap[milestone.id];
                }
                milestone.submissions = submissionsMap[milestone.id] || [];
              });
            }
          }
        } catch (subErr) {
          console.warn('Error fetching submissions:', subErr);
        }
        
        if (project.milestones && Array.isArray(project.milestones)) {
          // Enhance milestones with progress and status
          const enhancedMilestones = project.milestones.map(milestone => {
            // Get submissions from milestone or from persistent map
            const milestoneSubmissions = milestone.submissions || submissionsMap[milestone.id] || [];
            const approvedSubmission = milestoneSubmissions.find(s => 
                s.status === 'approved' || s.status === 'iu_approved'
              );
              
            // Ensure usedBudget is set from approved submission if not already in milestone
            let usedBudget = milestone.usedBudget;
            if (!usedBudget && approvedSubmission && approvedSubmission.usedBudget) {
              usedBudget = parseFloat(approvedSubmission.usedBudget || 0);
            }
            
            // Preserve all milestone properties including usedBudget and submissions
            const enhanced = { 
              ...milestone,
              usedBudget: usedBudget, // Explicitly preserve usedBudget
              submissions: milestoneSubmissions // Explicitly preserve submissions from map
            };
            
            console.log(`🔍 [${milestone.title}] Enhancing milestone:`, {
              hasUsedBudget: !!enhanced.usedBudget,
              usedBudgetValue: enhanced.usedBudget,
              hasSubmissions: !!enhanced.submissions,
              submissionsCount: enhanced.submissions?.length || 0,
              hasApprovedSubmission: !!approvedSubmission,
              approvedSubmissionUsedBudget: approvedSubmission?.usedBudget
            });
            
            // Calculate actual progress from submissions using division-based calculation
            if (approvedSubmission) {
                // If milestone has approved submission, mark as completed
                if (milestone.status !== 'completed' && milestone.status !== 'approved') {
                  enhanced.status = 'completed';
              }
            }
            
            // Also check if milestone status is already completed/approved
            if (milestone.status === 'completed' || milestone.status === 'approved') {
              enhanced.status = 'completed';
              // ALWAYS recalculate progress using division-based calculation for completed milestones
              // This ensures we use the actual usedBudget from submissions
              const calculatedProgress = calculateMilestoneProgressFromDivisions(enhanced, approvedSubmission);
              console.log(`📊 [${milestone.title}] Calculated progress for completed milestone:`, calculatedProgress);
              if (calculatedProgress > 0) {
                enhanced.progress = calculatedProgress;
              } else {
                // Only fallback to existing progress or 100 if calculation truly fails
                if (enhanced.progress && enhanced.progress > 0) {
                  console.log(`⚠️ [${milestone.title}] Calculation returned 0, keeping existing progress:`, enhanced.progress);
                } else {
                  console.log(`⚠️ [${milestone.title}] Calculation returned 0, using fallback 100%`);
                enhanced.progress = 100;
                }
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
          
          // If milestone is completed but progress is 0, calculate from divisions
          if ((milestone.status === 'completed' || milestone.status === 'approved') && 
              (!enhanced.progress || enhanced.progress === 0)) {
            const calculatedProgress = calculateMilestoneProgressFromDivisions(milestone);
            enhanced.progress = calculatedProgress > 0 ? calculatedProgress : 100;
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
        const activities = activityResult.activities || [];
        
        // Process activities and ensure proper formatting
        activities.forEach(activity => {
          // Format activity for display - preserve all user data including profilePictureUrl
          const userData = activity.user || {};
          const formattedActivity = {
            id: activity.id || `activity-${activity.entityId}-${activity.createdAt}`,
            action: activity.action || 'UNKNOWN_ACTION',
            entityType: activity.entityType || 'Unknown',
            entityId: activity.entityId || projectId,
            details: typeof activity.details === 'string' 
              ? activity.details 
              : (activity.details?.message || JSON.stringify(activity.details) || 'No details available'),
            createdAt: activity.createdAt || activity.timestamp || new Date().toISOString(),
            user: {
              id: userData.id || activity.userId,
              name: userData.name || userData.fullName || activity.userName || 'System',
              role: userData.role || activity.userRole || 'System',
              department: userData.department || activity.department || 'System',
              email: userData.email || activity.userEmail,
              profilePictureUrl: userData.profilePictureUrl || activity.profilePictureUrl || null
            },
            module: activity.module || 'Project Management'
          };
          
          allActivities.push(formattedActivity);
        });
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
              const submitter = submission.submitter || submission.submitterInfo || {};
              allActivities.push({
                id: `submission-${submission.id}`,
                action: 'MILESTONE_SUBMITTED',
                entityType: 'MilestoneSubmission',
                entityId: submission.milestoneId,
                details: `Submitted milestone update: ${submission.milestone?.title || 'Milestone'}${submission.reviewNotes ? ` - ${submission.reviewNotes}` : ''}`,
                createdAt: submission.submittedAt || submission.createdAt,
                user: {
                  id: submitter.id || submission.submitterId,
                  name: submitter.name || 'EIU Personnel',
                  role: 'EIU',
                  department: submitter.department,
                  email: submitter.email,
                  profilePictureUrl: submitter.profilePictureUrl || null
                },
                module: 'Milestone Submission'
              });
            }
            
            // Add approval entry (from LGU-IU)
            if (submission.status === 'approved' || submission.status === 'iu_approved') {
              const reviewer = submission.reviewer || {};
              // Build details string with remarks if available
              let details = `Approved milestone submission: ${submission.milestone?.title || 'Milestone'}`;
              if (submission.reviewNotes) {
                details += ` - ${submission.reviewNotes}`;
              }
              
              allActivities.push({
                id: `approval-${submission.id}`,
                action: 'MILESTONE_APPROVED',
                entityType: 'MilestoneSubmission',
                entityId: submission.milestoneId,
                details: details,
                createdAt: submission.reviewedAt || submission.updatedAt || submission.createdAt,
                user: {
                  id: reviewer.id || submission.reviewerId,
                  name: submission.approverFullName || submission.approverName || reviewer.name || 'LGU-IU Personnel',
                  role: 'LGU-IU',
                  department: reviewer.department,
                  email: reviewer.email,
                  profilePictureUrl: reviewer.profilePictureUrl || null
                },
                module: 'Milestone Approval',
                remarks: submission.remarks || submission.remarksAndRecommendation || null,
                approverFullName: submission.approverFullName || submission.approverName || null
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
        
        // Store project data with amountSpent and targetCompletionDate for completion summary
        // amountSpent can come from project.amountSpent or progress.amountSpent
        if (project.amountSpent) {
          // Already in project object
        } else if (projectResult.progress?.amountSpent) {
          project.amountSpent = projectResult.progress.amountSpent;
        } else if (projectResult.project?.amountSpent) {
          project.amountSpent = projectResult.project.amountSpent;
        }
        
        // Ensure targetCompletionDate is set
        if (!project.targetCompletionDate && project.endDate) {
          project.targetCompletionDate = project.endDate;
        }
        
        // Ensure status is normalized (database uses 'complete', API should return 'completed')
        if (project.status === 'complete') {
          project.status = 'completed';
        }
        
        // Ensure overallProgress is set from project or progress data
        if (!project.overallProgress || project.overallProgress === 0) {
          if (projectResult.progress?.overall) {
            project.overallProgress = projectResult.progress.overall;
          } else if (projectResult.project?.overallProgress) {
            project.overallProgress = projectResult.project.overallProgress;
          }
        }
        
        // Check if project is completed and add completion event
        const isCompleted = project.status === 'complete' || project.status === 'completed' || project.status === 'COMPLETED';
        if (isCompleted && project.completionDate) {
          // Find project completion activity from activity log
          const completionActivity = allActivities.find(a => 
            a.action === 'PROJECT_COMPLETED' && a.entityId === project.id
          );
          
          // If not found in activity log, create one from project data
          if (!completionActivity) {
            allActivities.push({
              id: `completion-${project.id}`,
              action: 'PROJECT_COMPLETED',
              entityType: 'Project',
              entityId: project.id,
              details: `Project completed: ${project.name} (${project.projectCode}). All milestones have been approved and completed. Final completion date: ${new Date(project.completionDate).toLocaleString()}`,
              createdAt: project.completionDate || project.actualCompletionDate || project.updatedAt,
              user: {
                name: project.implementingOfficeName || 'System',
                role: 'LGU-IU',
                department: 'Project Management'
              },
              module: 'Project Completion'
            });
          }
        }
        
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
    
    // WebSocket connection for real-time notifications (using Socket.IO)
    try {
      // Use Socket.IO instead of raw WebSocket
      // Dynamic socket URL - works for both localhost and production
      const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const socketUrl = isProd 
        ? `${window.location.protocol}//${window.location.hostname}`
        : 'http://localhost:3000';
      
      const socket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });
      
      socket.on('connect', () => {
        console.log('Socket.IO connected for Project Summary');
      });
      
      socket.on('project_update', (data) => {
        try {
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
              // Budget and timeline will be refreshed when milestones are loaded
            }
            
            // Refresh projects list
            fetchProjects();
          }
        } catch (e) {
          console.error('Error parsing Socket.IO message:', e);
        }
      });
      
      socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
      });
      
      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected, will reconnect automatically');
      });
      
      socketRef.current = socket;
    } catch (e) {
      console.warn('WebSocket not available, using polling instead');
    }
    
    // Fallback: Poll for updates every 30 seconds
    notificationCheckInterval.current = setInterval(() => {
      fetchProjects();
      if (selectedProject) {
        fetchMilestones(selectedProject.id);
        fetchAuditTrail(selectedProject.id);
        // Budget and timeline will be refreshed when milestones are loaded
      }
    }, 30000);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
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

  // Fetch budget data for Budgeting tab
  const fetchBudgetData = useCallback(async (projectId, milestones = null) => {
    if (!projectId) return;
    
    console.log('💰 [Budget Debug] Starting budget data fetch for project:', projectId);
    
    try {
      const token = getToken();
      
      // Fetch project for budget totals
      const projectResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!projectResponse.ok) {
        console.error('💰 [Budget Debug] Project fetch failed:', projectResponse.status);
        setBudgetData(null);
        return;
      }
      
      const projectResult = await projectResponse.json();
      const project = projectResult.project || projectResult;
      
      console.log('💰 [Budget Debug] Project data:', {
        totalBudget: project.totalBudget,
        amountSpent: project.amountSpent,
        usedBudget: project.usedBudget,
        budgetUsed: project.budgetUsed
      });
      
      // Use milestones from parameter or fetch them
      let milestonesToUse = milestones;
      if (!milestonesToUse || milestonesToUse.length === 0) {
        // Fetch milestones if not provided
        try {
          const milestonesResponse = await fetch(`${API_URL}/projects/${projectId}/milestones`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (milestonesResponse.ok) {
            const milestonesResult = await milestonesResponse.json();
            milestonesToUse = milestonesResult.milestones || milestonesResult.data || [];
            console.log('💰 [Budget Debug] Fetched milestones separately:', milestonesToUse.length);
          }
        } catch (milestoneErr) {
          console.warn('💰 [Budget Debug] Error fetching milestones:', milestoneErr);
        }
      } else {
        console.log('💰 [Budget Debug] Using provided milestones:', milestonesToUse.length);
      }
      
      // Fetch milestone submissions separately
      let submissions = [];
      try {
        const submissionsResponse = await fetch(`${API_URL}/milestones/milestone-submissions?projectId=${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (submissionsResponse.ok) {
          const submissionsResult = await submissionsResponse.json();
          submissions = submissionsResult.submissions || submissionsResult.data || [];
          console.log('💰 [Budget Debug] Fetched submissions:', submissions.length);
        } else {
          console.warn('💰 [Budget Debug] Submissions fetch failed:', submissionsResponse.status);
        }
      } catch (subErr) {
        console.warn('💰 [Budget Debug] Error fetching submissions:', subErr);
      }
      
      // Calculate budget data from milestones and submissions
      const totalBudget = parseFloat(project.totalBudget || 0);
      let usedBudget = parseFloat(project.amountSpent || project.usedBudget || project.budgetUsed || 0);
      
      // Get milestone budget breakdown
      const milestoneBudgets = [];
      const budgetTrend = [];
      
      if (milestonesToUse && Array.isArray(milestonesToUse) && milestonesToUse.length > 0) {
        console.log('💰 [Budget Debug] Processing milestones:', milestonesToUse.length);
        
        // Group submissions by milestone
        const submissionsByMilestone = {};
        submissions.forEach(sub => {
          const milestoneId = sub.milestoneId;
          if (!submissionsByMilestone[milestoneId]) {
            submissionsByMilestone[milestoneId] = [];
          }
          submissionsByMilestone[milestoneId].push(sub);
        });
        
        let cumulativeUsed = 0;
        
        // Sort milestones by order or due date
        const sortedMilestones = [...milestonesToUse].sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
          }
          return 0;
        });
        
        sortedMilestones.forEach((milestone, index) => {
          const milestoneId = milestone.id;
          const milestoneBudget = parseFloat(milestone.budget || milestone.plannedBudget || 0);
          
          // Get used budget from approved submissions
          const milestoneSubmissions = submissionsByMilestone[milestoneId] || [];
          const approvedSubmissions = milestoneSubmissions.filter(s => 
            s.status === 'approved' || s.status === 'iu_approved'
          );
          
          // Get the latest approved submission's used budget and breakdown
          let milestoneUsed = 0;
          let budgetBreakdown = '';
          if (approvedSubmissions.length > 0) {
            // Sort by submittedAt descending and take the latest
            const latestSubmission = approvedSubmissions.sort((a, b) => 
              new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0)
            )[0];
            milestoneUsed = parseFloat(latestSubmission.usedBudget || latestSubmission.budgetUsed || 0);
            
            // Get budget breakdown from various possible fields
            budgetBreakdown = latestSubmission.divisions?.budget?.budgetBreakdown ||
                             latestSubmission.budget?.breakdown ||
                             latestSubmission.budgetBreakdownAllocation ||
                             latestSubmission.budgetBreakdown ||
                             milestone.budgetBreakdown ||
                             '';
          }
          
          // Only add to cumulative if this milestone has budget used
          if (milestoneUsed > 0) {
          cumulativeUsed += milestoneUsed;
          }
          
          milestoneBudgets.push({
            name: milestone.title || milestone.name || `Milestone ${index + 1}`,
            planned: milestoneBudget,
            used: milestoneUsed,
            remaining: milestoneBudget - milestoneUsed,
            utilization: milestoneBudget > 0 ? (milestoneUsed / milestoneBudget) * 100 : 0,
            budgetBreakdown: budgetBreakdown
          });
          
          // Build trend data - only show milestones with budget activity OR show all with individual utilization
          // For cumulative: only increase when milestone has budget used
          // For individual utilization: show each milestone's own utilization percentage
          const individualUtilization = milestoneBudget > 0 ? (milestoneUsed / milestoneBudget) * 100 : 0;
          
          budgetTrend.push({
            milestone: milestone.title || milestone.name || `M${index + 1}`,
            date: milestone.dueDate || new Date().toISOString(),
            cumulative: cumulativeUsed, // Cumulative only increases when milestone has budget
            individualUtilization: individualUtilization, // Individual milestone utilization
            percentage: totalBudget > 0 ? (cumulativeUsed / totalBudget) * 100 : 0 // Cumulative percentage of total budget
          });
        });
        
        // If we calculated from submissions, use that instead of project amountSpent
        if (cumulativeUsed > 0) {
          usedBudget = cumulativeUsed;
        }
        
        console.log('💰 [Budget Debug] Budget calculation:', {
          totalBudget,
          usedBudget,
          remainingBudget: totalBudget - usedBudget,
          milestoneBudgetsCount: milestoneBudgets.length,
          budgetTrendCount: budgetTrend.length
        });
      } else {
        console.warn('💰 [Budget Debug] No milestones found');
      }
      
      const utilizationPercentage = totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;
      
      const budgetDataResult = {
        total: totalBudget,
        used: usedBudget,
        remaining: totalBudget - usedBudget,
        utilizationPercentage,
        milestoneBudgets,
        budgetTrend
      };
      
      console.log('💰 [Budget Debug] Final budget data:', budgetDataResult);
      setBudgetData(budgetDataResult);
    } catch (err) {
      console.error('💰 [Budget Debug] Error fetching budget data:', err);
      setBudgetData(null);
    }
  }, []);

  // Fetch timeline data for Time Table tab
  const fetchTimelineData = useCallback(async (projectId, milestones = null) => {
    if (!projectId) return;
    
    console.log('📅 [Timeline Debug] Starting timeline data fetch for project:', projectId);
    
    try {
      const token = getToken();
      
      // Fetch project for dates and progress
      const projectResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!projectResponse.ok) {
        console.error('📅 [Timeline Debug] Project fetch failed:', projectResponse.status);
        setTimelineData(null);
        return;
      }
      
      const projectResult = await projectResponse.json();
      const project = projectResult.project || projectResult;
      
      console.log('📅 [Timeline Debug] Project data:', {
        startDate: project.startDate,
        endDate: project.endDate,
        targetCompletionDate: project.targetCompletionDate,
        overallProgress: project.overallProgress
      });
      
      // Use milestones from parameter or fetch them
      let milestonesToUse = milestones;
      if (!milestonesToUse || milestonesToUse.length === 0) {
        // Fetch milestones if not provided
        try {
          const milestonesResponse = await fetch(`${API_URL}/projects/${projectId}/milestones`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (milestonesResponse.ok) {
            const milestonesResult = await milestonesResponse.json();
            milestonesToUse = milestonesResult.milestones || milestonesResult.data || [];
            console.log('📅 [Timeline Debug] Fetched milestones separately:', milestonesToUse.length);
          }
        } catch (milestoneErr) {
          console.warn('📅 [Timeline Debug] Error fetching milestones:', milestoneErr);
        }
      } else {
        console.log('📅 [Timeline Debug] Using provided milestones:', milestonesToUse.length);
      }
      
      // Fetch milestone submissions separately
      let submissions = [];
      try {
        const submissionsResponse = await fetch(`${API_URL}/milestones/milestone-submissions?projectId=${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (submissionsResponse.ok) {
          const submissionsResult = await submissionsResponse.json();
          submissions = submissionsResult.submissions || submissionsResult.data || [];
          console.log('📅 [Timeline Debug] Fetched submissions:', submissions.length);
        } else {
          console.warn('📅 [Timeline Debug] Submissions fetch failed:', submissionsResponse.status);
        }
      } catch (subErr) {
        console.warn('📅 [Timeline Debug] Error fetching submissions:', subErr);
      }
      
      const startDate = new Date(project.startDate || project.createdAt);
      const endDate = new Date(project.endDate || project.targetCompletionDate || new Date());
      const today = new Date();
      
      // Build timeline data from milestones
      const timelineItems = [];
      const progressData = [];
      
      if (milestonesToUse && Array.isArray(milestonesToUse) && milestonesToUse.length > 0) {
        console.log('📅 [Timeline Debug] Processing milestones:', milestonesToUse.length);
        
        // Group submissions by milestone
        const submissionsByMilestone = {};
        submissions.forEach(sub => {
          const milestoneId = sub.milestoneId;
          if (!submissionsByMilestone[milestoneId]) {
            submissionsByMilestone[milestoneId] = [];
          }
          submissionsByMilestone[milestoneId].push(sub);
        });
        
        let cumulativeProgress = 0;
        
        // Sort milestones by order or due date
        const sortedMilestones = [...milestonesToUse].sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
          }
          return 0;
        });
        
        sortedMilestones.forEach((milestone, index) => {
          const milestoneId = milestone.id;
          const milestoneStart = milestone.startDate ? new Date(milestone.startDate) : startDate;
          const milestoneDue = milestone.dueDate ? new Date(milestone.dueDate) : endDate;
          
          // Get progress from milestone or approved submissions
          let milestoneProgress = parseFloat(milestone.progress || 0);
          
          // Check if milestone is completed
          const isCompleted = milestone.status === 'completed' || milestone.status === 'approved';
          
          // Get actual end date from approved submissions
          let actualEnd = null;
          const milestoneSubmissions = submissionsByMilestone[milestoneId] || [];
          const approvedSubmissions = milestoneSubmissions.filter(s => 
            s.status === 'approved' || s.status === 'iu_approved'
          );
          
          if (approvedSubmissions.length > 0) {
            // Get the latest approved submission
            const latestSubmission = approvedSubmissions.sort((a, b) => 
              new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0)
            )[0];
            actualEnd = new Date(latestSubmission.submittedAt || latestSubmission.createdAt);
            
            // Use progress from submission if available
            if (latestSubmission.progress !== undefined && latestSubmission.progress !== null) {
              milestoneProgress = parseFloat(latestSubmission.progress);
            } else if (isCompleted && milestoneProgress === 0) {
              // Calculate from divisions using the approved submission data
              milestoneProgress = calculateMilestoneProgressFromDivisions(milestone, latestSubmission);
              if (milestoneProgress === 0) milestoneProgress = 100; // Fallback
            }
          } else if (isCompleted && milestoneProgress === 0) {
            // Calculate from divisions
            milestoneProgress = calculateMilestoneProgressFromDivisions(milestone);
            if (milestoneProgress === 0) milestoneProgress = 100; // Fallback
          }
          
          const weight = parseFloat(milestone.weight || 0);
          
          // Only add to cumulative if milestone has actual progress
          // Cumulative progress = sum of (milestone progress * milestone weight / 100) for all milestones with progress
          if (milestoneProgress > 0) {
          cumulativeProgress += milestoneProgress * (weight / 100);
          }
          
          timelineItems.push({
            id: milestone.id,
            title: milestone.title || milestone.name || `Milestone ${index + 1}`,
            startDate: milestoneStart,
            dueDate: milestoneDue,
            actualEndDate: actualEnd,
            progress: milestoneProgress,
            status: milestone.status || 'pending',
            isCompleted,
            isDelayed: !isCompleted && milestoneDue < today,
            weight: weight
          });
          
          // Build progress trend
          // Cumulative should only increase when milestone has progress
          progressData.push({
            milestone: milestone.title || milestone.name || `M${index + 1}`,
            date: milestoneDue.toISOString(),
            actualEndDate: actualEnd ? actualEnd.toISOString() : null,
            progress: milestoneProgress, // Individual milestone progress
            cumulative: cumulativeProgress // Cumulative progress (only increases when milestone has progress > 0)
          });
        });
        
        console.log('📅 [Timeline Debug] Timeline calculation:', {
          timelineItemsCount: timelineItems.length,
          progressDataCount: progressData.length,
          cumulativeProgress
        });
      } else {
        console.warn('📅 [Timeline Debug] No milestones found');
      }
      
      // Sort by due date
      timelineItems.sort((a, b) => a.dueDate - b.dueDate);
      progressData.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const timelineDataResult = {
        projectStart: startDate,
        projectEnd: endDate,
        today,
        timelineItems,
        progressData,
        overallProgress: parseFloat(project.overallProgress || 0)
      };
      
      console.log('📅 [Timeline Debug] Final timeline data:', timelineDataResult);
      setTimelineData(timelineDataResult);
    } catch (err) {
      console.error('📅 [Timeline Debug] Error fetching timeline data:', err);
      setTimelineData(null);
    }
  }, []);

  // Fetch download audit trail
  const fetchDownloadAuditTrail = useCallback(async (projectId) => {
    if (!projectId) {
      setDownloadAuditTrail([]);
      return;
    }
    
    try {
      const token = getToken();
      if (!token) {
        setDownloadAuditTrail([]);
        return;
      }
      
      // Use AbortController for timeout (more compatible)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/projects/${projectId}/download-audit`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        setDownloadAuditTrail(result.downloads || result.data || []);
      } else {
        // If endpoint doesn't exist yet, initialize empty array
        setDownloadAuditTrail([]);
      }
    } catch (err) {
      // Silently handle errors - endpoint might not exist yet
      if (err.name !== 'AbortError') {
        console.warn('Could not fetch download audit trail:', err);
      }
      setDownloadAuditTrail([]);
    }
  }, []);

  // Load milestones, audit trail, budget, and timeline when project is selected
  useEffect(() => {
    if (selectedProject && selectedProject.id) {
      fetchMilestones(selectedProject.id);
      fetchAuditTrail(selectedProject.id);
    }
  }, [selectedProject, fetchMilestones, fetchAuditTrail]);

  // Fetch download audit trail only when Download Summary tab is active
  useEffect(() => {
    if (activeTab === 'download' && selectedProject && selectedProject.id) {
      fetchDownloadAuditTrail(selectedProject.id);
    }
  }, [activeTab, selectedProject, fetchDownloadAuditTrail]);

  // Load budget and timeline data when milestones are available
  useEffect(() => {
    if (selectedProject && projectMilestones && projectMilestones.length > 0) {
      fetchBudgetData(selectedProject.id, projectMilestones);
      fetchTimelineData(selectedProject.id, projectMilestones);
    }
  }, [selectedProject, projectMilestones, fetchBudgetData, fetchTimelineData]);

  // Animate progress bars in Time Table tab when timeline data is loaded
  useEffect(() => {
    if (activeTab === 'timeline' && timelineData && timelineData.timelineItems) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const progressBars = document.querySelectorAll('.progress-bar-fill-timeline');
        
        progressBars.forEach(bar => {
          const progress = parseFloat(bar.getAttribute('data-progress')) || 0;
          const weight = parseFloat(bar.getAttribute('data-weight')) || 0;
          
          if (weight > 0) {
            const fillPercentage = (progress / weight) * 100;
            bar.style.setProperty('--progress-width', `${fillPercentage}%`);
            
            // Reset animation
            bar.style.animation = 'none';
            bar.offsetHeight; // Trigger reflow
            bar.style.animation = 'fillProgressTimeline 2s ease-out forwards';
          }
        });
      }, 100);
    }
  }, [activeTab, timelineData]);

  // Expose debugging function to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugProjectSummaryReport = async () => {
        console.log('🔍 [Project Summary Report Debug] === DEBUGGING ===');
        
        if (!selectedProject) {
          console.log('❌ No project selected');
          return;
        }
        
        console.log('📊 Selected Project:', {
          id: selectedProject.id,
          name: selectedProject.name,
          projectCode: selectedProject.projectCode,
          totalBudget: selectedProject.totalBudget,
          amountSpent: selectedProject.amountSpent
        });
        
        console.log('💰 Budget Data:', budgetData);
        console.log('📅 Timeline Data:', timelineData);
        console.log('📋 Milestones:', projectMilestones);
        
        // Test API calls
        const token = getToken();
        console.log('🔑 Token available:', !!token);
        
        try {
          // Test project fetch
          const projectResponse = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (projectResponse.ok) {
            const projectResult = await projectResponse.json();
            const project = projectResult.project || projectResult;
            console.log('✅ Project API Response:', {
              hasMilestones: !!project.milestones,
              milestonesCount: project.milestones?.length || 0,
              firstMilestone: project.milestones?.[0] || null
            });
          } else {
            console.error('❌ Project API failed:', projectResponse.status);
          }
          
          // Test submissions fetch
          const submissionsResponse = await fetch(`${API_URL}/milestones/milestone-submissions?projectId=${selectedProject.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (submissionsResponse.ok) {
            const submissionsResult = await submissionsResponse.json();
            const submissions = submissionsResult.submissions || submissionsResult.data || [];
            console.log('✅ Submissions API Response:', {
              count: submissions.length,
              firstSubmission: submissions[0] || null,
              approvedCount: submissions.filter(s => s.status === 'approved' || s.status === 'iu_approved').length
            });
          } else {
            console.error('❌ Submissions API failed:', submissionsResponse.status);
          }
        } catch (err) {
          console.error('❌ API Error:', err);
        }
        
        console.log('🔍 [Project Summary Report Debug] === END DEBUG ===');
      };
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.debugProjectSummaryReport) {
        delete window.debugProjectSummaryReport;
      }
    };
  }, [selectedProject, budgetData, timelineData, projectMilestones]);

  // Record download in audit trail
  const recordDownload = useCallback(async (projectId, format) => {
    if (!projectId) return;
    
    try {
      const token = getToken();
      if (!token) {
        console.warn('No token available for recording download');
        return;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      await fetch(`${API_URL}/projects/${projectId}/download-audit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: format
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Refresh download audit trail only if we're on the download tab
      if (activeTab === 'download') {
        fetchDownloadAuditTrail(projectId);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Could not record download:', err);
      }
    }
  }, [fetchDownloadAuditTrail, activeTab]);

  // Load jsPDF library dynamically
  const loadJsPDFLibrary = async () => {
    if (window.jsPDF || window.jspdf) {
      return true;
    }

    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
      'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
    ];

    for (const src of scripts) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
        
        if (window.jsPDF || window.jspdf) {
          // Also load html2canvas for chart rendering
          const html2canvasScript = document.createElement('script');
          html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          document.head.appendChild(html2canvasScript);
          return true;
        }
      } catch (e) {
        console.warn(`Failed to load jsPDF from ${src}:`, e);
      }
    }
    return false;
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!selectedProject) {
      alert('Please select a project first.');
      return;
    }

    try {
      const loaded = await loadJsPDFLibrary();
      if (!loaded) {
        alert('Failed to load PDF library. Please try again.');
        return;
      }

      let jsPDF = window.jsPDF?.jsPDF || window.jsPDF || window.jspdf?.jsPDF || window.jspdf;
      if (!jsPDF || typeof jsPDF !== 'function') {
        alert('PDF library failed to initialize. Please try HTML format.');
        return;
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Get current date and time
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-PH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const currentTime = now.toLocaleTimeString('en-PH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const reportMonth = now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }).toUpperCase();
      
      // Get user/organization info
      const userData = getCurrentUser();
      const organizationName = userData?.implementingOfficeName || userData?.office || userData?.department || 'MUNICIPAL ENGINEERING OFFICE';
      
      // Helper to get base URL for images
      const getBaseUrl = () => {
        if (typeof window === 'undefined') return 'http://localhost:3000';
        const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        return isProd 
          ? `${window.location.protocol}//${window.location.hostname}`
          : 'http://localhost:3000';
      };
      
      const baseUrl = getBaseUrl();
      
      // Header Section
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 40, 'F');
      
      const headerHeight = 40;
      const pageWidth = 210;
      const logoSize = 18;
      const logoY = (headerHeight - logoSize) / 2;
      
      // Try to load logos
      try {
        const santaCruzLogo = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = `${baseUrl}/santa-cruz-seal.png`;
        });
        
        if (santaCruzLogo) {
          doc.addImage(santaCruzLogo, 'PNG', 10, logoY, logoSize, logoSize);
        }
      } catch (e) {
        console.warn('Could not load Santa Cruz logo:', e);
      }
      
      try {
        const mpadoLogo = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = `${baseUrl}/mpado_logo.png`;
        });
        
        if (mpadoLogo) {
          doc.addImage(mpadoLogo, 'PNG', pageWidth - 10 - logoSize, logoY, logoSize, logoSize);
        }
      } catch (e) {
        console.warn('Could not load MPDO logo:', e);
      }
      
      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('SANTA CRUZ PROJECT MONITORING SYSTEM', pageWidth / 2, 14, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('PROJECT SUMMARY & REPORT', pageWidth / 2, 21, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`As of ${reportMonth}`, pageWidth / 2, 28, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      
      // Report Information Section
      let yPos = 45;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Implementing Agency: ${organizationName}`, 10, yPos);
      
      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.text(`Report Generated: ${currentDate} at ${currentTime}`, 10, yPos);
      
      yPos += 6;
      doc.setFont(undefined, 'bold');
      doc.text(`Project: ${selectedProject.name || 'N/A'}`, 10, yPos);
      
      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.text(`Project Code: ${selectedProject.projectCode || 'N/A'}`, 10, yPos);
      
      yPos += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(10, yPos, 200, yPos);
      
      yPos += 10;
      
      // Project Summary Section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('PROJECT SUMMARY', 10, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const summaryInfo = [
        `Location: ${selectedProject.location || 'N/A'}`,
        `Total Budget: ${formatCurrency(selectedProject.totalBudget)}`,
        `Used Budget: ${formatCurrency(selectedProject.amountSpent || selectedProject.usedBudget || 0)}`,
        `Overall Progress: ${selectedProject.overallProgress != null ? parseFloat(selectedProject.overallProgress).toFixed(1) : '0.0'}%`,
        `Start Date: ${selectedProject.startDate ? formatDate(selectedProject.startDate) : 'N/A'}`,
        `End Date: ${selectedProject.endDate ? formatDate(selectedProject.endDate) : 'N/A'}`
      ];
      
      summaryInfo.forEach(info => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(info, 10, yPos);
        yPos += 6;
      });
      
      yPos += 5;
      
      // Milestones Section
      if (projectMilestones.length > 0) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('MILESTONES', 10, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        projectMilestones.forEach((milestone, idx) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          
          const approvedSubmission = milestone.submissions?.find(s => 
            s.status === 'approved' || s.status === 'iu_approved'
          );
          const progress = milestone.progress && milestone.progress > 0 
            ? parseFloat(milestone.progress).toFixed(1) 
            : calculateMilestoneProgressFromDivisions(milestone, approvedSubmission).toFixed(1);
          
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${milestone.title || 'N/A'}`, 10, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          doc.text(`   Weight: ${parseFloat(milestone.weight || 0).toFixed(1)}%`, 10, yPos);
          yPos += 5;
          doc.text(`   Budget: ${formatCurrency(milestone.plannedBudget || milestone.budgetPlanned)}`, 10, yPos);
          yPos += 5;
          doc.text(`   Used Budget: ${formatCurrency(milestone.usedBudget || approvedSubmission?.usedBudget || 0)}`, 10, yPos);
          yPos += 5;
          doc.text(`   Progress: ${progress}%`, 10, yPos);
          yPos += 5;
          doc.text(`   Status: ${milestone.status || 'N/A'}`, 10, yPos);
          yPos += 8;
        });
      }
      
      // Budget Summary Section
      if (budgetData) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('BUDGET SUMMARY', 10, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Budget: ${formatCurrency(budgetData.total)}`, 10, yPos);
        yPos += 5;
        doc.text(`Used Budget: ${formatCurrency(budgetData.used)}`, 10, yPos);
        yPos += 5;
        doc.text(`Remaining Budget: ${formatCurrency(budgetData.remaining)}`, 10, yPos);
        yPos += 5;
        doc.text(`Utilization: ${budgetData.utilizationPercentage?.toFixed(1) || '0.0'}%`, 10, yPos);
        yPos += 10;
        
        // Try to capture budget chart if available
        try {
          if (window.html2canvas && budgetChartRef?.current) {
            const chartCanvas = budgetChartRef.current.querySelector('canvas');
            if (chartCanvas) {
              const chartImage = await new Promise((resolve) => {
                html2canvas(chartCanvas, {
                  backgroundColor: '#ffffff',
                  scale: 2
                }).then(canvas => {
                  resolve(canvas.toDataURL('image/png'));
                }).catch(() => resolve(null));
              });
              
              if (chartImage && yPos < 250) {
                doc.addImage(chartImage, 'PNG', 10, yPos, 190, 60);
                yPos += 65;
              }
            }
          }
        } catch (e) {
          console.warn('Could not capture budget chart:', e);
        }
      }
      
      // Report/Audit Trail Section
      if (Object.keys(auditTrail).length > 0) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('REPORT / ACTIVITY LOG', 10, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        Object.entries(auditTrail).forEach(([department, activities]) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFont(undefined, 'bold');
          doc.text(`${department} Department:`, 10, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          
          activities.slice(0, 10).forEach((activity) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            
            const activityText = `${activity.action} by ${activity.user?.name || 'System'} - ${activity.details || ''}`;
            const lines = doc.splitTextToSize(activityText, 190);
            doc.text(lines, 15, yPos);
            yPos += lines.length * 5 + 2;
            doc.setFontSize(8);
            doc.text(formatDate(activity.createdAt), 15, yPos);
            yPos += 5;
            doc.setFontSize(9);
          });
          
          yPos += 5;
        });
      }
      
      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${totalPages} - Generated by Build Watch on ${currentDate} at ${currentTime}`,
          pageWidth / 2,
          287,
          { align: 'center' }
        );
      }
      
      // Save PDF
      const fileName = `Project_Summary_${selectedProject.projectCode || selectedProject.id}_${now.getTime()}.pdf`;
      doc.save(fileName);
      
      // Record download
      await recordDownload(selectedProject.id, 'PDF');
      
      // Show success modal
      setSuccessMessage('PDF exported successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setSuccessMessage('Failed to export PDF. Please try again.');
      setShowSuccessModal(true);
    }
  };

  // Export to HTML
  const exportToHTML = async () => {
    if (!selectedProject) {
      alert('Please select a project first.');
      return;
    }

    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-PH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const currentTime = now.toLocaleTimeString('en-PH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const reportMonth = now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }).toUpperCase();
      
      const userData = getCurrentUser();
      const organizationName = userData?.implementingOfficeName || userData?.office || userData?.department || 'MUNICIPAL ENGINEERING OFFICE';
      
      const getBaseUrl = () => {
        if (typeof window === 'undefined') return 'http://localhost:3000';
        const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        return isProd 
          ? `${window.location.protocol}//${window.location.hostname}`
          : 'http://localhost:3000';
      };
      
      const baseUrl = getBaseUrl();
      
      const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      // Build HTML content
      let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Summary & Report - ${escapeHtml(selectedProject.name || 'N/A')}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px; border-radius: 8px; }
        .header h1 { font-size: 24px; margin-bottom: 10px; font-weight: bold; }
        .header h2 { font-size: 18px; margin-bottom: 5px; font-weight: 600; }
        .header p { font-size: 14px; opacity: 0.9; }
        .meta { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .meta p { margin: 5px 0; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #2563eb; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .info-item label { font-size: 12px; color: #666; display: block; margin-bottom: 5px; }
        .info-item value { font-size: 16px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table th, table td { padding: 12px; text-align: left; border: 1px solid #ddd; }
        table th { background: #2563eb; color: white; font-weight: bold; }
        table tr:nth-child(even) { background: #f8f9fa; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
                <img src="${baseUrl}/santa-cruz-seal.png" alt="Santa Cruz Seal" style="height: 70px; width: 70px; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none';">
                <div style="flex: 1; text-align: center; min-width: 0;">
                    <h1>SANTA CRUZ PROJECT MONITORING SYSTEM</h1>
                    <h2>PROJECT SUMMARY & REPORT</h2>
                    <p>As of ${reportMonth}</p>
                </div>
                <img src="${baseUrl}/mpado_logo.png" alt="MPDO Logo" style="height: 70px; width: 70px; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none';">
            </div>
        </div>
        
        <div class="meta">
            <p><strong>Implementing Agency:</strong> ${escapeHtml(organizationName)}</p>
            <p><strong>Report Generated:</strong> ${currentDate} at ${currentTime}</p>
            <p><strong>Project:</strong> ${escapeHtml(selectedProject.name || 'N/A')}</p>
            <p><strong>Project Code:</strong> ${escapeHtml(selectedProject.projectCode || 'N/A')}</p>
        </div>
        
        <!-- Project Summary Section -->
        <div class="section">
            <div class="section-title">PROJECT SUMMARY</div>
            <div class="info-grid">
                <div class="info-item">
                    <label>Location</label>
                    <value>${escapeHtml(selectedProject.location || 'N/A')}</value>
                </div>
                <div class="info-item">
                    <label>Total Budget</label>
                    <value>${formatCurrency(selectedProject.totalBudget)}</value>
                </div>
                <div class="info-item">
                    <label>Used Budget</label>
                    <value>${formatCurrency(selectedProject.amountSpent || selectedProject.usedBudget || 0)}</value>
                </div>
                <div class="info-item">
                    <label>Overall Progress</label>
                    <value>${selectedProject.overallProgress != null ? parseFloat(selectedProject.overallProgress).toFixed(1) : '0.0'}%</value>
                </div>
                <div class="info-item">
                    <label>Start Date</label>
                    <value>${selectedProject.startDate ? formatDate(selectedProject.startDate) : 'N/A'}</value>
                </div>
                <div class="info-item">
                    <label>End Date</label>
                    <value>${selectedProject.endDate ? formatDate(selectedProject.endDate) : 'N/A'}</value>
                </div>
            </div>
        </div>
        
        <!-- Milestones Section -->
        ${projectMilestones.length > 0 ? `
        <div class="section">
            <div class="section-title">MILESTONES</div>
            <table>
                <thead>
                    <tr>
                        <th>Milestone</th>
                        <th>Weight</th>
                        <th>Budget</th>
                        <th>Used Budget</th>
                        <th>Progress</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${projectMilestones.map((milestone, idx) => {
                      const approvedSubmission = milestone.submissions?.find(s => 
                        s.status === 'approved' || s.status === 'iu_approved'
                      );
                      const progress = milestone.progress && milestone.progress > 0 
                        ? parseFloat(milestone.progress).toFixed(1) 
                        : calculateMilestoneProgressFromDivisions(milestone, approvedSubmission).toFixed(1);
                      
                      return `
                        <tr>
                            <td>${escapeHtml(milestone.title || 'N/A')}</td>
                            <td>${parseFloat(milestone.weight || 0).toFixed(1)}%</td>
                            <td>${formatCurrency(milestone.plannedBudget || milestone.budgetPlanned)}</td>
                            <td>${formatCurrency(milestone.usedBudget || approvedSubmission?.usedBudget || 0)}</td>
                            <td>${progress}%</td>
                            <td>${escapeHtml(milestone.status || 'N/A')}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <!-- Budget Summary Section -->
        ${budgetData ? `
        <div class="section">
            <div class="section-title">BUDGET SUMMARY</div>
            <div class="info-grid">
                <div class="info-item">
                    <label>Total Budget</label>
                    <value>${formatCurrency(budgetData.total)}</value>
                </div>
                <div class="info-item">
                    <label>Used Budget</label>
                    <value>${formatCurrency(budgetData.used)}</value>
                </div>
                <div class="info-item">
                    <label>Remaining Budget</label>
                    <value>${formatCurrency(budgetData.remaining)}</value>
                </div>
                <div class="info-item">
                    <label>Utilization</label>
                    <value>${budgetData.utilizationPercentage?.toFixed(1) || '0.0'}%</value>
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- Report Section -->
        ${Object.keys(auditTrail).length > 0 ? `
        <div class="section">
            <div class="section-title">REPORT / ACTIVITY LOG</div>
            ${Object.entries(auditTrail).map(([department, activities]) => `
                <h3 style="margin-top: 20px; margin-bottom: 10px; color: #2563eb; font-size: 16px;">${escapeHtml(department)} Department</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>User</th>
                            <th>Details</th>
                            <th>Date & Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.map(activity => `
                            <tr>
                                <td>${escapeHtml(activity.action || 'N/A')}</td>
                                <td>${escapeHtml(activity.user?.name || 'System')}</td>
                                <td>${escapeHtml(activity.details || '')}</td>
                                <td>${formatDate(activity.createdAt)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Generated by Build Watch - ${escapeHtml(organizationName)}</p>
            <p>Generated on: ${currentDate} at ${currentTime}</p>
        </div>
    </div>
</body>
</html>`;

      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Project_Summary_${selectedProject.projectCode || selectedProject.id}_${now.getTime()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Record download
      await recordDownload(selectedProject.id, 'HTML');
      
      // Show success modal
      setSuccessMessage('HTML exported successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error exporting to HTML:', error);
      setSuccessMessage('Failed to export HTML. Please try again.');
      setShowSuccessModal(true);
    }
  };

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
    if (action.includes('EXPORT')) {
      // Use theme color for LGU-IU
      const currentUserRole = getCurrentUser()?.role;
      if (currentUserRole === 'LGU-IU') {
        return 'text-[#0D7DB5] bg-blue-100';
      }
      return 'text-orange-600 bg-orange-100';
    }
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
              <p className="text-white/90">Comprehensive project monitoring and reporting</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Project Selector - Always Visible (without "Select Project" label) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`icon-container bg-gradient-to-br ${theme.primary} shadow-xl`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Choose a project to view its summary and reports</p>
            </div>
          </div>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value);
              setSelectedProject(project || null);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 focus:outline-none bg-white text-gray-900 font-medium"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name || project.projectCode} - {project.projectCode || project.id}
              </option>
            ))}
          </select>
        </div>

        {selectedProject ? (
          <>
            {/* Tabs - Enhanced Design Matching Announcement System */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-1 mb-6">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                    activeTab === 'summary'
                      ? `bg-gradient-to-r ${theme.primary} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Project Summary
                </button>
                <button
                  onClick={() => setActiveTab('milestones')}
                  className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                    activeTab === 'milestones'
                      ? `bg-gradient-to-r ${theme.primary} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Milestones
                </button>
                <button
                  onClick={() => setActiveTab('budget')}
                  className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                    activeTab === 'budget'
                      ? `bg-gradient-to-r ${theme.primary} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Budget Summary
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                    activeTab === 'timeline'
                      ? `bg-gradient-to-r ${theme.primary} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Time Table
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                    activeTab === 'audit'
                      ? `bg-gradient-to-r ${theme.primary} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Report
                </button>
                <button
                  onClick={() => setActiveTab('download')}
                  className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                    activeTab === 'download'
                      ? `bg-gradient-to-r ${theme.primary} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Download Summary
                </button>
              </div>
              </div>

              {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-lg mb-6">
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
                        <p className="text-2xl font-bold capitalize">
                          {(() => {
                            // Normalize status - convert pending to ongoing
                            const normalizedStatus = (selectedProject.status === 'pending' || selectedProject.status === 'Pending' || selectedProject.status === 'PENDING') 
                              ? 'ongoing' 
                              : (selectedProject.status || 'ongoing');
                            return normalizedStatus;
                          })()}
                        </p>
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
                        
                        // Get submissions from milestone or from persistent map
                        const milestoneSubmissions = milestone.submissions || milestoneSubmissionsMap[milestone.id] || [];
                        const approvedSubmission = milestoneSubmissions.find(s => 
                          s.status === 'approved' || s.status === 'iu_approved'
                        );
                        
                        // Ensure usedBudget is available - get from milestone, approvedSubmission, or submissions map
                        let usedBudget = milestone.usedBudget;
                        if (!usedBudget && approvedSubmission) {
                          usedBudget = parseFloat(approvedSubmission.usedBudget || 0);
                          // Also update the milestone object for calculation
                          milestone.usedBudget = usedBudget;
                        }
                        
                        // Ensure submissions array is attached to milestone for calculation
                        if (!milestone.submissions || milestone.submissions.length === 0) {
                          milestone.submissions = milestoneSubmissions;
                        }
                        
                        // Debug logging
                        console.log(`🔍 [${milestone.title}] Milestone Tab Progress Calculation:`, {
                          milestoneId: milestone.id,
                          milestoneWeight: milestone.weight,
                          plannedBudget: milestone.plannedBudget || milestone.budgetPlanned,
                          usedBudget: milestone.usedBudget,
                          usedBudgetFromSubmission: approvedSubmission?.usedBudget,
                          hasSubmissions: !!milestone.submissions,
                          submissionsCount: milestone.submissions?.length || 0,
                          hasApprovedSubmission: !!approvedSubmission,
                          timelineStatus: milestone.timelineStatus,
                          budgetStatus: milestone.budgetStatus,
                          physicalStatus: milestone.physicalStatus,
                          milestoneProgress: milestone.progress
                        });
                        
                        // Use milestone.progress if it was already calculated correctly, otherwise calculate it
                        let progress = milestone.progress && milestone.progress > 0 && milestone.progress !== 100
                          ? parseFloat(milestone.progress) 
                          : calculateMilestoneProgressFromDivisions(milestone, approvedSubmission);
                        
                        console.log(`📊 [${milestone.title}] Final progress:`, progress, '(from milestone.progress:', milestone.progress, ')');
                        
                        // Fallback to milestone.progress if calculation returns 0
                        if (progress === 0 || isNaN(progress)) {
                          progress = parseFloat(milestone.progress || 0);
                          if (progress === 0 || isNaN(progress)) {
                            console.log(`⚠️ [${milestone.title}] Both calculation and milestone.progress are 0, this should not happen`);
                          } else {
                            console.log(`⚠️ [${milestone.title}] Using milestone.progress as fallback:`, progress);
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
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
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
                                <p className="text-sm text-gray-500">Used Budget</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(
                                    milestone.usedBudget || 
                                    approvedSubmission?.usedBudget || 
                                    (milestoneSubmissionsMap[milestone.id]?.find(s => s.status === 'approved' || s.status === 'iu_approved')?.usedBudget) ||
                                    0
                                  )}
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

                {/* Budget Summary Tab */}
                {activeTab === 'budget' && (
                  <div className="space-y-6">
                    {budgetData ? (
                      <>
                        {/* Budget Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                            <h3 className="text-sm font-medium opacity-90 mb-2">Total Budget</h3>
                            <p className="text-2xl font-bold">{formatCurrency(budgetData.total)}</p>
                          </div>
                          <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                            <h3 className="text-sm font-medium opacity-90 mb-2">Used Budget</h3>
                            <p className="text-2xl font-bold">{formatCurrency(budgetData.used)}</p>
                          </div>
                          <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                            <h3 className="text-sm font-medium opacity-90 mb-2">Remaining Budget</h3>
                            <p className="text-2xl font-bold">{formatCurrency(budgetData.remaining)}</p>
                          </div>
                          <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                            <h3 className="text-sm font-medium opacity-90 mb-2">Utilization</h3>
                            <p className="text-2xl font-bold">{budgetData.utilizationPercentage.toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* Budget Utilization Chart */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Utilization Trend</h3>
                          <div className="h-80">
                            {budgetData.budgetTrend && budgetData.budgetTrend.length > 0 ? (
                              <Line
                                ref={budgetChartRef}
                                data={{
                                  labels: budgetData.budgetTrend.map(item => item.milestone),
                                  datasets: [
                                    {
                                      label: 'Cumulative Budget Used',
                                      data: budgetData.budgetTrend.map(item => item.cumulative),
                                      borderColor: theme.accent === 'green' ? 'rgba(16, 185, 129, 0.8)' :
                                                   theme.accent === 'orange' ? 'rgba(249, 115, 22, 0.8)' :
                                                   theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(13, 125, 181, 0.8)' : 'rgba(59, 130, 246, 0.8)') :
                                                   theme.accent === 'sky' ? 'rgba(14, 165, 233, 0.8)' :
                                                   'rgba(99, 102, 241, 0.8)',
                                      backgroundColor: theme.accent === 'green' ? 'rgba(16, 185, 129, 0.2)' :
                                                        theme.accent === 'orange' ? 'rgba(249, 115, 22, 0.2)' :
                                                        theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(13, 125, 181, 0.2)' : 'rgba(59, 130, 246, 0.2)') :
                                                        theme.accent === 'sky' ? 'rgba(14, 165, 233, 0.2)' :
                                                        'rgba(99, 102, 241, 0.2)',
                                      fill: true,
                                      tension: 0.4
                                    },
                                    {
                                      label: 'Budget Utilization %',
                                      data: budgetData.budgetTrend.map(item => item.individualUtilization || 0),
                                      borderColor: theme.accent === 'green' ? 'rgba(5, 150, 105, 0.8)' :
                                                   theme.accent === 'orange' ? 'rgba(234, 88, 12, 0.8)' :
                                                   theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(10, 106, 154, 0.8)' : 'rgba(37, 99, 235, 0.8)') :
                                                   theme.accent === 'sky' ? 'rgba(2, 132, 199, 0.8)' :
                                                   'rgba(79, 70, 229, 0.8)',
                                      backgroundColor: 'transparent',
                                      yAxisID: 'y1',
                                      borderDash: [5, 5],
                                      tension: 0.4
                                    }
                                  ]
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: function(context) {
                                          if (context.datasetIndex === 0) {
                                            return `Cumulative: ${formatCurrency(context.parsed.y)}`;
                                          } else {
                                            return `Utilization: ${context.parsed.y.toFixed(1)}%`;
                                          }
                                        }
                                      }
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      ticks: {
                                        callback: function(value) {
                                          return formatCurrency(value);
                                        }
                                      }
                                    },
                                    y1: {
                                      type: 'linear',
                                      display: true,
                                      position: 'right',
                                      beginAtZero: true,
                                      max: 100,
                                      ticks: {
                                        callback: function(value) {
                                          return value + '%';
                                        }
                                      },
                                      grid: {
                                        drawOnChartArea: false
                                      }
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                No budget trend data available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Budget Utilization Curve */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Utilization Curve</h3>
                          <div className="h-80">
                            {budgetData.budgetTrend && budgetData.budgetTrend.length > 0 ? (
                              <Line
                                data={{
                                  labels: budgetData.budgetTrend.map(item => item.milestone),
                                  datasets: [
                                    {
                                      label: 'Budget Utilization %',
                                      data: budgetData.budgetTrend.map(item => item.individualUtilization || 0),
                                      borderColor: theme.accent === 'green' ? 'rgba(16, 185, 129, 0.8)' :
                                                   theme.accent === 'orange' ? 'rgba(249, 115, 22, 0.8)' :
                                                   theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(13, 125, 181, 0.8)' : 'rgba(59, 130, 246, 0.8)') :
                                                   theme.accent === 'sky' ? 'rgba(14, 165, 233, 0.8)' :
                                                   'rgba(99, 102, 241, 0.8)',
                                      backgroundColor: theme.accent === 'green' ? 'rgba(16, 185, 129, 0.2)' :
                                                        theme.accent === 'orange' ? 'rgba(249, 115, 22, 0.2)' :
                                                        theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(13, 125, 181, 0.2)' : 'rgba(59, 130, 246, 0.2)') :
                                                        theme.accent === 'sky' ? 'rgba(14, 165, 233, 0.2)' :
                                                        'rgba(99, 102, 241, 0.2)',
                                      fill: true,
                                      tension: 0.5
                                    }
                                  ]
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: function(context) {
                                          return `Utilization: ${context.parsed.y.toFixed(1)}%`;
                                        }
                                      }
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      max: 100,
                                      ticks: {
                                        callback: function(value) {
                                          return value + '%';
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                No budget curve data available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Milestone Budget Breakdown */}
                        {budgetData.milestoneBudgets && budgetData.milestoneBudgets.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Milestone Budget Breakdown</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Milestone</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Planned Budget</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Used Budget</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Remaining</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Utilization</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Budget Breakdown & Allocation</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {budgetData.milestoneBudgets.map((milestone, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="py-3 px-4 text-gray-900">{milestone.name}</td>
                                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(milestone.planned)}</td>
                                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(milestone.used)}</td>
                                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(milestone.remaining)}</td>
                                      <td className="py-3 px-4 text-right">
                                        <span className={`font-semibold ${
                                          milestone.utilization > 100 ? 'text-red-600' :
                                          milestone.utilization > 80 ? 'text-orange-600' :
                                          'text-green-600'
                                        }`}>
                                          {milestone.utilization.toFixed(1)}%
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-gray-700">
                                        {milestone.budgetBreakdown ? (
                                          <div className="text-sm max-w-md">
                                            {milestone.budgetBreakdown.split('\n').map((line, lineIdx) => (
                                              <div key={lineIdx} className={lineIdx > 0 ? 'mt-1' : ''}>
                                                {line.trim()}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 italic">No breakdown available</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Total Row */}
                                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                                    <td className="py-3 px-4 text-gray-900">Total</td>
                                    <td className="py-3 px-4 text-right text-gray-900">
                                      {formatCurrency(budgetData.milestoneBudgets.reduce((sum, m) => sum + (parseFloat(m.planned) || 0), 0))}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-900">
                                      {formatCurrency(budgetData.milestoneBudgets.reduce((sum, m) => sum + (parseFloat(m.used) || 0), 0))}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-900">
                                      {formatCurrency(budgetData.milestoneBudgets.reduce((sum, m) => sum + (parseFloat(m.remaining) || 0), 0))}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <span className="font-semibold text-gray-900">
                                        {(() => {
                                          const totalUsed = budgetData.milestoneBudgets.reduce((sum, m) => sum + (parseFloat(m.used) || 0), 0);
                                          const totalPlanned = budgetData.milestoneBudgets.reduce((sum, m) => sum + (parseFloat(m.planned) || 0), 0);
                                          const totalUtilization = totalPlanned > 0 ? (totalUsed / totalPlanned) * 100 : 0;
                                          return totalUtilization.toFixed(1) + '%';
                                        })()}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-700"></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Loading budget data...
                      </div>
                    )}
                  </div>
                )}

                {/* Time Table Tab */}
                {activeTab === 'timeline' && (
                  <div className="space-y-6">
                    {timelineData ? (
                      <>
                        {/* Timeline Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                            <h3 className="text-sm font-medium opacity-90 mb-2">Project Start</h3>
                            <p className="text-lg font-bold">{formatDate(timelineData.projectStart.toISOString())}</p>
                          </div>
                          <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                            <h3 className="text-sm font-medium opacity-90 mb-2">Target Completion</h3>
                            <p className="text-lg font-bold">{formatDate(timelineData.projectEnd.toISOString())}</p>
                          </div>
                          <div className={`bg-gradient-to-br ${theme.secondary} text-white rounded-xl p-6 shadow-lg`}>
                            <h3 className="text-sm font-medium opacity-90 mb-2">Overall Progress</h3>
                            <p className="text-2xl font-bold">{timelineData.overallProgress.toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* Progress Completion Curve */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Completion Curve</h3>
                          <div className="h-96">
                            {timelineData.progressData && timelineData.progressData.length > 0 ? (
                              <Line
                                data={{
                                  labels: timelineData.progressData.map((item, index) => {
                                    // Only show milestone name (no date in label)
                                    return item.milestone;
                                  }),
                                  datasets: [
                                    {
                                      label: 'Milestone Progress %',
                                      data: timelineData.progressData.map(item => item.progress),
                                      borderColor: theme.accent === 'green' ? 'rgba(16, 185, 129, 0.8)' :
                                                   theme.accent === 'orange' ? 'rgba(249, 115, 22, 0.8)' :
                                                   theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(13, 125, 181, 0.8)' : 'rgba(59, 130, 246, 0.8)') :
                                                   theme.accent === 'sky' ? 'rgba(14, 165, 233, 0.8)' :
                                                   'rgba(99, 102, 241, 0.8)',
                                      backgroundColor: theme.accent === 'green' ? 'rgba(16, 185, 129, 0.2)' :
                                                        theme.accent === 'orange' ? 'rgba(249, 115, 22, 0.2)' :
                                                        theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(13, 125, 181, 0.2)' : 'rgba(59, 130, 246, 0.2)') :
                                                        theme.accent === 'sky' ? 'rgba(14, 165, 233, 0.2)' :
                                                        'rgba(99, 102, 241, 0.2)',
                                      fill: true,
                                      tension: 0.5,
                                      pointRadius: 5,
                                      pointHoverRadius: 7
                                    },
                                    {
                                      label: 'Cumulative Progress',
                                      data: timelineData.progressData.map(item => item.cumulative),
                                      borderColor: theme.accent === 'green' ? 'rgba(5, 150, 105, 0.8)' :
                                                   theme.accent === 'orange' ? 'rgba(234, 88, 12, 0.8)' :
                                                   theme.accent === 'blue' ? (resolvedUserRole === 'LGU-IU' ? 'rgba(10, 106, 154, 0.8)' : 'rgba(37, 99, 235, 0.8)') :
                                                   theme.accent === 'sky' ? 'rgba(2, 132, 199, 0.8)' :
                                                   'rgba(79, 70, 229, 0.8)',
                                      backgroundColor: 'transparent',
                                      borderDash: [5, 5],
                                      tension: 0.5,
                                      pointRadius: 5,
                                      pointHoverRadius: 7
                                    },
                                    {
                                      label: 'Total Project Progress',
                                      data: timelineData.progressData.map((item) => {
                                        // Total Project Progress is the cumulative progress percentage
                                        // which represents the overall project completion at each phase
                                        return item.cumulative;
                                      }),
                                      borderColor: 'rgba(139, 92, 246, 0.8)',
                                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                      borderDash: [3, 3],
                                      tension: 0.5,
                                      pointRadius: 4,
                                      pointHoverRadius: 6,
                                      fill: false
                                    }
                                  ]
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  layout: {
                                    padding: {
                                      bottom: 10,
                                      top: 10,
                                      left: 10,
                                      right: 10
                                    }
                                  },
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                      labels: {
                                        padding: 15,
                                        usePointStyle: true,
                                        font: {
                                          size: 12
                                        }
                                      }
                                    },
                                    tooltip: {
                                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                      padding: 12,
                                      titleFont: {
                                        size: 13,
                                        weight: 'bold'
                                      },
                                      bodyFont: {
                                        size: 12
                                      },
                                      callbacks: {
                                        title: function(context) {
                                          const dataIndex = context[0].dataIndex;
                                          const item = timelineData.progressData[dataIndex];
                                          if (!item) return '';
                                          const date = new Date(item.date);
                                          const formattedDate = formatDate(date.toISOString());
                                          let title = `${item.milestone} - ${formattedDate}`;
                                          // Add completed date if available
                                          if (item.actualEndDate) {
                                            const completedDate = new Date(item.actualEndDate);
                                            const formattedCompletedDate = formatDate(completedDate.toISOString());
                                            title += `\nCompleted: ${formattedCompletedDate}`;
                                          }
                                          return title;
                                        },
                                        label: function(context) {
                                          return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                                        }
                                      }
                                    }
                                  },
                                  scales: {
                                    x: {
                                      title: {
                                        display: true,
                                        text: 'Phase',
                                        font: {
                                          size: 13,
                                          weight: 'bold',
                                          family: "'Inter', 'Segoe UI', sans-serif"
                                        },
                                        padding: {
                                          top: 10,
                                          bottom: 0
                                        },
                                        color: '#374151'
                                      },
                                      grid: {
                                        display: true,
                                        color: 'rgba(0, 0, 0, 0.05)'
                                      },
                                      ticks: {
                                        maxRotation: 45,
                                        minRotation: 45,
                                        font: {
                                          size: 10,
                                          family: "'Inter', 'Segoe UI', sans-serif"
                                        },
                                        color: '#6B7280',
                                        padding: 8,
                                        autoSkip: true,
                                        maxTicksLimit: 15,
                                        callback: function(value, index) {
                                          const label = this.getLabelForValue(value);
                                          // Truncate long labels
                                          if (label && label.length > 20) {
                                            return label.substring(0, 20) + '...';
                                          }
                                          return label;
                                        }
                                      }
                                    },
                                    y: {
                                      beginAtZero: true,
                                      max: 100,
                                      title: {
                                        display: true,
                                        text: 'Progress (%)',
                                        font: {
                                          size: 13,
                                          weight: 'bold',
                                          family: "'Inter', 'Segoe UI', sans-serif"
                                        },
                                        padding: {
                                          top: 0,
                                          bottom: 10
                                        },
                                        color: '#374151'
                                      },
                                      grid: {
                                        display: true,
                                        color: 'rgba(0, 0, 0, 0.05)'
                                      },
                                      ticks: {
                                        font: {
                                          size: 11,
                                          family: "'Inter', 'Segoe UI', sans-serif"
                                        },
                                        color: '#6B7280',
                                        padding: 8,
                                        callback: function(value) {
                                          return value + '%';
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                No progress data available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timeline Visualization */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline</h3>
                          <div className="space-y-4">
                            {timelineData.timelineItems.map((item, idx) => {
                              const daysFromStart = Math.floor((item.dueDate - timelineData.projectStart) / (1000 * 60 * 60 * 24));
                              const totalDays = Math.floor((timelineData.projectEnd - timelineData.projectStart) / (1000 * 60 * 60 * 24));
                              const position = totalDays > 0 ? (daysFromStart / totalDays) * 100 : 0;
                              
                              return (
                                <div key={item.id || idx} className="relative">
                                  <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white border-2 border-gray-300">
                                      <span className="text-sm font-bold text-gray-700">{idx + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                                        <div className="flex items-center gap-2">
                                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            item.isCompleted ? 'bg-green-100 text-green-800' :
                                            item.isDelayed ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                          }`}>
                                            {item.isCompleted ? 'Completed' : item.isDelayed ? 'Delayed' : item.status} {item.progress.toFixed(1)}%/{item.weight ? item.weight.toFixed(1) : '0.0'}%
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-sm text-gray-600 mb-2">
                                        <span>Due: {formatDate(item.dueDate.toISOString())}</span>
                                        {item.actualEndDate && (
                                          <span className="ml-4">Completed: {formatDate(item.actualEndDate.toISOString())}</span>
                                        )}
                                      </div>
                                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                        {/* Progress bar container with capacity equal to milestone weight */}
                                        <div
                                          className="absolute top-0 left-0 h-full bg-gray-300 rounded-full"
                                          style={{ width: `${item.weight || 0}%` }}
                                        />
                                        {/* Progress bar fill with animation */}
                                        {item.weight > 0 && (
                                          <div
                                            className={`absolute top-0 left-0 h-full rounded-full progress-bar-fill-timeline ${
                                            item.isCompleted ? 'bg-green-500' :
                                            item.isDelayed ? 'bg-red-500' :
                                            'bg-blue-500'
                                          }`}
                                            style={{ 
                                              width: `${((item.progress / item.weight) * 100)}%`,
                                              maxWidth: `${item.weight}%`
                                            }}
                                            data-progress={item.progress}
                                            data-weight={item.weight}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {idx < timelineData.timelineItems.length - 1 && (
                                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Total Progress Bar */}
                          <div className="mt-8 pt-6 border-t-2 border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900">Total Project Progress</h4>
                              <span className="text-lg font-bold text-gray-900">
                                {timelineData.timelineItems.reduce((sum, item) => sum + (item.progress || 0), 0).toFixed(1)}% / {timelineData.timelineItems.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0).toFixed(1)}%
                              </span>
                            </div>
                            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                              {/* Total capacity bar (sum of all milestone weights) */}
                              <div
                                className="absolute top-0 left-0 h-full bg-gray-300 rounded-full"
                                style={{ width: `${timelineData.timelineItems.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)}%` }}
                              />
                              {/* Total progress fill with animation */}
                              {(() => {
                                const totalProgress = timelineData.timelineItems.reduce((sum, item) => sum + (item.progress || 0), 0);
                                const totalWeight = timelineData.timelineItems.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
                                const fillPercentage = totalWeight > 0 ? (totalProgress / totalWeight) * 100 : 0;
                                return (
                                  <div
                                    className="absolute top-0 left-0 h-full rounded-full progress-bar-fill-timeline bg-gradient-to-r from-blue-500 to-green-500"
                                    style={{ 
                                      width: `${fillPercentage}%`,
                                      maxWidth: `${totalWeight}%`
                                    }}
                                    data-progress={totalProgress}
                                    data-weight={totalWeight}
                                  />
                                );
                              })()}
                            </div>
                          </div>

                          {/* Photos and Videos Proof Section */}
                          <div className="mt-8 pt-6 border-t-2 border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Photos and Videos Proof
                            </h4>
                            
                            {(() => {
                              // Helper function to normalize file URL
                              const normalizeFileUrl = (file) => {
                                let url = file.url || file.path || file.src || file.filePath || file;
                                if (typeof url === 'string') {
                                  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
                                    return url;
                                  }
                                  const baseUrl = typeof window !== 'undefined' 
                                    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                        ? 'http://localhost:3000'
                                        : `${window.location.protocol}//${window.location.hostname}`)
                                    : 'http://localhost:3000';
                                  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/uploads/${url}`;
                                }
                                return '';
                              };
                              
                              // Group photos and videos by milestone
                              const milestoneProofs = timelineData.timelineItems.map(item => {
                                const milestoneId = item.id;
                                const submissions = milestoneSubmissionsMap[milestoneId] || [];
                                const photos = [];
                                const videos = [];
                                
                                submissions.forEach(submission => {
                                  // Get photos from various possible fields
                                  let submissionPhotos = [];
                                  if (submission.photoEvidence && Array.isArray(submission.photoEvidence)) {
                                    submissionPhotos = submission.photoEvidence;
                                  } else if (submission.physical?.photoEvidence) {
                                    submissionPhotos = Array.isArray(submission.physical.photoEvidence) 
                                      ? submission.physical.photoEvidence 
                                      : [{ url: submission.physical.photoEvidence, name: 'photo.jpg' }];
                                  } else if (submission.files && Array.isArray(submission.files)) {
                                    submissionPhotos = submission.files.filter(file => 
                                      file.type?.startsWith('image/') || file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                    );
                                  } else if (submission.uploadedFiles && Array.isArray(submission.uploadedFiles)) {
                                    submissionPhotos = submission.uploadedFiles.filter(file => 
                                      file.type?.startsWith('image/') || file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                    );
                                  }
                                  
                                  // Get videos from various possible fields
                                  let submissionVideos = [];
                                  if (submission.videoEvidence && Array.isArray(submission.videoEvidence)) {
                                    submissionVideos = submission.videoEvidence;
                                  } else if (submission.physical?.videoEvidence) {
                                    submissionVideos = Array.isArray(submission.physical.videoEvidence) 
                                      ? submission.physical.videoEvidence 
                                      : [{ url: submission.physical.videoEvidence, name: 'video.mp4' }];
                                  } else if (submission.files && Array.isArray(submission.files)) {
                                    submissionVideos = submission.files.filter(file => 
                                      file.type?.startsWith('video/') || file.name?.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)
                                    );
                                  } else if (submission.uploadedFiles && Array.isArray(submission.uploadedFiles)) {
                                    submissionVideos = submission.uploadedFiles.filter(file => 
                                      file.type?.startsWith('video/') || file.name?.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)
                                    );
                                  }
                                  
                                  photos.push(...submissionPhotos);
                                  videos.push(...submissionVideos);
                                });
                                
                                return {
                                  milestoneId,
                                  milestoneTitle: item.title,
                                  photos,
                                  videos
                                };
                              }).filter(milestone => milestone.photos.length > 0 || milestone.videos.length > 0);
                              
                              if (milestoneProofs.length === 0) {
                                return (
                                  <div className="text-center py-8 text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p>No photos or videos available yet.</p>
                                    <p className="text-sm mt-2">Photos and videos will appear here once milestone submissions are made.</p>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="space-y-8">
                                  {milestoneProofs.map((milestone, milestoneIdx) => (
                                    <div key={milestone.milestoneId || milestoneIdx} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                      {/* Project Milestone Header */}
                                      <h5 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b border-gray-300">
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                        {milestone.milestoneTitle}
                                      </h5>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Photos Section for this Milestone - Left Side */}
                                        <div className={milestone.videos.length > 0 ? '' : 'md:col-span-2'}>
                                          {milestone.photos.length > 0 ? (
                                            <>
                                              <h6 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Photos ({milestone.photos.length})
                                              </h6>
                                              <div className="grid grid-cols-2 gap-4">
                                                {milestone.photos.map((photo, idx) => {
                                                  const photoUrl = normalizeFileUrl(photo);
                                                  const photoName = photo.name || photo.filename || `Photo ${idx + 1}`;
                                                  return (
                                                    <div 
                                                      key={`photo-${milestone.milestoneId}-${idx}`} 
                                                      className="relative group cursor-pointer bg-gray-100 rounded-lg overflow-hidden aspect-square"
                                                      onClick={() => {
                                                        const modal = document.getElementById('photo-preview-modal-timeline');
                                                        const modalImg = document.getElementById('modal-photo-timeline');
                                                        const modalTitle = document.getElementById('modal-photo-title-timeline');
                                                        if (modal && modalImg && modalTitle) {
                                                          modalImg.src = photoUrl;
                                                          modalTitle.textContent = `${photoName} - ${milestone.milestoneTitle}`;
                                                          modal.classList.remove('hidden');
                                                        }
                                                      }}
                                                    >
                                                      <img 
                                                        src={photoUrl}
                                                        alt={photoName}
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        onError={(e) => {
                                                          e.target.style.display = 'none';
                                                          e.target.parentElement.innerHTML = `
                                                            <div class="w-full h-full flex items-center justify-center bg-gray-200">
                                                              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                              </svg>
                                                            </div>
                                                          `;
                                                        }}
                                                      />
                                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                        </svg>
                                                      </div>
                                                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                        <p className="text-xs text-white truncate">{photoName}</p>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="text-center py-8 text-gray-400">
                                              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                              <p className="text-sm">No photos</p>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Videos Section for this Milestone - Right Side */}
                                        <div className={milestone.photos.length > 0 ? '' : 'md:col-span-2'}>
                                          {milestone.videos.length > 0 ? (
                                            <>
                                              <h6 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Videos ({milestone.videos.length})
                                              </h6>
                                              <div className="grid grid-cols-1 gap-4">
                                                {milestone.videos.map((video, idx) => {
                                                  const videoUrl = normalizeFileUrl(video);
                                                  const videoName = video.name || video.filename || `Video ${idx + 1}`;
                                                  return (
                                                    <div 
                                                      key={`video-${milestone.milestoneId}-${idx}`} 
                                                      className="relative group cursor-pointer bg-gray-100 rounded-lg overflow-hidden aspect-video"
                                                      onClick={() => {
                                                        const modal = document.getElementById('video-preview-modal-timeline');
                                                        const modalVideo = document.getElementById('modal-video-timeline');
                                                        const modalTitle = document.getElementById('modal-video-title-timeline');
                                                        if (modal && modalVideo && modalTitle) {
                                                          modalVideo.src = videoUrl;
                                                          modalTitle.textContent = `${videoName} - ${milestone.milestoneTitle}`;
                                                          modal.classList.remove('hidden');
                                                        }
                                                      }}
                                                    >
                                                      <video 
                                                        src={videoUrl}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                          e.target.style.display = 'none';
                                                          e.target.parentElement.innerHTML = `
                                                            <div class="w-full h-full flex items-center justify-center bg-gray-200">
                                                              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                              </svg>
                                                            </div>
                                                          `;
                                                        }}
                                                      />
                                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                                                        <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                                                          <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                      </div>
                                                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                        <p className="text-xs text-white truncate">{videoName}</p>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="text-center py-8 text-gray-400">
                                              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                              </svg>
                                              <p className="text-sm">No videos</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Loading timeline data...
                      </div>
                    )}
                  </div>
                )}

                {/* Report Tab */}
                {activeTab === 'audit' && (
                  <div className="space-y-6">
                    {/* Project Completion Summary Section - Show if project is completed */}
                    {selectedProject && (selectedProject.status === 'complete' || selectedProject.status === 'completed' || selectedProject.status === 'COMPLETED') && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white">
                                PROJECT COMPLETED
                              </span>
                              <span className="text-sm text-gray-600">
                                Final Audit Summary
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                              {selectedProject.name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Project Code</p>
                                <p className="text-sm font-semibold text-gray-900">{selectedProject.projectCode}</p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Target Completion Date</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {selectedProject.targetCompletionDate || selectedProject.targetDateOfCompletion || selectedProject.endDate
                                    ? formatDate(selectedProject.targetCompletionDate || selectedProject.targetDateOfCompletion || selectedProject.endDate)
                                    : 'N/A'}
                                </p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Actual Completion Date</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {selectedProject.completionDate || selectedProject.actualCompletionDate 
                                    ? formatDate(selectedProject.completionDate || selectedProject.actualCompletionDate)
                                    : 'N/A'}
                                </p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Total Milestones</p>
                                <p className="text-sm font-semibold text-gray-900">{projectMilestones.length} milestone(s)</p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Final Progress</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {selectedProject.overallProgress != null 
                                    ? (typeof selectedProject.overallProgress === 'number' 
                                        ? selectedProject.overallProgress.toFixed(1) 
                                        : parseFloat(selectedProject.overallProgress || 0).toFixed(1))
                                    : '100.0'}%
                                </p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Total Budget</p>
                                <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedProject.totalBudget)}</p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Used Budget</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {budgetData && budgetData.used
                                    ? formatCurrency(budgetData.used)
                                    : selectedProject.amountSpent || selectedProject.usedBudget || selectedProject.budgetUsed
                                    ? formatCurrency(selectedProject.amountSpent || selectedProject.usedBudget || selectedProject.budgetUsed)
                                    : formatCurrency(0)}
                                </p>
                              </div>
                              <div className="bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Location</p>
                                <p className="text-sm font-semibold text-gray-900">{selectedProject.location || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="bg-white/60 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">Completion Details</p>
                              <p className="text-sm text-gray-900">
                                All milestones have been successfully approved and completed. This project has met all requirements and is now marked as completed in the system.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {Object.keys(auditTrail).length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No report data available for this project.
                      </div>
                    ) : (
                      Object.entries(auditTrail).map(([department, activities]) => (
                        <div key={department} className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            {department} Department
                          </h3>
                          <div className="space-y-4">
                            {activities.map((activity) => (
                              <div key={activity.id} className={`flex items-start gap-4 p-4 rounded-lg hover:bg-gray-100 transition-colors ${
                                activity.action === 'PROJECT_COMPLETED' 
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                                  : 'bg-gray-50'
                              }`}>
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
                                    <span className="text-sm text-gray-500">by</span>
                                    {activity.user?.profilePictureUrl ? (
                                      <img 
                                        src={normalizeProfilePictureUrl(activity.user.profilePictureUrl)} 
                                        alt={activity.user?.name || 'User'}
                                        className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-sm"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                      </div>
                                    )}
                                    <span className="text-sm font-bold text-gray-900">
                                      {activity.user?.name || 'System'}
                                    </span>
                                  </div>
                                  {activity.details && (
                                    <p className="text-sm text-gray-700 mt-1">{activity.details}</p>
                                  )}
                                  {activity.action === 'MILESTONE_APPROVED' && (activity.remarks || activity.remarksAndRecommendation) && (
                                    <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                        </svg>
                                        <span className="text-xs font-semibold text-indigo-800">Remarks and Recommendation</span>
                                      </div>
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.remarks || activity.remarksAndRecommendation}</p>
                                      {activity.approverFullName && (
                                        <div className="mt-2 pt-2 border-t border-indigo-200 flex items-center gap-2 text-xs text-indigo-700">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span className="font-medium">Reviewed by:</span>
                                          <span>{activity.approverFullName}</span>
                                        </div>
                                      )}
                                    </div>
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

                {/* Download Summary Tab */}
                {activeTab === 'download' && (
                  <div className="space-y-6">
                    {/* Export Summary Form Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Export Summary Form</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Download the complete project summary report including all tabs (Project Summary, Milestones, Budget Summary, Time Table, and Report) in PDF or HTML format.
                      </p>
                      
                      <div className="flex flex-wrap gap-4">
                        <button
                          onClick={() => exportToPDF()}
                          className={`px-6 py-3 bg-gradient-to-r ${theme.primary} text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Export as PDF
                        </button>
                        <button
                          onClick={() => exportToHTML()}
                          className={`px-6 py-3 bg-gradient-to-r ${theme.secondary} text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Export as HTML
                        </button>
                      </div>
                    </div>

                    {/* Download Audit Trail Table */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Download History</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Record of all users who have downloaded the project summary report.
                      </p>
                      
                      {downloadAuditTrail.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          No download records yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {downloadAuditTrail.map((record, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      {record.user?.profilePictureUrl ? (
                                        <img 
                                          src={normalizeProfilePictureUrl(record.user.profilePictureUrl)} 
                                          alt={record.user?.name || 'User'}
                                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-sm font-bold text-gray-900">{record.user?.name || 'Unknown User'}</div>
                                        <div className="text-sm text-gray-500">{record.user?.email || record.user?.department || ''}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      record.format === 'PDF' 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {record.format}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(record.downloadedAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
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

      {/* Success Modal with Check Animation */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-fadeInUp">
            <div className="text-center">
              {/* Check Animation */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-scaleIn">
                    <svg 
                      className="w-12 h-12 text-green-600 animate-drawCheck" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{
                        strokeDasharray: 50,
                        strokeDashoffset: 50,
                        animation: 'drawCheck 0.6s ease-out forwards'
                      }}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="3" 
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  {/* Ripple effect */}
                  <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
              
              {/* Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                }}
                className={`w-full px-6 py-3 bg-gradient-to-r ${theme.primary} text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        
        @keyframes drawCheck {
          from {
            stroke-dashoffset: 50;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fillProgressTimeline {
          from {
            width: 0%;
          }
          to {
            width: var(--progress-width);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .animate-drawCheck {
          animation: drawCheck 0.6s ease-out forwards;
        }
        
        .progress-bar-fill-timeline {
          transform-origin: left;
          animation: fillProgressTimeline 2s ease-out forwards;
        }
        
        .icon-container {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
      `}</style>

      {/* Photo Preview Modal for Timeline */}
      <div id="photo-preview-modal-timeline" className="fixed inset-0 bg-black bg-opacity-75 z-50 hidden">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <button 
            onClick={() => {
              const modal = document.getElementById('photo-preview-modal-timeline');
              if (modal) modal.classList.add('hidden');
            }}
            className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold z-20 transition-colors shadow-lg"
          >
            ×
          </button>
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg z-20 shadow-lg">
            <p id="modal-photo-title-timeline" className="text-sm font-medium"></p>
          </div>
          <div className="flex items-center justify-center w-full h-full">
            <img 
              id="modal-photo-timeline" 
              src="" 
              alt="Photo Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ maxHeight: '85vh', maxWidth: '85vw', display: 'block', margin: 'auto' }}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg z-20 shadow-lg">
            <p className="text-xs text-center">Click outside or press Esc to close</p>
          </div>
        </div>
      </div>

      {/* Video Preview Modal for Timeline */}
      <div id="video-preview-modal-timeline" className="fixed inset-0 bg-black bg-opacity-75 z-50 hidden">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <button 
            onClick={() => {
              const modal = document.getElementById('video-preview-modal-timeline');
              const modalVideo = document.getElementById('modal-video-timeline');
              if (modal) {
                modal.classList.add('hidden');
                if (modalVideo) {
                  modalVideo.pause();
                  modalVideo.src = '';
                }
              }
            }}
            className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold z-20 transition-colors shadow-lg"
          >
            ×
          </button>
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg z-20 shadow-lg">
            <p id="modal-video-title-timeline" className="text-sm font-medium"></p>
          </div>
          <div className="flex items-center justify-center w-full h-full">
            <video 
              id="modal-video-timeline" 
              controls
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ maxHeight: '85vh', maxWidth: '85vw', display: 'block', margin: 'auto' }}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg z-20 shadow-lg">
            <p className="text-xs text-center">Click outside or press Esc to close</p>
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// Dynamic API URL helper - works for both localhost and production
const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/api';
  }
  const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProd 
    ? `${window.location.protocol}//${window.location.hostname}/api`
    : 'http://localhost:3000/api';
};

// Get token from localStorage
const getToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
};

// Get current user role
const getCurrentUserRole = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.role || null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Get current user data
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

// Helper function to get theme colors based on user role
const getThemeColors = (role) => {
  switch (role) {
    case 'EIU':
      return {
        gradient: 'from-green-500 to-green-600',
        gradientHover: 'hover:from-green-600 hover:to-green-700',
        gradientText: 'from-green-600 to-green-700',
        gradientIcon: 'from-green-500 to-green-600',
        primaryText: 'text-green-600',
        border: 'border-green-200',
        borderHover: 'border-green-300',
        headerBg: 'from-green-600 to-green-700',
        tableHeaderBg: 'bg-green-600'
      };
    case 'LGU-IU':
      return {
        gradient: 'from-blue-500 to-blue-600',
        gradientHover: 'hover:from-blue-600 hover:to-blue-700',
        gradientText: 'from-blue-600 to-blue-700',
        gradientIcon: 'from-blue-500 to-blue-600',
        primaryText: 'text-blue-600',
        border: 'border-blue-200',
        borderHover: 'border-blue-300',
        headerBg: 'from-blue-600 to-blue-700',
        tableHeaderBg: 'bg-blue-600'
      };
    case 'LGU-PMT':
    case 'MPMEC':
      return {
        gradient: 'from-indigo-500 to-indigo-600',
        gradientHover: 'hover:from-indigo-600 hover:to-indigo-700',
        gradientText: 'from-indigo-600 to-indigo-700',
        gradientIcon: 'from-indigo-500 to-indigo-600',
        primaryText: 'text-indigo-600',
        border: 'border-indigo-200',
        borderHover: 'border-indigo-300',
        headerBg: 'from-indigo-600 to-indigo-700',
        tableHeaderBg: 'bg-indigo-600'
      };
    case 'LGU-PMT-MPMEC-SECRETARIAT':
    case 'MPMEC-SEC':
      return {
        gradient: 'from-cyan-500 to-cyan-600',
        gradientHover: 'hover:from-cyan-600 hover:to-cyan-700',
        gradientText: 'from-cyan-600 to-cyan-700',
        gradientIcon: 'from-cyan-500 to-cyan-600',
        primaryText: 'text-cyan-600',
        border: 'border-cyan-200',
        borderHover: 'border-cyan-300',
        headerBg: 'from-cyan-600 to-cyan-700',
        tableHeaderBg: 'bg-cyan-600'
      };
    case 'Executive Viewer':
    case 'EMS':
      return {
        gradient: 'from-purple-500 to-purple-600',
        gradientHover: 'hover:from-purple-600 hover:to-purple-700',
        gradientText: 'from-purple-600 to-purple-700',
        gradientIcon: 'from-purple-500 to-purple-600',
        primaryText: 'text-purple-600',
        border: 'border-purple-200',
        borderHover: 'border-purple-300',
        headerBg: 'from-purple-600 to-purple-700',
        tableHeaderBg: 'bg-purple-600'
      };
    default:
      return {
        gradient: 'from-blue-500 to-blue-600',
        gradientHover: 'hover:from-blue-600 hover:to-blue-700',
        gradientText: 'from-blue-600 to-blue-700',
        gradientIcon: 'from-blue-500 to-blue-600',
        primaryText: 'text-blue-600',
        border: 'border-blue-200',
        borderHover: 'border-blue-300',
        headerBg: 'from-blue-600 to-blue-700',
        tableHeaderBg: 'bg-blue-600'
      };
  }
};

// Format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
};

// Format date for RPMES (mm-dd-yyyy)
const formatDateRPMES = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  } catch (e) {
    return dateString;
  }
};

// Format date and time for display (e.g., "December 3, 2025 at 01:34 PM")
const formatDateTime = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
};

// Helper function to normalize file URLs (will be defined inside component to access API_URL)

export default function ProjectLedgerCenter({ 
  theme = 'blue',
  userRole = null,
  projectId = null
}) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [tableView, setTableView] = useState('vertical'); // 'vertical' or 'horizontal'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'dashboard' or 'compare' or 'timeline'
  const [excelExportFormat, setExcelExportFormat] = useState('vertical'); // 'vertical' or 'horizontal' for Excel export
  const [showExcelFormatMenu, setShowExcelFormatMenu] = useState(false);
  
  // Timeline/Gantt Chart State
  const [timelineZoom, setTimelineZoom] = useState('month'); // 'month', 'week', 'day'
  const [timelineStartDate, setTimelineStartDate] = useState('');
  const [timelineEndDate, setTimelineEndDate] = useState('');
  const [selectedTimelineProject, setSelectedTimelineProject] = useState(null);
  
  // Project Comparison State
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedProjectsForComparison, setSelectedProjectsForComparison] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonSearchQuery, setComparisonSearchQuery] = useState('');
  
  // Advanced Filtering State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [budgetRangeMin, setBudgetRangeMin] = useState('');
  const [budgetRangeMax, setBudgetRangeMax] = useState('');
  const [progressRangeMin, setProgressRangeMin] = useState('');
  const [progressRangeMax, setProgressRangeMax] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [quickFilterPreset, setQuickFilterPreset] = useState('');
  
  // Column Customization State
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({}); // Will be initialized based on table view
  const [columnOrder, setColumnOrder] = useState([]);
  
  // Saved Views State
  const [savedViews, setSavedViews] = useState([]);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [viewNameToSave, setViewNameToSave] = useState('');
  
  const colors = getThemeColors(userRole || getCurrentUserRole());
  const API_URL = getApiUrl();
  const token = getToken();

  useEffect(() => {
    fetchProjects();
    loadSavedViews();
    initializeColumnVisibility();
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
  }, [projectId]);
  
  // Initialize column visibility based on table view
  useEffect(() => {
    initializeColumnVisibility();
  }, [tableView]);
  
  const initializeColumnVisibility = () => {
    if (tableView === 'vertical') {
      // Vertical table columns
      const defaultColumns = {
        'projectTitle': true,
        'projectCode': true,
        'implementingOffice': true,
        'category': true,
        'location': true,
        'priority': true,
        'fundingSource': true,
        'createdDate': true,
        'description': true,
        'expectedOutputs': true,
        'targetBeneficiaries': true,
        'eiuPartner': true,
        'timelineInfo': true,
        'budgetInfo': true,
        'physicalAccomplishment': true,
        'phases': true
      };
      setVisibleColumns(prev => Object.keys(prev).length === 0 ? defaultColumns : prev);
    } else {
      // Horizontal table columns
      const defaultColumns = {
        'basicInfo': true,
        'eiuPartner': true,
        'timelineInfo': true,
        'budgetInfo': true,
        'physicalAccomplishment': true,
        'phases': true
      };
      setVisibleColumns(prev => Object.keys(prev).length === 0 ? defaultColumns : prev);
    }
  };
  
  // Load saved views from localStorage
  const loadSavedViews = () => {
    try {
      const saved = localStorage.getItem('projectLedgerSavedViews');
      if (saved) {
        const views = JSON.parse(saved);
        setSavedViews(Array.isArray(views) ? views : []);
      }
    } catch (e) {
      console.error('Error loading saved views:', e);
      setSavedViews([]);
    }
  };
  
  // Save view to localStorage
  const saveView = (name) => {
    if (!name || name.trim() === '') {
      alert('Please enter a name for this view.');
      return;
    }
    
    const viewConfig = {
      id: Date.now().toString(),
      name: name.trim(),
      filters: {
        searchQuery,
        filterStatus,
        filterCategory,
        dateRangeStart,
        dateRangeEnd,
        budgetRangeMin,
        budgetRangeMax,
        progressRangeMin,
        progressRangeMax,
        selectedStatuses,
        selectedCategories,
        selectedPriorities,
        quickFilterPreset
      },
      columnVisibility: visibleColumns,
      tableView,
      createdAt: new Date().toISOString()
    };
    
    const updatedViews = [...savedViews, viewConfig];
    setSavedViews(updatedViews);
    localStorage.setItem('projectLedgerSavedViews', JSON.stringify(updatedViews));
    setShowSaveViewModal(false);
    setViewNameToSave('');
    alert(`View "${name}" saved successfully!`);
  };
  
  // Load a saved view
  const loadView = (view) => {
    if (view.filters) {
      setSearchQuery(view.filters.searchQuery || '');
      setFilterStatus(view.filters.filterStatus || '');
      setFilterCategory(view.filters.filterCategory || '');
      setDateRangeStart(view.filters.dateRangeStart || '');
      setDateRangeEnd(view.filters.dateRangeEnd || '');
      setBudgetRangeMin(view.filters.budgetRangeMin || '');
      setBudgetRangeMax(view.filters.budgetRangeMax || '');
      setProgressRangeMin(view.filters.progressRangeMin || '');
      setProgressRangeMax(view.filters.progressRangeMax || '');
      setSelectedStatuses(view.filters.selectedStatuses || []);
      setSelectedCategories(view.filters.selectedCategories || []);
      setSelectedPriorities(view.filters.selectedPriorities || []);
      setQuickFilterPreset(view.filters.quickFilterPreset || '');
    }
    if (view.columnVisibility) {
      setVisibleColumns(view.columnVisibility);
    }
    if (view.tableView) {
      setTableView(view.tableView);
    }
    setShowSavedViews(false);
  };
  
  // Delete a saved view
  const deleteView = (viewId) => {
    if (confirm('Are you sure you want to delete this saved view?')) {
      const updatedViews = savedViews.filter(v => v.id !== viewId);
      setSavedViews(updatedViews);
      localStorage.setItem('projectLedgerSavedViews', JSON.stringify(updatedViews));
    }
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setBudgetRangeMin('');
    setBudgetRangeMax('');
    setProgressRangeMin('');
    setProgressRangeMax('');
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedPriorities([]);
    setQuickFilterPreset('');
  };
  
  // Apply quick filter preset
  const applyQuickFilter = (preset) => {
    // Clear all filters first (except the preset itself)
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setBudgetRangeMin('');
    setBudgetRangeMax('');
    setProgressRangeMin('');
    setProgressRangeMax('');
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedPriorities([]);
    
    // Set the preset
    setQuickFilterPreset(preset);
    
    // Apply preset-specific filters
    switch (preset) {
      case 'overdue':
        // Projects past target completion date - handled in filter logic
        break;
      case 'highPriority':
        setSelectedPriorities(['high']);
        break;
      case 'nearCompletion':
        setProgressRangeMin('80');
        setProgressRangeMax('100');
        break;
      case 'recentlyUpdated':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        setDateRangeStart(sevenDaysAgo.toISOString().split('T')[0]);
        break;
      default:
        break;
    }
  };

  // Note: Removed useEffect for re-enrichment since we're not making API calls
  // The contact number should already be in the project data from the backend

  // Helper function to normalize file URLs
  const normalizeFileUrl = (file) => {
    if (!file) return null;
    
    let url = '';
    let name = '';
    
    if (typeof file === 'object' && file !== null) {
      url = file.url || file.src || file.path || file.filePath || file.fileName || '';
      name = file.name || file.originalName || file.fileName || 'File';
    } else if (typeof file === 'string') {
      url = file;
      name = file.split('/').pop() || 'File';
    }
    
    // Ensure URL is absolute
    if (url && !url.startsWith('http') && !url.startsWith('//')) {
      // If it's a relative path, prepend the API base URL
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
    }
    
    return { url, name };
  };

  // Helper function to normalize EIU data structure
  // Note: We do NOT make API calls to /api/users/ as that endpoint doesn't exist or requires System Admin
  // The contact number should already be in the project data from the backend projects API
  const enrichProjectWithEIUData = (project) => {
    // The contact number should already be in the project data from the backend
    // We just ensure the eiuPersonnel object is properly structured
    if (project && project.eiuPersonnel) {
      // Ensure contact number field exists (even if it's already there)
      // This helps with consistent field access
      if (!project.eiuPersonnel.contactNumber) {
        project.eiuPersonnel.contactNumber = project.eiuPersonnel.phoneNumber || 
                                             project.eiuPersonnel.phone || 
                                             project.eiuPersonnel.contact ||
                                             null;
      }
    }
    
    return project;
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      const isPublic = !token || userRole === 'public';
      const endpoint = projectId 
        ? (isPublic ? `${API_URL}/projects/public/${projectId}` : `${API_URL}/projects/${projectId}`)
        : (isPublic ? `${API_URL}/projects/public` : `${API_URL}/projects`);
      
      const headers = { 'Content-Type': 'application/json' };
      if (token && !isPublic) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      
      if (data.success) {
        if (projectId && data.project) {
          // Normalize project EIU data structure (no API calls)
          const enrichedProject = enrichProjectWithEIUData(data.project);
          
          // Fetch complete milestone data for this project
          // Use public endpoint for public users, authenticated endpoint for logged-in users
          try {
            const milestonesEndpoint = isPublic 
              ? `${API_URL}/milestones/project/${projectId}/public`
              : `${API_URL}/projects/${projectId}/milestones`;
            const milestonesResponse = await fetch(milestonesEndpoint, { headers });
            if (milestonesResponse.ok) {
              const milestonesData = await milestonesResponse.json();
              if (milestonesData.success && milestonesData.milestones) {
                console.log(`📋 Fetched complete milestone data for project ${projectId}:`, milestonesData.milestones.length);
                enrichedProject.milestones = milestonesData.milestones;
              } else if (milestonesData.milestones) {
                // Handle case where response doesn't have success field
                console.log(`📋 Fetched milestone data (no success field):`, milestonesData.milestones.length);
                enrichedProject.milestones = milestonesData.milestones;
              }
            } else {
              console.warn(`⚠️ Failed to fetch milestones, status: ${milestonesResponse.status}`);
            }
          } catch (err) {
            console.warn(`⚠️ Could not fetch milestones for project ${projectId}:`, err);
          }
          
          // Fetch milestone submissions and attach to project (only for authenticated users)
          if (!isPublic && enrichedProject.milestones && enrichedProject.milestones.length > 0) {
            console.log('📋 Fetching submissions for project:', projectId);
            const submissions = await fetchMilestoneSubmissions(projectId);
            console.log('📋 Fetched submissions:', submissions.length);
            console.log('📋 Submissions data:', submissions);
            
            // Attach approved submissions to their milestones
            enrichedProject.milestones.forEach(milestone => {
              const milestoneSubmissions = submissions.filter(s => s.milestoneId === milestone.id);
              console.log(`📋 Milestone "${milestone.title}" (${milestone.id}): Found ${milestoneSubmissions.length} submissions`);
              
              const approvedSubmission = milestoneSubmissions.find(s => 
                s.status === 'approved' || s.status === 'iu_approved'
              );
              
              if (approvedSubmission) {
                console.log(`✅ Found approved submission for "${milestone.title}":`, approvedSubmission);
              } else {
                console.log(`⚠️ No approved submission found for "${milestone.title}"`);
                console.log('  - All submissions for this milestone:', milestoneSubmissions.map(s => ({ id: s.id, status: s.status })));
              }
              
              milestone.submissions = milestoneSubmissions;
              milestone.approvedSubmission = approvedSubmission;
            });
          } else if (isPublic && enrichedProject.milestones && enrichedProject.milestones.length > 0) {
            // For public users, try to get approved submissions from the public project endpoint
            // The public endpoint should include approved submissions in the milestones
            console.log('📋 Public user - checking milestones for approved submissions');
            enrichedProject.milestones.forEach(milestone => {
              // Check if milestone has submission data embedded
              if (milestone.submissions && Array.isArray(milestone.submissions)) {
                const approvedSubmission = milestone.submissions.find(s => 
                  s.status === 'approved' || s.status === 'iu_approved'
                );
                milestone.approvedSubmission = approvedSubmission;
              }
            });
          }
          
          setSelectedProject(enrichedProject);
          setProjects([enrichedProject]);
        } else {
          // Normalize all projects EIU data structure (no API calls)
          const projectsList = data.projects || data.data || [];
          const enrichedProjects = await Promise.all(projectsList.map(async (project) => {
            const enriched = enrichProjectWithEIUData(project);
            
            // Fetch complete milestone data for this project
            // Use public endpoint for public users, authenticated endpoint for logged-in users
            try {
              const milestonesEndpoint = isPublic 
                ? `${API_URL}/milestones/project/${enriched.id}/public`
                : `${API_URL}/projects/${enriched.id}/milestones`;
              const milestonesResponse = await fetch(milestonesEndpoint, { headers });
              if (milestonesResponse.ok) {
                const milestonesData = await milestonesResponse.json();
                if (milestonesData.success && milestonesData.milestones) {
                  console.log(`📋 Fetched complete milestone data for project ${enriched.id}:`, milestonesData.milestones.length);
                  enriched.milestones = milestonesData.milestones;
                } else if (milestonesData.milestones) {
                  // Handle case where response doesn't have success field
                  console.log(`📋 Fetched milestone data (no success field):`, milestonesData.milestones.length);
                  enriched.milestones = milestonesData.milestones;
                }
              } else {
                console.warn(`⚠️ Failed to fetch milestones for project ${enriched.id}, status: ${milestonesResponse.status}`);
              }
            } catch (err) {
              console.warn(`⚠️ Could not fetch milestones for project ${enriched.id}:`, err);
            }
            
            // Fetch milestone submissions and attach to project (only for authenticated users)
            if (!isPublic && enriched.milestones && enriched.milestones.length > 0) {
              console.log(`📋 Fetching submissions for project: ${enriched.id}`);
              const submissions = await fetchMilestoneSubmissions(enriched.id);
              console.log(`📋 Fetched ${submissions.length} submissions for project ${enriched.id}`);
              
              // Attach approved submissions to their milestones
              enriched.milestones.forEach(milestone => {
                const milestoneSubmissions = submissions.filter(s => s.milestoneId === milestone.id);
                console.log(`📋 Milestone "${milestone.title}" (${milestone.id}): Found ${milestoneSubmissions.length} submissions`);
                
                const approvedSubmission = milestoneSubmissions.find(s => 
                  s.status === 'approved' || s.status === 'iu_approved'
                );
                
                if (approvedSubmission) {
                  console.log(`✅ Found approved submission for "${milestone.title}":`, approvedSubmission);
                } else {
                  console.log(`⚠️ No approved submission found for "${milestone.title}"`);
                  console.log('  - All submissions for this milestone:', milestoneSubmissions.map(s => ({ id: s.id, status: s.status })));
                }
                
                milestone.submissions = milestoneSubmissions;
                milestone.approvedSubmission = approvedSubmission;
              });
            } else if (isPublic && enriched.milestones && enriched.milestones.length > 0) {
              // For public users, try to get approved submissions from the public project endpoint
              // The public endpoint should include approved submissions in the milestones
              console.log(`📋 Public user - checking milestones for approved submissions for project ${enriched.id}`);
              enriched.milestones.forEach(milestone => {
                // Check if milestone has submission data embedded
                if (milestone.submissions && Array.isArray(milestone.submissions)) {
                  const approvedSubmission = milestone.submissions.find(s => 
                    s.status === 'approved' || s.status === 'iu_approved'
                  );
                  milestone.approvedSubmission = approvedSubmission;
                }
              });
            }
            
            return enriched;
          }));
          setProjects(enrichedProjects);
        }
      } else {
        setError(data.error || 'Failed to load projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Fetch milestone submissions for a project
  const fetchMilestoneSubmissions = async (projectId) => {
    if (!projectId) {
      console.log('⚠️ No projectId provided to fetchMilestoneSubmissions');
      return [];
    }
    
    if (!token) {
      console.log('⚠️ No token available for fetching submissions');
      return [];
    }
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `${API_URL}/milestones/milestone-submissions?projectId=${projectId}`;
      console.log('📡 Fetching milestone submissions from:', url);
      
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 Submissions API response:', data);
        
        if (data.success && data.submissions) {
          console.log(`✅ Successfully fetched ${data.submissions.length} submissions`);
          return data.submissions || [];
        } else {
          console.log('⚠️ API response not successful or no submissions:', data);
        }
      } else {
        const errorText = await response.text();
        console.log('⚠️ Failed to fetch submissions, status:', response.status, 'Response:', errorText);
      }
    } catch (err) {
      console.error('❌ Error fetching milestone submissions:', err);
    }
    
    return [];
  };

  const fetchProjectDetails = async (id) => {
    try {
      setLoading(true);
      setError('');
      
      const isPublic = !token || userRole === 'public';
      const endpoint = isPublic 
        ? `${API_URL}/projects/public/${id}`
        : `${API_URL}/projects/${id}`;
      
      const headers = { 'Content-Type': 'application/json' };
      if (token && !isPublic) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const data = await response.json();
      
      if (data.success && data.project) {
        // Normalize project EIU data structure (no API calls)
        const enrichedProject = enrichProjectWithEIUData(data.project);
        
        // Fetch complete milestone data for this project
        // Use public endpoint for public users, authenticated endpoint for logged-in users
        try {
          const milestonesEndpoint = isPublic 
            ? `${API_URL}/milestones/project/${id}/public`
            : `${API_URL}/projects/${id}/milestones`;
          const milestonesResponse = await fetch(milestonesEndpoint, { headers });
          if (milestonesResponse.ok) {
            const milestonesData = await milestonesResponse.json();
            if (milestonesData.success && milestonesData.milestones) {
              console.log(`📋 Fetched complete milestone data for project ${id}:`, milestonesData.milestones.length);
              enrichedProject.milestones = milestonesData.milestones;
            } else if (milestonesData.milestones) {
              // Handle case where response doesn't have success field
              console.log(`📋 Fetched milestone data (no success field):`, milestonesData.milestones.length);
              enrichedProject.milestones = milestonesData.milestones;
            }
          } else {
            console.warn(`⚠️ Failed to fetch milestones for project ${id}, status: ${milestonesResponse.status}`);
          }
        } catch (err) {
          console.warn(`⚠️ Could not fetch milestones for project ${id}:`, err);
        }
        
        // Fetch milestone submissions and attach to project (only for authenticated users)
        if (!isPublic && enrichedProject.milestones && enrichedProject.milestones.length > 0) {
          console.log('📋 Fetching submissions for project details:', id);
          const submissions = await fetchMilestoneSubmissions(id);
          console.log('📋 Fetched submissions for project details:', submissions.length);
          console.log('📋 Submissions data:', submissions);
          
          // Attach approved submissions to their milestones
          enrichedProject.milestones.forEach(milestone => {
            const milestoneSubmissions = submissions.filter(s => s.milestoneId === milestone.id);
            console.log(`📋 Milestone "${milestone.title}" (${milestone.id}): Found ${milestoneSubmissions.length} submissions`);
            
            const approvedSubmission = milestoneSubmissions.find(s => 
              s.status === 'approved' || s.status === 'iu_approved'
            );
            
            if (approvedSubmission) {
              console.log(`✅ Found approved submission for "${milestone.title}":`, approvedSubmission);
            } else {
              console.log(`⚠️ No approved submission found for "${milestone.title}"`);
              console.log('  - All submissions for this milestone:', milestoneSubmissions.map(s => ({ id: s.id, status: s.status })));
            }
            
            milestone.submissions = milestoneSubmissions;
            milestone.approvedSubmission = approvedSubmission;
          });
        } else if (isPublic && enrichedProject.milestones && enrichedProject.milestones.length > 0) {
          // For public users, try to get approved submissions from the public project endpoint
          // The public endpoint should include approved submissions in the milestones
          console.log('📋 Public user - checking milestones for approved submissions in project details');
          enrichedProject.milestones.forEach(milestone => {
            // Check if milestone has submission data embedded
            if (milestone.submissions && Array.isArray(milestone.submissions)) {
              const approvedSubmission = milestone.submissions.find(s => 
                s.status === 'approved' || s.status === 'iu_approved'
              );
              milestone.approvedSubmission = approvedSubmission;
            }
          });
        }
        
        setSelectedProject(enrichedProject);
      } else {
        setError(data.error || 'Failed to load project details');
      }
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  // Get current user for role-based filtering
  const currentUser = getCurrentUser();
  const currentUserRole = (currentUser?.role || userRole || getCurrentUserRole() || '').toUpperCase();
  const currentUserId = currentUser?.id || currentUser?.userId || null;
  
  console.log('🔐 Project Ledger - Role-based filtering:', {
    currentUserRole,
    currentUserId,
    totalProjects: projects.length,
    userEmail: currentUser?.email || currentUser?.username
  });
  
  const filteredProjects = projects.filter(project => {
    // Role-based access control - ensure users only see projects they have access to
    let hasAccess = true;
    
    if (currentUserRole === 'EIU' && currentUserId) {
      // EIU users: only see projects assigned to them
      hasAccess = project.hasExternalPartner === true && 
                  (project.eiuPersonnelId === currentUserId || 
                   project.eiuPersonnel?.id === currentUserId);
      
      if (!hasAccess) {
        console.log('🚫 EIU access denied for project:', {
          projectId: project.id,
          projectName: project.name,
          projectEiuPersonnelId: project.eiuPersonnelId,
          projectEiuPersonnel: project.eiuPersonnel?.id,
          currentUserId: currentUserId,
          hasExternalPartner: project.hasExternalPartner
        });
      }
    } else if ((currentUserRole === 'LGU-IU' || currentUserRole === 'IU') && currentUserId) {
      // LGU-IU users: only see projects from their implementing office
      const userImplementingOffice = currentUser?.implementingOfficeName || 
                                     currentUser?.office || 
                                     currentUser?.department || 
                                     currentUser?.officeName;
      
      hasAccess = project.implementingOfficeId === currentUserId || 
                  project.implementingUnitId === currentUserId ||
                  (userImplementingOffice && project.implementingOfficeName === userImplementingOffice);
      
      if (!hasAccess) {
        console.log('🚫 LGU-IU access denied for project:', {
          projectId: project.id,
          projectName: project.name,
          projectImplementingOfficeId: project.implementingOfficeId,
          projectImplementingUnitId: project.implementingUnitId,
          projectImplementingOfficeName: project.implementingOfficeName,
          currentUserId: currentUserId,
          userImplementingOffice: userImplementingOffice
        });
      }
    }
    // For other roles (MPMEC, Secretariat, Executive, etc.), backend already filters correctly
    // But we can add additional frontend filtering if needed
    
    if (!hasAccess) {
      return false;
    }
    
    // Apply search and filter criteria
    const matchesSearch = !searchQuery || 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter (support both single and multi-select)
    const matchesStatus = !filterStatus && selectedStatuses.length === 0 
      ? true 
      : filterStatus 
        ? project.status === filterStatus 
        : selectedStatuses.length > 0 
          ? selectedStatuses.includes(project.status) 
          : true;
    
    // Category filter (support both single and multi-select)
    const matchesCategory = !filterCategory && selectedCategories.length === 0 
      ? true 
      : filterCategory 
        ? project.category === filterCategory 
        : selectedCategories.length > 0 
          ? selectedCategories.includes(project.category) 
          : true;
    
    // Priority filter
    const matchesPriority = selectedPriorities.length === 0 || selectedPriorities.includes(project.priority);
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRangeStart || dateRangeEnd) {
      const projectStartDate = project.startDate ? new Date(project.startDate) : null;
      const projectEndDate = project.targetCompletionDate || project.endDate ? new Date(project.targetCompletionDate || project.endDate) : null;
      
      if (dateRangeStart) {
        const startFilter = new Date(dateRangeStart);
        if (projectStartDate && projectStartDate < startFilter) {
          matchesDateRange = false;
        }
      }
      if (dateRangeEnd) {
        const endFilter = new Date(dateRangeEnd);
        if (projectEndDate && projectEndDate > endFilter) {
          matchesDateRange = false;
        }
      }
    }
    
    // Budget range filter
    let matchesBudgetRange = true;
    if (budgetRangeMin || budgetRangeMax) {
      const projectBudget = parseFloat(project.totalBudget || 0);
      if (budgetRangeMin && projectBudget < parseFloat(budgetRangeMin)) {
        matchesBudgetRange = false;
      }
      if (budgetRangeMax && projectBudget > parseFloat(budgetRangeMax)) {
        matchesBudgetRange = false;
      }
    }
    
    // Progress range filter
    let matchesProgressRange = true;
    if (progressRangeMin || progressRangeMax) {
      const projectProgress = parseFloat(project.progress?.overall || project.overallProgress || 0);
      if (progressRangeMin && projectProgress < parseFloat(progressRangeMin)) {
        matchesProgressRange = false;
      }
      if (progressRangeMax && projectProgress > parseFloat(progressRangeMax)) {
        matchesProgressRange = false;
      }
    }
    
    // Quick filter presets
    let matchesQuickFilter = true;
    if (quickFilterPreset) {
      switch (quickFilterPreset) {
        case 'overdue':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const targetDate = project.targetCompletionDate ? new Date(project.targetCompletionDate) : null;
          if (targetDate) {
            targetDate.setHours(0, 0, 0, 0);
            matchesQuickFilter = targetDate < today && project.status !== 'completed';
          } else {
            matchesQuickFilter = false;
          }
          break;
        case 'highPriority':
          matchesQuickFilter = project.priority === 'high';
          break;
        case 'nearCompletion':
          const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
          matchesQuickFilter = progress >= 80 && progress < 100;
          break;
        case 'recentlyUpdated':
          const updatedDate = project.updatedAt ? new Date(project.updatedAt) : null;
          if (updatedDate) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            matchesQuickFilter = updatedDate >= sevenDaysAgo;
          } else {
            matchesQuickFilter = false;
          }
          break;
        default:
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && 
           matchesDateRange && matchesBudgetRange && matchesProgressRange && matchesQuickFilter;
  });
  
  // Log filtering results
  if (projects.length !== filteredProjects.length) {
    console.log(`🔐 Filtered ${projects.length} projects down to ${filteredProjects.length} based on user access (${currentUserRole})`);
  } else {
    console.log(`✅ All ${projects.length} projects are accessible for user (${currentUserRole})`);
  }

  // ==================== DASHBOARD DATA CALCULATIONS ====================
  
  // Calculate dashboard statistics
  const calculateDashboardStats = () => {
    const stats = {
      totalProjects: filteredProjects.length,
      totalBudget: 0,
      averageProgress: 0,
      projectsByStatus: {},
      projectsByStatusWithNames: {}, // Store project names by status
      budgetByCategory: {},
      budgetByCategoryWithProjects: {}, // Store project names by category
      progressDistribution: {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0
      },
      progressDistributionWithProjects: {
        '0-20': [],
        '21-40': [],
        '41-60': [],
        '61-80': [],
        '81-100': []
      },
      projectsByPriority: {},
      projectsByPriorityWithNames: {}, // Store project names by priority
      statusCounts: {
        ongoing: 0,
        completed: 0,
        delayed: 0
      }
    };

    if (filteredProjects.length === 0) {
      return stats;
    }

    let totalProgress = 0;
    filteredProjects.forEach(project => {
      // Total Budget
      const budget = parseFloat(project.totalBudget || 0);
      stats.totalBudget += budget;

      // Average Progress
      const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
      totalProgress += progress;

      // Projects by Status
      const status = project.status || 'unknown';
      stats.projectsByStatus[status] = (stats.projectsByStatus[status] || 0) + 1;
      if (!stats.projectsByStatusWithNames[status]) {
        stats.projectsByStatusWithNames[status] = [];
      }
      stats.projectsByStatusWithNames[status].push(project.name || 'Unnamed Project');
      if (stats.statusCounts[status] !== undefined) {
        stats.statusCounts[status]++;
      }

      // Budget by Category
      const category = project.category || 'uncategorized';
      stats.budgetByCategory[category] = (stats.budgetByCategory[category] || 0) + budget;
      if (!stats.budgetByCategoryWithProjects[category]) {
        stats.budgetByCategoryWithProjects[category] = [];
      }
      stats.budgetByCategoryWithProjects[category].push({
        name: project.name || 'Unnamed Project',
        budget: budget
      });

      // Progress Distribution
      if (progress <= 20) {
        stats.progressDistribution['0-20']++;
        stats.progressDistributionWithProjects['0-20'].push(project.name || 'Unnamed Project');
      } else if (progress <= 40) {
        stats.progressDistribution['21-40']++;
        stats.progressDistributionWithProjects['21-40'].push(project.name || 'Unnamed Project');
      } else if (progress <= 60) {
        stats.progressDistribution['41-60']++;
        stats.progressDistributionWithProjects['41-60'].push(project.name || 'Unnamed Project');
      } else if (progress <= 80) {
        stats.progressDistribution['61-80']++;
        stats.progressDistributionWithProjects['61-80'].push(project.name || 'Unnamed Project');
      } else {
        stats.progressDistribution['81-100']++;
        stats.progressDistributionWithProjects['81-100'].push(project.name || 'Unnamed Project');
      }

      // Projects by Priority
      const priority = project.priority || 'medium';
      stats.projectsByPriority[priority] = (stats.projectsByPriority[priority] || 0) + 1;
      if (!stats.projectsByPriorityWithNames[priority]) {
        stats.projectsByPriorityWithNames[priority] = [];
      }
      stats.projectsByPriorityWithNames[priority].push(project.name || 'Unnamed Project');
    });

    stats.averageProgress = filteredProjects.length > 0 ? totalProgress / filteredProjects.length : 0;

    return stats;
  };

  const dashboardStats = calculateDashboardStats();

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'ongoing': '#3B82F6', // blue
      'completed': '#10B981', // green
      'delayed': '#EF4444', // red
      'unknown': '#6B7280' // gray
    };
    return colors[status] || colors['unknown'];
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      'high': '#EF4444', // red
      'medium': '#F59E0B', // amber
      'low': '#10B981' // green
    };
    return colors[priority] || '#6B7280';
  };

  // Get category color
  const getCategoryColor = (category, index) => {
    const categoryColors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316' // orange
    ];
    const categories = Object.keys(dashboardStats.budgetByCategory);
    const categoryIndex = categories.indexOf(category);
    return categoryColors[categoryIndex % categoryColors.length];
  };

  // ==================== TIMELINE/GANTT CHART FUNCTIONS ====================
  
  // Calculate timeline data for Gantt chart
  const calculateTimelineData = () => {
    const timelineData = [];
    
    filteredProjects.forEach(project => {
      const phases = getProjectPhases(project);
      
      if (phases.length > 0) {
        phases.forEach((phase, phaseIndex) => {
          const startDate = phase.startDate ? new Date(phase.startDate) : null;
          const endDate = phase.targetCompletionDate ? new Date(phase.targetCompletionDate) : null;
          
          if (startDate && endDate) {
            timelineData.push({
              projectId: project.id,
              projectName: project.name,
              projectCode: project.projectCode,
              phaseId: phase.id || `phase-${phaseIndex}`,
              phaseName: phase.title || phase.description || `Phase ${phaseIndex + 1}`,
              startDate: startDate,
              endDate: endDate,
              status: project.status || 'ongoing',
              progress: parseFloat(phase.physicalAccomplishmentGainedWeight || project.overallProgress || 0),
              priority: project.priority || 'medium',
              category: project.category || 'uncategorized'
            });
          }
        });
      } else {
        // If no phases, use project dates
        const startDate = project.startDate ? new Date(project.startDate) : null;
        const endDate = project.targetCompletionDate || project.endDate 
          ? new Date(project.targetCompletionDate || project.endDate) 
          : null;
        
        if (startDate && endDate) {
          timelineData.push({
            projectId: project.id,
            projectName: project.name,
            projectCode: project.projectCode,
            phaseId: project.id,
            phaseName: project.name,
            startDate: startDate,
            endDate: endDate,
            status: project.status || 'ongoing',
            progress: parseFloat(project.progress?.overall || project.overallProgress || 0),
            priority: project.priority || 'medium',
            category: project.category || 'uncategorized'
          });
        }
      }
    });
    
    return timelineData.sort((a, b) => a.startDate - b.startDate);
  };

  // Get timeline date range
  const getTimelineDateRange = (timelineData) => {
    if (timelineData.length === 0) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
      return { start, end };
    }
    
    const dates = timelineData.flatMap(item => [item.startDate, item.endDate]);
    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));
    
    // Add padding
    start.setMonth(start.getMonth() - 1);
    end.setMonth(end.getMonth() + 1);
    
    return { start, end };
  };

  // Calculate days between dates
  const getDaysBetween = (start, end) => {
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  // Get date position in timeline (percentage)
  const getDatePosition = (date, timelineStart, timelineEnd) => {
    const totalDays = getDaysBetween(timelineStart, timelineEnd);
    const daysFromStart = getDaysBetween(timelineStart, date);
    return (daysFromStart / totalDays) * 100;
  };

  // Format date for timeline header
  const formatTimelineDate = (date, zoom) => {
    if (zoom === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (zoom === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  // Get date step for timeline header
  const getDateStep = (zoom) => {
    if (zoom === 'day') return 1;
    if (zoom === 'week') return 7;
    return 30; // month
  };

  // Get minimum width for timeline bars
  const getMinBarWidth = (zoom) => {
    if (zoom === 'day') return 60; // pixels
    if (zoom === 'week') return 80;
    return 100; // month
  };

  // ==================== PROJECT COMPARISON FUNCTIONS ====================
  
  // Calculate comparison metrics
  const calculateComparisonMetrics = (projects) => {
    if (projects.length < 2) return null;

    const metrics = {
      averageBudget: 0,
      averageProgress: 0,
      averageDaysToComplete: 0,
      totalBudget: 0,
      totalProgress: 0,
      budgetVariances: [],
      progressVariances: [],
      timelineVariances: []
    };

    let totalBudget = 0;
    let totalProgress = 0;
    let totalDays = 0;
    const validProjects = projects.filter(p => p);

    validProjects.forEach(project => {
      const budget = parseFloat(project.totalBudget || 0);
      const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
      
      totalBudget += budget;
      totalProgress += progress;

      // Calculate days to complete
      if (project.startDate && project.targetCompletionDate) {
        const start = new Date(project.startDate);
        const end = new Date(project.targetCompletionDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        totalDays += days;
      }
    });

    metrics.averageBudget = validProjects.length > 0 ? totalBudget / validProjects.length : 0;
    metrics.averageProgress = validProjects.length > 0 ? totalProgress / validProjects.length : 0;
    metrics.averageDaysToComplete = validProjects.length > 0 ? totalDays / validProjects.length : 0;
    metrics.totalBudget = totalBudget;
    metrics.totalProgress = totalProgress;

    // Calculate variances
    validProjects.forEach(project => {
      const budget = parseFloat(project.totalBudget || 0);
      const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
      
      const budgetVariance = metrics.averageBudget > 0 
        ? ((budget - metrics.averageBudget) / metrics.averageBudget) * 100 
        : 0;
      
      const progressVariance = metrics.averageProgress > 0
        ? progress - metrics.averageProgress
        : 0;

      metrics.budgetVariances.push({
        projectId: project.id,
        variance: budgetVariance,
        isPositive: budgetVariance > 0
      });

      metrics.progressVariances.push({
        projectId: project.id,
        variance: progressVariance,
        isPositive: progressVariance > 0
      });

      // Timeline variance
      if (project.startDate && project.targetCompletionDate) {
        const start = new Date(project.startDate);
        const end = new Date(project.targetCompletionDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const timelineVariance = metrics.averageDaysToComplete > 0
          ? days - metrics.averageDaysToComplete
          : 0;

        metrics.timelineVariances.push({
          projectId: project.id,
          variance: timelineVariance,
          isPositive: timelineVariance < 0 // Negative is better (shorter timeline)
        });
      }
    });

    return metrics;
  };

  // Get variance color
  const getVarianceColor = (variance, isPositive, isTimeline = false) => {
    if (isTimeline) {
      // For timeline, negative variance (shorter) is better
      return variance < 0 ? '#10B981' : variance > 0 ? '#EF4444' : '#6B7280';
    }
    // For budget/progress, depends on context
    return isPositive ? '#10B981' : variance < 0 ? '#EF4444' : '#6B7280';
  };

  // Toggle project selection for comparison
  const toggleProjectForComparison = (projectId) => {
    if (selectedProjectsForComparison.includes(projectId)) {
      setSelectedProjectsForComparison(selectedProjectsForComparison.filter(id => id !== projectId));
    } else {
      if (selectedProjectsForComparison.length < 4) {
        setSelectedProjectsForComparison([...selectedProjectsForComparison, projectId]);
      } else {
        alert('You can compare up to 4 projects at a time.');
      }
    }
  };

  // Start comparison
  const startComparison = () => {
    if (selectedProjectsForComparison.length < 2) {
      alert('Please select at least 2 projects to compare.');
      return;
    }
    setComparisonMode(true);
    setShowComparisonModal(false);
    setViewMode('compare');
  };

  // Exit comparison mode
  const exitComparison = () => {
    setComparisonMode(false);
    setSelectedProjectsForComparison([]);
    setViewMode('table');
  };

  // ==================== EXPORT & PRINT FUNCTIONS ====================
  
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
          // Load autoTable plugin
          const autoTableScript = document.createElement('script');
          autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
          document.head.appendChild(autoTableScript);
          return true;
        }
      } catch (e) {
        console.warn(`Failed to load jsPDF from ${src}:`, e);
      }
    }
    return false;
  };

  // Load ExcelJS library dynamically
  const loadExcelJSLibrary = async () => {
    if (window.ExcelJS) {
      return true;
    }

    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
      'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
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
        
        if (window.ExcelJS) {
          return true;
        }
      } catch (e) {
        console.warn(`Failed to load ExcelJS from ${src}:`, e);
      }
    }
    return false;
  };

  // Load html2canvas library dynamically
  const loadHtml2CanvasLibrary = async () => {
    if (window.html2canvas) {
      return true;
    }

    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
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
        
        if (window.html2canvas) {
          return true;
        }
      } catch (e) {
        console.warn(`Failed to load html2canvas from ${src}:`, e);
      }
    }
    return false;
  };

  // Export timeline as PNG image
  const exportTimeline = async () => {
    try {
      setLoading(true);
      const timelineElement = document.querySelector('[data-timeline-chart]');
      
      if (!timelineElement) {
        alert('Timeline chart not found. Please ensure the timeline is visible.');
        setLoading(false);
        return;
      }

      // Load html2canvas library
      const loaded = await loadHtml2CanvasLibrary();
      if (!loaded) {
        alert('Failed to load export library. Please try again.');
        setLoading(false);
        return;
      }

      const html2canvas = window.html2canvas;
      if (!html2canvas || typeof html2canvas !== 'function') {
        alert('Export library failed to initialize. Please try again.');
        setLoading(false);
        return;
      }

      // Scroll to top of timeline to ensure full capture
      timelineElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      
      // Wait a moment for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the timeline element
      const canvas = await html2canvas(timelineElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: timelineElement.scrollWidth,
        windowHeight: timelineElement.scrollHeight,
        width: timelineElement.scrollWidth,
        height: timelineElement.scrollHeight
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to generate image. Please try again.');
          setLoading(false);
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const now = new Date();
        const fileName = `Project-Timeline-${now.toISOString().split('T')[0]}.png`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setLoading(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error exporting timeline:', error);
      alert('Failed to export timeline. Please try again.');
      setLoading(false);
    }
  };

  // Format currency for export
  const formatCurrencyForExport = (amount) => {
    if (!amount || amount === 0 || amount === '0' || amount === 'N/A') return '₱0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date for export
  const formatDateForExport = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-PH', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // Helper function to safely convert any value to string for CSV/export
  const safeString = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    try {
      return String(value);
    } catch (e) {
      return defaultValue;
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!displayProject) {
      alert('No project data available to export.');
      return;
    }

    try {
      setLoading(true);
      const loaded = await loadJsPDFLibrary();
      if (!loaded) {
        alert('Failed to load PDF library. Please try again.');
        setLoading(false);
        return;
      }

      let jsPDF = window.jsPDF?.jsPDF || window.jsPDF || window.jspdf?.jsPDF || window.jspdf;
      if (!jsPDF || typeof jsPDF !== 'function') {
        alert('PDF library failed to initialize. Please try again.');
        setLoading(false);
        return;
      }

      const doc = new jsPDF(tableView === 'horizontal' ? 'l' : 'p', 'mm', 'a4');
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

      const userData = getCurrentUser();
      const organizationName = userData?.implementingOfficeName || userData?.office || userData?.department || 'MUNICIPAL ENGINEERING OFFICE';

      // Header with enhanced styling
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('BUILD WATCH', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text('Project Monitoring & Evaluation System', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Generated on ${currentDate} at ${currentTime}`, doc.internal.pageSize.getWidth() / 2, 31, { align: 'center' });

      let yPos = 45;

      // Project Information Section with enhanced styling
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPos, doc.internal.pageSize.getWidth() - 20, 10, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('PROJECT LEDGER REPORT', doc.internal.pageSize.getWidth() / 2, yPos + 6, { align: 'center' });
      yPos += 18;

      // Basic Project Information
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(229, 231, 235);
      doc.rect(10, yPos - 3, doc.internal.pageSize.getWidth() - 20, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Basic Project Information', 10, yPos);
      yPos += 9;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      const basicInfo = [
        ['Project Title:', displayProject.name || 'N/A'],
        ['Status:', displayProject.status ? displayProject.status.charAt(0).toUpperCase() + displayProject.status.slice(1) : 'N/A'],
        ['Overall Progress:', `${(parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)).toFixed(1)}%`],
        ['Project Code:', displayProject.projectCode || 'N/A'],
        ['Implementing Office:', displayProject.implementingOfficeName || 'N/A'],
        ['Category:', displayProject.category || 'N/A'],
        ['Location/Barangay:', displayProject.location || 'N/A'],
        ['Priority:', displayProject.priority || 'N/A'],
        ['Funding Source:', formatFundingSource(displayProject.fundingSource)],
        ['Created Date:', formatDateForExport(displayProject.createdDate)],
        ['Project Description:', displayProject.description || 'N/A'],
        ['Expected Outputs:', displayProject.expectedOutputs || 'N/A'],
        ['Target Beneficiaries:', displayProject.targetBeneficiaries || 'N/A']
      ];

      basicInfo.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(String(label), 10, yPos);
        doc.setFont(undefined, 'normal');
        const valueStr = safeString(value, 'N/A');
        const maxWidth = doc.internal.pageSize.getWidth() - 70;
        const lines = doc.splitTextToSize(valueStr, maxWidth);
        doc.text(lines, 65, yPos);
        yPos += Math.max(lines.length * 5, 6);
        if (yPos > doc.internal.pageSize.getHeight() - 25) {
          doc.addPage();
          yPos = 20;
        }
      });

      yPos += 5;

      // EIU Partner Contractor - Hidden for public users
      const eiuPartner = getEIUPartner(displayProject);
      if (!isPublic && eiuPartner) {
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setFillColor(229, 231, 235);
        doc.rect(10, yPos - 3, doc.internal.pageSize.getWidth() - 20, 6, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text('EIU Partner Contractor', 10, yPos);
        yPos += 9;
        doc.setFont(undefined, 'normal');
        
        const eiuInfo = [
          ['Company Name:', eiuPartner.displayFullName || eiuPartner.name || 'N/A'],
          ['Email/Username:', eiuPartner.displayEmail || eiuPartner.email || 'N/A'],
          ['Contact Number:', eiuPartner.displayContact || eiuPartner.contact || 'N/A'],
          ['Group:', eiuPartner.displayGroup || eiuPartner.group || 'N/A'],
          ['Department:', eiuPartner.displayDepartment || eiuPartner.department || 'N/A'],
          ['Subrole:', eiuPartner.displaySubrole || eiuPartner.subrole || 'N/A'],
          ['Company:', eiuPartner.displayCompany || eiuPartner.company || 'N/A']
        ];

        eiuInfo.forEach(([label, value]) => {
          doc.setFont(undefined, 'bold');
          doc.text(String(label), 10, yPos);
          doc.setFont(undefined, 'normal');
          const valueStr = safeString(value, 'N/A');
          doc.text(valueStr, 65, yPos);
          yPos += 6;
          if (yPos > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage();
            yPos = 20;
          }
        });
        yPos += 5;
      }

      // Timeline Information
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(229, 231, 235);
      doc.rect(10, yPos - 3, doc.internal.pageSize.getWidth() - 20, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Timeline Information', 10, yPos);
      yPos += 9;
      doc.setFont(undefined, 'normal');
      
      const timelineInfo = [
        ['Start Date:', formatDateForExport(displayProject.startDate)],
        ['Target Completion Date:', formatDateForExport(displayProject.targetCompletionDate)],
        ['Expected Days of Completion:', displayProject.expectedDaysOfCompletion || 'N/A'],
        ['Actual Completion Date:', formatDateForExport(displayProject.completionDate)]
      ];

      timelineInfo.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(String(label), 10, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(safeString(value, 'N/A'), 65, yPos);
        yPos += 6;
      });
      yPos += 5;

      // Budget Information
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(229, 231, 235);
      doc.rect(10, yPos - 3, doc.internal.pageSize.getWidth() - 20, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Budget Information', 10, yPos);
      yPos += 9;
      doc.setFont(undefined, 'normal');
      
      const budgetInfo = [
        ['Total Budget Allocation:', formatCurrencyForExport(displayProject.totalBudget)],
        ['Budget Description:', displayProject.budgetBreakdown || displayProject.budgetDescription || 'N/A']
      ];

      budgetInfo.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(String(label), 10, yPos);
        doc.setFont(undefined, 'normal');
        const valueStr = safeString(value, 'N/A');
        const maxWidth = doc.internal.pageSize.getWidth() - 70;
        const lines = doc.splitTextToSize(valueStr, maxWidth);
        doc.text(lines, 65, yPos);
        yPos += Math.max(lines.length * 5, 6);
        if (yPos > doc.internal.pageSize.getHeight() - 25) {
          doc.addPage();
          yPos = 20;
        }
      });
      yPos += 5;

      // Physical Accomplishment Information
      const physicalAccomplishment = safeString(
        displayProject.physicalProgressRequirements || 
        displayProject.generalDescription || 
        displayProject.physicalDescription, 
        'N/A'
      );
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(229, 231, 235);
      doc.rect(10, yPos - 3, doc.internal.pageSize.getWidth() - 20, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Physical Accomplishment Information', 10, yPos);
      yPos += 9;
      doc.setFont(undefined, 'normal');
      const maxWidth = doc.internal.pageSize.getWidth() - 20;
      const physicalLines = doc.splitTextToSize(physicalAccomplishment, maxWidth);
      doc.text(physicalLines, 10, yPos);
      yPos += Math.max(physicalLines.length * 5, 6);
      if (yPos > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;

      // Project Phases Update
      const phases = getProjectPhases(displayProject);
      if (phases && phases.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setFillColor(229, 231, 235);
        doc.rect(10, yPos - 3, doc.internal.pageSize.getWidth() - 20, 7, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text('PROJECT PHASES UPDATE', doc.internal.pageSize.getWidth() / 2, yPos + 1, { align: 'center' });
        yPos += 12;

        phases.forEach((phase, index) => {
          if (yPos > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFont(undefined, 'bold');
          doc.setFontSize(11);
          doc.text(`Phase ${index + 1}: ${safeString(phase.title || phase.name, 'N/A')}`, 10, yPos);
          yPos += 7;
          doc.setFont(undefined, 'normal');
          doc.setFontSize(10);

          const phaseData = [
            ['Description:', phase.description || 'N/A'],
            ['Planned Budget:', formatCurrencyForExport(phase.plannedBudget)],
            ['Breakdown Description:', phase.breakdownDescription || 'N/A'],
            ['Start Date:', formatDateForExport(phase.startDate)],
            ['Target Completion Date:', formatDateForExport(phase.targetCompletionDate)],
            ['Submission Date:', formatDateForExport(phase.submissionDate)],
            ['Actual Phase Completion Date:', formatDateForExport(phase.actualPhaseCompletionDate)],
            ['Timeline Activities & Deliverables:', phase.timelineActivities || 'N/A'],
            ['Used Budget:', formatCurrencyForExport(phase.usedBudget)],
            ['Remaining Budget:', formatCurrencyForExport(phase.remainingBudget)],
            ['Budget Breakdown & Allocation:', phase.budgetBreakdownAllocation || 'N/A'],
            ['Physical Progress Description:', phase.physicalProgressDescription || 'N/A'],
            ['Submitted By:', phase.submittedBy || 'N/A'],
            ['Remarks and Recommendation:', phase.remarksAndRecommendation || 'N/A']
          ];

          phaseData.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(String(label), 15, yPos);
            doc.setFont(undefined, 'normal');
            const valueStr = safeString(value, 'N/A');
            const maxWidth = doc.internal.pageSize.getWidth() - 75;
            const lines = doc.splitTextToSize(valueStr, maxWidth);
            doc.text(lines, 70, yPos);
            yPos += Math.max(lines.length * 5, 6);
            if (yPos > doc.internal.pageSize.getHeight() - 25) {
              doc.addPage();
              yPos = 20;
            }
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
          `Page ${i} of ${totalPages} - ${organizationName}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      const fileName = `Project-Ledger-${displayProject.projectCode || displayProject.id}-${now.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      setLoading(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = async (format = excelExportFormat) => {
    if (!displayProject) {
      alert('No project data available to export.');
      return;
    }

    // Route to appropriate export function based on format
    if (format === 'horizontal') {
      return exportToExcelHorizontal();
    }
    // Continue with vertical export (existing code)

    try {
      setLoading(true);
      const loaded = await loadExcelJSLibrary();
      if (!loaded) {
        alert('Failed to load Excel library. Please try again.');
        setLoading(false);
        return;
      }

      const ExcelJS = window.ExcelJS;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Project Ledger');

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

      // Header row with enhanced styling
      worksheet.mergeCells('A1:B1');
      worksheet.getCell('A1').value = 'BUILD WATCH - Project Monitoring & Evaluation System';
      worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      worksheet.mergeCells('A2:B2');
      worksheet.getCell('A2').value = `Generated on ${currentDate} at ${currentTime}`;
      worksheet.getCell('A2').font = { size: 11 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      let row = 4;

      // Basic Project Information
      worksheet.getCell(`A${row}`).value = 'Basic Project Information';
      worksheet.getCell(`A${row}`).font = { bold: true, size: 13 };
      worksheet.getCell(`A${row}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      };
      worksheet.mergeCells(`A${row}:B${row}`);
      row++;

      const basicInfo = [
        ['Project Title:', displayProject.name || 'N/A'],
        ['Status:', displayProject.status ? displayProject.status.charAt(0).toUpperCase() + displayProject.status.slice(1) : 'N/A'],
        ['Overall Progress:', `${(parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)).toFixed(1)}%`],
        ['Project Code:', displayProject.projectCode || 'N/A'],
        ['Implementing Office:', displayProject.implementingOfficeName || 'N/A'],
        ['Category:', displayProject.category || 'N/A'],
        ['Location/Barangay:', displayProject.location || 'N/A'],
        ['Priority:', displayProject.priority || 'N/A'],
        ['Funding Source:', formatFundingSource(displayProject.fundingSource)],
        ['Created Date:', formatDateForExport(displayProject.createdDate)],
        ['Project Description:', displayProject.description || 'N/A'],
        ['Expected Outputs:', displayProject.expectedOutputs || 'N/A'],
        ['Target Beneficiaries:', displayProject.targetBeneficiaries || 'N/A']
      ];

      basicInfo.forEach(([label, value]) => {
        const cellA = worksheet.getCell(`A${row}`);
        const cellB = worksheet.getCell(`B${row}`);
        cellA.value = label;
        cellA.font = { bold: true };
        cellB.value = value || 'N/A';
        cellB.alignment = { wrapText: true, vertical: 'top' };
        
        // Calculate row height based on content length (approximate: 1 line = 15px, max 10 lines)
        const valueStr = safeString(value, 'N/A');
        const estimatedLines = Math.min(Math.ceil(valueStr.length / 80), 10);
        const rowObj = worksheet.getRow(row);
        rowObj.height = Math.max(20, estimatedLines * 15);
        
        row++;
      });

      row++;

      // EIU Partner Contractor - Hidden for public users
      const eiuPartner = getEIUPartner(displayProject);
      if (!isPublic && eiuPartner) {
        worksheet.getCell(`A${row}`).value = 'EIU Partner Contractor';
        worksheet.getCell(`A${row}`).font = { bold: true, size: 13 };
        worksheet.getCell(`A${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' }
        };
        worksheet.mergeCells(`A${row}:B${row}`);
        row++;

        const eiuInfo = [
          ['Company Name:', eiuPartner.displayFullName || eiuPartner.name || 'N/A'],
          ['Email/Username:', eiuPartner.displayEmail || eiuPartner.email || 'N/A'],
          ['Contact Number:', eiuPartner.displayContact || eiuPartner.contact || 'N/A'],
          ['Group:', eiuPartner.displayGroup || eiuPartner.group || 'N/A'],
          ['Department:', eiuPartner.displayDepartment || eiuPartner.department || 'N/A'],
          ['Subrole:', eiuPartner.displaySubrole || eiuPartner.subrole || 'N/A'],
          ['Company:', eiuPartner.displayCompany || eiuPartner.company || 'N/A']
        ];

        eiuInfo.forEach(([label, value]) => {
          const cellA = worksheet.getCell(`A${row}`);
          const cellB = worksheet.getCell(`B${row}`);
          cellA.value = label;
          cellA.font = { bold: true };
          cellB.value = safeString(value, 'N/A');
          cellB.alignment = { wrapText: true, vertical: 'top' };
          
          // Calculate row height based on content length
          const valueStr = safeString(value, 'N/A');
          const estimatedLines = Math.min(Math.ceil(valueStr.length / 80), 10);
          const rowObj = worksheet.getRow(row);
          rowObj.height = Math.max(20, estimatedLines * 15);
          
          row++;
        });
        row++;
      }

      // Timeline Information
      worksheet.getCell(`A${row}`).value = 'Timeline Information';
      worksheet.getCell(`A${row}`).font = { bold: true, size: 13 };
      worksheet.getCell(`A${row}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      };
      worksheet.mergeCells(`A${row}:B${row}`);
      row++;

      const timelineInfo = [
        ['Start Date:', formatDateForExport(displayProject.startDate)],
        ['Target Completion Date:', formatDateForExport(displayProject.targetCompletionDate)],
        ['Expected Days of Completion:', displayProject.expectedDaysOfCompletion || 'N/A'],
        ['Actual Completion Date:', formatDateForExport(displayProject.completionDate)]
      ];

      timelineInfo.forEach(([label, value]) => {
        const cellA = worksheet.getCell(`A${row}`);
        const cellB = worksheet.getCell(`B${row}`);
        cellA.value = label;
        cellA.font = { bold: true };
        cellB.value = value || 'N/A';
        cellB.alignment = { wrapText: true, vertical: 'top' };
        
        const valueStr = safeString(value, 'N/A');
        const estimatedLines = Math.min(Math.ceil(valueStr.length / 80), 10);
        const rowObj = worksheet.getRow(row);
        rowObj.height = Math.max(20, estimatedLines * 15);
        
        row++;
      });
      row++;

      // Budget Information
      worksheet.getCell(`A${row}`).value = 'Budget Information';
      worksheet.getCell(`A${row}`).font = { bold: true, size: 13 };
      worksheet.getCell(`A${row}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      };
      worksheet.mergeCells(`A${row}:B${row}`);
      row++;

      const budgetInfo = [
        ['Total Budget Allocation:', formatCurrencyForExport(displayProject.totalBudget)],
        ['Budget Description:', displayProject.budgetBreakdown || displayProject.budgetDescription || 'N/A']
      ];

      budgetInfo.forEach(([label, value]) => {
        const cellA = worksheet.getCell(`A${row}`);
        const cellB = worksheet.getCell(`B${row}`);
        cellA.value = label;
        cellA.font = { bold: true };
        cellB.value = value || 'N/A';
        cellB.alignment = { wrapText: true, vertical: 'top' };
        
        const valueStr = safeString(value, 'N/A');
        const estimatedLines = Math.min(Math.ceil(valueStr.length / 80), 10);
        const rowObj = worksheet.getRow(row);
        rowObj.height = Math.max(20, estimatedLines * 15);
        
        row++;
      });
      row++;

      // Physical Accomplishment Information
      const physicalAccomplishment = displayProject.physicalProgressRequirements || 
                                     displayProject.generalDescription || 
                                     displayProject.physicalDescription || 
                                     'N/A';
      worksheet.getCell(`A${row}`).value = 'Physical Accomplishment Information';
      worksheet.getCell(`A${row}`).font = { bold: true, size: 13 };
      worksheet.getCell(`A${row}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      };
      worksheet.mergeCells(`A${row}:B${row}`);
      row++;
      const physicalCell = worksheet.getCell(`A${row}`);
      physicalCell.value = physicalAccomplishment;
      physicalCell.alignment = { wrapText: true, vertical: 'top' };
      
      // Calculate row height for physical accomplishment
      const physicalStr = safeString(physicalAccomplishment, 'N/A');
      const estimatedLines = Math.min(Math.ceil(physicalStr.length / 120), 15);
      const physicalRow = worksheet.getRow(row);
      physicalRow.height = Math.max(30, estimatedLines * 15);
      
      row += 2;

      // Project Phases Update
      const phases = getProjectPhases(displayProject);
      if (phases && phases.length > 0) {
        worksheet.getCell(`A${row}`).value = 'PROJECT PHASES UPDATE';
        worksheet.getCell(`A${row}`).font = { bold: true, size: 13 };
        worksheet.getCell(`A${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' }
        };
        worksheet.mergeCells(`A${row}:B${row}`);
        row++;

        phases.forEach((phase, index) => {
          worksheet.getCell(`A${row}`).value = `Phase ${index + 1}: ${phase.title || phase.name || 'N/A'}`;
          worksheet.getCell(`A${row}`).font = { bold: true, size: 11 };
          row++;

          const phaseData = [
            ['Description:', phase.description || 'N/A'],
            ['Planned Budget:', formatCurrencyForExport(phase.plannedBudget)],
            ['Breakdown Description:', phase.breakdownDescription || 'N/A'],
            ['Start Date:', formatDateForExport(phase.startDate)],
            ['Target Completion Date:', formatDateForExport(phase.targetCompletionDate)],
            ['Submission Date:', formatDateForExport(phase.submissionDate)],
            ['Actual Phase Completion Date:', formatDateForExport(phase.actualPhaseCompletionDate)],
            ['Timeline Activities & Deliverables:', phase.timelineActivities || 'N/A'],
            ['Used Budget:', formatCurrencyForExport(phase.usedBudget)],
            ['Remaining Budget:', formatCurrencyForExport(phase.remainingBudget)],
            ['Budget Breakdown & Allocation:', phase.budgetBreakdownAllocation || 'N/A'],
            ['Physical Progress Description:', phase.physicalProgressDescription || 'N/A'],
            ['Submitted By:', phase.submittedBy || 'N/A'],
            ['Remarks and Recommendation:', phase.remarksAndRecommendation || 'N/A']
          ];

          phaseData.forEach(([label, value]) => {
            const cellA = worksheet.getCell(`A${row}`);
            const cellB = worksheet.getCell(`B${row}`);
            cellA.value = label;
            cellA.font = { bold: true };
            cellB.value = value || 'N/A';
            cellB.alignment = { wrapText: true, vertical: 'top' };
            
            // Calculate row height based on content length
            // For long description fields, allow more lines
            const valueStr = safeString(value, 'N/A');
            const isLongDescriptionField = label.includes('Description') || 
                                         label.includes('Activities') || 
                                         label.includes('Allocation') || 
                                         label.includes('Remarks');
            const maxLines = isLongDescriptionField ? 20 : 10; // Allow up to 20 lines for long descriptions
            const estimatedLines = Math.min(Math.ceil(valueStr.length / 70), maxLines);
            const rowObj = worksheet.getRow(row);
            rowObj.height = Math.max(25, estimatedLines * 15);
            
            row++;
          });
          row++;
        });
      }

      // Set column widths with better spacing
      worksheet.getColumn('A').width = 35;
      worksheet.getColumn('B').width = 60;
      worksheet.getColumn('C').width = 25;
      worksheet.getColumn('D').width = 25;
      
      // Apply borders and styling to all data cells
      for (let r = 1; r <= row; r++) {
        const rowObj = worksheet.getRow(r);
        // Don't override height if it was already set dynamically
        if (r <= 2) {
          rowObj.height = r === 1 ? 30 : 20;
        } else if (!rowObj.height || rowObj.height === 20) {
          // Only set default height if not already set dynamically
          const cellB = worksheet.getCell(`B${r}`);
          if (cellB.value) {
            const valueStr = safeString(cellB.value, '');
            const estimatedLines = Math.min(Math.ceil(valueStr.length / 80), 10);
            rowObj.height = Math.max(20, estimatedLines * 15);
          } else {
            rowObj.height = 20;
          }
        }
        
        ['A', 'B', 'C', 'D'].forEach(col => {
          const cell = worksheet.getCell(`${col}${r}`);
          if (r > 2) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            // Ensure wrapText is enabled for all data cells
            if (col === 'B' && cell.value) {
              cell.alignment = { wrapText: true, vertical: 'top' };
            }
          }
        });
      }

      const fileName = `Project-Ledger-${displayProject.projectCode || displayProject.id}-${now.toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setLoading(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export Excel. Please try again.');
      setLoading(false);
    }
  };

  // Export to Excel - Horizontal Table View
  const exportToExcelHorizontal = async () => {
    if (!displayProject) {
      alert('No project data available to export.');
      return;
    }

    try {
      setLoading(true);
      const loaded = await loadExcelJSLibrary();
      if (!loaded) {
        alert('Failed to load Excel library. Please try again.');
        setLoading(false);
        return;
      }

      const ExcelJS = window.ExcelJS;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Project Ledger');

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

      // Helper function to convert column number to letter (supports up to ZZ)
      const getColumnLetter = (colNum) => {
        let result = '';
        while (colNum > 0) {
          colNum--;
          result = String.fromCharCode(65 + (colNum % 26)) + result;
          colNum = Math.floor(colNum / 26);
        }
        return result;
      };

      // Header row with enhanced styling
      const headerCols = 46; // Total number of columns in horizontal view (13 Basic Project Info + 7 EIU + 4 Timeline + 2 Budget + 1 Physical + 19 Phases)
      const lastCol = getColumnLetter(headerCols);
      worksheet.mergeCells(`A1:${lastCol}1`);
      worksheet.getCell('A1').value = 'BUILD WATCH - Project Monitoring & Evaluation System';
      worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      worksheet.mergeCells(`A2:${lastCol}2`);
      worksheet.getCell('A2').value = `Generated on ${currentDate} at ${currentTime}`;
      worksheet.getCell('A2').font = { size: 11 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      let row = 4;
      let col = 1;

      // Main Header Row (Row 4)
      const mainHeaders = [
        { text: 'Basic Project Information', span: 13 },
        ...(!isPublic ? [{ text: 'EIU Partner Contractor', span: 7 }] : []),
        { text: 'Timeline Information', span: 4 },
        { text: 'Budget Information', span: 2 },
        { text: 'Physical Accomplishment Information', span: 1 },
        { text: 'Project Phases Update', span: 19 }
      ];

      mainHeaders.forEach(header => {
        const startCol = getColumnLetter(col);
        const endCol = getColumnLetter(col + header.span - 1);
        worksheet.mergeCells(`${startCol}${row}:${endCol}${row}`);
        const cell = worksheet.getCell(`${startCol}${row}`);
        cell.value = header.text;
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        col += header.span;
      });
      worksheet.getRow(row).height = 25;
      row++;

      // Sub-header Row (Row 5) - Column Headers
      col = 1;
      const subHeaders = [
        // Basic Project Information (13 columns)
        'Project Title', 'Status', 'Overall Progress', 'Project Code', 'Implementing Office', 'Category', 
        'Location/Barangay', 'Priority', 'Funding Source', 'Created Date', 
        'Project Description', 'Expected Outputs', 'Target Beneficiaries',
        // EIU Partner Contractor (7 columns) - Hidden for public users
        ...(!isPublic ? ['Company Name', 'Email/Username', 'Contact Number', 'Group', 
        'Department', 'Subrole', 'Company'] : []),
        // Timeline Information (4 columns)
        'Start Date', 'Target Completion Date', 'Expected Days of Completion', 'Actual Completion Date',
        // Budget Information (2 columns)
        'Total Budget Allocation (₱)', 'Budget Description',
        // Physical Accomplishment Information (1 column)
        'General Description',
        // Project Phases Update (19 columns)
        'Phase (Item of Work)', 'Description', 'Planned Budget', 'Breakdown Description',
        'Budget Alloted Weight', 'Physical Accomplishment Weight', 'Start Date', 'Target Completion Date',
        'Submission Date', 'Actual Phase Completion Date', 'Timeline Activities & Deliverables',
        'Used Budget', 'Remaining Budget', 'Budget Breakdown & Allocation',
        'Physical Accomplishment Gained Weight', 'Budget Utilization Gained Weight', 'Photo Proof', 'Video Proof', 'Document Proof',
        'Physical Progress Description', 'Submitted By', 'Remarks and Recommendation'
      ];

      subHeaders.forEach((headerText, index) => {
        const colLetter = getColumnLetter(col);
        const cell = worksheet.getCell(`${colLetter}${row}`);
        cell.value = headerText;
        cell.font = { bold: true, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        col++;
      });
      worksheet.getRow(row).height = 30;
      row++;

      // Data Rows - Get phases
      const phases = getProjectPhases(displayProject);
      const eiuPartner = getEIUPartner(displayProject);
      const physicalAccomplishment = displayProject.physicalProgressRequirements || 
                                     displayProject.generalDescription || 
                                     displayProject.physicalDescription || 
                                     'N/A';

      if (phases && phases.length > 0) {
        phases.forEach((phase, phaseIndex) => {
          col = 1;
          
          // Basic Project Information (only in first row)
          if (phaseIndex === 0) {
            const basicData = [
              displayProject.name || 'N/A',
              displayProject.status ? displayProject.status.charAt(0).toUpperCase() + displayProject.status.slice(1) : 'N/A',
              `${(parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)).toFixed(1)}%`,
              displayProject.projectCode || 'N/A',
              displayProject.implementingOfficeName || 'N/A',
              displayProject.category || 'N/A',
              displayProject.location || 'N/A',
              displayProject.priority || 'N/A',
              formatFundingSource(displayProject.fundingSource),
              formatDateForExport(displayProject.createdDate),
              displayProject.description || 'N/A',
              displayProject.expectedOutputs || 'N/A',
              displayProject.targetBeneficiaries || 'N/A'
            ];
            
            basicData.forEach((value, idx) => {
              const colLetter = getColumnLetter(col);
              const cell = worksheet.getCell(`${colLetter}${row}`);
              if (phaseIndex === 0) {
                cell.value = safeString(value, 'N/A');
                cell.alignment = { wrapText: true, vertical: 'top' };
                if (phases.length > 1) {
                  worksheet.mergeCells(`${colLetter}${row}:${colLetter}${row + phases.length - 1}`);
                  // Calculate height for merged cells based on content
                  const valueStr = safeString(value, 'N/A');
                  const estimatedLines = Math.min(Math.ceil(valueStr.length / 70), 10);
                  const mergedHeight = Math.max(25, estimatedLines * 15);
                  // Set height for all merged rows
                  for (let mergeRow = row; mergeRow < row + phases.length; mergeRow++) {
                    const mergeRowObj = worksheet.getRow(mergeRow);
                    if (!mergeRowObj.height || mergeRowObj.height < mergedHeight) {
                      mergeRowObj.height = mergedHeight;
                    }
                  }
                }
              }
              col++;
            });
          } else {
            col += 13; // Skip basic project info columns
          }

          // EIU Partner Contractor (only in first row) - Hidden for public users
          if (!isPublic && phaseIndex === 0) {
            const eiuData = [
              eiuPartner?.displayFullName || eiuPartner?.name || 'N/A',
              eiuPartner?.displayEmail || eiuPartner?.email || 'N/A',
              eiuPartner?.displayContact || eiuPartner?.contact || 'N/A',
              eiuPartner?.displayGroup || eiuPartner?.group || 'N/A',
              eiuPartner?.displayDepartment || eiuPartner?.department || 'N/A',
              eiuPartner?.displaySubrole || eiuPartner?.subrole || 'N/A',
              eiuPartner?.displayCompany || eiuPartner?.company || 'N/A'
            ];
            
            eiuData.forEach((value) => {
              const colLetter = getColumnLetter(col);
              const cell = worksheet.getCell(`${colLetter}${row}`);
              if (phaseIndex === 0) {
                cell.value = safeString(value, 'N/A');
                cell.alignment = { wrapText: true, vertical: 'top' };
                if (phases.length > 1) {
                  worksheet.mergeCells(`${colLetter}${row}:${colLetter}${row + phases.length - 1}`);
                  // Calculate height for merged cells
                  const valueStr = safeString(value, 'N/A');
                  const estimatedLines = Math.min(Math.ceil(valueStr.length / 70), 10);
                  const mergedHeight = Math.max(25, estimatedLines * 15);
                  for (let mergeRow = row; mergeRow < row + phases.length; mergeRow++) {
                    const mergeRowObj = worksheet.getRow(mergeRow);
                    if (!mergeRowObj.height || mergeRowObj.height < mergedHeight) {
                      mergeRowObj.height = mergedHeight;
                    }
                  }
                }
              }
              col++;
            });
          } else {
            col += 7; // Skip EIU columns
          }

          // Timeline Information (only in first row)
          if (phaseIndex === 0) {
            const timelineData = [
              formatDateForExport(displayProject.startDate),
              formatDateForExport(displayProject.targetCompletionDate),
              displayProject.expectedDaysOfCompletion || 'N/A',
              formatDateForExport(displayProject.completionDate)
            ];
            
            timelineData.forEach((value) => {
              const colLetter = getColumnLetter(col);
              const cell = worksheet.getCell(`${colLetter}${row}`);
              if (phaseIndex === 0) {
                cell.value = safeString(value, 'N/A');
                cell.alignment = { wrapText: true, vertical: 'top' };
                if (phases.length > 1) {
                  worksheet.mergeCells(`${colLetter}${row}:${colLetter}${row + phases.length - 1}`);
                  const valueStr = safeString(value, 'N/A');
                  const estimatedLines = Math.min(Math.ceil(valueStr.length / 70), 10);
                  const mergedHeight = Math.max(25, estimatedLines * 15);
                  for (let mergeRow = row; mergeRow < row + phases.length; mergeRow++) {
                    const mergeRowObj = worksheet.getRow(mergeRow);
                    if (!mergeRowObj.height || mergeRowObj.height < mergedHeight) {
                      mergeRowObj.height = mergedHeight;
                    }
                  }
                }
              }
              col++;
            });
          } else {
            col += 4; // Skip timeline columns
          }

          // Budget Information (only in first row)
          if (phaseIndex === 0) {
            const budgetData = [
              formatCurrencyForExport(displayProject.totalBudget),
              displayProject.budgetBreakdown || displayProject.budgetDescription || 'N/A'
            ];
            
            budgetData.forEach((value) => {
              const colLetter = getColumnLetter(col);
              const cell = worksheet.getCell(`${colLetter}${row}`);
              if (phaseIndex === 0) {
                cell.value = safeString(value, 'N/A');
                cell.alignment = { wrapText: true, vertical: 'top' };
                if (phases.length > 1) {
                  worksheet.mergeCells(`${colLetter}${row}:${colLetter}${row + phases.length - 1}`);
                  const valueStr = safeString(value, 'N/A');
                  const estimatedLines = Math.min(Math.ceil(valueStr.length / 70), 10);
                  const mergedHeight = Math.max(25, estimatedLines * 15);
                  for (let mergeRow = row; mergeRow < row + phases.length; mergeRow++) {
                    const mergeRowObj = worksheet.getRow(mergeRow);
                    if (!mergeRowObj.height || mergeRowObj.height < mergedHeight) {
                      mergeRowObj.height = mergedHeight;
                    }
                  }
                }
              }
              col++;
            });
          } else {
            col += 2; // Skip budget columns
          }

          // Physical Accomplishment Information (only in first row)
          if (phaseIndex === 0) {
            const colLetter = getColumnLetter(col);
            const cell = worksheet.getCell(`${colLetter}${row}`);
            cell.value = safeString(physicalAccomplishment, 'N/A');
            cell.alignment = { wrapText: true, vertical: 'top' };
            if (phases.length > 1) {
              worksheet.mergeCells(`${colLetter}${row}:${colLetter}${row + phases.length - 1}`);
              // Calculate height for physical accomplishment (can be very long)
              const valueStr = safeString(physicalAccomplishment, 'N/A');
              const estimatedLines = Math.min(Math.ceil(valueStr.length / 70), 15);
              const mergedHeight = Math.max(30, estimatedLines * 15);
              for (let mergeRow = row; mergeRow < row + phases.length; mergeRow++) {
                const mergeRowObj = worksheet.getRow(mergeRow);
                if (!mergeRowObj.height || mergeRowObj.height < mergedHeight) {
                  mergeRowObj.height = mergedHeight;
                }
              }
            } else {
              // Single phase - still calculate height
              const valueStr = safeString(physicalAccomplishment, 'N/A');
              const estimatedLines = Math.min(Math.ceil(valueStr.length / 70), 15);
              const rowObj = worksheet.getRow(row);
              rowObj.height = Math.max(30, estimatedLines * 15);
            }
            col++;
          } else {
            col += 1; // Skip physical accomplishment column
          }

          // Project Phases Update (each phase gets its own data)
          const phaseData = [
            phase.title || phase.name || 'N/A',
            phase.description || 'N/A',
            formatCurrencyForExport(phase.plannedBudget),
            phase.breakdownDescription || 'N/A',
            phase.budgetAllotedWeight || 'N/A',
            phase.physicalAccomplishmentWeight || 'N/A',
            formatDateForExport(phase.startDate),
            formatDateForExport(phase.targetCompletionDate),
            formatDateForExport(phase.submissionDate),
            formatDateForExport(phase.actualPhaseCompletionDate),
            phase.timelineActivities || 'N/A',
            formatCurrencyForExport(phase.usedBudget),
            formatCurrencyForExport(phase.remainingBudget),
            phase.budgetBreakdownAllocation || 'N/A',
            phase.physicalAccomplishmentGainedWeight || 'N/A',
            phase.budgetUtilizationGainedWeight || 'N/A',
            Array.isArray(phase.photoProof) ? `${phase.photoProof.length} photo(s)` : (phase.photoProof || 'N/A'),
            Array.isArray(phase.videoProof) ? `${phase.videoProof.length} video(s)` : (phase.videoProof || 'N/A'),
            Array.isArray(phase.documentProof) ? `${phase.documentProof.length} document(s)` : (phase.documentProof || 'N/A'),
            phase.physicalProgressDescription || 'N/A',
            phase.submittedBy || 'N/A',
            phase.remarksAndRecommendation || 'N/A'
          ];

          phaseData.forEach((value) => {
            const colLetter = getColumnLetter(col);
            const cell = worksheet.getCell(`${colLetter}${row}`);
            cell.value = safeString(value, 'N/A');
            cell.alignment = { wrapText: true, vertical: 'top' };
            col++;
          });

          // Apply borders to all cells in this row and calculate max content length
          // Long description columns across all sections:
          // Column 11 = Project Description (Basic Project Information)
          // Column 26 = Budget Description (Budget Information)
          // Column 27 = General Description (Physical Accomplishment Information)
          // Column 29 = Description (Project Phases Update)
          // Column 31 = Breakdown Description (Project Phases Update)
          // Column 38 = Timeline Activities & Deliverables (Project Phases Update)
          // Column 41 = Budget Breakdown & Allocation (Project Phases Update)
          // Column 46 = Physical Progress Description (Project Phases Update)
          // Column 48 = Remarks and Recommendation (Project Phases Update)
          
          // Column widths array (for accurate line calculation)
          const columnWidths = [
            25, 12, 15, 15, 20, 15, 18, 12, 18, 15, 40, 25, 20, // Basic Project Info (13) - Project Description: 40
            20, 20, 15, 12, 20, 15, 20, // EIU Partner (7)
            15, 15, 12, 15, // Timeline (4)
            18, 35, // Budget (2) - Budget Description: 35
            40, // Physical Accomplishment (1) - General Description: 40
            20, 35, 15, 30, 15, 18, 15, 15, 15, 35, 30, 15, 15, 35, 18, 15, 15, 15, 30, 15, 40 // Project Phases (19)
            // Description: 35, Breakdown Description: 30, Timeline Activities: 35, Budget Breakdown: 30,
            // Physical Progress Description: 30, Remarks: 40
          ];
          
          let maxContentLength = 0;
          let maxLongDescriptionLength = 0;
          
          for (let c = 1; c <= headerCols; c++) {
            const colLetter = getColumnLetter(c);
            const cell = worksheet.getCell(`${colLetter}${row}`);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            
            // Track longest content for row height calculation
            if (cell.value) {
              const valueStr = safeString(cell.value, '');
              
              // Get column width for accurate line calculation
              const colWidth = columnWidths[c - 1] || 15;
              // Excel character width: approximately 7 pixels per character, column width is in character units
              // Account for padding and borders (subtract ~2 characters)
              const effectiveWidth = Math.max(1, colWidth - 2);
              // Estimate lines: characters per line = effective width * 1.2 (to account for wrapping)
              const charsPerLine = Math.max(10, effectiveWidth * 1.2);
              const estimatedLines = Math.ceil(valueStr.length / charsPerLine);
              
              // Check if this is a long description column
              // These are columns: 11 (Project Description), 26 (Budget Description), 27 (General Description),
              // 29 (Description), 31 (Breakdown Description), 38 (Timeline Activities),
              // 41 (Budget Breakdown & Allocation), 46 (Physical Progress Description), 48 (Remarks)
              const isLongDescriptionCol = [11, 26, 27, 29, 31, 38, 41, 46, 48].includes(c);
              
              if (isLongDescriptionCol) {
                // For long description fields, allow up to 25 lines (more generous)
                const longDescLines = Math.min(estimatedLines, 25);
                maxLongDescriptionLength = Math.max(maxLongDescriptionLength, longDescLines);
              } else {
                maxContentLength = Math.max(maxContentLength, estimatedLines);
              }
            }
          }

          // Set dynamic row height based on content
          // Prioritize long description fields (can be up to 25 lines = 375px)
          const maxLines = Math.max(maxContentLength, maxLongDescriptionLength);
          const rowObj = worksheet.getRow(row);
          // Use 16px per line for better spacing, max 400px for very long descriptions
          rowObj.height = Math.max(35, Math.min(maxLines * 16, 400));
          
          row++;
        });
      } else {
        // No phases - still show project info in one row
        col = 1;
        const allData = [
          // Basic Project Information
          displayProject.name || 'N/A',
          displayProject.status ? displayProject.status.charAt(0).toUpperCase() + displayProject.status.slice(1) : 'N/A',
          `${(parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)).toFixed(1)}%`,
          displayProject.projectCode || 'N/A',
          displayProject.implementingOfficeName || 'N/A',
          displayProject.category || 'N/A',
          displayProject.location || 'N/A',
          displayProject.priority || 'N/A',
          formatFundingSource(displayProject.fundingSource),
          formatDateForExport(displayProject.createdDate),
          displayProject.description || 'N/A',
          displayProject.expectedOutputs || 'N/A',
          displayProject.targetBeneficiaries || 'N/A',
          // EIU Partner Contractor - Hidden for public users
          ...(!isPublic ? [
            eiuPartner?.displayFullName || eiuPartner?.name || 'N/A',
            eiuPartner?.displayEmail || eiuPartner?.email || 'N/A',
            eiuPartner?.displayContact || eiuPartner?.contact || 'N/A',
            eiuPartner?.displayGroup || eiuPartner?.group || 'N/A',
            eiuPartner?.displayDepartment || eiuPartner?.department || 'N/A',
            eiuPartner?.displaySubrole || eiuPartner?.subrole || 'N/A',
            eiuPartner?.displayCompany || eiuPartner?.company || 'N/A'
          ] : []),
          // Timeline Information
          formatDateForExport(displayProject.startDate),
          formatDateForExport(displayProject.targetCompletionDate),
          displayProject.expectedDaysOfCompletion || 'N/A',
          formatDateForExport(displayProject.completionDate),
          // Budget Information
          formatCurrencyForExport(displayProject.totalBudget),
          displayProject.budgetBreakdown || displayProject.budgetDescription || 'N/A',
          // Physical Accomplishment Information
          physicalAccomplishment,
          // Project Phases Update (empty)
          ...Array(19).fill('N/A')
        ];

        let maxContentLength = 0;
        allData.forEach((value) => {
          const colLetter = getColumnLetter(col);
          const cell = worksheet.getCell(`${colLetter}${row}`);
          cell.value = safeString(value, 'N/A');
          cell.alignment = { wrapText: true, vertical: 'top' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Track longest content for row height calculation
          const valueStr = safeString(value, 'N/A');
          const estimatedLines = Math.ceil(valueStr.length / 70);
          maxContentLength = Math.max(maxContentLength, estimatedLines);
          
          col++;
        });
        
        // Set dynamic row height based on content
        const rowObj = worksheet.getRow(row);
        rowObj.height = Math.max(25, Math.min(maxContentLength * 15, 150));
        
        row++;
      }

      // Set column widths
      const columnWidths = [
        25, 12, 15, 15, 20, 15, 18, 12, 18, 15, 40, 25, 20, // Basic Project Info (13) - Project Description increased to 40
        20, 20, 15, 12, 20, 15, 20, // EIU Partner (7)
        15, 15, 12, 15, // Timeline (4)
        18, 35, // Budget (2) - Budget Description increased to 35
        40, // Physical Accomplishment (1) - General Description increased to 40
        20, 35, 15, 30, 15, 18, 15, 15, 15, 35, 30, 15, 15, 35, 18, 15, 15, 15, 30, 15, 40 // Phases (19)
        // Description: 35, Breakdown Description: 30, Timeline Activities: 35, Budget Breakdown: 30,
        // Physical Progress Description: 30, Remarks: 40
      ];

      columnWidths.forEach((width, index) => {
        const colLetter = getColumnLetter(index + 1);
        worksheet.getColumn(colLetter).width = width;
      });

      const fileName = `Project-Ledger-${displayProject.projectCode || displayProject.id}-${now.toISOString().split('T')[0]}-Horizontal.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setLoading(false);
    } catch (error) {
      console.error('Error exporting to Excel (Horizontal):', error);
      alert('Failed to export Excel. Please try again.');
      setLoading(false);
    }
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };
  if (projects.length !== filteredProjects.length) {
    console.log(`🔐 Filtered ${projects.length} projects down to ${filteredProjects.length} based on user access (${currentUserRole})`);
  } else {
    console.log(`✅ All ${projects.length} projects are accessible for user (${currentUserRole})`);
  }

  // Format funding source - maps "donor_fund" to "Municipal Development Fund"
  const formatFundingSource = (source) => {
    if (!source) return 'N/A';
    
    // Handle special case for Municipal Development Fund
    if (source === 'donor_fund') {
      return 'Municipal Development Fund';
    }
    
    // Convert underscore to space and capitalize each word
    const formatted = source.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return formatted;
  };

  // Get EIU Partner data - matches ProjectDetailsModal.astro logic
  const getEIUPartner = (project) => {
    // Debug logging
    console.log('🔍 ProjectLedgerCenter - EIU Data Extraction Debugging:');
    console.log('  - project.eiuPersonnel:', project.eiuPersonnel);
    console.log('  - project.assignedEIU:', project.assignedEIU);
    console.log('  - project.User:', project.User);
    console.log('  - project.eiu:', project.eiu);
    console.log('  - project.eiuPartner:', project.eiuPartner);
    console.log('  - project._debug?.eiuPersonnel:', project._debug?.eiuPersonnel);
    console.log('  - All project keys:', Object.keys(project));
    
    // Try multiple sources for EIU data - including _debug object from ProgressCalculationService
    let eiuData = project.eiuPersonnel || project.assignedEIU || project.User || project.eiu || project.eiuPartner;
    console.log('🎯 Initial eiuData result:', eiuData);
    
    // If no direct EIU data, check if it's in the _debug object
    if (!eiuData && project._debug && project._debug.eiuPersonnel) {
      eiuData = project._debug.eiuPersonnel;
      console.log('👤 Using EIU data from _debug object:', eiuData);
    }
    
    // Special handling for submissions module - ensure we have complete data
    if (eiuData && (!eiuData.contactNumber || !eiuData.department)) {
      console.log('👤 EIU data appears incomplete, checking for additional fields...');
      
      // Try to get more complete data from the enriched object
      if (project.eiuPersonnel) {
        eiuData = {
          ...eiuData,
          ...project.eiuPersonnel,
          // Ensure all fields are properly mapped - check all possible field names
          contactNumber: project.eiuPersonnel.contactNumber || project.eiuPersonnel.phoneNumber || project.eiuPersonnel.phone || 
                         project.eiuPersonnel.contact || project.eiuPersonnel.contact_number || project.eiuPersonnel.phone_number ||
                         eiuData.contactNumber || eiuData.phoneNumber || eiuData.phone || eiuData.contact,
          department: project.eiuPersonnel.department || project.eiuPersonnel.externalCompanyName || project.eiuPersonnel.departmentName || 
                      eiuData.department || eiuData.departmentName || 'External Partner Company',
          externalCompanyName: project.eiuPersonnel.externalCompanyName || project.eiuPersonnel.department || project.eiuPersonnel.company || 
                               project.eiuPersonnel.companyName || eiuData.externalCompanyName || eiuData.company || eiuData.companyName,
          profilePicture: project.eiuPersonnel.profilePicture || eiuData.profilePicture
        };
        console.log('👤 Enhanced EIU data:', eiuData);
        console.log('📞 All contact-related fields in enhanced data:', {
          contactNumber: eiuData.contactNumber,
          phoneNumber: eiuData.phoneNumber,
          phone: eiuData.phone,
          contact: eiuData.contact,
          contact_number: eiuData.contact_number,
          phone_number: eiuData.phone_number
        });
      }
    }
    
    if (!eiuData) {
      console.log('⚠️ No EIU data found');
      return null;
    }
    
    console.log('👤 Final EIU Data:', eiuData);
    console.log('👤 EIU Data keys:', Object.keys(eiuData));
    
    // Extract fields with multiple fallback options (matching ProjectDetailsModal.astro)
    const fullName = eiuData.name || eiuData.fullName || `${eiuData.firstName || ''} ${eiuData.lastName || ''}`.trim();
    const email = eiuData.email || eiuData.username;
    
    // Try multiple sources for contact number - also check milestone submissions' submitter data (like MilestoneSubmissionModal)
    let contact = eiuData.contactNumber || eiuData.phoneNumber || eiuData.contact || eiuData.contact_number || eiuData.phone_number || 
                  project.contactNumber || project.phoneNumber || project.contact;
    
    // If contact number is still not found, check milestone submissions' submitter data
    if ((!contact || contact === 'N/A' || contact === null) && project.milestones) {
      console.log('📞 Contact number not found in EIU data, checking milestone submissions...');
      
      // Check all milestone submissions for submitter contact number
      for (const milestone of project.milestones) {
        // Check approved submission first
        if (milestone.approvedSubmission) {
          const submitterContact = milestone.approvedSubmission.submitter?.contactNumber || 
                                   milestone.approvedSubmission.submitterInfo?.contactNumber;
          if (submitterContact) {
            contact = submitterContact;
            console.log('📞 Found contact number from approved submission:', contact);
            break;
          }
        }
        
        // Check all submissions for this milestone
        if (milestone.submissions && Array.isArray(milestone.submissions)) {
          for (const submission of milestone.submissions) {
            const submitterContact = submission.submitter?.contactNumber || 
                                     submission.submitterInfo?.contactNumber;
            if (submitterContact) {
              contact = submitterContact;
              console.log('📞 Found contact number from milestone submission:', contact);
              break;
            }
          }
          if (contact && contact !== 'N/A' && contact !== null) break;
        }
      }
    }
    
    const group = eiuData.group || eiuData.groupName || 'EIU';
    const department = eiuData.department || eiuData.departmentName;
    const subrole = eiuData.subRole || eiuData.subrole || eiuData.role;
    // Company Name should be the EIU's full name (name field), not the company field
    const company = fullName; // Use full name as company name
    
    // Handle cases where fields might be empty strings or null
    const displayFullName = fullName && fullName !== '' && fullName !== 'null' ? fullName : 'N/A';
    const displayEmail = email && email !== '' && email !== 'null' ? email : 'N/A';
    const displayContact = contact && contact !== '' && contact !== 'null' ? contact : 'N/A';
    const displayGroup = group && group !== '' && group !== 'null' ? group : 'EIU';
    const displayDepartment = department && department !== '' && department !== 'null' ? department : 'N/A';
    const displaySubrole = subrole && subrole !== '' && subrole !== 'null' ? subrole : 'N/A';
    const displayCompany = company && company !== '' && company !== 'null' ? company : 'N/A';
    
    console.log('👤 Extracted EIU values:', {
      displayFullName,
      displayEmail,
      displayContact,
      displayGroup,
      displayDepartment,
      displaySubrole,
      displayCompany
    });
    
    console.log('📞 Contact Number Debug:', {
      'eiuData.contactNumber': eiuData.contactNumber,
      'eiuData.phoneNumber': eiuData.phoneNumber,
      'eiuData.contact': eiuData.contact,
      'project.contactNumber': project.contactNumber,
      'project.phoneNumber': project.phoneNumber,
      'project.contact': project.contact,
      'final contact': displayContact
    });
    
    return {
      name: displayFullName,
      email: displayEmail,
      contact: displayContact,
      group: displayGroup,
      department: displayDepartment,
      subrole: displaySubrole,
      company: displayCompany, // This is now the EIU's full name
      // Also include display* properties for backward compatibility
      displayFullName: displayFullName,
      displayEmail: displayEmail,
      displayContact: displayContact,
      displayGroup: displayGroup,
      displayDepartment: displayDepartment,
      displaySubrole: displaySubrole,
      displayCompany: displayCompany
    };
  };

  const getProjectPhases = (project) => {
    if (!project.milestones || project.milestones.length === 0) {
      console.log('⚠️ No milestones found in project');
      return [];
    }

    console.log('📋 Processing phases for project:', project.id);
    console.log('📋 Number of milestones:', project.milestones.length);
    console.log('📋 Milestones:', project.milestones);
    console.log('📋 First milestone keys:', project.milestones[0] ? Object.keys(project.milestones[0]) : 'No milestones');

    // Calculate total project budget (sum of all planned budgets or use project.totalBudget)
    const totalProjectBudget = parseFloat(project.totalBudget || 0) || 
      project.milestones.reduce((sum, m) => {
        const mb = parseFloat(m.plannedBudget || m.budgetPlanned || 0);
        return sum + mb;
      }, 0);
    
    // Calculate even weight per phase (100% / number of phases)
    const phaseCount = project.milestones.length;
    const evenWeightPerPhase = phaseCount > 0 ? 100 / phaseCount : 0;

    return project.milestones.map((milestone, index) => {
      console.log(`\n🔍 Processing milestone ${index + 1}:`, milestone.title);
      console.log('  - Milestone ID:', milestone.id);
      console.log('  - Milestone keys:', Object.keys(milestone));
      console.log('  - milestone.submissions:', milestone.submissions);
      console.log('  - milestone.approvedSubmission:', milestone.approvedSubmission);
      
      // Get approved submission for this milestone
      const approvedSubmission = milestone.approvedSubmission || 
                                 milestone.submissions?.find(s => 
                                   s.status === 'approved' || s.status === 'iu_approved'
                                 );
      
      console.log('  - Approved submission found:', !!approvedSubmission);
      if (approvedSubmission) {
        console.log('  - Approved submission keys:', Object.keys(approvedSubmission));
        console.log('  - Approved submission data:', {
          timelineActivitiesDeliverables: approvedSubmission.timelineActivitiesDeliverables,
          usedBudget: approvedSubmission.usedBudget,
          remainingBudget: approvedSubmission.remainingBudget,
          budgetBreakdownAllocation: approvedSubmission.budgetBreakdownAllocation,
          physicalProgressDescription: approvedSubmission.physicalProgressDescription,
          submittedAt: approvedSubmission.submittedAt,
          submissionDate: approvedSubmission.submissionDate,
          reviewedAt: approvedSubmission.reviewedAt,
          photoEvidence: approvedSubmission.photoEvidence,
          videoEvidence: approvedSubmission.videoEvidence,
          documentFiles: approvedSubmission.documentFiles,
          submitter: approvedSubmission.submitter,
          submitterInfo: approvedSubmission.submitterInfo,
          remarks: approvedSubmission.remarks,
          remarksAndRecommendation: approvedSubmission.remarksAndRecommendation,
          reviewNotes: approvedSubmission.reviewNotes
        });
      } else {
        console.log('  ⚠️ No approved submission found for this milestone');
        console.log('  - All submissions:', milestone.submissions);
      }
      
      // Parse timeline activities if it's a JSON string
      let timelineActivities = 'N/A';
      if (approvedSubmission?.timelineActivitiesDeliverables) {
        try {
          const parsed = typeof approvedSubmission.timelineActivitiesDeliverables === 'string' 
            ? JSON.parse(approvedSubmission.timelineActivitiesDeliverables)
            : approvedSubmission.timelineActivitiesDeliverables;
          
          if (Array.isArray(parsed)) {
            timelineActivities = parsed.map(activity => {
              if (typeof activity === 'string') return activity;
              if (typeof activity === 'object') {
                return activity.description || activity.name || activity.date || JSON.stringify(activity);
              }
              return String(activity);
            }).join('; ');
          } else if (typeof parsed === 'string') {
            timelineActivities = parsed;
          } else if (parsed) {
            timelineActivities = String(parsed);
          }
        } catch (e) {
          console.log('  ⚠️ Error parsing timelineActivitiesDeliverables:', e);
          timelineActivities = approvedSubmission.timelineActivitiesDeliverables || 'N/A';
        }
      }
      
      // Get submitter name - check multiple sources
      const submitterName = approvedSubmission?.submitter?.name || 
                           approvedSubmission?.submitter?.fullName ||
                           approvedSubmission?.submitterInfo?.name ||
                           approvedSubmission?.submitterInfo?.fullName ||
                           (approvedSubmission?.submitterInfo && typeof approvedSubmission.submitterInfo === 'object' 
                             ? (approvedSubmission.submitterInfo.name || approvedSubmission.submitterInfo.fullName)
                             : null) ||
                           'N/A';
      
      // Get photo/video/document proof arrays (store actual files, not just counts)
      const photoEvidence = Array.isArray(approvedSubmission?.photoEvidence) 
        ? approvedSubmission.photoEvidence 
        : (approvedSubmission?.photoEvidence && approvedSubmission.photoEvidence !== null && approvedSubmission.photoEvidence !== 'null' 
          ? [approvedSubmission.photoEvidence] 
          : []);
      const videoEvidence = Array.isArray(approvedSubmission?.videoEvidence) 
        ? approvedSubmission.videoEvidence 
        : (approvedSubmission?.videoEvidence && approvedSubmission.videoEvidence !== null && approvedSubmission.videoEvidence !== 'null' 
          ? [approvedSubmission.videoEvidence] 
          : []);
      const documentFiles = Array.isArray(approvedSubmission?.documentFiles) 
        ? approvedSubmission.documentFiles 
        : (approvedSubmission?.documentFiles && approvedSubmission.documentFiles !== null && approvedSubmission.documentFiles !== 'null' 
          ? [approvedSubmission.documentFiles] 
          : []);
      
      // Get planned budget from milestone or submission (prioritize milestone)
      const milestonePlannedBudget = milestone.plannedBudget || milestone.budgetPlanned || 0;
      const submissionPlannedBudget = approvedSubmission?.plannedBudget || 0;
      const plannedBudget = parseFloat(milestonePlannedBudget || submissionPlannedBudget || 0);
      
      console.log('  💰 Budget Debug:', {
        'milestone.plannedBudget': milestone.plannedBudget,
        'milestone.budgetPlanned': milestone.budgetPlanned,
        'approvedSubmission?.plannedBudget': approvedSubmission?.plannedBudget,
        'final plannedBudget': plannedBudget,
        'totalProjectBudget': totalProjectBudget
      });
      
      // Get used budget from submission
      const usedBudget = parseFloat(approvedSubmission?.usedBudget || 0);
      
      // Get remaining budget from submission or calculate
      const remainingBudget = approvedSubmission?.remainingBudget !== undefined && approvedSubmission?.remainingBudget !== null
        ? parseFloat(approvedSubmission.remainingBudget)
        : (plannedBudget - usedBudget);
      
      // Calculate Budget Allotted Weight: (plannedBudget / totalProjectBudget) * 100
      const budgetAllotedWeight = totalProjectBudget > 0 
        ? parseFloat(((plannedBudget / totalProjectBudget) * 100).toFixed(2))
        : 0;
      
      // Physical Accomplishment Weight: 100% / number of phases (even weight distribution)
      const physicalAccomplishmentWeight = parseFloat(evenWeightPerPhase.toFixed(2));
      
      // Calculate Physical Accomplishment Gained Weight: "X%/Y%" format
      // X = evenWeightPerPhase if approved with physical input, 0 otherwise
      // Y = evenWeightPerPhase
      const hasPhysicalInput = milestone.physicalDescription && milestone.physicalDescription.trim() !== '' ||
                               milestone.physicalStatus === 'approved' ||
                               (approvedSubmission && approvedSubmission.physicalProgressDescription && 
                                approvedSubmission.physicalProgressDescription.trim() !== '');
      const isApproved = approvedSubmission !== null && approvedSubmission !== undefined ||
                        milestone.status === 'approved' ||
                        milestone.status === 'completed' ||
                        milestone.physicalStatus === 'approved';
      const physicalAccomplishmentGained = (isApproved && hasPhysicalInput) ? evenWeightPerPhase : 0;
      const physicalAccomplishmentGainedWeight = `${physicalAccomplishmentGained.toFixed(2)}%/${evenWeightPerPhase.toFixed(2)}%`;
      
      // Calculate Budget Utilization Gained Weight: "X%/Y%" format
      // X = (usedBudget / plannedBudget) * budgetAllotedWeight
      // Y = budgetAllotedWeight (each phase has its own budget allotted weight)
      const budgetUtilizationPercent = plannedBudget > 0 ? (usedBudget / plannedBudget) * 100 : 0;
      const budgetUtilizationGained = budgetUtilizationPercent * (budgetAllotedWeight / 100);
      const budgetUtilizationGainedWeight = `${budgetUtilizationGained.toFixed(2)}%/${budgetAllotedWeight.toFixed(2)}%`;
      
      // Get description from milestone (should always be in milestone)
      const description = milestone.description || milestone.title || 'N/A';
      
      // Get breakdown description - prioritize milestone, fallback to submission
      const breakdownDescription = milestone.budgetBreakdown || 
                                   milestone.budgetBreakdownDescription || 
                                   approvedSubmission?.budgetBreakdownAllocation || 
                                   'N/A';
      
      // Get start date - prioritize submission (actual dates used), fallback to milestone
      const startDate = approvedSubmission?.timelineStartDate || 
                       milestone.timelineStartDate || 
                       milestone.startDate || 
                       null;
      
      // Get target completion date - prioritize submission (actual dates used), fallback to milestone
      const targetCompletionDate = approvedSubmission?.timelineEndDate || 
                                  milestone.timelineEndDate || 
                                  milestone.dueDate || 
                                  milestone.targetDate || 
                                  null;
      
      const phaseData = {
        ...milestone,
        // Phase Information - from milestone (with fallbacks)
        description: description,
        plannedBudget: plannedBudget,
        breakdownDescription: breakdownDescription,
        budgetAllotedWeight: budgetAllotedWeight,
        physicalAccomplishmentWeight: physicalAccomplishmentWeight,
        startDate: startDate,
        targetCompletionDate: targetCompletionDate,
        
        // CONTRACTOR UPDATE (from approved submission)
        submissionDate: approvedSubmission?.submittedAt || approvedSubmission?.submissionDate || null,
        actualPhaseCompletionDate: approvedSubmission?.reviewedAt || approvedSubmission?.actualCompletionDate || null,
        timelineActivities: timelineActivities,
        usedBudget: usedBudget,
        remainingBudget: remainingBudget,
        budgetBreakdownAllocation: approvedSubmission?.budgetBreakdownAllocation || 'N/A',
        physicalAccomplishmentGainedWeight: physicalAccomplishmentGainedWeight,
        budgetUtilizationGainedWeight: budgetUtilizationGainedWeight,
        photoProof: photoEvidence,
        videoProof: videoEvidence,
        documentProof: documentFiles,
        physicalProgressDescription: approvedSubmission?.physicalProgressDescription || 'N/A',
        submittedBy: submitterName,
        remarksAndRecommendation: (() => {
          // Get remarks text
          const remarksText = approvedSubmission?.remarks || 
                             approvedSubmission?.remarksAndRecommendation || 
                             approvedSubmission?.reviewNotes || 
                             '';
          
          // Get approver name
          const approverName = approvedSubmission?.approverFullName || 
                               approvedSubmission?.approverName || 
                               approvedSubmission?.reviewer?.name || 
                               null;
          
          // Get review date
          const reviewDate = approvedSubmission?.reviewedAt || 
                            approvedSubmission?.updatedAt || 
                            null;
          
          // Build the formatted string
          if (!remarksText && !approverName) {
            return 'N/A';
          }
          
          let result = remarksText || '';
          
          // Add approver information if available (matching MilestoneSubmissionModal format)
          // Add proper spacing for better readability
          if (approverName || reviewDate) {
            if (result) {
              // Add extra spacing between remarks text and "Reviewed by:" section
              result += '\n\n\n';
            }
            result += 'Reviewed by:';
            if (approverName) {
              result += `\n${approverName}`;
            }
            if (reviewDate) {
              const formattedDate = formatDateTime(reviewDate);
              if (formattedDate) {
                if (approverName) {
                  result += '\n•';
                }
                // Add line break before date for better spacing
                result += `\n\n${formattedDate}`;
              }
            }
          }
          
          return result || 'N/A';
        })()
      };
      
      console.log(`  ✅ Phase data for "${milestone.title}":`, {
        description: phaseData.description,
        plannedBudget: phaseData.plannedBudget,
        breakdownDescription: phaseData.breakdownDescription,
        startDate: phaseData.startDate,
        targetCompletionDate: phaseData.targetCompletionDate,
        submissionDate: phaseData.submissionDate,
        actualPhaseCompletionDate: phaseData.actualPhaseCompletionDate,
        timelineActivities: phaseData.timelineActivities,
        usedBudget: phaseData.usedBudget,
        remainingBudget: phaseData.remainingBudget,
        budgetBreakdownAllocation: phaseData.budgetBreakdownAllocation,
        physicalProgressDescription: phaseData.physicalProgressDescription,
        submittedBy: phaseData.submittedBy,
        remarksAndRecommendation: phaseData.remarksAndRecommendation
      });
      
      return phaseData;
    });
  };

  const calculateExpectedDays = (startDate, targetDate) => {
    if (!startDate || !targetDate) return 'N/A';
    try {
      const start = new Date(startDate);
      const target = new Date(targetDate);
      const diffTime = Math.abs(target - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days`;
    } catch (e) {
      return 'N/A';
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project ledger...</p>
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchProjects}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayProject = selectedProject || (filteredProjects.length === 1 ? filteredProjects[0] : null);
  const phases = displayProject ? getProjectPhases(displayProject) : [];
  const eiuPartner = displayProject ? getEIUPartner(displayProject) : null;
  const isPublic = !getToken() || userRole === 'public';

  // Debugging function - accessible from browser console
  // Usage: window.debugProjectLedger()
  if (typeof window !== 'undefined') {
    window.debugProjectLedger = () => {
      console.log('🔍 ========== PROJECT LEDGER DEBUG INFO ==========');
      console.log('📊 Display Project:', displayProject);
      console.log('📊 Project Keys:', displayProject ? Object.keys(displayProject) : 'No project');
      
      // Funding Source Debug
      console.log('\n💰 FUNDING SOURCE DEBUG:');
      console.log('  - Raw fundingSource:', displayProject?.fundingSource);
      console.log('  - Formatted:', formatFundingSource(displayProject?.fundingSource));
      
      // EIU Partner Debug
      console.log('\n👤 EIU PARTNER DEBUG:');
      console.log('  - EIU Partner Object:', eiuPartner);
      if (displayProject) {
        console.log('  - project.eiuPersonnelId:', displayProject.eiuPersonnelId);
        console.log('  - project.eiuPersonnel:', displayProject.eiuPersonnel);
        console.log('  - project.eiuPersonnel?.contactNumber:', displayProject.eiuPersonnel?.contactNumber);
        console.log('  - project.eiuPersonnel?.phoneNumber:', displayProject.eiuPersonnel?.phoneNumber);
        console.log('  - project.eiuPersonnel?.phone:', displayProject.eiuPersonnel?.phone);
        console.log('  - project.assignedEIU:', displayProject.assignedEIU);
        console.log('  - project.User:', displayProject.User);
        console.log('  - project.eiu:', displayProject.eiu);
        console.log('  - project.eiuPartner:', displayProject.eiuPartner);
        console.log('  - project._debug?.eiuPersonnel:', displayProject._debug?.eiuPersonnel);
        console.log('  - project.contactNumber:', displayProject.contactNumber);
        console.log('  - project.phoneNumber:', displayProject.phoneNumber);
        console.log('  - project.contact:', displayProject.contact);
        console.log('  - All project keys with "contact" or "phone":', Object.keys(displayProject).filter(k => k.toLowerCase().includes('contact') || k.toLowerCase().includes('phone')));
        console.log('  - All eiuPersonnel keys:', displayProject.eiuPersonnel ? Object.keys(displayProject.eiuPersonnel) : 'N/A');
      }
      
      // Physical Accomplishment Debug
      console.log('\n🏗️ PHYSICAL ACCOMPLISHMENT DEBUG:');
      console.log('  - physicalProgressRequirements:', displayProject?.physicalProgressRequirements);
      console.log('  - generalDescription:', displayProject?.generalDescription);
      console.log('  - physicalDescription:', displayProject?.physicalDescription);
      console.log('  - requiredDocumentation:', displayProject?.requiredDocumentation);
      console.log('  - physicalProgressDescription:', displayProject?.physicalProgressDescription);
      console.log('  - Final value:', displayProject?.physicalProgressRequirements || displayProject?.generalDescription || displayProject?.physicalDescription || displayProject?.requiredDocumentation || 'N/A');
      
      // Phases Debug
      console.log('\n📋 PHASES DEBUG:');
      console.log('  - Number of phases:', phases.length);
      console.log('  - Phases:', phases);
      
      if (displayProject && displayProject.milestones) {
        console.log('\n📋 MILESTONES DEBUG:');
        console.log('  - Number of milestones:', displayProject.milestones.length);
        displayProject.milestones.forEach((milestone, idx) => {
          console.log(`\n  Milestone ${idx + 1}: "${milestone.title}"`);
          console.log('    - ID:', milestone.id);
          console.log('    - Description:', milestone.description);
          console.log('    - Planned Budget:', milestone.plannedBudget || milestone.budgetPlanned);
          console.log('    - Budget Breakdown:', milestone.budgetBreakdown);
          console.log('    - Timeline Start Date:', milestone.timelineStartDate || milestone.startDate);
          console.log('    - Timeline End Date:', milestone.timelineEndDate || milestone.dueDate);
          console.log('    - Submissions:', milestone.submissions);
          console.log('    - Approved Submission:', milestone.approvedSubmission);
          
          if (milestone.approvedSubmission) {
            const sub = milestone.approvedSubmission;
            console.log('    - Approved Submission Data:');
            console.log('      * timelineActivitiesDeliverables:', sub.timelineActivitiesDeliverables);
            console.log('      * usedBudget:', sub.usedBudget);
            console.log('      * remainingBudget:', sub.remainingBudget);
            console.log('      * budgetBreakdownAllocation:', sub.budgetBreakdownAllocation);
            console.log('      * physicalProgressDescription:', sub.physicalProgressDescription);
            console.log('      * submittedAt:', sub.submittedAt);
            console.log('      * submissionDate:', sub.submissionDate);
            console.log('      * reviewedAt:', sub.reviewedAt);
            console.log('      * photoEvidence:', sub.photoEvidence);
            console.log('      * videoEvidence:', sub.videoEvidence);
            console.log('      * documentFiles:', sub.documentFiles);
            console.log('      * submitter:', sub.submitter);
            console.log('      * submitterInfo:', sub.submitterInfo);
            console.log('      * remarks:', sub.remarks);
            console.log('      * remarksAndRecommendation:', sub.remarksAndRecommendation);
            console.log('      * reviewNotes:', sub.reviewNotes);
          } else {
            console.log('    ⚠️ No approved submission found');
            if (milestone.submissions && milestone.submissions.length > 0) {
              console.log('    - Available submissions:', milestone.submissions.map(s => ({
                id: s.id,
                status: s.status,
                milestoneId: s.milestoneId
              })));
            } else {
              console.log('    - No submissions found for this milestone');
            }
          }
        });
      }
      
      if (phases && phases.length > 0) {
        console.log('\n📋 PROCESSED PHASES DEBUG:');
        phases.forEach((phase, idx) => {
          console.log(`\n  Phase ${idx + 1}: "${phase.title || phase.name}"`);
          console.log('    - Description:', phase.description);
          console.log('    - Planned Budget:', phase.plannedBudget);
          console.log('    - Breakdown Description:', phase.breakdownDescription);
          console.log('    - Start Date:', phase.startDate);
          console.log('    - Target Completion Date:', phase.targetCompletionDate);
          console.log('    - Submission Date:', phase.submissionDate);
          console.log('    - Actual Phase Completion Date:', phase.actualPhaseCompletionDate);
          console.log('    - Timeline Activities:', phase.timelineActivities);
          console.log('    - Used Budget:', phase.usedBudget);
          console.log('    - Remaining Budget:', phase.remainingBudget);
          console.log('    - Budget Breakdown & Allocation:', phase.budgetBreakdownAllocation);
          console.log('    - Physical Progress Description:', phase.physicalProgressDescription);
          console.log('    - Submitted By:', phase.submittedBy);
          console.log('    - Remarks and Recommendation:', phase.remarksAndRecommendation);
          console.log('    - Photo Proof:', phase.photoProof);
          console.log('    - Video Proof:', phase.videoProof);
          console.log('    - Document Proof:', phase.documentProof);
        });
      }
      
      console.log('\n✅ ========== END DEBUG INFO ==========');
      return {
        displayProject,
        eiuPartner,
        phases,
        milestones: displayProject?.milestones || [],
        fundingSource: {
          raw: displayProject?.fundingSource,
          formatted: formatFundingSource(displayProject?.fundingSource)
        },
        physicalAccomplishment: {
          physicalProgressRequirements: displayProject?.physicalProgressRequirements,
          generalDescription: displayProject?.generalDescription,
          physicalDescription: displayProject?.physicalDescription,
          requiredDocumentation: displayProject?.requiredDocumentation,
          final: displayProject?.physicalProgressRequirements || displayProject?.generalDescription || displayProject?.physicalDescription || displayProject?.requiredDocumentation || 'N/A'
        },
        phaseDetails: phases.map((phase, idx) => ({
          index: idx + 1,
          title: phase.title || phase.name,
          description: phase.description,
          plannedBudget: phase.plannedBudget,
          breakdownDescription: phase.breakdownDescription,
          startDate: phase.startDate,
          targetCompletionDate: phase.targetCompletionDate,
          submissionDate: phase.submissionDate,
          actualPhaseCompletionDate: phase.actualPhaseCompletionDate,
          timelineActivities: phase.timelineActivities,
          usedBudget: phase.usedBudget,
          remainingBudget: phase.remainingBudget,
          budgetBreakdownAllocation: phase.budgetBreakdownAllocation,
          physicalProgressDescription: phase.physicalProgressDescription,
          submittedBy: phase.submittedBy,
          remarksAndRecommendation: phase.remarksAndRecommendation,
          photoProof: phase.photoProof,
          videoProof: phase.videoProof,
          documentProof: phase.documentProof
        }))
      };
    };
  }

  return (
    <div className="w-full">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-content table {
            border-collapse: collapse;
            width: 100%;
            font-size: 10px;
          }
          .print-content th,
          .print-content td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
          }
          .print-content th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          @page {
            margin: 1cm;
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
      {/* Page Header */}
      <div className={`bg-white border-b ${colors.border} px-8 py-6 mb-0 -mx-8 -mt-8 no-print`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br ${colors.gradientIcon} shadow-xl hover:scale-110 hover:rotate-3 relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className={`text-3xl font-bold bg-gradient-to-r ${colors.gradientText} bg-clip-text text-transparent`}>
                  Project Ledger
                </h1>
                <p className="text-sm text-gray-600">
                  Comprehensive project tracking and documentation system
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className={`text-xs ${colors.primaryText} font-semibold`}>{filteredProjects.length} Projects</p>
            </div>
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-8 py-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        {/* Search and Filter Section */}
        {!projectId && (
          <div className="mb-6 space-y-4 no-print">
            {/* Quick Filter Presets */}
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => applyQuickFilter('overdue')}
                className={`group relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
                  quickFilterPreset === 'overdue'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50 scale-105'
                    : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 hover:shadow-md hover:scale-105 border border-red-200'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>Overdue Projects</span>
                </span>
                {quickFilterPreset === 'overdue' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                )}
              </button>
              <button
                onClick={() => applyQuickFilter('highPriority')}
                className={`group relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
                  quickFilterPreset === 'highPriority'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50 scale-105'
                    : 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200 hover:shadow-md hover:scale-105 border border-orange-200'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <span>High Priority</span>
                </span>
                {quickFilterPreset === 'highPriority' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                )}
              </button>
              <button
                onClick={() => applyQuickFilter('nearCompletion')}
                className={`group relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
                  quickFilterPreset === 'nearCompletion'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50 scale-105'
                    : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200 hover:shadow-md hover:scale-105 border border-green-200'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base">✅</span>
                  <span>Near Completion</span>
                </span>
                {quickFilterPreset === 'nearCompletion' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                )}
              </button>
              <button
                onClick={() => applyQuickFilter('recentlyUpdated')}
                className={`group relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
                  quickFilterPreset === 'recentlyUpdated'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 hover:shadow-md hover:scale-105 border border-blue-200'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base">🕒</span>
                  <span>Recently Updated</span>
                </span>
                {quickFilterPreset === 'recentlyUpdated' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                )}
              </button>
              {(quickFilterPreset || searchQuery || filterStatus || filterCategory || dateRangeStart || dateRangeEnd || budgetRangeMin || budgetRangeMax || progressRangeMin || progressRangeMax || selectedStatuses.length > 0 || selectedCategories.length > 0 || selectedPriorities.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="group relative px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 hover:from-gray-300 hover:to-gray-400 hover:shadow-md hover:scale-105 transition-all duration-300 border border-gray-300"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-base">🗑️</span>
                    <span>Clear All</span>
                  </span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search projects by name, code, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setSelectedStatuses([]);
                    }}
                    className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30 appearance-none cursor-pointer"
                  >
                    <option value="">All Status</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <div className="relative">
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setSelectedCategories([]);
                    }}
                    className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30 appearance-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="transportation">Transportation</option>
                    <option value="health">Health</option>
                    <option value="education">Education</option>
                    <option value="social">Social Services</option>
                    <option value="environment">Environment</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`group relative px-5 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden shadow-md ${
                    showAdvancedFilters
                      ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 hover:shadow-lg hover:scale-105 border border-gray-300'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className={`transition-transform duration-300 ${showAdvancedFilters ? 'rotate-90' : ''}`}>
                      {showAdvancedFilters ? '▼' : '▶'}
                    </span>
                    <span>Advanced Filters</span>
                  </span>
                  {showAdvancedFilters && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  )}
                </button>
                <button
                  onClick={() => setShowSavedViews(!showSavedViews)}
                  className="group relative px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 hover:shadow-lg hover:scale-105 transition-all duration-300 shadow-md border border-gray-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-base">💾</span>
                    <span>Saved Views ({savedViews.length})</span>
                  </span>
                </button>
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className="group relative px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 hover:shadow-lg hover:scale-105 transition-all duration-300 shadow-md border border-gray-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-base">⚙️</span>
                    <span>Columns</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg space-y-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Advanced Filters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date (From)</label>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Date (To)</label>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30 cursor-pointer"
                    />
                  </div>

                  {/* Budget Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Min Budget (₱)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={budgetRangeMin}
                        onChange={(e) => setBudgetRangeMin(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Budget (₱)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                      <input
                        type="number"
                        placeholder="No limit"
                        value={budgetRangeMax}
                        onChange={(e) => setBudgetRangeMax(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30"
                      />
                    </div>
                  </div>

                  {/* Progress Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Min Progress (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={progressRangeMin}
                        onChange={(e) => setProgressRangeMin(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Progress (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="100"
                        value={progressRangeMax}
                        onChange={(e) => setProgressRangeMax(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                    </div>
                  </div>
                </div>

                {/* Multi-Select Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Status Multi-Select */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status (Multiple)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      {['ongoing', 'completed', 'delayed'].map(status => (
                        <label key={status} className="group flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 hover:shadow-sm">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(status)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStatuses([...selectedStatuses, status]);
                                  setFilterStatus('');
                                } else {
                                  setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                }
                              }}
                              className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all checked:bg-blue-600 checked:border-blue-600"
                            />
                            {selectedStatuses.includes(status) && (
                              <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium capitalize text-gray-700 group-hover:text-blue-700 transition-colors">{status.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category Multi-Select */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category (Multiple)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      {['infrastructure', 'transportation', 'health', 'education', 'social', 'environment'].map(category => (
                        <label key={category} className="group flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 hover:shadow-sm">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategories([...selectedCategories, category]);
                                  setFilterCategory('');
                                } else {
                                  setSelectedCategories(selectedCategories.filter(c => c !== category));
                                }
                              }}
                              className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all checked:bg-blue-600 checked:border-blue-600"
                            />
                            {selectedCategories.includes(category) && (
                              <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium capitalize text-gray-700 group-hover:text-blue-700 transition-colors">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priority Multi-Select */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Priority (Multiple)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      {['high', 'medium', 'low'].map(priority => (
                        <label key={priority} className="group flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 hover:shadow-sm">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedPriorities.includes(priority)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPriorities([...selectedPriorities, priority]);
                                } else {
                                  setSelectedPriorities(selectedPriorities.filter(p => p !== priority));
                                }
                              }}
                              className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all checked:bg-blue-600 checked:border-blue-600"
                            />
                            {selectedPriorities.includes(priority) && (
                              <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium capitalize text-gray-700 group-hover:text-blue-700 transition-colors">{priority}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Views Panel */}
            {showSavedViews && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Saved Views</h3>
                  <button
                    onClick={() => setShowSaveViewModal(true)}
                    className="group relative px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg hover:scale-105 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span className="text-lg">+</span>
                      <span>Save Current View</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </button>
                </div>
                {savedViews.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No saved views yet. Save your current filter settings to create one.</p>
                ) : (
                  <div className="space-y-2">
                    {savedViews.map(view => (
                      <div key={view.id} className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{view.name}</h4>
                          <p className="text-xs text-gray-500">
                            Saved {new Date(view.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadView(view)}
                            className="group relative px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-105 overflow-hidden"
                          >
                            <span className="relative z-10">Load</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                          </button>
                          <button
                            onClick={() => deleteView(view.id)}
                            className="group relative px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-105 overflow-hidden"
                          >
                            <span className="relative z-10">Delete</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save View Modal */}
            {showSaveViewModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Save Current View</h3>
                  <input
                    type="text"
                    placeholder="Enter view name..."
                    value={viewNameToSave}
                    onChange={(e) => setViewNameToSave(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        saveView(viewNameToSave);
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => saveView(viewNameToSave)}
                      className="group relative flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg hover:scale-105 overflow-hidden"
                    >
                      <span className="relative z-10">Save</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveViewModal(false);
                        setViewNameToSave('');
                      }}
                      className="group relative flex-1 px-4 py-3 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-300 font-semibold shadow-md hover:shadow-lg hover:scale-105"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Project Comparison Selection Modal */}
            {showComparisonModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
                <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Compare Projects</h3>
                    <button
                      onClick={() => {
                        setShowComparisonModal(false);
                        setComparisonSearchQuery('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Select 2-4 projects to compare side-by-side. ({selectedProjectsForComparison.length}/4 selected)
                  </p>
                  
                  {/* Search in Modal */}
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={comparisonSearchQuery}
                      onChange={(e) => setComparisonSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all duration-300 bg-white focus:bg-blue-50/30"
                    />
                  </div>

                  {/* Project List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 max-h-96 overflow-y-auto">
                    {filteredProjects
                      .filter(project => 
                        !comparisonSearchQuery || 
                        project.name?.toLowerCase().includes(comparisonSearchQuery.toLowerCase()) ||
                        project.projectCode?.toLowerCase().includes(comparisonSearchQuery.toLowerCase())
                      )
                      .map(project => {
                        const isSelected = selectedProjectsForComparison.includes(project.id);
                        return (
                          <div
                            key={project.id}
                            onClick={() => toggleProjectForComparison(project.id)}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 mb-1">{project.name}</h4>
                                <p className="text-sm text-gray-600 mb-2">Code: {project.projectCode || 'N/A'}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    project.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                    project.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {project.status || 'N/A'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatCurrency(project.totalBudget || 0)}
                                  </span>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setShowComparisonModal(false);
                        setComparisonSearchQuery('');
                        setSelectedProjectsForComparison([]);
                      }}
                      className="group relative px-5 py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-300 font-semibold shadow-md hover:shadow-lg hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={startComparison}
                      disabled={selectedProjectsForComparison.length < 2}
                      className={`group relative px-5 py-2.5 rounded-xl transition-all duration-300 font-semibold overflow-hidden ${
                        selectedProjectsForComparison.length < 2
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : `bg-gradient-to-r ${colors.gradient} text-white hover:shadow-lg hover:scale-105`
                      }`}
                    >
                      <span className="relative z-10">Compare {selectedProjectsForComparison.length} Project{selectedProjectsForComparison.length !== 1 ? 's' : ''}</span>
                      {selectedProjectsForComparison.length >= 2 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Column Settings Panel */}
            {showColumnSettings && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Column Visibility</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  {Object.keys(visibleColumns).map(columnKey => (
                    <label key={columnKey} className="group flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 hover:shadow-sm">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={visibleColumns[columnKey] || false}
                          onChange={(e) => {
                            setVisibleColumns({
                              ...visibleColumns,
                              [columnKey]: e.target.checked
                            });
                          }}
                          className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all checked:bg-blue-600 checked:border-blue-600"
                        />
                        {visibleColumns[columnKey] && (
                          <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium capitalize text-gray-700 group-hover:text-blue-700 transition-colors">{columnKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Project List */}
            {filteredProjects.length > 0 && !displayProject && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => {
                  // Get project image
                  const getProjectImage = () => {
                    if (project.initialPhoto && project.initialPhoto !== '' && project.initialPhoto !== 'None') {
                      if (project.initialPhoto.startsWith('http://') || project.initialPhoto.startsWith('https://')) {
                        return project.initialPhoto;
                      }
                      return project.initialPhoto.startsWith('/') 
                        ? `${API_URL.replace('/api', '')}${project.initialPhoto}` 
                        : `${API_URL.replace('/api', '')}/${project.initialPhoto}`;
                    }
                    return `${API_URL.replace('/api', '')}/projects-page-header-bg.png`;
                  };

                  const projectImage = getProjectImage();
                  const overallProgress = parseFloat(project.progress?.overall || project.overallProgress || 0);
                  
                  // Get progress color
                  const getProgressColor = (progress) => {
                    if (progress >= 0 && progress <= 25) return 'bg-red-500';
                    if (progress >= 26 && progress <= 50) return 'bg-yellow-500';
                    if (progress >= 51 && progress <= 75) return 'bg-blue-500';
                    if (progress >= 76 && progress <= 100) return 'bg-green-500';
                    return 'bg-gray-500';
                  };

                  // Get status color
                  const getStatusBadgeColor = (status) => {
                    switch(status?.toLowerCase()) {
                      case 'completed':
                      case 'complete':
                        return 'bg-green-100 text-green-700 border-green-200';
                      case 'ongoing':
                        return 'bg-blue-100 text-blue-700 border-blue-200';
                      case 'delayed':
                        return 'bg-red-100 text-red-700 border-red-200';
                      default:
                        return 'bg-gray-100 text-gray-600 border-gray-200';
                    }
                  };

                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        const enrichedProject = enrichProjectWithEIUData(project);
                        setSelectedProject(enrichedProject);
                      }}
                      className="group bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl hover:border-blue-400"
                    >
                      {/* Project Image with Background */}
                      <div className="h-48 relative overflow-hidden">
                        <img 
                          src={projectImage}
                          alt={project.name || 'Project Image'}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${API_URL.replace('/api', '')}/projects-page-header-bg.png`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                        
                        {/* Floating Status Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${getStatusBadgeColor(project.status)}`}>
                            {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'Not Started'}
                          </span>
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold border border-white/30">
                            {project.category ? project.category.charAt(0).toUpperCase() + project.category.slice(1) : 'Infrastructure'}
                          </span>
                        </div>

                        {/* Progress Overlay */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-gray-700">Overall Progress</span>
                              <span className="text-xs font-bold text-gray-900">{overallProgress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(overallProgress)}`}
                                style={{ width: `${overallProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="p-6">
                        {/* Project Title */}
                        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3.5rem]">
                          {project.name}
                        </h3>

                        {/* Project Code */}
                        <div className="text-sm text-gray-500 mb-3">
                          <span className="font-medium">Code:</span> {project.projectCode || 'N/A'}
                        </div>

                        {/* Project Description */}
                        {project.description && (
                          <div className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                            {project.description}
                          </div>
                        )}

                        {/* Key Information Grid */}
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Location:</span>
                            <span className="text-gray-800 text-right">{project.location || 'N/A'}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Implementing Office:</span>
                            <span className="text-gray-800 text-right">{project.implementingOfficeName || project.implementingOffice || 'N/A'}</span>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Budget:</span>
                            <span className="text-gray-800 font-semibold">{formatCurrency(project.totalBudget || 0)}</span>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Funding Source:</span>
                            <span className="text-gray-800">{project.fundingSource === 'donor_fund' ? 'Municipal Development Fund' : project.fundingSource?.replace('_', ' ').toUpperCase() || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Priority Badge */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium">Priority:</span>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              project.priority === 'high' ? 'bg-red-100 text-red-700' : 
                              project.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-green-100 text-green-700'
                            }`}>
                              {project.priority ? project.priority.toUpperCase() : 'MEDIUM'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {project.startDate ? formatDate(project.startDate) : 'N/A'} - {project.targetCompletionDate ? formatDate(project.targetCompletionDate) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Project Ledger Table */}
        {displayProject && (
          <div className="space-y-6 print-content">
            {/* Back Button */}
            {!projectId && (
              <button
                onClick={() => setSelectedProject(null)}
                className="group relative mb-4 px-5 py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-300 font-semibold shadow-md hover:shadow-lg hover:scale-105 no-print overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  <span>Back to Projects</span>
                </span>
              </button>
            )}

            {/* View Mode Toggle (Table/Dashboard) */}
            <div className="flex justify-between items-center gap-3 mb-4 flex-wrap no-print">
              <div className="flex gap-3 items-center">
                {/* Dashboard/Table/Compare Toggle */}
                <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl shadow-inner">
                  <button
                    onClick={() => {
                      setViewMode('table');
                      setComparisonMode(false);
                    }}
                    className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 overflow-hidden ${
                      viewMode === 'table' && !comparisonMode
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                        : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                      <span>Table View</span>
                    </div>
                    {viewMode === 'table' && !comparisonMode && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('dashboard');
                      setComparisonMode(false);
                    }}
                    className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 overflow-hidden ${
                      viewMode === 'dashboard'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                        : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      <span>Dashboard</span>
                    </div>
                    {viewMode === 'dashboard' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setShowComparisonModal(true)}
                    className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 overflow-hidden ${
                      comparisonMode
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                        : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span>Compare Projects</span>
                    </div>
                    {comparisonMode && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('timeline');
                      setComparisonMode(false);
                    }}
                    className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 overflow-hidden ${
                      viewMode === 'timeline'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                        : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span>Timeline</span>
                    </div>
                    {viewMode === 'timeline' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    )}
                  </button>
                </div>

                {/* Table View Type Toggle (only show in table mode) */}
                {viewMode === 'table' && (
                  <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl shadow-inner">
                    <button
                      onClick={() => setTableView('vertical')}
                      className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 overflow-hidden ${
                        tableView === 'vertical'
                          ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                          : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:scale-105'
                      }`}
                    >
                      <div className="relative z-10 flex items-center gap-2">
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                        </svg>
                        <span>Vertical</span>
                      </div>
                      {tableView === 'vertical' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setTableView('horizontal')}
                      className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 overflow-hidden ${
                        tableView === 'horizontal'
                          ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                          : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:scale-105'
                      }`}
                    >
                      <div className="relative z-10 flex items-center gap-2">
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2H19a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                        </svg>
                        <span>Horizontal</span>
                      </div>
                      {tableView === 'horizontal' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Export & Print Buttons */}
              <div className="flex gap-3 items-center">
                <button
                  onClick={exportToPDF}
                  disabled={loading}
                  className={`group relative px-5 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 overflow-hidden ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : `bg-gradient-to-r ${colors.gradient} text-white hover:shadow-xl hover:scale-105`
                  }`}
                  title="Export to PDF"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  <span className="relative z-10">PDF</span>
                  {!loading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  )}
                </button>
                {/* Excel Export with Format Selection */}
                <div className="relative">
                  <div className="flex">
                    <button
                      onClick={() => exportToExcel(excelExportFormat)}
                      disabled={loading}
                      className={`group relative px-5 py-3 rounded-l-xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 overflow-hidden ${
                        loading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-xl hover:scale-105'
                      }`}
                      title="Export to Excel"
                    >
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span className="relative z-10">Excel</span>
                      {!loading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setShowExcelFormatMenu(!showExcelFormatMenu)}
                      disabled={loading}
                      className={`px-2 py-3 rounded-r-xl font-semibold transition-all duration-300 shadow-lg border-l-2 border-green-500/30 ${
                        loading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                      }`}
                      title="Select Export Format"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>
                  </div>
                  {/* Format Selection Dropdown */}
                  {showExcelFormatMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowExcelFormatMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-50">
                        <div className="p-2">
                          <div className="text-xs font-semibold text-gray-700 mb-2 px-2">Export Format:</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExcelExportFormat('vertical');
                              setShowExcelFormatMenu(false);
                              exportToExcel('vertical');
                            }}
                            disabled={loading}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 ${
                              excelExportFormat === 'vertical'
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                : 'hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>📋</span>
                              <span>Vertical Table View</span>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExcelExportFormat('horizontal');
                              setShowExcelFormatMenu(false);
                              exportToExcel('horizontal');
                            }}
                            disabled={loading}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              excelExportFormat === 'horizontal'
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                : 'hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>📊</span>
                              <span>Horizontal Table View</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handlePrint}
                  className="group relative px-5 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-800 hover:to-gray-900 hover:shadow-xl hover:scale-105 no-print overflow-hidden"
                  title="Print"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                  </svg>
                  <span className="relative z-10">Print</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>

            {/* Dashboard View */}
            {viewMode === 'dashboard' && (
              <div className="space-y-6">
                {/* Summary Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Projects Card */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium mb-1">Total Projects</p>
                        <p className="text-3xl font-bold">{dashboardStats.totalProjects}</p>
                        <p className="text-blue-100 text-xs mt-1">
                          {projects.length !== filteredProjects.length 
                            ? `${filteredProjects.length} of ${projects.length} filtered`
                            : 'All projects'}
                        </p>
                      </div>
                      <div className="bg-white/20 rounded-full p-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Budget Card */}
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium mb-1">Total Budget</p>
                        <p className="text-2xl font-bold">{formatCurrency(dashboardStats.totalBudget)}</p>
                        <p className="text-green-100 text-xs mt-1">Allocated budget</p>
                      </div>
                      <div className="bg-white/20 rounded-full p-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Average Progress Card */}
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium mb-1">Average Progress</p>
                        <p className="text-3xl font-bold">{dashboardStats.averageProgress.toFixed(1)}%</p>
                        <div className="mt-2 bg-white/20 rounded-full h-2">
                          <div 
                            className="bg-white rounded-full h-2 transition-all duration-500"
                            style={{ width: `${dashboardStats.averageProgress}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-full p-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Status Overview Card */}
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium mb-1">Active Projects</p>
                        <p className="text-3xl font-bold">{dashboardStats.statusCounts.ongoing || 0}</p>
                        <p className="text-orange-100 text-xs mt-1">
                          {dashboardStats.statusCounts.completed || 0} completed
                        </p>
                      </div>
                      <div className="bg-white/20 rounded-full p-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Projects by Status Pie Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Projects by Status</h3>
                    {Object.entries(dashboardStats.projectsByStatus).length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No data available</p>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={Object.entries(dashboardStats.projectsByStatus).map(([status, count]) => ({
                                name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                value: count,
                                status: status
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              onClick={(data) => {
                                const status = data.status;
                                if (selectedStatuses.includes(status)) {
                                  setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                } else {
                                  setSelectedStatuses([...selectedStatuses, status]);
                                  setFilterStatus('');
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              {Object.entries(dashboardStats.projectsByStatus).map(([status], index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={getStatusColor(status)}
                                  style={{ 
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.opacity = 0.8;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.opacity = 1;
                                  }}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const status = data.status;
                                  const projectNames = dashboardStats.projectsByStatusWithNames[status] || [];
                                  const total = Object.values(dashboardStats.projectsByStatus).reduce((sum, c) => sum + c, 0);
                                  const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                                  
                                  return (
                                    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs">
                                      <div className="font-semibold text-gray-800 mb-2">
                                        {data.name}: {data.value} project{data.value !== 1 ? 's' : ''} ({percentage}%)
                                      </div>
                                      {projectNames.length > 0 && (
                                        <div className="text-xs text-gray-600 mt-2 max-h-40 overflow-y-auto space-y-1 border-t border-gray-200 pt-2">
                                          <div className="font-medium text-gray-700 mb-1">Projects:</div>
                                          {projectNames.map((projectName, idx) => (
                                            <div key={idx} className="truncate pl-2">• {projectName}</div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                          {Object.entries(dashboardStats.projectsByStatus).map(([status, count]) => {
                            const total = Object.values(dashboardStats.projectsByStatus).reduce((sum, c) => sum + c, 0);
                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                            return (
                              <div key={status} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                onClick={() => {
                                  if (selectedStatuses.includes(status)) {
                                    setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                  } else {
                                    setSelectedStatuses([...selectedStatuses, status]);
                                    setFilterStatus('');
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: getStatusColor(status) }}
                                  ></div>
                                  <span className="text-sm font-medium text-gray-700 capitalize">
                                    {status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-800">{count}</span>
                                  <span className="text-xs text-gray-500">({percentage}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Budget by Category Bar Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Budget by Category</h3>
                    {Object.entries(dashboardStats.budgetByCategory).length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No budget data available</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={Object.entries(dashboardStats.budgetByCategory)
                            .sort(([, a], [, b]) => b - a)
                            .map(([category, budget], index) => ({
                              name: category.charAt(0).toUpperCase() + category.slice(1),
                              budget: budget,
                              formatted: formatCurrency(budget),
                              category: category,
                              color: getCategoryColor(category, index)
                            }))}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          onClick={(data) => {
                            if (data && data.activePayload && data.activePayload[0]) {
                              const category = data.activePayload[0].payload.category;
                              if (selectedCategories.includes(category)) {
                                setSelectedCategories(selectedCategories.filter(c => c !== category));
                              } else {
                                setSelectedCategories([...selectedCategories, category]);
                                setFilterCategory('');
                              }
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            type="number" 
                            tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const category = data.category;
                                const projects = dashboardStats.budgetByCategoryWithProjects[category] || [];
                                
                                return (
                                  <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs">
                                    <div className="font-semibold text-gray-800 mb-2">
                                      {data.name}: {data.formatted}
                                    </div>
                                    {projects.length > 0 && (
                                      <div className="text-xs text-gray-600 mt-2 max-h-40 overflow-y-auto space-y-1 border-t border-gray-200 pt-2">
                                        <div className="font-medium text-gray-700 mb-1">Projects:</div>
                                        {projects.map((project, idx) => (
                                          <div key={idx} className="truncate pl-2">
                                            • {project.name}: {formatCurrency(project.budget)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="budget" 
                            radius={[0, 8, 8, 0]}
                            style={{ cursor: 'pointer' }}
                          >
                            {Object.entries(dashboardStats.budgetByCategory)
                              .sort(([, a], [, b]) => b - a)
                              .map(([category], index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={getCategoryColor(category, index)}
                                />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Progress Distribution Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Progress Distribution</h3>
                    {Object.entries(dashboardStats.progressDistribution).reduce((sum, [, count]) => sum + count, 0) === 0 ? (
                      <p className="text-gray-500 text-center py-8">No progress data available</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={Object.entries(dashboardStats.progressDistribution).map(([range, count]) => {
                            const total = Object.values(dashboardStats.progressDistribution).reduce((sum, c) => sum + c, 0);
                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                            const rangeColors = {
                              '0-20': '#EF4444',
                              '21-40': '#F59E0B',
                              '41-60': '#3B82F6',
                              '61-80': '#8B5CF6',
                              '81-100': '#10B981'
                            };
                            return {
                              range: `${range}%`,
                              count: count,
                              percentage: parseFloat(percentage),
                              color: rangeColors[range],
                              rangeKey: range
                            };
                          })}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            type="number" 
                            domain={[0, 'dataMax']}
                            stroke="#6b7280"
                            fontSize={12}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <YAxis 
                            dataKey="range" 
                            type="category" 
                            width={80}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const projectNames = dashboardStats.progressDistributionWithProjects[data.rangeKey] || [];
                                
                                return (
                                  <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs">
                                    <div className="font-semibold text-gray-800 mb-2">
                                      {data.range}: {data.count} project{data.count !== 1 ? 's' : ''} ({data.percentage}%)
                                    </div>
                                    {projectNames.length > 0 && (
                                      <div className="text-xs text-gray-600 mt-2 max-h-40 overflow-y-auto space-y-1 border-t border-gray-200 pt-2">
                                        <div className="font-medium text-gray-700 mb-1">Projects:</div>
                                        {projectNames.map((projectName, idx) => (
                                          <div key={idx} className="truncate pl-2">• {projectName}</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            radius={[0, 8, 8, 0]}
                          >
                            {Object.entries(dashboardStats.progressDistribution).map(([range], index) => {
                              const rangeColors = {
                                '0-20': '#EF4444',
                                '21-40': '#F59E0B',
                                '41-60': '#3B82F6',
                                '61-80': '#8B5CF6',
                                '81-100': '#10B981'
                              };
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={rangeColors[range]}
                                  style={{ 
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (e.target) e.target.style.opacity = 0.8;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (e.target) e.target.style.opacity = 1;
                                  }}
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Projects by Priority */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Projects by Priority</h3>
                    <div className="space-y-3">
                      {Object.entries(dashboardStats.projectsByPriority).length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No priority data available</p>
                      ) : (
                        Object.entries(dashboardStats.projectsByPriority)
                          .sort(([a], [b]) => {
                            const order = { 'high': 0, 'medium': 1, 'low': 2 };
                            return (order[a] || 99) - (order[b] || 99);
                          })
                          .map(([priority, count]) => {
                            const total = Object.values(dashboardStats.projectsByPriority).reduce((sum, c) => sum + c, 0);
                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                            return (
                              <div 
                                key={priority} 
                                className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all"
                                onClick={() => {
                                  if (selectedPriorities.includes(priority)) {
                                    setSelectedPriorities(selectedPriorities.filter(p => p !== priority));
                                  } else {
                                    setSelectedPriorities([...selectedPriorities, priority]);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: getPriorityColor(priority) }}
                                  ></div>
                                  <span className="text-sm font-medium text-gray-700 capitalize">
                                    {priority} Priority
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-gray-800">{count}</span>
                                  <span className="text-xs text-gray-500">({percentage}%)</span>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Breakdown Table */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Status Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(dashboardStats.statusCounts)
                      .filter(([status]) => status !== 'pending' && status !== 'at_risk')
                      .map(([status, count]) => (
                      <div 
                        key={status}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all text-center"
                        onClick={() => {
                          if (selectedStatuses.includes(status)) {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                          } else {
                            setSelectedStatuses([...selectedStatuses, status]);
                            setFilterStatus('');
                          }
                        }}
                      >
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                          style={{ backgroundColor: getStatusColor(status) + '20' }}
                        >
                          <div 
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: getStatusColor(status) }}
                          ></div>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{count}</p>
                        <p className="text-xs text-gray-600 capitalize mt-1">
                          {status.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline Overview */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Timeline Overview</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No projects to display</p>
                    ) : (
                      filteredProjects.slice(0, 10).map((project) => {
                        const startDate = project.startDate ? new Date(project.startDate) : null;
                        const endDate = project.targetCompletionDate || project.endDate 
                          ? new Date(project.targetCompletionDate || project.endDate) 
                          : null;
                        const today = new Date();
                        const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
                        
                        // Calculate timeline position (simplified)
                        let timelineWidth = 0;
                        let timelinePosition = 0;
                        if (startDate && endDate) {
                          const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                          const daysElapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
                          timelineWidth = Math.min(100, Math.max(5, (totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0)));
                          timelinePosition = 0;
                        }
                        
                        return (
                          <div 
                            key={project.id}
                            className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all"
                            onClick={() => {
                              const enrichedProject = enrichProjectWithEIUData(project);
                              setSelectedProject(enrichedProject);
                              setViewMode('table');
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {project.name || 'Unnamed Project'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {project.projectCode || 'N/A'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span className="text-xs font-medium text-gray-600">
                                  {progress.toFixed(0)}%
                                </span>
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getStatusColor(project.status || 'unknown') }}
                                ></div>
                              </div>
                            </div>
                            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="absolute h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: progress >= 80 ? '#10B981' : progress >= 50 ? '#3B82F6' : progress >= 25 ? '#F59E0B' : '#EF4444'
                                }}
                              >
                                {progress > 15 && (
                                  <span className="text-[8px] text-white font-medium">
                                    {progress.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                              <span>
                                {startDate ? formatDate(project.startDate) : 'N/A'}
                              </span>
                              <span>
                                {endDate ? formatDate(project.targetCompletionDate || project.endDate) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {filteredProjects.length > 10 && (
                      <p className="text-center text-sm text-gray-500 pt-2">
                        Showing 10 of {filteredProjects.length} projects. Use filters to narrow down.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Project Comparison View */}
            {comparisonMode && viewMode === 'compare' && selectedProjectsForComparison.length >= 2 && (
              <div className="space-y-6">
                {/* Comparison Header */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Project Comparison</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Comparing {selectedProjectsForComparison.length} projects side-by-side
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Export comparison to PDF (placeholder - can be enhanced)
                          alert('Export to PDF functionality will be implemented');
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        Export PDF
                      </button>
                      <button
                        onClick={() => {
                          // Export comparison to Excel (placeholder - can be enhanced)
                          alert('Export to Excel functionality will be implemented');
                        }}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Export Excel
                      </button>
                      <button
                        onClick={exitComparison}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                      >
                        Exit Comparison
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comparison Metrics Summary */}
                {(() => {
                  const comparisonProjects = filteredProjects.filter(p => 
                    selectedProjectsForComparison.includes(p.id)
                  );
                  const metrics = calculateComparisonMetrics(comparisonProjects);
                  
                  if (!metrics) return null;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Average Budget</p>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.averageBudget)}</p>
                      </div>
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Average Progress</p>
                        <p className="text-2xl font-bold text-gray-800">{metrics.averageProgress.toFixed(1)}%</p>
                      </div>
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Total Budget</p>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.totalBudget)}</p>
                      </div>
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Average Timeline</p>
                        <p className="text-2xl font-bold text-gray-800">{Math.round(metrics.averageDaysToComplete)} days</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Comparison Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={`bg-gradient-to-r ${colors.headerBg} text-white`}>
                          <th className="px-6 py-4 text-left text-sm font-bold border-r border-white/20">Metric</th>
                          {selectedProjectsForComparison.map(projectId => {
                            const project = filteredProjects.find(p => p.id === projectId);
                            return project ? (
                              <th key={projectId} className="px-6 py-4 text-left text-sm font-bold border-r border-white/20 min-w-[250px]">
                                <div>
                                  <p className="font-bold">{project.name}</p>
                                  <p className="text-xs font-normal opacity-90">{project.projectCode || 'N/A'}</p>
                                </div>
                              </th>
                            ) : null;
                          })}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {(() => {
                          const comparisonProjects = filteredProjects.filter(p => 
                            selectedProjectsForComparison.includes(p.id)
                          );
                          const metrics = calculateComparisonMetrics(comparisonProjects);
                          
                          if (!metrics) return null;

                          return (
                            <>
                              {/* Basic Information */}
                              <tr className="bg-gray-50">
                                <td colSpan={selectedProjectsForComparison.length + 1} className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                                  BASIC INFORMATION
                                </td>
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Status</td>
                                {comparisonProjects.map(project => (
                                  <td key={project.id} className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      project.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                      project.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {project.status || 'N/A'}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Priority</td>
                                {comparisonProjects.map(project => (
                                  <td key={project.id} className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                      project.priority === 'high' ? 'bg-red-100 text-red-800' :
                                      project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {project.priority || 'N/A'}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Category</td>
                                {comparisonProjects.map(project => (
                                  <td key={project.id} className="px-6 py-4 text-gray-900 capitalize">
                                    {project.category || 'N/A'}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Location</td>
                                {comparisonProjects.map(project => (
                                  <td key={project.id} className="px-6 py-4 text-gray-900">
                                    {project.location || 'N/A'}
                                  </td>
                                ))}
                              </tr>

                              {/* Budget Information */}
                              <tr className="bg-gray-50">
                                <td colSpan={selectedProjectsForComparison.length + 1} className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                                  BUDGET INFORMATION
                                </td>
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Total Budget</td>
                                {comparisonProjects.map((project, index) => {
                                  const budget = parseFloat(project.totalBudget || 0);
                                  const variance = metrics.budgetVariances[index];
                                  return (
                                    <td key={project.id} className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-900 font-medium">{formatCurrency(budget)}</span>
                                        {variance && Math.abs(variance.variance) > 1 && (
                                          <span className={`text-xs px-2 py-1 rounded ${
                                            variance.isPositive 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {variance.isPositive ? '+' : ''}{variance.variance.toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Timeline Information */}
                              <tr className="bg-gray-50">
                                <td colSpan={selectedProjectsForComparison.length + 1} className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                                  TIMELINE INFORMATION
                                </td>
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Start Date</td>
                                {comparisonProjects.map(project => (
                                  <td key={project.id} className="px-6 py-4 text-gray-900">
                                    {formatDate(project.startDate) || 'N/A'}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Target Completion</td>
                                {comparisonProjects.map(project => (
                                  <td key={project.id} className="px-6 py-4 text-gray-900">
                                    {formatDate(project.targetCompletionDate || project.endDate) || 'N/A'}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Timeline (Days)</td>
                                {comparisonProjects.map((project, index) => {
                                  let days = 'N/A';
                                  if (project.startDate && project.targetCompletionDate) {
                                    const start = new Date(project.startDate);
                                    const end = new Date(project.targetCompletionDate);
                                    days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                  }
                                  const variance = metrics.timelineVariances[index];
                                  return (
                                    <td key={project.id} className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-900 font-medium">{days} days</span>
                                        {variance && Math.abs(variance.variance) > 0 && (
                                          <span className={`text-xs px-2 py-1 rounded ${
                                            variance.isPositive 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {variance.isPositive ? '-' : '+'}{Math.abs(variance.variance).toFixed(0)} days
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Progress Information */}
                              <tr className="bg-gray-50">
                                <td colSpan={selectedProjectsForComparison.length + 1} className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                                  PROGRESS INFORMATION
                                </td>
                              </tr>
                              <tr className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Overall Progress</td>
                                {comparisonProjects.map((project, index) => {
                                  const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
                                  const variance = metrics.progressVariances[index];
                                  return (
                                    <td key={project.id} className="px-6 py-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-900 font-medium">{progress.toFixed(1)}%</span>
                                          {variance && Math.abs(variance.variance) > 1 && (
                                            <span className={`text-xs px-2 py-1 rounded ${
                                              variance.isPositive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              {variance.isPositive ? '+' : ''}{variance.variance.toFixed(1)}%
                                            </span>
                                          )}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full transition-all ${
                                              progress >= 80 ? 'bg-green-500' :
                                              progress >= 50 ? 'bg-blue-500' :
                                              progress >= 25 ? 'bg-yellow-500' :
                                              'bg-red-500'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comparison Charts */}
                {(() => {
                  const comparisonProjects = filteredProjects.filter(p => 
                    selectedProjectsForComparison.includes(p.id)
                  );
                  const metrics = calculateComparisonMetrics(comparisonProjects);
                  
                  if (!metrics) return null;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Budget Comparison Chart */}
                      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Budget Comparison</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={comparisonProjects.map(project => ({
                            name: project.name?.substring(0, 20) + (project.name?.length > 20 ? '...' : ''),
                            budget: parseFloat(project.totalBudget || 0),
                            formatted: formatCurrency(project.totalBudget || 0)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              stroke="#6b7280"
                              fontSize={12}
                            />
                            <YAxis 
                              tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`}
                              stroke="#6b7280"
                              fontSize={12}
                            />
                            <Tooltip 
                              formatter={(value, name, props) => [
                                props.payload.formatted,
                                'Budget'
                              ]}
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '8px 12px'
                              }}
                            />
                            <Bar dataKey="budget" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Progress Comparison Chart */}
                      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Progress Comparison</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={comparisonProjects.map(project => ({
                            name: project.name?.substring(0, 20) + (project.name?.length > 20 ? '...' : ''),
                            progress: parseFloat(project.progress?.overall || project.overallProgress || 0)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              stroke="#6b7280"
                              fontSize={12}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              tickFormatter={(value) => `${value}%`}
                              stroke="#6b7280"
                              fontSize={12}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value.toFixed(1)}%`, 'Progress']}
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '8px 12px'
                              }}
                            />
                            <Bar dataKey="progress" fill="#10B981" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Timeline/Gantt Chart View */}
            {viewMode === 'timeline' && (
              <div className="space-y-6">
                {/* Timeline Controls */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-bold text-gray-800">Project Timeline</h2>
                      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                          onClick={() => setTimelineZoom('month')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            timelineZoom === 'month'
                              ? `bg-gradient-to-r ${colors.gradient} text-white`
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Month
                        </button>
                        <button
                          onClick={() => setTimelineZoom('week')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            timelineZoom === 'week'
                              ? `bg-gradient-to-r ${colors.gradient} text-white`
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Week
                        </button>
                        <button
                          onClick={() => setTimelineZoom('day')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            timelineZoom === 'day'
                              ? `bg-gradient-to-r ${colors.gradient} text-white`
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Day
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={timelineStartDate}
                        onChange={(e) => setTimelineStartDate(e.target.value)}
                        placeholder="Start Date"
                        className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="date"
                        value={timelineEndDate}
                        onChange={(e) => setTimelineEndDate(e.target.value)}
                        placeholder="End Date"
                        className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          setTimelineStartDate('');
                          setTimelineEndDate('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                      >
                        Reset
                      </button>
                      <button
                        onClick={exportTimeline}
                        disabled={loading}
                        className={`px-4 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2 ${
                          loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                        }`}
                        title="Export Timeline as PNG"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Exporting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            <span>Export</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gantt Chart */}
                {(() => {
                  const timelineData = calculateTimelineData();
                  const dateRange = getTimelineDateRange(timelineData);
                  const effectiveStart = timelineStartDate ? new Date(timelineStartDate) : dateRange.start;
                  const effectiveEnd = timelineEndDate ? new Date(timelineEndDate) : dateRange.end;
                  const totalDays = getDaysBetween(effectiveStart, effectiveEnd);
                  
                  // Filter timeline data by date range if set
                  const filteredTimelineData = timelineData.filter(item => {
                    if (timelineStartDate && item.endDate < new Date(timelineStartDate)) return false;
                    if (timelineEndDate && item.startDate > new Date(timelineEndDate)) return false;
                    return true;
                  });

                  // Group by project
                  const projectsMap = new Map();
                  filteredTimelineData.forEach(item => {
                    if (!projectsMap.has(item.projectId)) {
                      projectsMap.set(item.projectId, {
                        projectId: item.projectId,
                        projectName: item.projectName,
                        projectCode: item.projectCode,
                        phases: []
                      });
                    }
                    projectsMap.get(item.projectId).phases.push(item);
                  });

                  const projects = Array.from(projectsMap.values());

                  if (projects.length === 0) {
                    return (
                      <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
                        <p className="text-gray-500 text-lg">No timeline data available</p>
                        <p className="text-gray-400 text-sm mt-2">Projects need start and end dates to appear on the timeline</p>
                      </div>
                    );
                  }

                  const dateStep = getDateStep(timelineZoom);
                  const minBarWidth = getMinBarWidth(timelineZoom);
                  // Calculate pixel per day based on zoom level for better visibility
                  const pixelPerDay = timelineZoom === 'day' ? 8 : timelineZoom === 'week' ? 4 : 1.5;
                  const timelineWidth = Math.max(1200, totalDays * pixelPerDay);
                  
                  // Calculate number of date labels to prevent overlap
                  const numLabels = Math.ceil(totalDays / dateStep);
                  const labelSpacing = 100 / numLabels;

                  return (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" data-timeline-chart>
                      <div className="overflow-x-auto">
                        <div style={{ minWidth: `${timelineWidth}px` }}>
                          {/* Timeline Header */}
                          <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 shadow-sm">
                            <div className="flex">
                              <div className="w-64 p-4 border-r-2 border-gray-300 font-bold text-gray-800 bg-gray-100 flex-shrink-0">
                                Project / Phase
                              </div>
                              <div className="flex-1 relative" style={{ minHeight: '60px' }}>
                                {/* Date labels with better spacing */}
                                <div className="relative h-full">
                                  {(() => {
                                    const labels = [];
                                    const current = new Date(effectiveStart);
                                    let labelIndex = 0;
                                    
                                    // For day view, show every 7 days to prevent overlap
                                    // For week view, show every week
                                    // For month view, show every month
                                    const displayStep = timelineZoom === 'day' ? 7 : dateStep;
                                    
                                    while (current <= effectiveEnd) {
                                      const position = getDatePosition(current, effectiveStart, effectiveEnd);
                                      const nextDate = new Date(current);
                                      nextDate.setDate(current.getDate() + displayStep);
                                      const nextPosition = getDatePosition(nextDate, effectiveStart, effectiveEnd);
                                      const width = Math.max(5, nextPosition - position); // Minimum 5% width
                                      
                                      labels.push(
                                        <div
                                          key={current.getTime()}
                                          className="absolute border-l-2 border-gray-400 h-full"
                                          style={{ 
                                            left: `${position}%`,
                                            width: `${width}%`
                                          }}
                                        >
                                          <div className="absolute top-0 left-0 px-2 py-1.5 bg-white/95 rounded-br shadow-md border-r border-b border-gray-200">
                                            <div className="text-xs font-bold text-gray-800 whitespace-nowrap leading-tight">
                                              {formatTimelineDate(current, timelineZoom)}
                                            </div>
                                            {timelineZoom === 'day' && (
                                              <div className="text-[10px] text-gray-500 mt-0.5">
                                                {current.toLocaleDateString('en-US', { weekday: 'short' })}
                                              </div>
                                            )}
                                            {timelineZoom === 'week' && (
                                              <div className="text-[10px] text-gray-500 mt-0.5">
                                                Week {Math.ceil((current.getDate()) / 7)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                      current.setDate(current.getDate() + displayStep);
                                      labelIndex++;
                                    }
                                    return labels;
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Timeline Rows */}
                          <div className="divide-y divide-gray-200">
                            {projects.map((project, projectIndex) => (
                              <div key={project.projectId} className="hover:bg-gray-50/50 transition-colors">
                                {/* Project Row - Increased height */}
                                <div className="flex min-h-[80px]">
                                  <div className="w-64 p-4 border-r-2 border-gray-300 bg-gray-50 flex items-center flex-shrink-0">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800 text-sm leading-tight">{project.projectName}</p>
                                      <p className="text-xs text-gray-600 mt-1">{project.projectCode}</p>
                                    </div>
                                  </div>
                                  <div className="flex-1 relative" style={{ minHeight: '80px' }}>
                                    {project.phases.map((phase, phaseIndex) => {
                                      const left = getDatePosition(phase.startDate, effectiveStart, effectiveEnd);
                                      const width = getDatePosition(phase.endDate, effectiveStart, effectiveEnd) - left;
                                      const isOverdue = phase.endDate < new Date() && phase.status !== 'completed';
                                      const barWidthPx = (width / 100) * timelineWidth;
                                      const canShowText = barWidthPx >= minBarWidth;
                                      
                                      return (
                                        <div
                                          key={phase.phaseId}
                                          className="absolute top-3 bottom-3 rounded-lg cursor-pointer hover:scale-105 hover:shadow-lg transition-all group"
                                          style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            minWidth: `${minBarWidth}px`,
                                            zIndex: 10
                                          }}
                                          onClick={() => {
                                            const enrichedProject = filteredProjects.find(p => p.id === project.projectId);
                                            if (enrichedProject) {
                                              setSelectedProject(enrichedProject);
                                              setViewMode('table');
                                            }
                                          }}
                                          title={`${phase.phaseName}\n${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}\nProgress: ${phase.progress.toFixed(0)}%`}
                                        >
                                          <div
                                            className={`h-full rounded-lg border-2 ${
                                              isOverdue ? 'border-red-500 border-dashed' : 'border-white shadow-md'
                                            }`}
                                            style={{
                                              backgroundColor: getStatusColor(phase.status),
                                              opacity: Math.max(0.85, phase.progress / 100 || 0.85)
                                            }}
                                          >
                                            {canShowText && (
                                              <div className="h-full flex items-center px-3 py-1">
                                                <span className="text-xs font-bold text-white drop-shadow-lg truncate">
                                                  {phase.phaseName}
                                                </span>
                                              </div>
                                            )}
                                            {!canShowText && (
                                              <div className="h-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                              </div>
                                            )}
                                            {/* Progress indicator - more visible */}
                                            <div
                                              className="absolute bottom-0 left-0 h-1.5 bg-white/70 rounded-b-lg"
                                              style={{ width: `${Math.min(100, phase.progress)}%` }}
                                            ></div>
                                            {/* Status indicator dot */}
                                            <div
                                              className="absolute top-1 right-1 w-2 h-2 rounded-full border border-white"
                                              style={{
                                                backgroundColor: isOverdue ? '#EF4444' : phase.status === 'completed' ? '#10B981' : '#3B82F6'
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {/* Grid lines for better readability */}
                                    <div className="absolute inset-0 pointer-events-none">
                                      {(() => {
                                        const gridLines = [];
                                        const current = new Date(effectiveStart);
                                        const gridStep = timelineZoom === 'day' ? 1 : timelineZoom === 'week' ? 7 : 30;
                                        
                                        while (current <= effectiveEnd) {
                                          const position = getDatePosition(current, effectiveStart, effectiveEnd);
                                          gridLines.push(
                                            <div
                                              key={current.getTime()}
                                              className={`absolute top-0 bottom-0 ${
                                                timelineZoom === 'day' ? 'border-l border-gray-200' :
                                                timelineZoom === 'week' ? 'border-l border-gray-300' :
                                                'border-l-2 border-gray-300'
                                              }`}
                                              style={{ left: `${position}%` }}
                                            ></div>
                                          );
                                          current.setDate(current.getDate() + gridStep);
                                        }
                                        return gridLines;
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Timeline Legend */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Legend</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {['ongoing', 'completed', 'delayed'].map(status => (
                      <div key={status} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border-2 border-white shadow-sm"
                          style={{ backgroundColor: getStatusColor(status) }}
                        ></div>
                        <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <strong>Tip:</strong> Click on any timeline bar to view project details. Darker colors indicate higher progress.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modern Ledger Table Container */}
            {viewMode === 'table' && !comparisonMode && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Build Watch Header */}
              <div className={`bg-gradient-to-r ${colors.headerBg} px-8 py-6 text-white relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">BUILD WATCH</h2>
                        <p className="text-sm text-white/90">Project Monitoring & Evaluation System</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/80">Physical and Financial</p>
                      <p className="text-sm text-white/80">Accomplishment Report</p>
                      <p className="text-xs text-white/70 mt-1">
                        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-white/20 pt-4">
                    <p className="text-sm font-semibold">
                      Implementing Agency: <span className="font-normal">{displayProject.implementingOfficeName || displayProject.implementingUnitName || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Table - Conditional Rendering */}
              {tableView === 'vertical' ? (
                /* Vertical Table View */
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className={`${colors.tableHeaderBg} text-white`}>
                        <th className="px-6 py-4 text-left text-sm font-bold border-r border-white/20">Project Information</th>
                        <th className="px-6 py-4 text-left text-sm font-bold border-r border-white/20">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                    {/* Basic Project Information */}
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                        BASIC PROJECT INFORMATION
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50 w-1/3">Project Title</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.name || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Status</td>
                      <td className="px-6 py-4 text-gray-900">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          displayProject.status === 'completed' ? 'bg-green-100 text-green-800' :
                          displayProject.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                          displayProject.status === 'delayed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {displayProject.status ? displayProject.status.charAt(0).toUpperCase() + displayProject.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Overall Progress</td>
                      <td className="px-6 py-4 text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${
                                (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 76 ? 'bg-green-500' :
                                (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 51 ? 'bg-blue-500' :
                                (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 26 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-700 min-w-[50px]">
                            {(parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Project Code</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.projectCode || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Implementing Office</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.implementingOfficeName || displayProject.implementingUnitName || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Category</td>
                      <td className="px-6 py-4 text-gray-900 capitalize">{displayProject.category || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Location/Barangay</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.location || displayProject.barangay || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Priority</td>
                      <td className="px-6 py-4 text-gray-900 uppercase">{displayProject.priority || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Funding Source</td>
                      <td className="px-6 py-4 text-gray-900">{formatFundingSource(displayProject.fundingSource)}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Created Date</td>
                      <td className="px-6 py-4 text-gray-900">{formatDate(displayProject.createdAt)}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50 align-top">Project Description</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.description || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50 align-top">Expected Outputs</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.expectedOutputs || 'N/A'}</td>
                    </tr>
                    <tr className="border-b-2 border-gray-300 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50 align-top">Target Beneficiaries</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.targetBeneficiaries || 'N/A'}</td>
                    </tr>

                    {/* EIU Partner Contractor - Hidden for public users */}
                    {!isPublic && eiuPartner && (
                      <>
                        <tr className="bg-blue-50">
                          <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                            EIU PARTNER CONTRACTOR
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Company Name</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.company}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Email/Username</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.email}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Contact Number</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.contact}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Group</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.group}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Department</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.department}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Subrole</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.subrole}</td>
                        </tr>
                        <tr className="border-b-2 border-gray-300 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Company</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.company}</td>
                        </tr>
                        {/* EIU Reassignment Note */}
                        {displayProject.eiuReassignedAt && (displayProject.eiuPersonnel || displayProject.eiuPersonnelName) && (
                          <tr className="bg-amber-50 border-b-2 border-gray-300">
                            <td colSpan="2" className="px-6 py-4">
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs text-amber-800 leading-relaxed">
                                  <span className="font-semibold">Note:</span> This project has been realigned to a new EIU Partner Contractor, <span className="font-semibold">{displayProject.eiuPersonnel?.fullName || displayProject.eiuPersonnel?.name || displayProject.eiuPersonnelName || 'N/A'}</span>, effective as of {(() => {
                                    try {
                                      const reassignedDate = new Date(displayProject.eiuReassignedAt);
                                      if (isNaN(reassignedDate.getTime())) return displayProject.eiuReassignedAt;
                                      return reassignedDate.toLocaleString('en-PH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      });
                                    } catch (e) {
                                      return displayProject.eiuReassignedAt;
                                    }
                                  })()}.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )}

                    {/* Timeline Information */}
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                        TIMELINE INFORMATION
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Start Date</td>
                      <td className="px-6 py-4 text-gray-900">{formatDate(displayProject.startDate)}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Target Completion Date</td>
                      <td className="px-6 py-4 text-gray-900">{formatDate(displayProject.targetCompletionDate || displayProject.endDate)}</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Expected Days of Completion</td>
                      <td className="px-6 py-4 text-gray-900">
                        {calculateExpectedDays(displayProject.startDate, displayProject.targetCompletionDate || displayProject.endDate)}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-gray-300 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Actual Completion Date</td>
                      <td className="px-6 py-4 text-gray-900">{formatDate(displayProject.actualCompletionDate || displayProject.completionDate)}</td>
                    </tr>

                    {/* Budget Information */}
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                        BUDGET INFORMATION
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50">Total Budget Allocation (₱)</td>
                      <td className="px-6 py-4 text-gray-900 font-bold">{formatCurrency(displayProject.totalBudget)}</td>
                    </tr>
                    <tr className="border-b-2 border-gray-300 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50 align-top">Budget Description</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.budgetDescription || displayProject.budgetBreakdown || 'N/A'}</td>
                    </tr>

                    {/* Physical Accomplishment Information */}
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                        PHYSICAL ACCOMPLISHMENT INFORMATION
                      </td>
                    </tr>
                    <tr className="border-b-2 border-gray-300 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50 align-top">General Description</td>
                      <td className="px-6 py-4 text-gray-900">
                        {displayProject.physicalProgressRequirements || displayProject.generalDescription || displayProject.physicalDescription || displayProject.requiredDocumentation || 'N/A'}
                      </td>
                    </tr>

                    {/* Project Phases Update */}
                    {phases.length > 0 && (
                      <>
                        <tr className="bg-indigo-50">
                          <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                            PROJECT PHASES UPDATE
                            <span className="text-xs font-normal text-gray-600 ml-2 italic">
                              (Updates from EIU per phases/milestone approved by LGU-IU)
                            </span>
                          </td>
                        </tr>
                        {phases.map((phase, index) => (
                          <React.Fragment key={phase.id || index}>
                            <tr className="bg-indigo-100/50">
                              <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b border-gray-300">
                                Phase {index + 1}: {phase.title || phase.name || 'Untitled Phase'}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Phase (Item of Work)</td>
                              <td className="px-6 py-4 text-gray-900">{phase.title || phase.name || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Description</td>
                              <td className="px-6 py-4 text-gray-900">{phase.description || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Planned Budget</td>
                              <td className="px-6 py-4 text-gray-900">{formatCurrency(phase.plannedBudget || 0)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Breakdown Description</td>
                              <td className="px-6 py-4 text-gray-900">{phase.breakdownDescription || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Budget Alloted Weight</td>
                              <td className="px-6 py-4 text-gray-900">{typeof phase.budgetAllotedWeight === 'number' ? `${phase.budgetAllotedWeight}%` : phase.budgetAllotedWeight || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Physical Accomplishment Weight</td>
                              <td className="px-6 py-4 text-gray-900">{typeof phase.physicalAccomplishmentWeight === 'number' ? `${phase.physicalAccomplishmentWeight}%` : phase.physicalAccomplishmentWeight || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Start Date</td>
                              <td className="px-6 py-4 text-gray-900">{formatDate(phase.startDate)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Target Completion Date</td>
                              <td className="px-6 py-4 text-gray-900">{formatDate(phase.targetCompletionDate)}</td>
                            </tr>
                            
                            {/* CONTRACTOR UPDATE Section - Always shown */}
                            <tr className="bg-indigo-200/50">
                              <td colSpan="2" className="px-6 py-3 font-bold text-gray-800 border-b-2 border-gray-300">
                                CONTRACTOR UPDATE
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Submission Date</td>
                              <td className="px-6 py-4 text-gray-900">{formatDate(phase.submissionDate)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Actual Phase Completion Date</td>
                              <td className="px-6 py-4 text-gray-900">{formatDate(phase.actualPhaseCompletionDate)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Timeline Activities & Deliverables</td>
                              <td className="px-6 py-4 text-gray-900">{phase.timelineActivities || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Used Budget</td>
                              <td className="px-6 py-4 text-gray-900">{formatCurrency(phase.usedBudget || 0)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Remaining Budget</td>
                              <td className="px-6 py-4 text-gray-900">{formatCurrency(phase.remainingBudget || 0)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Budget Breakdown & Allocation</td>
                              <td className="px-6 py-4 text-gray-900">{phase.budgetBreakdownAllocation || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Physical Accomplishment Gained Weight</td>
                              <td className="px-6 py-4 text-gray-900">{typeof phase.physicalAccomplishmentGainedWeight === 'number' ? `${phase.physicalAccomplishmentGainedWeight}%` : phase.physicalAccomplishmentGainedWeight || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Budget Utilization Gained Weight</td>
                              <td className="px-6 py-4 text-gray-900">{phase.budgetUtilizationGainedWeight || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Photo Proof</td>
                              <td className="px-6 py-4 text-gray-900">
                                {Array.isArray(phase.photoProof) && phase.photoProof.length > 0 ? (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {phase.photoProof.map((photo, idx) => {
                                      const fileInfo = normalizeFileUrl(photo);
                                      if (!fileInfo || !fileInfo.url) return null;
                                      return (
                                        <div key={idx} className="relative group cursor-pointer" onClick={() => window.open(fileInfo.url, '_blank')}>
                                          <img 
                                            src={fileInfo.url} 
                                            alt={fileInfo.name || `Photo ${idx + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border border-gray-300 hover:border-blue-500 transition-all"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                          />
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                                            </svg>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No photos available</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Video Proof</td>
                              <td className="px-6 py-4 text-gray-900">
                                {Array.isArray(phase.videoProof) && phase.videoProof.length > 0 ? (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {phase.videoProof.map((video, idx) => {
                                      const fileInfo = normalizeFileUrl(video);
                                      if (!fileInfo || !fileInfo.url) return null;
                                      return (
                                        <div key={idx} className="relative group cursor-pointer bg-gray-800 rounded-lg overflow-hidden" onClick={() => window.open(fileInfo.url, '_blank')}>
                                          <div className="w-full h-24 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M8 5v14l11-7z"/>
                                            </svg>
                                          </div>
                                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white px-2 py-1 text-xs truncate">
                                            {fileInfo.name || `Video ${idx + 1}`}
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">Click to play</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No videos available</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Document Proof</td>
                              <td className="px-6 py-4 text-gray-900">
                                {Array.isArray(phase.documentProof) && phase.documentProof.length > 0 ? (
                                  <div className="space-y-2">
                                    {phase.documentProof.map((doc, idx) => {
                                      const fileInfo = normalizeFileUrl(doc);
                                      if (!fileInfo || !fileInfo.url) return null;
                                      return (
                                        <a 
                                          key={idx}
                                          href={fileInfo.url} 
                                          download={fileInfo.name}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                                        >
                                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                          </svg>
                                          <span className="text-sm text-gray-700 flex-1 truncate">{fileInfo.name || `Document ${idx + 1}`}</span>
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                          </svg>
                                        </a>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No documents available</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Physical Progress Description</td>
                              <td className="px-6 py-4 text-gray-900 whitespace-pre-wrap">{phase.physicalProgressDescription || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Submitted By</td>
                              <td className="px-6 py-4 text-gray-900">{phase.submittedBy || 'N/A'}</td>
                            </tr>
                            <tr className="border-b-2 border-gray-300 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Remarks and Recommendation</td>
                              <td className="px-6 py-4 text-gray-900 whitespace-pre-wrap">{phase.remarksAndRecommendation || 'N/A'}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              ) : (
                /* Horizontal Table View - Correct Structure */
                <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-x-auto shadow-inner">
                      <table className="w-full border-collapse border border-gray-400 min-w-[3000px] text-xs">
                        <thead className="sticky top-0 z-10">
                          {/* Main Header Row */}
                          <tr className={`${colors.tableHeaderBg} text-white border-b-2 border-white`}>
                            <th colSpan="13" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Basic Project Information</th>
                            {!isPublic && <th colSpan="7" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">EIU Partner Contractor</th>}
                            <th colSpan="4" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Timeline Information</th>
                            <th colSpan="2" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Budget Information</th>
                            <th rowSpan="2" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center align-middle bg-opacity-100 min-w-[200px]">Physical Accomplishment Information</th>
                            <th colSpan="19" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Project Phases Update</th>
                          </tr>
                          {/* Sub-header Row */}
                          <tr className={`${colors.tableHeaderBg} text-white`}>
                            {/* Basic Project Information */}
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[200px] leading-tight">Project Title</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Status</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Overall Progress</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Project Code</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Implementing Office</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Category</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Location/Barangay</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Priority</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Funding Source</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Created Date</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[200px] leading-tight">Project Description</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[180px] leading-tight">Expected Outputs</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Target Beneficiaries</th>
                            
                            {/* EIU Partner Contractor - Hidden for public users */}
                            {!isPublic && (
                              <>
                                <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Company Name</th>
                                <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Email/Username</th>
                                <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Contact Number</th>
                                <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Group</th>
                                <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Department</th>
                                <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Subrole</th>
                                <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Company</th>
                              </>
                            )}
                            
                            {/* Timeline Information */}
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Start Date</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Target Completion Date</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Expected Days of Completion</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Actual Completion Date</th>
                            
                            {/* Budget Information */}
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Total Budget Allocation (₱)</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[200px] leading-tight">Budget Description</th>
                            
                            {/* Physical Accomplishment Information - rowSpan="2" so no sub-header */}
                            
                            {/* Project Phases Update */}
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Phase (Item of Work)</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[200px] leading-tight">Description</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Planned Budget</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[180px] leading-tight">Breakdown Description</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Budget Alloted Weight</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[140px] leading-tight">Physical Accomplishment Weight</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Start Date</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Target Completion Date</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Submission Date</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Actual Phase Completion Date</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[200px] leading-tight">Timeline Activities & Deliverables</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Used Budget</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Remaining Budget</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[180px] leading-tight">Budget Breakdown & Allocation</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[140px] leading-tight">Physical Accomplishment Gained Weight</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[140px] leading-tight">Budget Utilization Gained Weight</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Photo Proof</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Video Proof</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Document Proof</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Physical Progress Description</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Submitted By</th>
                            <th className="px-2 py-2 text-[10px] font-semibold text-center bg-opacity-100 min-w-[200px] leading-tight">Remarks and Recommendation</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {phases.length > 0 ? (
                            // Render rows: First row has project info + first phase, subsequent rows have empty project info + phase data
                            phases.map((phase, phaseIndex) => (
                              <tr key={phase.id || phaseIndex} className="border-b border-gray-400 hover:bg-blue-50/30 transition-colors">
                                {phaseIndex === 0 ? (
                                  // First row: Show all project information
                                  <>
                                    {/* Basic Project Information */}
                                    <td rowSpan={phases.length} className="px-3 py-3 text-xs border-r border-gray-400 align-top font-medium bg-white">{displayProject.name || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold inline-block ${
                                        displayProject.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        displayProject.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                        displayProject.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {displayProject.status ? displayProject.status.charAt(0).toUpperCase() + displayProject.status.slice(1) : 'N/A'}
                                      </span>
                                    </td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                      <div className="flex flex-col items-center gap-1">
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                          <div
                                            className={`h-2 rounded-full transition-all ${
                                              (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 76 ? 'bg-green-500' :
                                              (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 51 ? 'bg-blue-500' :
                                              (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 26 ? 'bg-yellow-500' :
                                              'bg-red-500'
                                            }`}
                                            style={{ width: `${parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-700">
                                          {(parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)).toFixed(1)}%
                                        </span>
                                      </div>
                                    </td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{displayProject.projectCode || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{displayProject.implementingOfficeName || displayProject.implementingUnitName || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white capitalize">{displayProject.category || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{displayProject.location || displayProject.barangay || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white uppercase">{displayProject.priority || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{formatFundingSource(displayProject.fundingSource)}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.createdAt)}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.description || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.expectedOutputs || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.targetBeneficiaries || 'N/A'}</td>
                                    
                                    {/* EIU Partner Contractor - Hidden for public users */}
                                    {!isPublic && (
                                      <>
                                        <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                                        <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.email || 'N/A'}</td>
                                        <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.contact || 'N/A'}</td>
                                        <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.group || 'N/A'}</td>
                                        <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.department || 'N/A'}</td>
                                        <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.subrole || 'N/A'}</td>
                                        <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                                      </>
                                    )}
                                    
                                    {/* Timeline Information */}
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.startDate)}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.targetCompletionDate || displayProject.endDate)}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                      {calculateExpectedDays(displayProject.startDate, displayProject.targetCompletionDate || displayProject.endDate)}
                                    </td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.actualCompletionDate || displayProject.completionDate)}</td>
                                    
                                    {/* Budget Information */}
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-right font-semibold bg-white">{formatCurrency(displayProject.totalBudget).replace('₱', '').trim()}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.budgetDescription || displayProject.budgetBreakdown || 'N/A'}</td>
                                    
                                    {/* Physical Accomplishment Information */}
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.physicalProgressRequirements || displayProject.generalDescription || displayProject.physicalDescription || displayProject.requiredDocumentation || 'N/A'}</td>
                                  </>
                                ) : null}
                                
                                {/* Project Phases Update - Different per phase, shown in all rows */}
                                <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{phase.title || phase.name || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.description || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-right bg-white">{formatCurrency(phase.plannedBudget || 0).replace('₱', '').trim()}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.breakdownDescription || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{typeof phase.budgetAllotedWeight === 'number' ? `${phase.budgetAllotedWeight}%` : phase.budgetAllotedWeight || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{typeof phase.physicalAccomplishmentWeight === 'number' ? `${phase.physicalAccomplishmentWeight}%` : phase.physicalAccomplishmentWeight || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.startDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.targetCompletionDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.submissionDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.actualPhaseCompletionDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.timelineActivities || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-right bg-white">{formatCurrency(phase.usedBudget || 0).replace('₱', '').trim()}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-right bg-white">{formatCurrency(phase.remainingBudget || 0).replace('₱', '').trim()}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.budgetBreakdownAllocation || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{typeof phase.physicalAccomplishmentGainedWeight === 'number' ? `${phase.physicalAccomplishmentGainedWeight}%` : phase.physicalAccomplishmentGainedWeight || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{phase.budgetUtilizationGainedWeight || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">
                                  {Array.isArray(phase.photoProof) && phase.photoProof.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {phase.photoProof.map((photo, idx) => {
                                        const fileInfo = normalizeFileUrl(photo);
                                        if (!fileInfo || !fileInfo.url) return null;
                                        return (
                                          <img 
                                            key={idx}
                                            src={fileInfo.url} 
                                            alt={fileInfo.name || `Photo ${idx + 1}`}
                                            className="w-12 h-12 object-cover rounded border border-gray-300 hover:border-blue-500 cursor-pointer transition-all"
                                            onClick={() => window.open(fileInfo.url, '_blank')}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                            title={fileInfo.name || `Photo ${idx + 1}`}
                                          />
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">
                                  {Array.isArray(phase.videoProof) && phase.videoProof.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {phase.videoProof.map((video, idx) => {
                                        const fileInfo = normalizeFileUrl(video);
                                        if (!fileInfo || !fileInfo.url) return null;
                                        return (
                                          <div 
                                            key={idx}
                                            className="relative w-12 h-12 bg-gray-800 rounded border border-gray-300 hover:border-blue-500 cursor-pointer flex items-center justify-center group"
                                            onClick={() => window.open(fileInfo.url, '_blank')}
                                            title={fileInfo.name || `Video ${idx + 1}`}
                                          >
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M8 5v14l11-7z"/>
                                            </svg>
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded"></div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">
                                  {Array.isArray(phase.documentProof) && phase.documentProof.length > 0 ? (
                                    <div className="space-y-1">
                                      {phase.documentProof.map((doc, idx) => {
                                        const fileInfo = normalizeFileUrl(doc);
                                        if (!fileInfo || !fileInfo.url) return null;
                                        return (
                                          <a 
                                            key={idx}
                                            href={fileInfo.url} 
                                            download={fileInfo.name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 p-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors text-[10px]"
                                            title={fileInfo.name || `Document ${idx + 1}`}
                                          >
                                            <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                            </svg>
                                            <span className="truncate max-w-[80px]">{fileInfo.name || `Doc ${idx + 1}`}</span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.physicalProgressDescription || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{phase.submittedBy || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs align-top bg-white whitespace-pre-wrap">{phase.remarksAndRecommendation || 'N/A'}</td>
                              </tr>
                            ))
                          ) : (
                            // If no phases, show one row with project info only
                          <tr className="border-b border-gray-400 hover:bg-blue-50/30 transition-colors">
                              {/* Basic Project Information */}
                            <td className="px-3 py-3 text-xs border-r border-gray-400 align-top font-medium bg-white">{displayProject.name || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold inline-block ${
                                  displayProject.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  displayProject.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                  displayProject.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {displayProject.status ? displayProject.status.charAt(0).toUpperCase() + displayProject.status.slice(1) : 'N/A'}
                                </span>
                              </td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 76 ? 'bg-green-500' :
                                        (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 51 ? 'bg-blue-500' :
                                        (parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)) >= 26 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-gray-700">
                                    {(parseFloat(displayProject.progress?.overall || displayProject.overallProgress || 0)).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{displayProject.projectCode || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{displayProject.implementingOfficeName || displayProject.implementingUnitName || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white capitalize">{displayProject.category || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{displayProject.location || displayProject.barangay || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white uppercase">{displayProject.priority || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{formatFundingSource(displayProject.fundingSource)}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.createdAt)}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.description || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.expectedOutputs || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.targetBeneficiaries || 'N/A'}</td>
                              
                              {/* EIU Partner Contractor - Hidden for public users */}
                              {!isPublic && (
                                <>
                                  <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                                  <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.email || 'N/A'}</td>
                                  <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.contact || 'N/A'}</td>
                                  <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.group || 'N/A'}</td>
                                  <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.department || 'N/A'}</td>
                                  <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.subrole || 'N/A'}</td>
                                  <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">
                                    {eiuPartner?.company || 'N/A'}
                                    {/* EIU Reassignment Note */}
                                    {displayProject.eiuReassignedAt && (displayProject.eiuPersonnel || displayProject.eiuPersonnelName) && (
                                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px]">
                                        <p className="text-amber-800 leading-tight">
                                          <span className="font-semibold">Note:</span> Realigned to <span className="font-semibold">{displayProject.eiuPersonnel?.fullName || displayProject.eiuPersonnel?.name || displayProject.eiuPersonnelName || 'N/A'}</span> on {(() => {
                                            try {
                                              const reassignedDate = new Date(displayProject.eiuReassignedAt);
                                              if (isNaN(reassignedDate.getTime())) return displayProject.eiuReassignedAt;
                                              return reassignedDate.toLocaleString('en-PH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                              });
                                            } catch (e) {
                                              return displayProject.eiuReassignedAt;
                                            }
                                          })()}
                                        </p>
                                      </div>
                                    )}
                                  </td>
                                </>
                              )}
                              
                              {/* Timeline Information */}
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.startDate)}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.targetCompletionDate || displayProject.endDate)}</td>
                            <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                {calculateExpectedDays(displayProject.startDate, displayProject.targetCompletionDate || displayProject.endDate)}
                            </td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.actualCompletionDate || displayProject.completionDate)}</td>
                              
                              {/* Budget Information */}
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-right font-semibold bg-white">{formatCurrency(displayProject.totalBudget).replace('₱', '').trim()}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.budgetDescription || displayProject.budgetBreakdown || 'N/A'}</td>
                              
                              {/* Physical Accomplishment Information */}
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.physicalProgressRequirements || displayProject.generalDescription || displayProject.physicalDescription || displayProject.requiredDocumentation || 'N/A'}</td>
                              
                              {/* Project Phases Update - Empty when no phases (all 19 columns) */}
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white text-gray-500">N/A</td>
                              <td className="px-2 py-3 text-xs text-center bg-white text-gray-500">N/A</td>
                          </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className={`bg-gradient-to-r ${colors.headerBg} px-8 py-4 text-white text-center text-sm`}>
                <p>Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-xs text-white/80 mt-1">Build Watch Project Monitoring & Evaluation System</p>
              </div>
            </div>
            )}
          </div>
        )}

        {/* No Projects Message */}
        {!displayProject && filteredProjects.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No projects found</p>
            {searchQuery || filterStatus || filterCategory ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('');
                  setFilterCategory('');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

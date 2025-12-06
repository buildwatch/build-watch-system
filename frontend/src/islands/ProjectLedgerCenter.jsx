import React, { useState, useEffect } from 'react';

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
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'dashboard'
  
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
      case 'needsAttention':
        setSelectedStatuses(['delayed', 'at_risk', 'pending']);
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
          if (enrichedProject.milestones && enrichedProject.milestones.length > 0) {
            try {
              const milestonesResponse = await fetch(`${API_URL}/projects/${projectId}/milestones`, { headers });
              if (milestonesResponse.ok) {
                const milestonesData = await milestonesResponse.json();
                if (milestonesData.success && milestonesData.milestones) {
                  console.log(`📋 Fetched complete milestone data for project ${projectId}:`, milestonesData.milestones.length);
                  enrichedProject.milestones = milestonesData.milestones;
                }
              }
            } catch (err) {
              console.warn(`⚠️ Could not fetch milestones for project ${projectId}:`, err);
            }
          }
          
          // Fetch milestone submissions and attach to project
          if (enrichedProject.milestones && enrichedProject.milestones.length > 0) {
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
          }
          
          setSelectedProject(enrichedProject);
          setProjects([enrichedProject]);
        } else {
          // Normalize all projects EIU data structure (no API calls)
          const projectsList = data.projects || data.data || [];
          const enrichedProjects = await Promise.all(projectsList.map(async (project) => {
            const enriched = enrichProjectWithEIUData(project);
            
            // Fetch complete milestone data for this project
            if (enriched.milestones && enriched.milestones.length > 0) {
              try {
                const milestonesResponse = await fetch(`${API_URL}/projects/${enriched.id}/milestones`, { headers });
                if (milestonesResponse.ok) {
                  const milestonesData = await milestonesResponse.json();
                  if (milestonesData.success && milestonesData.milestones) {
                    console.log(`📋 Fetched complete milestone data for project ${enriched.id}:`, milestonesData.milestones.length);
                    enriched.milestones = milestonesData.milestones;
                  }
                }
              } catch (err) {
                console.warn(`⚠️ Could not fetch milestones for project ${enriched.id}:`, err);
              }
            }
            
            // Fetch milestone submissions and attach to project
            if (enriched.milestones && enriched.milestones.length > 0) {
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
        if (enrichedProject.milestones && enrichedProject.milestones.length > 0) {
          try {
            const milestonesResponse = await fetch(`${API_URL}/projects/${id}/milestones`, { headers });
            if (milestonesResponse.ok) {
              const milestonesData = await milestonesResponse.json();
              if (milestonesData.success && milestonesData.milestones) {
                console.log(`📋 Fetched complete milestone data for project ${id}:`, milestonesData.milestones.length);
                enrichedProject.milestones = milestonesData.milestones;
              }
            }
          } catch (err) {
            console.warn(`⚠️ Could not fetch milestones for project ${id}:`, err);
          }
        }
        
        // Fetch milestone submissions and attach to project
        if (enrichedProject.milestones && enrichedProject.milestones.length > 0) {
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
      const projectProgress = parseFloat(project.overallProgress || project.progress?.overall || 0);
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
          const progress = parseFloat(project.overallProgress || project.progress?.overall || 0);
          matchesQuickFilter = progress >= 80 && progress < 100;
          break;
        case 'needsAttention':
          matchesQuickFilter = project.status === 'delayed' || project.status === 'at_risk' || project.status === 'pending';
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
      budgetByCategory: {},
      progressDistribution: {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0
      },
      projectsByPriority: {},
      statusCounts: {
        ongoing: 0,
        completed: 0,
        delayed: 0,
        pending: 0,
        at_risk: 0
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
      const progress = parseFloat(project.overallProgress || project.progress?.overall || 0);
      totalProgress += progress;

      // Projects by Status
      const status = project.status || 'unknown';
      stats.projectsByStatus[status] = (stats.projectsByStatus[status] || 0) + 1;
      if (stats.statusCounts[status] !== undefined) {
        stats.statusCounts[status]++;
      }

      // Budget by Category
      const category = project.category || 'uncategorized';
      stats.budgetByCategory[category] = (stats.budgetByCategory[category] || 0) + budget;

      // Progress Distribution
      if (progress <= 20) stats.progressDistribution['0-20']++;
      else if (progress <= 40) stats.progressDistribution['21-40']++;
      else if (progress <= 60) stats.progressDistribution['41-60']++;
      else if (progress <= 80) stats.progressDistribution['61-80']++;
      else stats.progressDistribution['81-100']++;

      // Projects by Priority
      const priority = project.priority || 'medium';
      stats.projectsByPriority[priority] = (stats.projectsByPriority[priority] || 0) + 1;
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
      'pending': '#F59E0B', // amber
      'at_risk': '#F97316', // orange
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
        ['Project/Program Title:', displayProject.name || 'N/A'],
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

      // EIU Partner Contractor
      const eiuPartner = getEIUPartner(displayProject);
      if (eiuPartner) {
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
  const exportToExcel = async () => {
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
        ['Project/Program Title:', displayProject.name || 'N/A'],
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
        worksheet.getCell(`A${row}`).value = label;
        worksheet.getCell(`A${row}`).font = { bold: true };
        worksheet.getCell(`B${row}`).value = value || 'N/A';
        row++;
      });

      row++;

      // EIU Partner Contractor
      const eiuPartner = getEIUPartner(displayProject);
      if (eiuPartner) {
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
          worksheet.getCell(`A${row}`).value = label;
          worksheet.getCell(`A${row}`).font = { bold: true };
          worksheet.getCell(`B${row}`).value = safeString(value, 'N/A');
          worksheet.getCell(`B${row}`).alignment = { wrapText: true };
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
        worksheet.getCell(`A${row}`).value = label;
        worksheet.getCell(`A${row}`).font = { bold: true };
        worksheet.getCell(`B${row}`).value = value || 'N/A';
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
        worksheet.getCell(`A${row}`).value = label;
        worksheet.getCell(`A${row}`).font = { bold: true };
        worksheet.getCell(`B${row}`).value = value || 'N/A';
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
      worksheet.getCell(`A${row}`).value = physicalAccomplishment;
      worksheet.getCell(`A${row}`).alignment = { wrapText: true };
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
            worksheet.getCell(`A${row}`).value = label;
            worksheet.getCell(`A${row}`).font = { bold: true };
            worksheet.getCell(`B${row}`).value = value || 'N/A';
            worksheet.getCell(`B${row}`).alignment = { wrapText: true };
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
        rowObj.height = r <= 2 ? 25 : 20;
        
        ['A', 'B', 'C', 'D'].forEach(col => {
          const cell = worksheet.getCell(`${col}${r}`);
          if (r > 2) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
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
        'final plannedBudget': plannedBudget
      });
      
      // Get used budget from submission
      const usedBudget = parseFloat(approvedSubmission?.usedBudget || 0);
      
      // Get remaining budget from submission or calculate
      const remainingBudget = approvedSubmission?.remainingBudget !== undefined && approvedSubmission?.remainingBudget !== null
        ? parseFloat(approvedSubmission.remainingBudget)
        : (plannedBudget - usedBudget);
      
      // Get physical accomplishment weight from submission or milestone
      const physicalAccomplishmentGainedWeight = approvedSubmission?.physicalWeight || 
                                                 milestone.physicalWeight || 
                                                 milestone.weight || 
                                                 'N/A';
      
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
        budgetAllotedWeight: milestone.budgetWeight || milestone.weight || 'N/A',
        physicalAccomplishmentWeight: milestone.physicalWeight || milestone.weight || 'N/A',
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
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => applyQuickFilter('overdue')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  quickFilterPreset === 'overdue'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                ⚠️ Overdue Projects
              </button>
              <button
                onClick={() => applyQuickFilter('highPriority')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  quickFilterPreset === 'highPriority'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                🔥 High Priority
              </button>
              <button
                onClick={() => applyQuickFilter('nearCompletion')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  quickFilterPreset === 'nearCompletion'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                ✅ Near Completion
              </button>
              <button
                onClick={() => applyQuickFilter('needsAttention')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  quickFilterPreset === 'needsAttention'
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                ⚡ Needs Attention
              </button>
              <button
                onClick={() => applyQuickFilter('recentlyUpdated')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  quickFilterPreset === 'recentlyUpdated'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                🕒 Recently Updated
              </button>
              {(quickFilterPreset || searchQuery || filterStatus || filterCategory || dateRangeStart || dateRangeEnd || budgetRangeMin || budgetRangeMax || progressRangeMin || progressRangeMax || selectedStatuses.length > 0 || selectedCategories.length > 0 || selectedPriorities.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                >
                  🗑️ Clear All
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search projects by name, code, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setSelectedStatuses([]);
                  }}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                >
                  <option value="">All Status</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                  <option value="pending">Pending</option>
                  <option value="at_risk">At Risk</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setSelectedCategories([]);
                  }}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                >
                  <option value="">All Categories</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="transportation">Transportation</option>
                  <option value="health">Health</option>
                  <option value="education">Education</option>
                  <option value="social">Social Services</option>
                  <option value="environment">Environment</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm ${
                    showAdvancedFilters
                      ? `bg-gradient-to-r ${colors.gradient} text-white`
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showAdvancedFilters ? '▼' : '▶'} Advanced Filters
                </button>
                <button
                  onClick={() => setShowSavedViews(!showSavedViews)}
                  className="px-4 py-2.5 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all shadow-sm"
                >
                  💾 Saved Views ({savedViews.length})
                </button>
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className="px-4 py-2.5 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all shadow-sm"
                >
                  ⚙️ Columns
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (From)</label>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (To)</label>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Budget Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Budget (₱)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={budgetRangeMin}
                      onChange={(e) => setBudgetRangeMin(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Budget (₱)</label>
                    <input
                      type="number"
                      placeholder="No limit"
                      value={budgetRangeMax}
                      onChange={(e) => setBudgetRangeMax(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Progress Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Progress (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={progressRangeMin}
                      onChange={(e) => setProgressRangeMin(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Progress (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="100"
                      value={progressRangeMax}
                      onChange={(e) => setProgressRangeMax(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Multi-Select Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Status Multi-Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status (Multiple)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border-2 border-gray-200 rounded-lg p-2">
                      {['ongoing', 'completed', 'delayed', 'pending', 'at_risk'].map(status => (
                        <label key={status} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category Multi-Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category (Multiple)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border-2 border-gray-200 rounded-lg p-2">
                      {['infrastructure', 'transportation', 'health', 'education', 'social', 'environment'].map(category => (
                        <label key={category} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm capitalize">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priority Multi-Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority (Multiple)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border-2 border-gray-200 rounded-lg p-2">
                      {['high', 'medium', 'low'].map(priority => (
                        <label key={priority} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm capitalize">{priority}</span>
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
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                  >
                    + Save Current View
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
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-medium"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteView(view.id)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-medium"
                          >
                            Delete
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
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        saveView(viewNameToSave);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveView(viewNameToSave)}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveViewModal(false);
                        setViewNameToSave('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Column Settings Panel */}
            {showColumnSettings && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Column Visibility</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.keys(visibleColumns).map(columnKey => (
                    <label key={columnKey} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns[columnKey] || false}
                        onChange={(e) => {
                          setVisibleColumns({
                            ...visibleColumns,
                            [columnKey]: e.target.checked
                          });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm capitalize">{columnKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Project List */}
            {filteredProjects.length > 0 && !displayProject && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => {
                      const enrichedProject = enrichProjectWithEIUData(project);
                      setSelectedProject(enrichedProject);
                    }}
                    className="p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all bg-white"
                  >
                    <h3 className="font-bold text-lg mb-2 text-gray-800">{project.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Code: {project.projectCode || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Location: {project.location || 'N/A'}</p>
                  </div>
                ))}
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
                className="mb-4 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold shadow-sm no-print"
              >
                ← Back to Projects
              </button>
            )}

            {/* View Mode Toggle (Table/Dashboard) */}
            <div className="flex justify-between items-center gap-3 mb-4 flex-wrap no-print">
              <div className="flex gap-3 items-center">
                {/* Dashboard/Table Toggle */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      viewMode === 'table'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg`
                        : 'bg-transparent text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                      Table View
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      viewMode === 'dashboard'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg`
                        : 'bg-transparent text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      Dashboard
                    </div>
                  </button>
                </div>

                {/* Table View Type Toggle (only show in table mode) */}
                {viewMode === 'table' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTableView('vertical')}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                        tableView === 'vertical'
                          ? `bg-gradient-to-r ${colors.gradient} text-white shadow-xl`
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                        </svg>
                        Vertical
                      </div>
                    </button>
                    <button
                      onClick={() => setTableView('horizontal')}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                        tableView === 'horizontal'
                          ? `bg-gradient-to-r ${colors.gradient} text-white shadow-xl`
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2H19a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                        </svg>
                        Horizontal
                      </div>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Export & Print Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={exportToPDF}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : `bg-gradient-to-r ${colors.gradient} text-white hover:shadow-xl hover:scale-105`
                  }`}
                  title="Export to PDF"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  PDF
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-xl hover:scale-105'
                  }`}
                  title="Export to Excel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Excel
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 bg-gray-700 text-white hover:bg-gray-800 hover:shadow-xl hover:scale-105 no-print"
                  title="Print"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                  </svg>
                  Print
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
                    <div className="flex items-center justify-center">
                      <svg width="250" height="250" viewBox="0 0 250 250" className="transform -rotate-90">
                        {(() => {
                          const statusData = Object.entries(dashboardStats.projectsByStatus);
                          if (statusData.length === 0) {
                            return (
                              <text x="125" y="125" textAnchor="middle" fill="#6B7280" fontSize="14" transform="rotate(90 125 125)">
                                No data
                              </text>
                            );
                          }
                          const total = statusData.reduce((sum, [, count]) => sum + count, 0);
                          let currentAngle = 0;
                          const radius = 100;
                          const centerX = 125;
                          const centerY = 125;
                          
                          return statusData.map(([status, count], index) => {
                            const percentage = (count / total) * 100;
                            const angle = (count / total) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            
                            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
                            
                            const largeArc = angle > 180 ? 1 : 0;
                            
                            const pathData = [
                              `M ${centerX} ${centerY}`,
                              `L ${x1} ${y1}`,
                              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                              'Z'
                            ].join(' ');
                            
                            currentAngle += angle;
                            
                            return (
                              <g key={status}>
                                <path
                                  d={pathData}
                                  fill={getStatusColor(status)}
                                  stroke="white"
                                  strokeWidth="2"
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    if (selectedStatuses.includes(status)) {
                                      setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                    } else {
                                      setSelectedStatuses([...selectedStatuses, status]);
                                      setFilterStatus('');
                                    }
                                  }}
                                />
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    <div className="mt-4 space-y-2">
                      {Object.entries(dashboardStats.projectsByStatus).map(([status, count]) => {
                        const total = Object.values(dashboardStats.projectsByStatus).reduce((sum, c) => sum + c, 0);
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                        return (
                          <div key={status} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
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
                  </div>

                  {/* Budget by Category Bar Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Budget by Category</h3>
                    <div className="space-y-4">
                      {Object.entries(dashboardStats.budgetByCategory).length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No budget data available</p>
                      ) : (
                        Object.entries(dashboardStats.budgetByCategory)
                          .sort(([, a], [, b]) => b - a)
                          .map(([category, budget], index) => {
                            const maxBudget = Math.max(...Object.values(dashboardStats.budgetByCategory));
                            const percentage = maxBudget > 0 ? (budget / maxBudget) * 100 : 0;
                            return (
                              <div key={category} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700 capitalize">
                                    {category}
                                  </span>
                                  <span className="text-sm font-bold text-gray-800">
                                    {formatCurrency(budget)}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: getCategoryColor(category, index)
                                    }}
                                  >
                                    <span className="text-[10px] text-white font-medium">
                                      {percentage > 10 ? `${percentage.toFixed(0)}%` : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* Progress Distribution Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Progress Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(dashboardStats.progressDistribution).map(([range, count]) => {
                        const total = Object.values(dashboardStats.progressDistribution).reduce((sum, c) => sum + c, 0);
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                        const [min, max] = range.split('-').map(Number);
                        const rangeColors = {
                          '0-20': '#EF4444',
                          '21-40': '#F59E0B',
                          '41-60': '#3B82F6',
                          '61-80': '#8B5CF6',
                          '81-100': '#10B981'
                        };
                        return (
                          <div key={range} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                {range}%
                              </span>
                              <span className="text-sm font-bold text-gray-800">
                                {count} projects ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div
                                className="h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: rangeColors[range]
                                }}
                              >
                                {percentage > 5 && (
                                  <span className="text-[10px] text-white font-medium">
                                    {count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(dashboardStats.statusCounts).map(([status, count]) => (
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
                        const progress = parseFloat(project.overallProgress || project.progress?.overall || 0);
                        
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

            {/* Modern Ledger Table Container */}
            {viewMode === 'table' && (
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
                      <td className="px-6 py-4 font-semibold text-gray-700 bg-gray-50 w-1/3">Project/Program Title</td>
                      <td className="px-6 py-4 text-gray-900">{displayProject.name || 'N/A'}</td>
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

                    {/* EIU Partner Contractor */}
                    {eiuPartner && (
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
                            <th colSpan="11" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Basic Project Information</th>
                            <th colSpan="7" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">EIU Partner Contractor</th>
                            <th colSpan="4" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Timeline Information</th>
                            <th colSpan="2" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Budget Information</th>
                            <th rowSpan="2" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center align-middle bg-opacity-100 min-w-[200px]">Physical Accomplishment Information</th>
                            <th colSpan="19" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">Project Phases Update</th>
                          </tr>
                          {/* Sub-header Row */}
                          <tr className={`${colors.tableHeaderBg} text-white`}>
                            {/* Basic Project Information */}
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[200px] leading-tight">Project/Program Title</th>
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
                            
                            {/* EIU Partner Contractor */}
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Company Name</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Email/Username</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Contact Number</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Group</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[120px] leading-tight">Department</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Subrole</th>
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[150px] leading-tight">Company</th>
                            
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
                                    
                                    {/* EIU Partner Contractor */}
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.email || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.contact || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.group || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.department || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.subrole || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                                    
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
                              
                              {/* EIU Partner Contractor */}
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.email || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.contact || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.group || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.department || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.subrole || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                              
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
                              
                              {/* Project Phases Update - Empty when no phases */}
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

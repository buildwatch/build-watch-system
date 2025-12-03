import { useState, useEffect, useRef } from 'react';

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
        borderHover: 'border-green-300'
      };
    case 'LGU-IU':
      return {
        gradient: 'from-blue-500 to-blue-600',
        gradientHover: 'hover:from-blue-600 hover:to-blue-700',
        gradientText: 'from-blue-600 to-blue-700',
        gradientIcon: 'from-blue-500 to-blue-600',
        primaryText: 'text-blue-600',
        border: 'border-blue-200',
        borderHover: 'border-blue-300'
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
        borderHover: 'border-indigo-300'
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
        borderHover: 'border-cyan-300'
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
        borderHover: 'border-purple-300'
      };
    default:
      return {
        gradient: 'from-blue-500 to-blue-600',
        gradientHover: 'hover:from-blue-600 hover:to-blue-700',
        gradientText: 'from-blue-600 to-blue-700',
        gradientIcon: 'from-blue-500 to-blue-600',
        primaryText: 'text-blue-600',
        border: 'border-blue-200',
        borderHover: 'border-blue-300'
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

export default function ProjectLedgerCenter({ 
  theme = 'blue',
  userRole = null,
  projectId = null // Optional: if provided, show specific project
}) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  const colors = getThemeColors(userRole || getCurrentUserRole());
  const API_URL = getApiUrl();
  const token = getToken();

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, [projectId]);

  // If projectId is provided, fetch that specific project
  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
  }, [projectId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use public endpoint if no token or userRole is 'public'
      const isPublic = !token || userRole === 'public';
      const endpoint = projectId 
        ? (isPublic ? `${API_URL}/projects/public/${projectId}` : `${API_URL}/projects/${projectId}`)
        : (isPublic ? `${API_URL}/projects/public` : `${API_URL}/projects`);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Only add Authorization header if token exists
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
          setSelectedProject(data.project);
          setProjects([data.project]);
        } else {
          setProjects(data.projects || data.data || []);
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

  const fetchProjectDetails = async (id) => {
    try {
      setLoading(true);
      setError('');
      
      // Use public endpoint if no token or userRole is 'public'
      const isPublic = !token || userRole === 'public';
      const endpoint = isPublic 
        ? `${API_URL}/projects/public/${id}`
        : `${API_URL}/projects/${id}`;
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Only add Authorization header if token exists
      if (token && !isPublic) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const data = await response.json();
      
      if (data.success && data.project) {
        setSelectedProject(data.project);
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

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchQuery || 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !filterStatus || project.status === filterStatus;
    const matchesCategory = !filterCategory || project.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get EIU partner information
  const getEIUPartner = (project) => {
    if (project.eiuPersonnelName) {
      return {
        name: project.eiuPersonnelName,
        email: project.eiuPersonnelEmail || project.eiuPersonnelUsername || 'N/A',
        contact: project.eiuPersonnelContact || 'N/A',
        birthdate: project.eiuPersonnelBirthdate || 'N/A',
        group: project.eiuPersonnelGroup || 'N/A',
        department: project.eiuPersonnelDepartment || 'N/A',
        subrole: project.eiuPersonnelSubrole || 'N/A',
        company: project.eiuPersonnelCompany || project.eiuPersonnelName || 'N/A'
      };
    }
    return null;
  };

  // Get project phases/milestones with updates
  const getProjectPhases = (project) => {
    if (!project.milestones || project.milestones.length === 0) {
      return [];
    }

    // Get approved updates for milestones
    const updates = project.updates || [];
    const approvedUpdates = updates.filter(u => 
      u.status === 'iu_approved' || u.status === 'secretariat_approved'
    );

    return project.milestones.map(milestone => {
      // Find updates for this milestone
      const milestoneUpdates = approvedUpdates.filter(u => 
        u.milestoneUpdates?.some(mu => mu.milestoneId === milestone.id)
      );

      const latestUpdate = milestoneUpdates[0]; // Most recent approved update
      const milestoneUpdate = latestUpdate?.milestoneUpdates?.find(
        mu => mu.milestoneId === milestone.id
      );

      return {
        ...milestone,
        update: milestoneUpdate,
        submissionDate: latestUpdate?.createdAt,
        submittedBy: latestUpdate?.submittedBy || 'N/A'
      };
    });
  };

  // Calculate expected days
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

  return (
    <div className="w-full">
      {/* Page Header - Matching announcement center style */}
      <div className={`bg-white border-b ${colors.border} px-8 py-6 mb-0 -mx-8 -mt-8`}>
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
      <main className="px-8 py-8 bg-white min-h-screen">
        {/* Search and Filter Section */}
        {!projectId && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[300px]">
                <input
                  type="text"
                  placeholder="Search projects by name, code, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Project List */}
            {filteredProjects.length > 0 && !displayProject && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all"
                  >
                    <h3 className="font-bold text-lg mb-2">{project.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Code: {project.projectCode || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Location: {project.location || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Project Ledger Table - RPMES Style */}
        {displayProject && (
          <div className="space-y-6">
            {/* Back Button */}
            {!projectId && (
              <button
                onClick={() => setSelectedProject(null)}
                className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                ← Back to Projects
              </button>
            )}

            {/* Ledger Table Container */}
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 border-b-2 border-gray-300">
                <h2 className="text-xl font-bold text-gray-800">
                  REGIONAL PROJECT MONITORING AND EVALUATION SYSTEM (RPMES) PHYSICAL AND FINANCIAL ACCOMPLISHMENT REPORT
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Implementing Agency: {displayProject.implementingOfficeName || displayProject.implementingUnitName || 'N/A'}
                </p>
              </div>

              {/* Basic Project Information Section */}
              <div className="p-6 border-b-2 border-gray-300">
                <h3 className="text-lg font-bold mb-4 text-gray-800">BASIC PROJECT INFORMATION</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Project/Program Title:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{displayProject.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Project Code:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{displayProject.projectCode || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Implementing Office:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{displayProject.implementingOfficeName || displayProject.implementingUnitName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border capitalize">{displayProject.category || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location/Barangay:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{displayProject.location || displayProject.barangay || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Priority:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border uppercase">{displayProject.priority || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Funding Source:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{displayProject.fundingSource || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Created Date:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{formatDate(displayProject.createdAt)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Project Description:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[60px]">{displayProject.description || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expected Outputs:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[60px]">{displayProject.expectedOutputs || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Beneficiaries:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[60px]">{displayProject.targetBeneficiaries || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* EIU Partner Contractor Section */}
              {eiuPartner && (
                <div className="p-6 border-b-2 border-gray-300 bg-blue-50">
                  <h3 className="text-lg font-bold mb-4 text-gray-800">EIU PARTNER CONTRACTOR</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.company}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email/Username:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.contact}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Birthdate:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.birthdate}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Group:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.group}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Department:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.department}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Subrole:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.subrole}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Company:</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{eiuPartner.company}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Information Section */}
              <div className="p-6 border-b-2 border-gray-300">
                <h3 className="text-lg font-bold mb-4 text-gray-800">TIMELINE INFORMATION</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{formatDate(displayProject.startDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Completion Date:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{formatDate(displayProject.targetCompletionDate || displayProject.endDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expected Days of Completion:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                      {calculateExpectedDays(displayProject.startDate, displayProject.targetCompletionDate || displayProject.endDate)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Actual Completion Date:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{formatDate(displayProject.actualCompletionDate || displayProject.completionDate)}</p>
                  </div>
                </div>
              </div>

              {/* Budget Information Section */}
              <div className="p-6 border-b-2 border-gray-300">
                <h3 className="text-lg font-bold mb-4 text-gray-800">BUDGET INFORMATION</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Total Budget Allocation (₱):</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border font-semibold">{formatCurrency(displayProject.totalBudget)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Budget Description:</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[60px]">{displayProject.budgetDescription || displayProject.budgetBreakdown || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Physical Accomplishment Information Section */}
              <div className="p-6 border-b-2 border-gray-300">
                <h3 className="text-lg font-bold mb-4 text-gray-800">PHYSICAL ACCOMPLISHMENT INFORMATION</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">General Description:</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[60px]">
                    {displayProject.physicalProgressDescription || displayProject.generalDescription || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Project Phases Update Section */}
              {phases.length > 0 && (
                <div className="p-6 border-b-2 border-gray-300">
                  <h3 className="text-lg font-bold mb-4 text-gray-800">PROJECT PHASES UPDATE</h3>
                  <p className="text-sm text-gray-600 mb-4 italic">
                    Updates from EIU per phases/milestone that are approved by LGU-IU
                  </p>
                  
                  <div className="space-y-6">
                    {phases.map((phase, index) => (
                      <div key={phase.id || index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="font-bold text-md mb-4 text-gray-800">Phase {index + 1}: {phase.title || phase.name || 'Untitled Phase'}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phase (Item of Work):</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border">{phase.title || phase.name || 'N/A'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Description:</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border min-h-[60px]">{phase.description || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Planned Budget:</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formatCurrency(phase.plannedBudget || phase.budgetAllocation)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Breakdown Description:</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border min-h-[60px]">{phase.budgetBreakdown || phase.breakdownDescription || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Budget Alloted Weight:</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border">{phase.weight || phase.budgetWeight || 'N/A'}%</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Physical Accomplishment Weight:</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border">{phase.physicalWeight || phase.weight || 'N/A'}%</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date:</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formatDate(phase.startDate)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Target Completion Date:</label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formatDate(phase.dueDate || phase.targetDate)}</p>
                          </div>
                          {phase.update && (
                            <>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Submission Date:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formatDate(phase.submissionDate)}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Actual Phase Completion Date:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formatDate(phase.update.actualCompletionDate || phase.update.completionDate)}</p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Timeline Activities & Deliverables:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border min-h-[60px]">{phase.update.timelineActivities || phase.update.activities || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Used Budget:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formatCurrency(phase.update.usedBudget || phase.update.budgetUsed)}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Remaining Budget:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border">{formatCurrency((phase.plannedBudget || phase.budgetAllocation || 0) - (phase.update.usedBudget || phase.update.budgetUsed || 0))}</p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Budget Breakdown & Allocation:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border min-h-[60px]">{phase.update.budgetBreakdown || phase.update.budgetAllocation || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Physical Accomplishment Gained Weight:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border">{phase.update.physicalAccomplishmentWeight || phase.update.progress || 'N/A'}%</p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Photo Proof:</label>
                                <div className="flex flex-wrap gap-2">
                                  {phase.update.photoProof && phase.update.photoProof.length > 0 ? (
                                    phase.update.photoProof.map((photo, idx) => (
                                      <img key={idx} src={photo} alt={`Proof ${idx + 1}`} className="w-24 h-24 object-cover rounded border" />
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500">No photos available</p>
                                  )}
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Video Proof:</label>
                                <div className="flex flex-wrap gap-2">
                                  {phase.update.videoProof && phase.update.videoProof.length > 0 ? (
                                    phase.update.videoProof.map((video, idx) => (
                                      <video key={idx} src={video} controls className="w-48 h-32 object-cover rounded border" />
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500">No videos available</p>
                                  )}
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Document Proof:</label>
                                <div className="flex flex-wrap gap-2">
                                  {phase.update.documentProof && phase.update.documentProof.length > 0 ? (
                                    phase.update.documentProof.map((doc, idx) => (
                                      <a key={idx} href={doc} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        Document {idx + 1}
                                      </a>
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500">No documents available</p>
                                  )}
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Physical Progress Description:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border min-h-[60px]">{phase.update.physicalDescription || phase.update.description || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Submitted By:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border">{phase.submittedBy}</p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks and Recommendation:</label>
                                <p className="text-sm text-gray-900 bg-white p-2 rounded border min-h-[60px]">{phase.update.remarks || phase.update.recommendation || 'N/A'}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="bg-gray-100 px-6 py-4 text-center text-sm text-gray-600">
                <p>Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
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


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
  
  const colors = getThemeColors(userRole || getCurrentUserRole());
  const API_URL = getApiUrl();
  const token = getToken();

  useEffect(() => {
    fetchProjects();
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
  }, [projectId]);

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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchQuery || 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !filterStatus || project.status === filterStatus;
    const matchesCategory = !filterCategory || project.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

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

  const getProjectPhases = (project) => {
    if (!project.milestones || project.milestones.length === 0) {
      return [];
    }

    const updates = project.updates || [];
    const approvedUpdates = updates.filter(u => 
      u.status === 'iu_approved' || u.status === 'secretariat_approved'
    );

    return project.milestones.map(milestone => {
      const milestoneUpdates = approvedUpdates.filter(u => 
        u.milestoneUpdates?.some(mu => mu.milestoneId === milestone.id)
      );

      const latestUpdate = milestoneUpdates[0];
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
      {/* Page Header */}
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
      <main className="px-8 py-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">
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
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
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

            {/* Project List */}
            {filteredProjects.length > 0 && !displayProject && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
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
          <div className="space-y-6">
            {/* Back Button */}
            {!projectId && (
              <button
                onClick={() => setSelectedProject(null)}
                className="mb-4 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold shadow-sm"
              >
                ← Back to Projects
              </button>
            )}

            {/* View Toggle Buttons */}
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={() => setTableView('vertical')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                  tableView === 'vertical'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-xl`
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                  </svg>
                  Vertical Table View
                </div>
              </button>
              <button
                onClick={() => setTableView('horizontal')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                  tableView === 'horizontal'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-xl`
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2H19a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                  </svg>
                  Horizontal Table View
                </div>
              </button>
            </div>

            {/* Modern Ledger Table Container */}
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
                      <td className="px-6 py-4 text-gray-900">{displayProject.fundingSource || 'N/A'}</td>
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
                          <td className="px-6 py-4 font-semibold text-gray-700 bg-blue-50/50">Birthdate</td>
                          <td className="px-6 py-4 text-gray-900">{eiuPartner.birthdate}</td>
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
                        {displayProject.physicalProgressDescription || displayProject.generalDescription || 'N/A'}
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
                              <td className="px-6 py-4 text-gray-900">{formatCurrency(phase.plannedBudget || phase.budgetAllocation)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Breakdown Description</td>
                              <td className="px-6 py-4 text-gray-900">{phase.budgetBreakdown || phase.breakdownDescription || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Budget Alloted Weight</td>
                              <td className="px-6 py-4 text-gray-900">{phase.weight || phase.budgetWeight || 'N/A'}%</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Physical Accomplishment Weight</td>
                              <td className="px-6 py-4 text-gray-900">{phase.physicalWeight || phase.weight || 'N/A'}%</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Start Date</td>
                              <td className="px-6 py-4 text-gray-900">{formatDate(phase.startDate)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Target Completion Date</td>
                              <td className="px-6 py-4 text-gray-900">{formatDate(phase.dueDate || phase.targetDate)}</td>
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
                              <td className="px-6 py-4 text-gray-900">{formatDate(phase.update?.actualCompletionDate || phase.update?.completionDate)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Timeline Activities & Deliverables</td>
                              <td className="px-6 py-4 text-gray-900">{phase.update?.timelineActivities || phase.update?.activities || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Used Budget</td>
                              <td className="px-6 py-4 text-gray-900">{formatCurrency(phase.update?.usedBudget || phase.update?.budgetUsed || 0)}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Remaining Budget</td>
                              <td className="px-6 py-4 text-gray-900">
                                {formatCurrency((phase.plannedBudget || phase.budgetAllocation || 0) - (phase.update?.usedBudget || phase.update?.budgetUsed || 0))}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Budget Breakdown & Allocation</td>
                              <td className="px-6 py-4 text-gray-900">{phase.update?.budgetBreakdown || phase.update?.budgetAllocation || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Physical Accomplishment Gained Weight</td>
                              <td className="px-6 py-4 text-gray-900">{phase.update?.physicalAccomplishmentWeight || phase.update?.progress || 'N/A'}%</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Photo Proof</td>
                              <td className="px-6 py-4 text-gray-900">
                                {phase.update?.photoProof && phase.update.photoProof.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {phase.update.photoProof.map((photo, idx) => (
                                      <img key={idx} src={photo} alt={`Proof ${idx + 1}`} className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow" />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No photos available</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Video Proof</td>
                              <td className="px-6 py-4 text-gray-900">
                                {phase.update?.videoProof && phase.update.videoProof.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {phase.update.videoProof.map((video, idx) => (
                                      <video key={idx} src={video} controls className="w-48 h-32 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No videos available</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Document Proof</td>
                              <td className="px-6 py-4 text-gray-900">
                                {phase.update?.documentProof && phase.update.documentProof.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {phase.update.documentProof.map((doc, idx) => (
                                      <a key={idx} href={doc} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                        Document {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No documents available</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Physical Progress Description</td>
                              <td className="px-6 py-4 text-gray-900">{phase.update?.physicalDescription || phase.update?.description || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30">Submitted By</td>
                              <td className="px-6 py-4 text-gray-900">{phase.submittedBy || 'N/A'}</td>
                            </tr>
                            <tr className="border-b-2 border-gray-300 hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-700 bg-indigo-50/30 align-top">Remarks and Recommendation</td>
                              <td className="px-6 py-4 text-gray-900">{phase.update?.remarks || phase.update?.recommendation || 'N/A'}</td>
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
                            <th colSpan="8" className="px-3 py-3 text-xs font-bold border-r border-white/30 border-b border-white/30 text-center bg-opacity-100">EIU Partner Contractor</th>
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
                            <th className="px-2 py-2 text-[10px] font-semibold border-r border-white/30 text-center bg-opacity-100 min-w-[100px] leading-tight">Birthdate</th>
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
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{displayProject.fundingSource || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.createdAt)}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.description || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.expectedOutputs || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.targetBeneficiaries || 'N/A'}</td>
                                    
                                    {/* EIU Partner Contractor */}
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.email || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.contact || 'N/A'}</td>
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{eiuPartner?.birthdate || 'N/A'}</td>
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
                                    <td rowSpan={phases.length} className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.physicalProgressDescription || displayProject.generalDescription || 'N/A'}</td>
                                  </>
                                ) : null}
                                
                                {/* Project Phases Update - Different per phase, shown in all rows */}
                                <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{phase.title || phase.name || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.description || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-right bg-white">{formatCurrency(phase.plannedBudget || phase.budgetAllocation || 0).replace('₱', '').trim()}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.budgetBreakdown || phase.breakdownDescription || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{phase.weight || phase.budgetWeight || 'N/A'}%</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{phase.physicalWeight || phase.weight || 'N/A'}%</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.startDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.dueDate || phase.targetDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.submissionDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(phase.update?.actualCompletionDate || phase.update?.completionDate)}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.update?.timelineActivities || phase.update?.activities || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-right bg-white">{formatCurrency(phase.update?.usedBudget || phase.update?.budgetUsed || 0).replace('₱', '').trim()}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-right bg-white">
                                  {formatCurrency((phase.plannedBudget || phase.budgetAllocation || 0) - (phase.update?.usedBudget || phase.update?.budgetUsed || 0)).replace('₱', '').trim()}
                                </td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.update?.budgetBreakdown || phase.update?.budgetAllocation || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{phase.update?.physicalAccomplishmentWeight || phase.update?.progress || 'N/A'}%</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                  {phase.update?.photoProof && phase.update.photoProof.length > 0 
                                    ? `${phase.update.photoProof.length} photo(s)` 
                                    : 'N/A'}
                                </td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                  {phase.update?.videoProof && phase.update.videoProof.length > 0 
                                    ? `${phase.update.videoProof.length} video(s)` 
                                    : 'N/A'}
                                </td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">
                                  {phase.update?.documentProof && phase.update.documentProof.length > 0 
                                    ? `${phase.update.documentProof.length} document(s)` 
                                    : 'N/A'}
                                </td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{phase.update?.physicalDescription || phase.update?.description || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{phase.submittedBy || 'N/A'}</td>
                                <td className="px-2 py-3 text-xs align-top bg-white">{phase.update?.remarks || phase.update?.recommendation || 'N/A'}</td>
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
                            <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{displayProject.fundingSource || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{formatDate(displayProject.createdAt)}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.description || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.expectedOutputs || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.targetBeneficiaries || 'N/A'}</td>
                              
                              {/* EIU Partner Contractor */}
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.company || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.email || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 bg-white">{eiuPartner?.contact || 'N/A'}</td>
                              <td className="px-2 py-3 text-xs border-r border-gray-400 text-center bg-white">{eiuPartner?.birthdate || 'N/A'}</td>
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
                              <td className="px-2 py-3 text-xs border-r border-gray-400 align-top bg-white">{displayProject.physicalProgressDescription || displayProject.generalDescription || 'N/A'}</td>
                              
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

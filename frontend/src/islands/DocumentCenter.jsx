import { useState, useEffect, useCallback } from 'react';

/**
 * DocumentCenter - Centralized files & documents repository management component
 * 
 * Supports multiple user roles with different organization structures:
 * - MPMEC Secretariat/MPMEC: Project → Milestone → File Type
 * - EIU: Partner Department → Project → Milestone → File Type
 * - LGU-IU: Project → Milestone → File Type
 * 
 * @param {Object} props
 * @param {string} props.userRole - User role ('secretariat', 'mpmec', 'eiu', 'lgu-iu')
 * @param {string} props.apiUrl - API base URL
 * @param {string} props.token - Authentication token
 * @param {string} props.theme - Theme color ('sky', 'blue', 'green', 'orange')
 */
export default function DocumentCenter({
  userRole = 'secretariat',
  apiUrl = 'http://localhost:3000/api',
  token = '',
  theme = 'sky'
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'compact'
  const [currentPath, setCurrentPath] = useState([]); // Navigation breadcrumbs
  const [selectedFileType, setSelectedFileType] = useState('all'); // 'all', 'documents', 'photos', 'videos', 'other'
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Data structures
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  
  // Modal states for full-view
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalDocuments: 0,
    totalPhotos: 0,
    totalVideos: 0,
    totalAudio: 0,
    totalOther: 0,
    storageUsed: 0,
    pendingApprovals: 0,
    lastUpdated: new Date().toISOString()
  });

  // Theme color mappings
  const themeColors = {
    sky: {
      primary: 'sky',
      gradient: 'from-sky-500 to-sky-600',
      ring: 'ring-sky-500',
      text: 'text-sky-600',
      bg: 'bg-sky-50'
    },
    blue: {
      primary: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      ring: 'ring-blue-500',
      text: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    green: {
      primary: 'green',
      gradient: 'from-green-500 to-green-600',
      ring: 'ring-green-500',
      text: 'text-green-600',
      bg: 'bg-green-50'
    },
    orange: {
      primary: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      ring: 'ring-orange-500',
      text: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  };

  const colors = themeColors[theme] || themeColors.sky;

  // Fetch evidence files from API
  const fetchEvidenceFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch evidence files based on role
      let evidenceResponse;
      if (userRole === 'secretariat' || userRole === 'mpmec') {
        // For Secretariat/MPMEC: Get all approved evidence files
        evidenceResponse = await fetch(`${apiUrl}/milestones/secretariat/evidence-files`, {
          headers
        });
      } else if (userRole === 'eiu') {
        // For EIU: Get files from their submitted updates
        evidenceResponse = await fetch(`${apiUrl}/milestones/eiu/evidence-files`, {
          headers
        });
      } else if (userRole === 'lgu-iu') {
        // For LGU-IU: Get files from approved milestones
        evidenceResponse = await fetch(`${apiUrl}/milestones/lgu-iu/evidence-files`, {
          headers
        });
      }

      if (!evidenceResponse || !evidenceResponse.ok) {
        throw new Error('Failed to fetch evidence files');
      }

      const evidenceData = await evidenceResponse.json();
      if (evidenceData.success) {
        setEvidenceFiles(evidenceData.files || []);
      }

      // Fetch projects for organization
      const projectsResponse = await fetch(`${apiUrl}/projects`, { headers });
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        if (projectsData.success) {
          setProjects(projectsData.projects || []);
        }
      }

      // Calculate stats
      calculateStats(evidenceData.files || []);

    } catch (err) {
      console.error('Error fetching evidence files:', err);
      setError(err.message || 'Failed to load evidence files');
    } finally {
      setLoading(false);
    }
  }, [userRole, apiUrl, token]);

  // Calculate statistics
  const calculateStats = (files) => {
    const stats = {
      totalFiles: files.length,
      totalDocuments: 0,
      totalPhotos: 0,
      totalVideos: 0,
      totalAudio: 0,
      totalOther: 0,
      storageUsed: 0,
      pendingApprovals: 0,
      lastUpdated: new Date().toISOString()
    };

    files.forEach(file => {
      const fileType = file.type?.toLowerCase() || 'other';
      if (fileType === 'documents' || fileType === 'document') {
        stats.totalDocuments++;
      } else if (fileType === 'photos' || fileType === 'photo') {
        stats.totalPhotos++;
      } else if (fileType === 'videos' || fileType === 'video') {
        stats.totalVideos++;
      } else if (fileType === 'audio') {
        stats.totalAudio++;
      } else {
        stats.totalOther++;
      }

      if (file.fileSize) {
        stats.storageUsed += file.fileSize;
      }

      if (file.status === 'pending' || file.status === 'pending_approval') {
        stats.pendingApprovals++;
      }
    });

    setStats(stats);
  };

  // Organize files by role-specific structure
  const organizeFiles = () => {
    if (userRole === 'eiu') {
      // EIU: Partner Department → Project → Milestone → File Type
      return organizeByDepartmentProjectMilestone();
    } else if (userRole === 'lgu-iu') {
      // LGU-IU: Project → Milestone → File Type
      return organizeByProjectMilestone();
    } else {
      // MPMEC Secretariat/MPMEC: Project → Milestone → File Type
      return organizeByProjectMilestone();
    }
  };

  // Organize by Project → Milestone → File Type
  const organizeByProjectMilestone = () => {
    const organized = {};

    evidenceFiles.forEach(file => {
      const projectId = file.projectId;
      const milestoneId = file.milestoneId;
      const fileType = categorizeFileType(file.type);

      if (!organized[projectId]) {
        organized[projectId] = {
          projectId,
          projectName: file.projectName || 'Unknown Project',
          milestones: {}
        };
      }

      if (!organized[projectId].milestones[milestoneId]) {
        organized[projectId].milestones[milestoneId] = {
          milestoneId,
          milestoneTitle: file.milestoneTitle || 'Unknown Milestone',
          files: {
            documents: [],
            photos: [],
            videos: [],
            other: []
          }
        };
      }

      organized[projectId].milestones[milestoneId].files[fileType].push(file);
    });

    return organized;
  };

  // Organize by Department → Project → Milestone → File Type (for EIU)
  const organizeByDepartmentProjectMilestone = () => {
    const organized = {};

    evidenceFiles.forEach(file => {
      // For EIU, we need to get the partner department from the project
      const project = projects.find(p => p.id === file.projectId);
      const departmentName = project?.implementingOfficeName || 'Unknown Department';
      const projectId = file.projectId;
      const milestoneId = file.milestoneId;
      const fileType = categorizeFileType(file.type);

      if (!organized[departmentName]) {
        organized[departmentName] = {
          departmentName,
          projects: {}
        };
      }

      if (!organized[departmentName].projects[projectId]) {
        organized[departmentName].projects[projectId] = {
          projectId,
          projectName: file.projectName || 'Unknown Project',
          milestones: {}
        };
      }

      if (!organized[departmentName].projects[projectId].milestones[milestoneId]) {
        organized[departmentName].projects[projectId].milestones[milestoneId] = {
          milestoneId,
          milestoneTitle: file.milestoneTitle || 'Unknown Milestone',
          files: {
            documents: [],
            photos: [],
            videos: [],
            other: []
          }
        };
      }

      organized[departmentName].projects[projectId].milestones[milestoneId].files[fileType].push(file);
    });

    return organized;
  };

  // Categorize file type
  const categorizeFileType = (type) => {
    const normalizedType = (type || '').toLowerCase();
    if (normalizedType.includes('document') || normalizedType.includes('doc') || 
        normalizedType.includes('pdf') || normalizedType.includes('xls') || 
        normalizedType.includes('xlsx') || normalizedType.includes('word')) {
      return 'documents';
    } else if (normalizedType.includes('photo') || normalizedType.includes('image') || 
               normalizedType.includes('jpg') || normalizedType.includes('jpeg') || 
               normalizedType.includes('png') || normalizedType.includes('gif')) {
      return 'photos';
    } else if (normalizedType.includes('video') || normalizedType.includes('mp4') || 
               normalizedType.includes('mov') || normalizedType.includes('avi')) {
      return 'videos';
    } else if (normalizedType.includes('audio') || normalizedType.includes('mp3') || 
               normalizedType.includes('wav')) {
      return 'other'; // Audio goes to "other"
    }
    return 'other';
  };

  // Filter files based on current filters
  const getFilteredFiles = () => {
    let filtered = [...evidenceFiles];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        (file.name || '').toLowerCase().includes(query) ||
        (file.projectName || '').toLowerCase().includes(query) ||
        (file.milestoneTitle || '').toLowerCase().includes(query)
      );
    }

    // File type filter
    if (selectedFileType !== 'all') {
      filtered = filtered.filter(file => {
        const fileType = categorizeFileType(file.type);
        return fileType === selectedFileType;
      });
    }

    // Department filter (for EIU)
    if (departmentFilter && userRole === 'eiu') {
      filtered = filtered.filter(file => {
        const project = projects.find(p => p.id === file.projectId);
        return project?.implementingOfficeName === departmentFilter;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(file => file.status === statusFilter);
    }

    return filtered;
  };

  // Navigation handlers
  const navigateTo = (path) => {
    setCurrentPath(path);
  };

  const navigateBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (token) {
      fetchEvidenceFiles();
    }
  }, [fetchEvidenceFiles, token]);

  // Set up real-time updates (polling every 30 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetchEvidenceFiles();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchEvidenceFiles, token]);

  const organizedData = organizeFiles();
  const filteredFiles = getFilteredFiles();

  return (
    <div className="document-center w-full">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
             onClick={() => setSelectedFileType('all')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-black">{stats.totalFiles}</p>
              <p className={`text-xs ${colors.text} mt-1`}>All evidence types</p>
            </div>
            <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
             onClick={() => setSelectedFileType('documents')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Documents</p>
              <p className="text-2xl font-bold text-black">{stats.totalDocuments}</p>
              <p className={`text-xs ${colors.text} mt-1`}>PDF, DOC, XLS</p>
            </div>
            <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
             onClick={() => setSelectedFileType('photos')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Photos</p>
              <p className="text-2xl font-bold text-black">{stats.totalPhotos}</p>
              <p className={`text-xs ${colors.text} mt-1`}>Images</p>
            </div>
            <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
             onClick={() => setSelectedFileType('videos')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Videos</p>
              <p className="text-2xl font-bold text-black">{stats.totalVideos}</p>
              <p className={`text-xs ${colors.text} mt-1`}>Video files</p>
            </div>
            <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`bg-gradient-to-br ${colors.gradient} p-2 rounded-lg`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-black">Search & Filter Documents</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Files</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename, tags, uploader..."
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 ${colors.ring} focus:border-transparent transition-all duration-200 bg-white`}
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>

          {userRole === 'eiu' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 ${colors.ring} focus:border-transparent transition-all duration-200 bg-white`}
              >
                <option value="">All Departments</option>
                {Array.from(new Set(projects.map(p => p.implementingOfficeName).filter(Boolean))).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">File Type</label>
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 ${colors.ring} focus:border-transparent transition-all duration-200 bg-white`}
            >
              <option value="all">All Types</option>
              <option value="documents">Documents</option>
              <option value="photos">Photos</option>
              <option value="videos">Videos</option>
              <option value="other">Other Files</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 ${colors.ring} focus:border-transparent transition-all duration-200 bg-white`}
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${colors.primary}-600`}></div>
          <span className="ml-3 text-gray-600">Loading documents...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Content Area - Rendered based on current navigation path */}
      {!loading && !error && renderContent()}
    </div>
  );

  // Navigate to a specific path level
  function navigateToPath(pathIndex) {
    if (pathIndex < 0 || pathIndex >= currentPath.length) return;
    setCurrentPath(currentPath.slice(0, pathIndex + 1));
  }

  // Get breadcrumb label for a path item
  function getBreadcrumbLabel(pathItem, index) {
    const [level, id] = pathItem;
    
    if (level === 'department') {
      return id; // Department name
    } else if (level === 'project') {
      const organized = userRole === 'eiu' ? organizeByDepartmentProjectMilestone() : organizeByProjectMilestone();
      for (const key in organized) {
        const item = organized[key];
        if (userRole === 'eiu') {
          for (const projId in item.projects) {
            if (projId === id) {
              return item.projects[projId].projectName;
            }
          }
        } else {
          if (item.id === id) {
            return item.projectName;
          }
        }
      }
      return 'Project';
    } else if (level === 'milestone') {
      const organized = userRole === 'eiu' ? organizeByDepartmentProjectMilestone() : organizeByProjectMilestone();
      for (const key in organized) {
        const item = organized[key];
        if (userRole === 'eiu') {
          for (const projId in item.projects) {
            const proj = item.projects[projId];
            if (proj.milestones && proj.milestones[id]) {
              return proj.milestones[id].milestoneTitle;
            }
          }
        } else {
          if (item.milestones && item.milestones[id]) {
            return item.milestones[id].milestoneTitle;
          }
        }
      }
      return 'Milestone';
    } else if (level === 'filetype') {
      const fileTypeLabels = {
        'documents': 'Documents',
        'photos': 'Photos',
        'videos': 'Videos',
        'other': 'Other Files'
      };
      return fileTypeLabels[id] || id;
    }
    return 'Unknown';
  }

  // Render modern breadcrumbs with back button
  function renderBreadcrumbs() {
    if (currentPath.length === 0) return null;

    return (
      <div className="flex items-center gap-3 mb-6">
        {/* Modern Back Button */}
        <button
          onClick={() => {
            if (currentPath.length > 0) {
              setCurrentPath(currentPath.slice(0, -1));
            } else {
              setCurrentPath([]);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-semibold text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>Back</span>
        </button>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
          <button
            onClick={() => setCurrentPath([])}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            All Documents
          </button>
          {currentPath.map((path, idx) => (
            <span key={idx} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
              <button
                onClick={() => navigateToPath(idx)}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors truncate max-w-[200px]"
                title={getBreadcrumbLabel(path, idx)}
              >
                {getBreadcrumbLabel(path, idx)}
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Render content based on navigation path
  function renderContent() {
    // If no path, show top-level view
    if (currentPath.length === 0) {
      if (userRole === 'eiu') {
        return renderDepartmentView();
      } else if (userRole === 'secretariat' || userRole === 'mpmec') {
        // For Secretariat/MPMEC: Show Department portal first
        return renderDepartmentView();
      } else {
        // For LGU-IU: Show projects directly
        return renderProjectView();
      }
    }

    const [level, id] = currentPath[currentPath.length - 1];

    if (level === 'department') {
      return renderProjectView(id);
    } else if (level === 'project') {
      return renderMilestoneView(id);
    } else if (level === 'milestone') {
      return renderFileTypeView(id);
    } else if (level === 'filetype') {
      return renderFilesList(id);
    }

    return renderProjectView();
  }

  // Get department logo based on department name
  function getDepartmentLogo(deptName) {
    if (!deptName) return null;
    
    const name = deptName.toLowerCase();
    
    if (name.includes('engineer') || name.includes('meo') || name.includes('municipal engineer')) {
      return '/meo-logo.jfif';
    } else if (name.includes('disaster') || name.includes('risk reduction') || name.includes('mdrrmo') || name.includes('municipal disaster')) {
      return '/mdrrmo-logo.jfif';
    } else if (name.includes('environment') || name.includes('natural resources') || name.includes('menro') || name.includes('municipal environment')) {
      return '/menro-logo.jfif';
    } else if (name.includes('agriculturist') || name.includes('agricultur') || name.includes('mao')) {
      return '/mao-logo.jfif';
    } else if (name.includes('social welfare') || name.includes('welfare') || name.includes('mswdo')) {
      return '/mswdo-logo.jfif';
    }
    
    return null; // Return null to use default icon
  }

  // Render department view (EIU, Secretariat, MPMEC)
  function renderDepartmentView() {
    let deptData;
    if (userRole === 'eiu') {
      deptData = organizeByDepartmentProjectMilestone();
    } else if (userRole === 'secretariat' || userRole === 'mpmec') {
      // For Secretariat/MPMEC: Organize by implementing office (department)
      const projectData = organizeByProjectMilestone();
      deptData = {};
      
      // Group projects by implementing office
      Object.keys(projectData).forEach(projectId => {
        const project = projects.find(p => p.id === projectId);
        const deptName = project?.implementingOfficeName || 'Unknown Department';
        
        if (!deptData[deptName]) {
          deptData[deptName] = {
            departmentName: deptName,
            projects: {}
          };
        }
        
        deptData[deptName].projects[projectId] = projectData[projectId];
      });
    } else {
      // For LGU-IU: Should not show department view
      return renderProjectView();
    }

    const departments = Object.keys(deptData);

    if (departments.length === 0) {
      return (
        <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-200 text-center">
          <div className={`bg-${colors.primary}-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center`}>
            <svg className={`w-12 h-12 text-${colors.primary}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Evidence Files Found</h3>
          <p className="text-gray-600">No evidence files are available yet. Files will appear here once they are uploaded and approved.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black">
            {userRole === 'eiu' ? 'Partner Departments' : 'Implementing Offices'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? `bg-${colors.primary}-100 text-${colors.primary}-600` : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? `bg-${colors.primary}-100 text-${colors.primary}-600` : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {departments.map(deptName => {
            const dept = deptData[deptName];
            const projectCount = Object.keys(dept.projects || {}).length;
            const totalFiles = Object.values(dept.projects || {}).reduce((sum, proj) => {
              return sum + Object.values(proj.milestones || {}).reduce((mSum, milestone) => {
                return mSum + (milestone.files?.documents?.length || 0) + (milestone.files?.photos?.length || 0) + 
                       (milestone.files?.videos?.length || 0) + (milestone.files?.other?.length || 0);
              }, 0);
            }, 0);

            const deptLogo = getDepartmentLogo(deptName);
            
            return (
              <div
                key={deptName}
                onClick={() => navigateTo([...currentPath, ['department', deptName]])}
                className="bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl p-8 border-2 border-gray-200 hover:border-gray-400 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-[1.03] group relative overflow-hidden"
              >
                {/* Enhanced Background decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-gray-100/60 via-gray-50/40 to-transparent rounded-bl-full opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-gray-50/40 to-transparent rounded-tr-full opacity-40"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-6">
                    {/* Enhanced Department Logo/Icon */}
                    <div className={`bg-gradient-to-br ${colors.gradient} p-5 rounded-3xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative overflow-hidden`}>
                      {deptLogo ? (
                        <div className="w-16 h-16 bg-white rounded-2xl p-2 flex items-center justify-center shadow-inner">
                          <img 
                            src={deptLogo} 
                            alt={deptName}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextElementSibling) {
                                e.target.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-gray-500 font-bold text-2xl" style={{ display: 'none' }}>
                            {deptName.charAt(0)}
                          </div>
                        </div>
                      ) : (
                        <svg className="w-12 h-12 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                      )}
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-white/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">{deptName}</h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {userRole === 'eiu' ? 'Partner department' : 'Implementing office'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group-hover:shadow-lg">
                      <p className="text-4xl font-bold text-black mb-2 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{projectCount}</p>
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Projects</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group-hover:shadow-lg">
                      <p className="text-4xl font-bold text-black mb-2 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{totalFiles}</p>
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Files</p>
                    </div>
                  </div>
                  
                  {/* Enhanced Footer */}
                  <div className="pt-5 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Click to explore</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">View projects</span>
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-2 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render project view with ProjectCard-style layout
  function renderProjectView(departmentName = null) {
    let projectData;
    if (userRole === 'eiu' && departmentName) {
      const deptData = organizeByDepartmentProjectMilestone();
      projectData = deptData[departmentName]?.projects || {};
    } else {
      projectData = organizeByProjectMilestone();
    }

    const projectIds = Object.keys(projectData);

    if (projectIds.length === 0) {
      return (
        <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-200 text-center">
          <div className={`bg-${colors.primary}-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center`}>
            <svg className={`w-12 h-12 text-${colors.primary}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Projects Found</h3>
          <p className="text-gray-600">No projects with evidence files are available yet.</p>
        </div>
      );
    }

    // Get full project data for ProjectCard-style rendering
    const projectsToRender = projectIds.map(projectId => {
      const project = projects.find(p => p.id === projectId);
      const organizedProject = projectData[projectId];
      return {
        ...project,
        milestoneCount: Object.keys(organizedProject.milestones).length,
        totalFiles: Object.values(organizedProject.milestones).reduce((sum, milestone) => {
          return sum + milestone.files.documents.length + milestone.files.photos.length + 
                 milestone.files.videos.length + milestone.files.other.length;
        }, 0)
      };
    });

    return (
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        {/* Modern Breadcrumbs with Back Button */}
        {renderBreadcrumbs()}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black">
            {departmentName ? `${departmentName} - Projects` : 'Projects'}
          </h2>
          <div className="text-sm text-gray-600">
            {projectsToRender.length} {projectsToRender.length === 1 ? 'Project' : 'Projects'} Available
          </div>
        </div>

        {/* Project Cards Grid - Similar to ProjectCard.astro */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsToRender.map(project => {
            const projectId = project.id;
            const getProjectImage = () => {
              if (project.initialPhoto && project.initialPhoto !== '' && project.initialPhoto !== 'None') {
                return project.initialPhoto.startsWith('http') ? project.initialPhoto : `${apiUrl.replace('/api', '')}${project.initialPhoto}`;
              }
              return '/projects-page-header-bg.png';
            };

            const getStatusColor = (status) => {
              switch(status?.toLowerCase()) {
                case 'completed':
                case 'complete':
                  return 'bg-green-100 text-green-700 border-green-200';
                case 'ongoing':
                  return 'bg-blue-100 text-blue-700 border-blue-200';
                case 'delayed':
                  return 'bg-red-100 text-red-700 border-red-200';
                case 'pending':
                  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                default:
                  return 'bg-gray-100 text-gray-600 border-gray-200';
              }
            };

            const formatBudget = (amount) => {
              if (!amount) return '₱0.00';
              const num = parseFloat(amount);
              if (isNaN(num)) return '₱0.00';
              return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            };

            return (
              <div
                key={projectId}
                onClick={() => navigateTo([...currentPath, ['project', projectId]])}
                className={`group bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl`}
              >
                {/* Project Image */}
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={getProjectImage()}
                    alt={project.name || project.projectName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/projects-page-header-bg.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${getStatusColor(project.status)}`}>
                      {project.status || 'Not Started'}
                    </span>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold border border-white/30">
                      {project.category || 'Infrastructure'}
                    </span>
                  </div>

                  {/* Progress Overlay */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">Overall Progress</span>
                        <span className="text-xs font-bold text-gray-900">{(parseFloat(project.overallProgress) || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-2 rounded-full transition-all duration-2000 ease-out bg-blue-500"
                          style={{ width: `${Math.min(100, parseFloat(project.overallProgress) || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                    {project.name || project.projectName}
                  </h3>
                  
                  <div className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">Code:</span> {project.projectCode || 'N/A'}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Milestones:</span>
                      <span className="text-gray-800 font-semibold">{project.milestoneCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Files:</span>
                      <span className="text-gray-800 font-semibold">{project.totalFiles}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Budget:</span>
                      <span className="text-gray-800 font-semibold">{formatBudget(project.totalBudget)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render milestone view
  function renderMilestoneView(projectId) {
    // Find project name for breadcrumbs
    let projectName = '';
    const organized = userRole === 'eiu' ? organizeByDepartmentProjectMilestone() : organizeByProjectMilestone();
    
    for (const key in organized) {
      const item = organized[key];
      if (userRole === 'eiu') {
        for (const projId in item.projects) {
          if (projId === projectId) {
            projectName = item.projects[projId].projectName;
            break;
          }
        }
      } else {
        if (item.id === projectId) {
          projectName = item.projectName;
          break;
        }
      }
      if (projectName) break;
    }
    const projectData = userRole === 'eiu' 
      ? organizeByDepartmentProjectMilestone()[currentPath.find(p => p[0] === 'department')?.[1]]?.projects?.[projectId]
      : organizeByProjectMilestone()[projectId];

    if (!projectData) {
      return <div className="bg-white rounded-xl p-8">Project not found</div>;
    }

    const milestones = Object.values(projectData.milestones || {});

    return (
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        {/* Modern Breadcrumbs with Back Button */}
        {renderBreadcrumbs()}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-black">Milestones</h2>
          <div className="text-sm text-gray-600">
            {milestones.length} {milestones.length === 1 ? 'Milestone' : 'Milestones'} Available
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {milestones.map((milestone, index) => {
            const totalFiles = (milestone.files?.documents?.length || 0) + 
                             (milestone.files?.photos?.length || 0) + 
                             (milestone.files?.videos?.length || 0) + 
                             (milestone.files?.other?.length || 0);

            return (
              <div
                key={milestone.milestoneId}
                onClick={() => navigateTo([...currentPath, ['milestone', milestone.milestoneId]])}
                className="bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-2xl p-6 border-2 border-amber-200 hover:border-amber-400 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] group relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100/40 to-transparent rounded-bl-full opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-5 flex-1">
                    {/* Enhanced Milestone Icon */}
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative overflow-hidden">
                      <svg className="w-8 h-8 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
                        {milestone.milestoneTitle}
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          <p className="text-sm font-semibold text-gray-700">
                            {totalFiles} {totalFiles === 1 ? 'file' : 'files'} available
                          </p>
                        </div>
                        {milestone.dueDate && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Arrow */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium hidden group-hover:inline-block transition-all">View files</span>
                    <div className="bg-white rounded-full p-2 shadow-md group-hover:shadow-lg transition-all duration-300">
                      <svg className="w-6 h-6 text-amber-600 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render file type view - organized portal style
  function renderFileTypeView(milestoneId) {
    // Find the milestone data
    let milestoneData = null;
    let projectName = '';
    const organized = userRole === 'eiu' ? organizeByDepartmentProjectMilestone() : organizeByProjectMilestone();
    
    for (const key in organized) {
      const item = organized[key];
      if (userRole === 'eiu') {
        for (const projId in item.projects) {
          const proj = item.projects[projId];
          if (proj.milestones && proj.milestones[milestoneId]) {
            milestoneData = proj.milestones[milestoneId];
            projectName = proj.projectName;
            break;
          }
        }
      } else {
        if (item.milestones && item.milestones[milestoneId]) {
          milestoneData = item.milestones[milestoneId];
          projectName = item.projectName;
          break;
        }
      }
      if (milestoneData) break;
    }

    if (!milestoneData) {
      return <div className="bg-white rounded-xl p-8">Milestone not found</div>;
    }

    const fileTypes = [
      { 
        key: 'documents', 
        label: 'Documents', 
        icon: (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        ),
        emoji: '📄',
        color: 'blue', 
        count: milestoneData.files?.documents?.length || 0 
      },
      { 
        key: 'photos', 
        label: 'Photos', 
        icon: (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        ),
        emoji: '📷',
        color: 'green', 
        count: milestoneData.files?.photos?.length || 0 
      },
      { 
        key: 'videos', 
        label: 'Videos', 
        icon: (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        ),
        emoji: '🎥',
        color: 'purple', 
        count: milestoneData.files?.videos?.length || 0 
      },
      { 
        key: 'other', 
        label: 'Other Files', 
        icon: (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
        ),
        emoji: '📎',
        color: 'orange', 
        count: milestoneData.files?.other?.length || 0 
      }
    ];

    return (
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        {/* Modern Breadcrumbs with Back Button */}
        {renderBreadcrumbs()}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black mb-3">{milestoneData.milestoneTitle}</h2>
          <p className="text-gray-600 text-lg">Select a file type to view evidence files</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {fileTypes.map((type, index) => {
            const colorClasses = {
              blue: {
                bg: 'from-blue-50 via-white to-blue-50',
                border: 'border-blue-200 hover:border-blue-400',
                borderHover: 'hover:border-blue-400',
                bgDecoration: 'from-blue-100/60',
                iconBg: 'bg-blue-100',
                text: 'text-blue-700',
                iconText: 'text-blue-600'
              },
              green: {
                bg: 'from-green-50 via-white to-green-50',
                border: 'border-green-200 hover:border-green-400',
                borderHover: 'hover:border-green-400',
                bgDecoration: 'from-green-100/60',
                iconBg: 'bg-green-100',
                text: 'text-green-700',
                iconText: 'text-green-600'
              },
              purple: {
                bg: 'from-purple-50 via-white to-purple-50',
                border: 'border-purple-200 hover:border-purple-400',
                borderHover: 'hover:border-purple-400',
                bgDecoration: 'from-purple-100/60',
                iconBg: 'bg-purple-100',
                text: 'text-purple-700',
                iconText: 'text-purple-600'
              },
              orange: {
                bg: 'from-orange-50 via-white to-orange-50',
                border: 'border-orange-200 hover:border-orange-400',
                borderHover: 'hover:border-orange-400',
                bgDecoration: 'from-orange-100/60',
                iconBg: 'bg-orange-100',
                text: 'text-orange-700',
                iconText: 'text-orange-600'
              }
            };
            
            const colorClass = colorClasses[type.color] || colorClasses.blue;
            
            return (
              <div
                key={type.key}
                onClick={() => navigateTo([...currentPath, ['filetype', type.key]])}
                className={`bg-gradient-to-br ${colorClass.bg} rounded-3xl p-8 border-2 ${colorClass.border} hover:shadow-2xl transition-all duration-300 cursor-pointer text-center transform hover:scale-[1.08] group relative overflow-hidden`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Enhanced Background decoration */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass.bgDecoration} to-transparent rounded-bl-full opacity-60 group-hover:opacity-80 transition-opacity duration-300`}></div>
                <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${colorClass.bgDecoration} to-transparent rounded-tr-full opacity-40`}></div>
                
                <div className="relative z-10">
                  {/* Enhanced Icon Container */}
                  <div className={`${colorClass.iconBg} rounded-3xl p-6 mb-6 inline-flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg relative`}>
                    <div className={`${colorClass.iconText} group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                      {type.icon}
                    </div>
                    {/* Count Badge on Icon */}
                    {type.count > 0 && (
                      <div className={`absolute -top-2 -right-2 ${colorClass.iconBg} rounded-full px-3 py-1.5 shadow-xl border-2 border-white flex items-center justify-center min-w-[2rem]`}>
                        <span className={`text-sm font-bold ${colorClass.text}`}>{type.count}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Count Display */}
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-2">
                      <p className={`text-6xl font-extrabold ${colorClass.text} leading-none`}>
                        {type.count}
                      </p>
                      <span className={`text-lg font-semibold ${colorClass.text} opacity-70`}>
                        {type.count === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${colorClass.text} opacity-60 mt-1 text-center`}>
                      available
                    </p>
                  </div>
                  
                  {/* Enhanced Label */}
                  <p className={`text-lg font-bold ${colorClass.text} mb-6 uppercase tracking-wider`}>
                    {type.label}
                  </p>
                  
                  {/* Enhanced Footer */}
                  <div className="mt-6 pt-5 border-t-2 border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xs font-semibold text-gray-600">Click to view</p>
                      <div className={`${colorClass.iconBg} rounded-full p-1.5 group-hover:scale-110 transition-transform duration-300`}>
                        <svg className={`w-4 h-4 ${colorClass.iconText} group-hover:translate-x-1 transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Get file type icon based on file extension
  function getFileTypeIcon(fileName) {
    if (!fileName) return null;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const iconMap = {
      'pdf': (
        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      ),
      'doc': (
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      ),
      'docx': (
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      ),
      'xls': (
        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      ),
      'xlsx': (
        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      ),
      'ppt': (
        <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      ),
      'pptx': (
        <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      )
    };
    
    return iconMap[extension] || (
      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    );
  }

  // Get full file URL
  function getFullFileUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${apiUrl.replace('/api', '')}${url.startsWith('/') ? url : '/' + url}`;
  }

  // Render files list
  function renderFilesList(fileType) {
    // Find files for the current milestone and file type
    const milestoneId = currentPath.find(p => p[0] === 'milestone')?.[1];
    if (!milestoneId) return <div>Invalid path</div>;

    let milestoneData = null;
    const organized = userRole === 'eiu' ? organizeByDepartmentProjectMilestone() : organizeByProjectMilestone();
    
    for (const key in organized) {
      const item = organized[key];
      if (userRole === 'eiu') {
        for (const projId in item.projects) {
          const proj = item.projects[projId];
          if (proj.milestones && proj.milestones[milestoneId]) {
            milestoneData = proj.milestones[milestoneId];
            break;
          }
        }
      } else {
        if (item.milestones && item.milestones[milestoneId]) {
          milestoneData = item.milestones[milestoneId];
          break;
        }
      }
      if (milestoneData) break;
    }

    if (!milestoneData) return <div>Milestone not found</div>;

    const files = milestoneData.files?.[fileType] || [];

    // Get file type label for display
    const fileTypeLabels = {
      'documents': 'Documents',
      'photos': 'Photos',
      'videos': 'Videos',
      'other': 'Other Files'
    };
    const fileTypeLabel = fileTypeLabels[fileType] || fileType;

    if (files.length === 0) {
      return (
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
          {/* Modern Breadcrumbs with Back Button - Always visible */}
          {renderBreadcrumbs()}

          {/* Enhanced No Files Found UI */}
          <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl p-16 border-2 border-dashed border-gray-300 text-center relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gray-100/40 to-transparent rounded-bl-full opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-gray-100/40 to-transparent rounded-tr-full opacity-30"></div>
            
            <div className="relative z-10">
              {/* Enhanced Icon */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl p-8 w-32 h-32 mx-auto mb-6 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-3xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                No {fileTypeLabel} Found
              </h3>
              
              {/* Description */}
              <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
                No {fileTypeLabel.toLowerCase()} are available for this milestone.
              </p>
              
              {/* Additional Info Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800 mb-1">Files will appear here</p>
                    <p className="text-xs text-gray-600">Once {fileTypeLabel.toLowerCase()} are uploaded and approved for this milestone, they will be displayed in this section.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (fileType === 'documents') {
      return (
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
          {/* Modern Breadcrumbs with Back Button */}
          {renderBreadcrumbs()}

          <h2 className="text-3xl font-bold text-black mb-6">Documents Files</h2>
          
          <div className="space-y-3">
            {files.map((file, idx) => {
              const fileUrl = getFullFileUrl(file.url);
              const fileIcon = getFileTypeIcon(file.name);
              
              return (
                <div key={idx} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-5 border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center gap-4">
                    {/* File Type Icon */}
                    <div className="flex-shrink-0 bg-white rounded-xl p-3 shadow-md group-hover:scale-110 transition-transform duration-300">
                      {fileIcon}
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className="font-bold text-gray-800 text-lg truncate group-hover:text-gray-900 transition-colors">
                          {file.name || 'Untitled Document'}
                        </h4>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                          file.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                          file.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {file.status || 'unknown'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                          </svg>
                          <span className="font-medium">{formatFileSize(file.fileSize || file.size || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <span>Uploaded: {formatDate(file.uploadDate)}</span>
                        </div>
                        {file.uploader && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            <span>{file.uploader}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {fileUrl && (
                      <div className="flex-shrink-0">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold text-sm shadow-md hover:shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                          View File
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (fileType === 'photos') {
      return (
        <>
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            {/* Modern Breadcrumbs with Back Button */}
            {renderBreadcrumbs()}

            <h2 className="text-3xl font-bold text-black mb-6">Photos Files</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file, idx) => {
                const fileUrl = getFullFileUrl(file.url);
                const thumbnailUrl = fileUrl;
                
                return (
                  <div key={idx} className="group relative bg-white rounded-xl overflow-hidden border-2 border-gray-200 hover:border-gray-400 hover:shadow-xl transition-all duration-300 cursor-pointer">
                    {/* Photo Thumbnail */}
                    <div className="aspect-square relative overflow-hidden bg-gray-100">
                      <img 
                        src={thumbnailUrl || '/placeholder-image.png'} 
                        alt={file.name || 'Photo'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = '/placeholder-image.png';
                        }}
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                          <button
                            onClick={() => setSelectedPhoto(fileUrl)}
                            className="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                          >
                            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                            </svg>
                          </button>
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              download
                              className="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          file.status === 'approved' ? 'bg-green-500 text-white' :
                          file.status === 'pending' ? 'bg-yellow-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {file.status || 'unknown'}
                        </span>
                      </div>
                    </div>
                    
                    {/* File Info */}
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800 truncate mb-1 text-sm">{file.name || 'Photo'}</h4>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{formatFileSize(file.fileSize || file.size || 0)}</span>
                        <span>{formatDate(file.uploadDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Photo View Modal */}
          {selectedPhoto && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <img 
                src={selectedPhoto} 
                alt="Full view"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <a
                href={selectedPhoto}
                download
                className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              </a>
            </div>
          )}
        </>
      );
    }

    if (fileType === 'videos') {
      return (
        <>
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            {/* Modern Breadcrumbs with Back Button */}
            {renderBreadcrumbs()}

            <h2 className="text-3xl font-bold text-black mb-6">Videos Files</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file, idx) => {
                const fileUrl = getFullFileUrl(file.url);
                const thumbnailUrl = file.thumbnail || fileUrl;
                
                return (
                  <div key={idx} className="group relative bg-white rounded-xl overflow-hidden border-2 border-gray-200 hover:border-gray-400 hover:shadow-xl transition-all duration-300 cursor-pointer">
                    {/* Video Thumbnail */}
                    <div className="aspect-video relative overflow-hidden bg-gray-900">
                      {thumbnailUrl ? (
                        <img 
                          src={thumbnailUrl} 
                          alt={file.name || 'Video'}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextElementSibling) {
                              e.target.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      {/* Video Icon Overlay */}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
                        <div className="bg-white/90 rounded-full p-4 group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                      {/* Action Buttons on Hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                          <button
                            onClick={() => setSelectedVideo(fileUrl)}
                            className="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                          >
                            <svg className="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </button>
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              download
                              className="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          file.status === 'approved' ? 'bg-green-500 text-white' :
                          file.status === 'pending' ? 'bg-yellow-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {file.status || 'unknown'}
                        </span>
                      </div>
                    </div>
                    
                    {/* File Info */}
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800 truncate mb-1 text-sm">{file.name || 'Video'}</h4>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{formatFileSize(file.fileSize || file.size || 0)}</span>
                        <span>{formatDate(file.uploadDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Video View Modal */}
          {selectedVideo && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedVideo(null)}
            >
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <video 
                src={selectedVideo} 
                controls
                className="max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()}
              />
              <a
                href={selectedVideo}
                download
                className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              </a>
            </div>
          )}
        </>
      );
    }

    // Other files
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-black mb-6 capitalize">{fileType} Files</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file, idx) => {
            const fileUrl = getFullFileUrl(file.url);
            
            return (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 truncate flex-1">{file.name || 'Untitled'}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    file.status === 'approved' ? 'bg-green-100 text-green-800' :
                    file.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {file.status || 'unknown'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{formatFileSize(file.fileSize || file.size || 0)}</p>
                <p className="text-xs text-gray-500">Uploaded: {formatDate(file.uploadDate)}</p>
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                  >
                    View File →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}


import React, { useState, useEffect, useCallback } from 'react';

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

export default function DocumentCenter({
  userRole = 'secretariat',
  apiUrl = null, // Will use dynamic detection if not provided
  token = '',
  theme = 'sky'
}) {
  // Use provided apiUrl or detect dynamically
  const resolvedApiUrl = apiUrl || getApiUrl();
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

  // Document Sharing states
  const [documentSharingTab, setDocumentSharingTab] = useState('my-portal'); // 'my-portal' or 'shared-portals'
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [userPortals, setUserPortals] = useState([]);
  // Initialize currentUser from localStorage synchronously
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
    return null;
  });
  const [selectedPortal, setSelectedPortal] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDownloadHistory, setShowDownloadHistory] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('file'); // 'file' or 'folder'
  const [uploading, setUploading] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadFileType, setUploadFileType] = useState('documents');
  const [folderName, setFolderName] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null); // Track which folder is open
  const [folderPath, setFolderPath] = useState([]); // Track folder navigation path
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

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
        evidenceResponse = await fetch(`${resolvedApiUrl}/milestones/secretariat/evidence-files`, {
          headers
        });
      } else if (userRole === 'eiu') {
        // For EIU: Get files from their submitted updates
        evidenceResponse = await fetch(`${resolvedApiUrl}/milestones/eiu/evidence-files`, {
          headers
        });
      } else if (userRole === 'lgu-iu') {
        // For LGU-IU: Get files from approved milestones
        evidenceResponse = await fetch(`${resolvedApiUrl}/milestones/lgu-iu/evidence-files`, {
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
      const projectsResponse = await fetch(`${resolvedApiUrl}/projects`, { headers });
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
  }, [userRole, resolvedApiUrl, token]);

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
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      if (includeTime) {
        return date.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
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

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
        } else {
          // Fetch from API
          const response = await fetch(`${resolvedApiUrl}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setCurrentUser(data.user);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    fetchCurrentUser();
  }, [resolvedApiUrl, token]);

  // Fetch all users and shared documents
  const fetchSharedDocuments = useCallback(async () => {
    try {
      // Fetch all users first (using documents/users endpoint which doesn't require admin)
      const usersResponse = await fetch(`${resolvedApiUrl}/documents/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let allUsers = [];
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        if (usersData.success) {
          allUsers = usersData.users || [];
        }
      }

      // Fetch shared documents
      const response = await fetch(`${resolvedApiUrl}/documents/shared`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let sharedDocs = [];
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          sharedDocs = data.documents || [];
          setSharedDocuments(sharedDocs);
        }
      }

      // Fetch shared folders
      try {
        const foldersResponse = await fetch(`${resolvedApiUrl}/documents/shared/folders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (foldersResponse.ok) {
          const foldersData = await foldersResponse.json();
          if (foldersData.success && foldersData.folders) {
            setSharedFolders(foldersData.folders || []);
          } else {
            setSharedFolders([]);
          }
        } else {
          setSharedFolders([]);
        }
      } catch (err) {
        console.log('Folders endpoint not available yet, using empty array');
        setSharedFolders([]);
      }

      // Create portals for ALL users, even if they haven't uploaded anything
      // Exclude current user from shared portals (they have their own "My Portal Documents" tab)
      const portalsMap = {};
      
      // Initialize portals for all users (except current user)
      allUsers.forEach(user => {
        // Skip current user in shared portals
        if (currentUser && String(user.id) === String(currentUser.id)) {
          return;
        }
        portalsMap[user.id] = {
          user: user,
          documents: [],
          photos: [],
          videos: [],
          folders: [],
          lastUpload: null
        };
      });

      // Organize documents by user
      sharedDocs.forEach(doc => {
        const userId = doc.uploadedBy?.id || doc.uploadedById;
        // Skip if this is the current user's document (they have their own tab)
        if (currentUser && String(userId) === String(currentUser.id)) {
          return;
        }
        if (!portalsMap[userId]) {
          portalsMap[userId] = {
            user: doc.uploadedBy || { id: userId, name: 'Unknown User' },
            documents: [],
            photos: [],
            videos: [],
            folders: [],
            lastUpload: null
          };
        }
        const fileType = doc.fileType?.toLowerCase() || 'documents';
        if (fileType.includes('photo') || fileType.includes('image')) {
          portalsMap[userId].photos.push(doc);
        } else if (fileType.includes('video')) {
          portalsMap[userId].videos.push(doc);
        } else {
          portalsMap[userId].documents.push(doc);
        }
        if (!portalsMap[userId].lastUpload || new Date(doc.uploadedAt) > new Date(portalsMap[userId].lastUpload)) {
          portalsMap[userId].lastUpload = doc.uploadedAt;
        }
      });

      // Add folders to each portal
      sharedFolders.forEach(folder => {
        const userId = folder.createdBy?.id || folder.createdById || folder.created_by_id;
        if (userId && portalsMap[userId]) {
          if (!portalsMap[userId].folders) {
            portalsMap[userId].folders = [];
          }
          portalsMap[userId].folders.push(folder);
        }
      });

      // Sort portals: users with recent uploads first, then by name
      const portals = Object.values(portalsMap).sort((a, b) => {
        if (a.lastUpload && b.lastUpload) {
          return new Date(b.lastUpload) - new Date(a.lastUpload);
        }
        if (a.lastUpload && !b.lastUpload) return -1;
        if (!a.lastUpload && b.lastUpload) return 1;
        return (a.user.name || a.user.fullName || '').localeCompare(b.user.name || b.user.fullName || '');
      });
      
      setUserPortals(portals);
    } catch (err) {
      console.error('Error fetching shared documents:', err);
    }
  }, [resolvedApiUrl, token, currentUser]);

  useEffect(() => {
    fetchSharedDocuments();
  }, [fetchSharedDocuments, currentUser]);

  // Validate file type based on selected category - Define with useCallback
  const validateFileType = useCallback((file, category) => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    if (category === 'documents') {
      // Allow: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/rtf'
      ];
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];
      return allowedTypes.some(type => fileType.includes(type)) || 
             allowedExtensions.some(ext => fileName.endsWith(ext));
    } else if (category === 'photos') {
      // Allow: Images only
      return fileType.startsWith('image/');
    } else if (category === 'videos') {
      // Allow: Videos only
      return fileType.startsWith('video/');
    }
    return false;
  }, []);

  // Handle file change - Define with useCallback
  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const invalidFiles = [];
    const validFiles = [];
    
    files.forEach(file => {
      if (validateFileType(file, uploadFileType)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file);
      }
    });
    
    if (invalidFiles.length > 0) {
      const categoryName = uploadFileType === 'documents' ? 'documents' : 
                          uploadFileType === 'photos' ? 'photos' : 'videos';
      setWarningMessage(
        `${invalidFiles.length} file(s) have wrong file type. Please upload ${categoryName} only. ` +
        `Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`
      );
      setShowWarningModal(true);
      setTimeout(() => setShowWarningModal(false), 5000);
    }
    
    setUploadFiles(validFiles);
  }, [uploadFileType, validateFileType]);

  // Handle upload - Define with useCallback
  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;
    
    const apiUrl = resolvedApiUrl; // Capture in closure
    
    // Double-check validation before upload
    const invalidFiles = uploadFiles.filter(file => !validateFileType(file, uploadFileType));
    if (invalidFiles.length > 0) {
      const categoryName = uploadFileType === 'documents' ? 'documents' : 
                          uploadFileType === 'photos' ? 'photos' : 'videos';
      setWarningMessage(
        `Please upload ${categoryName} only. Invalid files detected.`
      );
      setShowWarningModal(true);
      setTimeout(() => setShowWarningModal(false), 5000);
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('fileType', uploadFileType);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      const response = await fetch(`${apiUrl}/documents/shared/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowUploadModal(false);
          setUploadFiles([]);
          fetchSharedDocuments();
          setSuccessMessage('Files uploaded successfully!');
          setShowSuccessModal(true);
          setTimeout(() => setShowSuccessModal(false), 3000);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSuccessMessage(errorData.error || 'Failed to upload files. Please try again.');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setSuccessMessage('Failed to upload files. Please try again.');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, uploadFileType, currentFolderId, resolvedApiUrl, token, validateFileType, fetchSharedDocuments]);

  // Navigate into folder
  const navigateToFolder = useCallback((folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, folder]);
  }, []);

  // Navigate back from folder
  const navigateBackFromFolder = useCallback(() => {
    if (folderPath.length > 0) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    } else {
      setCurrentFolderId(null);
      setFolderPath([]);
    }
  }, [folderPath]);

  // Handle file deletion (only for uploader) - Define before use in JSX
  const handleDeleteFile = useCallback((fileId) => {
    setItemToDelete(fileId);
    setDeleteType('file');
    setShowDeleteConfirmModal(true);
  }, []);

  // Handle folder deletion - Define before use in JSX
  const handleDeleteFolder = useCallback((folderId) => {
    setItemToDelete(folderId);
    setDeleteType('folder');
    setShowDeleteConfirmModal(true);
  }, []);

  // Confirm and execute deletion
  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    
    const apiUrl = resolvedApiUrl; // Capture in closure
    
    try {
      if (deleteType === 'file') {
        const response = await fetch(`${apiUrl}/documents/shared/${itemToDelete}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSharedDocuments(prev => prev.filter(d => d.id !== itemToDelete));
            fetchSharedDocuments();
            setShowDeleteConfirmModal(false);
            setSuccessMessage('File deleted successfully!');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
          }
        }
      } else if (deleteType === 'folder') {
        const response = await fetch(`${apiUrl}/documents/shared/folders/${itemToDelete}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSharedFolders(prev => prev.filter(f => f.id !== itemToDelete));
            fetchSharedDocuments(); // Refresh to update folder list
            setShowDeleteConfirmModal(false);
            setSuccessMessage('Folder deleted successfully!');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
          } else {
            setShowDeleteConfirmModal(false);
            setSuccessMessage(data.error || 'Failed to delete folder. Please try again.');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setShowDeleteConfirmModal(false);
          setSuccessMessage(errorData.error || 'Failed to delete folder. Please try again.');
          setShowSuccessModal(true);
          setTimeout(() => setShowSuccessModal(false), 3000);
        }
      }
    } catch (err) {
      console.error('Error deleting:', err);
      setShowDeleteConfirmModal(false);
      setSuccessMessage('Failed to delete. Please try again.');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    }
    setItemToDelete(null);
  }, [itemToDelete, deleteType, resolvedApiUrl, token, fetchSharedDocuments]);

  // Fetch download history for current user
  const fetchDownloadHistory = useCallback(async () => {
    if (!currentUser?.id) {
      console.warn('⚠️ Cannot fetch download history: currentUser.id is missing', { currentUser });
      return;
    }
    console.log('📥 Fetching download history for user:', currentUser.id);
    try {
      const response = await fetch(`${resolvedApiUrl}/documents/download-history/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Download history response:', {
          success: data.success,
          historyCount: data.history?.length || 0,
          history: data.history
        });
        if (data.success) {
          setDownloadHistory(data.history || []);
          console.log('✅ Download history state updated:', data.history?.length || 0, 'records');
        } else {
          console.error('❌ Download history fetch failed:', data.error);
        }
      } else {
        console.error('❌ Download history fetch failed:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('❌ Error fetching download history:', err);
    }
  }, [resolvedApiUrl, token, currentUser?.id]);

  // Record file download
  const recordDownload = useCallback(async (fileId, fileName) => {
    if (!fileId) {
      console.warn('⚠️ Cannot record download: fileId is missing', { fileId, fileName });
      return;
    }
    try {
      const response = await fetch(`${resolvedApiUrl}/documents/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileId, fileName })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to record download:', response.status, errorData.error || 'Unknown error');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        console.log('✅ Download recorded successfully:', { fileId, fileName });
        // Refresh download history if modal is open
        if (showDownloadHistory) {
          setTimeout(() => fetchDownloadHistory(), 500);
        }
      } else {
        console.error('❌ Download recording failed:', data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('❌ Error recording download:', err);
      // Don't block download if recording fails
    }
  }, [resolvedApiUrl, token, showDownloadHistory, fetchDownloadHistory]);

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

      {/* Document Sharing Section */}
      {!loading && !error && renderDocumentSharing()}

      {/* Upload Modal */}
      {showUploadModal && renderUploadModal()}

      {/* Folder Creation Modal */}
      {showFolderModal && renderFolderModal()}

      {/* Download History Modal */}
      {showDownloadHistory && renderDownloadHistoryModal()}

      {/* Portal Detail Modal */}
      {selectedPortal && renderPortalDetailModal()}
      
      {/* Success Modal */}
      {renderSuccessModal()}
      
      {/* Delete Confirmation Modal */}
      {renderDeleteConfirmModal()}
      
      {/* Warning Modal */}
      {renderWarningModal()}
      
      {/* Preview Modal */}
      {renderPreviewModal()}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          from { stroke-dasharray: 0, 100; }
          to { stroke-dasharray: 100, 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-drawCheck {
          animation: drawCheck 0.6s ease-out forwards;
          stroke-dasharray: 0, 100;
        }
      `}</style>
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
                return project.initialPhoto.startsWith('http') ? project.initialPhoto : `${resolvedApiUrl.replace('/api', '')}${project.initialPhoto}`;
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
    return `${resolvedApiUrl.replace('/api', '')}${url.startsWith('/') ? url : '/' + url}`;
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

  // Render Document Sharing Section
  function renderDocumentSharing() {
    return (
      <div className="mt-12">
        {/* Document Sharing Header */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg shadow-lg`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">Document Sharing</h2>
              <p className="text-sm text-gray-600">Share and access documents across all user accounts</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setDocumentSharingTab('my-portal')}
              className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-all ${
                documentSharingTab === 'my-portal'
                  ? `bg-gradient-to-r ${colors.gradient} text-white shadow-sm`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              My Portal Documents
            </button>
            <button
              onClick={() => setDocumentSharingTab('shared-portals')}
              className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-all ${
                documentSharingTab === 'shared-portals'
                  ? `bg-gradient-to-r ${colors.gradient} text-white shadow-sm`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Shared Document Portal
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {documentSharingTab === 'my-portal' ? renderMyPortal() : renderSharedPortals()}
      </div>
    );
  }

  // Render My Portal Documents
  function renderMyPortal() {
    if (!currentUser) {
      return (
        <div className="bg-white rounded-xl p-12 text-center shadow-lg border border-gray-200">
          <p className="text-gray-600">Loading user information...</p>
        </div>
      );
    }

    // Get current folder type if inside a folder
    const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
    const currentFolderType = currentFolder?.type || null;

    const myDocuments = sharedDocuments.filter(doc => {
      const isOwner = doc.uploadedBy?.id === currentUser.id || doc.uploadedById === currentUser.id;
      // If in a folder, only show documents in that folder
      if (currentFolderId) {
        return isOwner && (doc.folderId === currentFolderId || doc.folder_id === currentFolderId);
      }
      // If not in a folder, only show documents not in any folder
      return isOwner && !doc.folderId && !doc.folder_id;
    });
    const myDocs = myDocuments.filter(d => !d.fileType?.toLowerCase().includes('photo') && !d.fileType?.toLowerCase().includes('video'));
    const myPhotos = myDocuments.filter(d => d.fileType?.toLowerCase().includes('photo') || d.fileType?.toLowerCase().includes('image'));
    const myVideos = myDocuments.filter(d => d.fileType?.toLowerCase().includes('video'));

    // Filter folders based on current folder context
    const currentFolders = sharedFolders.filter(f => {
      const isOwner = f.createdById === currentUser.id || f.created_by_id === currentUser.id;
      // If in a folder, show subfolders (for future nested folder support)
      // For now, only show folders at root level
      if (currentFolderId) {
        return false; // No nested folders yet
      }
      return isOwner;
    });

    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        {/* Folder Navigation Breadcrumb */}
        {folderPath.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setFolderPath([]);
              }}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              My Portal
            </button>
            {folderPath.map((folder, idx) => (
              <React.Fragment key={folder.id}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => {
                    const newPath = folderPath.slice(0, idx + 1);
                    setFolderPath(newPath);
                    setCurrentFolderId(folder.id);
                  }}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* My Portal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {currentUser.profilePictureUrl ? (
              <img 
                src={currentUser.profilePictureUrl.startsWith('http') ? currentUser.profilePictureUrl : `${resolvedApiUrl.replace('/api', '')}${currentUser.profilePictureUrl}`}
                alt={currentUser.name || 'User'}
                className="w-16 h-16 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg ${currentUser.profilePictureUrl ? 'hidden' : ''}`}>
              {(currentUser.name || currentUser.fullName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{currentUser.name || currentUser.fullName || 'My Portal'}</h3>
              <p className="text-sm text-gray-600">{currentUser.email || ''}</p>
              <p className="text-xs text-gray-500">{currentUser.group || currentUser.role || ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowDownloadHistory(true);
                // Fetch history immediately - currentUser should be available from synchronous initialization
                if (currentUser?.id) {
                  console.log('🔄 Download History button clicked, fetching history for user:', currentUser.id);
                  fetchDownloadHistory();
                } else {
                  console.warn('⚠️ currentUser not available when clicking Download History button');
                }
              }}
              className={`px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700 transition-colors`}
            >
              Download History
            </button>
            <button
              onClick={() => {
                if (currentFolderId) {
                  // Set upload file type based on current folder type
                  const currentFolder = folderPath[folderPath.length - 1];
                  if (currentFolder) {
                    setUploadFileType(currentFolder.type || 'documents');
                  }
                } else {
                  // Reset to documents when not in a folder
                  setUploadFileType('documents');
                }
                setShowUploadModal(true);
              }}
              className={`px-4 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all`}
            >
              {currentFolderId ? 'Upload to Folder' : 'Upload File'}
            </button>
          </div>
        </div>

        {/* Documents, Photos, Videos Sections */}
        <div className="space-y-6">
          {/* Documents Section - Only show if not in a folder or if folder type is documents */}
          {(!currentFolderType || currentFolderType === 'documents') && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Documents ({myDocs.length + (currentFolders.filter(f => f.type === 'documents').length)})
              </h4>
              {!currentFolderId && (
                <button
                  onClick={() => {
                    setSelectedFolder('documents');
                    setShowFolderModal(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Create Folder
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Display folders first */}
              {currentFolders
                .filter(f => f.type === 'documents')
                .map((folder, idx) => (
                  <div 
                    key={`folder-${folder.id}`} 
                    onClick={() => navigateToFolder(folder)}
                    className="group relative bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 rounded-xl p-4 hover:shadow-xl transition-all cursor-pointer border-2 border-blue-300 hover:border-blue-500 transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                        </svg>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-all"
                        title="Delete folder"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate mb-1" title={folder.name}>
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-600">{formatDate(folder.createdAt || folder.created_at)}</p>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                ))}
              {/* Then display files */}
              {myDocs.map((doc, idx) => {
                const isPDF = doc.fileType?.includes('pdf') || doc.name?.toLowerCase().endsWith('.pdf');
                const isWord = doc.fileType?.includes('word') || doc.name?.toLowerCase().match(/\.(doc|docx)$/);
                const isExcel = doc.fileType?.includes('excel') || doc.name?.toLowerCase().match(/\.(xls|xlsx)$/);
                const isPowerPoint = doc.fileType?.includes('powerpoint') || doc.name?.toLowerCase().match(/\.(ppt|pptx)$/);
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setPreviewFile(doc);
                      setShowPreviewModal(true);
                    }}
                    className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-center h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded mb-2 relative">
                      {isPDF ? (
                        <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      ) : isWord ? (
                        <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      ) : isExcel ? (
                        <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      ) : isPowerPoint ? (
                        <svg className="w-10 h-10 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(doc.id);
                        }}
                        className="absolute top-1 right-1 text-red-600 hover:text-red-800 text-sm font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete file"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate" title={doc.name || doc.fileName}>
                      {doc.name || doc.fileName || 'Document'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(doc.uploadedAt, true)}</p>
                  </div>
                );
              })}
              {myDocs.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No documents uploaded yet
                </div>
              )}
            </div>
          </div>
          )}

          {/* Photos Section - Only show if not in a folder or if folder type is photos */}
          {(!currentFolderType || currentFolderType === 'photos') && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Photos ({myPhotos.length + (currentFolders.filter(f => f.type === 'photos').length)})
              </h4>
              {!currentFolderId && (
                <button
                  onClick={() => {
                    setSelectedFolder('photos');
                    setShowFolderModal(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Create Folder
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Display folders first */}
              {currentFolders
                .filter(f => f.type === 'photos')
                .map((folder, idx) => (
                  <div 
                    key={`folder-${folder.id}`} 
                    onClick={() => navigateToFolder(folder)}
                    className="group relative bg-gradient-to-br from-green-50 via-green-100 to-green-50 rounded-xl p-4 hover:shadow-xl transition-all cursor-pointer border-2 border-green-300 hover:border-green-500 transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                        </svg>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-all"
                        title="Delete folder"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate mb-1" title={folder.name}>
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-600">{formatDate(folder.createdAt || folder.created_at)}</p>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                ))}
              {/* Then display files */}
              {myPhotos.map((photo, idx) => {
                const photoUrl = photo.url?.startsWith('http') ? photo.url : `${resolvedApiUrl.replace('/api', '')}${photo.url}`;
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setPreviewFile(photo);
                      setShowPreviewModal(true);
                    }}
                    className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="relative h-24 bg-gray-100 rounded mb-2 overflow-hidden">
                      <img 
                        src={photoUrl}
                        alt={photo.name || 'Photo'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(photo.id);
                        }}
                        className="absolute top-1 right-1 text-red-600 hover:text-red-800 text-sm font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete photo"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate" title={photo.name || photo.fileName}>
                      {photo.name || photo.fileName || 'Photo'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(photo.uploadedAt, true)}</p>
                  </div>
                );
              })}
              {myPhotos.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No photos uploaded yet
                </div>
              )}
            </div>
          </div>
          )}

          {/* Videos Section - Only show if not in a folder or if folder type is videos */}
          {(!currentFolderType || currentFolderType === 'videos') && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Videos ({myVideos.length + (currentFolders.filter(f => f.type === 'videos').length)})
              </h4>
              {!currentFolderId && (
                <button
                  onClick={() => {
                    setSelectedFolder('videos');
                    setShowFolderModal(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Create Folder
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Display folders first */}
              {sharedFolders
                .filter(f => f.type === 'videos')
                .map((folder, idx) => (
                  <div 
                    key={`folder-${folder.id}`} 
                    onClick={() => navigateToFolder(folder)}
                    className="group relative bg-gradient-to-br from-red-50 via-red-100 to-red-50 rounded-xl p-4 hover:shadow-xl transition-all cursor-pointer border-2 border-red-300 hover:border-red-500 transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                        </svg>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-all"
                        title="Delete folder"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate mb-1" title={folder.name}>
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-600">{formatDate(folder.createdAt || folder.created_at)}</p>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                ))}
              {/* Then display files */}
              {myVideos.map((video, idx) => {
                const videoUrl = video.url?.startsWith('http') ? video.url : `${resolvedApiUrl.replace('/api', '')}${video.url}`;
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setPreviewFile(video);
                      setShowPreviewModal(true);
                    }}
                    className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="relative h-24 bg-gradient-to-br from-red-50 to-red-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                      <video 
                        src={videoUrl}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(video.id);
                        }}
                        className="absolute top-1 right-1 text-red-600 hover:text-red-800 text-sm font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete video"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate" title={video.name || video.fileName}>
                      {video.name || video.fileName || 'Video'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(video.uploadedAt, true)}</p>
                  </div>
                );
              })}
              {myVideos.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No videos uploaded yet
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    );
  }

  // Render Shared Portals
  function renderSharedPortals() {
    // Group portals by user group
    const portalsByGroup = {};
    userPortals.forEach(portal => {
      const group = portal.user.group || portal.user.role || 'Other';
      if (!portalsByGroup[group]) {
        portalsByGroup[group] = [];
      }
      portalsByGroup[group].push(portal);
    });

    return (
      <div className="space-y-6">
        {Object.keys(portalsByGroup).map(group => (
          <div key={group} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{group}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {portalsByGroup[group].map((portal, idx) => {
                const hasNewUpload = portal.lastUpload && new Date(portal.lastUpload) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPortal(portal)}
                    className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer relative"
                  >
                    {hasNewUpload && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                    <div className="flex flex-col items-center text-center">
                      {portal.user.profilePictureUrl ? (
                        <img 
                          src={portal.user.profilePictureUrl.startsWith('http') ? portal.user.profilePictureUrl : `${resolvedApiUrl.replace('/api', '')}${portal.user.profilePictureUrl}`}
                          alt={portal.user.name || 'User'}
                          className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg mb-3"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg mb-3 ${portal.user.profilePictureUrl ? 'hidden' : ''}`}>
                        {(portal.user.name || portal.user.fullName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                      </svg>
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{portal.user.name || portal.user.fullName || 'Unknown User'}</h4>
                      <p className="text-xs text-gray-600 mb-2">{portal.user.email || ''}</p>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>{portal.documents.length} Docs</span>
                        <span>•</span>
                        <span>{portal.photos.length} Photos</span>
                        <span>•</span>
                        <span>{portal.videos.length} Videos</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(portalsByGroup).length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-lg border border-gray-200">
            <p className="text-gray-600">No users found</p>
          </div>
        )}
      </div>
    );
  }


  // Render Upload Modal
  function renderUploadModal() {
    // Get current folder type if inside a folder
    const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
    const isInsideFolder = currentFolderId && currentFolder;
    const folderType = currentFolder?.type || null;

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowUploadModal(false)}>
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Upload Files</h3>
            </div>
            <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">File Type</label>
              <select
                value={uploadFileType}
                onChange={(e) => {
                  if (!isInsideFolder) {
                    setUploadFileType(e.target.value);
                    setUploadFiles([]); // Clear selected files when changing type
                  }
                }}
                disabled={isInsideFolder}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${isInsideFolder ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="documents">Documents</option>
                <option value="photos">Photos</option>
                <option value="videos">Videos</option>
              </select>
              {isInsideFolder && (
                <p className="text-xs text-gray-500 mt-1">
                  File type is set to <span className="font-semibold capitalize">{folderType}</span> because you're inside a {folderType} folder
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Files</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept={uploadFileType === 'documents' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf' :
                          uploadFileType === 'photos' ? 'image/*' :
                          'video/*'}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="text-gray-600 font-medium">Click to select files or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-2">{uploadFiles.length > 0 ? `${uploadFiles.length} file(s) selected` : 'No files selected'}</p>
                </label>
              </div>
              {uploadFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || uploading}
                className={`px-4 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-lg hover:shadow-lg disabled:opacity-50`}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Folder Creation Modal
  function renderFolderModal() {
    const handleCreateFolder = async () => {
      if (!folderName.trim()) return;
      try {
        const response = await fetch(`${resolvedApiUrl}/documents/shared/folders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: folderName,
            type: selectedFolder
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setShowFolderModal(false);
            setFolderName('');
            fetchSharedDocuments();
            setSuccessMessage('Folder created successfully!');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
          } else {
            setSuccessMessage(data.error || 'Failed to create folder. Please try again.');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 3000);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setSuccessMessage(errorData.error || 'Failed to create folder. Please try again.');
          setShowSuccessModal(true);
          setTimeout(() => setShowSuccessModal(false), 3000);
        }
      } catch (err) {
        console.error('Error creating folder:', err);
        setSuccessMessage('Failed to create folder. Please try again.');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowFolderModal(false)}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Create Folder</h3>
            </div>
            <button onClick={() => setShowFolderModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Folder Name</label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && folderName.trim()) {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!folderName.trim()}
                className={`px-4 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-lg hover:shadow-lg disabled:opacity-50`}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch download history when modal opens
  useEffect(() => {
    console.log('🔄 Download history useEffect triggered:', {
      showDownloadHistory,
      currentUserId: currentUser?.id,
      downloadHistoryLength: downloadHistory.length
    });
    if (showDownloadHistory && currentUser?.id) {
      console.log('✅ Calling fetchDownloadHistory...');
      fetchDownloadHistory();
    } else {
      console.warn('⚠️ Not fetching download history:', {
        showDownloadHistory,
        hasCurrentUser: !!currentUser,
        currentUserId: currentUser?.id
      });
    }
  }, [showDownloadHistory, currentUser?.id, fetchDownloadHistory]);

  // Render Download History Modal
  function renderDownloadHistoryModal() {
    console.log('🎨 Rendering Download History Modal:', {
      downloadHistoryLength: downloadHistory.length,
      downloadHistory: downloadHistory
    });
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowDownloadHistory(false)}>
        <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-br ${colors.gradient} p-3 rounded-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Download History</h3>
                <p className="text-sm text-gray-500 mt-1">Track who downloaded your shared files</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDownloadHistory(false)} 
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
            {downloadHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No download history yet</p>
                <p className="text-gray-400 text-sm mt-2">Downloads of your shared files will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {downloadHistory.map((record, idx) => {
                  const downloader = record.downloadedBy || {};
                  const isPhoto = record.fileType?.toLowerCase().includes('photo') || record.fileType?.toLowerCase().includes('image');
                  const isVideo = record.fileType?.toLowerCase().includes('video');
                  const isDocument = !isPhoto && !isVideo;
                  
                  return (
                    <div key={idx} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-4">
                        {/* File Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                          isPhoto ? 'bg-gradient-to-br from-green-500 to-green-600' :
                          isVideo ? 'bg-gradient-to-br from-red-500 to-red-600' :
                          'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                          {isPhoto ? (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          ) : isVideo ? (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          )}
                        </div>
                        
                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate" title={record.fileName || 'File'}>
                            {record.fileName || 'File'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-2">
                              {downloader.profilePictureUrl ? (
                                <img 
                                  src={downloader.profilePictureUrl.startsWith('http') ? downloader.profilePictureUrl : `${resolvedApiUrl.replace('/api', '')}${downloader.profilePictureUrl}`}
                                  alt={downloader.name || 'User'}
                                  className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-xs font-bold ${downloader.profilePictureUrl ? 'hidden' : ''}`}>
                                {(downloader.name || downloader.fullName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-600">
                                {downloader.name || downloader.fullName || 'Unknown User'}
                              </span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{formatDate(record.downloadedAt, true)}</span>
                          </div>
                        </div>
                        
                        {/* Download Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Portal Detail Modal
  function renderPortalDetailModal() {
    if (!selectedPortal) return null;

    const apiUrl = resolvedApiUrl; // Capture in closure to avoid "re" error
    
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setSelectedPortal(null)}>
        <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-2xl transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              {selectedPortal.user.profilePictureUrl ? (
                <img 
                  src={selectedPortal.user.profilePictureUrl.startsWith('http') ? selectedPortal.user.profilePictureUrl : `${apiUrl.replace('/api', '')}${selectedPortal.user.profilePictureUrl}`}
                  alt={selectedPortal.user.name || 'User'}
                  className="w-16 h-16 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                />
              ) : (
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                  {(selectedPortal.user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedPortal.user.name || selectedPortal.user.fullName || 'User'}</h3>
                <p className="text-sm text-gray-600">{selectedPortal.user.email || ''}</p>
                <p className="text-xs text-gray-500">{selectedPortal.user.group || selectedPortal.user.role || ''}</p>
              </div>
            </div>
            <button onClick={() => setSelectedPortal(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Documents */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Documents ({selectedPortal.documents.length + (selectedPortal.folders?.filter(f => f.type === 'documents').length || 0)})
              </h4>
              {((selectedPortal.folders && selectedPortal.folders.filter(f => f.type === 'documents').length > 0) || selectedPortal.documents.length > 0) ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {/* Display folders first */}
                  {selectedPortal.folders && selectedPortal.folders
                    .filter(f => f.type === 'documents')
                    .map((folder, idx) => (
                      <div 
                        key={`folder-${folder.id}`} 
                        className="group relative bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 rounded-xl p-4 hover:shadow-xl transition-all cursor-pointer border-2 border-blue-300 hover:border-blue-500 transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate mb-1" title={folder.name}>{folder.name}</p>
                        <p className="text-xs text-gray-600">{formatDate(folder.createdAt || folder.created_at)}</p>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    ))}
                  {/* Then display files */}
                  {selectedPortal.documents.map((doc, idx) => {
                    const isPDF = doc.fileType?.includes('pdf') || doc.name?.toLowerCase().endsWith('.pdf');
                    const isWord = doc.fileType?.includes('word') || doc.name?.toLowerCase().match(/\.(doc|docx)$/);
                    const isExcel = doc.fileType?.includes('excel') || doc.name?.toLowerCase().match(/\.(xls|xlsx)$/);
                    const isPowerPoint = doc.fileType?.includes('powerpoint') || doc.name?.toLowerCase().match(/\.(ppt|pptx)$/);
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setPreviewFile(doc);
                          setShowPreviewModal(true);
                        }}
                        className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-center h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded mb-2 relative">
                          {isPDF ? (
                            <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                          ) : isWord ? (
                            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                          ) : isExcel ? (
                            <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                          ) : isPowerPoint ? (
                            <svg className="w-10 h-10 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate" title={doc.name || doc.fileName}>
                          {doc.name || doc.fileName || 'Document'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(doc.uploadedAt, true)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 bg-white rounded-lg">No documents uploaded yet</p>
              )}
            </div>

            {/* Photos */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Photos ({selectedPortal.photos.length + (selectedPortal.folders?.filter(f => f.type === 'photos').length || 0)})
              </h4>
              {((selectedPortal.folders && selectedPortal.folders.filter(f => f.type === 'photos').length > 0) || selectedPortal.photos.length > 0) ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {/* Display folders first */}
                  {selectedPortal.folders && selectedPortal.folders
                    .filter(f => f.type === 'photos')
                    .map((folder, idx) => (
                      <div 
                        key={`folder-${folder.id}`} 
                        className="group relative bg-gradient-to-br from-green-50 via-green-100 to-green-50 rounded-xl p-4 hover:shadow-xl transition-all cursor-pointer border-2 border-green-300 hover:border-green-500 transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate mb-1" title={folder.name}>{folder.name}</p>
                        <p className="text-xs text-gray-600">{formatDate(folder.createdAt || folder.created_at)}</p>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    ))}
                  {/* Then display files */}
                  {selectedPortal.photos.map((photo, idx) => {
                    const photoUrl = photo.url?.startsWith('http') ? photo.url : `${apiUrl.replace('/api', '')}${photo.url}`;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setPreviewFile(photo);
                          setShowPreviewModal(true);
                        }}
                        className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className="relative h-24 bg-gray-100 rounded mb-2 overflow-hidden">
                          <img 
                            src={photoUrl}
                            alt={photo.name || 'Photo'}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate" title={photo.name || photo.fileName}>
                          {photo.name || photo.fileName || 'Photo'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(photo.uploadedAt, true)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 bg-white rounded-lg">No photos uploaded yet</p>
              )}
            </div>

            {/* Videos */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Videos ({selectedPortal.videos.length + (selectedPortal.folders?.filter(f => f.type === 'videos').length || 0)})
              </h4>
              {((selectedPortal.folders && selectedPortal.folders.filter(f => f.type === 'videos').length > 0) || selectedPortal.videos.length > 0) ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {/* Display folders first */}
                  {selectedPortal.folders && selectedPortal.folders
                    .filter(f => f.type === 'videos')
                    .map((folder, idx) => (
                      <div 
                        key={`folder-${folder.id}`} 
                        className="group relative bg-gradient-to-br from-red-50 via-red-100 to-red-50 rounded-xl p-4 hover:shadow-xl transition-all cursor-pointer border-2 border-red-300 hover:border-red-500 transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate mb-1" title={folder.name}>{folder.name}</p>
                        <p className="text-xs text-gray-600">{formatDate(folder.createdAt || folder.created_at)}</p>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    ))}
                  {/* Then display files */}
                  {selectedPortal.videos.map((video, idx) => {
                    const videoUrl = video.url?.startsWith('http') ? video.url : `${apiUrl.replace('/api', '')}${video.url}`;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setPreviewFile(video);
                          setShowPreviewModal(true);
                        }}
                        className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className="relative h-24 bg-gradient-to-br from-red-50 to-red-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                          <video 
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate" title={video.name || video.fileName}>
                          {video.name || video.fileName || 'Video'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(video.uploadedAt, true)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 bg-white rounded-lg">No videos uploaded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Success Modal
  function renderSuccessModal() {
    if (!showSuccessModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all animate-scaleIn">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 animate-bounce">
              <svg className="w-12 h-12 text-white animate-drawCheck" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className={`px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-lg font-semibold hover:shadow-lg transition-all`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Delete Confirmation Modal
  function renderDeleteConfirmModal() {
    if (!showDeleteConfirmModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all animate-scaleIn">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {deleteType === 'file' ? 'file' : 'folder'}? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setItemToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Warning Modal
  function renderWarningModal() {
    if (!showWarningModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all animate-scaleIn">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-4 animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Wrong File Type</h3>
            <p className="text-gray-600 mb-6">{warningMessage}</p>
            <button
              onClick={() => setShowWarningModal(false)}
              className={`px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-lg font-semibold hover:shadow-lg transition-all`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Preview Modal
  function renderPreviewModal() {
    if (!showPreviewModal || !previewFile) return null;

    // Log file details for debugging
    if (previewFile) {
      console.log('📄 Preview File Details:', {
        id: previewFile.id,
        name: previewFile.name || previewFile.fileName,
        fileType: previewFile.fileType,
        url: previewFile.url,
        uploadedBy: previewFile.uploadedBy?.name || previewFile.uploadedBy?.fullName || 'Unknown'
      });
    }

    const fileUrl = previewFile.url?.startsWith('http') 
      ? previewFile.url 
      : `${resolvedApiUrl.replace('/api', '')}${previewFile.url}`;
    
    const isPhoto = previewFile.fileType?.toLowerCase().includes('photo') || 
                    previewFile.fileType?.toLowerCase().includes('image');
    const isVideo = previewFile.fileType?.toLowerCase().includes('video');
    const isDocument = !isPhoto && !isVideo;

    const isPDF = previewFile.fileType?.includes('pdf') || previewFile.name?.toLowerCase().endsWith('.pdf');
    const isWord = previewFile.fileType?.includes('word') || previewFile.name?.toLowerCase().match(/\.(doc|docx)$/);
    const isExcel = previewFile.fileType?.includes('excel') || previewFile.name?.toLowerCase().match(/\.(xls|xlsx)$/);
    const isPowerPoint = previewFile.fileType?.includes('powerpoint') || previewFile.name?.toLowerCase().match(/\.(ppt|pptx)$/);

    return (
      <div 
        className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 animate-fadeIn"
        onClick={() => setShowPreviewModal(false)}
      >
        <div 
          className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl transform transition-all animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-br ${colors.gradient} p-2 rounded-lg`}>
                {isPhoto ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                ) : isVideo ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{previewFile.name || previewFile.fileName || 'File'}</h3>
                <p className="text-sm text-gray-500">{formatDate(previewFile.uploadedAt, true)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={fileUrl}
                download={previewFile.name || previewFile.fileName}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // Record download if file has an ID
                  if (previewFile.id) {
                    recordDownload(previewFile.id, previewFile.name || previewFile.fileName);
                  }
                }}
              >
                Download
              </a>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
            {isPhoto ? (
              <div className="flex items-center justify-center">
                <img 
                  src={fileUrl}
                  alt={previewFile.name || 'Photo'}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-center py-12"><p class="text-gray-500">Failed to load image</p></div>';
                  }}
                />
              </div>
            ) : isVideo ? (
              <div className="flex items-center justify-center">
                <video 
                  src={fileUrl}
                  controls
                  className="max-w-full max-h-[70vh] rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-center py-12"><p class="text-gray-500">Failed to load video</p></div>';
                  }}
                />
              </div>
            ) : isDocument ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-6">
                  {isPDF ? (
                    <svg className="w-24 h-24 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  ) : isWord ? (
                    <svg className="w-24 h-24 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  ) : isExcel ? (
                    <svg className="w-24 h-24 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  ) : isPowerPoint ? (
                    <svg className="w-24 h-24 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  ) : (
                    <svg className="w-24 h-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  )}
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{previewFile.name || previewFile.fileName || 'Document'}</h4>
                <p className="text-gray-600 mb-4">This document cannot be previewed in the browser.</p>
                <a
                  href={fileUrl}
                  download={previewFile.name || previewFile.fileName}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Record download if file has an ID
                    if (previewFile.id) {
                      recordDownload(previewFile.id, previewFile.name || previewFile.fileName);
                    }
                  }}
                >
                  Download to View
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}


import { useState, useEffect, useRef, useCallback } from 'react';
import { announcementsAPI, announcementTemplatesAPI } from '../services/admin.js';

// Dynamically import Chart.js only on client side to avoid SSR issues
let Chart = null;
let ChartLoaded = false;

const loadChart = async () => {
  if (typeof window !== 'undefined' && !ChartLoaded) {
    try {
      const chartModule = await import('chart.js/auto');
      Chart = chartModule.default;
      ChartLoaded = true;
    } catch (error) {
      console.error('Error loading Chart.js:', error);
    }
  }
};

// Dynamically import ReactQuill only on client side to avoid SSR issues
let ReactQuill = null;
let QuillLoaded = false;

const loadQuill = async () => {
  if (typeof window !== 'undefined' && !QuillLoaded) {
    try {
      const module = await import('react-quill');
      ReactQuill = module.default;
      await import('react-quill/dist/quill.snow.css');
      QuillLoaded = true;
    } catch (error) {
      console.error('Failed to load ReactQuill:', error);
    }
  }
};

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

// Get token from cookies (for server-side) or localStorage (for client-side)
const getToken = () => {
  if (typeof window === 'undefined') return '';
  
  // Try localStorage first
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // Fallback to cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  return tokenCookie ? tokenCookie.split('=')[1] : '';
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

// Get current user ID
const getCurrentUserId = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id || null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper function to get publisher label based on role
const getPublisherLabel = (role, fullName) => {
  if (!fullName) return 'Unknown';
  
  if (role === 'EIU') {
    return `Company: ${fullName}`;
  } else if (role === 'LGU-IU') {
    return `Department: ${fullName}`;
  } else {
    return fullName;
  }
};

// Helper function to get theme based on user role
const getThemeByRole = (role) => {
  switch (role) {
    case 'SYS.AD':
      return 'black';
    case 'LGU-IU':
      return 'orange';
    case 'EIU':
      return 'green';
    case 'MPMEC Secretariat':
    case 'MPMEC-SEC':
      return 'lightBlue';
    case 'MPMEC':
      return 'blue';
    case 'EMS':
    case 'Executive Viewer':
      return 'darkBlue';
    default:
      return 'blue';
  }
};

export default function AnnouncementCenter({ 
  theme = 'blue', 
  mode = 'public', // 'admin' for System Admin, 'public' for others
  userRole = null 
}) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  
  // Filters - Advanced filtering support
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [readStatusFilter, setReadStatusFilter] = useState('');
  const [requiresAckFilter, setRequiresAckFilter] = useState('');
  const [announcementFilter, setAnnouncementFilter] = useState('all'); // 'all', 'my', 'others', 'drafts'
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentHtml: '',
    priority: 'normal',
    announcementType: 'general',
    targetAudience: 'all',
    publishDate: '',
    expiryDate: '',
    sendEmailNotification: false,
    requiresAcknowledgment: true, // Always required by default
    acknowledgmentDeadline: ''
  });
  
  // File attachments
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);
  
  // Read receipts
  const [readStatuses, setReadStatuses] = useState({}); // { announcementId: { read: bool, acknowledged: bool } }
  
  // Phase 3A: Engagement & Interaction states
  const [comments, setComments] = useState({}); // { announcementId: [comments] }
  const [reactions, setReactions] = useState({}); // { announcementId: { helpful: 0, important: 0, ... } }
  const [userReactions, setUserReactions] = useState({}); // { announcementId: { helpful: true, ... } }
  const [favorites, setFavorites] = useState({}); // { announcementId: bool }
  const [commentText, setCommentText] = useState({}); // { announcementId: 'text' }
  const [replyingTo, setReplyingTo] = useState(null); // { announcementId, commentId }
  const [editingComment, setEditingComment] = useState(null); // commentId
  const [editingCommentText, setEditingCommentText] = useState(''); // { commentId: 'text' }
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  
  // Analytics
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Analytics Dashboard (Overview)
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsDashboardLoading, setAnalyticsDashboardLoading] = useState(false);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('all');
  
  // Chart refs
  const growthChartRef = useRef(null);
  const typeChartRef = useRef(null);
  const statusChartRef = useRef(null);
  const priorityChartRef = useRef(null);
  const growthChartInstanceRef = useRef(null);
  const typeChartInstanceRef = useRef(null);
  const statusChartInstanceRef = useRef(null);
  const priorityChartInstanceRef = useRef(null);
  
  // Socket.IO refs for real-time updates
  const socketRef = useRef(null);
  const pollIntervalRef = useRef(null);
  
  // Phase 3C: Advanced Management Features
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    notifyOnNewAnnouncement: true,
    notifyOnUpdate: true,
    notifyOnComment: true,
    notifyOnReaction: false,
    priorityFilter: 'all'
  });
  
  // Bulk operations
  const [selectedAnnouncements, setSelectedAnnouncements] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    title: '',
    content: '',
    contentHtml: '',
    priority: 'normal',
    announcementType: 'general',
    targetAudience: 'all',
    requiresAcknowledgment: false
  });
  
  // Loading and Success/Error Modals
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  
  // Export Format Modal
  const [showExportFormatModal, setShowExportFormatModal] = useState(false);
  
  // Password-protected deletion
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState(null);
  const [passwordAttempts, setPasswordAttempts] = useState({});
  const [lockoutCountdown, setLockoutCountdown] = useState(null); // { announcementId: seconds }
  const [passwordInputType, setPasswordInputType] = useState('text'); // Start as text to prevent autofill
  
  // Load password attempts from localStorage on mount, filtering out expired locks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('announcementDeleteAttempts');
      if (!stored) return;
      const attempts = JSON.parse(stored);
      const now = Date.now();
      // Filter out expired locks (older than 24 hours)
      const filtered = {};
      Object.keys(attempts).forEach(id => {
        const attempt = attempts[id];
        if (attempt.lockedUntil && attempt.lockedUntil > now) {
          // Still locked
          filtered[id] = attempt;
        } else if (attempt.lockedUntil && attempt.lockedUntil <= now) {
          // Lock expired, don't include it
        } else {
          // No lock, keep attempts
          filtered[id] = attempt;
        }
      });
      setPasswordAttempts(filtered);
    } catch (e) {
      console.error('Error loading password attempts:', e);
    }
  }, []); // Run only on mount
  
  // Save password attempts to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('announcementDeleteAttempts', JSON.stringify(passwordAttempts));
      } catch (e) {
        console.error('Error saving password attempts:', e);
      }
    }
  }, [passwordAttempts]);
  
  // Clear password when modal closes and when modal opens
  useEffect(() => {
    if (!showPasswordModal) {
      setDeletePassword('');
      setPasswordInputType('text'); // Reset to text
      if (passwordInputRef.current) {
        passwordInputRef.current.value = '';
      }
    } else {
      // When modal opens, clear password and start as text to prevent autofill
      setDeletePassword('');
      setPasswordInputType('text');
      // Switch to password type after a short delay to prevent autofill
      const timer = setTimeout(() => {
        setPasswordInputType('password');
        // Clear any autofilled value after switching to password type
        if (passwordInputRef.current && passwordInputRef.current.value && !deletePassword) {
          passwordInputRef.current.value = '';
          setDeletePassword('');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPasswordModal, deleteAnnouncementId]);
  
  const [submitting, setSubmitting] = useState(false);
  const [quillLoaded, setQuillLoaded] = useState(false);
  const quillRef = useRef(null);
  const contentCapitalizedRef = useRef(false); // Track if first character has been capitalized
  const passwordInputRef = useRef(null); // Ref for password input to prevent autofill
  const currentUserRole = userRole || getCurrentUserRole();

  // Get current Philippine date/time in datetime-local format
  const getCurrentPhilippineDateTime = () => {
    const now = new Date();
    // Philippine time is UTC+8
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const year = philippineTime.getUTCFullYear();
    const month = String(philippineTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(philippineTime.getUTCDate()).padStart(2, '0');
    const hours = String(philippineTime.getUTCHours()).padStart(2, '0');
    const minutes = String(philippineTime.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get current user ID on mount
  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
  }, []);

  // Set publish date when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      const currentDateTime = getCurrentPhilippineDateTime();
      setFormData(prev => ({
        ...prev,
        publishDate: currentDateTime
      }));
      // Reset capitalization flag when modal opens
      contentCapitalizedRef.current = false;
    }
  }, [showCreateModal]);

  // Auto-capitalize first character of content when user starts typing
  useEffect(() => {
    if (formData.content.length === 1 && !contentCapitalizedRef.current && quillRef.current) {
      const firstChar = formData.content.charAt(0);
      if (firstChar && /[a-z]/.test(firstChar)) {
        const quill = quillRef.current.getEditor();
        if (quill) {
          // Get current selection
          const selection = quill.getSelection(true);
          const cursorPos = selection ? selection.index : 1;
          
          // Capitalize the first character using Quill API
          quill.deleteText(0, 1, 'user');
          quill.insertText(0, firstChar.toUpperCase(), 'user');
          
          // Restore cursor position
          if (selection && cursorPos > 0) {
            setTimeout(() => {
              quill.setSelection(cursorPos, 'user');
            }, 0);
          }
          
          // Update form data
          const updatedHtml = quill.root.innerHTML;
          setFormData(prev => ({
            ...prev,
            content: firstChar.toUpperCase(),
            contentHtml: updatedHtml
          }));
          
          // Mark as capitalized
          contentCapitalizedRef.current = true;
        }
      }
    } else if (formData.content.length === 0) {
      // Reset flag when content is cleared
      contentCapitalizedRef.current = false;
    }
  }, [formData.content]);

  // Load ReactQuill on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadQuill().then(() => {
        setQuillLoaded(true);
      });
    }
  }, []);

  // Theme colors - aligned with each user account
  const themeColors = {
    black: {
      // System Admin - Black theme
      primary: 'bg-gray-900',
      primaryHover: 'hover:bg-black',
      primaryLight: 'bg-gray-100',
      primaryText: 'text-gray-900',
      gradient: 'from-black to-gray-800',
      gradientHover: 'hover:from-gray-900 hover:to-black',
      gradientText: 'from-black to-gray-600',
      gradientIcon: 'from-black to-gray-800',
      border: 'border-gray-300',
      borderHover: 'border-black/20'
    },
    orange: {
      // LGU-IU - Professional orange (vibrant orange to match sidebar/topbar)
      primary: 'bg-orange-600',
      primaryHover: 'hover:bg-orange-700',
      primaryLight: 'bg-orange-50',
      primaryText: 'text-orange-600',
      gradient: 'from-orange-600 to-orange-500',
      gradientHover: 'hover:from-orange-700 hover:to-orange-600',
      gradientText: 'from-orange-600 to-orange-500',
      gradientIcon: 'from-orange-600 to-orange-500',
      border: 'border-orange-200',
      borderHover: 'border-orange-600/20'
    },
    green: {
      // EIU - Professional green (matching sidebar/topbar green)
      primary: 'bg-green-600',
      primaryHover: 'hover:bg-green-700',
      primaryLight: 'bg-green-50',
      primaryText: 'text-green-600',
      gradient: 'from-green-600 to-green-500',
      gradientHover: 'hover:from-green-700 hover:to-green-600',
      gradientText: 'from-green-600 to-green-500',
      gradientIcon: 'from-green-600 to-green-500',
      border: 'border-green-200',
      borderHover: 'border-green-600/20'
    },
    lightBlue: {
      // MPMEC Secretariat - Professional vibrant blue (matching sidebar/topbar)
      primary: 'bg-blue-500',
      primaryHover: 'hover:bg-blue-600',
      primaryLight: 'bg-blue-50',
      primaryText: 'text-blue-500',
      gradient: 'from-blue-500 to-blue-400',
      gradientHover: 'hover:from-blue-600 hover:to-blue-500',
      gradientText: 'from-blue-500 to-blue-400',
      gradientIcon: 'from-blue-500 to-blue-400',
      border: 'border-blue-200',
      borderHover: 'border-blue-500/20'
    },
    blue: {
      // MPMEC - Professional Blue
      primary: 'bg-blue-600',
      primaryHover: 'hover:bg-blue-700',
      primaryLight: 'bg-blue-50',
      primaryText: 'text-blue-600',
      gradient: 'from-blue-600 to-blue-500',
      gradientHover: 'hover:from-blue-700 hover:to-blue-600',
      gradientText: 'from-blue-600 to-blue-500',
      gradientIcon: 'from-blue-600 to-blue-500',
      border: 'border-blue-200',
      borderHover: 'border-blue-600/20'
    },
    darkBlue: {
      // Executive Viewer - Professional slightly dark blue
      primary: 'bg-blue-800',
      primaryHover: 'hover:bg-blue-900',
      primaryLight: 'bg-blue-50',
      primaryText: 'text-blue-800',
      gradient: 'from-blue-800 to-blue-700',
      gradientHover: 'hover:from-blue-900 hover:to-blue-800',
      gradientText: 'from-blue-800 to-blue-700',
      gradientIcon: 'from-blue-800 to-blue-700',
      border: 'border-blue-200',
      borderHover: 'border-blue-800/20'
    },
    purple: {
      // Fallback/legacy - keeping for backward compatibility
      primary: 'bg-purple-600',
      primaryHover: 'hover:bg-purple-700',
      primaryLight: 'bg-purple-50',
      primaryText: 'text-purple-600',
      gradient: 'from-purple-600 to-purple-500',
      gradientHover: 'hover:from-purple-700 hover:to-purple-600',
      gradientText: 'from-purple-600 to-purple-500',
      gradientIcon: 'from-purple-600 to-purple-500',
      border: 'border-purple-200',
      borderHover: 'border-purple-600/20'
    }
  };

  const colors = themeColors[theme] || themeColors.blue;

  // Fetch announcements (memoized with useCallback)
  const fetchAnnouncements = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      // Check if token exists
      const token = getToken();
      if (!token) {
        setError('Please log in to view announcements');
        setLoading(false);
        return;
      }
      
      const params = {
        page,
        limit: mode === 'admin' ? 100 : 20
      };
      
      // Advanced filtering
      if (priorityFilter) params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.announcementType = typeFilter;
      if (dateFromFilter) params.dateFrom = dateFromFilter;
      if (dateToFilter) params.dateTo = dateToFilter;
      if (readStatusFilter) params.readStatus = readStatusFilter;
      if (requiresAckFilter !== '') params.requiresAcknowledgment = requiresAckFilter === 'true';
      
      // Filter by creator (My Announcements / From Others / Drafts)
      if (announcementFilter === 'my' && currentUserId) {
        params.createdBy = currentUserId;
        params.excludeDrafts = 'true'; // Exclude drafts from "My Announcements"
      } else if (announcementFilter === 'others' && currentUserId) {
        params.excludeCreatedBy = currentUserId;
      } else if (announcementFilter === 'drafts' && currentUserId) {
        // Drafts filter - backend will handle visibility (only creator and System Admin)
        params.draftFilter = 'true';
      }

      const response = mode === 'admin'
        ? await announcementsAPI.getAnnouncements(params)
        : await announcementsAPI.getPublicAnnouncements(params);

      if (response.success) {
        const fetchedAnnouncements = response.announcements || [];
        setAnnouncements(fetchedAnnouncements);
        setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
        
        // Fetch read statuses for all announcements
        if (fetchedAnnouncements.length > 0) {
          const statusPromises = fetchedAnnouncements.map(ann => 
            announcementsAPI.getReadStatus(ann.id).catch(() => ({ success: true, read: false, acknowledged: false }))
          );
          const statuses = await Promise.all(statusPromises);
          const statusMap = {};
          fetchedAnnouncements.forEach((ann, index) => {
            if (statuses[index]?.success) {
              statusMap[ann.id] = {
                read: statuses[index].read,
                acknowledged: statuses[index].acknowledged
              };
            }
          });
          setReadStatuses(prev => ({ ...prev, ...statusMap }));
        }
      } else {
        setError(response.error || 'Failed to fetch announcements');
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      const errorMessage = err.message || 'Failed to fetch announcements. Please try again.';
      setError(errorMessage);
      
      // If it's an auth error, redirect to login
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('token')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, priorityFilter, searchQuery, typeFilter, dateFromFilter, dateToFilter, readStatusFilter, requiresAckFilter, announcementFilter, currentUserId]);

  // Real-time updates: Set up polling and Socket.IO
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamic socket URL - works for both localhost and production
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const SOCKET_URL = isProd 
      ? `${window.location.protocol}//${window.location.hostname}`
      : 'http://localhost:3000';

    // Initialize Socket.IO connection for real-time updates
    const initSocket = async () => {
      try {
        // Don't create a new socket if one already exists and is connected
        if (socketRef.current && socketRef.current.connected) {
          console.log('✅ Announcement socket already connected');
          return;
        }

        // Disconnect existing socket if any
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        }

        const token = getToken();
        if (!token) {
          console.warn('⚠️ No token available for Socket.IO connection');
          return;
        }

        const { io } = await import('socket.io-client');
        const socket = io(SOCKET_URL, {
          path: '/socket.io',
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          upgrade: true,
          timeout: 20000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Announcement socket connected (AnnouncementCenter)');
        });

        socket.on('disconnect', (reason) => {
          console.warn('⚠️ Announcement socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Announcement socket connection error:', error.message);
        });

        // Listen for new announcements
        socket.on('new_announcement', (announcement) => {
          console.log('📢 New announcement received (AnnouncementCenter):', announcement);
          // Refresh announcements list
          fetchAnnouncements(pagination.page);
          // Dispatch event for notification badge
          window.dispatchEvent(new CustomEvent('announcementUpdated'));
        });

        // Listen for announcement updates
        socket.on('announcement_updated', (announcement) => {
          console.log('📢 Announcement updated (AnnouncementCenter):', announcement);
          fetchAnnouncements(pagination.page);
          window.dispatchEvent(new CustomEvent('announcementUpdated'));
        });

        // Listen for announcement deletion
        socket.on('announcement_deleted', (announcementId) => {
          console.log('📢 Announcement deleted (AnnouncementCenter):', announcementId);
          fetchAnnouncements(pagination.page);
          window.dispatchEvent(new CustomEvent('announcementUpdated'));
        });

        // Listen for read/acknowledge updates
        socket.on('announcement_read', () => {
          fetchAnnouncements(pagination.page);
          window.dispatchEvent(new CustomEvent('announcementRead'));
        });

        socket.on('announcement_acknowledged', () => {
          fetchAnnouncements(pagination.page);
          window.dispatchEvent(new CustomEvent('announcementAcknowledged'));
        });

      } catch (error) {
        console.error('❌ Error initializing announcement socket:', error);
      }
    };

    // Set up polling as fallback (every 10 seconds)
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(() => {
        fetchAnnouncements(pagination.page);
      }, 10000);
    }

    // Initialize socket
    initSocket();

    // Cleanup - only run on unmount
    return () => {
      // Don't disconnect on every re-render, only on unmount
      // The socket will be reused across re-renders
    };
  }, []); // Empty dependency array - only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up announcement socket');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title || formData.title.trim() === '') {
      errors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      errors.title = 'Title cannot exceed 200 characters';
    }
    
    if (!formData.content || formData.content.trim() === '') {
      errors.content = 'Content is required';
    } else if (formData.content.length > 5000) {
      errors.content = 'Content cannot exceed 5000 characters';
    }
    
    if (!formData.priority) {
      errors.priority = 'Priority is required';
    }
    
    if (!formData.announcementType) {
      errors.announcementType = 'Announcement type is required';
    }
    
    if (!formData.targetAudience) {
      errors.targetAudience = 'Target audience is required';
    }
    
    // Validate Publish Date
    if (!formData.publishDate || formData.publishDate.trim() === '') {
      errors.publishDate = 'Publish Date is required';
    }
    
    // Validate Acknowledgment Deadline (required and must be at least 1 hour after Publish Date)
    if (!formData.acknowledgmentDeadline || formData.acknowledgmentDeadline.trim() === '') {
      errors.acknowledgmentDeadline = 'Acknowledgment Deadline is required';
    } else if (formData.publishDate && formData.acknowledgmentDeadline) {
      const publishDate = new Date(formData.publishDate);
      const deadlineDate = new Date(formData.acknowledgmentDeadline);
      const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
      const minDeadlineDate = new Date(publishDate.getTime() + oneHourInMs);
      
      if (deadlineDate < minDeadlineDate) {
        errors.acknowledgmentDeadline = 'Acknowledgment Deadline must be at least 1 hour after Publish Date';
      }
    }
    
    // Validate Expiry Date (auto-populated from Acknowledgment Deadline, but still check)
    if (!formData.expiryDate || formData.expiryDate.trim() === '') {
      errors.expiryDate = 'Expiry Date is required (auto-populated from Acknowledgment Deadline)';
    }
    
    setValidationErrors(errors);
    
    // Scroll to first error field
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      let fieldElement = document.getElementById(firstErrorField);
      
      // Special handling for content field (ReactQuill wrapper)
      if (firstErrorField === 'content' && !fieldElement) {
        fieldElement = document.getElementById('content-field-wrapper') || document.getElementById('edit-content-field-wrapper');
      }
      
      if (fieldElement) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Try to focus the actual input if it exists
          const inputElement = fieldElement.querySelector('input, textarea, .ql-editor');
          if (inputElement) {
            inputElement.focus();
          } else {
            fieldElement.focus();
          }
        }, 100);
      }
    }
    
    return Object.keys(errors).length === 0;
  };

  // Create announcement
  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      const fieldNameMap = {
        title: 'Title',
        content: 'Content',
        priority: 'Priority',
        announcementType: 'Announcement Type',
        targetAudience: 'Target Audience',
        publishDate: 'Publish Date',
        expiryDate: 'Expiry Date'
      };
      const missingFields = Object.keys(validationErrors).map(field => {
        return fieldNameMap[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
      }).join(', ');
      setErrorMessage(`Please fill in the following required fields: ${missingFields}`);
      setShowErrorModal(true);
      return;
    }
    
    setSubmitting(true);
    setShowLoadingModal(true);
    setLoadingMessage('Creating announcement...');
    setValidationErrors({});
    
    try {
      // Prepare form data with rich text content and Phase 3C features
                      const announcementData = {
                        ...formData,
                        contentHtml: formData.contentHtml || formData.content,
                        categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
                        tagIds: selectedTags.length > 0 ? selectedTags : undefined
                      };
      
      const response = await announcementsAPI.createAnnouncement(announcementData, attachments);
      if (response.success) {
        setShowLoadingModal(false);
        setShowCreateModal(false);
        resetForm();
        setAttachments([]);
        setExistingAttachments([]);
        setAttachmentsToDelete([]);
        setValidationErrors({});
        fetchAnnouncements();
        setSuccessMessage('Announcement created successfully!');
        setShowSuccessModal(true);
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('announcementUpdated'));
        // Auto-close success modal after 2 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 2000);
      } else {
        setShowLoadingModal(false);
        const errorMsg = response.error || 'Unknown error';
        setErrorMessage('Failed to create announcement: ' + errorMsg);
        setShowErrorModal(true);
        console.error('Create announcement error:', response);
      }
    } catch (err) {
      console.error('Error creating announcement:', err);
      setShowLoadingModal(false);
      const errorMsg = err.message || err.data?.error || 'Failed to create announcement. Please try again.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Update announcement
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;
    
    setSubmitting(true);
    setShowLoadingModal(true);
    setLoadingMessage('Updating announcement...');
    
    try {
      // Prepare form data with rich text content and Phase 3C features
                      const announcementData = {
                        ...formData,
                        contentHtml: formData.contentHtml || formData.content,
                        categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
                        tagIds: selectedTags.length > 0 ? selectedTags : undefined
                      };
      
      const response = await announcementsAPI.updateAnnouncement(
        selectedAnnouncement.id, 
        announcementData, 
        attachments,
        attachmentsToDelete
      );
      if (response.success) {
        setShowLoadingModal(false);
        setShowEditModal(false);
        resetForm();
        setSelectedAnnouncement(null);
        setAttachments([]);
        setExistingAttachments([]);
        setAttachmentsToDelete([]);
        fetchAnnouncements();
        setSuccessMessage('Announcement updated successfully!');
        setShowSuccessModal(true);
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('announcementUpdated'));
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 2000);
      } else {
        setShowLoadingModal(false);
        const errorMsg = response.error || 'Unknown error';
        setErrorMessage('Failed to update announcement: ' + errorMsg);
        setShowErrorModal(true);
        console.error('Update announcement error:', response);
      }
    } catch (err) {
      console.error('Error updating announcement:', err);
      setShowLoadingModal(false);
      const errorMsg = err.message || err.data?.error || 'Failed to update announcement. Please try again.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Check if announcement is locked from deletion
  const isAnnouncementLocked = (id) => {
    const lockInfo = passwordAttempts[id];
    if (!lockInfo || !lockInfo.lockedUntil) return false;
    
    const now = Date.now();
    if (now < lockInfo.lockedUntil) {
      return true;
    } else {
      // Lock expired, clear it
      setPasswordAttempts(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      return false;
    }
  };

  // Get lockout countdown for an announcement
  const getLockoutCountdown = (id) => {
    const lockInfo = passwordAttempts[id];
    if (!lockInfo || !lockInfo.lockedUntil) return null;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((lockInfo.lockedUntil - now) / 1000));
    return remaining > 0 ? remaining : null;
  };

  // Delete announcement with password protection
  const handleDelete = async (id) => {
    // Check if locked
    if (isAnnouncementLocked(id)) {
      const remaining = getLockoutCountdown(id);
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      setErrorMessage(`Delete function is locked. Please try again in ${hours}h ${minutes}m ${seconds}s.`);
      setShowErrorModal(true);
      return;
    }

    // Show password modal - ensure password is cleared
    setDeletePassword(''); // Clear password first
    setDeleteAnnouncementId(id);
    // Use setTimeout to ensure state is cleared before modal opens
    setTimeout(() => {
      setShowPasswordModal(true);
      // Force clear password again after modal opens to prevent autofill
      setTimeout(() => {
        setDeletePassword('');
      }, 50);
    }, 0);
  };

  // Handle password verification and deletion
  const handlePasswordDelete = async () => {
    if (!deletePassword || !deleteAnnouncementId) return;

    const id = deleteAnnouncementId;
    const attempts = passwordAttempts[id]?.attempts || 0;

    // Check if already at max attempts
    if (attempts >= 5) {
      if (!isAnnouncementLocked(id)) {
        // Lock for 24 hours
        const lockedUntil = Date.now() + (24 * 60 * 60 * 1000);
        setPasswordAttempts(prev => ({
          ...prev,
          [id]: { attempts: 5, lockedUntil }
        }));
      }
      const remaining = getLockoutCountdown(id);
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      setErrorMessage(`Maximum password attempts exceeded. Delete function is locked for 24 hours. Please try again in ${hours}h ${minutes}m.`);
      setShowErrorModal(true);
      setShowPasswordModal(false);
      setDeletePassword('');
      setDeleteAnnouncementId(null);
      return;
    }

    try {
      setShowLoadingModal(true);
      setLoadingMessage('Verifying password...');

      // Verify password
      const { authAPI } = await import('../services/admin.js');
      await authAPI.verifyOwnPassword(deletePassword);

      // Password verified, proceed with deletion
      setShowLoadingModal(true);
      setLoadingMessage('Deleting announcement...');
      setShowPasswordModal(false);

      const response = await announcementsAPI.deleteAnnouncement(id);
      
      if (response.success) {
        // Reset attempts on success
        setPasswordAttempts(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        
        setShowLoadingModal(false);
        setDeletePassword('');
        setDeleteAnnouncementId(null);
        fetchAnnouncements();
        setSuccessMessage('Announcement deleted successfully!');
        setShowSuccessModal(true);
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('announcementUpdated'));
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 2000);
      } else {
        setShowLoadingModal(false);
        const errorMsg = response.error || 'Unknown error';
        setErrorMessage('Failed to delete announcement: ' + errorMsg);
        setShowErrorModal(true);
      }
      } catch (err) {
        setShowLoadingModal(false);
        
        // Close password modal first so error modal appears on top
        setShowPasswordModal(false);
        
        // Password verification failed
        const newAttempts = attempts + 1;
        const remainingAttempts = 5 - newAttempts;
        
        if (newAttempts >= 5) {
          // Lock for 24 hours
          const lockedUntil = Date.now() + (24 * 60 * 60 * 1000);
          setPasswordAttempts(prev => ({
            ...prev,
            [id]: { attempts: newAttempts, lockedUntil }
          }));
          setErrorMessage('Maximum password attempts exceeded. Delete function is locked for 24 hours.');
          setShowErrorModal(true);
        } else {
          setPasswordAttempts(prev => ({
            ...prev,
            [id]: { attempts: newAttempts, lockedUntil: null }
          }));
          setErrorMessage(`Incorrect password. ${remainingAttempts} attempt(s) remaining.`);
          setShowErrorModal(true);
        }
        
        setDeletePassword('');
    }
  };

  // Countdown timer effect for lockout
  useEffect(() => {
    if (!deleteAnnouncementId || !isAnnouncementLocked(deleteAnnouncementId)) {
      setLockoutCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getLockoutCountdown(deleteAnnouncementId);
      if (remaining && remaining > 0) {
        setLockoutCountdown({ announcementId: deleteAnnouncementId, seconds: remaining });
      } else {
        setLockoutCountdown(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deleteAnnouncementId, passwordAttempts]);

  // Bulk operations handlers
  const handleSelectAnnouncement = (id) => {
    setSelectedAnnouncements(prev => 
      prev.includes(id) 
        ? prev.filter(annId => annId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAnnouncements.length === announcements.length) {
      setSelectedAnnouncements([]);
    } else {
      setSelectedAnnouncements(announcements.map(ann => ann.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAnnouncements.length === 0) {
      setErrorMessage('Please select at least one announcement to delete');
      setShowErrorModal(true);
      return;
    }
    
    // Show confirmation modal
    setConfirmTitle('Delete Multiple Announcements');
    setConfirmMessage(`Are you sure you want to delete ${selectedAnnouncements.length} announcement(s)? This action cannot be undone.`);
    setConfirmAction(() => async () => {
      setShowConfirmModal(false);
      setBulkActionLoading(true);
      try {
        const response = await announcementsAPI.bulkDeleteAnnouncements(selectedAnnouncements);
        if (response.success) {
          setSelectedAnnouncements([]);
          fetchAnnouncements();
          setSuccessMessage(`Successfully deleted ${response.deletedCount} announcement(s)!`);
          setShowSuccessModal(true);
          setTimeout(() => {
            setShowSuccessModal(false);
          }, 2000);
        } else {
          const errorMsg = response.error || 'Unknown error';
          setErrorMessage('Failed to delete announcements: ' + errorMsg);
          setShowErrorModal(true);
        }
      } catch (err) {
        console.error('Error bulk deleting announcements:', err);
        const errorMsg = err.message || 'Failed to delete announcements. Please try again.';
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      } finally {
        setBulkActionLoading(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedAnnouncements.length === 0) {
      alert('Please select at least one announcement');
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const response = await announcementsAPI.bulkMarkAsRead(selectedAnnouncements);
      if (response.success) {
        setSelectedAnnouncements([]);
        fetchAnnouncements();
        alert(`Successfully marked ${selectedAnnouncements.length} announcement(s) as read`);
      } else {
        alert('Failed to mark announcements as read: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error bulk marking as read:', err);
      alert(err.message || 'Failed to mark announcements as read. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAcknowledge = async () => {
    if (selectedAnnouncements.length === 0) {
      alert('Please select at least one announcement');
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const response = await announcementsAPI.bulkAcknowledge(selectedAnnouncements);
      if (response.success) {
        setSelectedAnnouncements([]);
        fetchAnnouncements();
        alert(`Successfully acknowledged ${selectedAnnouncements.length} announcement(s)`);
      } else {
        alert('Failed to acknowledge announcements: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error bulk acknowledging:', err);
      alert(err.message || 'Failed to acknowledge announcements. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    const currentDateTime = getCurrentPhilippineDateTime();
    setFormData({
      title: '',
      content: '',
      contentHtml: '',
      priority: 'normal',
      announcementType: 'general',
      targetAudience: 'all',
      publishDate: currentDateTime,
      expiryDate: '',
      sendEmailNotification: false,
      requiresAcknowledgment: true, // Always required by default
      acknowledgmentDeadline: ''
    });
    setAttachments([]);
    setExistingAttachments([]);
    setAttachmentsToDelete([]);
    setSelectedTemplate(null);
    setValidationErrors({});
    // Phase 3C: Reset categories and tags
    setSelectedCategories([]);
    setSelectedTags([]);
  };

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await announcementTemplatesAPI.getTemplates();
      if (response.success) {
        setTemplates(response.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, []);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Fetch categories and tags
  const fetchCategories = useCallback(async () => {
    try {
      const response = await announcementsAPI.getCategories();
      if (response.success) {
        setCategories(response.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await announcementsAPI.getTags();
      if (response.success) {
        setTags(response.tags || []);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  // Fetch notification preferences
  const fetchNotificationPreferences = useCallback(async () => {
    try {
      const response = await announcementsAPI.getNotificationPreferences();
      if (response.success && response.preference) {
        setNotificationPreferences(response.preference);
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotificationPreferences();
  }, [fetchNotificationPreferences]);

  // Load version history
  const loadVersionHistory = useCallback(async (announcementId) => {
    try {
      const response = await announcementsAPI.getAnnouncementVersions(announcementId);
      if (response.success) {
        setVersions(response.versions || []);
        setShowVersionHistory(true);
      }
    } catch (err) {
      console.error('Error fetching version history:', err);
      setErrorMessage('Failed to load version history');
      setShowErrorModal(true);
    }
  }, []);

  // Fetch analytics overview when dashboard opens
  useEffect(() => {
    if (showAnalyticsDashboard) {
      fetchAnalyticsOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnalyticsDashboard, analyticsTimeRange]);

  // Render charts when analytics data is available
  useEffect(() => {
    if (typeof window === 'undefined' || !analyticsOverview || analyticsDashboardLoading || !showAnalyticsDashboard) {
      return;
    }

    const renderCharts = async () => {
      await loadChart();
      if (!Chart) return;

      // Small delay to ensure canvas elements are rendered
      setTimeout(() => {
        // Destroy existing charts
        if (growthChartInstanceRef.current) {
          growthChartInstanceRef.current.destroy();
          growthChartInstanceRef.current = null;
        }
        if (typeChartInstanceRef.current) {
          typeChartInstanceRef.current.destroy();
          typeChartInstanceRef.current = null;
        }
        if (statusChartInstanceRef.current) {
          statusChartInstanceRef.current.destroy();
          statusChartInstanceRef.current = null;
        }
        if (priorityChartInstanceRef.current) {
          priorityChartInstanceRef.current.destroy();
          priorityChartInstanceRef.current = null;
        }

        // Chart 1: Announcement Growth Over Time
        if (growthChartRef.current) {
          const growthData = analyticsOverview.growthOverTime || [];
          if (growthData.length > 0) {
            const ctx = growthChartRef.current.getContext('2d');
            growthChartInstanceRef.current = new Chart(ctx, {
              type: 'line',
              data: {
                labels: growthData.map(d => {
                  const [year, month] = d.month.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }),
                datasets: [{
                  label: 'Announcements Created',
                  data: growthData.map(d => d.count),
                  borderColor: '#3B82F6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 4,
                  pointHoverRadius: 6
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }
            });
          }
        }

        // Chart 2: Distribution by Type
        if (typeChartRef.current) {
          const typeData = analyticsOverview.typeDistribution || {};
          const typeKeys = Object.keys(typeData);
          if (typeKeys.length > 0) {
            const ctx = typeChartRef.current.getContext('2d');
            const labels = typeKeys.map(key => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
            const data = typeKeys.map(key => typeData[key]);
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
            
            typeChartInstanceRef.current = new Chart(ctx, {
              type: 'doughnut',
              data: {
                labels,
                datasets: [{
                  data,
                  backgroundColor: colors.slice(0, labels.length),
                  borderWidth: 2,
                  borderColor: '#fff'
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'right'
                  }
                }
              }
            });
          }
        }

        // Chart 3: Status Distribution
        if (statusChartRef.current) {
          const statusData = analyticsOverview.statusBreakdown || {};
          const statusKeys = Object.keys(statusData);
          if (statusKeys.length > 0) {
            const ctx = statusChartRef.current.getContext('2d');
            const labels = statusKeys.map(key => key.charAt(0).toUpperCase() + key.slice(1));
            const data = statusKeys.map(key => statusData[key]);
            const colors = {
              active: '#10B981',
              scheduled: '#F59E0B',
              draft: '#6B7280',
              expired: '#EF4444'
            };
            
            statusChartInstanceRef.current = new Chart(ctx, {
              type: 'pie',
              data: {
                labels,
                datasets: [{
                  data,
                  backgroundColor: labels.map(label => colors[label.toLowerCase()] || '#6B7280'),
                  borderWidth: 2,
                  borderColor: '#fff'
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'right'
                  }
                }
              }
            });
          }
        }

        // Chart 4: Priority Distribution
        if (priorityChartRef.current) {
          const priorityData = analyticsOverview.priorityDistribution || {};
          const priorityKeys = Object.keys(priorityData);
          if (priorityKeys.length > 0) {
            const ctx = priorityChartRef.current.getContext('2d');
            const labels = priorityKeys.map(key => key.charAt(0).toUpperCase() + key.slice(1));
            const data = priorityKeys.map(key => priorityData[key]);
            const colors = {
              urgent: '#EF4444',
              high: '#F59E0B',
              normal: '#3B82F6',
              low: '#6B7280'
            };
            
            priorityChartInstanceRef.current = new Chart(ctx, {
              type: 'bar',
              data: {
                labels,
                datasets: [{
                  label: 'Announcements',
                  data,
                  backgroundColor: labels.map(label => colors[label.toLowerCase()] || '#6B7280'),
                  borderColor: labels.map(label => colors[label.toLowerCase()] || '#6B7280'),
                  borderWidth: 1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }
            });
          }
        }
      }, 100);
    };

    renderCharts();

    // Cleanup function
    return () => {
      if (growthChartInstanceRef.current) {
        growthChartInstanceRef.current.destroy();
        growthChartInstanceRef.current = null;
      }
      if (typeChartInstanceRef.current) {
        typeChartInstanceRef.current.destroy();
        typeChartInstanceRef.current = null;
      }
      if (statusChartInstanceRef.current) {
        statusChartInstanceRef.current.destroy();
        statusChartInstanceRef.current = null;
      }
      if (priorityChartInstanceRef.current) {
        priorityChartInstanceRef.current.destroy();
        priorityChartInstanceRef.current = null;
      }
    };
  }, [analyticsOverview, analyticsDashboardLoading, showAnalyticsDashboard]);

  // Apply template to form
  const handleApplyTemplate = (template) => {
    setFormData({
      title: template.title || '',
      content: template.content || '',
      contentHtml: template.contentHtml || template.content || '',
      priority: template.priority || 'normal',
      announcementType: template.announcementType || 'general',
      targetAudience: template.targetAudience || 'all',
      publishDate: '',
      expiryDate: '',
      sendEmailNotification: false,
      requiresAcknowledgment: template.requiresAcknowledgment !== undefined ? template.requiresAcknowledgment : true, // Default to true
      acknowledgmentDeadline: ''
    });
    setSelectedTemplate(template);
    setShowTemplateModal(false);
  };

  // Save current form as template
  const handleSaveAsTemplate = async () => {
    if (!formData.title || !formData.content) {
      alert('Please fill in title and content before saving as template');
      return;
    }
    
    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;
    
    try {
      const templateData = {
        name: templateName,
        description: prompt('Enter a description (optional):') || '',
        title: formData.title,
        content: formData.content,
        contentHtml: formData.contentHtml || formData.content,
        priority: formData.priority,
        announcementType: formData.announcementType,
        targetAudience: formData.targetAudience,
        requiresAcknowledgment: formData.requiresAcknowledgment
      };
      
      const response = await announcementTemplatesAPI.createTemplate(templateData);
      if (response.success) {
        alert('Template saved successfully!');
        fetchTemplates();
      } else {
        alert('Failed to save template: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving template:', err);
      alert(err.message || 'Failed to save template. Please try again.');
    }
  };

  // Toggle pin status
  const handleTogglePin = async (id) => {
    try {
      const response = await announcementsAPI.togglePin(id);
      if (response.success) {
        fetchAnnouncements();
        alert(response.message || 'Pin status updated successfully');
      } else {
        alert('Failed to update pin status: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
      alert(err.message || 'Failed to update pin status. Please try again.');
    }
  };

  // Export Data - Show format selection modal
  const handleExportData = () => {
    setShowExportFormatModal(true);
  };

  // Export with selected format
  const handleExportWithFormat = async (format) => {
    try {
      setShowExportFormatModal(false);
      setLoadingMessage(`Exporting announcements as ${format.toUpperCase()}...`);
      setShowLoadingModal(true);

      const params = {};
      if (priorityFilter) params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.announcementType = typeFilter;
      if (dateFromFilter) params.dateFrom = dateFromFilter;
      if (dateToFilter) params.dateTo = dateToFilter;
      if (readStatusFilter) params.readStatus = readStatusFilter;
      if (requiresAckFilter !== '') params.requiresAcknowledgment = requiresAckFilter === 'true';
      
      // Call the appropriate export function based on format
      let result;
      if (format === 'excel') {
        result = await announcementsAPI.exportToExcel(params);
      } else if (format === 'pdf') {
        result = await announcementsAPI.exportToPDF(params);
      } else if (format === 'html') {
        result = await announcementsAPI.exportToHTML(params);
      } else {
        // Default to CSV
        result = await announcementsAPI.exportToCSV(params);
      }
      
      setShowLoadingModal(false);
      setSuccessMessage(`Announcements exported successfully as ${format.toUpperCase()}!`);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (err) {
      console.error(`Error exporting ${format}:`, err);
      setShowLoadingModal(false);
      setErrorMessage(err.message || `Failed to export announcements as ${format.toUpperCase()}. Please try again.`);
      setShowErrorModal(true);
    }
  };

  // Handle file attachment
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Remove existing attachment
  const removeExistingAttachment = (attachmentId) => {
    setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
    setAttachmentsToDelete(prev => [...prev, attachmentId]);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Mark as read
  const handleMarkAsRead = async (announcementId) => {
    try {
      await announcementsAPI.markAsRead(announcementId);
      setReadStatuses(prev => ({
        ...prev,
        [announcementId]: { ...prev[announcementId], read: true }
      }));
      fetchAnnouncements();
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('announcementRead'));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Acknowledge announcement
  const handleAcknowledge = async (announcementId) => {
    try {
      await announcementsAPI.acknowledgeAnnouncement(announcementId);
      setReadStatuses(prev => ({
        ...prev,
        [announcementId]: { ...prev[announcementId], acknowledged: true, read: true }
      }));
      fetchAnnouncements();
      setSuccessMessage('Announcement acknowledged successfully!');
      setShowSuccessModal(true);
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('announcementAcknowledged'));
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (err) {
      console.error('Error acknowledging:', err);
      setSuccessMessage(err.data?.error || 'Failed to acknowledge announcement');
      setShowSuccessModal(true);
    }
  };

  // Open edit modal
  const openEditModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      contentHtml: announcement.contentHtml || announcement.content || '',
      priority: announcement.priority || 'normal',
      announcementType: announcement.announcementType || 'general',
      targetAudience: announcement.targetAudience || 'all',
      publishDate: announcement.publishDate ? new Date(announcement.publishDate).toISOString().slice(0, 16) : '',
      expiryDate: announcement.expiryDate ? new Date(announcement.expiryDate).toISOString().slice(0, 16) : '',
      sendEmailNotification: false,
      requiresAcknowledgment: announcement.requiresAcknowledgment || false,
      acknowledgmentDeadline: announcement.acknowledgmentDeadline ? new Date(announcement.acknowledgmentDeadline).toISOString().slice(0, 16) : ''
    });
    setExistingAttachments(announcement.attachments || []);
    setAttachments([]);
    setAttachmentsToDelete([]);
    // Phase 3C: Load categories and tags
    if (announcement.categoryMappings && announcement.categoryMappings.length > 0) {
      setSelectedCategories(announcement.categoryMappings.map(m => m.category?.id).filter(Boolean));
    } else {
      setSelectedCategories([]);
    }
    if (announcement.tagMappings && announcement.tagMappings.length > 0) {
      setSelectedTags(announcement.tagMappings.map(m => m.tag?.id).filter(Boolean));
    } else {
      setSelectedTags([]);
    }
    setShowEditModal(true);
  };

  // Open view modal
  const openViewModal = async (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowViewModal(true);
    
    // Mark as read when viewing
    if (!readStatuses[announcement.id]?.read) {
      handleMarkAsRead(announcement.id);
    }
    
    // Load engagement data (comments, reactions, favorites)
    loadEngagementData(announcement.id);
  };

  // Load engagement data (comments, reactions, favorites) for an announcement
  const loadEngagementData = async (announcementId) => {
    try {
      // Load comments
      const commentsData = await announcementsAPI.getComments(announcementId);
      setComments(prev => ({ ...prev, [announcementId]: commentsData.comments || [] }));
      
      // Load reactions
      const reactionsData = await announcementsAPI.getReactions(announcementId);
      setReactions(prev => ({ ...prev, [announcementId]: reactionsData.reactions || {} }));
      setUserReactions(prev => ({ ...prev, [announcementId]: reactionsData.userReactions || {} }));
      
      // Load favorite status
      const favoriteData = await announcementsAPI.checkFavorite(announcementId);
      setFavorites(prev => ({ ...prev, [announcementId]: favoriteData.isFavorited }));
    } catch (error) {
      console.error('Failed to load engagement data:', error);
    }
  };

  // Phase 3A: Engagement & Interaction Handlers

  // Comments
  const handleCreateComment = async (announcementId, content, parentCommentId = null) => {
    try {
      setLoadingMessage('Posting comment...');
      setShowLoadingModal(true);
      
      const response = await announcementsAPI.createComment(announcementId, content, parentCommentId);
      
      setShowLoadingModal(false);
      setSuccessMessage('Comment posted successfully!');
      setShowSuccessModal(true);
      
      // Refresh comments
      await loadEngagementData(announcementId);
      
      // Clear comment text
      setCommentText(prev => ({ ...prev, [announcementId]: '' }));
      setReplyingTo(null);
      
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      setShowLoadingModal(false);
      setErrorMessage(error.message || 'Failed to post comment');
      setShowErrorModal(true);
    }
  };

  const handleUpdateComment = async (announcementId, commentId, content) => {
    try {
      setLoadingMessage('Updating comment...');
      setShowLoadingModal(true);
      
      await announcementsAPI.updateComment(commentId, content);
      
      setShowLoadingModal(false);
      setSuccessMessage('Comment updated successfully!');
      setShowSuccessModal(true);
      
      // Refresh comments
      await loadEngagementData(announcementId);
      setEditingComment(null);
      
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      setShowLoadingModal(false);
      setErrorMessage(error.message || 'Failed to update comment');
      setShowErrorModal(true);
    }
  };

  const handleDeleteComment = async (announcementId, commentId) => {
    setConfirmTitle('Delete Comment');
    setConfirmMessage('Are you sure you want to delete this comment? This action cannot be undone.');
    setConfirmAction(async () => {
      try {
        setShowConfirmModal(false);
        setLoadingMessage('Deleting comment...');
        setShowLoadingModal(true);
        
        await announcementsAPI.deleteComment(commentId);
        
        setShowLoadingModal(false);
        setSuccessMessage('Comment deleted successfully!');
        setShowSuccessModal(true);
        
        // Refresh comments
        await loadEngagementData(announcementId);
        
        setTimeout(() => setShowSuccessModal(false), 2000);
      } catch (error) {
        setShowLoadingModal(false);
        setErrorMessage(error.message || 'Failed to delete comment');
        setShowErrorModal(true);
      }
    });
    setShowConfirmModal(true);
  };

  // Reactions
  const handleToggleReaction = async (announcementId, reactionType) => {
    try {
      await announcementsAPI.toggleReaction(announcementId, reactionType);
      
      // Refresh reactions
      const reactionsData = await announcementsAPI.getReactions(announcementId);
      setReactions(prev => ({ ...prev, [announcementId]: reactionsData.reactions || {} }));
      setUserReactions(prev => ({ ...prev, [announcementId]: reactionsData.userReactions || {} }));
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  // Favorites
  const handleToggleFavorite = async (announcementId) => {
    try {
      const response = await announcementsAPI.toggleFavorite(announcementId);
      setFavorites(prev => ({ ...prev, [announcementId]: response.isFavorited }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Sharing
  const handleShare = async (announcementId) => {
    try {
      setLoadingMessage('Generating share link...');
      setShowLoadingModal(true);
      
      const response = await announcementsAPI.getShareLink(announcementId);
      setShareLink(response.shareLink);
      
      setShowLoadingModal(false);
      setShowShareModal(true);
    } catch (error) {
      setShowLoadingModal(false);
      setErrorMessage(error.message || 'Failed to generate share link');
      setShowErrorModal(true);
    }
  };

  // Duplicate announcement
  const handleDuplicate = async (announcementId) => {
    try {
      setLoadingMessage('Duplicating announcement...');
      setShowLoadingModal(true);
      
      const response = await announcementsAPI.duplicateAnnouncement(announcementId);
      
      setShowLoadingModal(false);
      setShowViewModal(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
      setSuccessMessage('Announcement duplicated successfully as draft!');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      setShowLoadingModal(false);
      setErrorMessage(error.message || 'Failed to duplicate announcement');
      setShowErrorModal(true);
    }
  };

  // Fetch analytics overview for dashboard
  const fetchAnalyticsOverview = useCallback(async () => {
    try {
      setAnalyticsDashboardLoading(true);
      const params = {};
      if (analyticsTimeRange !== 'all') {
        const now = new Date();
        const daysAgo = parseInt(analyticsTimeRange);
        params.startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        params.endDate = now.toISOString();
      }
      
      const response = await announcementsAPI.getAnalyticsOverview(params);
      if (response.success) {
        setAnalyticsOverview(response.overview || response.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics overview:', err);
    } finally {
      setAnalyticsDashboardLoading(false);
    }
  }, [analyticsTimeRange]);

  // Load analytics
  const handleViewAnalytics = async (announcementId) => {
    try {
      setAnalyticsLoading(true);
      setShowAnalyticsModal(true);
      
      const response = await announcementsAPI.getAnnouncementAnalytics(announcementId);
      
      if (response.success) {
        setAnalyticsData(response.analytics);
      } else {
        setErrorMessage('Failed to load analytics');
        setShowErrorModal(true);
        setShowAnalyticsModal(false);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load analytics');
      setShowErrorModal(true);
      setShowAnalyticsModal(false);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setSuccessMessage('Share link copied to clipboard!');
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      setShowShareModal(false);
    }, 2000);
  };

  // Get allowed announcement types based on user role
  const getAllowedAnnouncementTypes = () => {
    if (!currentUserRole) return ['general'];
    
    const allowedTypes = {
      'SYS.AD': ['system_maintenance', 'system_update', 'general'],
      'EMS': ['administration', 'general'],
      'LGU-PMT': ['project_related', 'policy_related', 'general'],
      'LGU-IU': ['project_related', 'general'],
      'EIU': ['project_update', 'general']
    };
    
    return allowedTypes[currentUserRole] || ['general'];
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get priority badge class
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'expired': return 'bg-gray-100 text-gray-600';
      case 'draft': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Real-time polling for engagement data when view modal is open
  useEffect(() => {
    if (!showViewModal || !selectedAnnouncement) return;
    
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(() => {
      loadEngagementData(selectedAnnouncement.id);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [showViewModal, selectedAnnouncement]);

  // Initial load and refetch when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAnnouncements(1);
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [fetchAnnouncements, searchQuery, priorityFilter]);

  return (
    <div className="w-full">
      {/* Page Header - Matching office-groups.astro style, flushed to top bar */}
      <div className={`bg-white border-b ${colors.border} px-8 py-6 mb-0 -mx-8 -mt-8`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br ${colors.gradientIcon} shadow-xl hover:scale-110 hover:rotate-3 relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
                </svg>
              </div>
              <div>
                <h1 className={`text-3xl font-bold bg-gradient-to-r ${colors.gradientText} bg-clip-text text-transparent`}>System Announcements</h1>
                <p className="text-sm text-gray-600">
                  {mode === 'admin' 
                    ? 'Manage system-wide announcements and notifications'
                    : 'Stay updated with important announcements from System Administration'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Announcements</p>
              <p className={`text-xs ${colors.primaryText} font-semibold`}>{pagination.total} Total</p>
            </div>
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-8 py-8 bg-white min-h-screen">
        <div className="space-y-8">
          {/* Action Buttons Section - All buttons same size and style */}
          <div className="flex items-center justify-end gap-3 flex-wrap">
            {/* Create button - Primary style */}
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className={`bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${theme === 'black' ? 'hover:shadow-black/25' : 'hover:shadow-gray-900/25'} border ${colors.borderHover} flex items-center gap-2 relative overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              <span className="relative z-10">Create Announcement</span>
            </button>
            {/* Analytics Dashboard Button - Secondary style */}
            <button
              onClick={() => {
                setShowAnalyticsDashboard(true);
                fetchAnalyticsOverview();
              }}
              className={`bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border ${colors.borderHover} flex items-center gap-2 relative overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="relative z-10">Analytics Dashboard</span>
            </button>
            {/* Templates Button - Secondary style */}
            <button
              onClick={() => setShowTemplateModal(true)}
              className={`bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border ${colors.borderHover} flex items-center gap-2 relative overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="relative z-10">Templates</span>
            </button>
            {/* Notification Preferences Button - Secondary style */}
            <button
              onClick={() => setShowNotificationPreferences(true)}
              className={`bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border ${colors.borderHover} flex items-center gap-2 relative overflow-hidden group`}
              title="Notification Preferences"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="relative z-10">Preferences</span>
            </button>
            {/* Export Data Button - Secondary style */}
            <button
              onClick={handleExportData}
              className={`bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border ${colors.borderHover} flex items-center gap-2 relative overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="relative z-10">Export Data</span>
            </button>
            {/* Refresh button - Primary style */}
            <button
              onClick={() => fetchAnnouncements()}
              className={`bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${theme === 'black' ? 'hover:shadow-black/25' : 'hover:shadow-gray-900/25'} border ${colors.borderHover} flex items-center gap-2 relative overflow-hidden group`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span className="relative z-10">Refresh</span>
            </button>
          </div>

          {/* Bulk Actions Bar - shown when items are selected */}
          {selectedAnnouncements.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-lg p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedAnnouncements.length} announcement(s) selected
                  </span>
                  <button
                    onClick={() => setSelectedAnnouncements([])}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(mode === 'admin' || announcementFilter === 'my') && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkActionLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards - Matching office-groups.astro profile-card style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`bg-white border ${colors.border} rounded-2xl shadow-lg transition-all duration-500 ease-out hover:shadow-2xl ${colors.borderHover} hover:-translate-y-2 p-6 relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/3 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-gray-600">Total Announcements</p>
                  <p className={`text-2xl font-bold ${colors.primaryText}`}>{pagination.total}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br ${colors.gradientIcon} shadow-xl group-hover:scale-110 group-hover:rotate-3 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div className={`bg-white border ${colors.border} rounded-2xl shadow-lg transition-all duration-500 ease-out hover:shadow-2xl ${colors.borderHover} hover:-translate-y-2 p-6 relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/3 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-black">
                    {announcements.filter(a => a.priority === 'urgent').length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-red-500 to-red-600 shadow-xl group-hover:scale-110 group-hover:rotate-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div className={`bg-white border ${colors.border} rounded-2xl shadow-lg transition-all duration-500 ease-out hover:shadow-2xl ${colors.borderHover} hover:-translate-y-2 p-6 relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/3 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-black">
                    {announcements.filter(a => a.priority === 'high').length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl group-hover:scale-110 group-hover:rotate-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
          </div>
        </div>

            <div className={`bg-white border ${colors.border} rounded-2xl shadow-lg transition-all duration-500 ease-out hover:shadow-2xl ${colors.borderHover} hover:-translate-y-2 p-6 relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/3 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-black">
                    {announcements.filter(a => {
                      const today = new Date().toDateString();
                      const announcementDate = new Date(a.publishDate).toDateString();
                      return today === announcementDate;
                    }).length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 shadow-xl group-hover:scale-110 group-hover:rotate-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs for Filtering Announcements - Matching office-groups.astro style */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setAnnouncementFilter('all');
                  fetchAnnouncements(1);
                }}
                className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                  announcementFilter === 'all'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-sm`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                All Announcements
              </button>
              <button
                onClick={() => {
                  setAnnouncementFilter('my');
                  fetchAnnouncements(1);
                }}
                className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                  announcementFilter === 'my'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-sm`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                My Announcements
              </button>
              <button
                onClick={() => {
                  setAnnouncementFilter('others');
                  fetchAnnouncements(1);
                }}
                className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                  announcementFilter === 'others'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-sm`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                From Others
              </button>
              <button
                onClick={() => {
                  setAnnouncementFilter('drafts');
                  fetchAnnouncements(1);
                }}
                className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                  announcementFilter === 'drafts'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-sm`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Drafts
              </button>
            </div>
          </div>

          {/* Advanced Filters - Matching office-groups.astro profile-card style */}
          <div className={`bg-white border ${colors.border} rounded-2xl shadow-lg transition-all duration-500 ease-out hover:shadow-2xl ${colors.borderHover} p-6 relative overflow-hidden group mb-6`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/3 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br ${colors.gradientIcon} shadow-xl group-hover:scale-110 group-hover:rotate-3 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black">Advanced Filters</h3>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-6 border border-gray-200">
                <div className="flex flex-col gap-4">
                  {/* First Row - Basic Filters */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High Priority</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low Priority</option>
                      </select>
                      
                      {/* Advanced filters - Available for all users */}
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Types</option>
                        <option value="system_maintenance">System Maintenance</option>
                        <option value="system_update">System Update</option>
                        <option value="general">General</option>
                        <option value="project_related">Project Related</option>
                        <option value="policy_related">Policy Related</option>
                        <option value="administration">Administration</option>
                        <option value="project_update">Project Update</option>
                      </select>
                      
                      <select
                        value={readStatusFilter}
                        onChange={(e) => setReadStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="unacknowledged">Unacknowledged</option>
                      </select>
                      
                      <select
                        value={requiresAckFilter}
                        onChange={(e) => setRequiresAckFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All</option>
                        <option value="true">Requires Acknowledgment</option>
                        <option value="false">No Acknowledgment Required</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search announcements..."
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Second Row - Date Range Filters - Available for all users */}
                  <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Date From:</label>
                      <input
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Date To:</label>
                      <input
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {(dateFromFilter || dateToFilter || typeFilter || readStatusFilter || requiresAckFilter) && (
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            setDateFromFilter('');
                            setDateToFilter('');
                            setTypeFilter('');
                            setReadStatusFilter('');
                            setRequiresAckFilter('');
                          }}
                          className={`w-full bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border ${colors.borderHover} flex items-center justify-center gap-2 relative overflow-hidden group`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                          <span className="relative z-10">Clear Filters</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area - Matching office-groups.astro profile-card style */}
          <div className={`bg-white border ${colors.border} rounded-2xl shadow-lg transition-all duration-500 ease-out hover:shadow-2xl ${colors.borderHover} p-8 relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/3 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            <div className="relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchAnnouncements()}
              className={`px-6 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors`}
            >
              Try Again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
              </svg>
            </div>
            <p className="text-gray-600">
              {mode === 'admin' ? 'No announcements found. Create your first announcement!' : 'No announcements available'}
            </p>
          </div>
        ) : (mode === 'admin' || announcementFilter === 'my') ? (
          // Table View: Admin always sees table, or "My Announcements" tab for all users
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700">
                  <th className="px-6 py-4 text-left font-semibold">
                    <input
                      type="checkbox"
                      checked={selectedAnnouncements.length === announcements.length && announcements.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left font-semibold">Title</th>
                  <th className="px-6 py-4 text-left font-semibold">Priority</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Type</th>
                  <th className="px-6 py-4 text-left font-semibold">Target Audience</th>
                  <th className="px-6 py-4 text-left font-semibold">Publisher</th>
                  <th className="px-6 py-4 text-left font-semibold">Publish Date</th>
                  <th className="px-6 py-4 text-left font-semibold">Views</th>
                  <th className="px-6 py-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann) => (
                  <tr key={ann.id} className="border-b transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedAnnouncements.includes(ann.id)}
                        onChange={() => handleSelectAnnouncement(ann.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800 flex items-center gap-2">
                          {ann.isPinned && (
                            <span className="text-yellow-600" title="Pinned">
                              📌
                            </span>
                          )}
                          {ann.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {ann.content ? ann.content.substring(0, 60) + '...' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityClass(ann.priority)}`}>
                        {ann.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(ann.status)}`}>
                        {ann.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                        {ann.announcementType ? ann.announcementType.replace('_', ' ') : 'general'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        {ann.targetAudience}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        {ann.creator?.profilePictureUrl ? (
                          <img 
                            src={ann.creator.profilePictureUrl} 
                            alt={ann.creator.name || 'Publisher'}
                            className="w-6 h-6 rounded-full object-cover border border-gray-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span>
                          {ann.creator ? getPublisherLabel(ann.creator.role, ann.creator.name || ann.creator.email) : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(ann.publishDate)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{ann.views || 0}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        {/* Read Status - Only show if NOT in "My Announcements" tab and NOT own announcement */}
                        {announcementFilter !== 'my' && ann.creator && ann.creator.id !== currentUserId && (
                          <>
                            {readStatuses[ann.id]?.read ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold whitespace-nowrap">Read</span>
                            ) : (
                              <button
                                onClick={() => handleMarkAsRead(ann.id)}
                                className="text-blue-600 hover:text-blue-800 transition-all p-1.5 hover:bg-blue-50 rounded"
                                title="Mark as Read"
                                disabled={readStatuses[ann.id]?.read}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                        
                        {/* Acknowledgment - only show if required and user is not the creator */}
                        {ann.requiresAcknowledgment && ann.creator && ann.creator.id !== currentUserId && (
                          <>
                            {readStatuses[ann.id]?.acknowledged ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold whitespace-nowrap">Acknowledged</span>
                            ) : (
                              <button
                                onClick={() => handleAcknowledge(ann.id)}
                                className="text-green-600 hover:text-green-800 transition-all p-1.5 hover:bg-green-50 rounded"
                                title="Acknowledge"
                                disabled={readStatuses[ann.id]?.acknowledged}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                        
                        {/* Pin button - System Admin only */}
                        {currentUserRole === 'SYS.AD' && (
                          <button
                            onClick={() => handleTogglePin(ann.id)}
                            className={`transition-all p-1.5 hover:bg-gray-100 rounded ${ann.isPinned ? 'text-yellow-600 hover:text-yellow-800' : 'text-gray-400 hover:text-gray-600'}`}
                            title={ann.isPinned ? 'Unpin' : 'Pin'}
                          >
                            <svg className="w-4 h-4" fill={ann.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                            </svg>
                          </button>
                        )}
                        
                        {/* Analytics button */}
                        {(currentUserRole === 'SYS.AD' || (ann.creator && ann.creator.id === currentUserId)) && (
                          <button
                            onClick={() => handleViewAnalytics(ann.id)}
                            className="text-purple-600 hover:text-purple-800 transition-all p-1.5 hover:bg-purple-50 rounded"
                            title="View Analytics"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                          </button>
                        )}
                        
                        {/* Edit button - System Admin can only edit own announcements, others can edit their own */}
                        {((currentUserRole === 'SYS.AD' && ann.creator && ann.creator.id === currentUserId) || 
                          (currentUserRole !== 'SYS.AD' && ann.creator && ann.creator.id === currentUserId)) && (
                          <button
                            onClick={() => openEditModal(ann)}
                            className="text-blue-600 hover:text-blue-800 transition-all p-1.5 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                        )}
                        
                        {/* View button */}
                        <button
                          onClick={() => openViewModal(ann)}
                          className="text-green-600 hover:text-green-800 transition-all p-1.5 hover:bg-green-50 rounded"
                          title="View"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        </button>
                        
                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="text-red-600 hover:text-red-800 transition-all p-1.5 hover:bg-red-50 rounded"
                          title="Delete"
                          disabled={isAnnouncementLocked(ann.id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Banner-Card View for "All Announcements" tab
          <div className="space-y-6">
            {announcements.map((announcement) => {
              const isOwnAnnouncement = announcement.creator && announcement.creator.id === currentUserId;
              // Get creator's theme colors
              const creatorRole = announcement.creator?.role || 'SYS.AD';
              const creatorTheme = getThemeByRole(creatorRole);
              const creatorColors = themeColors[creatorTheme] || themeColors.blue;
              
              return (
                <div
                  key={announcement.id}
                  className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    isOwnAnnouncement 
                      ? `border-2 ${colors.border} bg-white`
                      : `border-2 ${creatorColors.border} bg-white`
                  }`}
                >
                  {/* Banner Header with Gradient - Using Creator's Theme */}
                  <div className={`relative h-28 bg-gradient-to-r ${creatorColors.gradient}`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    {/* Unread Indicator - Red Pulsing Dot */}
                    {!readStatuses[announcement.id]?.read && announcement.creator && announcement.creator.id !== currentUserId && (
                      <div className="absolute top-3 right-3 z-10">
                        <div className="relative">
                          {/* Pulsing Red Dot */}
                          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                          <div className="relative w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
                        </div>
                      </div>
                    )}
                    {/* Red Laser Beam Animation - Traveling around rectangular border */}
                    {!readStatuses[announcement.id]?.read && announcement.creator && announcement.creator.id !== currentUserId && (
                      <div 
                        className="absolute pointer-events-none"
                        style={{ 
                          top: '-2px',
                          left: '-2px',
                          right: '-2px',
                          bottom: '-2px',
                          zIndex: 1,
                          overflow: 'visible'
                        }}
                      >
                        {/* Traveling red line around border */}
                        <div 
                          className="absolute bg-red-500"
                          style={{
                            width: '60px',
                            height: '3px',
                            top: '0',
                            left: '0',
                            boxShadow: '0 0 10px #ef4444, 0 0 15px #ef4444, 0 0 20px rgba(239, 68, 68, 0.5)',
                            animation: 'laserBeamTravel 3s linear infinite',
                            borderRadius: '2px',
                            zIndex: 10
                          }}
                        ></div>
                      </div>
                    )}
                    <div className="absolute top-4 left-6 right-6">
                      {/* Title and Publisher Row */}
                      <div className="flex items-center gap-3 mb-2">
                        {/* Profile Picture */}
                        {announcement.creator?.profilePictureUrl ? (
                          <img 
                            src={announcement.creator.profilePictureUrl} 
                            alt={announcement.creator.name || 'Publisher'}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-md"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 shadow-md flex items-center justify-center">
                            <svg 
                              className="w-6 h-6 text-white" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-white mb-1">
                            {announcement.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              {announcement.creator 
                                ? getPublisherLabel(announcement.creator.role, announcement.creator.name || announcement.creator.email)
                                : 'Unknown Publisher'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {announcement.isPinned && (
                            <span className="text-yellow-300 text-xl" title="Pinned">📌</span>
                          )}
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                            {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
                          </span>
                          {isOwnAnnouncement && (
                            <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                              My Announcement
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={selectedAnnouncements.includes(announcement.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectAnnouncement(announcement.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Publish Date */}
                        <div className="mb-4 flex items-center gap-2 text-sm">
                          <span className="text-gray-500">{formatDate(announcement.publishDate)}</span>
                        </div>

                        {/* Content Preview */}
                        {announcement.contentHtml ? (
                          <div 
                            className="text-gray-700 mb-4 leading-relaxed prose prose-sm max-w-none line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: announcement.contentHtml.substring(0, 300) + (announcement.contentHtml.length > 300 ? '...' : '') }}
                          />
                        ) : (
                          <p className="text-gray-700 mb-4 leading-relaxed line-clamp-3">
                            {announcement.content.substring(0, 300)}{announcement.content.length > 300 ? '...' : ''}
                          </p>
                        )}

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                              {announcement.announcementType ? announcement.announcementType.replace('_', ' ') : 'general'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              {announcement.targetAudience}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            <span>{announcement.views || 0} views</span>
                          </div>
                          {announcement.attachments && announcement.attachments.length > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                              </svg>
                              <span>{announcement.attachments.length} attachment(s)</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 flex-wrap">
                          {/* Read Status */}
                          {readStatuses[announcement.id]?.read ? (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Read</span>
                          ) : (
                            <button
                              onClick={() => handleMarkAsRead(announcement.id)}
                              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={readStatuses[announcement.id]?.read}
                            >
                              Mark as Read
                            </button>
                          )}
                          
                          {/* Acknowledgment - only show if required and user is not the creator */}
                          {announcement.requiresAcknowledgment && announcement.creator && announcement.creator.id !== currentUserId && (
                            <>
                              {readStatuses[announcement.id]?.acknowledged ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Acknowledged</span>
                              ) : (
                                <button
                                  onClick={() => handleAcknowledge(announcement.id)}
                                  className={`px-4 py-1.5 ${colors.primary} text-white rounded-lg text-xs font-semibold ${colors.primaryHover} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                  disabled={readStatuses[announcement.id]?.acknowledged}
                                >
                                  Acknowledge
                                </button>
                              )}
                            </>
                          )}
                          
                          {!readStatuses[announcement.id]?.read && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">New</span>
                          )}
                          
                          <button
                            onClick={() => openViewModal(announcement)}
                            className={`px-4 py-1.5 ${colors.primary} text-white rounded-lg text-xs font-semibold ${colors.primaryHover} transition-all`}
                          >
                            Read More →
                          </button>
                          {(currentUserRole === 'SYS.AD' || (announcement.creator && announcement.creator.id === currentUserId)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAnalytics(announcement.id);
                              }}
                              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-all"
                              title="View Analytics"
                            >
                              Analytics
                            </button>
                          )}
                          {/* Edit button - only for own announcements */}
                          {announcement.creator && announcement.creator.id === currentUserId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(announcement);
                              }}
                              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
                              title="Edit"
                            >
                              Edit
                            </button>
                          )}
                          {/* Delete button - System Admin can delete all, others can delete own */}
                          {(currentUserRole === 'SYS.AD' || (announcement.creator && announcement.creator.id === currentUserId)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(announcement.id);
                              }}
                              className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"
                              title="Delete"
                              disabled={isAnnouncementLocked(announcement.id)}
                            >
                              {isAnnouncementLocked(announcement.id) ? 'Locked' : 'Delete'}
                            </button>
                          )}
                        </div>
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
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Create New Announcement</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <span className={`text-xs ${formData.title.length > 200 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {formData.title.length} / 200
                  </span>
                </div>
                <input
                  id="title"
                  type="text"
                  required
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => {
                    let newValue = e.target.value;
                    // Auto-capitalize first character
                    if (newValue.length > 0 && formData.title.length === 0) {
                      newValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
                    }
                    setFormData({ ...formData, title: newValue });
                    if (validationErrors.title) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.title;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  } ${formData.title.length > 200 ? 'border-red-500' : ''}`}
                  placeholder="Enter announcement title"
                />
                {validationErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                )}
                {formData.title.length > 200 && (
                  <p className="mt-1 text-sm text-red-600">Title cannot exceed 200 characters</p>
                )}
              </div>

              <div id="content-field-wrapper">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Content *</label>
                  <span className={`text-xs ${formData.content.length > 5000 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {formData.content.length} / 5000
                  </span>
                </div>
                {quillLoaded && ReactQuill ? (
                  <div className={validationErrors.content ? 'border-2 border-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={formData.contentHtml || formData.content}
                      onChange={(value) => {
                        // Extract plain text for content field
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = value;
                        let plainText = tempDiv.textContent || tempDiv.innerText || '';
                        
                        // Auto-capitalize first character if content was empty (handled in useEffect to avoid cursor issues)
                        
                        // Enforce character limit
                        if (plainText.length > 5000) {
                          plainText = plainText.substring(0, 5000);
                          // Truncate HTML content as well
                          const truncatedDiv = document.createElement('div');
                          truncatedDiv.innerHTML = value;
                          let truncatedText = truncatedDiv.textContent || truncatedDiv.innerText || '';
                          if (truncatedText.length > 5000) {
                            // Find the position in HTML that corresponds to 5000 chars
                            let htmlLength = 0;
                            let textLength = 0;
                            for (let i = 0; i < value.length; i++) {
                              if (value[i] === '<') {
                                // Skip HTML tags
                                const tagEnd = value.indexOf('>', i);
                                if (tagEnd !== -1) {
                                  i = tagEnd;
                                  continue;
                                }
                              } else {
                                textLength++;
                                if (textLength >= 5000) {
                                  value = value.substring(0, htmlLength);
                                  break;
                                }
                              }
                              htmlLength++;
                            }
                          }
                        }
                        
                        setFormData({ 
                          ...formData, 
                          content: plainText,
                          contentHtml: value 
                        });
                        if (validationErrors.content && plainText.trim()) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.content;
                            return newErrors;
                          });
                        }
                      }}
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          [{ 'color': [] }, { 'background': [] }],
                          ['link'],
                          ['clean']
                        ]
                      }}
                      className="bg-white"
                      style={{ minHeight: '200px', marginBottom: '50px' }}
                    />
                  </div>
                ) : (
                  <textarea
                    id="content"
                    rows="6"
                    required
                    maxLength={5000}
                    value={formData.content}
                    onChange={(e) => {
                      let newValue = e.target.value;
                      // Auto-capitalize first character
                      if (newValue.length > 0 && formData.content.length === 0) {
                        newValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
                      }
                      setFormData({ ...formData, content: newValue, contentHtml: newValue });
                      if (validationErrors.content) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.content;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.content ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    } ${formData.content.length > 5000 ? 'border-red-500' : ''}`}
                    placeholder="Enter announcement content"
                  />
                )}
                {validationErrors.content && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.content}</p>
                )}
                {formData.content.length > 5000 && (
                  <p className="mt-1 text-sm text-red-600">Content cannot exceed 5000 characters</p>
                )}
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{file.name} ({formatFileSize(file.size)})</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acknowledgment Deadline - Always Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Acknowledgment Deadline *</label>
                <input
                  type="datetime-local"
                  id="acknowledgmentDeadline"
                  required
                  value={formData.acknowledgmentDeadline}
                  min={(() => {
                    if (!formData.publishDate) return '';
                    const publishDate = new Date(formData.publishDate);
                    // Add 1 hour to publish date
                    const minDate = new Date(publishDate.getTime() + 60 * 60 * 1000);
                    // Format as YYYY-MM-DDTHH:mm for datetime-local input
                    const year = minDate.getFullYear();
                    const month = String(minDate.getMonth() + 1).padStart(2, '0');
                    const day = String(minDate.getDate()).padStart(2, '0');
                    const hours = String(minDate.getHours()).padStart(2, '0');
                    const minutes = String(minDate.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                  })()}
                  onChange={(e) => {
                    const newDeadline = e.target.value;
                    setFormData({ 
                      ...formData, 
                      acknowledgmentDeadline: newDeadline,
                      // Auto-populate expiry date from acknowledgment deadline
                      expiryDate: newDeadline
                    });
                    // Clear validation errors
                    if (validationErrors.acknowledgmentDeadline) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.acknowledgmentDeadline;
                        return newErrors;
                      });
                    }
                    if (validationErrors.expiryDate) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.expiryDate;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.acknowledgmentDeadline ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {validationErrors.acknowledgmentDeadline && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.acknowledgmentDeadline}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 1 hour after the Publish Date ({formData.publishDate ? new Date(formData.publishDate).toLocaleString('en-US', { 
                    month: '2-digit', 
                    day: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  }) : 'N/A'})
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                  <select
                    id="priority"
                    required
                    value={formData.priority}
                    onChange={(e) => {
                      setFormData({ ...formData, priority: e.target.value });
                      if (validationErrors.priority) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.priority;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.priority ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  {validationErrors.priority && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.priority}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Announcement Type *</label>
                  <select
                    id="announcementType"
                    required
                    value={formData.announcementType}
                    onChange={(e) => {
                      setFormData({ ...formData, announcementType: e.target.value });
                      if (validationErrors.announcementType) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.announcementType;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.announcementType ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    {getAllowedAnnouncementTypes().map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  {validationErrors.announcementType && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.announcementType}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience *</label>
                <select
                  id="targetAudience"
                  required
                  value={formData.targetAudience}
                  onChange={(e) => {
                    setFormData({ ...formData, targetAudience: e.target.value });
                    if (validationErrors.targetAudience) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.targetAudience;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.targetAudience ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="all">All Users</option>
                  <option value="SYS.AD">System Admin</option>
                  <option value="LGU-PMT">LGU-PMT</option>
                  <option value="LGU-IU">LGU-IU</option>
                  <option value="EIU">EIU</option>
                  <option value="EMS">Executive Viewer</option>
                </select>
                {validationErrors.targetAudience && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.targetAudience}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date *</label>
                  <input
                    type="datetime-local"
                    id="publishDate"
                    value={formData.publishDate}
                    readOnly
                    disabled
                    className={`w-full px-4 py-3 border rounded-lg bg-gray-50 cursor-not-allowed ${
                      validationErrors.publishDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.publishDate && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.publishDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                  <input
                    type="datetime-local"
                    id="expiryDate"
                    value={formData.expiryDate}
                    readOnly
                    disabled
                    className={`w-full px-4 py-3 border rounded-lg bg-gray-50 cursor-not-allowed ${
                      validationErrors.expiryDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.expiryDate && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.expiryDate}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Automatically set from Acknowledgment Deadline
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="notifyUsers"
                  checked={formData.sendEmailNotification}
                  onChange={(e) => setFormData({ ...formData, sendEmailNotification: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="notifyUsers" className="text-sm text-gray-700">
                  Send email notification to target users
                </label>
              </div>

              {/* Phase 3C: Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (selectedCategories.includes(cat.id)) {
                          setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                        } else {
                          setSelectedCategories([...selectedCategories, cat.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={selectedCategories.includes(cat.id) && cat.color ? { backgroundColor: cat.color } : {}}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                {categories.length === 0 && (
                  <p className="text-sm text-gray-500">No categories available. Create categories to organize announcements.</p>
                )}
              </div>

              {/* Phase 3C: Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (selectedTags.includes(tag.id)) {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        } else {
                          setSelectedTags([...selectedTags, tag.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        selectedTags.includes(tag.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={selectedTags.includes(tag.id) && tag.color ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500">No tags available. Create tags to label announcements.</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 hover:shadow-md transform hover:scale-[1.02] transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    setShowLoadingModal(true);
                    setLoadingMessage('Saving draft...');
                    setValidationErrors({});
                    
                    try {
                      const announcementData = {
                        ...formData,
                        contentHtml: formData.contentHtml || formData.content,
                        status: 'draft', // Save as draft
                        categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
                        tagIds: selectedTags.length > 0 ? selectedTags : undefined
                      };
                      
                      const response = await announcementsAPI.createAnnouncement(announcementData, attachments);
                      if (response.success) {
                        setShowLoadingModal(false);
                        setShowCreateModal(false);
                        resetForm();
                        setAttachments([]);
                        setExistingAttachments([]);
                        setAttachmentsToDelete([]);
                        setValidationErrors({});
                        fetchAnnouncements();
                        setSuccessMessage('Draft saved successfully!');
                        setShowSuccessModal(true);
                        setTimeout(() => {
                          setShowSuccessModal(false);
                        }, 2000);
                      } else {
                        setShowLoadingModal(false);
                        const errorMsg = response.error || 'Unknown error';
                        setErrorMessage('Failed to save draft: ' + errorMsg);
                        setShowErrorModal(true);
                      }
                    } catch (err) {
                      console.error('Error saving draft:', err);
                      setShowLoadingModal(false);
                      const errorMsg = err.message || err.data?.error || 'Failed to save draft. Please try again.';
                      setErrorMessage(errorMsg);
                      setShowErrorModal(true);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 hover:shadow-md transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {submitting ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-6 py-3 ${colors.primary} text-white rounded-lg font-semibold ${colors.primaryHover} hover:shadow-md transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {submitting ? 'Creating...' : 'Create Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Edit Announcement</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                  setSelectedAnnouncement(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Same form fields as create modal */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <span className={`text-xs ${formData.title.length > 200 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {formData.title.length} / 200
                  </span>
                </div>
                <input
                  id="editTitle"
                  type="text"
                  required
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formData.title.length > 200 ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formData.title.length > 200 && (
                  <p className="mt-1 text-sm text-red-600">Title cannot exceed 200 characters</p>
                )}
              </div>

              <div id="edit-content-field-wrapper">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Content *</label>
                  <span className={`text-xs ${formData.content.length > 5000 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {formData.content.length} / 5000
                  </span>
                </div>
                {quillLoaded && ReactQuill ? (
                  <div>
                    <ReactQuill
                      theme="snow"
                      value={formData.contentHtml || formData.content}
                      onChange={(value) => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = value;
                        let plainText = tempDiv.textContent || tempDiv.innerText || '';
                        
                        // Enforce character limit
                        if (plainText.length > 5000) {
                          plainText = plainText.substring(0, 5000);
                          // Truncate HTML content as well
                          const truncatedDiv = document.createElement('div');
                          truncatedDiv.innerHTML = value;
                          let truncatedText = truncatedDiv.textContent || truncatedDiv.innerText || '';
                          if (truncatedText.length > 5000) {
                            // Find the position in HTML that corresponds to 5000 chars
                            let htmlLength = 0;
                            let textLength = 0;
                            for (let i = 0; i < value.length; i++) {
                              if (value[i] === '<') {
                                // Skip HTML tags
                                const tagEnd = value.indexOf('>', i);
                                if (tagEnd !== -1) {
                                  i = tagEnd;
                                  continue;
                                }
                              } else {
                                textLength++;
                                if (textLength >= 5000) {
                                  value = value.substring(0, htmlLength);
                                  break;
                                }
                              }
                              htmlLength++;
                            }
                          }
                        }
                        
                        setFormData({ 
                          ...formData, 
                          content: plainText,
                          contentHtml: value 
                        });
                      }}
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          [{ 'color': [] }, { 'background': [] }],
                          ['link'],
                          ['clean']
                        ]
                      }}
                      className="bg-white"
                      style={{ minHeight: '200px', marginBottom: '50px' }}
                    />
                  </div>
                ) : (
                  <textarea
                    id="editContent"
                    rows="6"
                    required
                    maxLength={5000}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value, contentHtml: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formData.content.length > 5000 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter announcement content"
                  />
                )}
                {formData.content.length > 5000 && (
                  <p className="mt-1 text-sm text-red-600">Content cannot exceed 5000 characters</p>
                )}
              </div>

              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Existing Attachments</label>
                  <div className="space-y-2">
                    {existingAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <a
                          href={announcementsAPI.downloadAttachment(attachment.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {attachment.originalFileName} ({formatFileSize(attachment.fileSize)})
                        </a>
                        <button
                          type="button"
                          onClick={() => removeExistingAttachment(attachment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Attachments</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{file.name} ({formatFileSize(file.size)})</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acknowledgment Deadline - Always Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Acknowledgment Deadline *</label>
                <input
                  type="datetime-local"
                  id="editAcknowledgmentDeadline"
                  required
                  value={formData.acknowledgmentDeadline}
                  min={(() => {
                    if (!formData.publishDate) return '';
                    const publishDate = new Date(formData.publishDate);
                    // Add 1 hour to publish date
                    const minDate = new Date(publishDate.getTime() + 60 * 60 * 1000);
                    // Format as YYYY-MM-DDTHH:mm for datetime-local input
                    const year = minDate.getFullYear();
                    const month = String(minDate.getMonth() + 1).padStart(2, '0');
                    const day = String(minDate.getDate()).padStart(2, '0');
                    const hours = String(minDate.getHours()).padStart(2, '0');
                    const minutes = String(minDate.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                  })()}
                  onChange={(e) => {
                    const newDeadline = e.target.value;
                    setFormData({ 
                      ...formData, 
                      acknowledgmentDeadline: newDeadline,
                      // Auto-populate expiry date from acknowledgment deadline
                      expiryDate: newDeadline
                    });
                    // Clear validation errors
                    if (validationErrors.acknowledgmentDeadline) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.acknowledgmentDeadline;
                        return newErrors;
                      });
                    }
                    if (validationErrors.expiryDate) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.expiryDate;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.acknowledgmentDeadline ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {validationErrors.acknowledgmentDeadline && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.acknowledgmentDeadline}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 1 hour after the Publish Date ({formData.publishDate ? new Date(formData.publishDate).toLocaleString('en-US', { 
                    month: '2-digit', 
                    day: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  }) : 'N/A'})
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Announcement Type *</label>
                  <select
                    required
                    value={formData.announcementType}
                    onChange={(e) => setFormData({ ...formData, announcementType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {getAllowedAnnouncementTypes().map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience *</label>
                <select
                  required
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  <option value="SYS.AD">System Admin</option>
                  <option value="LGU-PMT">LGU-PMT</option>
                  <option value="LGU-IU">LGU-IU</option>
                  <option value="EIU">EIU</option>
                  <option value="EMS">Executive Viewer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                  <input
                    type="datetime-local"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                  <input
                    type="datetime-local"
                    id="editExpiryDate"
                    value={formData.expiryDate}
                    readOnly
                    disabled
                    className={`w-full px-4 py-3 border rounded-lg bg-gray-50 cursor-not-allowed ${
                      validationErrors.expiryDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.expiryDate && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.expiryDate}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Automatically set from Acknowledgment Deadline
                  </p>
                </div>
              </div>

              {/* Phase 3C: Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (selectedCategories.includes(cat.id)) {
                          setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                        } else {
                          setSelectedCategories([...selectedCategories, cat.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={selectedCategories.includes(cat.id) && cat.color ? { backgroundColor: cat.color } : {}}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase 3C: Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (selectedTags.includes(tag.id)) {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        } else {
                          setSelectedTags([...selectedTags, tag.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        selectedTags.includes(tag.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={selectedTags.includes(tag.id) && tag.color ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                    setSelectedAnnouncement(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                {selectedAnnouncement?.status === 'draft' && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!selectedAnnouncement) return;
                      
                      setSubmitting(true);
                      setShowLoadingModal(true);
                      setLoadingMessage('Saving draft...');
                      
                      try {
                        const announcementData = {
                          ...formData,
                          contentHtml: formData.contentHtml || formData.content,
                          status: 'draft', // Keep as draft
                          categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
                          tagIds: selectedTags.length > 0 ? selectedTags : undefined,
                          requiresApproval: requiresApproval
                        };
                        
                        const response = await announcementsAPI.updateAnnouncement(
                          selectedAnnouncement.id, 
                          announcementData, 
                          attachments,
                          attachmentsToDelete
                        );
                        if (response.success) {
                          setShowLoadingModal(false);
                          setShowEditModal(false);
                          resetForm();
                          setSelectedAnnouncement(null);
                          setAttachments([]);
                          setExistingAttachments([]);
                          setAttachmentsToDelete([]);
                          fetchAnnouncements();
                          setSuccessMessage('Draft saved successfully!');
                          setShowSuccessModal(true);
                          setTimeout(() => {
                            setShowSuccessModal(false);
                          }, 2000);
                        } else {
                          setShowLoadingModal(false);
                          const errorMsg = response.error || 'Unknown error';
                          setErrorMessage('Failed to save draft: ' + errorMsg);
                          setShowErrorModal(true);
                        }
                      } catch (err) {
                        console.error('Error saving draft:', err);
                        setShowLoadingModal(false);
                        const errorMsg = err.message || err.data?.error || 'Failed to save draft. Please try again.';
                        setErrorMessage(errorMsg);
                        setShowErrorModal(true);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save as Draft'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-6 py-3 ${colors.primary} text-white rounded-lg font-semibold ${colors.primaryHover} transition-all disabled:opacity-50`}
                >
                  {submitting ? 'Updating...' : selectedAnnouncement?.status === 'draft' ? 'Publish Announcement' : 'Update Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{selectedAnnouncement.title}</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAnnouncement(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Rich Text Content */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Content</p>
                {selectedAnnouncement.contentHtml ? (
                  <div 
                    className="text-gray-800 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedAnnouncement.contentHtml }}
                  />
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                )}
              </div>

              {/* Attachments */}
              {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Attachments</p>
                  <div className="space-y-2">
                    {selectedAnnouncement.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <a
                          href={`${API_URL}/admin/announcements/attachments/${attachment.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                          onClick={async (e) => {
                            e.preventDefault();
                            const token = getToken();
                            if (!token) {
                              alert('Please log in to download files');
                              return;
                            }
                            try {
                              const response = await fetch(`${API_URL}/admin/announcements/attachments/${attachment.id}/download`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = attachment.originalFileName;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } else {
                                alert('Failed to download file');
                              }
                            } catch (err) {
                              console.error('Download error:', err);
                              alert('Failed to download file');
                            }
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                          </svg>
                          {attachment.originalFileName} ({formatFileSize(attachment.fileSize)})
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acknowledgment Button - Only show if user is not the creator */}
              {selectedAnnouncement.requiresAcknowledgment && selectedAnnouncement.creator && selectedAnnouncement.creator.id !== currentUserId && (
                <div className="border-t pt-4">
                  {readStatuses[selectedAnnouncement.id]?.acknowledged ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span className="font-semibold">Acknowledged</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(selectedAnnouncement.id)}
                      className={`w-full px-6 py-3 ${colors.primary} text-white rounded-lg font-semibold ${colors.primaryHover} transition-all flex items-center justify-center gap-2`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Acknowledge Announcement
                    </button>
                  )}
                  {selectedAnnouncement.acknowledgmentDeadline && (
                    <p className="text-sm text-gray-500 mt-2">
                      Deadline: {formatDate(selectedAnnouncement.acknowledgmentDeadline)}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-gray-600">Priority</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getPriorityClass(selectedAnnouncement.priority)}`}>
                    {selectedAnnouncement.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusClass(selectedAnnouncement.status)}`}>
                    {selectedAnnouncement.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Target Audience</p>
                  <p className="text-gray-800 mt-1">{selectedAnnouncement.targetAudience}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Type</p>
                  <p className="text-gray-800 mt-1">
                    {selectedAnnouncement.announcementType ? selectedAnnouncement.announcementType.replace('_', ' ') : 'general'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-gray-800 mt-1">{formatDate(selectedAnnouncement.publishDate)}</p>
                </div>
                {selectedAnnouncement.expiryDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expires</p>
                    <p className="text-gray-800 mt-1">{formatDate(selectedAnnouncement.expiryDate)}</p>
                  </div>
                )}
                {mode === 'admin' && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Views</p>
                    <p className="text-gray-800 mt-1">{selectedAnnouncement.views || 0}</p>
                  </div>
                )}
              </div>

              {/* Phase 3A: Engagement & Interaction Section */}
              <div className="border-t pt-6 mt-6">
                {/* Reactions, Favorite, Share */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  {/* Reactions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleReaction(selectedAnnouncement.id, 'helpful')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        userReactions[selectedAnnouncement.id]?.helpful
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>👍</span>
                      <span className="text-sm font-medium">
                        {reactions[selectedAnnouncement.id]?.helpful || 0}
                      </span>
                    </button>
                    <button
                      onClick={() => handleToggleReaction(selectedAnnouncement.id, 'important')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        userReactions[selectedAnnouncement.id]?.important
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>❤️</span>
                      <span className="text-sm font-medium">
                        {reactions[selectedAnnouncement.id]?.important || 0}
                      </span>
                    </button>
                    <button
                      onClick={() => handleToggleReaction(selectedAnnouncement.id, 'acknowledged')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        userReactions[selectedAnnouncement.id]?.acknowledged
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>✅</span>
                      <span className="text-sm font-medium">
                        {reactions[selectedAnnouncement.id]?.acknowledged || 0}
                      </span>
                    </button>
                    <button
                      onClick={() => handleToggleReaction(selectedAnnouncement.id, 'urgent')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        userReactions[selectedAnnouncement.id]?.urgent
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>⚠️</span>
                      <span className="text-sm font-medium">
                        {reactions[selectedAnnouncement.id]?.urgent || 0}
                      </span>
                    </button>
                  </div>

                  {/* Favorite & Share */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFavorite(selectedAnnouncement.id)}
                      className={`p-2 rounded-lg transition-all ${
                        favorites[selectedAnnouncement.id]
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Add to favorites"
                    >
                      <svg className="w-5 h-5" fill={favorites[selectedAnnouncement.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleShare(selectedAnnouncement.id)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                      title="Share announcement"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                      </svg>
                    </button>
                    {(currentUserRole === 'SYS.AD' || (selectedAnnouncement.creator && selectedAnnouncement.creator.id === currentUserId) || selectedAnnouncement.createdBy === currentUserId) && (
                      <>
                        <button
                          onClick={() => handleDuplicate(selectedAnnouncement.id)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          title="Duplicate announcement"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleViewAnalytics(selectedAnnouncement.id)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          title="View analytics"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                          </svg>
                        </button>
                        {/* Phase 3C: Version History Button */}
                        <button
                          onClick={() => loadVersionHistory(selectedAnnouncement.id)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          title="View version history"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Phase 3C: Approval Workflow Section */}
                {selectedAnnouncement.requiresApproval && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Approval Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                          selectedAnnouncement.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                          selectedAnnouncement.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {selectedAnnouncement.approvalStatus || 'pending'}
                        </span>
                      </div>
                      {(currentUserRole === 'SYS.AD' || currentUserRole === 'EMS') && selectedAnnouncement.approvalStatus === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                setShowLoadingModal(true);
                                setLoadingMessage('Approving announcement...');
                                const response = await announcementsAPI.approveAnnouncement(selectedAnnouncement.id, 'Approved');
                                if (response.success) {
                                  setShowLoadingModal(false);
                                  setSuccessMessage('Announcement approved successfully!');
                                  setShowSuccessModal(true);
                                  fetchAnnouncements();
                                  setTimeout(() => setShowSuccessModal(false), 2000);
                                }
                              } catch (err) {
                                setShowLoadingModal(false);
                                setErrorMessage('Failed to approve announcement');
                                setShowErrorModal(true);
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                setShowLoadingModal(true);
                                setLoadingMessage('Rejecting announcement...');
                                const response = await announcementsAPI.rejectAnnouncement(selectedAnnouncement.id, 'Rejected');
                                if (response.success) {
                                  setShowLoadingModal(false);
                                  setSuccessMessage('Announcement rejected');
                                  setShowSuccessModal(true);
                                  fetchAnnouncements();
                                  setTimeout(() => setShowSuccessModal(false), 2000);
                                }
                              } catch (err) {
                                setShowLoadingModal(false);
                                setErrorMessage('Failed to reject announcement');
                                setShowErrorModal(true);
                              }
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Phase 3C: Categories and Tags Display */}
                {(selectedAnnouncement.categoryMappings?.length > 0 || selectedAnnouncement.tagMappings?.length > 0) && (
                  <div className="border-t pt-4 mt-4">
                    {selectedAnnouncement.categoryMappings?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Categories</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAnnouncement.categoryMappings.map(mapping => (
                            <span
                              key={mapping.category?.id}
                              className="px-3 py-1 rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: mapping.category?.color || '#3B82F6' }}
                            >
                              {mapping.category?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedAnnouncement.tagMappings?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAnnouncement.tagMappings.map(mapping => (
                            <span
                              key={mapping.tag?.id}
                              className="px-3 py-1 rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: mapping.tag?.color || '#6B7280' }}
                            >
                              {mapping.tag?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Comments ({comments[selectedAnnouncement.id]?.length || 0})
                </h4>

                {/* Comment Input */}
                <div className="mb-6">
                    <textarea
                      value={commentText[selectedAnnouncement.id] || ''}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [selectedAnnouncement.id]: e.target.value }))}
                      placeholder={replyingTo?.announcementId === selectedAnnouncement.id ? 'Write a reply...' : 'Write a comment...'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="3"
                    />
                    <div className="flex items-center justify-between mt-2">
                      {replyingTo?.announcementId === selectedAnnouncement.id && (
                        <span className="text-sm text-gray-500">
                          Replying to comment
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const content = commentText[selectedAnnouncement.id]?.trim();
                          if (content) {
                            handleCreateComment(
                              selectedAnnouncement.id,
                              content,
                              replyingTo?.announcementId === selectedAnnouncement.id ? replyingTo.commentId : null
                            );
                          }
                        }}
                        disabled={!commentText[selectedAnnouncement.id]?.trim()}
                        className={`px-4 py-2 ${colors.primary} text-white rounded-lg font-semibold ${colors.primaryHover} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {replyingTo?.announcementId === selectedAnnouncement.id ? 'Reply' : 'Comment'}
                      </button>
                    </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {comments[selectedAnnouncement.id]?.length > 0 ? (
                      comments[selectedAnnouncement.id].map((comment) => (
                        <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-800">
                                  {comment.author?.name || 'Unknown User'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(comment.createdAt)}
                                  {comment.isEdited && ' (edited)'}
                                </span>
                              </div>
                              {editingComment === comment.id ? (
                                <div>
                                  <textarea
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows="2"
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => {
                                        const content = editingCommentText.trim();
                                        if (content) {
                                          handleUpdateComment(selectedAnnouncement.id, comment.id, content);
                                        }
                                      }}
                                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingComment(null);
                                        setEditingCommentText('');
                                      }}
                                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-700">{comment.content}</p>
                              )}
                            </div>
                            {comment.author?.id === currentUserId && editingComment !== comment.id && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingComment(comment.id);
                                    setEditingCommentText(comment.content);
                                  }}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(selectedAnnouncement.id, comment.id)}
                                  className="text-sm text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setReplyingTo({ announcementId: selectedAnnouncement.id, commentId: comment.id })}
                            className="text-sm text-gray-500 hover:text-gray-700 mt-2"
                          >
                            Reply
                          </button>

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-3">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="border-l-2 border-gray-100 pl-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-800 text-sm">
                                          {reply.author?.name || 'Unknown User'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatDate(reply.createdAt)}
                                          {reply.isEdited && ' (edited)'}
                                        </span>
                                      </div>
                                      <p className="text-gray-700 text-sm">{reply.content}</p>
                                    </div>
                                    {(reply.author?.id === currentUserId || currentUserRole === 'SYS.AD') && (
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleDeleteComment(selectedAnnouncement.id, reply.id)}
                                          className="text-xs text-red-600 hover:underline"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Share Announcement</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  onClick={copyShareLink}
                  className={`px-4 py-2 ${colors.primary} text-white rounded-lg font-semibold ${colors.primaryHover} transition-all`}
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Announcement Analytics</h3>
              <button
                onClick={() => {
                  setShowAnalyticsModal(false);
                  setAnalyticsData(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : analyticsData ? (
              <div className="space-y-6">
                {/* Announcement Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">{analyticsData.announcement.title}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-medium">{analyticsData.announcement.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Published:</span>
                      <span className="ml-2 font-medium">
                        {analyticsData.announcement.publishDate 
                          ? new Date(analyticsData.announcement.publishDate).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 font-medium">
                        {new Date(analyticsData.announcement.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Views:</span>
                      <span className="ml-2 font-medium">{analyticsData.announcement.views || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="text-sm text-blue-600 font-medium mb-1">Total Views</div>
                    <div className="text-2xl font-bold text-blue-900">{analyticsData.metrics.totalViews}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="text-sm text-green-600 font-medium mb-1">Unique Readers</div>
                    <div className="text-2xl font-bold text-green-900">{analyticsData.metrics.uniqueReaders}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="text-sm text-purple-600 font-medium mb-1">Comments</div>
                    <div className="text-2xl font-bold text-purple-900">{analyticsData.metrics.commentsCount}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                    <div className="text-sm text-yellow-600 font-medium mb-1">Favorites</div>
                    <div className="text-2xl font-bold text-yellow-900">{analyticsData.metrics.favoritesCount}</div>
                  </div>
                </div>

                {/* Acknowledgment Metrics */}
                {analyticsData.metrics.acknowledgmentRate !== null && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-indigo-600 font-medium">Acknowledgment Rate</div>
                      <div className="text-lg font-bold text-indigo-900">{analyticsData.metrics.acknowledgmentRate}%</div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {analyticsData.metrics.uniqueAcknowledgers} of {analyticsData.metrics.uniqueReaders} readers acknowledged
                    </div>
                  </div>
                )}

                {/* Reactions */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Reactions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{analyticsData.metrics.reactionsByType.helpful}</div>
                      <div className="text-sm text-gray-600">Helpful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{analyticsData.metrics.reactionsByType.important}</div>
                      <div className="text-sm text-gray-600">Important</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{analyticsData.metrics.reactionsByType.acknowledged}</div>
                      <div className="text-sm text-gray-600">Acknowledged</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{analyticsData.metrics.reactionsByType.urgent}</div>
                      <div className="text-sm text-gray-600">Urgent</div>
                    </div>
                  </div>
                </div>

                {/* Engagement Timeline */}
                {Object.keys(analyticsData.engagement.readsByDate).length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Reads Over Time</h4>
                    <div className="space-y-2">
                      {Object.entries(analyticsData.engagement.readsByDate)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .slice(0, 10)
                        .map(([date, count]) => (
                          <div key={date} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{new Date(date).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(count / Math.max(...Object.values(analyticsData.engagement.readsByDate))) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No analytics data available</div>
            )}

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowAnalyticsModal(false);
                  setAnalyticsData(null);
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard Modal */}
      {showAnalyticsDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col my-8" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${colors.gradient} px-6 py-5 border-b border-gray-200 rounded-t-2xl flex-shrink-0`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-md`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Announcement Analytics & Statistics Dashboard</h3>
                    <p className="text-sm text-white/80 mt-0.5">Comprehensive announcement insights and analytics</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalyticsDashboard(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Time Range Selector */}
              <div className="mb-6 flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Time Range:</label>
                <select 
                  value={analyticsTimeRange}
                  onChange={(e) => {
                    setAnalyticsTimeRange(e.target.value);
                    fetchAnalyticsOverview();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                >
                  <option value="all">All Time</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">Last Year</option>
                </select>
                <button 
                  onClick={fetchAnalyticsOverview}
                  className={`${colors.primary} text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${colors.primaryHover} transition-all`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Loading State */}
              {analyticsDashboardLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                    <div className={`absolute inset-0 border-4 ${colors.primary} rounded-full border-t-transparent animate-spin`}></div>
                  </div>
                </div>
              ) : analyticsOverview ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <div className="text-sm text-blue-600 font-medium mb-1">Total Announcements</div>
                      <div className="text-2xl font-bold text-blue-900">{analyticsOverview.totalAnnouncements || 0}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <div className="text-sm text-green-600 font-medium mb-1">Active</div>
                      <div className="text-2xl font-bold text-green-900">{analyticsOverview.statusBreakdown?.active || 0}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                      <div className="text-sm text-yellow-600 font-medium mb-1">Scheduled</div>
                      <div className="text-2xl font-bold text-yellow-900">{analyticsOverview.statusBreakdown?.scheduled || 0}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <div className="text-sm text-purple-600 font-medium mb-1">Total Engagement</div>
                      <div className="text-2xl font-bold text-purple-900">
                        {(analyticsOverview.engagement?.totalComments || 0) + 
                         (analyticsOverview.engagement?.totalReactions || 0) + 
                         (analyticsOverview.engagement?.totalFavorites || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Charts Row 1 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Announcement Growth Over Time */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Announcement Growth Over Time</h4>
                      <div className="h-64 relative">
                        {analyticsOverview.growthOverTime && analyticsOverview.growthOverTime.length > 0 ? (
                          <canvas ref={growthChartRef}></canvas>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-500">
                            No data available for the selected time range
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Announcement Distribution by Type */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Distribution by Type</h4>
                      <div className="h-64 relative">
                        {analyticsOverview.typeDistribution && Object.keys(analyticsOverview.typeDistribution).length > 0 ? (
                          <canvas ref={typeChartRef}></canvas>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-500">
                            No data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Charts Row 2 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Distribution */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Status Distribution</h4>
                      <div className="h-64 relative">
                        {analyticsOverview.statusBreakdown && Object.keys(analyticsOverview.statusBreakdown).length > 0 ? (
                          <canvas ref={statusChartRef}></canvas>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-500">
                            No data available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Priority Distribution */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Priority Distribution</h4>
                      <div className="h-64 relative">
                        {analyticsOverview.priorityDistribution && Object.keys(analyticsOverview.priorityDistribution).length > 0 ? (
                          <canvas ref={priorityChartRef}></canvas>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-500">
                            No data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Announcements */}
                  {analyticsOverview.topAnnouncements && analyticsOverview.topAnnouncements.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Top Performing Announcements</h4>
                      <div className="space-y-3">
                        {analyticsOverview.topAnnouncements.slice(0, 5).map((ann, idx) => (
                          <div key={ann.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${colors.primary} text-white flex items-center justify-center font-bold`}>
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{ann.title}</div>
                                <div className="text-sm text-gray-500">{ann.views || 0} views</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {ann.views || 0} total views
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">No analytics data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 3C: Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Version History</h3>
              <button
                onClick={() => {
                  setShowVersionHistory(false);
                  setVersions([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {versions.length > 0 ? (
              <div className="space-y-4">
                {versions.map((version, idx) => (
                  <div key={version.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                          Version {version.versionNumber}
                        </span>
                        <span className="text-sm text-gray-500">
                          {version.changedByUser?.name || 'Unknown'} • {new Date(version.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {version.changeDescription && (
                      <p className="text-sm text-gray-600 mb-2">{version.changeDescription}</p>
                    )}
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">{version.title}</p>
                      <p className="mt-1 text-gray-600 line-clamp-2">{version.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No version history available</div>
            )}

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowVersionHistory(false);
                  setVersions([]);
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3C: Notification Preferences Modal */}
      {showNotificationPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Notification Preferences</h3>
              <button
                onClick={() => setShowNotificationPreferences(false)}
                className="text-gray-400 hover:text-gray-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                setShowLoadingModal(true);
                setLoadingMessage('Updating preferences...');
                const response = await announcementsAPI.updateNotificationPreferences(notificationPreferences);
                if (response.success) {
                  setShowLoadingModal(false);
                  setShowNotificationPreferences(false);
                  setSuccessMessage('Notification preferences updated successfully!');
                  setShowSuccessModal(true);
                  setTimeout(() => setShowSuccessModal(false), 2000);
                }
              } catch (err) {
                setShowLoadingModal(false);
                setErrorMessage('Failed to update preferences');
                setShowErrorModal(true);
              }
            }} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.emailNotifications}
                    onChange={(e) => setNotificationPreferences({ ...notificationPreferences, emailNotifications: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.pushNotifications}
                    onChange={(e) => setNotificationPreferences({ ...notificationPreferences, pushNotifications: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Notify on New Announcement</label>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.notifyOnNewAnnouncement}
                    onChange={(e) => setNotificationPreferences({ ...notificationPreferences, notifyOnNewAnnouncement: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Notify on Update</label>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.notifyOnUpdate}
                    onChange={(e) => setNotificationPreferences({ ...notificationPreferences, notifyOnUpdate: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Notify on Comment</label>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.notifyOnComment}
                    onChange={(e) => setNotificationPreferences({ ...notificationPreferences, notifyOnComment: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Notify on Reaction</label>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.notifyOnReaction}
                    onChange={(e) => setNotificationPreferences({ ...notificationPreferences, notifyOnReaction: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority Filter</label>
                  <select
                    value={notificationPreferences.priorityFilter}
                    onChange={(e) => setNotificationPreferences({ ...notificationPreferences, priorityFilter: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent Only</option>
                    <option value="high">High and Urgent</option>
                    <option value="urgent_high">Urgent and High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNotificationPreferences(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-6 py-3 ${colors.primary} text-white rounded-lg font-semibold ${colors.primaryHover} transition-all`}
                >
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Select Template</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="p-6">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No templates available</p>
                  <button
                    onClick={() => {
                      setShowTemplateModal(false);
                      setShowCreateModal(true);
                    }}
                    className={`px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover}`}
                  >
                    Create Your First Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        {template.isSystemTemplate && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">System</span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        <p><strong>Title:</strong> {template.title}</p>
                        <p><strong>Priority:</strong> {template.priority}</p>
                        <p><strong>Type:</strong> {template.announcementType?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection in Create Modal */}
      {showCreateModal && templates.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">Use Template (Optional)</label>
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find(t => t.id === parseInt(e.target.value));
                if (template) handleApplyTemplate(template);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.isSystemTemplate ? '(System)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse All
            </button>
          </div>
          {selectedTemplate && (
            <p className="mt-2 text-sm text-gray-600">
              Using template: <strong>{selectedTemplate.name}</strong>
            </p>
          )}
        </div>
      )}

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center justify-center">
              {/* Modern Loading Animation */}
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 rounded-full border-t-transparent" 
                  style={{ 
                    animation: 'spin 1s linear infinite',
                    borderColor: theme === 'black' ? '#1f2937' : theme === 'orange' ? '#ea580c' : theme === 'green' ? '#16a34a' : theme === 'lightBlue' ? '#0ea5e9' : theme === 'blue' ? '#2563eb' : theme === 'darkBlue' ? '#1e40af' : '#2563eb',
                    borderTopColor: 'transparent'
                  }}
                ></div>
              </div>
              <p className="text-lg font-semibold text-gray-800">{loadingMessage}</p>
              <p className="text-sm text-gray-500 mt-2">Please wait...</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Animation */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center justify-center">
              {/* Success Checkmark Animation - Larger */}
              <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
                {/* Animated circle */}
                <svg className="w-32 h-32 text-green-500 absolute" viewBox="0 0 100 100" style={{ animation: 'drawCircle 0.6s ease-out forwards' }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="283" strokeDashoffset="283" />
                </svg>
                {/* Animated checkmark - Larger */}
                <svg className="w-20 h-20 text-green-500 absolute" viewBox="0 0 80 80">
                  <path 
                    d="M20 40 L35 55 L60 25" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeDasharray="80" 
                    strokeDashoffset="80" 
                    style={{ animation: 'drawCheck 0.6s ease-out 0.6s forwards' }} 
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800 text-center mb-2">Success!</p>
              <p className="text-sm text-gray-600 text-center">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className={`mt-6 px-6 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center justify-center">
              {/* Warning Icon */}
              <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                <svg className="w-20 h-20 text-orange-500" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="3" />
                  <path d="M40 25 L40 45 M40 50 L40 55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-xl font-bold text-gray-800 text-center mb-2">{confirmTitle}</p>
              <p className="text-sm text-gray-600 text-center mb-6">{confirmMessage}</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmAction) {
                      confirmAction();
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal with X Animation - Higher z-index to appear above password modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex flex-col items-center justify-center">
              {/* Error X Animation */}
              <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                {/* Animated circle */}
                <svg className="w-20 h-20 text-red-500 absolute" viewBox="0 0 80 80" style={{ animation: 'drawCircle 0.6s ease-out forwards' }}>
                  <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="220" strokeDashoffset="220" />
                </svg>
                {/* Animated X - two lines crossing */}
                <svg className="w-12 h-12 text-red-500 absolute" viewBox="0 0 60 60">
                  <line 
                    x1="15" 
                    y1="15" 
                    x2="45" 
                    y2="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeDasharray="42" 
                    strokeDashoffset="42" 
                    style={{ animation: 'drawX 0.3s ease-out 0.6s forwards' }} 
                  />
                  <line 
                    x1="45" 
                    y1="15" 
                    x2="15" 
                    y2="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeDasharray="42" 
                    strokeDashoffset="42" 
                    style={{ animation: 'drawX 0.3s ease-out 0.75s forwards' }} 
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800 text-center mb-2">Error!</p>
              <p className="text-sm text-gray-600 text-center">{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal for Deletion */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Confirm Deletion</h3>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setDeletePassword('');
                    setDeleteAnnouncementId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Please enter your password to confirm deletion. This action cannot be undone.
              </p>

              {deleteAnnouncementId && passwordAttempts[deleteAnnouncementId] && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Attempts remaining:</strong> {5 - (passwordAttempts[deleteAnnouncementId].attempts || 0)} / 5
                  </p>
                  {isAnnouncementLocked(deleteAnnouncementId) && lockoutCountdown && (
                    <p className="text-sm text-red-600 mt-2">
                      <strong>Locked until:</strong> {Math.floor(lockoutCountdown.seconds / 3600)}h {Math.floor((lockoutCountdown.seconds % 3600) / 60)}m {lockoutCountdown.seconds % 60}s
                    </p>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  ref={passwordInputRef}
                  key={`password-input-${deleteAnnouncementId}-${showPasswordModal}`} // Force re-render when announcement or modal state changes
                  type={passwordInputType}
                  value={deletePassword}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setDeletePassword(newValue);
                    // Switch to password type once user starts typing
                    if (passwordInputType === 'text' && newValue.length > 0) {
                      setPasswordInputType('password');
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordDelete();
                    }
                  }}
                  autoComplete="off" // Prevent browser autofill
                  data-lpignore="true" // Prevent LastPass autofill
                  data-form-type="other" // Prevent password managers
                  data-1p-ignore="true" // Prevent 1Password autofill
                  name={`delete-password-${deleteAnnouncementId || 'new'}`} // Unique name to prevent autofill
                  id={`delete-password-${deleteAnnouncementId || 'new'}`} // Unique ID to prevent autofill
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  autoFocus
                  disabled={deleteAnnouncementId && isAnnouncementLocked(deleteAnnouncementId)}
                  onFocus={(e) => {
                    // Ensure it's password type when focused
                    if (passwordInputType === 'text') {
                      setPasswordInputType('password');
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setDeletePassword('');
                    setDeleteAnnouncementId(null);
                  }}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  disabled={deleteAnnouncementId && isAnnouncementLocked(deleteAnnouncementId)}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordDelete}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!deletePassword || (deleteAnnouncementId && isAnnouncementLocked(deleteAnnouncementId))}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Styles for Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes drawCircle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          from { 
            stroke-dashoffset: 80; 
          }
          to { 
            stroke-dashoffset: 0; 
          }
        }
        @keyframes laserBeamTravel {
          0% {
            top: 0;
            left: 0;
            width: 60px;
            height: 3px;
          }
          24.99% {
            top: 0;
            left: calc(100% - 60px);
            width: 60px;
            height: 3px;
          }
          25% {
            top: 0;
            left: calc(100% - 1.5px);
            width: 3px;
            height: 60px;
          }
          49.99% {
            top: calc(100% - 60px);
            left: calc(100% - 1.5px);
            width: 3px;
            height: 60px;
          }
          50% {
            top: calc(100% - 1.5px);
            left: calc(100% - 60px);
            width: 60px;
            height: 3px;
          }
          74.99% {
            top: calc(100% - 1.5px);
            left: 0;
            width: 60px;
            height: 3px;
          }
          75% {
            top: calc(100% - 60px);
            left: 0;
            width: 3px;
            height: 60px;
          }
          99.99% {
            top: 0;
            left: 0;
            width: 3px;
            height: 60px;
          }
          100% {
            top: 0;
            left: 0;
            width: 60px;
            height: 3px;
          }
        }
        @keyframes drawX {
          from { stroke-dashoffset: 42; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Export Format Selection Modal */}
      {showExportFormatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ animation: 'fadeIn 0.2s ease-in' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Export Announcements</h3>
              <button
                onClick={() => setShowExportFormatModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-6">Choose the format you want to export the announcements:</p>
            <div className="space-y-3">
              <button
                onClick={() => handleExportWithFormat('excel')}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                    <svg className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">Excel</p>
                    <p className="text-sm text-gray-500">Export as .xlsx file</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => handleExportWithFormat('pdf')}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-500 transition-colors">
                    <svg className="w-6 h-6 text-red-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">PDF</p>
                    <p className="text-sm text-gray-500">Export as .pdf file</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => handleExportWithFormat('html')}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                    <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">HTML</p>
                    <p className="text-sm text-gray-500">Export as .html file</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExportFormatModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


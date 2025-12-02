import { useState, useEffect, useRef } from 'react';
import notificationService from '../services/notifications.js';
import { getApiUrl } from '../config/api.js';

// Profile Picture Component - handles base64, URLs, and API endpoints
function ProfilePictureImage({ userId, url, alt, className = "w-full h-full object-cover" }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let blobUrl = null;

    const loadImage = async () => {
      setLoading(true);
      setError(false);
      
      try {
        // If it's already a data URL or blob URL, use it directly
        if (url && (url.startsWith('data:') || url.startsWith('blob:'))) {
          setImgSrc(url);
          setLoading(false);
          return;
        }

        if (!url) {
          setError(true);
          setLoading(false);
          return;
        }

        // Get auth token
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        
        // If it's an API endpoint URL, fetch JSON response first
        let imageUrl = url;
        if (url.startsWith('/api/profile/picture/') || url.includes('/api/profile/picture/')) {
          const apiUrl = url.startsWith('/') && !url.startsWith('//') && !url.startsWith('http')
            ? window.location.origin + url
            : url;
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            }
          });
          
          if (apiResponse.ok && isMounted) {
            const data = await apiResponse.json();
            if (data.success && data.profilePictureUrl) {
              if (data.profilePictureUrl.startsWith('data:')) {
                setImgSrc(data.profilePictureUrl);
                setLoading(false);
                return;
              } else {
                imageUrl = data.profilePictureUrl;
              }
            } else {
              setError(true);
              setLoading(false);
              return;
            }
          } else {
            setError(true);
            setLoading(false);
            return;
          }
        }
        
        // For regular URLs, fetch image and convert to blob URL
        const fullUrl = imageUrl.startsWith('/') && !imageUrl.startsWith('//') && !imageUrl.startsWith('http')
          ? window.location.origin + imageUrl
          : imageUrl;
        
        const response = await fetch(fullUrl, {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });
        
        if (response.ok && isMounted) {
          const blob = await response.blob();
          blobUrl = URL.createObjectURL(blob);
          setImgSrc(blobUrl);
          setLoading(false);
        } else if (isMounted) {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Failed to load profile picture for ${userId}:`, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url, userId]);

  if (error && !loading) {
    return null; // Let fallback show
  }

  if (imgSrc) {
    return (
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className={className}
        onError={() => {
          setError(true);
          setLoading(false);
          if (imgRef.current) {
            imgRef.current.style.display = 'none';
            if (imgRef.current.nextSibling) {
              imgRef.current.nextSibling.style.display = 'flex';
            }
          }
        }}
        onLoad={() => {
          setLoading(false);
        }}
        style={{ display: 'block' }}
      />
    );
  }

  return null;
}

// Role-based theme configuration
const roleThemes = {
  'eiu': {
    name: 'EIU Notifications',
    description: 'Monitor project updates & infrastructure alerts',
    bgGradient: 'from-emerald-700 via-emerald-600 to-emerald-700',
    headerGradient: 'from-emerald-600/50 via-emerald-500/70 to-emerald-600/50',
    borderColor: 'border-emerald-400/30',
    iconBg: 'from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-200',
    buttonGradient: 'from-emerald-500 to-emerald-600',
    buttonHover: 'hover:from-emerald-600 hover:to-emerald-700',
    statsBg: 'from-emerald-500/8 via-emerald-400/10 to-emerald-500/8',
    statsBorder: 'border-emerald-400/15',
    listBg: 'from-emerald-500/20 via-emerald-400/30 to-emerald-500/20',
    footerGradient: 'from-emerald-500/50 via-emerald-400/70 to-emerald-500/50',
    footerBorder: 'border-emerald-400/20',
    monitorText: 'EIU Monitor Active',
    liveColor: 'text-emerald-300'
  },
  'lgu-iu': {
    name: 'LGU-IU Notifications',
    description: 'Monitor project updates & implementation alerts',
    bgGradient: 'from-[#0D7DB5]/50 via-[#0A6A9A]/70 to-[#075A85]/50',
    headerGradient: 'from-[#0D7DB5]/50 via-[#0A6A9A]/70 to-[#075A85]/50',
    borderColor: 'border-[#0D7DB5]/30',
    iconBg: 'from-[#0D7DB5] to-[#0A6A9A]',
    textColor: 'text-white/80',
    buttonGradient: 'from-[#0D7DB5] to-[#0A6A9A]',
    buttonHover: 'hover:from-[#0A6A9A] hover:to-[#075A85]',
    statsBg: 'from-blue-500/8 via-blue-400/10 to-blue-500/8',
    statsBorder: 'border-blue-400/15',
    listBg: 'from-blue-500/20 via-blue-400/30 to-blue-500/20',
    footerGradient: 'from-blue-500/50 via-blue-400/70 to-blue-500/50',
    footerBorder: 'border-blue-400/20',
    monitorText: 'LGU-IU Monitor Active',
    liveColor: 'text-blue-300'
  },
  'mpmec': {
    name: 'MPMEC Notifications',
    description: 'Monitor project updates & committee alerts',
    bgGradient: 'from-blue-900 via-blue-800 to-blue-900',
    headerGradient: 'from-blue-800/50 via-blue-700/70 to-blue-800/50',
    borderColor: 'border-blue-400/30',
    iconBg: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-200',
    buttonGradient: 'from-blue-600 to-blue-700',
    buttonHover: 'hover:from-blue-700 hover:to-blue-800',
    statsBg: 'from-blue-500/15 to-blue-600/15',
    statsBorder: 'border-blue-400/25',
    listBg: 'from-blue-500/20 via-blue-400/30 to-blue-500/20',
    footerGradient: 'from-blue-800/80 via-blue-700/90 to-blue-800/80',
    footerBorder: 'border-blue-400/20',
    monitorText: 'MPMEC Monitor Active',
    liveColor: 'text-blue-300'
  },
  'secretariat': {
    name: 'Secretariat Notifications',
    description: 'Monitor submissions & validation alerts',
    bgGradient: 'from-sky-700 via-sky-600 to-sky-700',
    headerGradient: 'from-sky-600/50 via-sky-500/70 to-sky-600/50',
    borderColor: 'border-sky-400/30',
    iconBg: 'from-sky-500 to-sky-600',
    textColor: 'text-sky-200',
    buttonGradient: 'from-sky-500 to-sky-600',
    buttonHover: 'hover:from-sky-600 hover:to-sky-700',
    statsBg: 'from-sky-500/8 via-sky-400/10 to-sky-500/8',
    statsBorder: 'border-sky-400/15',
    listBg: 'from-sky-500/20 via-sky-400/30 to-sky-500/20',
    footerGradient: 'from-sky-500/50 via-sky-400/70 to-sky-500/50',
    footerBorder: 'border-sky-400/20',
    monitorText: 'Secretariat Monitor Active',
    liveColor: 'text-sky-300'
  },
  'executive': {
    name: 'Executive Notifications',
    description: 'Monitor executive reports & analytics',
    bgGradient: 'from-indigo-900 via-indigo-800 to-indigo-900',
    headerGradient: 'from-indigo-800/50 via-indigo-700/70 to-indigo-800/50',
    borderColor: 'border-indigo-400/30',
    iconBg: 'from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-200',
    buttonGradient: 'from-indigo-600 to-indigo-700',
    buttonHover: 'hover:from-indigo-700 hover:to-indigo-800',
    statsBg: 'from-indigo-500/15 to-indigo-600/15',
    statsBorder: 'border-indigo-400/25',
    listBg: 'from-indigo-500/20 via-indigo-400/30 to-indigo-500/20',
    footerGradient: 'from-indigo-800/80 via-indigo-700/90 to-indigo-800/80',
    footerBorder: 'border-indigo-400/20',
    monitorText: 'Executive Monitor Active',
    liveColor: 'text-indigo-300'
  },
  'sysadmin': {
    name: 'System Notifications',
    description: 'Monitor & manage system alerts',
    bgGradient: 'from-gray-900 via-gray-800 to-gray-900',
    headerGradient: 'from-gray-800/50 via-gray-700/70 to-gray-800/50',
    borderColor: 'border-gray-400/30',
    iconBg: 'from-gray-500 to-gray-600',
    textColor: 'text-gray-200',
    buttonGradient: 'from-gray-600 to-gray-700',
    buttonHover: 'hover:from-gray-700 hover:to-gray-800',
    statsBg: 'from-gray-500/15 to-gray-600/15',
    statsBorder: 'border-gray-400/25',
    listBg: 'from-gray-500/20 via-gray-400/30 to-gray-500/20',
    footerGradient: 'from-gray-800/80 via-gray-700/90 to-gray-800/80',
    footerBorder: 'border-gray-400/20',
    monitorText: 'System Monitor Active',
    liveColor: 'text-gray-300'
  }
};

// Enhanced time formatting with proper date display
function formatNotificationTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Just now
  if (diffInSeconds < 60) {
    return 'Just now';
  }

  // Minutes ago
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Hours ago
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // Days ago
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Full date format for older notifications
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get notification icon JSX
function getNotificationIcon(type, category, metadata) {
  const iconClass = "w-5 h-5";
  
  if (category === 'Project') {
    if (metadata?.updateType === 'milestone_submission') {
      return (
        <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
      );
    }
    if (metadata?.updateType === 'project_completion') {
      return (
        <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      );
    }
  }

  // Default icons based on type
  const icons = {
    'Info': (
      <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    'Success': (
      <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    'Warning': (
      <svg className={`${iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
    ),
    'Error': (
      <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    'Alert': (
      <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
    )
  };
  
  return icons[type] || icons['Info'];
}

export default function NotificationPanel({ 
  role = 'lgu-iu', 
  isOpen: initialIsOpen = false, 
  onClose,
  panelId = 'notification-panel',
  overlayId = 'notification-overlay'
}) {
  const [notifications, setNotifications] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]); // Store all notifications for user filter
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const [userRole, setUserRole] = useState(role);
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'user'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [filterByDate, setFilterByDate] = useState('all'); // 'all', 'today', 'week', 'month'
  const [filterByUser, setFilterByUser] = useState('all'); // 'all' or specific user ID
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const pollingIntervalRef = useRef(null);
  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  const theme = roleThemes[userRole] || roleThemes['lgu-iu'];

  // Watch for external state changes via global object
  useEffect(() => {
    // Create global state object if it doesn't exist
    if (typeof window !== 'undefined') {
      const stateKey = `${panelId}_state`;
      if (!window[stateKey]) {
        window[stateKey] = { isOpen: false, listeners: [] };
      }
      
      const state = window[stateKey];
      
      // Add listener
      const listener = (newState) => {
        setIsOpen(newState.isOpen);
      };
      state.listeners.push(listener);
      
      // Set initial state
      setIsOpen(state.isOpen);
      
      // Expose toggle function
      window[`${panelId}_toggle`] = () => {
        state.isOpen = !state.isOpen;
        state.listeners.forEach(l => l(state));
      };
      
      window[`${panelId}_open`] = () => {
        state.isOpen = true;
        state.listeners.forEach(l => l(state));
      };
      
      window[`${panelId}_close`] = () => {
        state.isOpen = false;
        state.listeners.forEach(l => l(state));
      };
      
      return () => {
        const index = state.listeners.indexOf(listener);
        if (index > -1) {
          state.listeners.splice(index, 1);
        }
      };
    }
  }, [panelId]);

  // Detect user role from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userRoleValue = (user.role || '').toLowerCase();
        const userSubRole = (user.subRole || '').toLowerCase();
        
        // Map roles to theme keys
        if (userRoleValue === 'sys.ad' || userRoleValue === 'sysadmin') {
          if (userSubRole.includes('executive')) {
            setUserRole('executive');
          } else {
            setUserRole('sysadmin');
          }
        } else if (userRoleValue === 'eiu') {
          setUserRole('eiu');
        } else if (userRoleValue === 'lgu-iu' || userRoleValue === 'lgu_iu') {
          setUserRole('lgu-iu');
        } else if (userRoleValue === 'lgu-pmt' || userRoleValue === 'lgu_pmt') {
          if (userSubRole.includes('secretariat')) {
            setUserRole('secretariat');
          } else {
            setUserRole('mpmec');
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Filter and sort notifications (defined before loadNotifications)
  const filterAndSortNotifications = (notifs) => {
    if (!notifs || notifs.length === 0) return [];
    
    let filtered = [...notifs];
    
    // Apply date filter
    if (filterByDate !== 'all') {
      const now = new Date();
      filtered = filtered.filter(notif => {
        if (!notif.createdAt) return false;
        const notifDate = new Date(notif.createdAt);
        const diffTime = now - notifDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (filterByDate === 'today') {
          return diffDays === 0;
        } else if (filterByDate === 'week') {
          return diffDays <= 7;
        } else if (filterByDate === 'month') {
          return diffDays <= 30;
        }
        return true;
      });
    }
    
    // Apply user filter
    if (filterByUser !== 'all') {
      filtered = filtered.filter(notif => {
        const userId = notif.user?.id || notif.metadata?.submittedBy?.userId || notif.metadata?.submittedBy?.id;
        return userId === filterByUser;
      });
    }
    
    // Apply sorting
    if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else if (sortBy === 'user') {
      filtered.sort((a, b) => {
        const userA = (a.user?.name || a.metadata?.submittedBy?.fullName || a.metadata?.submittedBy?.name || 'Unknown').toLowerCase();
        const userB = (b.user?.name || b.metadata?.submittedBy?.fullName || b.metadata?.submittedBy?.name || 'Unknown').toLowerCase();
        if (sortOrder === 'desc') {
          return userB.localeCompare(userA);
        } else {
          return userA.localeCompare(userB);
        }
      });
    }
    
    return filtered;
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(1, 50);
      
      if (data && data.notifications) {
        // Role-based filtering
        const filteredNotifications = data.notifications.filter(notif => {
          // System Admin sees all notifications
          if (userRole === 'sysadmin') return true;
          
          // Check if notification has role restrictions in metadata
          if (notif.metadata?.targetRoles) {
            const targetRoles = Array.isArray(notif.metadata.targetRoles) 
              ? notif.metadata.targetRoles 
              : [notif.metadata.targetRoles];
            return targetRoles.some(r => r.toLowerCase() === userRole);
          }
          
          // Default: show all if no role restriction
          return true;
        });
        
        // Fetch profile pictures for notifications that don't have them (with timeout)
        const notificationsWithPics = await Promise.all(
          filteredNotifications.map(async (notif) => {
            if (!notif.profilePic) {
              try {
                const profilePic = await Promise.race([
                  getProfilePictureUrl(notif),
                  new Promise((resolve) => setTimeout(() => resolve(null), 2000)) // 2 second timeout
                ]);
                if (profilePic) {
                  return { ...notif, profilePic };
                }
              } catch (error) {
                console.error('Error fetching profile picture:', error);
              }
            }
            return notif;
          })
        );
        
        // Store all notifications for user filter dropdown
        setAllNotifications(notificationsWithPics);
        
        // Filter and sort notifications
        const filteredAndSorted = filterAndSortNotifications(notificationsWithPics);
        setNotifications(filteredAndSorted);
        
        // Calculate stats from filtered notifications
        const unread = filteredAndSorted.filter(n => !n.isRead).length;
        const read = filteredAndSorted.filter(n => n.isRead).length;
        setStats({
          total: filteredAndSorted.length,
          unread,
          read
        });
      } else {
        // No notifications
        setNotifications([]);
        setAllNotifications([]);
        setStats({ total: 0, unread: 0, read: 0 });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setAllNotifications([]);
      setStats({ total: 0, unread: 0, read: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Re-apply filters and sorting when filters change (without reloading from API)
  useEffect(() => {
    if (allNotifications.length > 0 && !loading) {
      try {
        const filteredAndSorted = filterAndSortNotifications(allNotifications);
        setNotifications(filteredAndSorted);
        
        // Update stats
        const unread = filteredAndSorted.filter(n => !n.isRead).length;
        const read = filteredAndSorted.filter(n => n.isRead).length;
        setStats({
          total: filteredAndSorted.length,
          unread,
          read
        });
      } catch (error) {
        console.error('Error filtering/sorting notifications:', error);
        // Fallback: show all notifications
        setNotifications(allNotifications);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterByDate, filterByUser, sortBy, sortOrder]);

  // Load notifications when panel opens (NotificationService handles global polling)
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      // Note: NotificationService already handles polling globally every 30 seconds
      // No need for duplicate polling here to prevent rate limiting (429 errors)
    }
  }, [isOpen, userRole]);

  // Handle panel visibility
  useEffect(() => {
    if (panelRef.current && overlayRef.current) {
      if (isOpen) {
        panelRef.current.classList.remove('hidden', 'translate-x-full');
        panelRef.current.classList.add('translate-x-0');
        overlayRef.current.classList.remove('hidden');
      } else {
        panelRef.current.classList.add('translate-x-full');
        panelRef.current.classList.remove('translate-x-0');
        overlayRef.current.classList.add('hidden');
      }
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      if (onClose) {
        onClose();
      } else if (typeof window !== 'undefined') {
        const stateKey = `${panelId}_state`;
        if (window[stateKey]) {
          window[stateKey].isOpen = false;
          window[stateKey].listeners.forEach(l => l(window[stateKey]));
        }
      }
    }
  };

  // Handle close button
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (typeof window !== 'undefined') {
      const stateKey = `${panelId}_state`;
      if (window[stateKey]) {
        window[stateKey].isOpen = false;
        window[stateKey].listeners.forEach(l => l(window[stateKey]));
      }
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
      await notificationService.getNotificationCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
      await notificationService.getNotificationCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };


  // Get unique users from notifications for filter dropdown
  const getUniqueUsers = (notifs) => {
    const userMap = new Map();
    notifs.forEach(notif => {
      const userId = notif.user?.id || notif.metadata?.submittedBy?.userId || notif.metadata?.submittedBy?.id;
      const userName = notif.user?.name || notif.metadata?.submittedBy?.fullName || notif.metadata?.submittedBy?.name || 'Unknown';
      if (userId && !userMap.has(userId)) {
        userMap.set(userId, userName);
      }
    });
    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  };

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same sort option
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc'); // Default to descending
    }
  };

  // Build navigation URL based on notification type
  const buildNavigationUrl = (notification) => {
    // If actionUrl exists, use it
    if (notification.actionUrl) {
      let url = notification.actionUrl;
      
      // Add highlight parameter if targetId exists
      if (notification.targetId) {
        try {
          const urlObj = new URL(url, window.location.origin);
          urlObj.searchParams.set('highlight', notification.targetId);
          url = urlObj.toString();
        } catch (e) {
          // If URL parsing fails, append as query string
          url += (url.includes('?') ? '&' : '?') + `highlight=${notification.targetId}`;
        }
      }
      
      return url;
    }
    
    // Build URL based on entityType and category
    const entityType = notification.entityType;
    const category = notification.category;
    const entityId = notification.entityId;
    const metadata = notification.metadata || {};
    
    // Project-related notifications
    if (entityType === 'Project' || category === 'Project') {
      const projectId = entityId || metadata.projectId;
      
      if (metadata.updateType === 'milestone_submission' || metadata.updateType === 'milestone_resubmission') {
        // Navigate to progress timeline for milestone submissions
        if (userRole === 'lgu-iu') {
          return `/dashboard/iu-implementing-office/modules/progress-timeline${projectId ? `?projectId=${projectId}` : ''}`;
        } else if (userRole === 'eiu') {
          return `/dashboard/eiu/modules/submit-update${projectId ? `?projectId=${projectId}` : ''}`;
        }
      } else if (metadata.updateType === 'secretariat_submission' || metadata.updateType === 'secretariat_verdict') {
        // Navigate to submissions page for Secretariat
        if (userRole === 'secretariat' || userRole === 'mpmec') {
          return `/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions${projectId ? `?projectId=${projectId}` : ''}`;
        }
      } else if (metadata.updateType === 'project_completion') {
        // Navigate to project details or summary
        if (userRole === 'lgu-iu') {
          return `/dashboard/iu-implementing-office/modules/project-management${projectId ? `?projectId=${projectId}` : ''}`;
        } else if (userRole === 'eiu') {
          return `/dashboard/eiu/modules/projects${projectId ? `?projectId=${projectId}` : ''}`;
        } else if (userRole === 'secretariat' || userRole === 'mpmec') {
          return `/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions${projectId ? `?projectId=${projectId}` : ''}`;
        }
      } else {
        // Default project navigation based on notification title/content
        const title = (notification.title || '').toLowerCase();
        const message = (notification.message || '').toLowerCase();
        
        // Check for specific notification types
        if (title.includes('assigned') || message.includes('assigned')) {
          // Project assignment notifications
          if (userRole === 'eiu') {
            return `/dashboard/eiu/modules/projects${projectId ? `?projectId=${projectId}` : ''}`;
          }
        } else if (title.includes('approved') || message.includes('approved')) {
          // Project approval notifications
          if (userRole === 'lgu-iu') {
            return `/dashboard/iu-implementing-office/modules/project-management${projectId ? `?projectId=${projectId}` : ''}`;
          } else if (userRole === 'eiu') {
            return `/dashboard/eiu/modules/projects${projectId ? `?projectId=${projectId}` : ''}`;
          } else if (userRole === 'secretariat' || userRole === 'mpmec') {
            return `/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions${projectId ? `?projectId=${projectId}` : ''}`;
          }
        } else if (title.includes('created') || message.includes('created')) {
          // Project creation notifications
          if (userRole === 'lgu-iu') {
            return `/dashboard/iu-implementing-office/modules/project-management${projectId ? `?projectId=${projectId}` : ''}`;
          } else if (userRole === 'secretariat' || userRole === 'mpmec') {
            return `/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions${projectId ? `?projectId=${projectId}` : ''}`;
          }
        } else {
          // Default project navigation
          if (userRole === 'lgu-iu') {
            return `/dashboard/iu-implementing-office/modules/project-management${projectId ? `?projectId=${projectId}` : ''}`;
          } else if (userRole === 'eiu') {
            return `/dashboard/eiu/modules/projects${projectId ? `?projectId=${projectId}` : ''}`;
          } else if (userRole === 'secretariat' || userRole === 'mpmec') {
            return `/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions${projectId ? `?projectId=${projectId}` : ''}`;
          } else if (userRole === 'executive') {
            return `/dashboard/executive-viewer/modules/projects${projectId ? `?projectId=${projectId}` : ''}`;
          }
        }
      }
    }
    
    // User management notifications
    if (notification.module === 'user-management' || category === 'User Management') {
      const targetId = notification.targetId || entityId;
      if (userRole === 'sysadmin') {
        return `/dashboard/sysadmin/modules/user-management${targetId ? `?highlight=${targetId}` : ''}`;
      }
    }
    
    // System notifications
    if (category === 'System') {
      if (userRole === 'sysadmin') {
        return `/dashboard/sysadmin/SysAdminDashboard`;
      }
    }
    
    // Policy/Validation notifications
    if (category === 'Policy' || category === 'Validation') {
      if (userRole === 'mpmec' || userRole === 'secretariat') {
        return `/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions${entityId ? `?projectId=${entityId}` : ''}`;
      } else if (userRole === 'lgu-iu') {
        return `/dashboard/iu-implementing-office/modules/project-management${entityId ? `?projectId=${entityId}` : ''}`;
      }
    }
    
    // Update/Reminder notifications
    if (category === 'Update' || category === 'Reminder') {
      if (userRole === 'lgu-iu') {
        return `/dashboard/iu-implementing-office/modules/progress-timeline${entityId ? `?projectId=${entityId}` : ''}`;
      } else if (userRole === 'eiu') {
        return `/dashboard/eiu/modules/submit-update${entityId ? `?projectId=${entityId}` : ''}`;
      }
    }
    
    // Default: return dashboard based on role
    const dashboardMap = {
      'lgu-iu': '/dashboard/iu-implementing-office/ImplementingOfficeDashboard',
      'eiu': '/dashboard/eiu/EIUDashboard',
      'secretariat': '/dashboard/lgu-pmt-mpmec-secretariat/SECRETARIATDashboard',
      'mpmec': '/dashboard/lgu-pmt-mpmec-secretariat/SECRETARIATDashboard',
      'executive': '/dashboard/executive-viewer/ExecutiveDashboard',
      'sysadmin': '/dashboard/sysadmin/SysAdminDashboard'
    };
    
    return dashboardMap[userRole] || '/dashboard';
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    const url = buildNavigationUrl(notification);
    
    if (url) {
      // Mark as read if not already read
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }
      
      // Close panel
      if (onClose) onClose();
      else if (typeof window !== 'undefined') {
        const stateKey = `${panelId}_state`;
        if (window[stateKey]) {
          window[stateKey].isOpen = false;
          window[stateKey].listeners.forEach(l => l(window[stateKey]));
        }
      }
      
      // Navigate
      window.location.href = url;
    }
  };
  
  // Fetch profile picture from API if not in notification
  const getProfilePictureUrl = async (notification) => {
    // If profilePic already exists, use it
    if (notification.profilePic) {
      return notification.profilePic;
    }
    
    // Try to get from metadata
    if (notification.metadata?.submittedBy?.userId || notification.metadata?.submittedBy?.id) {
      const userId = notification.metadata.submittedBy.userId || notification.metadata.submittedBy.id;
      const apiUrl = getApiUrl();
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`${apiUrl}/profile/picture/${encodeURIComponent(userId)}?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profilePictureUrl) {
            return data.profilePictureUrl;
          }
        }
      } catch (error) {
        console.error('Error fetching profile picture:', error);
      }
    }
    
    // Try to get from user relation if available
    if (notification.user?.id) {
      const userId = notification.user.id;
      const apiUrl = getApiUrl();
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`${apiUrl}/profile/picture/${encodeURIComponent(userId)}?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profilePictureUrl) {
            return data.profilePictureUrl;
          }
        }
      } catch (error) {
        console.error('Error fetching profile picture:', error);
      }
    }
    
    return null;
  };

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        id={overlayId}
        className="fixed inset-0 bg-black/50 z-[1198] hidden"
        onClick={handleOverlayClick}
      />

      {/* Notification Panel */}
      <div
        ref={panelRef}
        id={panelId}
        className={`fixed top-0 right-0 h-full w-[420px] bg-gradient-to-br ${theme.bgGradient} shadow-2xl border-l ${theme.borderColor} z-[1200] backdrop-blur-xl transform transition-all duration-500 ease-out translate-x-full flex flex-col`}
      >
        {/* Header */}
        <div className={`p-5 border-b ${theme.borderColor} bg-gradient-to-r ${theme.headerGradient} backdrop-blur-md shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.iconBg} flex items-center justify-center shadow-xl`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{theme.name}</h3>
                <p className={`text-xs ${theme.textColor} font-medium`}>{theme.description}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`${theme.textColor} hover:text-white transition-all duration-200 hover:scale-110 p-2.5 rounded-lg hover:bg-white/10 hover:shadow-lg`}
              title="Close notifications"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleMarkAllAsRead}
              className={`group flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r ${theme.buttonGradient} ${theme.buttonHover} transition-all duration-300 ease-out px-4 py-2.5 rounded-xl border-2 ${theme.borderColor} hover:shadow-xl shadow-lg hover:-translate-y-0.5 transform`}
            >
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Mark all read
            </button>
          </div>

          {/* Filter and Sort Options */}
          <div className="space-y-3 mb-4">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${theme.textColor} opacity-75 whitespace-nowrap`}>Filter by Date:</span>
              <select
                value={filterByDate}
                onChange={(e) => setFilterByDate(e.target.value)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-white/10 ${theme.textColor} border ${theme.borderColor} focus:outline-none focus:ring-2 focus:ring-white/20`}
              >
                <option value="all" className="bg-gray-800 text-white">All Time</option>
                <option value="today" className="bg-gray-800 text-white">Today</option>
                <option value="week" className="bg-gray-800 text-white">This Week</option>
                <option value="month" className="bg-gray-800 text-white">This Month</option>
              </select>
            </div>
            
            {/* User Filter */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${theme.textColor} opacity-75 whitespace-nowrap`}>Filter by User:</span>
              <select
                value={filterByUser}
                onChange={(e) => setFilterByUser(e.target.value)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-white/10 ${theme.textColor} border ${theme.borderColor} focus:outline-none focus:ring-2 focus:ring-white/20`}
              >
                <option value="all" className="bg-gray-800 text-white">All Users</option>
                {getUniqueUsers(allNotifications).map(user => (
                  <option key={user.id} value={user.id} className="bg-gray-800 text-white">{user.name}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${theme.textColor} opacity-75 whitespace-nowrap`}>Sort by:</span>
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => handleSortChange('date')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    sortBy === 'date'
                      ? `bg-white/20 text-white border-2 ${theme.borderColor}`
                      : `${theme.textColor} opacity-60 hover:opacity-100 hover:bg-white/10`
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Date
                  {sortBy === 'date' && (
                    <svg className={`w-3 h-3 ${sortOrder === 'desc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSortChange('user')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    sortBy === 'user'
                      ? `bg-white/20 text-white border-2 ${theme.borderColor}`
                      : `${theme.textColor} opacity-60 hover:opacity-100 hover:bg-white/10`
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  User
                  {sortBy === 'user' && (
                    <svg className={`w-3 h-3 ${sortOrder === 'desc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={`p-4 bg-gradient-to-r ${theme.statsBg} rounded-xl border ${theme.statsBorder} shadow-md`}>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Total:</span>
                <span className="text-white font-bold text-base">{stats.total}</span>
              </div>
              <div className="w-px h-5 bg-gradient-to-b from-white/15 to-white/15"></div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Unread:</span>
                <span className="text-white font-bold text-base">{stats.unread}</span>
              </div>
              <div className="w-px h-5 bg-gradient-to-b from-white/15 to-white/15"></div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Read:</span>
                <span className="text-white font-bold text-base">{stats.read}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br ${theme.listBg}`} style={{ minHeight: 0, maxHeight: 'none' }}>
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-pulse flex flex-col items-center justify-center">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.iconBg}/20 flex items-center justify-center mb-4`}>
                  <svg className={`w-8 h-8 ${theme.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span className={`text-sm font-medium ${theme.textColor}`}>Loading notifications...</span>
                <p className={`text-xs ${theme.textColor} mt-1`}>{theme.description}</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.iconBg}/20 flex items-center justify-center mx-auto mb-4`}>
                <svg className={`w-8 h-8 ${theme.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">No Notifications</h4>
              <p className="text-sm text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {notifications.map((notification, index) => {
                const isUnread = !notification.isRead;
                const priorityColors = {
                  high: 'from-red-500 to-red-600',
                  medium: 'from-yellow-500 to-orange-500',
                  low: 'from-blue-500 to-blue-600',
                  info: 'from-gray-500 to-gray-600'
                };
                const priorityColor = priorityColors[notification.priority?.toLowerCase()] || priorityColors.info;
                const typeColorClass = userRole === 'sysadmin' 
                  ? (notification.type === 'Success' ? 'text-gray-800' : 
                     notification.type === 'Warning' ? 'text-orange-600' : 
                     notification.type === 'Error' ? 'text-red-600' : 'text-gray-700')
                  : (notification.type === 'Success' ? 'text-green-600' : 
                     notification.type === 'Warning' ? 'text-orange-600' : 
                     notification.type === 'Error' ? 'text-red-600' : 'text-gray-700');
                const hasNavigation = buildNavigationUrl(notification) !== null;

                // Get role-based accent colors
                const getRoleAccentColor = () => {
                  if (userRole === 'eiu') {
                    return {
                      border: notification.type === 'Success' ? 'border-emerald-500' :
                              notification.type === 'Warning' ? 'border-orange-500' :
                              notification.type === 'Error' ? 'border-red-500' :
                              'border-emerald-500',
                      ring: notification.type === 'Success' ? 'ring-emerald-300' :
                            notification.type === 'Warning' ? 'ring-orange-300' :
                            notification.type === 'Error' ? 'ring-red-300' :
                            'ring-emerald-300',
                      button: notification.type === 'Success' ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' :
                              notification.type === 'Warning' ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' :
                              notification.type === 'Error' ? 'text-red-700 bg-red-50 hover:bg-red-100' :
                              'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    };
                  } else if (userRole === 'lgu-iu') {
                    return {
                      border: notification.type === 'Success' ? 'border-green-500' :
                              notification.type === 'Warning' ? 'border-orange-500' :
                              notification.type === 'Error' ? 'border-red-500' :
                              'border-[#0D7DB5]',
                      ring: notification.type === 'Success' ? 'ring-green-300' :
                            notification.type === 'Warning' ? 'ring-orange-300' :
                            notification.type === 'Error' ? 'ring-red-300' :
                            'ring-blue-300',
                      button: notification.type === 'Success' ? 'text-green-700 bg-green-50 hover:bg-green-100' :
                              notification.type === 'Warning' ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' :
                              notification.type === 'Error' ? 'text-red-700 bg-red-50 hover:bg-red-100' :
                              'text-[#0D7DB5] bg-blue-50 hover:bg-blue-100'
                    };
                  } else if (userRole === 'mpmec' || userRole === 'secretariat') {
                    return {
                      border: notification.type === 'Success' ? 'border-green-500' :
                              notification.type === 'Warning' ? 'border-orange-500' :
                              notification.type === 'Error' ? 'border-red-500' :
                              'border-blue-500',
                      ring: notification.type === 'Success' ? 'ring-green-300' :
                            notification.type === 'Warning' ? 'ring-orange-300' :
                            notification.type === 'Error' ? 'ring-red-300' :
                            'ring-blue-300',
                      button: notification.type === 'Success' ? 'text-green-700 bg-green-50 hover:bg-green-100' :
                              notification.type === 'Warning' ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' :
                              notification.type === 'Error' ? 'text-red-700 bg-red-50 hover:bg-red-100' :
                              'text-blue-700 bg-blue-50 hover:bg-blue-100'
                    };
                  } else if (userRole === 'executive') {
                    return {
                      border: notification.type === 'Success' ? 'border-green-500' :
                              notification.type === 'Warning' ? 'border-orange-500' :
                              notification.type === 'Error' ? 'border-red-500' :
                              'border-indigo-500',
                      ring: notification.type === 'Success' ? 'ring-green-300' :
                            notification.type === 'Warning' ? 'ring-orange-300' :
                            notification.type === 'Error' ? 'ring-red-300' :
                            'ring-indigo-300',
                      button: notification.type === 'Success' ? 'text-green-700 bg-green-50 hover:bg-green-100' :
                              notification.type === 'Warning' ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' :
                              notification.type === 'Error' ? 'text-red-700 bg-red-50 hover:bg-red-100' :
                              'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                    };
                  } else { // sysadmin
                    return {
                      border: notification.type === 'Success' ? 'border-gray-800' :
                              notification.type === 'Warning' ? 'border-orange-500' :
                              notification.type === 'Error' ? 'border-red-500' :
                              'border-gray-500',
                      ring: notification.type === 'Success' ? 'ring-gray-400' :
                            notification.type === 'Warning' ? 'ring-orange-300' :
                            notification.type === 'Error' ? 'ring-red-300' :
                            'ring-gray-300',
                      button: notification.type === 'Success' ? 'text-gray-800 bg-gray-50 hover:bg-gray-100' :
                              notification.type === 'Warning' ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' :
                              notification.type === 'Error' ? 'text-red-700 bg-red-50 hover:bg-red-100' :
                              'text-gray-700 bg-gray-50 hover:bg-gray-100'
                    };
                  }
                };
                
                const accentColors = getRoleAccentColor();

                return (
                  <div key={notification.id}>
                    <div
                      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border-l-4 ${accentColors.border} ${isUnread ? 'ring-2 ring-opacity-50 ' + accentColors.ring : ''} ${hasNavigation ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                      onClick={() => hasNavigation && handleNotificationClick(notification)}
                    >
                      <div className="p-4 relative">
                        {/* Unread Indicator */}
                        {isUnread && (
                          <div className="absolute top-2 right-2">
                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                              userRole === 'eiu' ? 'bg-emerald-500' :
                              userRole === 'lgu-iu' ? 'bg-[#0D7DB5]' :
                              userRole === 'mpmec' || userRole === 'secretariat' ? 'bg-blue-500' :
                              userRole === 'executive' ? 'bg-indigo-500' :
                              'bg-gray-500'
                            }`}></div>
                          </div>
                        )}
                        <div className="flex items-start gap-3">
                          {/* Profile Picture or Icon */}
                          <div className="flex-shrink-0">
                            {notification.profilePic ? (
                              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-200 hover:ring-gray-300 transition-all duration-200 shadow-sm">
                                <ProfilePictureImage
                                  userId={notification.userId || notification.id}
                                  url={notification.profilePic}
                                  alt="User"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${priorityColor} flex items-center justify-center shadow-sm ring-2 ring-gray-100`}>
                                <div className="text-white">
                                  {getNotificationIcon(notification.type, notification.category, notification.metadata)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h4 className={`text-sm font-bold ${typeColorClass} truncate`}>
                                  {notification.title || 'System Notification'}
                                </h4>
                                {notification.module && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    notification.module === 'user-management' ? 'bg-blue-100 text-blue-700' :
                                    notification.module === 'project' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {notification.module.replace('-', ' ')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                                {notification.message || 'No message content'}
                              </p>

                              {notification.targetId && (
                                <div className="flex items-center gap-2 mt-2 mb-2">
                                  <span className="text-xs text-gray-500">Target:</span>
                                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                    {notification.targetId}
                                  </span>
                                </div>
                              )}

                              {hasNavigation && (
                                <div className="flex items-center gap-2 mt-3">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${accentColors.button}`}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                    </svg>
                                    {notification.actionText || 'View Details'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Time and Actions */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                {!notification.isRead && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id);
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      userRole === 'sysadmin' 
                                        ? 'hover:bg-gray-100' 
                                        : 'hover:bg-green-50'
                                    }`}
                                    title="Mark as read"
                                  >
                                    <svg className={`w-4 h-4 ${
                                      userRole === 'sysadmin' 
                                        ? 'text-gray-700' 
                                        : 'text-green-600'
                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                    {index < notifications.length - 1 && (
                      <div className="mx-4 border-t border-gray-200"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-auto p-4 border-t-2 ${theme.footerBorder} bg-gradient-to-r ${theme.footerGradient} backdrop-blur-md shadow-2xl flex-shrink-0`}>
          <div className="flex items-center justify-between text-sm text-white font-semibold">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg"></div>
              <span className="tracking-wide">{theme.monitorText}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${theme.liveColor} text-lg`}>●</span>
              <span className={`text-xs ${theme.textColor} opacity-75`}>Live</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


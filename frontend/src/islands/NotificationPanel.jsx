import { useState, useEffect, useRef } from 'react';
import notificationService from '../services/notifications.js';

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const [userRole, setUserRole] = useState(role);
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
        
        setNotifications(filteredNotifications);
        
        // Calculate stats
        const unread = filteredNotifications.filter(n => !n.isRead).length;
        const read = filteredNotifications.filter(n => n.isRead).length;
        setStats({
          total: filteredNotifications.length,
          unread,
          read
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time polling
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      
      // Poll every 10 seconds when panel is open
      pollingIntervalRef.current = setInterval(() => {
        loadNotifications();
        notificationService.getNotificationCount();
      }, 10000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
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

  // Handle delete notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      await loadNotifications();
      await notificationService.getNotificationCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle delete all read
  const handleDeleteAllRead = async () => {
    try {
      await notificationService.deleteAllRead();
      await loadNotifications();
      await notificationService.getNotificationCount();
    } catch (error) {
      console.error('Error deleting all read:', error);
    }
  };

  // Handle delete all
  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      try {
        // Delete all notifications one by one
        for (const notif of notifications) {
          await notificationService.deleteNotification(notif.id);
        }
        await loadNotifications();
        await notificationService.getNotificationCount();
      } catch (error) {
        console.error('Error deleting all notifications:', error);
      }
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (notification.actionUrl) {
      let url = notification.actionUrl;
      
      // Add highlight parameter if targetId exists
      if (notification.targetId) {
        const urlObj = new URL(url, window.location.origin);
        urlObj.searchParams.set('highlight', notification.targetId);
        url = urlObj.toString();
      }
      
      // Close panel
      if (onClose) onClose();
      
      // Navigate
      window.location.href = url;
    }
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
        className={`fixed top-0 right-0 h-full w-[420px] bg-gradient-to-br ${theme.bgGradient} shadow-2xl border-l ${theme.borderColor} z-[1200] backdrop-blur-xl transform transition-all duration-500 ease-out translate-x-full`}
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
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleMarkAllAsRead}
              className={`group flex items-center gap-3 text-sm font-semibold text-white bg-gradient-to-r ${theme.buttonGradient} ${theme.buttonHover} transition-all duration-300 ease-out px-4 py-3 rounded-xl border-2 ${theme.borderColor} hover:shadow-2xl shadow-lg hover:-translate-y-1 transform`}
            >
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Mark all read
            </button>
            <button
              onClick={handleDeleteAllRead}
              className="group flex items-center gap-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 ease-out px-4 py-3 rounded-xl border-2 border-red-400/50 hover:border-red-400/70 hover:shadow-2xl shadow-lg hover:-translate-y-1 transform"
            >
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete read
            </button>
            <button
              onClick={handleDeleteAll}
              className="group flex items-center gap-3 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300 ease-out px-4 py-3 rounded-xl border-2 border-red-500/50 hover:border-red-500/70 hover:shadow-2xl shadow-lg hover:-translate-y-1 transform"
            >
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete all
            </button>
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
        <div className={`flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br ${theme.listBg}`}>
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-pulse flex flex-col items-center justify-center">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.iconBg}/20 flex items-center justify-center mb-4`}>
                  <svg className={`w-8 h-8 ${theme.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span className="text-sm font-medium text-white">Loading notifications...</span>
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
              <h4 className="text-sm font-semibold text-white mb-2">No Notifications</h4>
              <p className={`text-sm ${theme.textColor}`}>You're all caught up!</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {notifications.map((notification, index) => {
                const isUnread = !notification.isRead;
                const priorityColors = {
                  high: 'from-red-500/20 to-red-600/20 border-red-500/30',
                  medium: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
                  low: 'from-white/10 to-white/20 border-white/20',
                  info: 'from-white/10 to-white/20 border-white/20'
                };
                const priorityColor = priorityColors[notification.priority?.toLowerCase()] || priorityColors.info;
                const typeColorClass = notification.type === 'Success' ? 'text-green-400' : 
                                      notification.type === 'Warning' ? 'text-orange-400' : 
                                      notification.type === 'Error' ? 'text-red-400' : 'text-gray-300';
                const isClickable = notification.actionUrl && (notification.module === 'user-management' || notification.targetId);

                return (
                  <div key={notification.id}>
                    <div
                      className={`p-4 hover:bg-white/5 transition-all duration-200 ${isUnread ? 'bg-gradient-to-r from-white/5 to-white/10' : ''} ${isClickable ? 'cursor-pointer' : ''} rounded-lg hover:bg-white/10`}
                      onClick={() => isClickable && handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Priority Indicator */}
                        <div className="flex-shrink-0 pt-1">
                          <div className={`w-3 h-3 rounded-full ${isUnread ? 'bg-gradient-to-r from-green-400 to-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        </div>

                        {/* Profile Picture or Icon */}
                        <div className="flex-shrink-0">
                          {notification.profilePic ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20 hover:ring-white/40 transition-all duration-200">
                              <ProfilePictureImage
                                userId={notification.userId || notification.id}
                                url={notification.profilePic}
                                alt="User"
                                className="w-full h-full object-cover"
                              />
                              <div className={`w-full h-full bg-gradient-to-br ${priorityColor} items-center justify-center hidden`}>
                                {getNotificationIcon(notification.type, notification.category, notification.metadata)}
                              </div>
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${priorityColor} flex items-center justify-center`}>
                              {getNotificationIcon(notification.type, notification.category, notification.metadata)}
                            </div>
                          )}
                        </div>

                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-semibold ${typeColorClass}`}>
                                  {notification.title || 'System Notification'}
                                </h4>
                                {notification.module && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                                    {notification.module.replace('-', ' ')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed">
                                {notification.message || 'No message content'}
                              </p>

                              {notification.targetId && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-gray-400">User ID:</span>
                                  <span className="text-xs font-mono text-white bg-white/10 px-2 py-1 rounded">
                                    {notification.targetId}
                                  </span>
                                </div>
                              )}

                              {notification.actionUrl && !isClickable && (
                                <div className="flex items-center gap-2 mt-3">
                                  <a
                                    href={notification.actionUrl}
                                    className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 hover:border-white/30"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                    </svg>
                                    {notification.actionText || 'View Details'}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Time and Actions */}
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                {!notification.isRead && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id);
                                    }}
                                    className="group flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-300 ease-out px-3 py-2 rounded-xl border-2 border-green-400/50 hover:border-green-400/70 hover:shadow-2xl shadow-lg hover:-translate-y-1 transform"
                                    title="Mark as read"
                                  >
                                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotification(notification.id);
                                  }}
                                  className="group flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 ease-out px-3 py-2 rounded-xl border-2 border-red-400/50 hover:border-red-400/70 hover:shadow-2xl shadow-lg hover:-translate-y-1 transform"
                                  title="Delete notification"
                                >
                                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < notifications.length - 1 && (
                      <div className="mx-4 border-t border-white/10"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-auto p-4 border-t-2 ${theme.footerBorder} bg-gradient-to-r ${theme.footerGradient} backdrop-blur-md shadow-2xl`}>
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


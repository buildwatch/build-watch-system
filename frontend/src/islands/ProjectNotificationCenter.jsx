import { useState, useEffect } from 'react';

/**
 * ProjectNotificationCenter - Real-time notifications for project updates
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 */
export default function ProjectNotificationCenter({
  theme = 'amber',
  projects = []
}) {
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [notificationSettings, setNotificationSettings] = useState({
    deadlineReminders: true,
    milestoneUpdates: true,
    statusChanges: true,
    budgetAlerts: true,
    progressUpdates: true,
    dependencyAlerts: true
  });

  // Theme colors
  const themeColors = {
    amber: {
      button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
      accent: 'text-amber-600',
      border: 'border-amber-200'
    },
    emerald: {
      button: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      accent: 'text-emerald-600',
      border: 'border-emerald-200'
    },
    sky: {
      button: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
      accent: 'text-sky-600',
      border: 'border-sky-200'
    },
    blue: {
      button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      accent: 'text-blue-600',
      border: 'border-blue-200'
    }
  };

  const colors = themeColors[theme] || themeColors.amber;

  // Load notifications from localStorage
  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
    
    // Check for project updates and generate notifications
    checkProjectUpdates();
    
    // Set up interval to check for updates every 5 minutes
    const interval = setInterval(() => {
      checkProjectUpdates();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [projects]);

  const loadNotifications = () => {
    try {
      const saved = localStorage.getItem('projectNotifications');
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
      setNotifications([]);
    }
  };

  const saveNotifications = (notifs) => {
    try {
      localStorage.setItem('projectNotifications', JSON.stringify(notifs));
      setNotifications(notifs);
    } catch (e) {
      console.error('Error saving notifications:', e);
    }
  };

  const loadNotificationSettings = () => {
    try {
      const saved = localStorage.getItem('projectNotificationSettings');
      if (saved) {
        setNotificationSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading notification settings:', e);
    }
  };

  const saveNotificationSettings = (settings) => {
    try {
      localStorage.setItem('projectNotificationSettings', JSON.stringify(settings));
      setNotificationSettings(settings);
    } catch (e) {
      console.error('Error saving notification settings:', e);
    }
  };

  // Check for project updates and generate notifications
  const checkProjectUpdates = () => {
    if (!projects || projects.length === 0) return;

    const existingNotifications = loadNotificationsFromStorage();
    const newNotifications = [];

    projects.forEach(project => {
      // Check for deadline approaching
      if (notificationSettings.deadlineReminders && project.endDate) {
        const endDate = new Date(project.endDate);
        const daysUntilDeadline = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
          const exists = existingNotifications.some(n => 
            n.projectId === project.id && 
            n.type === 'deadline' && 
            n.daysUntil === daysUntilDeadline
          );
          
          if (!exists) {
            newNotifications.push({
              id: `deadline_${project.id}_${daysUntilDeadline}`,
              projectId: project.id,
              projectName: project.name,
              projectCode: project.projectCode,
              type: 'deadline',
              title: 'Deadline Approaching',
              message: `${project.name} deadline is in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? 's' : ''}`,
              priority: daysUntilDeadline <= 3 ? 'high' : 'medium',
              daysUntil: daysUntilDeadline,
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // Check for delayed projects
      if (notificationSettings.statusChanges && project.status === 'delayed') {
        const exists = existingNotifications.some(n => 
          n.projectId === project.id && 
          n.type === 'delayed' &&
          new Date(n.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
        );
        
        if (!exists) {
          newNotifications.push({
            id: `delayed_${project.id}_${Date.now()}`,
            projectId: project.id,
            projectName: project.name,
            projectCode: project.projectCode,
            type: 'delayed',
            title: 'Project Delayed',
            message: `${project.name} is marked as delayed`,
            priority: 'high',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Check for low progress
      if (notificationSettings.progressUpdates) {
        const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
        if (progress < 30 && project.status === 'ongoing') {
          const exists = existingNotifications.some(n => 
            n.projectId === project.id && 
            n.type === 'low_progress' &&
            new Date(n.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within last week
          );
          
          if (!exists) {
            newNotifications.push({
              id: `low_progress_${project.id}_${Date.now()}`,
              projectId: project.id,
              projectName: project.name,
              projectCode: project.projectCode,
              type: 'low_progress',
              title: 'Low Progress Alert',
              message: `${project.name} has only ${progress.toFixed(1)}% progress`,
              priority: 'medium',
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    });

    if (newNotifications.length > 0) {
      const updatedNotifications = [...existingNotifications, ...newNotifications];
      saveNotifications(updatedNotifications);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        newNotifications.forEach(notif => {
          new Notification(notif.title, {
            body: notif.message,
            icon: '/favicon.ico'
          });
        });
      }
    }
  };

  const loadNotificationsFromStorage = () => {
    try {
      const saved = localStorage.getItem('projectNotifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updatedNotifications);
  };

  // Mark all as read
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updatedNotifications);
  };

  // Delete notification
  const deleteNotification = (notificationId) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    saveNotifications(updatedNotifications);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      saveNotifications([]);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Update notification settings
  const updateNotificationSetting = (key, value) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);
    saveNotificationSettings(updated);
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'deadline':
        return '⏰';
      case 'delayed':
        return '⚠️';
      case 'low_progress':
        return '📉';
      case 'milestone':
        return '🎯';
      case 'status':
        return '🔄';
      case 'budget':
        return '💰';
      default:
        return '📢';
    }
  };

  // Get notification color
  const getNotificationColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectNotificationCenter = {
        openModal: () => setShowModal(true),
        closeModal: () => setShowModal(false),
        getUnreadCount: () => notifications.filter(n => !n.read).length,
        markAsRead,
        markAllAsRead
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectNotificationCenter) {
        delete window.projectNotificationCenter;
      }
    };
  }, [notifications]);

  // Request permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  if (!showModal) {
    return null;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Project Notifications</h3>
              <p className="text-white/90 text-sm mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Stay updated with project activities'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-all"
                >
                  Mark All Read
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 font-medium transition-all ${
                  filter === 'all' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 font-medium transition-all ${
                  filter === 'unread' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 font-medium transition-all ${
                  filter === 'read' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Read ({notifications.filter(n => n.read).length})
              </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length > 0 ? (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-xl p-4 border-2 transition-all cursor-pointer ${
                      notification.read ? 'bg-gray-50 border-gray-200' : getNotificationColor(notification.priority)
                    }`}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id);
                      // Navigate to project or show details
                      if (window.viewProjectDetails) {
                        window.viewProjectDetails(notification.projectId);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold text-gray-900">{notification.title}</h5>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-amber-600 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {notification.projectCode} • {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete notification"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                <p>No notifications</p>
              </div>
            )}

            {/* Notification Settings */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h4>
              <div className="space-y-3">
                {Object.entries(notificationSettings).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateNotificationSetting(key, e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-between">
          <button
            onClick={clearAllNotifications}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            Clear All
          </button>
          <button
            onClick={() => setShowModal(false)}
            className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


/**
 * Real-time announcement notification badge handler
 * Updates the notification icon badge with unread announcement count
 * Supports: All 6 user accounts (SYS.AD, LGU-IU, EIU, MPMEC Secretariat, MPMEC, Executive Viewer)
 */

// Determine API and Socket URLs based on environment
let API_URL, SOCKET_URL;

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Check if we're in development (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    API_URL = 'http://localhost:3000/api';
    SOCKET_URL = 'http://localhost:3000';
  } else {
    // Production: Use same protocol and domain (no port, reverse proxy handles it)
    API_URL = `${protocol}//${hostname}/api`;
    SOCKET_URL = `${protocol}//${hostname}`;
  }
} else {
  API_URL = 'http://localhost:3000/api';
  SOCKET_URL = 'http://localhost:3000';
}

// Badge ID mapping for each account - announcement badge on megaphone icon
const BADGE_IDS = {
  'eiu': 'eiu-announcement-badge',
  'lgu-iu': 'iu-announcement-badge',
  'secretariat': 'secretariat-announcement-badge',
  'lgu-pmt': 'lgu-pmt-announcement-badge',
  'sysadmin': 'sysadmin-announcement-badge',
  'executive': 'executive-announcement-badge'
};

/**
 * Get authentication token from cookies or localStorage
 */
function getToken() {
  if (typeof document === 'undefined') return null;
  
  // Try localStorage first
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // Fallback to cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  return tokenCookie ? tokenCookie.split('=')[1] : null;
}

/**
 * Get current user ID from token
 */
function getCurrentUserIdFromToken() {
  try {
    const token = getToken();
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.userId || payload.id || payload.sub || payload.user_id || null;
  } catch (e) {
    console.error('Error parsing token:', e);
    return null;
  }
}

/**
 * Fetch unread announcement count from API
 */
async function fetchUnreadCount() {
  try {
    const token = getToken();
    if (!token) {
      console.warn('No token found for announcement notification');
      return 0;
    }

    const response = await fetch(`${API_URL}/admin/public/announcements/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.unreadCount || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error fetching unread announcement count:', error);
    return 0;
  }
}

/**
 * Update badge display with blinking pulse animation
 */
function updateBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (!badge) {
    console.warn(`⚠️ Badge not found for update: ${badgeId}`);
    return;
  }

  console.log(`🔔 Updating badge ${badgeId} with count: ${count}`);

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count.toString();
    badge.classList.remove('hidden');
    // Add blinking pulse animation
    badge.classList.add('animate-pulse');
    // Add custom CSS animation for continuous blinking
    if (!badge.style.animation) {
      badge.style.animation = 'pulse-blink 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
    }
    console.log(`✅ Badge updated: ${count} (visible)`);
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('animate-pulse');
    badge.style.animation = '';
    console.log(`✅ Badge updated: 0 (hidden)`);
  }
}

/**
 * Initialize announcement notification badge
 * @param {string} accountType - 'eiu', 'lgu-iu', 'secretariat', 'lgu-pmt', 'sysadmin', or 'executive'
 */
export function initAnnouncementNotificationBadge(accountType) {
  console.log(`🔔 Initializing announcement notification badge for: ${accountType}`);
  const badgeId = BADGE_IDS[accountType];
  if (!badgeId) {
    console.error(`❌ Invalid account type: ${accountType}`);
    return;
  }

  const badge = document.getElementById(badgeId);
  if (!badge) {
    console.error(`❌ Badge element not found: ${badgeId}`);
    console.log('Available badge IDs:', Object.values(BADGE_IDS));
    // Retry after a short delay in case DOM isn't ready
    setTimeout(() => {
      const retryBadge = document.getElementById(badgeId);
      if (retryBadge) {
        console.log(`✅ Badge element found on retry: ${badgeId}`);
        // Re-initialize
        initAnnouncementNotificationBadge(accountType);
      }
    }, 1000);
    return;
  }
  console.log(`✅ Badge element found: ${badgeId}`);
  
  // Store reference for debugging
  window.announcementNotificationBadge = {
    accountType,
    badgeId,
    badge,
    initialized: true
  };

  // Load Socket.IO client dynamically
  let socket = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  // Load initial unread count with retry
  const loadInitialCount = async (retries = 3) => {
    try {
      const count = await fetchUnreadCount();
      console.log(`📊 Initial unread count: ${count}`);
      updateBadge(badgeId, count);
    } catch (err) {
      console.error('❌ Error fetching initial unread count:', err);
      if (retries > 0) {
        console.log(`   Retrying... (${retries} attempts left)`);
        setTimeout(() => loadInitialCount(retries - 1), 2000);
      }
    }
  };
  loadInitialCount();

  // Initialize Socket.IO connection
  function initSocket() {
    const token = getToken();
    if (!token) {
      console.warn('No token available for Socket.IO connection');
      return;
    }

    // Import socket.io-client dynamically
    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: maxReconnectAttempts
      });

      socket.on('connect', () => {
        console.log('✅ Announcement notification socket connected');
        reconnectAttempts = 0;
        // Refresh count on connect
        fetchUnreadCount().then(count => {
          console.log(`📊 Refreshing badge count after socket connect: ${count}`);
          updateBadge(badgeId, count);
        });
      });

      socket.on('disconnect', (reason) => {
        console.warn('⚠️ Announcement notification socket disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Announcement notification socket connection error:', error);
        reconnectAttempts++;
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn('Max reconnection attempts reached, will retry on next announcement');
        }
      });

      // Listen for new announcements
      socket.on('new_announcement', (announcement) => {
        console.log('📢 Socket.IO: Received new_announcement event:', announcement);
        console.log(`   Account: ${accountType}, Badge ID: ${badgeId}`);
        const currentUserId = getCurrentUserIdFromToken();
        console.log(`   Current user ID: ${currentUserId}, Announcement created by: ${announcement?.createdBy}`);
        
        // Always fetch updated count when a new announcement is created (except if it's from current user)
        // The API will handle filtering by targetAudience to determine if user should see it
        if (announcement && announcement.createdBy && String(announcement.createdBy) !== String(currentUserId)) {
          console.log('   ✅ Announcement is from another user, fetching updated unread count...');
          fetchUnreadCount().then(count => {
            console.log(`   ✅ Updated unread count: ${count} (Account: ${accountType})`);
            updateBadge(badgeId, count);
          }).catch(err => {
            console.error(`   ❌ Error fetching unread count (Account: ${accountType}):`, err);
          });
        } else if (announcement && announcement.createdBy && String(announcement.createdBy) === String(currentUserId)) {
          console.log(`   ⏭️ Skipping update (announcement from current user - Account: ${accountType})`);
        } else {
          console.log(`   ⚠️ Invalid announcement data received (Account: ${accountType})`);
        }
      });

      // Listen for announcement updates (read, acknowledged, etc.)
      socket.on('announcement_read', () => {
        fetchUnreadCount().then(count => {
          updateBadge(badgeId, count);
        });
      });

      socket.on('announcement_acknowledged', () => {
        fetchUnreadCount().then(count => {
          updateBadge(badgeId, count);
        });
      });

      // Listen for announcement updates
      socket.on('announcement_updated', () => {
        fetchUnreadCount().then(count => {
          updateBadge(badgeId, count);
        });
      });
    }).catch(error => {
      console.error('Error loading socket.io-client:', error);
    });
  }

  // Initialize socket connection
  initSocket();

  // Periodically refresh unread count (every 10 seconds as fallback)
  const refreshInterval = setInterval(() => {
    fetchUnreadCount().then(count => {
      console.log(`🔄 Periodic refresh - unread count: ${count}`);
      updateBadge(badgeId, count);
    }).catch(err => {
      console.error('❌ Error in periodic refresh:', err);
    });
  }, 10000);

  // Listen for announcement updates from AnnouncementCenter component
  const handleAnnouncementUpdate = () => {
    fetchUnreadCount().then(count => {
      updateBadge(badgeId, count);
    });
  };
  window.addEventListener('announcementUpdated', handleAnnouncementUpdate);
  window.addEventListener('announcementRead', handleAnnouncementUpdate);
  window.addEventListener('announcementAcknowledged', handleAnnouncementUpdate);

  // Cleanup function (exposed for manual cleanup if needed)
  return () => {
    if (socket) {
      socket.disconnect();
    }
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    window.removeEventListener('announcementUpdated', handleAnnouncementUpdate);
    window.removeEventListener('announcementRead', handleAnnouncementUpdate);
    window.removeEventListener('announcementAcknowledged', handleAnnouncementUpdate);
  };
}

// Auto-detect account type from URL and initialize (for standalone usage)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      detectAndInit();
    });
  } else {
    detectAndInit();
  }

  function detectAndInit() {
    const path = window.location.pathname;
    let accountType = null;

    if (path.includes('/dashboard/eiu/')) {
      accountType = 'eiu';
    } else if (path.includes('/dashboard/iu-implementing-office/')) {
      accountType = 'lgu-iu';
    } else if (path.includes('/dashboard/lgu-pmt-mpmec-secretariat/')) {
      accountType = 'secretariat';
    } else if (path.includes('/dashboard/lgu-pmt-mpmec/')) {
      accountType = 'lgu-pmt';
    } else if (path.includes('/dashboard/sysadmin/')) {
      accountType = 'sysadmin';
    } else if (path.includes('/dashboard/executive-viewer/')) {
      accountType = 'executive';
    }

    if (accountType) {
      initAnnouncementNotificationBadge(accountType);
    }
  }

  // Also refresh count when navigating back to dashboard
  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      // Path changed, check if we're back on a dashboard page
      if (currentPath.includes('/dashboard/')) {
        detectAndInit();
      }
      lastPath = currentPath;
    }
  }, 1000);
}


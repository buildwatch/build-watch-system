/**
 * Real-time message notification badge handler
 * Updates the messaging icon badge with unread message count
 * Supports: EIU, LGU-IU, MPMEC Secretariat, MPMEC
 */

// Determine API and Socket URLs based on environment
const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

const SOCKET_URL = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : `${window.location.protocol}//${window.location.hostname}:3000`)
  : 'http://localhost:3000';

// Badge ID mapping for each account
const BADGE_IDS = {
  'eiu': 'eiu-message-badge',
  'lgu-iu': 'lgu-iu-message-badge',
  'secretariat': 'secretariat-message-badge',
  'lgu-pmt': 'lgu-pmt-message-badge',
  'sysadmin': 'sysadmin-message-badge',
  'executive': 'executive-message-badge'
};

/**
 * Get authentication token from cookies
 */
function getToken() {
  if (typeof document === 'undefined') return null;
  
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
 * Fetch unread message count from API
 */
async function fetchUnreadCount() {
  try {
    const token = getToken();
    if (!token) {
      console.warn('No token found for message notification');
      return 0;
    }

    const response = await fetch(`${API_URL}/messages/unread-count`, {
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
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Update badge display
 */
function updateBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count.toString();
    badge.classList.remove('hidden');
    badge.classList.add('animate-pulse');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('animate-pulse');
  }
}

/**
 * Initialize message notification badge
 * @param {string} accountType - 'eiu', 'lgu-iu', 'secretariat', 'lgu-pmt', 'sysadmin', or 'executive'
 */
export function initMessageNotificationBadge(accountType) {
  const badgeId = BADGE_IDS[accountType];
  if (!badgeId) {
    console.error(`Invalid account type: ${accountType}`);
    return;
  }

  // Load Socket.IO client dynamically
  let socket = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  // Load initial unread count
  fetchUnreadCount().then(count => {
    updateBadge(badgeId, count);
  });

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
        console.log('✅ Message notification socket connected');
        reconnectAttempts = 0;
      });

      socket.on('disconnect', (reason) => {
        console.warn('⚠️ Message notification socket disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Message notification socket connection error:', error);
        reconnectAttempts++;
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn('Max reconnection attempts reached, will retry on next message');
        }
      });

      // Listen for new messages
      socket.on('new_message', (message) => {
        const currentUserId = getCurrentUserIdFromToken();
        if (message && message.senderId && String(message.senderId) !== String(currentUserId)) {
          // Increment badge count
          const badge = document.getElementById(badgeId);
          if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            updateBadge(badgeId, currentCount + 1);
          }
        }
      });

      // Also listen for message_sent events (in case we need to update)
      socket.on('message_sent', (message) => {
        // This is usually for the sender, but we can refresh the count
        fetchUnreadCount().then(count => {
          updateBadge(badgeId, count);
        });
      });

      // Listen for when messages are marked as read (decrease count)
      socket.on('message_read', () => {
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

  // Periodically refresh unread count (every 30 seconds as fallback)
  const refreshInterval = setInterval(() => {
    fetchUnreadCount().then(count => {
      updateBadge(badgeId, count);
    });
  }, 30000);

  // Listen for messagingConversationsUpdated events from MessagingCenter component
  const handleConversationsUpdate = () => {
    fetchUnreadCount().then(count => {
      updateBadge(badgeId, count);
    });
  };
  window.addEventListener('messagingConversationsUpdated', handleConversationsUpdate);

  // Cleanup function (exposed for manual cleanup if needed)
  return () => {
    if (socket) {
      socket.disconnect();
    }
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    window.removeEventListener('messagingConversationsUpdated', handleConversationsUpdate);
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
      initMessageNotificationBadge(accountType);
    }
  }

      // Also refresh count when navigating back to dashboard (after leaving messaging page)
      let lastPath = window.location.pathname;
      setInterval(() => {
        const currentPath = window.location.pathname;
        if (currentPath !== lastPath) {
          // Path changed, check if we're back on a dashboard page
          if (currentPath.includes('/dashboard/') && !currentPath.includes('/modules/messaging') && 
              !currentPath.includes('/modules/message-center') && 
              !currentPath.includes('/modules/communication') && 
              !currentPath.includes('/modules/send-feedback')) {
            // User navigated away from messaging page, refresh count
            detectAndInit();
          }
          lastPath = currentPath;
        }
      }, 1000);
}


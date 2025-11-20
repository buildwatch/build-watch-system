// Copy and paste this code into the browser console to debug messaging issues

console.log('🔧 ========== MESSAGING DEBUG TOOL ==========');
console.log('');

// Check Socket.IO connection
function checkSocketConnection() {
  console.log('📡 Checking Socket.IO connection...');
  
  if (window.debugSocket) {
    const socket = window.debugSocket;
    console.log('✅ Socket object found');
    console.log('   Connected:', socket.connected);
    console.log('   Socket ID:', socket.id);
    console.log('   Disconnected:', socket.disconnected);
    console.log('   Socket URL:', socket.io?.uri);
    console.log('   Transport:', socket.io?.engine?.transport?.name);
    console.log('');
    
    if (!socket.connected) {
      console.error('❌ Socket is NOT connected!');
      console.log('   Trying to reconnect...');
      socket.connect();
    } else {
      console.log('✅ Socket is connected and ready');
    }
  } else {
    console.error('❌ Socket object not found! window.debugSocket is undefined');
    console.log('   This means the MessagingCenter component may not be mounted');
  }
  console.log('');
}

// Check current user
function checkCurrentUser() {
  console.log('👤 Checking current user...');
  
  if (window.debugMessaging) {
    try {
      const userId = window.debugMessaging.getCurrentUserId();
      console.log('   Current User ID:', userId);
      
      // Get user ID from token directly
      try {
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('   User ID from token:', payload.id);
          console.log('   User name:', payload.name || payload.username);
        }
      } catch (e) {
        console.error('   Error parsing token:', e);
      }
      
      // Test connection
      window.debugMessaging.testConnection();
      
      // Try to listen for events manually
      console.log('   Setting up manual event listeners...');
      window.debugMessaging.listenForEvents();
      
    } catch (error) {
      console.error('   Error:', error);
    }
  } else {
    console.error('❌ Debug messaging helpers not found!');
    console.log('   Make sure the messaging component is loaded');
  }
  console.log('');
}

// Monitor socket events
function monitorSocketEvents() {
  console.log('👂 Setting up socket event monitoring...');
  
  if (window.debugSocket) {
    const socket = window.debugSocket;
    
    // Remove any existing listeners to avoid duplicates
    socket.off('test');
    
    // Test event listener
    socket.on('test', (data) => {
      console.log('🧪 Test event received:', data);
    });
    
    // Monitor all events
    const originalOn = socket.on.bind(socket);
    socket.on = function(event, callback) {
      console.log(`📡 Registering listener for event: ${event}`);
      return originalOn(event, (...args) => {
        console.log(`🔔 Event fired: ${event}`, args);
        callback(...args);
      });
    };
    
    console.log('✅ Event monitoring active');
  } else {
    console.error('❌ Socket not available for monitoring');
  }
  console.log('');
}

// Test message sending
function testMessageSend() {
  console.log('🧪 Testing message send...');
  
  const selectedConv = window.debugMessaging?.getSelectedConversation();
  if (!selectedConv) {
    console.error('❌ No conversation selected');
    return;
  }
  
  console.log('   Selected conversation:', selectedConv);
  console.log('   Partner ID:', selectedConv.partnerId);
  console.log('   Partner name:', selectedConv.partner?.name);
  
  // Check if socket can emit
  if (window.debugSocket?.connected) {
    console.log('✅ Socket is connected, can send messages');
    
    // Test typing indicator
    console.log('   Testing typing indicator...');
    window.debugSocket.emit('typing', {
      recipientId: selectedConv.partnerId,
      isTyping: true
    });
    console.log('   Typing indicator sent');
    
    setTimeout(() => {
      window.debugSocket.emit('typing', {
        recipientId: selectedConv.partnerId,
        isTyping: false
      });
      console.log('   Typing indicator cleared');
    }, 2000);
  } else {
    console.error('❌ Socket not connected, cannot test');
  }
  console.log('');
}

// Check backend connection
async function checkBackendConnection() {
  console.log('🔍 Checking backend connection...');
  
  try {
    const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }
    
    const response = await fetch('http://localhost:3000/api/messages/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend API is accessible');
      console.log('   Conversations:', data.conversations?.length || 0);
    } else {
      console.error('❌ Backend API error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Backend connection error:', error);
  }
  console.log('');
}

// Main debug function
function debugMessaging() {
  console.log('🚀 Starting comprehensive messaging debug...');
  console.log('');
  
  checkSocketConnection();
  checkCurrentUser();
  monitorSocketEvents();
  checkBackendConnection();
  
  console.log('✅ Debug complete!');
  console.log('');
  console.log('📝 Available commands:');
  console.log('   checkSocketConnection() - Check socket status');
  console.log('   checkCurrentUser() - Check user info');
  console.log('   testMessageSend() - Test message sending');
  console.log('   checkBackendConnection() - Check API connection');
  console.log('   window.debugSocket - Direct socket access');
  console.log('   window.debugMessaging - Debug helpers');
  console.log('');
}

// Run immediately
debugMessaging();

// Export functions globally
window.checkSocketConnection = checkSocketConnection;
window.checkCurrentUser = checkCurrentUser;
window.testMessageSend = testMessageSend;
window.checkBackendConnection = checkBackendConnection;
window.debugMessaging = debugMessaging;


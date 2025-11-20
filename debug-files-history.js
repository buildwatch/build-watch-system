// ============================================
// FILES HISTORY DEBUGGING TOOL
// ============================================
// Copy and paste this entire script into the browser console
// to debug why files aren't appearing in the File History panel

console.log('🔍 ========== FILES HISTORY DEBUG TOOL ==========');
console.log('');

// Helper function to get token
function getToken() {
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  if (tokenCookie) {
    return tokenCookie.split('=')[1];
  }
  
  // Try localStorage
  const token = localStorage.getItem('token');
  if (token) return token;
  
  // Try sessionStorage
  return sessionStorage.getItem('token');
}

// Helper function to get current user ID from token
function getCurrentUserId() {
  const token = getToken();
  if (!token) {
    console.error('❌ No token found');
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || payload.sub || payload.user_id;
  } catch (e) {
    console.error('❌ Error parsing token:', e);
    return null;
  }
}

// Helper function to get API URL
function getAPIUrl() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  return `${window.location.protocol}//${window.location.hostname}:3000/api`;
}

// Main debugging function
async function debugFilesHistory() {
  console.log('🚀 Starting Files History debugging...');
  console.log('');
  
  // Get current user ID
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    console.error('❌ Cannot get current user ID');
    return;
  }
  console.log('✅ Current User ID:', currentUserId);
  
  // Try to get selected conversation from React component
  let selectedConversation = null;
  let partnerId = null;
  
  // Try to find conversation ID from URL or DOM
  const conversationElements = document.querySelectorAll('[class*="conversation"], [class*="Conversation"]');
  console.log(`📋 Found ${conversationElements.length} conversation elements in DOM`);
  
  // Try to get partner ID from the active conversation
  // Look for the conversation header or active conversation indicator
  const chatHeader = document.querySelector('[class*="chat-header"], [class*="ChatHeader"]');
  if (chatHeader) {
    console.log('📋 Found chat header element');
  }
  
  // Method 1: Try to get from window.debugMessaging if available
  if (window.debugMessaging && typeof window.debugMessaging.getSelectedConversation === 'function') {
    try {
      selectedConversation = window.debugMessaging.getSelectedConversation();
      if (selectedConversation) {
        partnerId = selectedConversation.partnerId;
        console.log('✅ Found selected conversation via window.debugMessaging');
      }
    } catch (e) {
      console.warn('⚠️ window.debugMessaging.getSelectedConversation not available');
    }
  }
  
  // Method 2: Try to get from React DevTools or window
  if (!partnerId && window.debugMessaging) {
    try {
      const conversations = window.debugMessaging.getConversations();
      if (conversations && conversations.length > 0) {
        // Get the first conversation as a test
        selectedConversation = conversations[0];
        partnerId = selectedConversation.partnerId || selectedConversation.partner?.id;
        console.log('✅ Using first conversation for testing:', partnerId);
      }
    } catch (e) {
      console.warn('⚠️ Could not get conversations from window.debugMessaging');
    }
  }
  
  // Method 3: Prompt user for partner ID
  if (!partnerId) {
    const input = prompt('Enter the Partner/User ID of the conversation you want to check (or cancel to check all conversations):');
    if (input && input.trim()) {
      partnerId = input.trim();
      console.log('✅ Using provided partner ID:', partnerId);
    } else {
      console.log('ℹ️ Will check all conversations');
      partnerId = null;
    }
  }
  
  const token = getToken();
  if (!token) {
    console.error('❌ No authentication token found');
    return;
  }
  console.log('✅ Token found:', token.substring(0, 20) + '...');
  
  const API_URL = getAPIUrl();
  console.log('✅ API URL:', API_URL);
  console.log('');
  
  // Step 1: Check all messages in the conversation
  if (partnerId) {
    console.log('📋 Step 1: Checking all messages in conversation with:', partnerId);
    console.log('');
    
    try {
      const response = await fetch(`${API_URL}/messages/conversation/${partnerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        console.log(`✅ Found ${messages.length} total messages in conversation`);
        console.log('');
        
        // Analyze message types
        const messageTypes = {};
        messages.forEach(msg => {
          const type = msg.type || 'unknown';
          messageTypes[type] = (messageTypes[type] || 0) + 1;
        });
        console.log('📊 Message types breakdown:', messageTypes);
        console.log('');
        
        // Check messages with attachments
        const messagesWithAttachments = messages.filter(msg => {
          return msg.attachments && 
                 ((Array.isArray(msg.attachments) && msg.attachments.length > 0) ||
                  (typeof msg.attachments === 'object' && Object.keys(msg.attachments).length > 0));
        });
        
        console.log(`📎 Messages with attachments: ${messagesWithAttachments.length}`);
        messagesWithAttachments.forEach((msg, idx) => {
          console.log(`\n--- Message ${idx + 1} with attachments ---`);
          console.log('ID:', msg.id);
          console.log('Type:', msg.type);
          console.log('Sender ID:', msg.senderId);
          console.log('Recipient ID:', msg.recipientId);
          console.log('Content:', msg.content?.substring(0, 50));
          console.log('Attachments:', JSON.stringify(msg.attachments, null, 2));
          console.log('Created At:', msg.createdAt || msg.created_at);
        });
        console.log('');
        
        // Check file-type messages specifically
        const fileMessages = messages.filter(msg => msg.type === 'file');
        console.log(`📁 Messages with type='file': ${fileMessages.length}`);
        fileMessages.forEach((msg, idx) => {
          console.log(`\n--- File Message ${idx + 1} ---`);
          console.log('ID:', msg.id);
          console.log('Type:', msg.type);
          console.log('Attachments:', JSON.stringify(msg.attachments, null, 2));
          console.log('Created At:', msg.createdAt || msg.created_at);
        });
        console.log('');
        
      } else {
        console.error('❌ Failed to fetch conversation:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
    }
  }
  
  // Step 2: Test the files endpoint directly
  if (partnerId) {
    console.log('📋 Step 2: Testing /messages/files endpoint with:', partnerId);
    console.log('');
    
    try {
      const response = await fetch(`${API_URL}/messages/files/${partnerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response data:', data);
        console.log('');
        
        if (data.success) {
          const files = data.files || [];
          console.log(`📁 Files returned: ${files.length}`);
          
          if (files.length > 0) {
            console.log('✅ Files found!');
            files.forEach((file, idx) => {
              console.log(`\n--- File ${idx + 1} ---`);
              console.log('ID:', file.id);
              console.log('Message ID:', file.messageId);
              console.log('Sender ID:', file.senderId);
              console.log('Recipient ID:', file.recipientId);
              console.log('URL:', file.url);
              console.log('Filename:', file.filename);
              console.log('Original Name:', file.originalName);
              console.log('Mimetype:', file.mimetype);
              console.log('Size:', file.size);
              console.log('Created At:', file.createdAt);
            });
          } else {
            console.log('⚠️ No files returned from API');
            console.log('This could mean:');
            console.log('  1. No messages with type="file" exist');
            console.log('  2. Messages exist but have empty attachments arrays');
            console.log('  3. Backend query is not finding the messages');
          }
        } else {
          console.error('❌ API returned success=false:', data.error);
        }
      } else {
        console.error('❌ Files endpoint failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error calling files endpoint:', error);
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
  
  // Step 3: Check all conversations for file messages
  console.log('');
  console.log('📋 Step 3: Checking all conversations for file messages');
  console.log('');
  
  try {
    const response = await fetch(`${API_URL}/messages/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const conversations = data.conversations || [];
      console.log(`✅ Found ${conversations.length} conversations`);
      
      let totalFileMessages = 0;
      conversations.forEach((conv, idx) => {
        if (conv.lastMessage && conv.lastMessage.type === 'file') {
          totalFileMessages++;
          console.log(`\n--- Conversation ${idx + 1} with file message ---`);
          console.log('Partner:', conv.partner?.name || conv.partnerId);
          console.log('Last Message Type:', conv.lastMessage.type);
          console.log('Last Message Attachments:', JSON.stringify(conv.lastMessage.attachments));
        }
      });
      
      console.log('');
      console.log(`📁 Total conversations with file messages: ${totalFileMessages}`);
    } else {
      console.error('❌ Failed to fetch conversations:', response.status);
    }
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
  }
  
  console.log('');
  console.log('✅ Debugging complete!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('  1. Check the backend console for server-side logs');
  console.log('  2. Verify that messages with attachments have type="file"');
  console.log('  3. Check if attachments array is properly populated');
  console.log('  4. Verify the backend query is finding the messages');
  console.log('');
}

// Export function globally
window.debugFilesHistory = debugFilesHistory;

// Run immediately
debugFilesHistory();


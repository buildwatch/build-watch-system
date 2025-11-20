// Copy and paste this code into the browser console to debug sidebar conversation timestamps

console.log('🔍 ========== SIDEBAR TIMESTAMP DEBUG TOOL ==========');
console.log('');

// Function to check conversation timestamps
function debugSidebarTimestamps() {
  console.log('📋 Checking conversation list timestamps...');
  console.log('');
  
  // Try to access conversations from React DevTools or window
  // First, try to get conversations from the component state
  let conversations = null;
  
  // Method 1: Try window.debugMessaging
  if (window.debugMessaging && typeof window.debugMessaging.getConversations === 'function') {
    try {
      conversations = window.debugMessaging.getConversations();
      console.log('✅ Found conversations via window.debugMessaging');
    } catch (e) {
      console.warn('⚠️ window.debugMessaging.getConversations is not a function:', e);
    }
  }
  
  // Method 2: Try to find React fiber/state
  if (!conversations) {
    console.log('💡 Trying to find conversations in React component...');
    
    // Try to find the MessagingCenter component in React DevTools
    const reactRoot = document.querySelector('[data-reactroot]') || 
                      document.querySelector('#root') ||
                      document.body;
    
    if (reactRoot && reactRoot._reactInternalFiber) {
      console.log('📦 Found React root, trying to traverse...');
    }
  }
  
  // Method 3: Direct DOM inspection
  if (!conversations) {
    console.log('💡 Trying to inspect DOM for conversation timestamps...');
    
    // Find all conversation items in the sidebar
    const conversationItems = document.querySelectorAll('[class*="conversation"], [class*="Conversation"]');
    console.log(`📋 Found ${conversationItems.length} conversation elements in DOM`);
    
    // Try to find timestamp elements
    const timestampElements = Array.from(document.querySelectorAll('span, div'))
      .filter(el => {
        const text = el.textContent?.trim();
        return text === 'Just now' || /\d{1,2}:\d{2}\s?(AM|PM)/.test(text);
      });
    
    console.log(`⏰ Found ${timestampElements.length} timestamp-like elements`);
    
    timestampElements.forEach((el, idx) => {
      console.log(`\n--- Timestamp Element ${idx + 1} ---`);
      console.log('Text:', el.textContent);
      console.log('Classes:', el.className);
      console.log('Parent:', el.parentElement?.textContent?.substring(0, 50));
      console.log('Element:', el);
    });
  }
  
  // If we have conversations, analyze them
  if (conversations && Array.isArray(conversations)) {
    console.log(`\n📊 Found ${conversations.length} conversations to analyze`);
    
    conversations.forEach((conv, idx) => {
      console.log(`\n--- Conversation ${idx + 1}: ${conv.partner?.name || 'Unknown'} ---`);
      console.log('Partner ID:', conv.partnerId);
      console.log('Last Message:', conv.lastMessage ? {
        id: conv.lastMessage.id,
        content: conv.lastMessage.content?.substring(0, 30),
        createdAt: conv.lastMessage.createdAt,
        created_at: conv.lastMessage.created_at,
        hasCreatedAt: !!conv.lastMessage.createdAt,
        hasCreated_at: !!conv.lastMessage.created_at,
        allFields: Object.keys(conv.lastMessage)
      } : 'No last message');
      
      if (conv.lastMessage) {
        const dateValue = conv.lastMessage.createdAt || conv.lastMessage.created_at;
        if (dateValue) {
          console.log('📅 Date value:', dateValue);
          console.log('📅 Date type:', typeof dateValue);
          
          const date = new Date(dateValue);
          console.log('📅 Parsed date:', date);
          console.log('📅 Is valid:', !isNaN(date.getTime()));
          
          if (!isNaN(date.getTime())) {
            // Test PST conversion
            const pstOffset = 8 * 60; // 8 hours in minutes
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const pstTime = new Date(utc + (pstOffset * 60000));
            
            console.log('📅 Original date:', date.toISOString());
            console.log('📅 PST date:', pstTime.toISOString());
            console.log('📅 PST time:', pstTime.toLocaleTimeString());
            
            // Calculate time difference
            const now = new Date();
            const nowPST = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (pstOffset * 60000));
            const diff = nowPST - pstTime;
            const seconds = Math.floor(diff / 1000);
            
            console.log('📅 Time difference (seconds):', seconds);
            console.log('📅 Would show "Just now":', seconds < 10);
            
            if (seconds >= 10) {
              const hours12 = pstTime.getHours() % 12 || 12;
              const minutesPadded = pstTime.getMinutes().toString().padStart(2, '0');
              const ampm = pstTime.getHours() >= 12 ? 'PM' : 'AM';
              const timeString = `${hours12}:${minutesPadded} ${ampm}`;
              console.log('📅 Expected display:', timeString);
            }
          }
        } else {
          console.error('❌ No date value found in lastMessage!');
        }
      }
    });
  } else {
    console.warn('⚠️ Could not access conversations data');
    console.log('\n💡 Manual inspection:');
    console.log('1. Open React DevTools (if available)');
    console.log('2. Find the MessagingCenter component');
    console.log('3. Inspect the "conversations" state');
    console.log('4. Check if lastMessage.createdAt exists for each conversation');
  }
  
  console.log('');
}

// Function to test formatDate with a specific conversation
function testConversationTimestamp(conversationIndex = 0) {
  console.log(`🧪 Testing conversation timestamp for index ${conversationIndex}...`);
  
  if (!window.debugMessaging || typeof window.debugMessaging.getConversations !== 'function') {
    console.error('❌ window.debugMessaging.getConversations not available');
    return;
  }
  
  try {
    const conversations = window.debugMessaging.getConversations();
    if (!conversations || conversations.length === 0) {
      console.error('❌ No conversations found');
      return;
    }
    
    if (conversationIndex >= conversations.length) {
      console.error(`❌ Conversation index ${conversationIndex} out of range. Total conversations: ${conversations.length}`);
      return;
    }
    
    const conv = conversations[conversationIndex];
    console.log('📋 Conversation:', conv.partner?.name);
    console.log('📋 Last Message:', conv.lastMessage);
    
    if (conv.lastMessage) {
      const dateValue = conv.lastMessage.createdAt || conv.lastMessage.created_at;
      console.log('📅 Date value to test:', dateValue);
      
      // Test formatDate if available
      if (window.testFormatDate) {
        window.testFormatDate(dateValue, `Conversation ${conversationIndex} last message`);
      } else {
        console.log('💡 Run the timestamp debug script first to get testFormatDate function');
      }
    } else {
      console.error('❌ No lastMessage in conversation');
    }
  } catch (error) {
    console.error('❌ Error testing conversation:', error);
  }
}

// Function to manually trigger conversation reload and check
async function reloadAndCheckConversations() {
  console.log('🔄 Reloading conversations from API...');
  
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
      console.log('✅ Conversations loaded from API');
      console.log(`📊 Total conversations: ${data.conversations?.length || 0}`);
      
      if (data.conversations && data.conversations.length > 0) {
        console.log('\n📋 Raw conversation data from API:');
        data.conversations.forEach((conv, idx) => {
          console.log(`\n--- Conversation ${idx + 1} ---`);
          console.log('Partner:', conv.partner?.name);
          console.log('Last Message:', conv.lastMessage ? {
            id: conv.lastMessage.id,
            content: conv.lastMessage.content?.substring(0, 30),
            createdAt: conv.lastMessage.createdAt,
            created_at: conv.lastMessage.created_at,
            rawLastMessage: conv.lastMessage
          } : 'No last message');
        });
      }
    } else {
      console.error('❌ Failed to load conversations:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error loading conversations:', error);
  }
}

// Main debug function
function debugSidebarTimestampsMain() {
  console.log('🚀 Starting sidebar timestamp debugging...');
  console.log('');
  
  debugSidebarTimestamps();
  
  console.log('\n');
  reloadAndCheckConversations();
  
  console.log('');
  console.log('✅ Debugging complete!');
  console.log('');
  console.log('📝 Available commands:');
  console.log('   debugSidebarTimestamps() - Check conversation timestamps');
  console.log('   testConversationTimestamp(index) - Test specific conversation (default: 0)');
  console.log('   reloadAndCheckConversations() - Reload from API and check');
  console.log('');
}

// Export functions globally
window.debugSidebarTimestamps = debugSidebarTimestamps;
window.testConversationTimestamp = testConversationTimestamp;
window.reloadAndCheckConversations = reloadAndCheckConversations;

// Run immediately
debugSidebarTimestampsMain();


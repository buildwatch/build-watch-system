// Copy and paste this code into the browser console to debug message timestamps

console.log('🔍 ========== MESSAGE TIMESTAMP DEBUG TOOL ==========');
console.log('');

// Function to check message dates
function debugMessageTimestamps() {
  console.log('📅 Checking message timestamps...');
  console.log('');
  
  // Try to access the messaging component's state
  // First, try to find React elements
  const reactRoot = document.querySelector('[data-messaging-center]') || 
                    document.querySelector('[class*="MessagingCenter"]');
  
  if (!reactRoot) {
    console.error('❌ Cannot find MessagingCenter component in DOM');
    console.log('💡 Trying alternative method...');
    
    // Check if window.debugMessaging is available
    if (window.debugMessaging) {
      console.log('✅ Found window.debugMessaging');
      const messages = window.debugMessaging.getMessages();
      console.log('📨 Messages:', messages);
      
      if (messages && messages.length > 0) {
        console.log(`📊 Found ${messages.length} messages`);
        messages.forEach((msg, idx) => {
          console.log(`\n--- Message ${idx + 1} ---`);
          console.log('ID:', msg.id);
          console.log('Content:', msg.content?.substring(0, 50));
          console.log('Raw createdAt:', msg.createdAt);
          console.log('Raw created_at:', msg.created_at);
          console.log('Type of createdAt:', typeof msg.createdAt);
          
          // Try to parse the date
          let dateObj = null;
          try {
            if (msg.createdAt) {
              dateObj = new Date(msg.createdAt);
            } else if (msg.created_at) {
              dateObj = new Date(msg.created_at);
            }
            
            if (dateObj) {
              console.log('Parsed Date:', dateObj);
              console.log('Is valid:', !isNaN(dateObj.getTime()));
              if (!isNaN(dateObj.getTime())) {
                console.log('Date string:', dateObj.toISOString());
                console.log('Local time:', dateObj.toLocaleString());
                console.log('Hours:', dateObj.getHours());
                console.log('Minutes:', dateObj.getMinutes());
                
                // Calculate time difference
                const now = new Date();
                const diff = now - dateObj;
                const seconds = Math.floor(diff / 1000);
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                
                console.log('Time difference:');
                console.log('  Seconds:', seconds);
                console.log('  Minutes:', minutes);
                console.log('  Hours:', hours);
                
                // Check if same day
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const msgDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                const isToday = today.getTime() === msgDate.getTime();
                console.log('Is today:', isToday);
                
                // Format time manually
                const hours12 = dateObj.getHours() % 12 || 12;
                const minutesPadded = dateObj.getMinutes().toString().padStart(2, '0');
                const ampm = dateObj.getHours() >= 12 ? 'PM' : 'AM';
                const timeString = `${hours12}:${minutesPadded} ${ampm}`;
                console.log('Expected time format:', timeString);
              }
            } else {
              console.error('❌ Could not parse date - both createdAt and created_at are missing or invalid');
            }
          } catch (e) {
            console.error('❌ Error parsing date:', e);
          }
        });
      } else {
        console.warn('⚠️ No messages found in state');
      }
    } else {
      console.error('❌ window.debugMessaging not available');
    }
    
    return;
  }
  
  console.log('✅ Found React root element');
}

// Function to test formatDate logic
function testFormatDate(dateInput, label = 'Test date') {
  console.log(`\n🧪 Testing formatDate for: ${label}`);
  console.log('Input:', dateInput);
  console.log('Input type:', typeof dateInput);
  
  if (!dateInput) {
    console.log('❌ No date input provided');
    return 'Just now';
  }
  
  // Handle different input formats
  let dateValue;
  if (typeof dateInput === 'string') {
    dateValue = dateInput;
  } else if (dateInput && typeof dateInput === 'object') {
    dateValue = dateInput.createdAt || dateInput.created_at || dateInput;
    if (typeof dateValue === 'object' && dateValue instanceof Date) {
      dateValue = dateValue.toISOString();
    }
  } else {
    dateValue = dateInput;
  }
  
  console.log('Processed date value:', dateValue);
  
  const date = new Date(dateValue);
  console.log('Parsed Date object:', date);
  console.log('Date is valid:', !isNaN(date.getTime()));
  
  if (isNaN(date.getTime())) {
    console.error('❌ Invalid date!');
    return 'Just now';
  }
  
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  
  console.log('Current time:', now.toISOString());
  console.log('Message time:', date.toISOString());
  console.log('Difference (ms):', diff);
  console.log('Difference (seconds):', seconds);
  console.log('Difference (minutes):', minutes);
  
  // Show "Just now" only for messages less than 10 seconds old
  if (seconds < 10) {
    console.log('✅ Result: Just now (less than 10 seconds old)');
    return 'Just now';
  }
  
  // Format time
  const hours12 = date.getHours() % 12 || 12;
  const minutesPadded = date.getMinutes().toString().padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  const timeString = `${hours12}:${minutesPadded} ${ampm}`;
  
  console.log('Formatted time:', timeString);
  
  // Check if message is from today
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isToday = today.getTime() === messageDate.getTime();
  
  console.log('Today:', today.toISOString());
  console.log('Message date (normalized):', messageDate.toISOString());
  console.log('Is today:', isToday);
  
  if (isToday) {
    console.log('✅ Result:', timeString);
    return timeString;
  }
  
  // Check if yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = messageDate.getTime() === yesterday.getTime();
  
  console.log('Is yesterday:', isYesterday);
  
  if (isYesterday) {
    const result = `Yesterday ${timeString}`;
    console.log('✅ Result:', result);
    return result;
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[date.getDay()];
  
  const daysDiff = Math.floor(diff / 86400000);
  if (daysDiff > 7) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[date.getMonth()];
    const day = date.getDate();
    const result = `${dayName} ${monthName} ${day}, ${timeString}`;
    console.log('✅ Result:', result);
    return result;
  }
  
  const result = `${dayName} ${timeString}`;
  console.log('✅ Result:', result);
  return result;
}

// Main debug function
function debugTimestamps() {
  console.log('🚀 Starting timestamp debugging...');
  console.log('');
  
  // First, check if we can access messages
  debugMessageTimestamps();
  
  console.log('\n');
  console.log('🧪 Testing formatDate function with sample dates...');
  console.log('');
  
  // Test with current time (should show "Just now")
  console.log('--- Test 1: Current time (should show "Just now") ---');
  testFormatDate(new Date(), 'Current time');
  
  // Test with 30 seconds ago (should show time)
  console.log('\n--- Test 2: 30 seconds ago (should show time) ---');
  const thirtySecondsAgo = new Date();
  thirtySecondsAgo.setSeconds(thirtySecondsAgo.getSeconds() - 30);
  testFormatDate(thirtySecondsAgo, '30 seconds ago');
  
  // Test with 2 hours ago (should show time)
  console.log('\n--- Test 3: 2 hours ago (should show time) ---');
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  testFormatDate(twoHoursAgo, '2 hours ago');
  
  // Test with yesterday
  console.log('\n--- Test 4: Yesterday (should show "Yesterday" + time) ---');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10);
  yesterday.setMinutes(30);
  testFormatDate(yesterday, 'Yesterday 10:30 AM');
  
  // Test with string format
  console.log('\n--- Test 5: ISO string format ---');
  const testDate = new Date();
  testDate.setHours(22);
  testDate.setMinutes(53);
  testFormatDate(testDate.toISOString(), 'ISO string');
  
  console.log('');
  console.log('✅ Debugging complete!');
  console.log('');
  console.log('📝 Available commands:');
  console.log('   debugTimestamps() - Run full debug');
  console.log('   debugMessageTimestamps() - Check actual messages');
  console.log('   testFormatDate(date, label) - Test specific date');
  console.log('');
}

// Export functions globally
window.debugTimestamps = debugTimestamps;
window.debugMessageTimestamps = debugMessageTimestamps;
window.testFormatDate = testFormatDate;

// Run immediately
debugTimestamps();


// ============================================
// PROFILE PICTURE DEBUGGING CODE
// ============================================
// Copy and paste this entire code into the browser console
// It will help diagnose why profile pictures aren't displaying

(async function debugProfilePictures() {
  console.log('🔍 ========== PROFILE PICTURE DEBUGGING ==========');
  
  // 1. Check if MessagingCenter component is available
  if (!window.debugMessaging) {
    console.error('❌ window.debugMessaging is not available. Make sure you are on the messaging page.');
    return;
  }
  
  console.log('\n📋 1. CHECKING CURRENT USER INFO');
  const currentUserId = window.debugMessaging.getCurrentUserId?.();
  console.log('   Current User ID:', currentUserId);
  
  // 2. Check profile pictures state
  console.log('\n📋 2. CHECKING PROFILE PICTURES STATE');
  const profilePictures = window.debugMessaging.getProfilePictures?.() || {};
  console.log('   Total profile pictures in state:', Object.keys(profilePictures).length);
  console.log('   Profile pictures:', profilePictures);
  
  // Check for current user's picture
  if (currentUserId) {
    const currentUserPic = profilePictures[currentUserId];
    console.log(`\n   Current user (${currentUserId}) picture:`, currentUserPic ? (currentUserPic.substring(0, 50) + '...') : 'NOT FOUND');
    if (currentUserPic && currentUserPic.startsWith('data:')) {
      console.log('   ✅ Current user has base64 data URL');
    } else if (currentUserPic && currentUserPic.startsWith('/api/')) {
      console.log('   ⚠️ Current user has endpoint URL (needs fetching)');
    } else if (currentUserPic) {
      console.log('   ⚠️ Current user has regular URL:', currentUserPic);
    }
  }
  
  // 3. Check conversations
  console.log('\n📋 3. CHECKING CONVERSATIONS');
  const conversations = window.debugMessaging.getConversations?.() || [];
  console.log('   Total conversations:', conversations.length);
  
  conversations.slice(0, 5).forEach((conv, idx) => {
    console.log(`\n   Conversation ${idx + 1}:`);
    console.log('     Partner ID:', conv.partnerId);
    console.log('     Partner Name:', conv.partner?.name);
    console.log('     Partner Email:', conv.partner?.email);
    console.log('     Partner userId:', conv.partner?.userId);
    console.log('     Partner id:', conv.partner?.id);
    
    // Check what getProfilePictureUrl returns
    const picUrl = window.debugMessaging.getProfilePictureUrl?.(conv.partnerId);
    console.log('     getProfilePictureUrl result:', picUrl ? (picUrl.substring(0, 50) + '...') : 'null/undefined');
    
    // Check all possible keys in profilePictures
    const possibleKeys = [
      conv.partnerId,
      conv.partner?.userId,
      conv.partner?.id,
      conv.partner?.email
    ].filter(Boolean);
    
    console.log('     Possible keys to check:', possibleKeys);
    possibleKeys.forEach(key => {
      const pic = profilePictures[key];
      if (pic) {
        console.log(`       ✅ Found picture for key "${key}":`, pic.substring(0, 50) + '...');
      } else {
        console.log(`       ❌ No picture for key "${key}"`);
      }
    });
  });
  
  // 4. Check localStorage
  console.log('\n📋 4. CHECKING LOCALSTORAGE');
  try {
    const stored = localStorage.getItem('messaging_profile_pictures');
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('   ✅ localStorage has data:', Object.keys(parsed).length, 'entries');
      console.log('   Keys in localStorage:', Object.keys(parsed));
      
      // Check for corruption
      const currentUserPic = parsed[currentUserId];
      if (currentUserPic) {
        const corrupted = Object.entries(parsed).filter(([key, value]) => 
          key !== currentUserId && value === currentUserPic && value !== null
        );
        if (corrupted.length > 0) {
          console.error('   ❌ CORRUPTION DETECTED:', corrupted.length, 'entries have current user\'s picture!');
          console.error('   Corrupted keys:', corrupted.map(([k]) => k));
        } else {
          console.log('   ✅ No corruption detected');
        }
      }
    } else {
      console.log('   ⚠️ localStorage is empty');
    }
  } catch (e) {
    console.error('   ❌ Error reading localStorage:', e);
  }
  
  // 5. Test API endpoint directly
  console.log('\n📋 5. TESTING API ENDPOINT DIRECTLY');
  if (conversations.length > 0) {
    const testConv = conversations[0];
    const testIdentifier = testConv.partner?.email || testConv.partner?.userId || testConv.partnerId;
    
    console.log(`   Testing with identifier: ${testIdentifier}`);
    
    try {
      const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
      if (!token) {
        console.error('   ❌ No auth token found');
      } else {
        const response = await fetch(`/api/profile/picture/${encodeURIComponent(testIdentifier)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('   API Response Status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('   API Response:', {
            success: data.success,
            hasProfilePictureUrl: !!data.profilePictureUrl,
            isBase64: data.profilePictureUrl?.startsWith('data:'),
            isNull: data.profilePictureUrl === null,
            preview: data.profilePictureUrl ? data.profilePictureUrl.substring(0, 100) + '...' : 'null'
          });
          
          if (data.success && data.profilePictureUrl && data.profilePictureUrl.startsWith('data:')) {
            console.log('   ✅ API returned base64 data URL');
          } else if (data.success && data.profilePictureUrl) {
            console.log('   ⚠️ API returned regular URL:', data.profilePictureUrl);
          } else if (data.success && !data.profilePictureUrl) {
            console.log('   ⚠️ API returned success but no profile picture URL');
          }
        } else {
          const errorText = await response.text();
          console.error('   ❌ API Error:', response.status, errorText);
        }
      }
    } catch (e) {
      console.error('   ❌ Error testing API:', e);
    }
  }
  
  // 6. Check ProfilePictureImage component behavior
  console.log('\n📋 6. CHECKING PROFILE PICTURE IMAGE COMPONENT');
  console.log('   Note: ProfilePictureImage component state is internal to React');
  console.log('   Check browser DevTools React Components tab to see component state');
  
  // 7. Summary and recommendations
  console.log('\n📋 7. SUMMARY AND RECOMMENDATIONS');
  
  const issues = [];
  
  if (Object.keys(profilePictures).length === 0) {
    issues.push('No profile pictures in React state');
  }
  
  if (currentUserId && !profilePictures[currentUserId]) {
    issues.push('Current user picture not loaded');
  }
  
  const conversationsWithoutPics = conversations.filter(conv => {
    const picUrl = window.debugMessaging.getProfilePictureUrl?.(conv.partnerId);
    return !picUrl || picUrl.startsWith('/api/profile/picture/');
  });
  
  if (conversationsWithoutPics.length > 0) {
    issues.push(`${conversationsWithoutPics.length} conversations without loaded pictures`);
  }
  
  if (issues.length === 0) {
    console.log('   ✅ No obvious issues found');
    console.log('   ⚠️ If pictures still not showing, check:');
    console.log('      - React component rendering');
    console.log('      - CSS styles (display: none, visibility, etc.)');
    console.log('      - CORS errors in Network tab');
    console.log('      - ProfilePictureImage component state in React DevTools');
  } else {
    console.error('   ❌ Issues found:');
    issues.forEach(issue => console.error(`      - ${issue}`));
  }
  
  console.log('\n🔍 ========== DEBUGGING COMPLETE ==========');
  console.log('\n💡 To fix issues, try:');
  console.log('   1. Clear localStorage: localStorage.removeItem("messaging_profile_pictures"); location.reload();');
  console.log('   2. Check backend console for API errors');
  console.log('   3. Check Network tab for failed requests');
  console.log('   4. Verify user identifiers (email, userId, id) match database');
  
})();

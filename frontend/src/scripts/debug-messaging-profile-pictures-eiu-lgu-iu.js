// Debugging Script for EIU and LGU-IU Messaging Profile Picture Issues
// Run this in the browser console when on EIU or LGU-IU messaging pages

(function() {
  console.log('🔍 ========== MESSAGING PROFILE PICTURE DEBUGGER ==========');
  console.log('🔍 Running for:', window.location.pathname);
  
  const debugInfo = {
    currentPath: window.location.pathname,
    timestamp: new Date().toISOString(),
    profilePictureManagers: {},
    messagingImages: [],
    profilePictureState: {},
    events: []
  };

  // Check which profile picture managers are active
  if (window.eiuProfilePictureManager) {
    debugInfo.profilePictureManagers.eiu = {
      exists: true,
      profilePictureUrl: window.eiuProfilePictureManager.profilePictureUrl,
      isInitialized: window.eiuProfilePictureManager.isInitialized,
      isOnMessagingPage: window.eiuProfilePictureManager.isOnMessagingPage ? 
        window.eiuProfilePictureManager.isOnMessagingPage() : 'method not found'
    };
    console.log('✅ EIU Profile Picture Manager found:', debugInfo.profilePictureManagers.eiu);
  } else {
    console.log('❌ EIU Profile Picture Manager NOT found');
  }

  if (window.lguIuProfilePictureManager) {
    debugInfo.profilePictureManagers.lguIu = {
      exists: true,
      profilePictureUrl: window.lguIuProfilePictureManager.profilePictureUrl,
      isInitialized: window.lguIuProfilePictureManager.isInitialized,
      isOnMessagingPage: window.lguIuProfilePictureManager.isOnMessagingPage ? 
        window.lguIuProfilePictureManager.isOnMessagingPage() : 'method not found'
    };
    console.log('✅ LGU-IU Profile Picture Manager found:', debugInfo.profilePictureManagers.lguIu);
  } else {
    console.log('❌ LGU-IU Profile Picture Manager NOT found');
  }

  // Find all images in messaging area
  const messagingContainer = document.querySelector('[class*="messaging"], [id*="messaging"], [class*="message"], [id*="message"]');
  if (messagingContainer) {
    console.log('✅ Messaging container found');
    const allImages = messagingContainer.querySelectorAll('img');
    console.log(`📸 Found ${allImages.length} images in messaging container`);
    
    allImages.forEach((img, index) => {
      const imgInfo = {
        index: index + 1,
        src: img.src.substring(0, 100) + '...',
        srcType: img.src.startsWith('blob:') ? 'blob' : img.src.startsWith('data:') ? 'data' : 'url',
        alt: img.alt || 'no alt',
        id: img.id || 'no id',
        className: img.className || 'no class',
        parentClasses: img.closest('[class*="conversation"], [class*="message"], [class*="chat"]')?.className || 'none'
      };
      debugInfo.messagingImages.push(imgInfo);
      console.log(`📸 Image ${index + 1}:`, imgInfo);
    });
  } else {
    console.log('⚠️ Messaging container NOT found');
  }

  // Check localStorage for profile pictures
  try {
    const messagingPictures = localStorage.getItem('messaging_profile_pictures');
    if (messagingPictures) {
      const parsed = JSON.parse(messagingPictures);
      debugInfo.profilePictureState.localStorage = {
        count: Object.keys(parsed).length,
        keys: Object.keys(parsed),
        sample: Object.fromEntries(Object.entries(parsed).slice(0, 5))
      };
      console.log('💾 Messaging profile pictures in localStorage:', debugInfo.profilePictureState.localStorage);
    } else {
      console.log('⚠️ No messaging_profile_pictures in localStorage');
    }
  } catch (e) {
    console.error('❌ Error reading localStorage:', e);
  }

  // Monitor visibility change events
  const originalVisibilityChange = document.addEventListener;
  let visibilityChangeCount = 0;
  document.addEventListener('visibilitychange', function() {
    visibilityChangeCount++;
    const event = {
      type: 'visibilitychange',
      count: visibilityChangeCount,
      hidden: document.hidden,
      timestamp: new Date().toISOString(),
      path: window.location.pathname
    };
    debugInfo.events.push(event);
    console.log('👁️ Visibility change event:', event);
    
    // Check if profile picture managers are trying to update
    setTimeout(() => {
      const messagingImagesAfter = messagingContainer ? 
        Array.from(messagingContainer.querySelectorAll('img')).map(img => ({
          src: img.src.substring(0, 50),
          srcType: img.src.startsWith('blob:') ? 'blob' : img.src.startsWith('data:') ? 'data' : 'url'
        })) : [];
      
      console.log('📸 Images after visibility change:', messagingImagesAfter);
      
      // Compare with before
      const changed = messagingImagesAfter.some((img, idx) => {
        const before = debugInfo.messagingImages[idx];
        return before && img.src !== before.src;
      });
      
      if (changed) {
        console.error('❌ PROFILE PICTURES CHANGED AFTER VISIBILITY CHANGE!');
        console.error('Before:', debugInfo.messagingImages);
        console.error('After:', messagingImagesAfter);
      } else {
        console.log('✅ Profile pictures unchanged after visibility change');
      }
    }, 500);
  }, true);

  // Monitor profile picture manager update calls
  if (window.eiuProfilePictureManager) {
    const originalUpdate = window.eiuProfilePictureManager.updateAllProfilePictures;
    window.eiuProfilePictureManager.updateAllProfilePictures = function() {
      console.log('🔄 EIU updateAllProfilePictures called!');
      console.log('   Current path:', window.location.pathname);
      console.log('   Is on messaging page:', this.isOnMessagingPage ? this.isOnMessagingPage() : 'method not found');
      
      if (this.isOnMessagingPage && this.isOnMessagingPage()) {
        console.log('⏭️ Should be skipped (on messaging page)');
      } else {
        console.log('⚠️ WILL UPDATE (not on messaging page or check failed)');
      }
      
      return originalUpdate.call(this);
    };
  }

  if (window.lguIuProfilePictureManager) {
    const originalUpdate = window.lguIuProfilePictureManager.updateAllProfilePictures;
    window.lguIuProfilePictureManager.updateAllProfilePictures = function() {
      console.log('🔄 LGU-IU updateAllProfilePictures called!');
      console.log('   Current path:', window.location.pathname);
      console.log('   Is on messaging page:', this.isOnMessagingPage ? this.isOnMessagingPage() : 'method not found');
      
      if (this.isOnMessagingPage && this.isOnMessagingPage()) {
        console.log('⏭️ Should be skipped (on messaging page)');
      } else {
        console.log('⚠️ WILL UPDATE (not on messaging page or check failed)');
      }
      
      return originalUpdate.call(this);
    };
  }

  // Export debug info to window for inspection
  window.messagingProfilePictureDebug = debugInfo;
  
  console.log('✅ Debugging active. Run these commands:');
  console.log('   window.messagingProfilePictureDebug - View debug info');
  console.log('   Switch tabs/minimize browser to trigger visibility change');
  console.log('   Check console for visibility change events and profile picture updates');
  
  return debugInfo;
})();


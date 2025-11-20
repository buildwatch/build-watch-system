// Debugging Script for MPMEC and MPMEC Secretariat Messaging Profile Picture Success
// Run this in the browser console when on MPMEC or MPMEC Secretariat messaging pages
// This helps identify why these modules work correctly

(function() {
  console.log('🔍 ========== MPMEC/SECRETARIAT PROFILE PICTURE DEBUGGER ==========');
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
  if (window.mpmecProfilePictureManager) {
    debugInfo.profilePictureManagers.mpmec = {
      exists: true,
      profilePictureUrl: window.mpmecProfilePictureManager.profilePictureUrl,
      isInitialized: window.mpmecProfilePictureManager.isInitialized,
      shouldRun: window.mpmecProfilePictureManager.shouldRunForCurrentUser ? 
        window.mpmecProfilePictureManager.shouldRunForCurrentUser() : 'method not found'
    };
    console.log('✅ MPMEC Profile Picture Manager found:', debugInfo.profilePictureManagers.mpmec);
  } else {
    console.log('❌ MPMEC Profile Picture Manager NOT found');
  }

  if (window.secretariatProfilePictureManager) {
    debugInfo.profilePictureManagers.secretariat = {
      exists: true,
      profilePictureUrl: window.secretariatProfilePictureManager.profilePictureUrl,
      isInitialized: window.secretariatProfilePictureManager.isInitialized
    };
    console.log('✅ Secretariat Profile Picture Manager found:', debugInfo.profilePictureManagers.secretariat);
    
    // Check if Secretariat manager is disabled
    if (window.secretariatProfilePictureManager.isInitialized && 
        !window.secretariatProfilePictureManager.profilePictureUrl) {
      console.log('⚠️ Secretariat Profile Picture Manager appears to be DISABLED (no URL)');
      console.log('   This is why it works - it\'s not updating anything!');
    }
  } else {
    console.log('❌ Secretariat Profile Picture Manager NOT found');
  }

  // Find all images in messaging area
  const messagingContainer = document.querySelector('[class*="messaging"], [id*="messaging"], [class*="message"], [id*="message"], [class*="communication"]');
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
        console.warn('⚠️ Profile pictures changed after visibility change');
        console.warn('Before:', debugInfo.messagingImages);
        console.warn('After:', messagingImagesAfter);
      } else {
        console.log('✅ Profile pictures UNCHANGED after visibility change (expected behavior)');
      }
    }, 500);
  }, true);

  // Monitor profile picture manager update calls
  if (window.mpmecProfilePictureManager) {
    const originalUpdate = window.mpmecProfilePictureManager.updateAllProfilePictures;
    window.mpmecProfilePictureManager.updateAllProfilePictures = function() {
      console.log('🔄 MPMEC updateAllProfilePictures called!');
      console.log('   Current path:', window.location.pathname);
      console.log('   Should run:', this.shouldRunForCurrentUser ? this.shouldRunForCurrentUser() : 'method not found');
      
      const result = originalUpdate.call(this);
      console.log('   Update completed');
      return result;
    };
  }

  if (window.secretariatProfilePictureManager) {
    const originalUpdate = window.secretariatProfilePictureManager.updateAllProfilePictures;
    window.secretariatProfilePictureManager.updateAllProfilePictures = function() {
      console.log('🔄 Secretariat updateAllProfilePictures called!');
      console.log('   Current path:', window.location.pathname);
      
      // Check if manager is disabled
      if (!this.profilePictureUrl) {
        console.log('⏭️ Secretariat manager is DISABLED (no profile picture URL)');
        console.log('   This is why it works - it returns early without updating!');
      }
      
      const result = originalUpdate.call(this);
      console.log('   Update completed');
      return result;
    };
  }

  // Export debug info to window for inspection
  window.mpmecSecretariatProfilePictureDebug = debugInfo;
  
  console.log('✅ Debugging active. Run these commands:');
  console.log('   window.mpmecSecretariatProfilePictureDebug - View debug info');
  console.log('   Switch tabs/minimize browser to trigger visibility change');
  console.log('   Check console for visibility change events and profile picture updates');
  console.log('   Compare behavior with EIU/LGU-IU to see the difference');
  
  return debugInfo;
})();


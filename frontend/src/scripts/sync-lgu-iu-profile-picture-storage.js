// Utility script to sync LGU-IU profile picture localStorage keys
// Run this in the console to fix localStorage inconsistencies

(function() {
  'use strict';
  
  console.log('🔄 Syncing LGU-IU profile picture localStorage keys...');
  
  const iuProfile = localStorage.getItem('iu_profile_picture');
  const lguIuProfile = localStorage.getItem('lgu_iu_profile_picture');
  const userData = localStorage.getItem('user');
  
  let user = null;
  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch (e) {
      console.error('❌ Error parsing user data:', e);
      return;
    }
  }
  
  // Determine the correct URL to use (prefer HTTP URL over base64)
  let correctUrl = null;
  
  // Priority: user.profilePictureUrl (HTTP) > lguIuProfile (HTTP) > iuProfile (HTTP) > any other
  if (user && user.profilePictureUrl && user.profilePictureUrl.startsWith('http')) {
    correctUrl = user.profilePictureUrl;
    console.log('✅ Using HTTP URL from user data');
  } else if (lguIuProfile && lguIuProfile.startsWith('http')) {
    correctUrl = lguIuProfile;
    console.log('✅ Using HTTP URL from lgu_iu_profile_picture');
  } else if (iuProfile && iuProfile.startsWith('http')) {
    correctUrl = iuProfile;
    console.log('✅ Using HTTP URL from iu_profile_picture');
  } else {
    // Fallback to any available URL
    correctUrl = lguIuProfile || iuProfile || (user && user.profilePictureUrl);
    console.log('⚠️ Using fallback URL (may be base64)');
  }
  
  if (!correctUrl) {
    console.log('❌ No profile picture URL found to sync');
    return;
  }
  
  console.log('🔄 Syncing to:', correctUrl.substring(0, 50) + '...');
  
  // Store in both keys
  localStorage.setItem('iu_profile_picture', correctUrl);
  localStorage.setItem('lgu_iu_profile_picture', correctUrl);
  
  // Update user data if needed
  if (user) {
    user.profilePictureUrl = correctUrl;
    localStorage.setItem('user', JSON.stringify(user));
  }
  
  console.log('✅ Sync completed! Both localStorage keys now have the same value.');
  console.log('💡 Reload the page to see the changes take effect.');
  
  // If profile picture manager exists, update it
  if (window.lguIuProfilePictureManager) {
    console.log('🔄 Updating profile picture manager...');
    window.lguIuProfilePictureManager.profilePictureUrl = correctUrl;
    window.lguIuProfilePictureManager.updateAllProfilePictures();
    console.log('✅ Profile picture manager updated');
  }
})();


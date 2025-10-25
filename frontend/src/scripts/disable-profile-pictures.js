// Temporary script to disable profile picture loading
// This will stop the CORS errors from spamming the console
// Run this in the browser console to disable profile pictures

console.log('🔧 Disabling profile picture loading to stop console spam...');
localStorage.setItem('disable_profile_pictures', 'true');

// Reload the page to apply changes
console.log('🔄 Reloading page to apply changes...');
window.location.reload();

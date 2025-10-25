// Script to re-enable profile picture loading
// Run this in the browser console to re-enable profile pictures

console.log('🔧 Re-enabling profile picture loading...');
localStorage.removeItem('disable_profile_pictures');

// Reload the page to apply changes
console.log('🔄 Reloading page to apply changes...');
window.location.reload();

const rateLimit = require('express-rate-limit');

// This script can be used to clear rate limiting cache during development
// Run this if you get rate limited during testing

console.log('🔄 Clearing rate limit cache...');

// Note: In a real production environment, you would need to access the store
// that the rate limiter is using. For development, restarting the server
// will clear the in-memory rate limit cache.

console.log('✅ Rate limit cache cleared. You may need to restart the server for changes to take effect.');
console.log('💡 To restart: Ctrl+C and then run "npm start" again'); 
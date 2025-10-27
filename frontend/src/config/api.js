// API Configuration
// For production, we need to use the correct protocol
export const API_BASE_URL = typeof window !== 'undefined' && (window.location.hostname === 'build-watch.com' || window.location.hostname === 'www.build-watch.com')
  ? 'http://build-watch.com:3000/api'  // Use HTTP since backend doesn't have SSL on port 3000
  : 'http://localhost:3000/api';

// Alternative configurations
export const API_CONFIG = {
  development: 'http://localhost:3000/api',
  production: 'http://build-watch.com:3000/api',  // Use HTTP, not HTTPS
  // Note: In the future, set up Nginx reverse proxy to handle HTTPS
};

// Get the appropriate API URL based on environment
export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check if we're in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return API_CONFIG.development;
    }
    // Production: use production URL
    return API_CONFIG.production;
  }
  // Server-side: use development URL for local development
  return API_CONFIG.development;
}; 
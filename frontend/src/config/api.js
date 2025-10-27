// API Configuration
// Update this URL to point to your VPS backend
export const API_BASE_URL = 'https://build-watch.com:3000/api';

// Alternative configurations
export const API_CONFIG = {
  development: 'http://localhost:3000/api',
  production: 'https://build-watch.com:3000/api',
  // Add your domain here when you have one
  // domain: 'https://yourdomain.com/api'
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
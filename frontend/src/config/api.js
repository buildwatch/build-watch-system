// API Configuration
// Automatically detects environment and uses appropriate API URL

// Get the appropriate API URL based on environment
export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Check if we're in development (localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // Check if we're in production (build-watch.com)
    if (hostname.includes('build-watch.com') || hostname === 'www.build-watch.com') {
      // Use same protocol as frontend to avoid mixed content warnings
      // If frontend is HTTPS, try HTTPS for backend (may require reverse proxy)
      // Otherwise, use HTTP on port 3000
      if (protocol === 'https:') {
        // Try HTTPS first, fallback to HTTP if needed
        return 'https://' + hostname + ':3000/api';
      } else {
        return 'http://' + hostname + ':3000/api';
      }
    }
    
    // Fallback for other environments
    return 'http://localhost:3000/api';
  }
  
  // Server-side: use development URL for local development
  return 'http://localhost:3000/api';
};

// Alternative configurations
export const API_CONFIG = {
  development: 'http://localhost:3000/api',
  // Production URL will be dynamically generated based on hostname
  get production() {
    return getApiUrl();
  }
};

// Base URL for direct use
export const API_BASE_URL = getApiUrl();
// API Configuration
// Automatically detects environment and uses appropriate API URL

// Get the appropriate API URL based on environment
export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Check if we're in development (localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // Check if we're in production (build-watch.com)
    if (hostname.includes('build-watch.com')) {
      // For production, use the same protocol and domain WITHOUT port
      // This assumes Nginx reverse proxy is configured to route /api to backend
      // If Nginx proxies /api to localhost:3000, use relative path
      // Otherwise, we'll use absolute URL with same protocol
      if (protocol === 'https:') {
        // HTTPS: Use same domain without port (Nginx reverse proxy expected)
        // Browsers will block HTTP requests from HTTPS pages (mixed content)
        return protocol + '//' + hostname + '/api';
      } else {
        // HTTP: Can use port 3000 directly
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
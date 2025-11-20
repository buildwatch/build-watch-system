import { getApiUrl } from '../config/api.js';

// Dynamic API URL - calls getApiUrl() each time to ensure correct environment detection
// This way, localhost will use localhost:3000, and production will use production URL

class HomeService {
  constructor() {
    this.cache = {
      stats: null,
      projects: null,
      articles: null,
      barangayStats: null,
      lastFetch: null
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get home page statistics
  async getHomeStats(forceRefresh = false) {
    try {
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh && this.cache.stats && this.cache.lastFetch && 
          (Date.now() - this.cache.lastFetch) < this.cacheTimeout) {
        return this.cache.stats;
      }

      // Add timestamp to force fresh data from backend
      const timestamp = new Date().getTime();
      const response = await fetch(`${getApiUrl()}/home/stats?_t=${timestamp}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Home stats API response:', data);
        
        // Handle the response format from backend
        const stats = {
          ongoingProjects: data.ongoingProjects || 0,
          totalBudget: data.totalBudget || 0,
          completedProjects: data.completedProjects || 0,
          totalProjects: data.totalProjects || 0,
          budgetUtilization: data.budgetUtilization || 0,
          utilizedBudget: data.utilizedBudget || 0,
          averageProgress: data.averageProgress || 0,
          activeDepartments: data.activeDepartments || 0
        };
        
        this.cache.stats = stats;
        this.cache.lastFetch = Date.now();
        return this.cache.stats;
      } else {
        console.error('Home stats API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching home stats:', error);
    }

    // Return fallback data if API fails - but log this as an issue
    console.warn('Using fallback data for home stats - API connection failed');
    return {
      ongoingProjects: 0,
      totalBudget: 0,
      completedProjects: 0,
      totalProjects: 0,
      budgetUtilization: 0, // No fallback - show 0% when API fails
      utilizedBudget: 0,
      averageProgress: 0,
      activeDepartments: 0
    };
  }

  // Get barangay statistics
  async getBarangayStats() {
    try {
      // Check cache first
      if (this.cache.barangayStats && this.cache.lastFetch && 
          (Date.now() - this.cache.lastFetch) < this.cacheTimeout) {
        return this.cache.barangayStats;
      }

      const response = await fetch(`${getApiUrl()}/home/barangay-stats`);
      
      if (response.ok) {
        const data = await response.json();
        this.cache.barangayStats = data.barangayStats || [];
        this.cache.lastFetch = Date.now();
        return this.cache.barangayStats;
      }
    } catch (error) {
      console.error('Error fetching barangay stats:', error);
    }

    // Return fallback data if API fails
    return [
      {name: 'Alipit', totalProjects: 3, ongoingProjects: 2, completedProjects: 1, totalBudget: 15000000},
      {name: 'Bagumbayan', totalProjects: 2, ongoingProjects: 1, completedProjects: 1, totalBudget: 12000000},
      {name: 'Bubukal', totalProjects: 1, ongoingProjects: 1, completedProjects: 0, totalBudget: 8000000},
      {name: 'Calios', totalProjects: 4, ongoingProjects: 3, completedProjects: 1, totalBudget: 25000000},
      {name: 'Duhat', totalProjects: 2, ongoingProjects: 2, completedProjects: 0, totalBudget: 18000000},
      {name: 'Gatid', totalProjects: 3, ongoingProjects: 2, completedProjects: 1, totalBudget: 22000000},
      {name: 'Jasaan', totalProjects: 1, ongoingProjects: 1, completedProjects: 0, totalBudget: 10000000},
      {name: 'Labuin', totalProjects: 2, ongoingProjects: 1, completedProjects: 1, totalBudget: 15000000},
      {name: 'Malinao', totalProjects: 3, ongoingProjects: 2, completedProjects: 1, totalBudget: 20000000},
      {name: 'Oogong', totalProjects: 1, ongoingProjects: 1, completedProjects: 0, totalBudget: 9000000},
      {name: 'Pagsawitan', totalProjects: 2, ongoingProjects: 1, completedProjects: 1, totalBudget: 14000000},
      {name: 'Palasan', totalProjects: 4, ongoingProjects: 3, completedProjects: 1, totalBudget: 28000000},
      {name: 'Patimbao', totalProjects: 1, ongoingProjects: 1, completedProjects: 0, totalBudget: 11000000},
      {name: 'Poblacion I', totalProjects: 5, ongoingProjects: 3, completedProjects: 2, totalBudget: 35000000},
      {name: 'Poblacion II', totalProjects: 3, ongoingProjects: 2, completedProjects: 1, totalBudget: 24000000},
      {name: 'Poblacion III', totalProjects: 2, ongoingProjects: 1, completedProjects: 1, totalBudget: 16000000},
      {name: 'Poblacion IV', totalProjects: 4, ongoingProjects: 2, completedProjects: 2, totalBudget: 30000000},
      {name: 'Poblacion V', totalProjects: 1, ongoingProjects: 1, completedProjects: 0, totalBudget: 12000000},
      {name: 'San Jose', totalProjects: 3, ongoingProjects: 2, completedProjects: 1, totalBudget: 21000000},
      {name: 'San Juan', totalProjects: 2, ongoingProjects: 1, completedProjects: 1, totalBudget: 17000000},
      {name: 'San Pablo Norte', totalProjects: 4, ongoingProjects: 3, completedProjects: 1, totalBudget: 26000000},
      {name: 'San Pablo Sur', totalProjects: 2, ongoingProjects: 1, completedProjects: 1, totalBudget: 19000000},
      {name: 'Santisima Cruz', totalProjects: 3, ongoingProjects: 2, completedProjects: 1, totalBudget: 23000000},
      {name: 'Santo Angel Central', totalProjects: 1, ongoingProjects: 1, completedProjects: 0, totalBudget: 13000000},
      {name: 'Santo Angel Norte', totalProjects: 2, ongoingProjects: 1, completedProjects: 1, totalBudget: 18000000},
      {name: 'Santo Angel Sur', totalProjects: 3, ongoingProjects: 2, completedProjects: 1, totalBudget: 22000000}
    ];
  }

  // Get featured projects for carousel
  async getFeaturedProjects(limit = 5, forceRefresh = false) {
    try {
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh && this.cache.projects && this.cache.lastFetch && 
          (Date.now() - this.cache.lastFetch) < this.cacheTimeout) {
        return this.cache.projects.slice(0, limit);
      }

      // Add timestamp to force fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(`${getApiUrl()}/home/featured-projects?limit=${limit}&_t=${timestamp}`);
      
      if (response.ok) {
        const data = await response.json();
        this.cache.projects = data.projects || [];
        this.cache.lastFetch = Date.now();
        return this.cache.projects;
      }
    } catch (error) {
      console.error('Error fetching featured projects:', error);
    }

    // Return fallback data if API fails
    return [
      {
        id: '1',
        name: 'Road Rehabilitation Project',
        location: 'Barangay Poblacion I',
        status: 'Ongoing',
        startDate: '2024-01-15',
        endDate: '2025-06-30',
        budget: 15000000,
        progress: 65
      },
      {
        id: '2',
        name: 'Public Market Renovation',
        location: 'Barangay Poblacion II',
        status: 'Planning',
        startDate: '2024-03-01',
        endDate: '2025-12-31',
        budget: 25000000,
        progress: 15
      },
      {
        id: '3',
        name: 'School Building Construction',
        location: 'Barangay Gatid',
        status: 'Ongoing',
        startDate: '2024-02-01',
        endDate: '2025-08-31',
        budget: 35000000,
        progress: 45
      },
      {
        id: '4',
        name: 'Water System Improvement',
        location: 'Barangay Bubukal',
        status: 'Completed',
        startDate: '2023-06-01',
        endDate: '2024-05-31',
        budget: 18000000,
        progress: 100
      },
      {
        id: '5',
        name: 'Health Center Upgrade',
        location: 'Barangay Labuin',
        status: 'Ongoing',
        startDate: '2024-04-01',
        endDate: '2025-10-31',
        budget: 12000000,
        progress: 30
      }
    ];
  }

  // Get articles/news for carousel
  async getArticles(limit = 4, forceRefresh = false) {
    try {
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh && this.cache.articles && this.cache.lastFetch && 
          (Date.now() - this.cache.lastFetch) < this.cacheTimeout) {
        return this.cache.articles.slice(0, limit);
      }

      // Fetch all published articles (we'll filter and limit after)
      const response = await fetch(`${getApiUrl()}/articles?status=Published&limit=50`);
      
      if (response.ok) {
        const data = await response.json();
        const allArticles = data.articles || [];
        
        // Filter out seeded mock articles (same logic as news.astro)
        const seededArticleIds = [
          '550e8400-e29b-41d4-a716-446655440001', // Santa Cruz LGU Launches Build Watch Platform
          '550e8400-e29b-41d4-a716-446655440002', // Major Road Project Reaches 65% Completion
          '550e8400-e29b-41d4-a716-446655440003', // Public Market Renovation Project Approved
          '550e8400-e29b-41d4-a716-446655440004', // New School Building to Serve 500 Students
          '550e8400-e29b-41d4-a716-446655440005', // Water System Improvement Project Completed
          '550e8400-e29b-41d4-a716-446655440006'  // Health Center Upgrade Project Progress
        ];
        
        const filteredArticles = allArticles.filter(article => {
          // Keep auto-generated articles (from real project events)
          if (article.metadata?.autoGenerated === true) {
            return true;
          }
          
          // Filter out seeded articles by ID
          if (seededArticleIds.includes(article.id)) {
            return false;
          }
          
          // Filter out common mock article titles/patterns
          const mockPatterns = [
            'santa cruz lgu launches build watch',
            'major road project reaches',
            'public market renovation',
            'new school building to serve',
            'water system improvement',
            'health center upgrade',
            'build watch system launches',
            'new health center project',
            '4ps program updates',
            'training session',
            'road rehabilitation',
            'community feedback',
            'annual project review'
          ];
          
          const title = (article.title || '').toLowerCase();
          const isMock = mockPatterns.some(pattern => title.includes(pattern.toLowerCase()));
          
          return !isMock;
        });
        
        // Sort by publish date (most recent first) and limit
        const sortedArticles = filteredArticles.sort((a, b) => {
          const dateA = new Date(a.publishDate || a.createdAt || 0);
          const dateB = new Date(b.publishDate || b.createdAt || 0);
          return dateB - dateA;
        });
        
        this.cache.articles = sortedArticles;
        this.cache.lastFetch = Date.now();
        return sortedArticles.slice(0, limit);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    }

    // Return empty array if API fails (no fallback mock data)
    return [];
  }

  // Format budget to readable format
  formatBudget(amount) {
    // Handle null, undefined, or NaN values
    if (!amount || isNaN(amount)) {
      return '₱0';
    }
    
    const numAmount = parseFloat(amount);
    if (numAmount >= 1000000) {
      return `₱${(numAmount / 1000000).toFixed(1)}M`;
    } else if (numAmount >= 1000) {
      return `₱${(numAmount / 1000).toFixed(0)}K`;
    }
    return `₱${numAmount.toLocaleString()}`;
  }

  // Format date to readable format
  formatDate(dateString) {
    // Handle null, undefined, or invalid dates
    if (!dateString) {
      return 'N/A';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get status color class
  getStatusColor(status) {
    const colors = {
      'pending': 'bg-yellow-200 text-yellow-800',
      'ongoing': 'bg-blue-200 text-blue-800',
      'delayed': 'bg-red-200 text-red-800',
      'completed': 'bg-green-200 text-green-800',
      'on hold': 'bg-gray-200 text-gray-800',
      'cancelled': 'bg-gray-200 text-gray-800',
      // Legacy support for old status formats
      'Planning': 'bg-yellow-200 text-yellow-800',
      'Ongoing': 'bg-blue-200 text-blue-800',
      'Delayed': 'bg-red-200 text-red-800',
      'Completed': 'bg-green-200 text-green-800',
      'On Hold': 'bg-gray-200 text-gray-800',
      'Cancelled': 'bg-gray-200 text-gray-800'
    };
    return colors[status?.toLowerCase()] || colors[status] || 'bg-gray-200 text-gray-800';
  }

  // Get barangay status indicator
  getBarangayStatus(barangay) {
    if (barangay.ongoingProjects > 0) {
      return 'active';
    } else if (barangay.completedProjects > 0) {
      return 'completed';
    } else {
      return 'inactive';
    }
  }

  // Get barangay icon based on project count
  getBarangayIcon(barangay) {
    const totalProjects = barangay.totalProjects;
    if (totalProjects >= 5) return '🏢';
    if (totalProjects >= 3) return '🏘️';
    if (totalProjects >= 1) return '🏠';
    return '🏘️';
  }

  // Clear cache
  clearCache() {
    this.cache = {
      stats: null,
      projects: null,
      articles: null,
      barangayStats: null,
      lastFetch: null
    };
  }
}

// Create singleton instance
const homeService = new HomeService();

export default homeService; 
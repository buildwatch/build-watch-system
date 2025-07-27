const API_BASE_URL = 'http://localhost:3000/api';

class HomeService {
  constructor() {
    this.cache = {
      stats: null,
      projects: null,
      articles: null,
      lastFetch: null
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get home page statistics
  async getHomeStats() {
    try {
      // Check cache first
      if (this.cache.stats && this.cache.lastFetch && 
          (Date.now() - this.cache.lastFetch) < this.cacheTimeout) {
        return this.cache.stats;
      }

      const response = await fetch(`${API_BASE_URL}/home/stats`);
      
      if (response.ok) {
        const data = await response.json();
        this.cache.stats = data.stats || data; // Handle both formats
        this.cache.lastFetch = Date.now();
        return this.cache.stats;
      }
    } catch (error) {
      console.error('Error fetching home stats:', error);
    }

    // Return fallback data if API fails
    return {
      ongoingProjects: 32,
      totalBudget: 120000000,
      completedProjects: 18,
      totalProjects: 50,
      activeUsers: 150,
      departments: 8
    };
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
      const response = await fetch(`${API_BASE_URL}/home/featured-projects?limit=${limit}&_t=${timestamp}`);
      
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
  async getArticles(limit = 4) {
    try {
      // Check cache first
      if (this.cache.articles && this.cache.lastFetch && 
          (Date.now() - this.cache.lastFetch) < this.cacheTimeout) {
        return this.cache.articles.slice(0, limit);
      }

      const response = await fetch(`${API_BASE_URL}/articles?limit=${limit}`);
      
      if (response.ok) {
        const data = await response.json();
        this.cache.articles = data.articles || [];
        this.cache.lastFetch = Date.now();
        return this.cache.articles;
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    }

    // Return fallback data if API fails
    return [
      {
        id: '1',
        title: 'Santa Cruz LGU Launches Build Watch Platform',
        summary: 'The local government unit of Santa Cruz, Laguna has officially launched the Build Watch platform to promote transparency in infrastructure projects.',
        publishDate: '2024-07-01',
        author: 'LGU Communications Office',
        imageUrl: '/slide-1.png'
      },
      {
        id: '2',
        title: 'Major Road Project Reaches 65% Completion',
        summary: 'The rehabilitation of the main thoroughfare in Poblacion I is progressing well with 65% of the work completed ahead of schedule.',
        publishDate: '2024-07-05',
        author: 'Engineering Department',
        imageUrl: '/slide-2.png'
      },
      {
        id: '3',
        title: 'Public Market Renovation Project Approved',
        summary: 'The municipal council has approved the renovation project for the public market, expected to improve facilities for vendors and customers.',
        publishDate: '2024-07-10',
        author: 'Municipal Planning Office',
        imageUrl: '/slide-3.png'
      },
      {
        id: '4',
        title: 'New School Building to Serve 500 Students',
        summary: 'Construction of a new school building in Barangay Gatid is underway, which will accommodate 500 students when completed.',
        publishDate: '2024-07-15',
        author: 'Education Department',
        imageUrl: '/slide-4.png'
      }
    ];
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
      'Planning': 'bg-blue-200 text-blue-800',
      'Ongoing': 'bg-yellow-200 text-yellow-800',
      'Completed': 'bg-green-200 text-green-800',
      'On Hold': 'bg-red-200 text-red-800',
      'Cancelled': 'bg-gray-200 text-gray-800'
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  }

  // Clear cache
  clearCache() {
    this.cache = {
      stats: null,
      projects: null,
      articles: null,
      lastFetch: null
    };
  }
}

// Create singleton instance
const homeService = new HomeService();

export default homeService; 
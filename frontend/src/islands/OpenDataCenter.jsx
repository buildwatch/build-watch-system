import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

// Helper functions from ProjectsIsland
const getProgressColor = (progress) => {
  if (progress >= 0 && progress <= 25) return '#EF4444'; // red
  if (progress >= 26 && progress <= 50) return '#F59E0B'; // yellow
  if (progress >= 51 && progress <= 75) return '#3B82F6'; // blue
  if (progress >= 76 && progress <= 100) return '#10B981'; // green
  return '#6B7280'; // gray fallback
};

const getProjectImage = (project) => {
  // Check if project has an initial photo
  if (project.initialPhoto && project.initialPhoto !== '' && project.initialPhoto !== 'None') {
    const backendUrl = API_URL.replace('/api', '');
    return project.initialPhoto.startsWith('http') ? project.initialPhoto : `${backendUrl}${project.initialPhoto}`;
  }
  
  // Array of construction and infrastructure images
  const constructionImages = [
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1577760258779-e787a1733016?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of healthcare and medical images
  const healthcareImages = [
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of education and school images
  const educationImages = [
    'https://images.unsplash.com/photo-1523050854058-8df90110c9d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1523240794102-9ebd0c1c6d8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of road and transportation images
  const roadImages = [
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of social services and community images
  const socialImages = [
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Determine which image array to use based on project name, category, and description
  let imageArray = constructionImages; // Default to construction
  
  const projectText = `${project.name || ''} ${project.category || ''} ${project.description || ''}`.toLowerCase();
  
  if (projectText.includes('health') || projectText.includes('medical') || projectText.includes('hospital') || projectText.includes('clinic')) {
    imageArray = healthcareImages;
  } else if (projectText.includes('school') || projectText.includes('education') || projectText.includes('learning') || projectText.includes('academic')) {
    imageArray = educationImages;
  } else if (projectText.includes('road') || projectText.includes('highway') || projectText.includes('bridge') || projectText.includes('transport')) {
    imageArray = roadImages;
  } else if (projectText.includes('social') || projectText.includes('community') || projectText.includes('welfare') || projectText.includes('assistance')) {
    imageArray = socialImages;
  }
  
  // Use project ID to consistently select an image from the array
  const projectId = project.id || project.name || 'default';
  const hash = projectId.toString().split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const imageIndex = Math.abs(hash) % imageArray.length;
  
  return imageArray[imageIndex];
};


export default function OpenDataCenter() {
  const [activeTab, setActiveTab] = useState('statistics');
  const [statistics, setStatistics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Remove all search highlights (defined early for use in useEffects)
  const removeAllHighlights = () => {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.search-highlight').forEach(el => {
        const parent = el.parentNode;
        if (parent && parent.nodeType === Node.ELEMENT_NODE) {
          const textNode = document.createTextNode(el.textContent);
          parent.replaceChild(textNode, el);
          parent.normalize();
        }
      });
    }
  };

  // Load statistics and remove any existing highlights
  useEffect(() => {
    loadStatistics();
    // Remove any existing highlights on mount
    removeAllHighlights();
  }, []);

  // Load insights when insights tab is active
  useEffect(() => {
    if (activeTab === 'insights' && !insights) {
      loadInsights();
    }
  }, [activeTab]);

  // Load budget when budget tab is active
  useEffect(() => {
    if (activeTab === 'budget' && !budget) {
      loadBudget();
    }
  }, [activeTab]);

  // Smart search function
  const performSmartSearch = (term) => {
    if (!term || term.length < 2) {
      setSearchResults(null);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const results = {
      statistics: [],
      categories: [],
      insights: [],
      budget: [],
      reports: []
    };

    // Search in statistics
    if (statistics) {
      if (statistics.totalProjects?.toString().includes(lowerTerm)) {
        results.statistics.push('Total Projects');
      }
      if (statistics.overallCompletionRate?.toString().includes(lowerTerm)) {
        results.statistics.push('Completion Rate');
      }
      if (statistics.totalBudget?.toString().includes(lowerTerm)) {
        results.statistics.push('Total Budget');
      }
      
      // Search by category
      if (statistics.byCategory) {
        Object.keys(statistics.byCategory).forEach(category => {
          if (category.toLowerCase().includes(lowerTerm)) {
            results.categories.push(category);
          }
        });
      }
      
      // Search by status
      if (statistics.byStatus) {
        Object.keys(statistics.byStatus).forEach(status => {
          if (status.toLowerCase().includes(lowerTerm)) {
            results.statistics.push(`Status: ${status}`);
          }
        });
      }
    }

    // Search in insights
    if (insights) {
      if (insights.performanceMetrics) {
        const metrics = insights.performanceMetrics;
        if (metrics.totalProjects?.toString().includes(lowerTerm) ||
            metrics.completionRate?.toString().includes(lowerTerm) ||
            metrics.averageProgress?.toString().includes(lowerTerm)) {
          results.insights.push('Performance Metrics');
        }
      }
      
      // Search trends
      if (insights.trendsByMonth) {
        insights.trendsByMonth.forEach(trend => {
          if (trend.month?.toLowerCase().includes(lowerTerm)) {
            results.insights.push(`Trend: ${trend.month}`);
          }
        });
      }
    }

    // Search in budget
    if (budget) {
      if (budget.totalBudget?.toString().includes(lowerTerm) ||
          budget.totalUtilized?.toString().includes(lowerTerm) ||
          budget.utilizationRate?.toString().includes(lowerTerm)) {
        results.budget.push('Budget Overview');
      }
      
      // Search by category
      if (budget.budgetByCategory) {
        Object.keys(budget.budgetByCategory).forEach(category => {
          if (category.toLowerCase().includes(lowerTerm)) {
            results.budget.push(`Category: ${category}`);
          }
        });
      }
      
      // Search by funding source
      if (budget.budgetByFundingSource) {
        Object.keys(budget.budgetByFundingSource).forEach(source => {
          const sourceName = source === 'donor_fund' ? 'Municipal Development Fund' : source.replace('_', ' ').toUpperCase();
          if (sourceName.toLowerCase().includes(lowerTerm) || source.toLowerCase().includes(lowerTerm)) {
            results.budget.push(`Funding: ${sourceName}`);
          }
        });
      }
    }

    // Smart category matching
    const categoryKeywords = {
      'infrastructure': ['infrastructure', 'road', 'building', 'construction', 'facility'],
      'healthcare': ['health', 'medical', 'hospital', 'clinic', 'healthcare'],
      'education': ['education', 'school', 'learning', 'academic'],
      'social': ['social', '4ps', 'pension', 'community', 'welfare'],
      'environment': ['environment', 'green', 'eco', 'sustainability'],
      'budget': ['budget', 'financial', 'funding', 'money', 'finance'],
      'statistics': ['statistics', 'stats', 'data', 'analytics', 'metrics', 'project data', 'dataset', 'datasets'],
      'trends': ['trend', 'trends', 'insight', 'analysis', 'performance'],
      'reports': ['report', 'reports', 'download', 'export', 'data'],
      'projects': ['project', 'projects', 'program', 'programs', 'initiative', 'initiatives']
    };
    
    // Special handling for "project data" search
    if (lowerTerm.includes('project') && lowerTerm.includes('data')) {
      results.statistics.push('Project Statistics');
      results.insights.push('Project Insights');
      results.reports.push('Project Reports');
    } else if (lowerTerm.includes('project')) {
      // Search for "project" keyword
      if (statistics) {
        results.statistics.push('Total Projects');
        if (statistics.byCategory) {
          Object.keys(statistics.byCategory).forEach(category => {
            results.categories.push(category);
          });
        }
      }
      if (insights) {
        results.insights.push('Project Trends');
        results.insights.push('Project Performance');
      }
    } else if (lowerTerm.includes('data')) {
      // Search for "data" keyword
      results.statistics.push('Statistics Data');
      results.insights.push('Analytics Data');
      results.reports.push('Data Downloads');
      results.budget.push('Financial Data');
    }

    Object.keys(categoryKeywords).forEach(category => {
      if (categoryKeywords[category].some(keyword => lowerTerm.includes(keyword))) {
        if (category === 'infrastructure' || category === 'healthcare' || category === 'education' || category === 'social' || category === 'environment') {
          results.categories.push(category);
        } else if (category === 'budget') {
          results.budget.push('Budget Data');
        } else if (category === 'statistics') {
          results.statistics.push('Statistics');
        } else if (category === 'trends') {
          results.insights.push('Trends');
        } else if (category === 'reports') {
          results.reports.push('Reports');
        }
      }
    });

    // Determine best matching tab
    const tabScores = {
      statistics: results.statistics.length,
      categories: results.categories.length,
      insights: results.insights.length,
      budget: results.budget.length,
      reports: results.reports.length
    };

    const bestTab = Object.keys(tabScores).reduce((a, b) => tabScores[a] > tabScores[b] ? a : b);
    
    if (tabScores[bestTab] > 0) {
      setActiveTab(bestTab);
    }

    setSearchResults(results);
  };

  // Connect to external search input
  useEffect(() => {
    const searchInput = document.getElementById('data-search');
    if (searchInput) {
      const handleSearch = (e) => {
        const value = e.target.value.trim();
        setSearchTerm(value);
        if (value.length >= 2) {
          performSmartSearch(value);
        } else {
          setSearchResults(null);
        }
      };
      
      const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const value = searchInput.value.trim();
          setSearchTerm(value);
          if (value.length >= 2) {
            performSmartSearch(value);
          } else {
            setSearchResults(null);
          }
        }
      };
      
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('keypress', handleKeyPress);
      
      return () => {
        searchInput.removeEventListener('input', handleSearch);
        searchInput.removeEventListener('keypress', handleKeyPress);
      };
    }
  }, []);

  // Re-run search when data changes
  useEffect(() => {
    if (searchTerm) {
      performSmartSearch(searchTerm);
    }
  }, [statistics, insights, budget]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/projects/public/statistics`);
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await axios.get(`${API_URL}/projects/public/insights`);
      if (response.data.success) {
        setInsights(response.data.insights);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const loadBudget = async () => {
    try {
      setLoadingBudget(true);
      const response = await axios.get(`${API_URL}/projects/public/budget`);
      if (response.data.success) {
        setBudget(response.data.budget);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
    } finally {
      setLoadingBudget(false);
    }
  };


  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Safely format progress percentage
  const formatProgress = (progress) => {
    if (typeof progress === 'number' && !isNaN(progress)) {
      return progress.toFixed(1);
    }
    const parsed = parseFloat(progress || 0);
    return isNaN(parsed) ? '0.0' : parsed.toFixed(1);
  };

  // Safely get progress as number
  const getProgressNumber = (progress) => {
    if (typeof progress === 'number' && !isNaN(progress)) {
      return progress;
    }
    const parsed = parseFloat(progress || 0);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Chart data preparation
  const getCategoryChartData = () => {
    if (!statistics?.byCategory) return null;
    
    const categories = Object.keys(statistics.byCategory);
    const counts = Object.values(statistics.byCategory);
    
    return {
      labels: categories,
      datasets: [{
        label: 'Projects',
        data: counts,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(99, 102, 241, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(99, 102, 241, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  const getStatusChartData = () => {
    if (!statistics?.statusCounts) return null;
    
    const statuses = ['Ongoing', 'Completed', 'Delayed', 'On Hold'];
    const counts = [
      statistics.statusCounts.ongoing || 0,
      statistics.statusCounts.completed || 0,
      statistics.statusCounts.delayed || 0,
      statistics.statusCounts.onHold || 0
    ];
    
    return {
      labels: statuses,
      datasets: [{
        label: 'Projects',
        data: counts,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#1e40af'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(30, 64, 175, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8
      }
    }
  };

  // Get unique categories from statistics
  const getCategories = () => {
    if (!statistics?.byCategory) return [];
    return Object.keys(statistics.byCategory).sort();
  };

  // Download report function
  const downloadReport = async (type, format) => {
    try {
      if (type === 'projects') {
        // Download projects as CSV
        const response = await axios.get(`${API_URL}/projects/public`, { params: { limit: 1000 } });
        if (response.data.success) {
          const projects = response.data.projects;
          const csv = convertToCSV(projects);
          downloadFile(csv, `projects-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        }
      } else if (type === 'statistics') {
        // Download statistics as JSON
        const response = await axios.get(`${API_URL}/projects/public/statistics`);
        if (response.data.success) {
          const json = JSON.stringify(response.data.statistics, null, 2);
          downloadFile(json, `statistics-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        }
      } else if (type === 'quarterly') {
        // Show message for PDF (would need backend endpoint)
        alert('Quarterly PDF reports are generated monthly. Please check back later or contact us for access.');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again later.');
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = ['Name', 'Code', 'Category', 'Location', 'Status', 'Progress', 'Budget', 'Start Date', 'End Date'];
    const rows = data.map(project => [
      project.name || '',
      project.projectCode || '',
      project.category || '',
      project.location || '',
      project.status || '',
      `${formatProgress(project.overallProgress)}%`,
      project.totalBudget || 0,
      project.startDate || '',
      project.endDate || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Highlight search term in the current tab content (disabled - kept for potential future use)
  const highlightSearchTerm = (term) => {
    if (!term || term.length < 2) {
      removeAllHighlights();
      return;
    }
    
    // Remove existing highlights first
    removeAllHighlights();
    
    const lowerTerm = term.toLowerCase();
    const container = document.querySelector('.w-full.max-w-7xl');
    if (!container) return;
    
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if node is inside a search highlight or input/button
          let parent = node.parentNode;
          while (parent && parent !== container) {
            if (parent.classList?.contains('search-highlight') || 
                parent.tagName === 'INPUT' || 
                parent.tagName === 'BUTTON' ||
                parent.tagName === 'SCRIPT' ||
                parent.tagName === 'STYLE') {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentNode;
          }
          return node.textContent.toLowerCase().includes(lowerTerm) 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Process text nodes in reverse to maintain DOM integrity
    textNodes.reverse().forEach(textNode => {
      const parent = textNode.parentNode;
      if (!parent || parent.classList?.contains('search-highlight')) return;
      
      const text = textNode.textContent;
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const highlightedText = text.replace(regex, '<mark class="search-highlight bg-yellow-300 text-blue-900 font-semibold px-1 rounded">$1</mark>');
      
      if (highlightedText !== text) {
        const wrapper = document.createElement('span');
        wrapper.innerHTML = highlightedText;
        parent.replaceChild(wrapper, textNode);
      }
    });
    
    // Scroll to first highlight
    const firstHighlight = document.querySelector('.search-highlight');
    if (firstHighlight) {
      setTimeout(() => {
        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a pulse animation
        firstHighlight.style.animation = 'pulse 2s ease-in-out';
        setTimeout(() => {
          firstHighlight.style.animation = '';
        }, 2000);
      }, 100);
    }
  };

  // Remove highlights when tab changes or search is cleared (highlighting disabled)
  useEffect(() => {
    // Always remove highlights - highlighting feature is disabled
    removeAllHighlights();
  }, [activeTab, searchTerm]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            background-color: #FEF08A;
          }
          50% {
            background-color: #FDE047;
          }
        }
        .search-highlight {
          animation: pulse 2s ease-in-out;
        }
      `}</style>
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Search Results Indicator */}
      {searchTerm && searchResults && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <span className="text-blue-900 font-black text-lg">
                  Found {Object.values(searchResults).flat().length} result{Object.values(searchResults).flat().length !== 1 ? 's' : ''} for "{searchTerm}"
                </span>
                <p className="text-blue-700 text-sm mt-1">Click on a result below to view it</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchResults(null);
                const searchInput = document.getElementById('data-search');
                if (searchInput) searchInput.value = '';
                // Remove all highlights
                removeAllHighlights();
              }}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg p-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Results Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {searchResults.statistics.length > 0 && (
              <button
                onClick={() => {
                  setActiveTab('statistics');
                }}
                className="bg-white border-2 border-blue-300 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-900 font-bold text-sm">Statistics</p>
                    <p className="text-blue-700 text-xs mt-1">{searchResults.statistics.length} match{searchResults.statistics.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}
            
            {searchResults.categories.length > 0 && (
              <button
                onClick={() => {
                  setActiveTab('categories');
                }}
                className="bg-white border-2 border-blue-300 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-900 font-bold text-sm">Categories</p>
                    <p className="text-blue-700 text-xs mt-1">{searchResults.categories.length} match{searchResults.categories.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}
            
            {searchResults.insights.length > 0 && (
              <button
                onClick={() => {
                  setActiveTab('insights');
                }}
                className="bg-white border-2 border-blue-300 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-900 font-bold text-sm">Insights & Trends</p>
                    <p className="text-blue-700 text-xs mt-1">{searchResults.insights.length} match{searchResults.insights.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}
            
            {searchResults.budget.length > 0 && (
              <button
                onClick={() => {
                  setActiveTab('budget');
                }}
                className="bg-white border-2 border-blue-300 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-900 font-bold text-sm">Budget & Finance</p>
                    <p className="text-blue-700 text-xs mt-1">{searchResults.budget.length} match{searchResults.budget.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}
            
            {searchResults.reports.length > 0 && (
              <button
                onClick={() => {
                  setActiveTab('reports');
                }}
                className="bg-white border-2 border-blue-300 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-900 font-bold text-sm">Reports</p>
                    <p className="text-blue-700 text-xs mt-1">{searchResults.reports.length} match{searchResults.reports.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-4 mb-8 border-b-2 border-blue-200">
        <button
          onClick={() => setActiveTab('statistics')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'statistics'
              ? 'text-blue-700 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Statistics Dashboard
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'categories'
              ? 'text-blue-700 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Browse by Category
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'insights'
              ? 'text-blue-700 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Data Insights & Trends
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'budget'
              ? 'text-blue-700 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Budget & Financial Transparency
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'reports'
              ? 'text-blue-700 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Reports & Downloads
        </button>
      </div>

      {/* Statistics Dashboard Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-blue-600 font-medium">Loading statistics...</p>
            </div>
          ) : statistics ? (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold opacity-90">Total Projects</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-4xl font-black">{statistics.totalProjects}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold opacity-90">Completion Rate</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-black">{statistics.overallCompletionRate.toFixed(1)}%</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold opacity-90">Total Budget</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-2xl font-black">{formatCurrency(statistics.totalBudget)}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold opacity-90">Completed</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-black">{statistics.statusCounts?.completed || 0}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Projects by Category */}
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                  <h3 className="text-xl font-black text-blue-800 mb-6">Projects by Category</h3>
                  {getCategoryChartData() && (
                    <div style={{ height: '400px', position: 'relative' }}>
                      <Bar 
                        data={getCategoryChartData()} 
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }} 
                      />
                    </div>
                  )}
                </div>

                {/* Projects by Status */}
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                  <h3 className="text-xl font-black text-blue-800 mb-6">Projects by Status</h3>
                  {getStatusChartData() && (
                    <div style={{ height: '400px', position: 'relative' }}>
                      <Pie 
                        data={getStatusChartData()} 
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No statistics available</p>
            </div>
          )}
        </div>
      )}

      {/* Category Browsing Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-blue-600 font-medium">Loading categories...</p>
            </div>
          ) : statistics?.byCategory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(statistics.byCategory).map(([category, count]) => (
                <div
                  key={category}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-xl border-2 border-blue-200 cursor-pointer hover:shadow-2xl hover:border-blue-400 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-blue-800">{category}</h3>
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-blue-600 mb-2">{count}</p>
                  <p className="text-sm text-blue-700 font-medium">Projects</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories available</p>
            </div>
          )}
        </div>
      )}

      {/* Data Insights & Trends Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-8">
          {loadingInsights ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-blue-600 font-medium">Loading insights...</p>
            </div>
          ) : insights ? (
            <>
              {/* Performance Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-blue-800">Total Projects</h3>
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-blue-600">{insights.performanceMetrics.totalProjects}</p>
                  <p className="text-sm text-blue-700 font-medium mt-2">Active Projects</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-xl border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-green-800">Completion Rate</h3>
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-green-600">{formatProgress(insights.performanceMetrics.completionRate)}%</p>
                  <p className="text-sm text-green-700 font-medium mt-2">{insights.performanceMetrics.completedProjects} Completed</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-purple-800">Average Progress</h3>
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-purple-600">{formatProgress(insights.performanceMetrics.averageProgress)}%</p>
                  <p className="text-sm text-purple-700 font-medium mt-2">Overall Average</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-xl border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-orange-800">Avg Duration</h3>
                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-orange-600">{insights.performanceMetrics.averageDuration}</p>
                  <p className="text-sm text-orange-700 font-medium mt-2">Days</p>
                </div>
              </div>

              {/* Trends Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Trends Over Time */}
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                  <h3 className="text-xl font-black text-blue-800 mb-6">Project Trends Over Time</h3>
                  {insights.trendsByMonth && insights.trendsByMonth.length > 0 ? (
                    <div style={{ height: '400px', position: 'relative' }}>
                      <Line
                        data={{
                          labels: insights.trendsByMonth.map(t => {
                            const [year, month] = t.month.split('-');
                            return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          }),
                          datasets: [
                            {
                              label: 'Projects Started',
                              data: insights.trendsByMonth.map(t => t.projectsStarted),
                              borderColor: '#3B82F6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              tension: 0.4,
                              fill: true
                            },
                            {
                              label: 'Average Progress %',
                              data: insights.trendsByMonth.map(t => t.averageProgress),
                              borderColor: '#10B981',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              tension: 0.4,
                              fill: true,
                              yAxisID: 'y1'
                            }
                          ]
                        }}
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: { display: true, text: 'Projects Started' }
                            },
                            y1: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              title: { display: true, text: 'Progress %' },
                              grid: { drawOnChartArea: false }
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No trend data available</p>
                  )}
                </div>

                {/* Completion Trends */}
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                  <h3 className="text-xl font-black text-blue-800 mb-6">Project Completion Trends</h3>
                  {insights.completionTrends && insights.completionTrends.length > 0 ? (
                    <div style={{ height: '400px', position: 'relative' }}>
                      <Line
                        data={{
                          labels: insights.completionTrends.map(t => {
                            const [year, month] = t.month.split('-');
                            return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          }),
                          datasets: [
                            {
                              label: 'Projects Completed',
                              data: insights.completionTrends.map(t => t.completed),
                              borderColor: '#10B981',
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                              tension: 0.4,
                              fill: true
                            }
                          ]
                        }}
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No completion data available</p>
                  )}
                </div>
              </div>

              {/* Efficiency Metrics */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                <h3 className="text-xl font-black text-blue-800 mb-6">Efficiency Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 font-medium mb-2">Total Budget</p>
                    <p className="text-2xl font-black text-blue-800">{formatCurrency(insights.efficiencyMetrics.totalBudget)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-sm text-green-700 font-medium mb-2">Budget Utilized</p>
                    <p className="text-2xl font-black text-green-800">{formatCurrency(insights.efficiencyMetrics.budgetUtilized)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium mb-2">Utilization Rate</p>
                    <p className="text-2xl font-black text-purple-800">{formatProgress(insights.efficiencyMetrics.budgetUtilizationRate)}%</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No insights data available</p>
            </div>
          )}
        </div>
      )}

      {/* Budget & Financial Transparency Tab */}
      {activeTab === 'budget' && (
        <div className="space-y-8">
          {loadingBudget ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-blue-600 font-medium">Loading budget data...</p>
            </div>
          ) : budget ? (
            <>
              {/* Budget Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-blue-800">Total Budget</h3>
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-blue-600">{formatCurrency(budget.totalBudget)}</p>
                  <p className="text-sm text-blue-700 font-medium mt-2">Allocated</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-xl border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-green-800">Budget Utilized</h3>
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-green-600">{formatCurrency(budget.totalUtilized)}</p>
                  <p className="text-sm text-green-700 font-medium mt-2">Spent</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-xl border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-orange-800">Remaining</h3>
                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-orange-600">{formatCurrency(budget.totalRemaining)}</p>
                  <p className="text-sm text-orange-700 font-medium mt-2">Available</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-purple-800">Utilization Rate</h3>
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-purple-600">{formatProgress(budget.utilizationRate)}%</p>
                  <p className="text-sm text-purple-700 font-medium mt-2">Efficiency</p>
                </div>
              </div>

              {/* Budget Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget by Category */}
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                  <h3 className="text-xl font-black text-blue-800 mb-6">Budget by Category</h3>
                  {budget.budgetByCategory && Object.keys(budget.budgetByCategory).length > 0 ? (
                    <div style={{ height: '400px', position: 'relative' }}>
                      <Pie
                        data={{
                          labels: Object.keys(budget.budgetByCategory),
                          datasets: [{
                            data: Object.values(budget.budgetByCategory),
                            backgroundColor: [
                              '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                              '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                          }]
                        }}
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No budget data available</p>
                  )}
                </div>

                {/* Budget by Funding Source */}
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                  <h3 className="text-xl font-black text-blue-800 mb-6">Budget by Funding Source</h3>
                  {budget.budgetByFundingSource && Object.keys(budget.budgetByFundingSource).length > 0 ? (
                    <div style={{ height: '400px', position: 'relative' }}>
                      <Bar
                        data={{
                          labels: Object.keys(budget.budgetByFundingSource).map(s => 
                            s === 'donor_fund' ? 'Municipal Development Fund' : s.replace('_', ' ').toUpperCase()
                          ),
                          datasets: [{
                            label: 'Budget Allocated',
                            data: Object.values(budget.budgetByFundingSource),
                            backgroundColor: '#3B82F6',
                            borderRadius: 8
                          }]
                        }}
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No funding source data available</p>
                  )}
                </div>
              </div>

              {/* Budget Efficiency Table */}
              {budget.budgetEfficiency && Object.keys(budget.budgetEfficiency).length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
                  <h3 className="text-xl font-black text-blue-800 mb-6">Budget Efficiency by Category</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-blue-200">
                          <th className="text-left py-3 px-4 font-black text-blue-800">Category</th>
                          <th className="text-right py-3 px-4 font-black text-blue-800">Allocated</th>
                          <th className="text-right py-3 px-4 font-black text-blue-800">Utilized</th>
                          <th className="text-right py-3 px-4 font-black text-blue-800">Remaining</th>
                          <th className="text-right py-3 px-4 font-black text-blue-800">Efficiency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(budget.budgetEfficiency).map(([category, data]) => (
                          <tr key={category} className="border-b border-gray-100 hover:bg-blue-50">
                            <td className="py-3 px-4 font-medium text-gray-800">{category}</td>
                            <td className="py-3 px-4 text-right font-semibold text-blue-600">{formatCurrency(data.allocated)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(data.utilized)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-orange-600">{formatCurrency(data.remaining)}</td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-bold ${
                                data.efficiency >= 80 ? 'text-green-600' :
                                data.efficiency >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {formatProgress(data.efficiency)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No budget data available</p>
            </div>
          )}
        </div>
      )}

      {/* Reports & Downloads Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
            <h2 className="text-2xl font-black text-blue-800 mb-2">Public Reports & Downloads</h2>
            <p className="text-gray-600">Download public data and reports in various formats</p>
          </div>

          {/* Available Formats */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
            <h3 className="text-xl font-black text-blue-800 mb-6 flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Available Formats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-bold text-blue-800">Excel (.xlsx)</span>
                </div>
                <p className="text-sm text-gray-600">For detailed analysis</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-bold text-blue-800">CSV (.csv)</span>
                </div>
                <p className="text-sm text-gray-600">For data processing</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-bold text-blue-800">PDF (.pdf)</span>
                </div>
                <p className="text-sm text-gray-600">For reports and presentations</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-bold text-blue-800">JSON (.json)</span>
                </div>
                <p className="text-sm text-gray-600">For developers and APIs</p>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
            <h3 className="text-xl font-black text-blue-800 mb-6 flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Public Data
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-blue-800 mb-1">Project List</h4>
                    <p className="text-sm text-gray-600">Complete list of approved public projects</p>
                  </div>
                  <button
                    onClick={() => downloadReport('projects', 'csv')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Download CSV
                  </button>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-blue-800 mb-1">Project Statistics</h4>
                    <p className="text-sm text-gray-600">Aggregated statistics and analytics</p>
                  </div>
                  <button
                    onClick={() => downloadReport('statistics', 'json')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Download JSON
                  </button>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-blue-800 mb-1">Quarterly Report</h4>
                    <p className="text-sm text-gray-600">Quarterly summary report (PDF)</p>
                  </div>
                  <button
                    onClick={() => downloadReport('quarterly', 'pdf')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Updates Info */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100">
            <h3 className="text-xl font-black text-blue-800 mb-6 flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Data Update Schedule
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="font-medium text-blue-800">Project data</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Updated weekly</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="font-medium text-blue-800">Financial reports</span>
                </div>
                <span className="text-sm text-blue-600 font-medium">Updated monthly</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  <span className="font-medium text-blue-800">Performance metrics</span>
                </div>
                <span className="text-sm text-purple-600 font-medium">Updated quarterly</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}


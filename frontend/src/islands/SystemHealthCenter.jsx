import { useState, useEffect, useRef } from 'react';

// Dynamically import Chart.js only on client side to avoid SSR issues
let Chart = null;
let ChartLoaded = false;

const loadChart = async () => {
  if (typeof window !== 'undefined' && !ChartLoaded) {
    try {
      const chartModule = await import('chart.js/auto');
      Chart = chartModule.default;
      ChartLoaded = true;
    } catch (error) {
      console.error('Error loading Chart.js:', error);
    }
  }
};

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

// Get token from cookies or localStorage
const getToken = () => {
  if (typeof window === 'undefined') return '';
  
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  return tokenCookie ? tokenCookie.split('=')[1] : '';
};

// Get current user role
const getCurrentUserRole = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.role || null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper function to get theme based on user role
const getThemeByRole = (role) => {
  const roleMap = {
    'SYS.AD': 'black',
    'LGU-IU': 'orange',
    'EIU': 'green',
    'MPMEC Secretariat': 'lightBlue',
    'MPMEC': 'blue',
    'Executive Viewer': 'darkBlue'
  };
  return roleMap[role] || 'blue';
};

// Theme colors - aligned with each user account
const themeColors = {
  black: {
    // System Admin - Black theme
    primary: 'bg-gray-900',
    primaryHover: 'hover:bg-black',
    primaryLight: 'bg-gray-100',
    primaryText: 'text-gray-900',
    gradient: 'from-black to-gray-800',
    gradientHover: 'hover:from-gray-900 hover:to-black',
    gradientText: 'from-black to-gray-600',
    gradientIcon: 'from-black to-gray-800',
    border: 'border-gray-300',
    borderHover: 'border-black/20'
  },
  orange: {
    // LGU-IU - Professional orange
    primary: 'bg-orange-600',
    primaryHover: 'hover:bg-orange-700',
    primaryLight: 'bg-orange-50',
    primaryText: 'text-orange-600',
    gradient: 'from-orange-600 to-orange-500',
    gradientHover: 'hover:from-orange-700 hover:to-orange-600',
    gradientText: 'from-orange-600 to-orange-500',
    gradientIcon: 'from-orange-600 to-orange-500',
    border: 'border-orange-200',
    borderHover: 'border-orange-600/20'
  },
  green: {
    // EIU - Professional green
    primary: 'bg-green-600',
    primaryHover: 'hover:bg-green-700',
    primaryLight: 'bg-green-50',
    primaryText: 'text-green-600',
    gradient: 'from-green-600 to-green-500',
    gradientHover: 'hover:from-green-700 hover:to-green-600',
    gradientText: 'from-green-600 to-green-500',
    gradientIcon: 'from-green-600 to-green-500',
    border: 'border-green-200',
    borderHover: 'border-green-600/20'
  },
  lightBlue: {
    // MPMEC Secretariat - Professional vibrant blue
    primary: 'bg-blue-500',
    primaryHover: 'hover:bg-blue-600',
    primaryLight: 'bg-blue-50',
    primaryText: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-400',
    gradientHover: 'hover:from-blue-600 hover:to-blue-500',
    gradientText: 'from-blue-500 to-blue-400',
    gradientIcon: 'from-blue-500 to-blue-400',
    border: 'border-blue-200',
    borderHover: 'border-blue-500/20'
  },
  blue: {
    // MPMEC - Professional Blue
    primary: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-700',
    primaryLight: 'bg-blue-50',
    primaryText: 'text-blue-600',
    gradient: 'from-blue-600 to-blue-500',
    gradientHover: 'hover:from-blue-700 hover:to-blue-600',
    gradientText: 'from-blue-600 to-blue-500',
    gradientIcon: 'from-blue-600 to-blue-500',
    border: 'border-blue-200',
    borderHover: 'border-blue-600/20'
  },
  darkBlue: {
    // Executive Viewer - Professional slightly dark blue
    primary: 'bg-blue-800',
    primaryHover: 'hover:bg-blue-900',
    primaryLight: 'bg-blue-50',
    primaryText: 'text-blue-800',
    gradient: 'from-blue-800 to-blue-700',
    gradientHover: 'hover:from-blue-900 hover:to-blue-800',
    gradientText: 'from-blue-800 to-blue-700',
    gradientIcon: 'from-blue-800 to-blue-700',
    border: 'border-blue-200',
    borderHover: 'border-blue-800/20'
  }
};

export default function SystemHealthCenter({ accountType = 'sysadmin' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [healthChecks, setHealthChecks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'analytics', 'activity', 'logs', 'database', 'security', 'optimization', 'actions', 'incidents', 'alerts-config', 'reports', 'trends', 'workflows', 'notifications'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('24h'); // '24h', '7d', '30d'
  const [userActivity, setUserActivity] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [databaseHealth, setDatabaseHealth] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [optimizationData, setOptimizationData] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [trendsData, setTrendsData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('cpu');
  const [baselinesData, setBaselinesData] = useState(null);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [notificationTemplates, setNotificationTemplates] = useState([]);
  const pollIntervalRef = useRef(null);
  
  // Additional chart refs
  const trendsChartRef = useRef(null);
  const trendsChartInstanceRef = useRef(null);
  
  // Chart refs
  const performanceChartRef = useRef(null);
  const performanceChartInstanceRef = useRef(null);
  
  const currentUserRole = getCurrentUserRole();
  const theme = getThemeByRole(currentUserRole);
  const colors = themeColors[theme] || themeColors.blue;

  // Fetch system metrics
  const fetchSystemMetrics = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/admin/system-health/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch system metrics');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSystemMetrics({
          overallStatus: data.metrics.overallStatus || 'Healthy',
          uptime: `${data.metrics.uptime || 0}%`,
          responseTime: `${data.metrics.responseTime || 0}ms`,
          activeUsers: data.metrics.activeUsers || 0,
          cpuUsage: data.metrics.cpuUsage || 0,
          memoryUsage: data.metrics.memoryUsage || 0,
          diskUsage: data.metrics.diskUsage || 0,
          networkLatency: data.metrics.networkLatency || 0
        });
        setAlerts(data.alerts || []);
      }
      
    } catch (err) {
      console.error('Error fetching system metrics:', err);
      if (!systemMetrics) {
        setError(err.message || 'Failed to load system metrics');
      }
    }
  };

  // Fetch health checks
  const fetchHealthChecks = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch health checks');
      }
      
      const data = await response.json();
      
      if (data.success && data.services) {
        // Format health checks for display
        const formattedChecks = data.services.map((service, index) => ({
          id: index + 1,
          component: service.name,
          status: service.status,
          details: service.message,
          duration: service.responseTime ? `${(service.responseTime / 1000).toFixed(1)}s` : null,
          time: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }));
        setHealthChecks(formattedChecks);
      }
      
    } catch (err) {
      console.error('Error fetching health checks:', err);
    }
  };

  // Fetch all system health data
  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchSystemMetrics(),
        fetchHealthChecks()
      ]);
      
    } catch (err) {
      console.error('Error fetching system health:', err);
      setError(err.message || 'Failed to load system health data');
    } finally {
      setLoading(false);
    }
  };

  // Run health check manually
  const runHealthCheck = async () => {
    try {
      setCheckingHealth(true);
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/admin/system-health/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to run health check');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh all data after health check
        await fetchSystemHealth();
      }
      
    } catch (err) {
      console.error('Error running health check:', err);
      setError(err.message || 'Failed to run health check');
    } finally {
      setCheckingHealth(false);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async (range = '24h') => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/analytics?range=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  // Fetch user activity
  const fetchUserActivity = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/user-activity?hours=24`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch user activity');
      const data = await response.json();
      if (data.success) {
        setUserActivity(data.activity);
      }
    } catch (err) {
      console.error('Error fetching user activity:', err);
    }
  };

  // Fetch system logs
  const fetchSystemLogs = async (page = 1, severity = '', search = '') => {
    try {
      setLogsLoading(true);
      const token = getToken();
      if (!token) return;

      let url = `${API_URL}/admin/system-health/logs?page=${page}&limit=50`;
      if (severity) url += `&severity=${severity}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      if (data.success) {
        setSystemLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch database health
  const fetchDatabaseHealth = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/database`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch database health');
      const data = await response.json();
      if (data.success) {
        setDatabaseHealth(data.database);
      }
    } catch (err) {
      console.error('Error fetching database health:', err);
    }
  };

  // Fetch security data
  const fetchSecurityData = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/security?hours=24`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch security data');
      const data = await response.json();
      if (data.success) {
        setSecurityData(data.security);
      }
    } catch (err) {
      console.error('Error fetching security data:', err);
    }
  };

  // Fetch optimization recommendations
  const fetchOptimizationData = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/optimization`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch optimization data');
      const data = await response.json();
      if (data.success) {
        setOptimizationData(data);
      }
    } catch (err) {
      console.error('Error fetching optimization data:', err);
    }
  };

  // Fetch maintenance mode status
  const fetchMaintenanceMode = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/actions/maintenance-mode`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch maintenance mode status');
      const data = await response.json();
      if (data.success) {
        setMaintenanceMode(data.maintenanceMode || false);
      }
    } catch (err) {
      console.error('Error fetching maintenance mode:', err);
    }
  };

  // System actions
  const handleClearCache = async () => {
    try {
      setActionLoading({ ...actionLoading, clearCache: true });
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_URL}/admin/system-health/actions/clear-cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to clear cache');
      const data = await response.json();
      
      if (data.success) {
        alert('Cache cleared successfully!');
        // Refresh metrics
        await fetchSystemMetrics();
      }
    } catch (err) {
      console.error('Error clearing cache:', err);
      alert('Failed to clear cache: ' + err.message);
    } finally {
      setActionLoading({ ...actionLoading, clearCache: false });
    }
  };

  const handleToggleMaintenanceMode = async () => {
    try {
      setActionLoading({ ...actionLoading, maintenanceMode: true });
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const newMode = !maintenanceMode;
      const response = await fetch(`${API_URL}/admin/system-health/actions/maintenance-mode`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: newMode })
      });

      if (!response.ok) throw new Error('Failed to toggle maintenance mode');
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceMode(newMode);
        alert(`Maintenance mode ${newMode ? 'enabled' : 'disabled'} successfully!`);
      }
    } catch (err) {
      console.error('Error toggling maintenance mode:', err);
      alert('Failed to toggle maintenance mode: ' + err.message);
    } finally {
      setActionLoading({ ...actionLoading, maintenanceMode: false });
    }
  };

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      setIncidentsLoading(true);
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/incidents?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch incidents');
      const data = await response.json();
      if (data.success) {
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setIncidentsLoading(false);
    }
  };

  // Fetch alert configuration
  const fetchAlertConfig = async () => {
    try {
      setConfigLoading(true);
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/alerts/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch alert configuration');
      const data = await response.json();
      if (data.success) {
        setAlertConfig(data.config);
      }
    } catch (err) {
      console.error('Error fetching alert config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  // Handle export report
  const handleExportReport = async (format = 'json', range = '24h') => {
    try {
      setExportLoading(true);
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_URL}/admin/system-health/export?format=${format}&range=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to export report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-health-report-${Date.now()}.${format === 'csv' ? 'csv' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Fetch trends data
  const fetchTrends = async (metric = 'cpu', days = 7) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/trends?metric=${metric}&days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch trends');
      const data = await response.json();
      if (data.success) {
        setTrendsData(data.trends);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
    }
  };

  // Fetch baselines
  const fetchBaselines = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/baselines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch baselines');
      const data = await response.json();
      if (data.success) {
        setBaselinesData(data.baselines);
      }
    } catch (err) {
      console.error('Error fetching baselines:', err);
    }
  };

  // Fetch scheduled tasks
  const fetchScheduledTasks = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/scheduled-tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch scheduled tasks');
      const data = await response.json();
      if (data.success) {
        setScheduledTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching scheduled tasks:', err);
    }
  };

  // Fetch notification templates
  const fetchNotificationTemplates = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/system-health/notifications/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch notification templates');
      const data = await response.json();
      if (data.success) {
        setNotificationTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching notification templates:', err);
    }
  };

  // Load Chart.js and render performance chart
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsData && performanceChartRef.current) {
      const renderChart = async () => {
        await loadChart();
        if (!Chart) return;

        // Destroy existing chart if it exists
        if (performanceChartInstanceRef.current) {
          performanceChartInstanceRef.current.destroy();
        }

        const ctx = performanceChartRef.current.getContext('2d');
        performanceChartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: analyticsData.labels || [],
            datasets: [{
              label: 'System Activity',
              data: analyticsData.data || [],
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      };

      setTimeout(renderChart, 100);
    }

    return () => {
      if (performanceChartInstanceRef.current) {
        performanceChartInstanceRef.current.destroy();
        performanceChartInstanceRef.current = null;
      }
    };
  }, [activeTab, analyticsData]);

  // Load Chart.js and render trends chart
  useEffect(() => {
    if (activeTab === 'trends' && trendsData && trendsChartRef.current) {
      const renderChart = async () => {
        await loadChart();
        if (!Chart) return;

        // Destroy existing chart if it exists
        if (trendsChartInstanceRef.current) {
          trendsChartInstanceRef.current.destroy();
        }

        const ctx = trendsChartRef.current.getContext('2d');
        trendsChartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: trendsData.dataPoints.map(d => {
              const date = new Date(d.date);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
              label: `${selectedMetric.toUpperCase()} Usage`,
              data: trendsData.dataPoints.map(d => d.value),
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      };

      setTimeout(renderChart, 100);
    }

    return () => {
      if (trendsChartInstanceRef.current) {
        trendsChartInstanceRef.current.destroy();
        trendsChartInstanceRef.current = null;
      }
    };
  }, [activeTab, trendsData, selectedMetric]);

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics(analyticsRange);
    } else if (activeTab === 'activity') {
      fetchUserActivity();
    } else if (activeTab === 'logs') {
      fetchSystemLogs();
    } else if (activeTab === 'database') {
      fetchDatabaseHealth();
    } else if (activeTab === 'security') {
      fetchSecurityData();
    } else if (activeTab === 'optimization') {
      fetchOptimizationData();
    } else if (activeTab === 'actions') {
      fetchMaintenanceMode();
    } else if (activeTab === 'incidents') {
      fetchIncidents();
    } else if (activeTab === 'alerts-config') {
      fetchAlertConfig();
    } else if (activeTab === 'trends') {
      fetchTrends(selectedMetric, 7);
      fetchBaselines();
    } else if (activeTab === 'workflows') {
      fetchScheduledTasks();
    } else if (activeTab === 'notifications') {
      fetchNotificationTemplates();
    }
  }, [activeTab, analyticsRange, selectedMetric]);

  // Set up polling for real-time updates (every 30 seconds)
  useEffect(() => {
    fetchSystemHealth();

    // Set up polling interval
    pollIntervalRef.current = setInterval(() => {
      if (activeTab === 'overview') {
        fetchSystemMetrics();
        fetchHealthChecks();
      }
    }, 30000); // Update every 30 seconds

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeTab]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return 'bg-green-100 text-green-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
      case 'critical':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Get alert type class
  const getAlertTypeClass = (type) => {
    switch (type?.toLowerCase()) {
      case 'error':
      case 'critical':
        return 'bg-red-50 border-red-400';
      case 'warning':
        return 'bg-yellow-50 border-yellow-400';
      case 'info':
        return 'bg-blue-50 border-blue-400';
      default:
        return 'bg-gray-50 border-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchSystemHealth}
            className={`px-6 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header - Matching AnnouncementCenter style, flushed to top bar */}
      <div className={`bg-white border-b ${colors.border} px-8 py-6 mb-0 -mx-8 -mt-8`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br ${colors.gradientIcon} shadow-xl hover:scale-110 hover:rotate-3 relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <div>
                <h1 className={`text-3xl font-bold bg-gradient-to-r ${colors.gradientText} bg-clip-text text-transparent`}>System Health</h1>
                <p className="text-sm text-gray-600">
                  Monitor system performance and health status
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {systemMetrics && (
              <div className="text-right">
                <p className="text-sm text-gray-600">System Status</p>
                <p className={`text-xs ${colors.primaryText} font-semibold`}>{systemMetrics.overallStatus || 'Unknown'}</p>
              </div>
            )}
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-8 py-8 bg-white min-h-screen">
        <div className="space-y-8">
          {/* Action Buttons Section - Matching AnnouncementCenter style */}
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <button 
              onClick={runHealthCheck}
              disabled={checkingHealth}
              className={`bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${theme === 'black' ? 'hover:shadow-black/25' : 'hover:shadow-gray-900/25'} border ${colors.borderHover} flex items-center gap-2 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              {checkingHealth ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white relative z-10"></div>
                  <span className="relative z-10">Checking...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <span className="relative z-10">Run Health Check</span>
                </>
              )}
            </button>
          </div>

          {/* Tabs Navigation - Modern Design */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                  activeTab === 'overview'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {activeTab === 'overview' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                )}
                <span className="relative z-10">Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                  activeTab === 'analytics'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {activeTab === 'analytics' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                )}
                <span className="relative z-10">Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                  activeTab === 'activity'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {activeTab === 'activity' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                )}
                <span className="relative z-10">User Activity</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                  activeTab === 'logs'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {activeTab === 'logs' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                )}
                <span className="relative z-10">System Logs</span>
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                  activeTab === 'database'
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {activeTab === 'database' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                )}
                <span className="relative z-10">Database</span>
              </button>
              {currentUserRole === 'SYS.AD' && (
                <>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'security'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'security' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Security</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('optimization')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'optimization'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'optimization' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Optimization</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'actions'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'actions' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">System Actions</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('incidents')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'incidents'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'incidents' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Incidents</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('alerts-config')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'alerts-config'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'alerts-config' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Alert Config</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'reports'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'reports' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Reports</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('trends')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'trends'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'trends' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Trends</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('workflows')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'workflows'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'workflows' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Workflows</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                      activeTab === 'notifications'
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {activeTab === 'notifications' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    )}
                    <span className="relative z-10">Notifications</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Content with Smooth Transitions */}
          <div className="transition-all duration-300 ease-in-out">
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn">
              {/* System Overview Cards */}
              {systemMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-green-600">{systemMetrics.uptime || '0%'}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${parseFloat(systemMetrics.uptime) || 0}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-blue-600">{systemMetrics.responseTime || '0ms'}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-purple-600">{systemMetrics.activeUsers || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(systemMetrics.activeUsers || 0) / 100 * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Network Latency</p>
                <p className="text-2xl font-bold text-orange-600">{systemMetrics.networkLatency || 0}ms</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
                </svg>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full transition-all duration-300" style={{ width: '12%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Usage */}
      {systemMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">CPU Usage</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-800">{systemMetrics.cpuUsage || 0}%</span>
              <span className="text-sm text-gray-500">of 100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${systemMetrics.cpuUsage || 0}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Memory Usage</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-800">{systemMetrics.memoryUsage || 0}%</span>
              <span className="text-sm text-gray-500">of 16GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-yellow-600 h-3 rounded-full transition-all duration-300" style={{ width: `${systemMetrics.memoryUsage || 0}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Disk Usage</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-800">{systemMetrics.diskUsage || 0}%</span>
              <span className="text-sm text-gray-500">of 500GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-600 h-3 rounded-full transition-all duration-300" style={{ width: `${systemMetrics.diskUsage || 0}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

              {/* Alerts and Health Checks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Active Alerts</h3>
            {alerts.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                {alerts.filter(a => !a.acknowledged).length} New
              </span>
            )}
          </div>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <div key={alert.id || `alert-${alert.component}-${index}`} className={`p-4 rounded-lg border-l-4 ${getAlertTypeClass(alert.type)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`w-2 h-2 rounded-full ${
                          alert.type === 'error' ? 'bg-red-500' :
                          alert.type === 'warning' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}></span>
                        <h4 className="font-medium text-gray-800">{alert.title}</h4>
                        {alert.severity && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {alert.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span>{alert.time || 'Just now'}</span>
                        {alert.component && <span>Component: {alert.component}</span>}
                        {alert.value !== undefined && (
                          <span>
                            Value: {alert.value}
                            {alert.component === 'CPU' || alert.component === 'Memory' || alert.component === 'Disk' ? '%' : 
                             alert.component === 'API' ? 'ms' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap ml-2">
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No active alerts</p>
            )}
          </div>
        </div>

        {/* Recent Health Checks */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Health Checks</h3>
          <div className="space-y-3">
            {healthChecks.length > 0 ? (
              healthChecks.map(check => (
                <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      check.status === 'OK' ? 'bg-green-500' :
                      check.status === 'Warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-800">{check.component}</p>
                      <p className="text-sm text-gray-600">{check.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{check.time}</p>
                    {check.duration && <p className="text-xs text-gray-400">{check.duration}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No health checks available</p>
            )}
          </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Performance Analytics</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnalyticsRange('24h')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    analyticsRange === '24h'
                      ? `${colors.primary} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  24 Hours
                </button>
                <button
                  onClick={() => setAnalyticsRange('7d')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    analyticsRange === '7d'
                      ? `${colors.primary} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setAnalyticsRange('30d')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    analyticsRange === '30d'
                      ? `${colors.primary} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>
            {analyticsData ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-800">{analyticsData.totalRequests || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Unique Users</p>
                    <p className="text-2xl font-bold text-gray-800">{analyticsData.uniqueUsers || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Time Range</p>
                    <p className="text-2xl font-bold text-gray-800">{analyticsRange === '24h' ? '24 Hours' : analyticsRange === '7d' ? '7 Days' : '30 Days'}</p>
                  </div>
                </div>
                <div className="h-96">
                  <canvas ref={performanceChartRef}></canvas>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics data...</p>
              </div>
            )}
          </div>
        </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-6 animate-fadeIn">
          {userActivity ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Users</h3>
                  <p className="text-3xl font-bold text-purple-600">{userActivity.activeUsers || 0}</p>
                  <p className="text-sm text-gray-500 mt-2">Last {userActivity.timeRange}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Activity by Role</h3>
                  <div className="space-y-2">
                    {userActivity.activityByRole && userActivity.activityByRole.length > 0 ? (
                      userActivity.activityByRole.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{item.role || 'Unknown'}</span>
                          <span className="font-semibold text-gray-800">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No activity data</p>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Range</h3>
                  <p className="text-2xl font-bold text-gray-800">{userActivity.timeRange || '24 hours'}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Active Users</h3>
                <div className="space-y-3">
                  {userActivity.mostActiveUsers && userActivity.mostActiveUsers.length > 0 ? (
                    userActivity.mostActiveUsers.map((user, index) => (
                      <div key={user.userId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{user.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">{user.username} • {user.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">{user.activityCount} activities</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No active users</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading user activity data...</p>
            </div>
          )}
        </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">System Logs</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    if (e.target.value.length > 2 || e.target.value.length === 0) {
                      fetchSystemLogs(1, '', e.target.value);
                    }
                  }}
                />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => fetchSystemLogs(1, e.target.value, '')}
                >
                  <option value="">All Severity</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>
            {logsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading logs...</p>
              </div>
            ) : systemLogs.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {systemLogs.map((log) => (
                  <div key={log.id} className={`p-3 rounded-lg border-l-4 ${
                    log.severity === 'error' ? 'bg-red-50 border-red-400' :
                    log.severity === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-gray-50 border-gray-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            log.severity === 'error' ? 'bg-red-100 text-red-700' :
                            log.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.severity?.toUpperCase() || 'INFO'}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{log.action}</span>
                          {log.entityType && (
                            <span className="text-xs text-gray-500">• {log.entityType}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{log.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                          {log.user && <span>User: {log.user.name} ({log.user.role})</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No logs found</p>
            )}
          </div>
        </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6 animate-fadeIn">
          {databaseHealth ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Connection Pool</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pool Size</span>
                      <span className="font-semibold">{databaseHealth.connectionPool?.size || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available</span>
                      <span className="font-semibold text-green-600">{databaseHealth.connectionPool?.available || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Use</span>
                      <span className="font-semibold text-blue-600">{databaseHealth.connectionPool?.using || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Waiting</span>
                      <span className="font-semibold text-yellow-600">{databaseHealth.connectionPool?.waiting || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Query Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Query Time</span>
                      <span className="font-semibold">{databaseHealth.queryPerformance?.testQueryTime || 0}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        databaseHealth.queryPerformance?.status === 'Excellent' ? 'bg-green-100 text-green-700' :
                        databaseHealth.queryPerformance?.status === 'Good' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {databaseHealth.queryPerformance?.status || 'Unknown'}
                      </span>
                    </div>
                    {databaseHealth.databaseSize && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Database Size</span>
                        <span className="font-semibold">{databaseHealth.databaseSize} MB</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Table Counts</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {databaseHealth.tableCounts && Object.entries(databaseHealth.tableCounts).map(([table, count]) => (
                    <div key={table} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1 capitalize">{table.replace(/_/g, ' ')}</p>
                      <p className="text-2xl font-bold text-gray-800">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading database health data...</p>
            </div>
          )}
        </div>
            )}

            {activeTab === 'security' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          {securityData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Failed Logins</h3>
                  <p className="text-3xl font-bold text-red-600">{securityData.eventCounts?.failedLogins || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Last {securityData.timeRange}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Successful Logins</h3>
                  <p className="text-3xl font-bold text-green-600">{securityData.eventCounts?.successfulLogins || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Last {securityData.timeRange}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Password Changes</h3>
                  <p className="text-3xl font-bold text-blue-600">{securityData.eventCounts?.passwordChanges || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Last {securityData.timeRange}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Unauthorized Access</h3>
                  <p className="text-3xl font-bold text-orange-600">{securityData.eventCounts?.unauthorizedAccess || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Last {securityData.timeRange}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Failed Login Attempts</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {securityData.recentFailedLogins && securityData.recentFailedLogins.length > 0 ? (
                      securityData.recentFailedLogins.map((login, index) => (
                        <div key={login.id || index} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">{login.username || 'Unknown'}</p>
                              <p className="text-sm text-gray-600">{login.ipAddress || 'N/A'}</p>
                              <p className="text-xs text-gray-500 mt-1">{new Date(login.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No failed login attempts</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Security Events</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {securityData.recentSecurityEvents && securityData.recentSecurityEvents.length > 0 ? (
                      securityData.recentSecurityEvents.map((event, index) => (
                        <div key={event.id || index} className={`p-3 rounded-lg border-l-4 ${
                          event.action.includes('FAIL') || event.action.includes('DENIED') || event.action.includes('UNAUTHORIZED')
                            ? 'bg-red-50 border-red-400'
                            : 'bg-gray-50 border-gray-400'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">{event.action.replace(/_/g, ' ')}</p>
                              {event.user && (
                                <p className="text-sm text-gray-600">{event.user.name} ({event.user.role})</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                              {event.details && (
                                <p className="text-xs text-gray-500 mt-1">{event.details}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No security events</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading security data...</p>
            </div>
          )}
        </div>
            )}

            {activeTab === 'optimization' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          {optimizationData ? (
            <>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Optimization Recommendations</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {optimizationData.totalRecommendations || 0} total recommendations
                      {optimizationData.highPriority > 0 && (
                        <span className="ml-2 text-red-600 font-semibold">
                          ({optimizationData.highPriority} high priority)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {optimizationData.recommendations && optimizationData.recommendations.length > 0 ? (
                    optimizationData.recommendations.map((rec, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        rec.priority === 'high' ? 'bg-red-50 border-red-400' :
                        rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {rec.priority?.toUpperCase() || 'INFO'}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                                {rec.category}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-800 mb-1">{rec.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{rec.message}</p>
                            <p className="text-sm text-gray-700 font-medium">
                              <span className="text-gray-600">Recommended Action:</span> {rec.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-green-600 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">No optimization recommendations</p>
                      <p className="text-sm text-gray-500 mt-2">Your system is running optimally!</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading optimization recommendations...</p>
            </div>
          )}
        </div>
            )}

            {activeTab === 'actions' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">System Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Clear Cache */}
              <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Clear Cache</h4>
                    <p className="text-sm text-gray-600">Clear application cache</p>
                  </div>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={actionLoading.clearCache}
                  className={`w-full px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {actionLoading.clearCache ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Clearing...
                    </>
                  ) : (
                    'Clear Cache'
                  )}
                </button>
              </div>

              {/* Maintenance Mode */}
              <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-lg ${maintenanceMode ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <svg className={`w-6 h-6 ${maintenanceMode ? 'text-orange-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Maintenance Mode</h4>
                    <p className="text-sm text-gray-600">
                      {maintenanceMode ? 'Currently Enabled' : 'Currently Disabled'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleMaintenanceMode}
                  disabled={actionLoading.maintenanceMode}
                  className={`w-full px-4 py-2 ${
                    maintenanceMode 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : `${colors.primary} ${colors.primaryHover}`
                  } text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {actionLoading.maintenanceMode ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {maintenanceMode ? 'Disabling...' : 'Enabling...'}
                    </>
                  ) : (
                    maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'
                  )}
                </button>
              </div>

              {/* Database Optimization */}
              <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Database Optimization</h4>
                    <p className="text-sm text-gray-600">Optimize database</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    alert('Database optimization feature coming soon!');
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
            )}

            {activeTab === 'incidents' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Incident Management</h3>
              <button
                onClick={() => {
                  const title = prompt('Enter incident title:');
                  const description = prompt('Enter incident description:');
                  const severity = prompt('Enter severity (low/medium/high/critical):') || 'medium';
                  
                  if (title && description) {
                    fetch(`${API_URL}/admin/system-health/incidents`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ title, description, severity })
                    })
                    .then(r => r.json())
                    .then(data => {
                      if (data.success) {
                        alert('Incident created successfully!');
                        fetchIncidents();
                      }
                    });
                  }
                }}
                className={`px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors`}
              >
                + Create Incident
              </button>
            </div>
            {incidentsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading incidents...</p>
              </div>
            ) : incidents.length > 0 ? (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div key={incident.id} className={`p-4 rounded-lg border-l-4 ${
                    incident.severity === 'critical' ? 'bg-red-50 border-red-400' :
                    incident.severity === 'high' ? 'bg-orange-50 border-orange-400' :
                    incident.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            incident.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            incident.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {incident.severity?.toUpperCase() || 'LOW'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            incident.status === 'open' ? 'bg-red-100 text-red-700' :
                            incident.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {incident.status?.toUpperCase() || 'OPEN'}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-1">{incident.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(incident.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {incident.status === 'open' && (
                        <button
                          onClick={() => {
                            const notes = prompt('Enter resolution notes:');
                            if (notes) {
                              fetch(`${API_URL}/admin/system-health/incidents/${incident.id}/resolve`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${getToken()}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ resolutionNotes: notes })
                              })
                              .then(r => r.json())
                              .then(data => {
                                if (data.success) {
                                  alert('Incident resolved!');
                                  fetchIncidents();
                                }
                              });
                            }
                          }}
                          className="ml-4 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No incidents found</p>
            )}
          </div>
        </div>
            )}

            {activeTab === 'alerts-config' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          {configLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading alert configuration...</p>
            </div>
          ) : alertConfig ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Alert Configuration</h3>
                <button
                  onClick={async () => {
                    const updated = { ...alertConfig };
                    updated.thresholds.cpuUsage.warning = parseInt(prompt('CPU Warning Threshold (%):', alertConfig.thresholds.cpuUsage.warning) || alertConfig.thresholds.cpuUsage.warning);
                    updated.thresholds.cpuUsage.critical = parseInt(prompt('CPU Critical Threshold (%):', alertConfig.thresholds.cpuUsage.critical) || alertConfig.thresholds.cpuUsage.critical);
                    
                    const response = await fetch(`${API_URL}/admin/system-health/alerts/config`, {
                      method: 'PUT',
                      headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(updated)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                      alert('Alert configuration updated!');
                      fetchAlertConfig();
                    }
                  }}
                  className={`px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors`}
                >
                  Save Changes
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-4">Alert Thresholds</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">CPU Usage</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Warning:</span>
                          <span className="font-semibold">{alertConfig.thresholds.cpuUsage.warning}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Critical:</span>
                          <span className="font-semibold text-red-600">{alertConfig.thresholds.cpuUsage.critical}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Memory Usage</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Warning:</span>
                          <span className="font-semibold">{alertConfig.thresholds.memoryUsage.warning}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Critical:</span>
                          <span className="font-semibold text-red-600">{alertConfig.thresholds.memoryUsage.critical}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Disk Usage</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Warning:</span>
                          <span className="font-semibold">{alertConfig.thresholds.diskUsage.warning}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Critical:</span>
                          <span className="font-semibold text-red-600">{alertConfig.thresholds.diskUsage.critical}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Response Time</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Warning:</span>
                          <span className="font-semibold">{alertConfig.thresholds.responseTime.warning}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Critical:</span>
                          <span className="font-semibold text-red-600">{alertConfig.thresholds.responseTime.critical}ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-4">Notification Preferences</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={alertConfig.notifications.email}
                        onChange={(e) => {
                          setAlertConfig({
                            ...alertConfig,
                            notifications: { ...alertConfig.notifications, email: e.target.checked }
                          });
                        }}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Email Notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={alertConfig.notifications.sms}
                        onChange={(e) => {
                          setAlertConfig({
                            ...alertConfig,
                            notifications: { ...alertConfig.notifications, sms: e.target.checked }
                          });
                        }}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">SMS Notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={alertConfig.notifications.push}
                        onChange={(e) => {
                          setAlertConfig({
                            ...alertConfig,
                            notifications: { ...alertConfig.notifications, push: e.target.checked }
                          });
                        }}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Push Notifications</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
            )}

            {activeTab === 'reports' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Export System Health Reports</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                <select
                  id="reportRange"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="24h"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <select
                  id="reportFormat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="json"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <button
                onClick={() => {
                  const range = document.getElementById('reportRange').value;
                  const format = document.getElementById('reportFormat').value;
                  handleExportReport(format, range);
                }}
                disabled={exportLoading}
                className={`w-full px-4 py-3 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {exportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Export Report
                  </>
                )}
              </button>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Report includes:</strong> System metrics, health checks, alerts, activity logs, and summary statistics for the selected time range.
                </p>
              </div>
            </div>
          </div>
        </div>
            )}

            {activeTab === 'trends' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Performance Trends & Baselines</h3>
              <div className="flex gap-2">
                <select
                  value={selectedMetric}
                  onChange={(e) => {
                    setSelectedMetric(e.target.value);
                    fetchTrends(e.target.value, 7);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cpu">CPU Usage</option>
                  <option value="memory">Memory Usage</option>
                  <option value="disk">Disk Usage</option>
                  <option value="responseTime">Response Time</option>
                </select>
                <select
                  onChange={(e) => fetchTrends(selectedMetric, parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="7"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="14">Last 14 Days</option>
                  <option value="30">Last 30 Days</option>
                </select>
              </div>
            </div>
            {trendsData ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Current</p>
                    <p className="text-2xl font-bold text-gray-800">{trendsData.statistics.current}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Average</p>
                    <p className="text-2xl font-bold text-gray-800">{trendsData.statistics.average}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Min / Max</p>
                    <p className="text-2xl font-bold text-gray-800">{trendsData.statistics.minimum} / {trendsData.statistics.maximum}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Trend</p>
                    <p className={`text-2xl font-bold ${
                      trendsData.statistics.trend === 'increasing' ? 'text-red-600' :
                      trendsData.statistics.trend === 'decreasing' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {trendsData.statistics.trend === 'increasing' ? '↑' :
                       trendsData.statistics.trend === 'decreasing' ? '↓' : '→'}
                    </p>
                  </div>
                </div>
                <div className="h-96">
                  <canvas ref={trendsChartRef}></canvas>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading trends data...</p>
              </div>
            )}
          </div>

          {baselinesData && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Baselines & Anomaly Detection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(baselinesData).map(([key, baseline]) => (
                  <div key={key} className={`p-4 rounded-lg border-l-4 ${
                    baseline.status === 'anomaly' ? 'bg-red-50 border-red-400' : 'bg-green-50 border-green-400'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        baseline.status === 'anomaly' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {baseline.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Baseline:</span>
                        <span className="font-semibold">{baseline.baseline}{key === 'responseTime' ? 'ms' : '%'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current:</span>
                        <span className="font-semibold">{baseline.current}{key === 'responseTime' ? 'ms' : '%'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deviation:</span>
                        <span className={`font-semibold ${baseline.deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {baseline.deviation > 0 ? '+' : ''}{baseline.deviation.toFixed(1)}{key === 'responseTime' ? 'ms' : '%'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
            )}

            {activeTab === 'workflows' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Automated Workflows & Scheduled Tasks</h3>
            {scheduledTasks.length > 0 ? (
              <div className="space-y-4">
                {scheduledTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800">{task.name}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            task.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {task.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            task.status === 'success' ? 'bg-blue-100 text-blue-700' :
                            task.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Schedule:</span>
                            <span className="ml-2 font-mono text-gray-800">{task.schedule}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Last Run:</span>
                            <span className="ml-2 text-gray-800">{new Date(task.lastRun).toLocaleString()}</span>
                          </div>
                          {task.nextRun && (
                            <div>
                              <span className="text-gray-600">Next Run:</span>
                              <span className="ml-2 text-gray-800">{new Date(task.nextRun).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const response = await fetch(`${API_URL}/admin/system-health/scheduled-tasks/${task.id}/toggle`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${getToken()}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ enabled: !task.enabled })
                          });
                          const data = await response.json();
                          if (data.success) {
                            alert(`Task ${!task.enabled ? 'enabled' : 'disabled'} successfully!`);
                            fetchScheduledTasks();
                          }
                        }}
                        className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          task.enabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {task.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No scheduled tasks found</p>
            )}
          </div>
        </div>
            )}

            {activeTab === 'notifications' && currentUserRole === 'SYS.AD' && (
              <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Notification Templates</h3>
            {notificationTemplates.length > 0 ? (
              <div className="space-y-4">
                {notificationTemplates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800">{template.name}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                            {template.type.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            template.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {template.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600 font-medium">Subject:</span>
                            <p className="text-gray-800 mt-1">{template.subject}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Body:</span>
                            <p className="text-gray-800 mt-1 whitespace-pre-wrap">{template.body}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const updated = { ...template, enabled: !template.enabled };
                          const response = await fetch(`${API_URL}/admin/system-health/notifications/templates/${template.id}`, {
                            method: 'PUT',
                            headers: {
                              'Authorization': `Bearer ${getToken()}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(updated)
                          });
                          const data = await response.json();
                          if (data.success) {
                            alert('Template updated successfully!');
                            fetchNotificationTemplates();
                          }
                        }}
                        className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          template.enabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {template.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No notification templates found</p>
            )}
          </div>
        </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


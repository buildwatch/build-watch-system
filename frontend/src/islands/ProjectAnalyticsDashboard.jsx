import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

const ProjectAnalyticsDashboard = ({
  isOpen: externalIsOpen = false,
  onClose: externalOnClose,
  theme = {
    headerBg: 'from-amber-50 to-orange-100',
    headerIconBg: 'from-amber-500 to-orange-600',
    primaryColor: 'amber',
    accentColor: 'orange',
    buttonClass: 'btn-primary'
  },
  userRole = 'lgu-iu', // eiu, mpmec-secretariat, mpmec, public, lgu-iu
  apiUrl = '/api', // Default to relative path, will be resolved client-side
  projectsEndpoint = null, // Custom endpoint, or null to use default based on userRole
  isPublic = false
}) => {
  const [isOpen, setIsOpen] = useState(externalIsOpen);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    ongoing: 0,
    completed: 0,
    pending: 0,
    delayed: 0,
    notStarted: 0,
    totalBudget: 0,
    utilizedBudget: 0,
    avgProgress: 0
  });
  const [timeRange, setTimeRange] = useState('all');
  const [resolvedApiUrl, setResolvedApiUrl] = useState(apiUrl);
  const chartsRef = useRef({});
  const chartCanvasesRef = useRef({});
  
  // Resolve API URL on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (apiUrl === '/api' || !apiUrl) {
        // Resolve relative path to absolute
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          setResolvedApiUrl('http://localhost:3000/api');
        } else {
          setResolvedApiUrl(`${protocol}//${hostname}/api`);
        }
      } else {
        setResolvedApiUrl(apiUrl);
      }
    }
  }, [apiUrl]);
  
  // Sync with external isOpen prop
  useEffect(() => {
    setIsOpen(externalIsOpen);
  }, [externalIsOpen]);
  
  const handleClose = () => {
    setIsOpen(false);
    if (externalOnClose) externalOnClose();
  };
  
  // Expose open function globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openProjectAnalytics = () => setIsOpen(true);
      window.closeProjectAnalytics = () => setIsOpen(false);
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.openProjectAnalytics;
        delete window.closeProjectAnalytics;
      }
    };
  }, []);

  // Determine projects endpoint based on user role
  const getProjectsEndpoint = () => {
    if (projectsEndpoint) return projectsEndpoint;
    
    if (isPublic) {
      return '/projects/public';
    }
    
    switch (userRole) {
      case 'eiu':
        return '/eiu/projects';
      case 'mpmec-secretariat':
        return '/projects/secretariat/submissions';
      case 'mpmec':
        return '/projects';
      case 'lgu-iu':
        return '/projects';
      default:
        return '/projects';
    }
  };

  // Fetch projects based on user role
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const token = !isPublic ? (localStorage.getItem('token') || sessionStorage.getItem('token')) : null;
      const endpoint = getProjectsEndpoint();
      const timestamp = new Date().getTime();
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${resolvedApiUrl}${endpoint}?_t=${timestamp}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        
        let fetchedProjects = [];
        if (data.success) {
          if (userRole === 'mpmec') {
            // MPMEC sees projects submitted to Secretariat
            fetchedProjects = data.projects?.filter(p => p.submittedToSecretariat === true) || [];
          } else if (userRole === 'mpmec-secretariat') {
            // Secretariat sees submissions
            fetchedProjects = data.projects || [];
          } else if (userRole === 'eiu') {
            // EIU sees their assigned projects
            fetchedProjects = data.projects || [];
          } else if (isPublic) {
            // Public sees approved projects
            fetchedProjects = data.projects?.filter(p => 
              p.approvedByMPMEC === true || p.approvedBySecretariat === true
            ) || [];
          } else {
            // Default: LGU-IU sees all projects
            fetchedProjects = data.projects || [];
          }
        }
        
        setProjects(fetchedProjects);
        const filteredProjects = await calculateStats(fetchedProjects);
        // Render charts after a brief delay to ensure DOM is ready
        setTimeout(() => {
          renderAllCharts(filteredProjects);
        }, 200);
      } else {
        console.error('Failed to fetch projects:', response.status);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics and return filtered projects
  const calculateStats = async (projectList) => {
    // Filter by time range
    let filteredProjects = [...projectList];
    if (timeRange !== 'all') {
      const now = new Date();
      const daysAgo = parseInt(timeRange);
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      filteredProjects = projectList.filter(p => {
        const createdDate = new Date(p.createdAt || p.createdDate);
        return createdDate >= cutoffDate;
      });
    }

    // Fetch accurate utilized budget from /api/home/stats
    let accurateUtilizedBudget = 0;
    if (!isPublic) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const statsResponse = await fetch(`${resolvedApiUrl}/home/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success && statsData.utilizedBudget !== undefined) {
              accurateUtilizedBudget = parseFloat(statsData.utilizedBudget) || 0;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch accurate utilized budget:', error);
      }
    }
    
    // Fallback: Calculate from project data
    let calculatedUtilizedBudget = 0;
    if (accurateUtilizedBudget === 0) {
      filteredProjects.forEach(p => {
        if (p.milestones && Array.isArray(p.milestones)) {
          p.milestones.forEach(milestone => {
            if (milestone.submissions && Array.isArray(milestone.submissions)) {
              const approvedSubmission = milestone.submissions
                .filter(s => s.status === 'approved' || s.status === 'iu_approved')
                .sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0))[0];
              
              if (approvedSubmission) {
                calculatedUtilizedBudget += parseFloat(approvedSubmission.usedBudget || approvedSubmission.budgetUsed || 0);
              }
            }
          });
        }
      });
      
      if (calculatedUtilizedBudget === 0) {
        calculatedUtilizedBudget = filteredProjects.reduce((sum, p) => {
          return sum + parseFloat(p.amountSpent || p.usedBudget || p.budgetUsed || 0);
        }, 0);
      }
    }

    const calculatedStats = {
      total: filteredProjects.length,
      ongoing: filteredProjects.filter(p => p.status === 'ongoing' || p.status === 'delayed').length,
      completed: filteredProjects.filter(p => 
        p.status === 'complete' || 
        p.status === 'completed' || 
        p.status === 'COMPLETED' ||
        p.status?.toLowerCase() === 'complete' ||
        p.status?.toLowerCase() === 'completed'
      ).length,
      pending: filteredProjects.filter(p => p.status === 'pending').length,
      delayed: filteredProjects.filter(p => p.status === 'delayed').length,
      notStarted: filteredProjects.filter(p => !p.status || p.status === 'not_started').length,
      totalBudget: filteredProjects.reduce((sum, p) => sum + parseFloat(p.totalBudget || 0), 0),
      utilizedBudget: accurateUtilizedBudget > 0 ? accurateUtilizedBudget : calculatedUtilizedBudget,
      avgProgress: filteredProjects.length > 0 
        ? filteredProjects.reduce((sum, p) => sum + parseFloat(p.overallProgress || 0), 0) / filteredProjects.length 
        : 0
    };

    setStats(calculatedStats);
    return filteredProjects;
  };

  // Load analytics when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    } else {
      // Cleanup charts when modal closes
      Object.values(chartsRef.current).forEach(chart => {
        if (chart) chart.destroy();
      });
      chartsRef.current = {};
    }
  }, [isOpen]);

  // Render charts after stats are calculated
  useEffect(() => {
    if (isOpen && !loading && projects.length > 0) {
      calculateStats(projects).then(filteredProjects => {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          renderAllCharts(filteredProjects);
        }, 100);
      });
    }
  }, [isOpen, loading, projects.length, timeRange]);

  // Render all charts
  const renderAllCharts = (projectList) => {
    renderStatusDistributionChart(projectList);
    renderCategoryDistributionChart(projectList);
    renderProjectGrowthChart(projectList);
    renderBudgetUtilizationChart(projectList);
    renderProgressDistributionChart(projectList);
    renderPriorityDistributionChart(projectList);
    renderMonthlyTrendsChart(projectList);
  };

  // Render Status Distribution Chart
  const renderStatusDistributionChart = (projectList) => {
    const canvasId = 'statusDistributionChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (chartsRef.current[canvasId]) {
      chartsRef.current[canvasId].destroy();
    }
    
    const statusGroups = {
      'Not Started': projectList.filter(p => !p.status || p.status === 'not_started'),
      'Pending': projectList.filter(p => p.status === 'pending'),
      'Ongoing': projectList.filter(p => p.status === 'ongoing'),
      'Delayed': projectList.filter(p => p.status === 'delayed'),
      'Complete': projectList.filter(p => 
        p.status === 'complete' || 
        p.status === 'completed' || 
        p.status === 'COMPLETED' ||
        p.status?.toLowerCase() === 'complete' ||
        p.status?.toLowerCase() === 'completed'
      )
    };
    
    const statusCounts = {
      'Not Started': statusGroups['Not Started'].length,
      'Pending': statusGroups['Pending'].length,
      'Ongoing': statusGroups['Ongoing'].length,
      'Delayed': statusGroups['Delayed'].length,
      'Complete': statusGroups['Complete'].length
    };
    
    chartsRef.current[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(156, 163, 175, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ],
          borderColor: [
            'rgb(156, 163, 175)',
            'rgb(245, 158, 11)',
            'rgb(59, 130, 246)',
            'rgb(239, 68, 68)',
            'rgb(16, 185, 129)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'right' },
          tooltip: {
            callbacks: {
              title: function(context) {
                const label = context[0].label || '';
                const statusProjects = statusGroups[label] || [];
                
                if (statusProjects.length === 0) {
                  const value = context[0].parsed || 0;
                  return `${label}: ${value} project${value !== 1 ? 's' : ''}`;
                }
                
                // Show first project's title and code in the title
                const firstProject = statusProjects[0];
                const name = firstProject.name || firstProject.projectName || firstProject.title || 'Unnamed Project';
                const code = firstProject.projectCode || '';
                
                if (statusProjects.length === 1) {
                  return code ? `${name} (${code})` : name;
                }
                
                // If multiple projects, show first one and indicate there are more
                return code ? `${name} (${code})` : `${name} (+${statusProjects.length - 1} more)`;
              },
              label: function(context) {
                const label = context.label || '';
                const statusProjects = statusGroups[label] || [];
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                
                if (statusProjects.length === 0) {
                  return `${percentage}%`;
                }
                
                const maxProjects = 5;
                const displayProjects = statusProjects.slice(0, maxProjects);
                const moreText = statusProjects.length > maxProjects 
                  ? ` and ${statusProjects.length - maxProjects} more...` 
                  : '';
                
                return [
                  `${percentage}% (${statusProjects.length} project${statusProjects.length !== 1 ? 's' : ''})`,
                  ...displayProjects.map(p => {
                    const name = p.name || p.projectName || p.title || 'Unnamed Project';
                    const code = p.projectCode || '';
                    return code ? `• ${name} (${code})` : `• ${name}`;
                  }),
                  moreText ? moreText : ''
                ].filter(Boolean);
              }
            }
          }
        }
      }
    });
  };

  // Render Category Distribution Chart
  const renderCategoryDistributionChart = (projectList) => {
    const canvasId = 'categoryDistributionChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (chartsRef.current[canvasId]) {
      chartsRef.current[canvasId].destroy();
    }
    
    const categoryGroups = {};
    projectList.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = [];
      }
      categoryGroups[cat].push(p);
    });
    
    const categoryCounts = {};
    Object.keys(categoryGroups).forEach(cat => {
      categoryCounts[cat] = categoryGroups[cat].length;
    });
    
    const sorted = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    
    chartsRef.current[canvasId] = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: sorted.map(([name]) => name),
        datasets: [{
          data: sorted.map(([, count]) => count),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(20, 184, 166, 0.8)',
            'rgba(251, 146, 60, 0.8)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'right' },
          tooltip: {
            callbacks: {
              title: function(context) {
                const label = context[0].label || '';
                const categoryProjects = categoryGroups[label] || [];
                
                if (categoryProjects.length === 0) {
                  const value = context[0].parsed || 0;
                  return `${label}: ${value} project${value !== 1 ? 's' : ''}`;
                }
                
                // Show first project's title and code in the title
                const firstProject = categoryProjects[0];
                const name = firstProject.name || firstProject.projectName || firstProject.title || 'Unnamed Project';
                const code = firstProject.projectCode || '';
                
                if (categoryProjects.length === 1) {
                  return code ? `${name} (${code})` : name;
                }
                
                // If multiple projects, show first one and indicate there are more
                return code ? `${name} (${code})` : `${name} (+${categoryProjects.length - 1} more)`;
              },
              label: function(context) {
                const label = context.label || '';
                const categoryProjects = categoryGroups[label] || [];
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                
                if (categoryProjects.length === 0) {
                  return `${percentage}%`;
                }
                
                return [
                  `${percentage}% (${categoryProjects.length} project${categoryProjects.length !== 1 ? 's' : ''})`,
                  ...categoryProjects.map(p => {
                    const name = p.name || p.projectName || p.title || 'Unnamed Project';
                    const code = p.projectCode || '';
                    return code ? `• ${name} (${code})` : `• ${name}`;
                  })
                ];
              }
            }
          }
        }
      }
    });
  };

  // Render Project Growth Chart
  const renderProjectGrowthChart = (projectList) => {
    const canvasId = 'projectGrowthChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (chartsRef.current[canvasId]) {
      chartsRef.current[canvasId].destroy();
    }
    
    const growthData = {};
    const growthProjects = {};
    projectList.forEach(p => {
      if (p.createdAt || p.createdDate) {
        const date = new Date(p.createdAt || p.createdDate);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        growthData[monthKey] = (growthData[monthKey] || 0) + 1;
        if (!growthProjects[monthKey]) {
          growthProjects[monthKey] = [];
        }
        growthProjects[monthKey].push(p);
      }
    });
    
    const sortedDates = Object.keys(growthData).sort((a, b) => new Date(a) - new Date(b));
    const cumulative = [];
    const cumulativeProjects = [];
    let total = 0;
    sortedDates.forEach(date => {
      total += growthData[date];
      cumulative.push(total);
      cumulativeProjects.push([...growthProjects[date] || []]);
    });
    
    chartsRef.current[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Total Projects',
          data: cumulative,
          borderColor: `rgb(245, 158, 11)`,
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const monthProjects = cumulativeProjects[index] || [];
                const label = context[0].label || '';
                
                if (monthProjects.length === 0) {
                  const value = context[0].parsed.y || 0;
                  return `${label}: ${value} project${value !== 1 ? 's' : ''}`;
                }
                
                // Show first project's title and code in the title
                const firstProject = monthProjects[0];
                const name = firstProject.name || firstProject.projectName || firstProject.title || 'Unnamed Project';
                const code = firstProject.projectCode || '';
                
                if (monthProjects.length === 1) {
                  return code ? `${name} (${code})` : name;
                }
                
                // If multiple projects, show first one and indicate there are more
                return code ? `${name} (${code})` : `${name} (+${monthProjects.length - 1} more)`;
              },
              label: function(context) {
                const index = context.dataIndex;
                const monthProjects = cumulativeProjects[index] || [];
                
                if (monthProjects.length === 0) {
                  return 'No projects';
                }
                
                const maxProjects = 5;
                const displayProjects = monthProjects.slice(0, maxProjects);
                const moreText = monthProjects.length > maxProjects 
                  ? ` and ${monthProjects.length - maxProjects} more...` 
                  : '';
                
                return [
                  `${monthProjects.length} project${monthProjects.length !== 1 ? 's' : ''}`,
                  ...displayProjects.map(p => {
                    const name = p.name || p.projectName || p.title || 'Unnamed Project';
                    const code = p.projectCode || '';
                    return code ? `• ${name} (${code})` : `• ${name}`;
                  }),
                  moreText ? moreText : ''
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  };

  // Render Budget Utilization Chart
  const renderBudgetUtilizationChart = (projectList) => {
    const canvasId = 'budgetUtilizationChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (chartsRef.current[canvasId]) {
      chartsRef.current[canvasId].destroy();
    }
    
    const topProjects = [...projectList]
      .sort((a, b) => parseFloat(b.totalBudget || 0) - parseFloat(a.totalBudget || 0))
      .slice(0, 10);
    
    chartsRef.current[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: topProjects.map(p => (p.name || p.projectName || p.title || 'Unnamed Project').length > 25 
          ? (p.name || p.projectName || p.title || 'Unnamed Project').substring(0, 25) + '...' 
          : (p.name || p.projectName || p.title || 'Unnamed Project')),
        datasets: [{
          label: 'Total Budget',
          data: topProjects.map(p => parseFloat(p.totalBudget || 0)),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1
        }, {
          label: 'Utilized Budget',
          data: topProjects.map(p => {
            const budget = parseFloat(p.totalBudget || 0);
            const progress = parseFloat(p.budgetProgress || 0) / 100;
            return budget * progress;
          }),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const project = topProjects[index];
                if (project) {
                  const name = project.name || project.projectName || project.title || 'Unnamed Project';
                  const code = project.projectCode || '';
                  return code ? `${name} (${code})` : name;
                }
                return '';
              },
              label: function(context) {
                const index = context.dataIndex;
                const project = topProjects[index];
                const value = parseFloat(context.parsed.x);
                const budget = parseFloat(project?.totalBudget || 0);
                const utilized = context.datasetIndex === 1 ? value : (budget * (parseFloat(project?.budgetProgress || 0) / 100));
                const percentage = budget > 0 ? ((utilized / budget) * 100).toFixed(1) : 0;
                
                return [
                  `${context.dataset.label}: ₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  `Utilization: ${percentage}%`
                ];
              }
            }
          }
        },
        scales: {
          x: { beginAtZero: true }
        }
      }
    });
  };

  // Render Progress Distribution Chart
  const renderProgressDistributionChart = (projectList) => {
    const canvasId = 'progressDistributionChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (chartsRef.current[canvasId]) {
      chartsRef.current[canvasId].destroy();
    }
    
    const progressRanges = {
      '0-25%': [],
      '26-50%': [],
      '51-75%': [],
      '76-100%': []
    };
    
    projectList.forEach(p => {
      const progress = parseFloat(p.overallProgress || 0);
      if (progress <= 25) progressRanges['0-25%'].push(p);
      else if (progress <= 50) progressRanges['26-50%'].push(p);
      else if (progress <= 75) progressRanges['51-75%'].push(p);
      else progressRanges['76-100%'].push(p);
    });
    
    const progressCounts = {
      '0-25%': progressRanges['0-25%'].length,
      '26-50%': progressRanges['26-50%'].length,
      '51-75%': progressRanges['51-75%'].length,
      '76-100%': progressRanges['76-100%'].length
    };
    
    chartsRef.current[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: Object.keys(progressCounts),
        datasets: [{
          label: 'Projects',
          data: Object.values(progressCounts),
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(context) {
                const label = context[0].label || '';
                const value = context[0].parsed.y || 0;
                return `${label}: ${value} project${value !== 1 ? 's' : ''}`;
              },
              label: function(context) {
                const label = context.label || '';
                const rangeProjects = progressRanges[label] || [];
                
                if (rangeProjects.length === 0) {
                  return 'No projects';
                }
                
                const maxProjects = 5;
                const displayProjects = rangeProjects.slice(0, maxProjects);
                const moreText = rangeProjects.length > maxProjects 
                  ? ` and ${rangeProjects.length - maxProjects} more...` 
                  : '';
                
                return [
                  ...displayProjects.map(p => {
                    const name = p.name || p.projectName || p.title || 'Unnamed Project';
                    const code = p.projectCode || '';
                    const progress = parseFloat(p.overallProgress || 0).toFixed(1);
                    return code ? `• ${name} (${code}) - ${progress}%` : `• ${name} - ${progress}%`;
                  }),
                  moreText ? moreText : ''
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  };

  // Render Priority Distribution Chart
  const renderPriorityDistributionChart = (projectList) => {
    const canvasId = 'priorityDistributionChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (chartsRef.current[canvasId]) {
      chartsRef.current[canvasId].destroy();
    }
    
    const priorityGroups = {
      'High': projectList.filter(p => p.priority === 'high'),
      'Medium': projectList.filter(p => p.priority === 'medium'),
      'Low': projectList.filter(p => p.priority === 'low')
    };
    
    const priorityCounts = {
      'High': priorityGroups['High'].length,
      'Medium': priorityGroups['Medium'].length,
      'Low': priorityGroups['Low'].length
    };
    
    chartsRef.current[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: Object.keys(priorityCounts),
        datasets: [{
          label: 'Projects',
          data: Object.values(priorityCounts),
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(156, 163, 175, 0.8)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(context) {
                const label = context[0].label || '';
                const value = context[0].parsed.y || 0;
                return `${label} Priority: ${value} project${value !== 1 ? 's' : ''}`;
              },
              label: function(context) {
                const label = context.label || '';
                const priorityProjects = priorityGroups[label] || [];
                
                if (priorityProjects.length === 0) {
                  return 'No projects';
                }
                
                const maxProjects = 5;
                const displayProjects = priorityProjects.slice(0, maxProjects);
                const moreText = priorityProjects.length > maxProjects 
                  ? ` and ${priorityProjects.length - maxProjects} more...` 
                  : '';
                
                return [
                  ...displayProjects.map(p => {
                    const name = p.name || p.projectName || p.title || 'Unnamed Project';
                    const code = p.projectCode || '';
                    return code ? `• ${name} (${code})` : `• ${name}`;
                  }),
                  moreText ? moreText : ''
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  };

  // Render Monthly Trends Chart
  const renderMonthlyTrendsChart = (projectList) => {
    const canvasId = 'monthlyTrendsChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (chartsRef.current[canvasId]) {
      chartsRef.current[canvasId].destroy();
    }
    
    const monthlyData = [];
    const monthlyProjects = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthProjects = projectList.filter(p => {
        const createdDate = new Date(p.createdAt || p.createdDate);
        return createdDate >= monthStart && createdDate <= monthEnd;
      });
      
      const completedProjects = monthProjects.filter(p => 
        p.status === 'complete' || 
        p.status === 'completed' || 
        p.status?.toLowerCase() === 'complete' ||
        p.status?.toLowerCase() === 'completed'
      );
      const ongoingProjects = monthProjects.filter(p => 
        p.status === 'ongoing' || p.status === 'delayed'
      );
      
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: monthProjects.length,
        completed: completedProjects.length,
        ongoing: ongoingProjects.length
      });
      
      monthlyProjects.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: monthProjects,
        completed: completedProjects,
        ongoing: ongoingProjects
      });
    }
    
    chartsRef.current[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: monthlyData.map(d => d.month),
        datasets: [{
          label: 'Total Projects',
          data: monthlyData.map(d => d.total),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Completed',
          data: monthlyData.map(d => d.completed),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Ongoing',
          data: monthlyData.map(d => d.ongoing),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const monthInfo = monthlyProjects[index];
                const datasetLabel = context[0].dataset.label || '';
                
                if (!monthInfo) {
                  const value = context[0].parsed.y || 0;
                  return `${datasetLabel} - ${value} project${value !== 1 ? 's' : ''}`;
                }
                
                let relevantProjects = [];
                if (datasetLabel === 'Total Projects') {
                  relevantProjects = monthInfo.total || [];
                } else if (datasetLabel === 'Completed') {
                  relevantProjects = monthInfo.completed || [];
                } else if (datasetLabel === 'Ongoing') {
                  relevantProjects = monthInfo.ongoing || [];
                }
                
                if (relevantProjects.length === 0) {
                  const value = context[0].parsed.y || 0;
                  return `${monthInfo?.month || ''}: ${datasetLabel} - ${value} project${value !== 1 ? 's' : ''}`;
                }
                
                // Show first project's title and code in the title
                const firstProject = relevantProjects[0];
                const name = firstProject.name || firstProject.projectName || firstProject.title || 'Unnamed Project';
                const code = firstProject.projectCode || '';
                
                if (relevantProjects.length === 1) {
                  return code ? `${name} (${code})` : name;
                }
                
                // If multiple projects, show first one and indicate there are more
                return code ? `${name} (${code})` : `${name} (+${relevantProjects.length - 1} more)`;
              },
              label: function(context) {
                const index = context.dataIndex;
                const datasetLabel = context.dataset.label || '';
                const monthInfo = monthlyProjects[index];
                
                if (!monthInfo) {
                  return 'No data';
                }
                
                let relevantProjects = [];
                if (datasetLabel === 'Total Projects') {
                  relevantProjects = monthInfo.total || [];
                } else if (datasetLabel === 'Completed') {
                  relevantProjects = monthInfo.completed || [];
                } else if (datasetLabel === 'Ongoing') {
                  relevantProjects = monthInfo.ongoing || [];
                }
                
                if (relevantProjects.length === 0) {
                  return 'No projects';
                }
                
                const maxProjects = 5;
                const displayProjects = relevantProjects.slice(0, maxProjects);
                const moreText = relevantProjects.length > maxProjects 
                  ? ` and ${relevantProjects.length - maxProjects} more...` 
                  : '';
                
                return [
                  `${relevantProjects.length} project${relevantProjects.length !== 1 ? 's' : ''}`,
                  ...displayProjects.map(p => {
                    const name = p.name || p.projectName || p.title || 'Unnamed Project';
                    const code = p.projectCode || '';
                    return code ? `• ${name} (${code})` : `• ${name}`;
                  }),
                  moreText ? moreText : ''
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchProjects().then(() => {
      if (projects.length > 0) {
        calculateStats(projects).then(filteredProjects => {
          renderAllCharts(filteredProjects);
        });
      }
    });
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100 my-8">
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${theme.headerBg} px-6 py-5 border-b border-gray-200 rounded-t-2xl flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${theme.headerIconBg} rounded-xl flex items-center justify-center shadow-md`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Project Analytics & Statistics Dashboard</h3>
                <p className="text-sm text-gray-600 mt-0.5">Comprehensive project insights and analytics</p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Time Range Selector */}
          <div className="mb-6 flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Time Range:</label>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-${theme.primaryColor}-500 focus:border-transparent transition-all`}
            >
              <option value="all">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
            <button 
              onClick={handleRefresh}
              className={`${theme.buttonClass} flex items-center gap-2 px-4 py-2 text-sm`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </button>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Total Projects</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Ongoing Projects</div>
              <div className="text-2xl font-bold text-blue-600">{stats.ongoing}</div>
            </div>
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Completed Projects</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </div>
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Pending Projects</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Delayed Projects</div>
              <div className="text-2xl font-bold text-red-600">{stats.delayed}</div>
            </div>
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Average Progress</div>
              <div className="text-2xl font-bold text-purple-600">{stats.avgProgress.toFixed(1)}%</div>
            </div>
          </div>

          {/* Budget Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Total Budget</div>
              <div className="text-2xl font-bold text-gray-900">
                ₱{stats.totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="profile-card p-4">
              <div className="text-sm text-gray-600 mb-1">Utilized Budget</div>
              <div className={`text-2xl font-bold text-${theme.primaryColor}-600`}>
                ₱{stats.utilizedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className={`absolute inset-0 border-4 border-${theme.primaryColor}-600 rounded-full border-t-transparent animate-spin`}></div>
              </div>
            </div>
          )}
          
          {/* Charts Container */}
          {!loading && (
            <div className="space-y-6">
              {/* Row 1: Status Distribution and Category Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="profile-card p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Project Status Distribution</h4>
                  <div className="h-64">
                    <canvas id="statusDistributionChart"></canvas>
                  </div>
                </div>
                
                <div className="profile-card p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Project Category Distribution</h4>
                  <div className="h-64">
                    <canvas id="categoryDistributionChart"></canvas>
                  </div>
                </div>
              </div>
              
              {/* Row 2: Project Growth and Monthly Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="profile-card p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Project Growth Over Time</h4>
                  <div className="h-64">
                    <canvas id="projectGrowthChart"></canvas>
                  </div>
                </div>
                
                <div className="profile-card p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Monthly Project Trends</h4>
                  <div className="h-64">
                    <canvas id="monthlyTrendsChart"></canvas>
                  </div>
                </div>
              </div>
              
              {/* Row 3: Budget Utilization and Progress Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="profile-card p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Top 10 Projects by Budget</h4>
                  <div className="h-80">
                    <canvas id="budgetUtilizationChart"></canvas>
                  </div>
                </div>
                
                <div className="profile-card p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Progress Distribution</h4>
                  <div className="h-64">
                    <canvas id="progressDistributionChart"></canvas>
                  </div>
                </div>
              </div>
              
              {/* Row 4: Priority Distribution */}
              <div className="grid grid-cols-1 gap-6">
                <div className="profile-card p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Priority Distribution</h4>
                  <div className="h-64">
                    <canvas id="priorityDistributionChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectAnalyticsDashboard;


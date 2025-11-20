import { useState, useEffect } from 'react';

/**
 * ProjectInsightsCenter - Analytics and insights dashboard for projects
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 */
export default function ProjectInsightsCenter({
  theme = 'amber',
  projects = []
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all'); // all, month, quarter, year
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  // Theme colors
  const themeColors = {
    amber: {
      button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
      accent: 'text-amber-600',
      border: 'border-amber-200',
      bg: 'bg-amber-50'
    },
    emerald: {
      button: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      accent: 'text-emerald-600',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50'
    },
    sky: {
      button: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
      accent: 'text-sky-600',
      border: 'border-sky-200',
      bg: 'bg-sky-50'
    },
    blue: {
      button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      accent: 'text-blue-600',
      border: 'border-blue-200',
      bg: 'bg-blue-50'
    }
  };

  const colors = themeColors[theme] || themeColors.amber;

  // Calculate insights
  const calculateInsights = () => {
    if (!projects || projects.length === 0) {
      return null;
    }

    const filteredProjects = filterProjectsByTimeRange(projects, selectedTimeRange);
    
    // Overall statistics
    const totalProjects = filteredProjects.length;
    const ongoingProjects = filteredProjects.filter(p => p.status === 'ongoing' || p.status === 'delayed').length;
    const completedProjects = filteredProjects.filter(p => p.status === 'complete').length;
    const delayedProjects = filteredProjects.filter(p => p.status === 'delayed').length;
    const pendingProjects = filteredProjects.filter(p => p.status === 'pending').length;
    const notStartedProjects = filteredProjects.filter(p => !p.status || p.status === 'not_started' || (p.status === 'pending' && !p.startDate)).length;

    // Budget statistics
    const totalBudget = filteredProjects.reduce((sum, p) => sum + parseFloat(p.totalBudget || 0), 0);
    const utilizedBudget = filteredProjects.reduce((sum, p) => {
      const budget = parseFloat(p.totalBudget || 0);
      const progress = parseFloat(p.progress?.budget || p.budgetProgress || 0);
      return sum + (budget * progress / 100);
    }, 0);
    const remainingBudget = totalBudget - utilizedBudget;
    const budgetUtilizationRate = totalBudget > 0 ? (utilizedBudget / totalBudget) * 100 : 0;

    // Progress statistics
    const avgProgress = filteredProjects.reduce((sum, p) => {
      const progress = parseFloat(p.progress?.overall || p.overallProgress || 0);
      return sum + progress;
    }, 0) / totalProjects;

    // Category distribution
    const categoryDistribution = {};
    filteredProjects.forEach(p => {
      const category = p.category || 'other';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });

    // Priority distribution
    const priorityDistribution = {
      high: filteredProjects.filter(p => p.priority === 'high').length,
      medium: filteredProjects.filter(p => p.priority === 'medium').length,
      low: filteredProjects.filter(p => p.priority === 'low').length
    };

    // Timeline analysis
    const onTimeProjects = filteredProjects.filter(p => {
      if (p.status === 'complete' && p.endDate && p.targetCompletionDate) {
        return new Date(p.endDate) <= new Date(p.targetCompletionDate);
      }
      return false;
    }).length;

    const overdueProjects = filteredProjects.filter(p => {
      if (p.status !== 'complete' && p.targetCompletionDate) {
        return new Date() > new Date(p.targetCompletionDate);
      }
      return false;
    }).length;

    // Top performing projects
    const topProjects = [...filteredProjects]
      .sort((a, b) => {
        const progressA = parseFloat(a.progress?.overall || a.overallProgress || 0);
        const progressB = parseFloat(b.progress?.overall || b.overallProgress || 0);
        return progressB - progressA;
      })
      .slice(0, 5);

    // Projects needing attention
    const needsAttention = filteredProjects.filter(p => {
      const progress = parseFloat(p.progress?.overall || p.overallProgress || 0);
      return p.status === 'delayed' || (progress < 50 && p.status === 'ongoing');
    }).slice(0, 5);

    // Calculate monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthProjects = filteredProjects.filter(p => {
        const createdDate = new Date(p.createdAt || p.createdDate);
        return createdDate >= monthStart && createdDate <= monthEnd;
      });
      
      monthlyTrends.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count: monthProjects.length,
        completed: monthProjects.filter(p => p.status === 'complete').length
      });
    }

    // Status distribution for pie chart
    const statusDistribution = {
      'Not Started': notStartedProjects,
      'Pending': pendingProjects,
      'Ongoing': filteredProjects.filter(p => p.status === 'ongoing').length,
      'Delayed': delayedProjects,
      'Complete': completedProjects
    };

    return {
      totalProjects,
      ongoingProjects,
      activeProjects: ongoingProjects, // Keep for backward compatibility
      completedProjects,
      delayedProjects,
      pendingProjects,
      notStartedProjects,
      totalBudget,
      utilizedBudget,
      remainingBudget,
      budgetUtilizationRate,
      avgProgress,
      categoryDistribution,
      priorityDistribution,
      onTimeProjects,
      overdueProjects,
      topProjects,
      needsAttention,
      monthlyTrends,
      statusDistribution
    };
  };

  // Filter projects by time range
  const filterProjectsByTimeRange = (projectsList, range) => {
    if (range === 'all') return projectsList;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return projectsList;
    }
    
    return projectsList.filter(p => {
      const createdDate = new Date(p.createdAt || p.createdDate);
      return createdDate >= startDate;
    });
  };

  // Update insights when projects or time range changes
  useEffect(() => {
    if (showModal) {
      setLoading(true);
      setTimeout(() => {
        const calculatedInsights = calculateInsights();
        setInsights(calculatedInsights);
        setLoading(false);
      }, 300);
    }
  }, [projects, selectedTimeRange, showModal]);

  // Format budget
  const formatBudget = (amount) => {
    if (!amount) return '₱0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectInsightsCenter = {
        openModal: () => setShowModal(true),
        closeModal: () => setShowModal(false),
        getInsights: () => insights
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectInsightsCenter) {
        delete window.projectInsightsCenter;
      }
    };
  }, [insights]);

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Project Insights & Analytics</h3>
              <p className="text-white/90 text-sm mt-1">Comprehensive analytics and performance metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none pr-8 cursor-pointer hover:bg-white/30 transition-all"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
                >
                  <option value="all" className="bg-gray-800 text-white">All Time</option>
                  <option value="month" className="bg-gray-800 text-white">Last Month</option>
                  <option value="quarter" className="bg-gray-800 text-white">Last Quarter</option>
                  <option value="year" className="bg-gray-800 text-white">Last Year</option>
                </select>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-sm text-blue-700 font-medium">Total Projects</div>
                  <div className="text-3xl font-bold text-blue-900 mt-1">{insights.totalProjects}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-sm text-green-700 font-medium">Ongoing Projects</div>
                  <div className="text-3xl font-bold text-green-900 mt-1">{insights.ongoingProjects}</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                  <div className="text-sm text-yellow-700 font-medium">Pending</div>
                  <div className="text-3xl font-bold text-yellow-900 mt-1">{insights.pendingProjects}</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <div className="text-sm text-gray-700 font-medium">Not Started</div>
                  <div className="text-3xl font-bold text-gray-900 mt-1">{insights.notStartedProjects}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-sm text-purple-700 font-medium">Completed</div>
                  <div className="text-3xl font-bold text-purple-900 mt-1">{insights.completedProjects}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <div className="text-sm text-red-700 font-medium">Delayed</div>
                  <div className="text-3xl font-bold text-red-900 mt-1">{insights.delayedProjects}</div>
                </div>
              </div>

              {/* Budget Analytics */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Budget Analytics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Budget</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{formatBudget(insights.totalBudget)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Utilized</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">{formatBudget(insights.utilizedBudget)}</div>
                    <div className="text-xs text-gray-500 mt-1">{insights.budgetUtilizationRate.toFixed(1)}% utilized</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Remaining</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{formatBudget(insights.remainingBudget)}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(insights.budgetUtilizationRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Progress Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Average Progress</h4>
                  <div className="flex items-center gap-4">
                    <div className="relative w-32 h-32">
                      <svg className="transform -rotate-90 w-32 h-32">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - insights.avgProgress / 100)}`}
                          className="text-amber-600 transition-all duration-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900">{insights.avgProgress.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">On Time</span>
                        <span className="font-semibold text-gray-900">{insights.onTimeProjects}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Overdue</span>
                        <span className="font-semibold text-red-600">{insights.overdueProjects}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">High</span>
                        <span className="text-sm font-semibold text-gray-900">{insights.priorityDistribution.high}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(insights.priorityDistribution.high / insights.totalProjects) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Medium</span>
                        <span className="text-sm font-semibold text-gray-900">{insights.priorityDistribution.medium}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(insights.priorityDistribution.medium / insights.totalProjects) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Low</span>
                        <span className="text-sm font-semibold text-gray-900">{insights.priorityDistribution.low}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(insights.priorityDistribution.low / insights.totalProjects) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Projects & Needs Attention */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Projects</h4>
                  <div className="space-y-3">
                    {insights.topProjects.map((project, index) => {
                      const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
                      return (
                        <div key={project.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-700 rounded-full font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{project.name}</div>
                            <div className="text-xs text-gray-500">{progress.toFixed(1)}% complete</div>
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h4>
                  <div className="space-y-3">
                    {insights.needsAttention.length > 0 ? (
                      insights.needsAttention.map((project) => {
                        const progress = parseFloat(project.progress?.overall || project.overallProgress || 0);
                        return (
                          <div key={project.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200">
                            <div className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded-full">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{project.name}</div>
                              <div className="text-xs text-red-600">{project.status === 'delayed' ? 'Delayed' : `${progress.toFixed(1)}% - Low Progress`}</div>
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">All projects are on track! 🎉</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Projects by Category</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(insights.categoryDistribution).map(([category, count]) => (
                    <div key={category} className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-600 capitalize mt-1">{category}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={() => setShowModal(false)}
            className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


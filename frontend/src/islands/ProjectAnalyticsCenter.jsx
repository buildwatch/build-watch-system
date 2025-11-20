import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

/**
 * ProjectAnalyticsCenter - Project statistics and analytics widget
 * Shows project progress, milestones, messages, and time remaining
 */
export default function ProjectAnalyticsCenter({ 
  projectId,
  theme = 'green',
  onClose 
}) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const themeColors = {
    green: {
      primary: 'bg-green-500',
      primaryHover: 'hover:bg-green-600',
      primaryLight: 'bg-green-50',
      primaryText: 'text-green-700',
      primaryBorder: 'border-green-200',
      progress: 'bg-green-500'
    },
    orange: {
      primary: 'bg-orange-500',
      primaryHover: 'hover:bg-orange-600',
      primaryLight: 'bg-orange-50',
      primaryText: 'text-orange-700',
      primaryBorder: 'border-orange-200',
      progress: 'bg-orange-500'
    },
    blue: {
      primary: 'bg-blue-500',
      primaryHover: 'hover:bg-blue-600',
      primaryLight: 'bg-blue-50',
      primaryText: 'text-blue-700',
      primaryBorder: 'border-blue-200',
      progress: 'bg-blue-500'
    },
    sky: {
      primary: 'bg-sky-500',
      primaryHover: 'hover:bg-sky-600',
      primaryLight: 'bg-sky-50',
      primaryText: 'text-sky-700',
      primaryBorder: 'border-sky-200',
      progress: 'bg-sky-500'
    }
  };

  const colors = themeColors[theme] || themeColors.green;

  useEffect(() => {
    if (!projectId) return;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        if (!token) return;

        const response = await axios.get(`${API_URL}/messages/analytics/project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setAnalytics(response.data.analytics);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
    
    // Refresh analytics every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const getTimeRemainingColor = (status) => {
    switch (status) {
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!projectId) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select a project to view analytics
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-4 text-center text-gray-500">
        Unable to load project analytics
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Project Analytics</h3>
          <p className="text-sm text-gray-500">{analytics.project.projectCode}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Timeline Progress</div>
          <div className="text-2xl font-bold text-gray-800">{analytics.progress.timeline.toFixed(1)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`${colors.progress} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(100, analytics.progress.timeline)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Budget Progress</div>
          <div className="text-2xl font-bold text-gray-800">{analytics.progress.budget.toFixed(1)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`${colors.progress} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(100, analytics.progress.budget)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Physical Progress</div>
          <div className="text-2xl font-bold text-gray-800">{analytics.progress.physical.toFixed(1)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`${colors.progress} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(100, analytics.progress.physical)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Overall Progress</div>
          <div className="text-2xl font-bold text-gray-800">{analytics.progress.overall.toFixed(1)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`${colors.progress} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(100, analytics.progress.overall)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Milestone Statistics */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h4>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analytics.milestones.total}</div>
            <div className="text-xs text-blue-600 mt-1">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{analytics.milestones.completed}</div>
            <div className="text-xs text-green-600 mt-1">Completed</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{analytics.milestones.pending}</div>
            <div className="text-xs text-yellow-600 mt-1">Pending</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{analytics.milestones.overdue}</div>
            <div className="text-xs text-red-600 mt-1">Overdue</div>
          </div>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Messages</div>
          <div className="text-xl font-bold text-gray-800">{analytics.messages}</div>
          <div className="text-xs text-gray-500 mt-1">Linked to project</div>
        </div>

        {analytics.timeRemaining && (
          <div className={`rounded-lg p-4 border-2 ${getTimeRemainingColor(analytics.timeRemaining.status)}`}>
            <div className="text-xs font-semibold mb-1">Time Remaining</div>
            <div className="text-xl font-bold">
              {analytics.timeRemaining.days < 0 
                ? `${Math.abs(analytics.timeRemaining.days)} days overdue`
                : `${analytics.timeRemaining.days} days`
              }
            </div>
            <div className="text-xs mt-1 opacity-75">
              {analytics.timeRemaining.status === 'overdue' ? '⚠️ Overdue' :
               analytics.timeRemaining.status === 'urgent' ? '🔴 Urgent' :
               analytics.timeRemaining.status === 'warning' ? '⚠️ Warning' :
               '✅ On Track'}
            </div>
          </div>
        )}

        {analytics.budget && analytics.budget.total > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 col-span-2">
            <div className="text-xs text-gray-500 mb-1">Total Budget</div>
            <div className="text-xl font-bold text-gray-800">{formatCurrency(analytics.budget.total)}</div>
          </div>
        )}
      </div>
    </div>
  );
}


import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

/**
 * ProjectAlertsCenter - Real-time project alerts and notifications
 * Shows project end dates, milestone due dates, and overdue items
 */
export default function ProjectAlertsCenter({ 
  theme = 'green',
  onAlertClick 
}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 });
  const modalRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const themeColors = {
    green: {
      primary: 'bg-green-500',
      primaryHover: 'hover:bg-green-600',
      primaryLight: 'bg-green-50',
      primaryText: 'text-green-700',
      primaryBorder: 'border-green-200',
      badge: 'bg-green-500'
    },
    orange: {
      primary: 'bg-orange-500',
      primaryHover: 'hover:bg-orange-600',
      primaryLight: 'bg-orange-50',
      primaryText: 'text-orange-700',
      primaryBorder: 'border-orange-200',
      badge: 'bg-orange-500'
    },
    blue: {
      primary: 'bg-blue-500',
      primaryHover: 'hover:bg-blue-600',
      primaryLight: 'bg-blue-50',
      primaryText: 'text-blue-700',
      primaryBorder: 'border-blue-200',
      badge: 'bg-blue-500'
    },
    sky: {
      primary: 'bg-sky-500',
      primaryHover: 'hover:bg-sky-600',
      primaryLight: 'bg-sky-50',
      primaryText: 'text-sky-700',
      primaryBorder: 'border-sky-200',
      badge: 'bg-sky-500'
    }
  };

  const colors = themeColors[theme] || themeColors.green;

  const loadAlerts = async () => {
    try {
      const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
      if (!token) return;

      const response = await axios.get(`${API_URL}/messages/alerts/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAlerts(response.data.alerts || []);
        setStats({
          total: response.data.total || 0,
          high: response.data.high || 0,
          medium: response.data.medium || 0,
          low: response.data.low || 0
        });
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    
    // Poll for alerts every 30 seconds (real-time updates)
    pollingIntervalRef.current = setInterval(() => {
      loadAlerts();
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const handleAlertClick = (alert) => {
    if (onAlertClick) {
      onAlertClick(alert);
    }
  };

  return (
    <>
      {/* Alerts Button with Badge */}
      <button
        onClick={() => setShowModal(true)}
        className={`relative p-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-all`}
        title="Project Alerts"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {stats.total > 0 && (
          <span className={`absolute -top-1 -right-1 ${colors.badge} text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse`}>
            {stats.total > 9 ? '9+' : stats.total}
          </span>
        )}
      </button>

      {/* Alerts Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className={`${colors.primary} text-white p-6 rounded-t-2xl flex items-center justify-between`}>
              <div>
                <h2 className="text-xl font-bold">Project Alerts</h2>
                <p className="text-sm opacity-90 mt-1">
                  {stats.total} total • {stats.high} high • {stats.medium} medium • {stats.low} low
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading alerts...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 text-lg">No alerts at this time</p>
                  <p className="text-gray-400 text-sm mt-2">All projects and milestones are on track</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 ${getSeverityColor(alert.severity).split(' ')[0]} p-2 rounded-lg`}>
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-sm">{alert.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              alert.severity === 'high' ? 'bg-red-200 text-red-800' :
                              alert.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm opacity-90 mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-xs opacity-75">
                            <span>📋 {alert.projectCode}</span>
                            {alert.daysRemaining !== undefined && (
                              <span>{alert.daysRemaining} day{alert.daysRemaining !== 1 ? 's' : ''} remaining</span>
                            )}
                            {alert.daysOverdue !== undefined && (
                              <span className="text-red-600 font-semibold">{alert.daysOverdue} day{alert.daysOverdue !== 1 ? 's' : ''} overdue</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className={`px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition-colors`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


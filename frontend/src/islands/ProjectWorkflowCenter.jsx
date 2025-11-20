import { useState, useEffect } from 'react';

/**
 * ProjectWorkflowCenter - Enhanced status workflow management
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 */
export default function ProjectWorkflowCenter({
  theme = 'amber',
  projects = []
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Theme colors
  const themeColors = {
    amber: {
      button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
      accent: 'text-amber-600',
      border: 'border-amber-200'
    },
    emerald: {
      button: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      accent: 'text-emerald-600',
      border: 'border-emerald-200'
    },
    sky: {
      button: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
      accent: 'text-sky-600',
      border: 'border-sky-200'
    },
    blue: {
      button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      accent: 'text-blue-600',
      border: 'border-blue-200'
    }
  };

  const colors = themeColors[theme] || themeColors.amber;

  // Status workflow definitions
  const statusWorkflow = {
    pending: {
      label: 'Pending',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      nextStatuses: ['ongoing', 'cancelled'],
      description: 'Project is pending approval or setup'
    },
    ongoing: {
      label: 'Ongoing',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      nextStatuses: ['complete', 'delayed', 'on_hold'],
      description: 'Project is actively in progress'
    },
    delayed: {
      label: 'Delayed',
      color: 'bg-red-100 text-red-700 border-red-300',
      nextStatuses: ['ongoing', 'on_hold', 'cancelled'],
      description: 'Project is behind schedule'
    },
    on_hold: {
      label: 'On Hold',
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      nextStatuses: ['ongoing', 'cancelled'],
      description: 'Project is temporarily paused'
    },
    complete: {
      label: 'Complete',
      color: 'bg-green-100 text-green-700 border-green-300',
      nextStatuses: [],
      description: 'Project has been completed'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      nextStatuses: [],
      description: 'Project has been cancelled'
    }
  };

  // Load workflow history from localStorage
  useEffect(() => {
    if (selectedProject) {
      loadWorkflowHistory(selectedProject.id);
    }
  }, [selectedProject]);

  const loadWorkflowHistory = (projectId) => {
    try {
      const saved = localStorage.getItem(`projectWorkflowHistory_${projectId}`);
      if (saved) {
        setWorkflowHistory(JSON.parse(saved));
      } else {
        // Initialize with current status if no history exists
        if (selectedProject) {
          const initialHistory = [{
            id: 'initial',
            fromStatus: null,
            toStatus: selectedProject.status,
            comment: 'Initial status',
            changedBy: 'system',
            changedAt: selectedProject.createdAt || new Date().toISOString()
          }];
          setWorkflowHistory(initialHistory);
          saveWorkflowHistory(projectId, initialHistory);
        } else {
          setWorkflowHistory([]);
        }
      }
    } catch (e) {
      console.error('Error loading workflow history:', e);
      setWorkflowHistory([]);
    }
  };

  const saveWorkflowHistory = (projectId, history) => {
    try {
      localStorage.setItem(`projectWorkflowHistory_${projectId}`, JSON.stringify(history));
      setWorkflowHistory(history);
    } catch (e) {
      console.error('Error saving workflow history:', e);
    }
  };

  // Update project status
  const handleStatusUpdate = async () => {
    if (!newStatus || !selectedProject) {
      alert('Please select a new status');
      return;
    }

    if (newStatus === selectedProject.status) {
      alert('Project is already in this status');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';

      // Update project status in backend
      const response = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...selectedProject,
          status: newStatus
        })
      });

      if (response.ok) {
        // Add to workflow history
        const historyEntry = {
          id: Date.now().toString(),
          fromStatus: selectedProject.status,
          toStatus: newStatus,
          comment: statusComment.trim() || 'Status updated',
          changedBy: 'current-user-id', // This should come from auth context
          changedAt: new Date().toISOString()
        };

        const updatedHistory = [...workflowHistory, historyEntry];
        saveWorkflowHistory(selectedProject.id, updatedHistory);

        // Update selected project
        setSelectedProject({ ...selectedProject, status: newStatus });
        setNewStatus('');
        setStatusComment('');

        // Refresh page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error('Failed to update project status');
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      alert('Error updating project status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get current status info
  const getCurrentStatusInfo = () => {
    if (!selectedProject) return null;
    return statusWorkflow[selectedProject.status] || statusWorkflow.pending;
  };

  // Get available next statuses
  const getAvailableNextStatuses = () => {
    if (!selectedProject) return [];
    const currentStatusInfo = statusWorkflow[selectedProject.status];
    if (!currentStatusInfo) return [];
    return currentStatusInfo.nextStatuses.map(status => ({
      value: status,
      ...statusWorkflow[status]
    }));
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectWorkflowCenter = {
        openModal: (project) => {
          setSelectedProject(project);
          setShowModal(true);
        },
        closeModal: () => {
          setShowModal(false);
          setSelectedProject(null);
          setNewStatus('');
          setStatusComment('');
        },
        getWorkflowHistory: (projectId) => {
          try {
            const saved = localStorage.getItem(`projectWorkflowHistory_${projectId}`);
            return saved ? JSON.parse(saved) : [];
          } catch (e) {
            return [];
          }
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectWorkflowCenter) {
        delete window.projectWorkflowCenter;
      }
    };
  }, [workflowHistory, selectedProject]);

  if (!showModal) {
    return null;
  }

  const currentStatusInfo = getCurrentStatusInfo();
  const availableNextStatuses = getAvailableNextStatuses();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Project Workflow Management</h3>
              <p className="text-white/90 text-sm mt-1">
                {selectedProject ? selectedProject.name : 'Manage project status and workflow'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedProject(null);
                setNewStatus('');
                setStatusComment('');
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedProject ? (
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{selectedProject.name}</h4>
                      <p className="text-sm text-gray-500">{selectedProject.projectCode}</p>
                    </div>
                  </div>
                  {currentStatusInfo && (
                    <span className={`px-4 py-2 rounded-full border font-medium ${currentStatusInfo.color}`}>
                      {currentStatusInfo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Update Form */}
              {availableNextStatuses.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select new status...</option>
                        {availableNextStatuses.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label} - {status.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Comment (Optional)</label>
                      <textarea
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="Add a comment about this status change..."
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={loading || !newStatus}
                      className={`w-full px-6 py-3 ${colors.button} text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              )}

              {/* Workflow History */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Workflow History</h4>
                {workflowHistory.length > 0 ? (
                  <div className="space-y-3">
                    {workflowHistory.slice().reverse().map((entry, index) => {
                      const fromStatusInfo = entry.fromStatus ? statusWorkflow[entry.fromStatus] : null;
                      const toStatusInfo = statusWorkflow[entry.toStatus];
                      
                      return (
                        <div key={entry.id} className="bg-white rounded-xl p-5 border-2 border-gray-200">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                index === 0 ? 'bg-amber-100' : 'bg-gray-100'
                              }`}>
                                {index === 0 ? (
                                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                  </svg>
                                ) : (
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                              {index < workflowHistory.length - 1 && (
                                <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {fromStatusInfo && (
                                  <>
                                    <span className={`px-2 py-1 text-xs font-medium rounded border ${fromStatusInfo.color}`}>
                                      {fromStatusInfo.label}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                  </>
                                )}
                                <span className={`px-2 py-1 text-xs font-medium rounded border ${toStatusInfo?.color || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                  {toStatusInfo?.label || entry.toStatus}
                                </span>
                              </div>
                              {entry.comment && (
                                <p className="text-sm text-gray-600 mb-2">{entry.comment}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {new Date(entry.changedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>No workflow history available</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <p>Select a project to manage workflow</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={() => {
              setShowModal(false);
              setSelectedProject(null);
              setNewStatus('');
              setStatusComment('');
            }}
            className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


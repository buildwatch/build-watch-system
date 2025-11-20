import { useState, useEffect } from 'react';

// Add CSS for animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes drawWarning {
      from {
        stroke-dashoffset: 100;
      }
      to {
        stroke-dashoffset: 0;
      }
    }
    
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
  `;
  if (!document.head.querySelector('style[data-archiving-animations]')) {
    style.setAttribute('data-archiving-animations', 'true');
    document.head.appendChild(style);
  }
}

/**
 * ProjectArchivingCenter - Project archiving and restoration system
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 */
export default function ProjectArchivingCenter({
  theme = 'amber',
  projects = []
}) {
  const [showModal, setShowModal] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'archived'
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  // Load archived projects from localStorage
  useEffect(() => {
    loadArchivedProjects();
  }, []);

  const loadArchivedProjects = () => {
    try {
      const saved = localStorage.getItem('archivedProjects');
      if (saved) {
        setArchivedProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading archived projects:', e);
    }
  };

  const saveArchivedProjects = (archived) => {
    try {
      localStorage.setItem('archivedProjects', JSON.stringify(archived));
      setArchivedProjects(archived);
    } catch (e) {
      console.error('Error saving archived projects:', e);
    }
  };

  // Check if project can be archived
  const canArchive = (project) => {
    if (!project) return false;
    const status = project.status?.toLowerCase();
    // Only allow archiving for "pending" and "complete" statuses
    return status === 'pending' || status === 'complete';
  };

  // Check if project is already archived
  const isAlreadyArchived = (projectId) => {
    return archivedProjects.some(p => p.id === projectId);
  };

  // Archive a project
  const handleArchive = async () => {
    if (!selectedProject) return;
    
    // Check if project can be archived
    if (!canArchive(selectedProject)) {
      setWarningMessage('Only projects with "Pending" or "Complete" status can be archived.');
      setShowWarningModal(true);
      return;
    }

    // Check if already archived
    if (isAlreadyArchived(selectedProject.id)) {
      setWarningMessage('This project is already archived.');
      setShowWarningModal(true);
      return;
    }

    if (!archiveReason.trim()) {
      setWarningMessage('Please provide a reason for archiving this project');
      setShowWarningModal(true);
      return;
    }

    // Show loading modal
    setShowLoadingModal(true);
    setLoading(true);
    
    try {
      const archivedProject = {
        ...selectedProject,
        archivedAt: new Date().toISOString(),
        archivedReason: archiveReason.trim(),
        archivedBy: 'current-user-id' // This should come from auth context
      };

      const updatedArchived = [...archivedProjects, archivedProject];
      saveArchivedProjects(updatedArchived);

      // Update project status in backend (optional)
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      
      try {
        await fetch(`${API_URL}/projects/${selectedProject.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...selectedProject,
            status: 'archived'
          })
        });
      } catch (e) {
        console.warn('Could not update project status in backend:', e);
      }

      // Hide loading modal and show success modal
      setShowLoadingModal(false);
      setShowSuccessModal(true);
      
      // After 2 seconds, close modals and refresh
      setTimeout(() => {
        setShowSuccessModal(false);
        setShowModal(false);
        setSelectedProject(null);
        setArchiveReason('');
        
        // Hide archived projects from table
        if (window.hideArchivedProject) {
          window.hideArchivedProject(selectedProject.id);
        }
        
        // Refresh page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('Error archiving project:', error);
      setShowLoadingModal(false);
      setErrorMessage('Error archiving project: ' + error.message);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Restore a project
  const handleRestore = async (project) => {
    if (!confirm(`Are you sure you want to restore "${project.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const updatedArchived = archivedProjects.filter(p => p.id !== project.id);
      saveArchivedProjects(updatedArchived);

      // Update project status in backend (optional)
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      
      try {
        await fetch(`${API_URL}/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...project,
            status: project.status === 'complete' ? 'complete' : 'ongoing'
          })
        });
      } catch (e) {
        console.warn('Could not update project status in backend:', e);
      }

      // Refresh page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error restoring project:', error);
      alert('Error restoring project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Permanently delete archived project
  const handlePermanentDelete = async (project) => {
    if (!confirm(`Are you sure you want to permanently delete "${project.name}"? This action cannot be undone!`)) {
      return;
    }

    if (!confirm('This will permanently remove the project. Are you absolutely sure?')) {
      return;
    }

    setLoading(true);
    try {
      const updatedArchived = archivedProjects.filter(p => p.id !== project.id);
      saveArchivedProjects(updatedArchived);

      // Optionally delete from backend
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      
      try {
        await fetch(`${API_URL}/projects/${project.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.warn('Could not delete project from backend:', e);
      }

      // Refresh page
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if project is archived
  const isArchived = (projectId) => {
    return archivedProjects.some(p => p.id === projectId);
  };

  // View archived project details
  const handleViewProject = (project) => {
    if (window.viewProjectDetails) {
      window.viewProjectDetails(project.id);
      setShowModal(false);
    } else {
      alert('Project details viewer not available');
    }
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectArchivingCenter = {
        openModal: (project) => {
          setSelectedProject(project);
          setShowModal(true);
          setViewMode('active');
        },
        openArchivedView: () => {
          setSelectedProject(null);
          setShowModal(true);
          setViewMode('archived');
        },
        closeModal: () => {
          setShowModal(false);
          setSelectedProject(null);
          setArchiveReason('');
        },
        showWarningModal: (message) => {
          setWarningMessage(message);
          setShowWarningModal(true);
        },
        isArchived,
        canArchive,
        isAlreadyArchived,
        getArchivedProjects: () => archivedProjects,
        restoreProject: handleRestore,
        deleteProject: handlePermanentDelete,
        viewProject: handleViewProject
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectArchivingCenter) {
        delete window.projectArchivingCenter;
      }
    };
  }, [archivedProjects, selectedProject]);

  // Render warning modal independently (can show even when main modal is closed)
  if (showWarningModal && !showModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-100 px-6 py-5 border-b border-amber-200 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Warning</h3>
                <p className="text-sm text-gray-600 mt-0.5">Archive restriction notice</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              {/* Animated Warning Icon */}
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-14 h-14 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeDasharray: 100, strokeDashoffset: 100, animation: 'drawWarning 0.8s ease-out forwards' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
              </div>
              
              {/* Message */}
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 mb-6 w-full">
                <p className="text-gray-700 text-base leading-relaxed font-medium">{warningMessage}</p>
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setWarningMessage('');
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Archive Project</h3>
              <p className="text-white/90 text-sm mt-1">
                {selectedProject ? selectedProject.name : 'Archive or restore projects'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
                className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-all"
              >
                {viewMode === 'active' ? 'View Archived' : 'View Active'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedProject(null);
                  setArchiveReason('');
                }}
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
          {viewMode === 'active' ? (
            selectedProject ? (
              <div className="space-y-6">
                {!canArchive(selectedProject) ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <div>
                        <h4 className="font-semibold text-red-900">Cannot Archive This Project</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Only projects with "Pending" or "Complete" status can be archived. Current status: <strong>{selectedProject.status}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isAlreadyArchived(selectedProject.id) ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                      <div>
                        <h4 className="font-semibold text-yellow-900">Already Archived</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          This project is already archived. Switch to "View Archived" to see it.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                      <div>
                        <h4 className="font-semibold text-amber-900">Archive Project</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Archiving will move this project to the archived section. You can restore it later if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {canArchive(selectedProject) && !isAlreadyArchived(selectedProject.id) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for Archiving <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={archiveReason}
                      onChange={(e) => setArchiveReason(e.target.value)}
                      placeholder="e.g., Project completed, cancelled, or no longer relevant..."
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Project Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Project Code:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedProject.projectCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-medium text-gray-900 capitalize">{selectedProject.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <span className="ml-2 font-medium text-gray-900 capitalize">{selectedProject.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Budget:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        ₱{parseFloat(selectedProject.totalBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                </svg>
                <p>Select a project to archive</p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Archived Projects ({archivedProjects.length})</h4>
              {archivedProjects.length > 0 ? (
                archivedProjects.map((project) => (
                  <div key={project.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                          </svg>
                          <div>
                            <h5 className="font-semibold text-gray-900">{project.name}</h5>
                            <p className="text-sm text-gray-500">{project.projectCode}</p>
                          </div>
                        </div>
                        {project.archivedReason && (
                          <p className="text-sm text-gray-600 mt-2 ml-8">Reason: {project.archivedReason}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2 ml-8">
                          Archived on {new Date(project.archivedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewProject(project)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleRestore(project)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(project)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                  </svg>
                  <p>No archived projects</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
          {viewMode === 'active' && selectedProject && (
            <>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedProject(null);
                  setArchiveReason('');
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
                    {canArchive(selectedProject) && !isAlreadyArchived(selectedProject.id) && (
                      <button
                        onClick={handleArchive}
                        disabled={loading || !archiveReason.trim()}
                        className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {loading ? 'Archiving...' : 'Archive Project'}
                      </button>
                    )}
            </>
          )}
          {viewMode === 'archived' && (
            <button
              onClick={() => {
                setShowModal(false);
                setViewMode('active');
              }}
              className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all`}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Archiving Project...</h3>
              <p className="text-gray-600 text-center">Please wait while we archive the project</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Project Archived Successfully!</h3>
              <p className="text-gray-600 text-center">The project has been moved to the archived section</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Archive Failed</h3>
              <p className="text-gray-600 text-center mb-4">{errorMessage}</p>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setErrorMessage('');
                }}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal (when main modal is open) */}
      {showWarningModal && showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 px-6 py-5 border-b border-amber-200 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Warning</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Archive restriction notice</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* Animated Warning Icon */}
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-14 h-14 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeDasharray: 100, strokeDashoffset: 100, animation: 'drawWarning 0.8s ease-out forwards' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                </div>
                
                {/* Message */}
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 mb-6 w-full">
                  <p className="text-gray-700 text-base leading-relaxed font-medium">{warningMessage}</p>
                </div>
                
                {/* Action Button */}
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    setWarningMessage('');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


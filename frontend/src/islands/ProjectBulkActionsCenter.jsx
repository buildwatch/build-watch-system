import { useState, useEffect } from 'react';

/**
 * ProjectBulkActionsCenter - Centralized component for bulk operations on projects
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 * @param {Function} onBulkAction - Callback when bulk action is performed
 */
export default function ProjectBulkActionsCenter({
  theme = 'amber',
  projects = [],
  onBulkAction = null
}) {
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [eiuPersonnelId, setEiuPersonnelId] = useState('');
  const [eiuValidation, setEiuValidation] = useState({ valid: false, name: '' });
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

  // Toggle project selection
  const toggleSelection = (projectId) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
    updateCheckboxes(newSelected);
  };

  // Select all visible projects
  const selectAll = () => {
    const visibleProjects = getVisibleProjectIds();
    const newSelected = new Set(visibleProjects);
    setSelectedProjects(newSelected);
    updateCheckboxes(newSelected);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedProjects(new Set());
    updateCheckboxes(new Set());
  };

  // Get visible project IDs (from both card and table views)
  const getVisibleProjectIds = () => {
    const ids = new Set();
    
    // Get from card view
    const cardWrappers = document.querySelectorAll('#projectsGrid .project-card-wrapper:not([style*="display: none"])');
    cardWrappers.forEach(wrapper => {
      const projectId = wrapper.getAttribute('data-project-id');
      if (projectId) ids.add(projectId);
    });

    // Get from table view
    const tableRows = document.querySelectorAll('#projectsTableBody tr[data-project-id]:not([style*="display: none"])');
    tableRows.forEach(row => {
      const projectId = row.getAttribute('data-project-id');
      if (projectId) ids.add(projectId);
    });

    return Array.from(ids);
  };

  // Update checkbox states
  const updateCheckboxes = (selected) => {
    // Update card view checkboxes
    const cardCheckboxes = document.querySelectorAll('#projectsGrid .project-checkbox');
    cardCheckboxes.forEach(checkbox => {
      checkbox.checked = selected.has(checkbox.value);
    });

    // Update table view checkboxes
    const tableCheckboxes = document.querySelectorAll('#projectsTableBody .project-checkbox');
    tableCheckboxes.forEach(checkbox => {
      checkbox.checked = selected.has(checkbox.value);
    });

    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllProjects');
    if (selectAllCheckbox) {
      const visibleProjects = getVisibleProjectIds();
      selectAllCheckbox.checked = visibleProjects.length > 0 && visibleProjects.every(id => selected.has(id));
      selectAllCheckbox.indeterminate = selected.size > 0 && selected.size < visibleProjects.length;
    }
  };

  // Handle bulk status change
  const handleBulkStatusChange = async () => {
    if (selectedProjects.size === 0) {
      alert('Please select at least one project');
      return;
    }

    if (!newStatus) {
      alert('Please select a status');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      const projectIds = Array.from(selectedProjects);

      // Update each project
      const updatePromises = projectIds.map(async (projectId) => {
        try {
          // First get the project to preserve other fields
          const getResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!getResponse.ok) {
            throw new Error(`Failed to fetch project ${projectId}`);
          }

          const getData = await getResponse.json();
          if (!getData.success) {
            throw new Error(`Project ${projectId} not found`);
          }

          // Update only the status
          const updateResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...getData.project,
              status: newStatus
            })
          });

          if (!updateResponse.ok) {
            throw new Error(`Failed to update project ${projectId}`);
          }

          return { success: true, projectId };
        } catch (error) {
          console.error(`Error updating project ${projectId}:`, error);
          return { success: false, projectId, error: error.message };
        }
      });

      const results = await Promise.all(updatePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed > 0) {
        alert(`Updated ${successful} project(s). ${failed} project(s) failed to update.`);
      } else {
        alert(`Successfully updated ${successful} project(s) to "${newStatus}" status`);
      }

      // Call callback if provided
      if (onBulkAction && typeof onBulkAction === 'function') {
        onBulkAction('status', { status: newStatus, projectIds: Array.from(selectedProjects) });
      }

      // Refresh page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error in bulk status change:', error);
      alert('Error updating projects: ' + error.message);
    } finally {
      setLoading(false);
      setShowStatusModal(false);
      setNewStatus('');
    }
  };

  // Handle bulk EIU assignment
  const validateEIUAccount = async () => {
    if (!eiuPersonnelId.trim()) {
      setEiuValidation({ valid: false, name: '' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';

      const response = await fetch(`${API_URL}/auth/validate-eiu/${eiuPersonnelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setEiuValidation({ valid: true, name: data.user.name || 'Valid EIU Account' });
        } else {
          setEiuValidation({ valid: false, name: 'Invalid EIU Account' });
        }
      } else {
        setEiuValidation({ valid: false, name: 'Validation failed' });
      }
    } catch (error) {
      console.error('Error validating EIU:', error);
      setEiuValidation({ valid: false, name: 'Validation error' });
    }
  };

  const handleBulkAssign = async () => {
    if (selectedProjects.size === 0) {
      alert('Please select at least one project');
      return;
    }

    if (!eiuPersonnelId.trim()) {
      alert('Please enter EIU Personnel ID');
      return;
    }

    if (!eiuValidation.valid) {
      alert('Please validate the EIU account first');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      const projectIds = Array.from(selectedProjects);

      // Update each project
      const updatePromises = projectIds.map(async (projectId) => {
        try {
          // Get the project
          const getResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!getResponse.ok) {
            throw new Error(`Failed to fetch project ${projectId}`);
          }

          const getData = await getResponse.json();
          if (!getData.success) {
            throw new Error(`Project ${projectId} not found`);
          }

          // Update EIU assignment
          const updateResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...getData.project,
              eiuPersonnelId: eiuPersonnelId.trim(),
              hasExternalPartner: true
            })
          });

          if (!updateResponse.ok) {
            throw new Error(`Failed to update project ${projectId}`);
          }

          return { success: true, projectId };
        } catch (error) {
          console.error(`Error updating project ${projectId}:`, error);
          return { success: false, projectId, error: error.message };
        }
      });

      const results = await Promise.all(updatePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed > 0) {
        alert(`Assigned ${successful} project(s). ${failed} project(s) failed to update.`);
      } else {
        alert(`Successfully assigned ${successful} project(s) to EIU: ${eiuValidation.name}`);
      }

      // Call callback if provided
      if (onBulkAction && typeof onBulkAction === 'function') {
        onBulkAction('assign', { eiuPersonnelId, projectIds: Array.from(selectedProjects) });
      }

      // Refresh page
      window.location.reload();
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      alert('Error assigning projects: ' + error.message);
    } finally {
      setLoading(false);
      setShowAssignModal(false);
      setEiuPersonnelId('');
      setEiuValidation({ valid: false, name: '' });
    }
  };

  // Handle bulk archive
  const handleBulkArchive = async () => {
    if (selectedProjects.size === 0) {
      alert('Please select at least one project');
      return;
    }

    if (!confirm(`Are you sure you want to archive ${selectedProjects.size} project(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      const projectIds = Array.from(selectedProjects);

      // Update each project status to 'archived'
      const updatePromises = projectIds.map(async (projectId) => {
        try {
          const getResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!getResponse.ok) {
            throw new Error(`Failed to fetch project ${projectId}`);
          }

          const getData = await getResponse.json();
          if (!getData.success) {
            throw new Error(`Project ${projectId} not found`);
          }

          const updateResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...getData.project,
              status: 'archived',
              archivedAt: new Date().toISOString()
            })
          });

          if (!updateResponse.ok) {
            throw new Error(`Failed to archive project ${projectId}`);
          }

          return { success: true, projectId };
        } catch (error) {
          console.error(`Error archiving project ${projectId}:`, error);
          return { success: false, projectId, error: error.message };
        }
      });

      const results = await Promise.all(updatePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed > 0) {
        alert(`Archived ${successful} project(s). ${failed} project(s) failed.`);
      } else {
        alert(`Successfully archived ${successful} project(s)`);
      }

      // Call callback if provided
      if (onBulkAction && typeof onBulkAction === 'function') {
        onBulkAction('archive', { projectIds: Array.from(selectedProjects) });
      }

      // Refresh page
      window.location.reload();
    } catch (error) {
      console.error('Error in bulk archive:', error);
      alert('Error archiving projects: ' + error.message);
    } finally {
      setLoading(false);
      setShowArchiveModal(false);
    }
  };

  // Handle bulk export
  const handleBulkExport = () => {
    if (selectedProjects.size === 0) {
      alert('Please select at least one project');
      return;
    }

    const selectedProjectsData = projects.filter(p => selectedProjects.has(p.id));
    
    if (window.projectExportCenter && typeof window.projectExportCenter.export === 'function') {
      // Temporarily override the data
      const originalData = window.projectExportCenter.data;
      window.projectExportCenter.data = selectedProjectsData;
      window.projectExportCenter.export();
      window.projectExportCenter.data = originalData;
    } else {
      alert('Export functionality not available');
    }
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectBulkActionsCenter = {
        toggleSelection,
        selectAll,
        deselectAll,
        getSelectedCount: () => selectedProjects.size,
        getSelectedIds: () => Array.from(selectedProjects),
        clearSelection: deselectAll
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectBulkActionsCenter) {
        delete window.projectBulkActionsCenter;
      }
    };
  }, [selectedProjects]);

  // Auto-update checkboxes when selection changes
  useEffect(() => {
    updateCheckboxes(selectedProjects);
  }, [selectedProjects]);

  if (selectedProjects.size === 0) {
    return null; // Don't show bulk actions if nothing is selected
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${colors.button} text-white px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center gap-4 animate-slide-up`}>
        <div className="flex items-center gap-3">
          <div className="bg-white/20 px-4 py-2 rounded-lg">
            <span className="font-semibold">{selectedProjects.size} selected</span>
          </div>
          <div className="h-6 w-px bg-white/30"></div>
          <button
            onClick={() => setShowBulkMenu(!showBulkMenu)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all flex items-center gap-2"
          >
            Bulk Actions
            <svg className={`w-4 h-4 transition-transform ${showBulkMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
        <button
          onClick={deselectAll}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all"
        >
          Clear
        </button>
      </div>

      {/* Bulk Actions Menu */}
      {showBulkMenu && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 min-w-[300px] overflow-hidden">
          <div className="p-2">
            <button
              onClick={() => {
                setShowStatusModal(true);
                setShowBulkMenu(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-3"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="font-medium text-gray-900">Change Status</span>
            </button>
            <button
              onClick={() => {
                setShowAssignModal(true);
                setShowBulkMenu(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-3"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <span className="font-medium text-gray-900">Assign EIU</span>
            </button>
            <button
              onClick={() => {
                setShowArchiveModal(true);
                setShowBulkMenu(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-3"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
              </svg>
              <span className="font-medium text-gray-900">Archive Projects</span>
            </button>
            <button
              onClick={handleBulkExport}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-3"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span className="font-medium text-gray-900">Export Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className={`${colors.button} p-6 text-white rounded-t-2xl`}>
              <h3 className="text-xl font-bold">Change Status</h3>
              <p className="text-white/90 text-sm mt-1">{selectedProjects.size} project(s) selected</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="delayed">Delayed</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </div>
            <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus('');
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkStatusChange}
                disabled={loading || !newStatus}
                className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold disabled:opacity-50`}
              >
                {loading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign EIU Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className={`${colors.button} p-6 text-white rounded-t-2xl`}>
              <h3 className="text-xl font-bold">Assign EIU</h3>
              <p className="text-white/90 text-sm mt-1">{selectedProjects.size} project(s) selected</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">EIU Personnel ID *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={eiuPersonnelId}
                    onChange={(e) => {
                      setEiuPersonnelId(e.target.value);
                      setEiuValidation({ valid: false, name: '' });
                    }}
                    placeholder="Enter EIU Unique User ID"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={validateEIUAccount}
                    className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold whitespace-nowrap`}
                  >
                    Validate
                  </button>
                </div>
                {eiuValidation.name && (
                  <p className={`text-sm mt-2 ${eiuValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {eiuValidation.name}
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setEiuPersonnelId('');
                  setEiuValidation({ valid: false, name: '' });
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={loading || !eiuValidation.valid}
                className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold disabled:opacity-50`}
              >
                {loading ? 'Assigning...' : 'Assign EIU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-red-500 p-6 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">Archive Projects</h3>
              <p className="text-white/90 text-sm mt-1">{selectedProjects.size} project(s) will be archived</p>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to archive {selectedProjects.size} project(s)? Archived projects will be moved to the archive section and can be restored later.
              </p>
            </div>
            <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkArchive}
                disabled={loading}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'Archiving...' : 'Archive Projects'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


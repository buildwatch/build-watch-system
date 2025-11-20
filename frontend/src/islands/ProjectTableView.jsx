import { useState, useEffect } from 'react';

/**
 * ProjectTableView - Advanced table component with column visibility and inline editing
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 * @param {Function} onProjectUpdate - Callback when project is updated
 */
export default function ProjectTableView({
  theme = 'amber',
  projects = [],
  onProjectUpdate = null
}) {
  const [visibleColumns, setVisibleColumns] = useState({
    project: true,
    category: true,
    status: true,
    budget: true,
    progress: true,
    timeline: true,
    location: true,
    actions: true
  });
  const [editingCell, setEditingCell] = useState(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  // Load column visibility from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('projectTableColumns');
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading column visibility:', e);
      }
    }
  }, []);

  // Save column visibility to localStorage
  const saveColumnVisibility = (newVisibility) => {
    setVisibleColumns(newVisibility);
    localStorage.setItem('projectTableColumns', JSON.stringify(newVisibility));
  };

  // Toggle column visibility
  const toggleColumn = (columnKey) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    saveColumnVisibility(newVisibility);
  };
  
  // Toggle column menu
  const toggleColumnMenu = () => {
    setShowColumnMenu(prev => !prev);
  };

  // Open column menu
  const openColumnMenu = () => {
    setShowColumnMenu(true);
  };

  // Close column menu
  const closeColumnMenu = () => {
    setShowColumnMenu(false);
  };

  // Handle inline editing
  const startEditing = (projectId, field, currentValue) => {
    setEditingCell({ projectId, field, value: currentValue });
  };

  const saveEdit = async (projectId, field, newValue) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';

      // Get current project data
      const getResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!getResponse.ok) {
        throw new Error('Failed to fetch project');
      }

      const getData = await getResponse.json();
      if (!getData.success || !getData.project) {
        throw new Error('Project not found');
      }

      // Update the field
      const updateData = {
        ...getData.project,
        [field]: newValue
      };

      const updateResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update project');
      }

      setEditingCell(null);
      
      if (onProjectUpdate) {
        onProjectUpdate(projectId, field, newValue);
      }

      // Refresh page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Update column visibility in DOM
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const table = document.getElementById('projectsTable');
      if (table) {
        Object.entries(visibleColumns).forEach(([key, visible]) => {
          const columns = table.querySelectorAll(`.column-${key}`);
          columns.forEach(col => {
            if (visible) {
              col.style.display = '';
              col.classList.remove('hidden');
            } else {
              col.style.display = 'none';
              col.classList.add('hidden');
            }
          });
        });
      }
    }
  }, [visibleColumns]);

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectTableView = {
        toggleColumn,
        getVisibleColumns: () => visibleColumns,
        startEditing,
        saveEdit,
        cancelEdit,
        handleSort,
        toggleColumnMenu,
        openColumnMenu,
        closeColumnMenu,
        isColumnMenuOpen: () => showColumnMenu
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectTableView) {
        delete window.projectTableView;
      }
    };
  }, [visibleColumns, editingCell, sortConfig, showColumnMenu]);

  return (
    <>
      {/* Modern Column Visibility Modal */}
      {showColumnMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowColumnMenu(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${colors.button} p-6 rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Column Visibility</h3>
                  <p className="text-white/90 text-sm mt-1">Choose which columns to display in the table</p>
                </div>
                <button
                  onClick={() => setShowColumnMenu(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {Object.entries(visibleColumns).map(([key, visible]) => (
                  <label 
                    key={key} 
                    className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      visible 
                        ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleColumn(key)}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 cursor-pointer transition-all"
                      />
                      {visible && (
                        <svg 
                          className="absolute top-0 left-0 w-5 h-5 text-amber-600 pointer-events-none" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm font-semibold capitalize ${
                        visible ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {key === 'project' ? 'Project Name' : 
                         key === 'category' ? 'Category' :
                         key === 'status' ? 'Status' :
                         key === 'budget' ? 'Budget' :
                         key === 'progress' ? 'Progress' :
                         key === 'timeline' ? 'Timeline' :
                         key === 'location' ? 'Location' :
                         key === 'actions' ? 'Actions' : key}
                      </span>
                      {!visible && (
                        <p className="text-xs text-gray-400 mt-0.5">Hidden from table</p>
                      )}
                    </div>
                    {visible && (
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 flex items-center justify-between">
              <button
                onClick={() => {
                  const allVisible = Object.keys(visibleColumns).reduce((acc, key) => {
                    acc[key] = true;
                    return acc;
                  }, {});
                  saveColumnVisibility(allVisible);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                Show All
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowColumnMenu(false)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowColumnMenu(false)}
                  className={`px-6 py-2.5 ${colors.button} text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl`}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


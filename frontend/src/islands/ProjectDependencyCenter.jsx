import { useState, useEffect } from 'react';

/**
 * ProjectDependencyCenter - Track project relationships and dependencies
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 */
export default function ProjectDependencyCenter({
  theme = 'amber',
  projects = []
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [newDependency, setNewDependency] = useState({ projectId: '', type: 'blocks', description: '' });
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

  // Dependency types
  const dependencyTypes = [
    { value: 'blocks', label: 'Blocks', description: 'This project must complete before the other can start', color: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'depends_on', label: 'Depends On', description: 'This project depends on the other project', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 'related', label: 'Related', description: 'Projects are related but not dependent', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'similar', label: 'Similar', description: 'Similar projects that can share resources', color: 'bg-purple-100 text-purple-700 border-purple-300' }
  ];

  // Load dependencies from localStorage
  useEffect(() => {
    if (selectedProject) {
      loadDependencies(selectedProject.id);
    }
  }, [selectedProject]);

  const loadDependencies = (projectId) => {
    try {
      const saved = localStorage.getItem(`projectDependencies_${projectId}`);
      if (saved) {
        setDependencies(JSON.parse(saved));
      } else {
        setDependencies([]);
      }
    } catch (e) {
      console.error('Error loading dependencies:', e);
      setDependencies([]);
    }
  };

  const saveDependencies = (projectId, deps) => {
    try {
      localStorage.setItem(`projectDependencies_${projectId}`, JSON.stringify(deps));
      setDependencies(deps);
    } catch (e) {
      console.error('Error saving dependencies:', e);
    }
  };

  // Add dependency
  const handleAddDependency = () => {
    if (!newDependency.projectId || !newDependency.type) {
      alert('Please select a project and dependency type');
      return;
    }

    const dependentProject = projects.find(p => p.id === newDependency.projectId);
    if (!dependentProject) {
      alert('Selected project not found');
      return;
    }

    // Check for circular dependencies
    if (newDependency.projectId === selectedProject.id) {
      alert('A project cannot depend on itself');
      return;
    }

    const dependency = {
      id: Date.now().toString(),
      projectId: newDependency.projectId,
      projectName: dependentProject.name,
      projectCode: dependentProject.projectCode,
      type: newDependency.type,
      description: newDependency.description.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedDependencies = [...dependencies, dependency];
    saveDependencies(selectedProject.id, updatedDependencies);
    
    setNewDependency({ projectId: '', type: 'blocks', description: '' });
  };

  // Remove dependency
  const handleRemoveDependency = (dependencyId) => {
    if (!confirm('Are you sure you want to remove this dependency?')) {
      return;
    }

    const updatedDependencies = dependencies.filter(d => d.id !== dependencyId);
    saveDependencies(selectedProject.id, updatedDependencies);
  };

  // Get available projects (exclude current project)
  const getAvailableProjects = () => {
    if (!selectedProject) return [];
    return projects.filter(p => p.id !== selectedProject.id);
  };

  // Get dependency type info
  const getDependencyTypeInfo = (type) => {
    return dependencyTypes.find(dt => dt.value === type) || dependencyTypes[0];
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectDependencyCenter = {
        openModal: (project) => {
          setSelectedProject(project);
          setShowModal(true);
        },
        closeModal: () => {
          setShowModal(false);
          setSelectedProject(null);
          setNewDependency({ projectId: '', type: 'blocks', description: '' });
        },
        getDependencies: (projectId) => {
          try {
            const saved = localStorage.getItem(`projectDependencies_${projectId}`);
            return saved ? JSON.parse(saved) : [];
          } catch (e) {
            return [];
          }
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectDependencyCenter) {
        delete window.projectDependencyCenter;
      }
    };
  }, [dependencies, selectedProject]);

  if (!showModal) {
    return null;
  }

  const availableProjects = getAvailableProjects();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Project Dependencies</h3>
              <p className="text-white/90 text-sm mt-1">
                {selectedProject ? selectedProject.name : 'Manage project relationships and dependencies'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedProject(null);
                setNewDependency({ projectId: '', type: 'blocks', description: '' });
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
              </div>

              {/* Add Dependency Form */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Dependency</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Related Project</label>
                    <select
                      value={newDependency.projectId}
                      onChange={(e) => setNewDependency({ ...newDependency, projectId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select a project...</option>
                      {availableProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.projectCode} - {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dependency Type</label>
                    <select
                      value={newDependency.type}
                      onChange={(e) => setNewDependency({ ...newDependency, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {dependencyTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {getDependencyTypeInfo(newDependency.type).description}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                    <textarea
                      value={newDependency.description}
                      onChange={(e) => setNewDependency({ ...newDependency, description: e.target.value })}
                      placeholder="Add notes about this dependency..."
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleAddDependency}
                    className={`w-full px-6 py-3 ${colors.button} text-white rounded-lg font-semibold transition-all`}
                  >
                    Add Dependency
                  </button>
                </div>
              </div>

              {/* Dependencies List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Dependencies ({dependencies.length})
                </h4>
                {dependencies.length > 0 ? (
                  <div className="space-y-3">
                    {dependencies.map((dependency) => {
                      const typeInfo = getDependencyTypeInfo(dependency.type);
                      return (
                        <div key={dependency.id} className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-amber-300 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${typeInfo.color}`}>
                                  {typeInfo.label}
                                </span>
                                <h5 className="font-semibold text-gray-900">{dependency.projectName}</h5>
                                <span className="text-xs text-gray-500">({dependency.projectCode})</span>
                              </div>
                              {dependency.description && (
                                <p className="text-sm text-gray-600 mt-2">{dependency.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Added {new Date(dependency.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveDependency(dependency.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-4"
                              title="Remove dependency"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                    </svg>
                    <p>No dependencies added yet. Add dependencies above to track project relationships.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <p>Select a project to manage dependencies</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={() => {
              setShowModal(false);
              setSelectedProject(null);
              setNewDependency({ projectId: '', type: 'blocks', description: '' });
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


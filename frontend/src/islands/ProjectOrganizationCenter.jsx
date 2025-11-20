import { useState, useEffect } from 'react';

/**
 * ProjectOrganizationCenter - Centralized component for project organization (folders, tags, bookmarks)
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 * @param {Function} onOrganizationChange - Callback when organization changes
 */
export default function ProjectOrganizationCenter({
  theme = 'amber',
  projects = [],
  onOrganizationChange = null
}) {
  const [showModal, setShowModal] = useState(false);
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [bookmarkedProjects, setBookmarkedProjects] = useState(new Set());
  const [selectedProject, setSelectedProject] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
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

  // Load organization data from localStorage
  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = () => {
    try {
      const savedFolders = localStorage.getItem('projectFolders');
      const savedTags = localStorage.getItem('projectTags');
      const savedBookmarks = localStorage.getItem('projectBookmarks');
      const savedProjectFolders = localStorage.getItem('projectFolderAssignments');
      const savedProjectTags = localStorage.getItem('projectTagAssignments');

      if (savedFolders) {
        setFolders(JSON.parse(savedFolders));
      }
      if (savedTags) {
        setTags(JSON.parse(savedTags));
      }
      if (savedBookmarks) {
        setBookmarkedProjects(new Set(JSON.parse(savedBookmarks)));
      }
    } catch (e) {
      console.error('Error loading organization data:', e);
    }
  };

  const saveOrganizationData = () => {
    try {
      localStorage.setItem('projectFolders', JSON.stringify(folders));
      localStorage.setItem('projectTags', JSON.stringify(tags));
      localStorage.setItem('projectBookmarks', JSON.stringify(Array.from(bookmarkedProjects)));
    } catch (e) {
      console.error('Error saving organization data:', e);
    }
  };

  // Create folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      color: '#F28C00', // Default amber color
      createdAt: new Date().toISOString(),
      projectCount: 0
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    setNewFolderName('');
    saveOrganizationData();
  };

  // Delete folder
  const handleDeleteFolder = (folderId) => {
    if (!confirm('Are you sure you want to delete this folder? Projects will not be deleted, only the folder organization.')) {
      return;
    }

    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    
    // Remove folder assignments from projects
    const savedAssignments = JSON.parse(localStorage.getItem('projectFolderAssignments') || '{}');
    Object.keys(savedAssignments).forEach(projectId => {
      if (savedAssignments[projectId] === folderId) {
        delete savedAssignments[projectId];
      }
    });
    localStorage.setItem('projectFolderAssignments', JSON.stringify(savedAssignments));
    
    saveOrganizationData();
  };

  // Create tag
  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      alert('Please enter a tag name');
      return;
    }

    const newTag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: '#3B82F6', // Default blue color
      createdAt: new Date().toISOString()
    };

    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    setNewTagName('');
    saveOrganizationData();
  };

  // Delete tag
  const handleDeleteTag = (tagId) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all projects.')) {
      return;
    }

    const updatedTags = tags.filter(t => t.id !== tagId);
    setTags(updatedTags);
    
    // Remove tag from all projects
    const savedAssignments = JSON.parse(localStorage.getItem('projectTagAssignments') || '{}');
    Object.keys(savedAssignments).forEach(projectId => {
      savedAssignments[projectId] = savedAssignments[projectId].filter(tid => tid !== tagId);
      if (savedAssignments[projectId].length === 0) {
        delete savedAssignments[projectId];
      }
    });
    localStorage.setItem('projectTagAssignments', JSON.stringify(savedAssignments));
    
    saveOrganizationData();
  };

  // Toggle bookmark
  const handleToggleBookmark = (projectId) => {
    const newBookmarks = new Set(bookmarkedProjects);
    if (newBookmarks.has(projectId)) {
      newBookmarks.delete(projectId);
    } else {
      newBookmarks.add(projectId);
    }
    setBookmarkedProjects(newBookmarks);
    saveOrganizationData();
    
    if (onOrganizationChange) {
      onOrganizationChange('bookmark', { projectId, bookmarked: newBookmarks.has(projectId) });
    }
  };

  // Assign project to folder
  const handleAssignToFolder = (projectId, folderId) => {
    const savedAssignments = JSON.parse(localStorage.getItem('projectFolderAssignments') || '{}');
    if (folderId) {
      savedAssignments[projectId] = folderId;
    } else {
      delete savedAssignments[projectId];
    }
    localStorage.setItem('projectFolderAssignments', JSON.stringify(savedAssignments));
    
    if (onOrganizationChange) {
      onOrganizationChange('folder', { projectId, folderId });
    }
  };

  // Assign tags to project
  const handleAssignTags = (projectId, tagIds) => {
    const savedAssignments = JSON.parse(localStorage.getItem('projectTagAssignments') || '{}');
    if (tagIds.length > 0) {
      savedAssignments[projectId] = tagIds;
    } else {
      delete savedAssignments[projectId];
    }
    localStorage.setItem('projectTagAssignments', JSON.stringify(savedAssignments));
    
    if (onOrganizationChange) {
      onOrganizationChange('tags', { projectId, tagIds });
    }
  };

  // Get project folder
  const getProjectFolder = (projectId) => {
    const savedAssignments = JSON.parse(localStorage.getItem('projectFolderAssignments') || '{}');
    const folderId = savedAssignments[projectId];
    return folders.find(f => f.id === folderId);
  };

  // Get project tags
  const getProjectTags = (projectId) => {
    const savedAssignments = JSON.parse(localStorage.getItem('projectTagAssignments') || '{}');
    const tagIds = savedAssignments[projectId] || [];
    return tags.filter(t => tagIds.includes(t.id));
  };

  // Check if project is bookmarked
  const isBookmarked = (projectId) => {
    return bookmarkedProjects.has(projectId);
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectOrganizationCenter = {
        toggleBookmark: handleToggleBookmark,
        assignToFolder: handleAssignToFolder,
        assignTags: handleAssignTags,
        getProjectFolder,
        getProjectTags,
        isBookmarked,
        openModal: (project) => {
          setSelectedProject(project);
          if (project) {
            const folder = getProjectFolder(project.id);
            const projectTags = getProjectTags(project.id);
            setSelectedFolder(folder?.id || '');
            setSelectedTags(projectTags.map(t => t.id));
          }
          setShowModal(true);
        },
        closeModal: () => {
          setShowModal(false);
          setSelectedProject(null);
          setSelectedFolder('');
          setSelectedTags([]);
        },
        getFolders: () => folders,
        getTags: () => tags
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectOrganizationCenter) {
        delete window.projectOrganizationCenter;
      }
    };
  }, [folders, tags, bookmarkedProjects, selectedProject]);

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Organize Project</h3>
              <p className="text-white/90 text-sm mt-1">
                {selectedProject ? selectedProject.name : 'Project Organization'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedProject(null);
                setSelectedFolder('');
                setSelectedTags([]);
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Bookmarks */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Bookmarks</h4>
            {selectedProject && (
              <button
                onClick={() => handleToggleBookmark(selectedProject.id)}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  isBookmarked(selectedProject.id)
                    ? 'bg-amber-50 border-amber-500 text-amber-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-amber-300'
                }`}
              >
                <svg className="w-5 h-5" fill={isBookmarked(selectedProject.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
                {isBookmarked(selectedProject.id) ? 'Bookmarked' : 'Add to Bookmarks'}
              </button>
            )}
          </div>

          {/* Folders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-900">Folders</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="New folder name"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleCreateFolder}
                  className={`px-4 py-1.5 ${colors.button} text-white rounded-lg text-sm font-semibold`}
                >
                  Create
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <button
                onClick={() => {
                  if (selectedProject) handleAssignToFolder(selectedProject.id, '');
                  setSelectedFolder('');
                }}
                className={`w-full px-4 py-2 rounded-lg border-2 transition-all text-left ${
                  selectedFolder === '' ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-gray-300 hover:border-amber-300'
                }`}
              >
                No Folder
              </button>
              {folders.map((folder) => (
                <div key={folder.id} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedProject) handleAssignToFolder(selectedProject.id, folder.id);
                      setSelectedFolder(folder.id);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                      selectedFolder === folder.id ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-gray-300 hover:border-amber-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    {folder.name}
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-900">Tags</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                  placeholder="New tag name"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleCreateTag}
                  className={`px-4 py-1.5 ${colors.button} text-white rounded-lg text-sm font-semibold`}
                >
                  Create
                </button>
              </div>
            </div>
            {selectedProject && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">Select tags for this project:</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const newSelected = isSelected
                            ? selectedTags.filter(tid => tid !== tag.id)
                            : [...selectedTags, tag.id];
                          setSelectedTags(newSelected);
                          handleAssignTags(selectedProject.id, newSelected);
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {tag.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={() => {
              setShowModal(false);
              setSelectedProject(null);
              setSelectedFolder('');
              setSelectedTags([]);
            }}
            className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}


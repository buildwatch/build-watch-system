import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

/**
 * ProjectContextCenter - Component for managing project context in messaging
 * Allows users to link messages to projects and filter conversations by project
 */
export default function ProjectContextCenter({ 
  onProjectSelect, 
  selectedProjectId, 
  currentUserId,
  recipientId = null, // NEW: Filter projects to only show shared projects
  theme = 'green' 
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Fetch user's projects based on role-based access control
  // If recipientId is provided, only fetch shared projects
  useEffect(() => {
    if (!currentUserId) return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        
        if (!token) {
          console.error('No authentication token found');
          setProjects([]);
          setLoading(false);
          return;
        }

        // If recipientId is provided, fetch only shared projects
        // Otherwise, fetch all accessible projects
        const endpoint = recipientId 
          ? `${API_URL}/projects/messaging/shared/${recipientId}`
          : `${API_URL}/projects/messaging`;

        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          // Projects are filtered by the backend (either role-based or shared)
          setProjects(response.data.projects || []);
        } else {
          console.error('Failed to fetch projects:', response.data.error);
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentUserId, recipientId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name?.toLowerCase().includes(query) ||
      project.projectCode?.toLowerCase().includes(query) ||
      project.location?.toLowerCase().includes(query)
    );
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleProjectSelect = (project) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    }
    // Store project in window for MessagingCenter to access
    if (project && typeof window !== 'undefined') {
      if (!window.messagingProjects) {
        window.messagingProjects = [];
      }
      const exists = window.messagingProjects.find(p => p.id === project.id);
      if (!exists) {
        window.messagingProjects.push(project);
      }
    }
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleClearProject = () => {
    if (onProjectSelect) {
      onProjectSelect(null);
    }
    setShowDropdown(false);
    setSearchQuery('');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ongoing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'delayed': return 'bg-red-500';
      case 'complete': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const themeColors = {
    green: {
      button: 'bg-green-500 hover:bg-green-600',
      selected: 'bg-green-100 border-green-500',
      text: 'text-green-700'
    },
    orange: {
      button: 'bg-orange-500 hover:bg-orange-600',
      selected: 'bg-orange-100 border-orange-500',
      text: 'text-orange-700'
    },
    blue: {
      button: 'bg-blue-500 hover:bg-blue-600',
      selected: 'bg-blue-100 border-blue-500',
      text: 'text-blue-700'
    },
    sky: {
      button: 'bg-sky-500 hover:bg-sky-600',
      selected: 'bg-sky-100 border-sky-500',
      text: 'text-sky-700'
    }
  };

  const colors = themeColors[theme] || themeColors.green;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Project Selector Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all
          ${selectedProjectId 
            ? `${colors.selected} border-2 ${colors.text} font-medium` 
            : `${colors.button} text-white`
          }
        `}
        title={selectedProjectId ? 'Change linked project' : 'Link to project'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {selectedProjectId && selectedProject ? (
          <span className="text-sm font-medium truncate max-w-[150px]">
            {selectedProject.projectCode || selectedProject.name}
          </span>
        ) : (
          <span className="text-sm">Link Project</span>
        )}
        {selectedProjectId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearProject();
            }}
            className="ml-1 hover:bg-white/20 rounded p-0.5"
            title="Clear project link"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Link to Project</h3>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Projects List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm">Loading projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">
                  {searchQuery ? 'No projects found' : 'No projects available'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`
                      w-full text-left p-3 rounded-lg mb-1 transition-all
                      ${selectedProjectId === project.id
                        ? `${colors.selected} border-2 ${colors.text}`
                        : 'hover:bg-gray-100 border-2 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800 truncate">
                            {project.projectCode || 'N/A'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(project.status)}`}>
                            {project.status || 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{project.name}</p>
                        {project.location && (
                          <p className="text-xs text-gray-500 mt-1">{project.location}</p>
                        )}
                      </div>
                      {selectedProjectId === project.id && (
                        <svg className="w-5 h-5 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


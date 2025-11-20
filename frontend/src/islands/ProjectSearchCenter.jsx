import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

/**
 * ProjectSearchCenter - Smart project search component
 * Searches across project-linked messages, projects, and project data
 */
export default function ProjectSearchCenter({ 
  onResultSelect, 
  projectId = null,
  theme = 'green' 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  const themeColors = {
    green: {
      primary: 'bg-green-500',
      primaryHover: 'hover:bg-green-600',
      primaryLight: 'bg-green-50',
      primaryText: 'text-green-700',
      primaryBorder: 'border-green-200'
    },
    orange: {
      primary: 'bg-orange-500',
      primaryHover: 'hover:bg-orange-600',
      primaryLight: 'bg-orange-50',
      primaryText: 'text-orange-700',
      primaryBorder: 'border-orange-200'
    },
    blue: {
      primary: 'bg-blue-500',
      primaryHover: 'hover:bg-blue-600',
      primaryLight: 'bg-blue-50',
      primaryText: 'text-blue-700',
      primaryBorder: 'border-blue-200'
    },
    sky: {
      primary: 'bg-sky-500',
      primaryHover: 'hover:bg-sky-600',
      primaryLight: 'bg-sky-50',
      primaryText: 'text-sky-700',
      primaryBorder: 'border-sky-200'
    }
  };

  const colors = themeColors[theme] || themeColors.green;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target) && 
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }

    try {
      setLoading(true);
      const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
      
      const params = { query: query.trim(), limit: 20 };
      if (projectId) {
        params.projectId = projectId;
      }

      const response = await axios.get(`${API_URL}/messages/search/project`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setResults(response.data.results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleResultClick = (result, type) => {
    if (onResultSelect) {
      onResultSelect(result, type);
    }
    setShowResults(false);
    setSearchQuery('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search projects, messages..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => {
            if (results) setShowResults(true);
          }}
          className={`w-full px-4 py-2 pl-10 bg-white/20 text-white placeholder-white/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/30`}
        />
        <svg 
          className="w-5 h-5 absolute left-3 top-2.5 text-white/70" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/70"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && results && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
        >
          {/* Messages Results */}
          {results.messages && results.messages.length > 0 && (
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Messages ({results.messages.length})</h3>
              <div className="space-y-2">
                {results.messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => handleResultClick(msg, 'message')}
                    className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {msg.project && (
                          <div className="text-xs text-gray-500 mb-1">
                            📋 {msg.project.projectCode}
                          </div>
                        )}
                        <p className="text-sm text-gray-800 line-clamp-2">{msg.content}</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {msg.sender?.name} • {formatDate(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects Results */}
          {results.projects && results.projects.length > 0 && (
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Projects ({results.projects.length})</h3>
              <div className="space-y-2">
                {results.projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleResultClick(project, 'project')}
                    className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-800">{project.projectCode}</div>
                        <div className="text-xs text-gray-600 truncate">{project.name}</div>
                        {project.location && (
                          <div className="text-xs text-gray-400 mt-1">📍 {project.location}</div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'complete' ? 'bg-green-100 text-green-700' :
                        project.status === 'delayed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {(!results.messages || results.messages.length === 0) && 
           (!results.projects || results.projects.length === 0) && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}


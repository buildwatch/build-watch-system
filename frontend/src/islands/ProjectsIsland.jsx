import React, { useEffect, useState } from 'react';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import L from 'leaflet';

// Fix for default markers in react-leaflet
// import L from 'leaflet';
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// Custom markers for different project statuses
const createCustomIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

const STATUS_COLORS = {
  'ongoing': '#10B981', // green
  'completed': '#3B82F6', // blue
  'delayed': '#EF4444', // red
  'planning': '#F59E0B', // yellow
  'on hold': '#F97316', // orange
  'default': '#6B7280' // gray
};

// Status Analytics Component
function StatusAnalytics({ projects }) {
  const getStatusCounts = () => {
    const counts = {};
    projects.forEach(project => {
      const status = project.status?.toLowerCase() || 'default';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  const getTotalBudget = () => {
    return projects.reduce((total, project) => {
      const budget = Number(project.budget || project.totalBudget);
      return total + (isNaN(budget) ? 0 : budget);
    }, 0);
  };

  const getAverageProgress = () => {
    const validProjects = projects.filter(p => !isNaN(Number(p.progress)) && p.progress !== undefined && p.progress !== null);
    if (validProjects.length === 0) return 0;
    return Math.round(validProjects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / validProjects.length);
  };

  const statusCounts = getStatusCounts();
  const totalBudget = getTotalBudget();
  const averageProgress = getAverageProgress();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-[#EB3C3C] mb-4">Project Analytics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#EB3C3C]">{projects.length}</div>
          <div className="text-xs text-gray-600">Total Projects</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{statusCounts.ongoing || 0}</div>
          <div className="text-xs text-gray-600">Ongoing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.completed || 0}</div>
          <div className="text-xs text-gray-600">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{averageProgress}%</div>
          <div className="text-xs text-gray-600">Avg Progress</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-lg font-bold text-[#EB3C3C]">
            {new Intl.NumberFormat('en-PH', {
              style: 'currency',
              currency: 'PHP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(totalBudget)}
          </div>
          <div className="text-xs text-gray-600">Total Budget</div>
        </div>
      </div>
    </div>
  );
}

// Map Legend Component
function MapLegend() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-[#EB3C3C] mb-3">Project Status Legend</h4>
      <div className="space-y-2">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-xs text-gray-700 capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// API configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Santa Cruz, Laguna coordinates (approximate center)
const SANTA_CRUZ_CENTER = [14.2783, 121.4153];

const VIEW_OPTIONS = [
  { key: 'table', label: 'Table', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>
  ) },
  { key: 'grid', label: 'Grid', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>
  ) },
  { key: 'hybrid', label: 'Hybrid', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M12 3v18" stroke="#EB3C3C" strokeWidth="2"/></svg>
  ) },
  { key: 'map', label: 'Map', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7"><path d="M3 6l9-4 9 4M4 10v10a1 1 0 001 1h3a1 1 0 001-1v-6a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 001 1h3a1 1 0 001-1V10" /></svg>
  ) },
];

// Generate mock coordinates for projects (in real app, these would come from the database)
const generateProjectCoordinates = (projectId, location) => {
  const baseLat = SANTA_CRUZ_CENTER[0];
  const baseLng = SANTA_CRUZ_CENTER[1];
  const idNum = Number(projectId);
  if (isNaN(idNum)) {
    // Fallback to center if id is invalid
    return [baseLat, baseLng];
  }
  const latOffset = (idNum % 10 - 5) * 0.01;
  const lngOffset = (idNum % 7 - 3) * 0.01;
  return [baseLat + latOffset, baseLng + lngOffset];
};

function ProjectCard({ proj }) {
  // Format budget for display
  const formatBudget = (budget) => {
    if (!budget) return 'N/A';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(budget);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ongoing': return 'bg-green-200 text-green-800';
      case 'completed': return 'bg-blue-200 text-blue-800';
      case 'delayed': return 'bg-red-200 text-red-800';
      case 'planning': return 'bg-yellow-200 text-yellow-800';
      case 'on hold': return 'bg-orange-200 text-orange-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  // Handle project card click
  const handleProjectClick = () => {
    window.location.href = `/project/${proj.id}`;
  };

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col w-full border border-[#EB3C3C]/10 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
      onClick={handleProjectClick}
    >
      <div className="h-32 w-full bg-gray-200 flex items-center justify-center">
        <span className="text-3xl text-[#EB3C3C]">🏗️</span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-bold text-[#EB3C3C] mb-2 line-clamp-2 hover:text-[#D63333] transition-colors">{proj.name || 'Project Name'}</h3>
        <div className="text-[#7A1F1F] text-xs mb-1"><b>Location:</b> {proj.location || 'N/A'}</div>
        <div className="text-[#7A1F1F] text-xs mb-1"><b>Office:</b> {proj.implementingUnitName || 'N/A'}</div>
        <div className="text-[#7A1F1F] text-xs mb-1"><b>Budget:</b> {formatBudget(proj.budget)}</div>
        {proj.fundingSource && (
          <div className="text-[#7A1F1F] text-xs mb-1"><b>Source:</b> {proj.fundingSource}</div>
        )}
        <div className="text-[#7A1F1F] text-xs mb-1">
          <b>Status:</b> 
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ml-1 ${getStatusColor(proj.status)}`}>
            {proj.status || 'Not Started'}
          </span>
        </div>
        <div className="text-[#7A1F1F] text-xs mb-1"><b>Progress:</b> {proj.progress || 0}%</div>
        <div className="text-[#7A1F1F] text-xs mt-2"><b>Start:</b> {formatDate(proj.startDate)}</div>
        
        {/* Click indicator */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Click to view details</span>
            <svg className="w-4 h-4 text-[#EB3C3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ErrorBoundary for map rendering
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Map rendering error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-red-200">
          <div className="text-4xl mb-2 text-red-400">🗺️</div>
          <div className="text-red-600 font-bold mb-2">Map failed to load</div>
          <div className="text-gray-500 text-xs">{this.state.error?.message || 'Unknown error'}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MiniMap({ projects, isFullMap = false }) {
  const [leaflet, setLeaflet] = React.useState(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    async function loadLeaflet() {
      if (typeof window !== 'undefined') {
        const [leafletModule, leafletCss, L] = await Promise.all([
          import('react-leaflet'),
          import('leaflet/dist/leaflet.css'),
          import('leaflet')
        ]);
        // Fix for default markers in react-leaflet
        delete L.default.Icon.Default.prototype._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
        if (isMounted) {
          setLeaflet({
            ...leafletModule,
            L: L.default
          });
        }
      }
    }
    loadLeaflet();
    return () => { isMounted = false; };
  }, []);

  if (!leaflet) {
    return (
      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EB3C3C] mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = leaflet;

  // Custom markers for different project statuses
  const createCustomIcon = (color) => {
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-marker',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  };

  const STATUS_COLORS = {
    'ongoing': '#10B981', // green
    'completed': '#3B82F6', // blue
    'delayed': '#EF4444', // red
    'planning': '#F59E0B', // yellow
    'on hold': '#F97316', // orange
    'default': '#6B7280' // gray
  };

  const projectMarkers = projects.map(proj => {
    const coords = generateProjectCoordinates(proj.id, proj.location);
    const status = proj.status?.toLowerCase() || 'default';
    const color = STATUS_COLORS[status] || STATUS_COLORS.default;
    return {
      id: proj.id,
      name: proj.name,
      location: proj.location,
      status: proj.status,
      budget: proj.budget,
      progress: proj.progress || proj.overallProgress || 0,
      coordinates: coords,
      color: color
    };
  }).filter(marker => Array.isArray(marker.coordinates) && marker.coordinates.length === 2 && marker.coordinates.every(c => typeof c === 'number' && !isNaN(c)));

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 bg-white relative z-0">
      {/* Loading state for map */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EB3C3C] mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      <MapContainer
        center={SANTA_CRUZ_CENTER}
        zoom={isFullMap ? 10 : 11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={isFullMap}
        attributionControl={false}
        scrollWheelZoom={isFullMap}
        whenCreated={() => setMapLoaded(true)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {hasProjects ? (
          projectMarkers.map((marker) => (
            <Marker 
              key={marker.id} 
              position={marker.coordinates}
              icon={createCustomIcon(marker.color)}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <div className="font-bold text-[#EB3C3C] mb-1">{marker.name}</div>
                  <div className="text-gray-600 mb-1">{marker.location}</div>
                  <div className="text-xs text-gray-500 mb-1">
                    Status: <span className="font-semibold">{marker.status}</span>
                  </div>
                  {marker.budget && (
                    <div className="text-xs text-gray-500 mb-1">
                      Budget: {new Intl.NumberFormat('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(marker.budget)}
                    </div>
                  )}
                  {marker.progress !== undefined && (
                    <div className="text-xs text-gray-500">
                      Progress: {marker.progress}%
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))
        ) : (
          // Show a message in the center of the map if no projects
          <></>
        )}
      </MapContainer>
      {!hasProjects && mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/80 rounded-xl px-6 py-4 shadow text-center">
            <div className="text-2xl text-gray-400 mb-2">🗺️</div>
            <div className="text-[#EB3C3C] font-bold">No projects found</div>
            <div className="text-gray-500 text-sm">Try adjusting your search or filters</div>
          </div>
        </div>
      )}
      
      {/* Map Legend */}
      {isFullMap && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold text-gray-900 mb-2">Project Status</div>
          <div className="space-y-1">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-gray-700 capitalize">{status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsIsland() {
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    status: '',
    category: '',
    implementingUnit: ''
  });

  // Fetch projects from API
  const fetchProjects = async (page = 1, newFilters = null) => {
    try {
      setLoading(true);
      setError(null);

      // Use new filters if provided, otherwise use current filters
      const currentFilters = newFilters || filters;
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        _t: Date.now().toString() // Cache-busting parameter
      });

      // Add filters to params
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.barangay) params.append('barangay', currentFilters.barangay);
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.category) params.append('category', currentFilters.category);
      if (currentFilters.implementingUnit) params.append('implementingUnit', currentFilters.implementingUnit);

      const response = await fetch(`${API_BASE_URL}/projects/public?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Map backend data to frontend expected format
        const mappedProjects = data.projects.map(project => ({
          id: project.id,
          name: project.name,
          code: project.projectCode,
          location: project.location,
          implementingUnitName: project.implementingOfficeName,
          budget: project.totalBudget,
          status: project.status,
          progress: project.progress?.overall || project.progress?.overallProgress || project.overallProgress || 0,
          startDate: project.startDate,
          endDate: project.endDate,
          category: project.category,
          priority: project.priority,
          fundingSource: project.fundingSource,
          description: project.description,
          hasExternalPartner: project.hasExternalPartner,
          eiuPersonnelName: project.eiuPersonnelName,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }));
        
        setProjects(mappedProjects);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
      // Fallback to sample data if API fails
      setProjects([
        {
          id: 1,
          name: 'Installation of Solar and LED Streetlights at Various Barangay',
          location: 'Selected/Various Barangay',
          implementingUnitName: 'MEO',
          budget: 4298000,
          status: 'Planning',
          progress: 0,
          startDate: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Search projects function (called from parent Astro page)
  const searchProjects = (searchTerm, barangay) => {
    const newFilters = {
      ...filters,
      search: searchTerm,
      barangay: barangay
    };
    setFilters(newFilters);
    fetchProjects(1, newFilters);
  };

  // Expose searchProjects method to parent
  useEffect(() => {
    // Make searchProjects available to parent Astro page
    if (typeof window !== 'undefined') {
      window.searchProjects = searchProjects;
    }
  }, [filters]);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Format budget for table display
  const formatBudget = (budget) => {
    if (!budget) return 'N/A';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(budget);
  };

  // Format date for table display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status color for table
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ongoing': return 'bg-green-200 text-green-800';
      case 'completed': return 'bg-blue-200 text-blue-800';
      case 'delayed': return 'bg-red-200 text-red-800';
      case 'planning': return 'bg-yellow-200 text-yellow-800';
      case 'on hold': return 'bg-orange-200 text-orange-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="w-full font-[Montserrat] px-2" data-projects-island>
      {/* View Switcher - always visible */}
      <div className="flex flex-row justify-end gap-2 mb-6 bg-white/90 backdrop-blur-sm py-2">
        {VIEW_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#EB3C3C] transition ${view === opt.key ? 'bg-[#FE5353] border-[#EB3C3C] text-white' : 'bg-white border-[#EB3C3C] text-[#EB3C3C]'}`}
            aria-label={opt.label + ' View'}
            onClick={() => setView(opt.key)}
          >
            {opt.icon}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#EB3C3C] mx-auto mb-4"></div>
          <p className="text-[#7A1F1F] text-lg">Loading projects...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 font-bold mb-2">Failed to load projects</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchProjects()}
            className="px-6 py-2 bg-[#EB3C3C] text-white rounded-lg hover:bg-[#FE5353] transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Results Summary */}
          {pagination.total > 0 && (
            <div className="mb-4 text-[#7A1F1F] text-sm">
              Showing {projects.length} of {pagination.total} projects
              {(filters.search || filters.barangay) && (
                <span className="ml-2 text-gray-500">
                  (filtered)
                </span>
              )}
            </div>
          )}

          {/* Project Analytics - Show on all views except map (where it's already shown) */}
          {view !== 'map' && projects.length > 0 && (
            <StatusAnalytics projects={projects} />
          )}

          {/* Table View */}
          {view === 'table' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead>
                  <tr className="bg-[#EB3C3C] text-white">
                    <th className="px-4 py-3 font-bold text-left">PROJ/PROG NAME/CODE</th>
                    <th className="px-4 py-3 font-bold text-left">LOCATION</th>
                    <th className="px-4 py-3 font-bold text-left">IMPLEMENTING OFFICE</th>
                    <th className="px-4 py-3 font-bold text-left">BUDGET (PHP)/FUNDING SRC</th>
                    <th className="px-4 py-3 font-bold text-left">START DATE/LONGEVITY</th>
                    <th className="px-4 py-3 font-bold text-left">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => (
                    <tr key={proj.id} className="border-b last:border-none hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-[#EB3C3C]">{proj.name}</div>
                          {proj.code && <div className="text-xs text-gray-500">Code: {proj.code}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-4">{proj.location || 'N/A'}</td>
                      <td className="px-4 py-4">
                        <div>
                          <div>{proj.implementingUnitName || 'N/A'}</div>
                          {proj.fundingSource && (
                            <div className="text-xs text-[#7A1F1F]">Source: {proj.fundingSource}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div>{formatBudget(proj.budget)}</div>
                          {proj.progress > 0 && (
                            <div className="text-xs text-gray-500">Progress: {proj.progress}%</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">{formatDate(proj.startDate)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(proj.status)}`}>
                          {proj.status || 'Not Started'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Grid/Card View */}
          {view === 'grid' && (
            <div className="flex flex-wrap gap-6 justify-between">
              {projects.map((proj) => (
                <div key={proj.id} className="w-full sm:w-[48%] lg:w-[32%]">
                  <ProjectCard proj={proj} />
                </div>
              ))}
            </div>
          )}

          {/* Hybrid View (Cards + Mini Map) */}
          {view === 'hybrid' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              {/* Project Cards - 2/3 width */}
              <div className="lg:col-span-2">
                {projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((proj) => (
                      <div key={proj.id}>
                        <ProjectCard proj={proj} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <div className="text-gray-400 text-4xl mb-4">🏗️</div>
                    <p className="text-gray-500 font-medium mb-2">No projects found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
              
              {/* Mini Map - 1/3 width */}
              <div className="lg:col-span-1">
                <ErrorBoundary>
                  <div className="bg-white rounded-2xl shadow-lg p-4 h-[500px] min-h-[500px] flex flex-col justify-between overflow-hidden relative">
                    <MiniMap projects={projects} />
                  </div>
                </ErrorBoundary>
                <div className="mt-4">
                  <MapLegend />
                </div>
              </div>
            </div>
          )}

          {/* Full Map View */}
          {view === 'map' && (
            <div className="space-y-6 w-full max-w-7xl mx-auto">
              {/* Analytics Dashboard */}
              <StatusAnalytics projects={projects} />
              
              {/* Map with Legend */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-[#EB3C3C]">Full Map View</h3>
                    <p className="text-sm text-gray-600">Click on markers to see project details</p>
                  </div>
                  <MapLegend />
                </div>
                <div className="h-[700px] w-full">
                  <ErrorBoundary>
                    <MiniMap projects={projects} isFullMap={true} />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchProjects(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 border border-[#EB3C3C] text-[#EB3C3C] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#EB3C3C] hover:text-white transition"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-[#7A1F1F]">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchProjects(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 border border-[#EB3C3C] text-[#EB3C3C] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#EB3C3C] hover:text-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 
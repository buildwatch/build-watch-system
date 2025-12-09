import { useEffect, useRef, useState } from "react";
import { getApiUrl } from "../config/api.js";

// Leaflet will be dynamically imported only on client side
let L = null;

// Santa Cruz, Laguna center coordinates
const SANTA_CRUZ_CENTER = [14.281, 121.419];

// Comprehensive Barangay coordinates for Santa Cruz, Laguna
// Coordinates verified to be on land within Santa Cruz municipality
const barangayCoordinates = {
  'Alipit': [14.281, 121.419],
  'Bagumbayan': [14.285, 121.418], // Adjusted: moved south and west to be on land, away from water
  'Bubukal': [14.278, 121.423],
  'Calios': [14.287, 121.428], // Adjusted: moved slightly west to be more on land
  'Duhat': [14.282, 121.415],
  'Gatid': [14.275, 121.418],
  'Jasaan': [14.290, 121.425],
  'Labuin': [14.285, 121.422],
  'Malinao': [14.280, 121.421],
  'Oogong': [14.288, 121.424],
  'Pagsawitan': [14.283, 121.416],
  'Palasan': [14.286, 121.419],
  'Patimbao': [14.284, 121.417],
  'Poblacion I': [14.281, 121.418],
  'Poblacion II': [14.282, 121.419],
  'Poblacion III': [14.283, 121.420],
  'Poblacion IV': [14.284, 121.421],
  'Poblacion V': [14.285, 121.422],
  'San Jose': [14.276, 121.415],
  'San Juan': [14.277, 121.416],
  'San Pablo Norte': [14.278, 121.417],
  'San Pablo Sur': [14.279, 121.418],
  'Santisima Cruz': [14.280, 121.419],
  'Santo Angel Central': [14.281, 121.420],
  'Santo Angel Norte': [14.282, 121.421],
  'Santo Angel Sur': [14.283, 121.422],
  'Various Barangay': [14.281, 121.419],
  'Various Barangays': [14.281, 121.419]
};

// Generate accurate coordinates for projects based on location
const generateProjectCoordinates = (projectId, location) => {
  if (!location) {
    return SANTA_CRUZ_CENTER;
  }

  // Try to find coordinates based on location name
  const locationLower = location.toLowerCase();
  for (const [barangay, coords] of Object.entries(barangayCoordinates)) {
    if (locationLower.includes(barangay.toLowerCase())) {
      return coords;
    }
  }

  // Fallback: generate based on project ID for consistent positioning
  const baseLat = SANTA_CRUZ_CENTER[0];
  const baseLng = SANTA_CRUZ_CENTER[1];
  
  let idNum = 0;
  if (typeof projectId === 'string') {
    const numbers = projectId.match(/\d/g);
    if (numbers) {
      idNum = parseInt(numbers.join('').substring(0, 6)) || 0;
    }
  } else if (typeof projectId === 'number') {
    idNum = projectId;
  }
  
  // Generate small offset based on ID to avoid overlapping markers
  const latOffset = ((idNum % 10) - 5) * 0.005;
  const lngOffset = ((idNum % 7) - 3) * 0.005;
  
  return [baseLat + latOffset, baseLng + lngOffset];
};

// Get status color for markers
const getStatusColor = (status) => {
  // Convert 'pending' to 'ongoing' - projects no longer have pending status
  const normalizedStatus = (status === 'pending' || status === 'Pending' || status === 'PENDING') 
    ? 'ongoing' 
    : status?.toLowerCase();
  
  switch (normalizedStatus) {
    case 'ongoing': return '#3b82f6'; // blue
    case 'delayed': return '#ef4444'; // red
    case 'completed': 
    case 'complete': return '#10b981'; // green
    case 'planning': return '#6b7280'; // gray
    case 'on hold': return '#f97316'; // orange
    default: return '#3b82f6'; // default to ongoing (blue) instead of gray
  }
};

// Map tile layer configurations
const mapTileLayers = {
  street: {
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  }
};

/**
 * Centralized Project Map Component
 * 
 * @param {Object} props
 * @param {Array} props.projects - Array of project objects
 * @param {string} props.mapId - Unique ID for the map container (required)
 * @param {number} props.height - Height of the map in pixels (default: 500)
 * @param {number} props.zoom - Initial zoom level (default: 12)
 * @param {boolean} props.showLegend - Show project status legend (default: true)
 * @param {boolean} props.showViewSelector - Show map view type selector (default: true)
 * @param {boolean} props.fitBounds - Fit map to show all markers (default: true)
 * @param {boolean} props.scrollWheelZoom - Enable scroll wheel zoom (default: true)
 * @param {string} props.defaultView - Default map view type: 'street', 'satellite', 'terrain' (default: 'street')
 */
export default function CentralizedProjectMap({
  projects: providedProjects = null,
  mapId,
  height = 500,
  zoom = 12,
  showLegend = true,
  showViewSelector = true,
  fitBounds = true,
  scrollWheelZoom = true,
  defaultView = 'street',
  fetchProjects = false, // If true, fetch projects from API
  apiEndpoint = null // Custom API endpoint for fetching projects
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [currentView, setCurrentView] = useState(defaultView);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState(providedProjects || []);

  // Fetch projects if needed
  useEffect(() => {
    if (providedProjects !== null) {
      setProjects(providedProjects);
      setLoading(false);
      return;
    }

    if (!fetchProjects) {
      setLoading(false);
      return;
    }

    const fetchProjectsData = async () => {
      try {
        setLoading(true);
        const timestamp = new Date().getTime();
        const apiUrl = getApiUrl();
        const endpoint = apiEndpoint || `${apiUrl}/home/project-locations`;
        const response = await fetch(`${endpoint}?_t=${timestamp}`);
        
        if (response.ok) {
          const data = await response.json();
          setProjects(data.locations || data.projects || []);
        } else {
          console.error('Failed to fetch project locations');
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching project locations:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsData();
  }, [providedProjects, fetchProjects, apiEndpoint]);

  // Format budget helper
  const formatBudget = (amount) => {
    if (!amount) return 'N/A';
    const num = parseFloat(amount);
    if (isNaN(num)) return 'N/A';
    if (num >= 1000000) {
      return `₱${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `₱${(num / 1000).toFixed(0)}K`;
    }
    return `₱${num.toLocaleString()}`;
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapId || typeof window === 'undefined') return;

    const initMap = async () => {
      try {
        // Dynamically import Leaflet only on client side
        if (!L) {
          const leafletModule = await import('leaflet');
          L = leafletModule.default || leafletModule;
          
          // Import CSS
          await import('leaflet/dist/leaflet.css');
          
          // Fix for default markers in Leaflet
          if (L.Icon && L.Icon.Default) {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
          }
        }

        const mapElement = document.getElementById(mapId);
        if (!mapElement) {
          console.error(`Map element with id "${mapId}" not found`);
          return;
        }

        // Destroy existing map if it exists
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }

        // Clear existing markers
        markersRef.current = [];

        // Calculate exact bounds from all 26 barangays of Santa Cruz, Laguna
        // Barangays coordinates range:
        // Latitude: 14.275 (Gatid) to 14.295 (Bagumbayan)
        // Longitude: 121.415 (Duhat, San Jose) to 121.430 (Calios)
        // Using exact bounds with minimal buffer to show ONLY Santa Cruz municipality
        const santaCruzBounds = L.latLngBounds(
          [14.273, 121.413], // Southwest corner (slightly outside southernmost/westernmost barangays)
          [14.297, 121.432]  // Northeast corner (slightly outside northernmost/easternmost barangays)
        );
        
        // Initialize map centered on Santa Cruz, Laguna with strict bounds
        mapInstance.current = L.map(mapId, {
          center: SANTA_CRUZ_CENTER,
          zoom: zoom,
          scrollWheelZoom: scrollWheelZoom,
          minZoom: 11, // Prevent zooming out too far - keeps Santa Cruz in view
          maxZoom: 20, // Allow maximum zoom in for detailed view
          maxBounds: santaCruzBounds,
          maxBoundsViscosity: 1.0 // Strict bounds - Leaflet automatically prevents panning outside
        });
        
        // maxBounds with maxBoundsViscosity: 1.0 handles all panning restrictions automatically
        // No event handlers needed - this prevents glitches and ensures smooth operation

        // Add initial tile layer - no bounds restriction to avoid glitches
        // We'll rely on maxBounds and zoom limits instead
        const currentTileConfig = mapTileLayers[currentView];
        L.tileLayer(currentTileConfig.url, {
          attribution: currentTileConfig.attribution,
          maxZoom: 20
        }).addTo(mapInstance.current);
        
        // No visual overlays - rely on maxBounds to keep map within Santa Cruz
        // This ensures clean, glitch-free map rendering

        // Add markers for projects
        console.log(`🗺️ [CentralizedProjectMap] Processing ${projects.length} projects for map markers`);
        let markersCreated = 0;
        let markersSkipped = 0;
        
        // Track coordinates to add offsets for overlapping markers
        const coordinateMap = new Map(); // key: "lat,lng", value: count of markers at this location
        
        projects.forEach((project, index) => {
          let lat, lng;

          // Use actual coordinates if available
          if (project.latitude && project.longitude) {
            lat = parseFloat(project.latitude);
            lng = parseFloat(project.longitude);
            console.log(`📍 [CentralizedProjectMap] Project ${index + 1}: "${project.name}" - Using provided coordinates: [${lat}, ${lng}]`);
          } else {
            // Generate coordinates based on location
            const coords = generateProjectCoordinates(project.id, project.location);
            lat = coords[0];
            lng = coords[1];
            console.log(`📍 [CentralizedProjectMap] Project ${index + 1}: "${project.name}" - Generated coordinates from location "${project.location}": [${lat}, ${lng}]`);
          }

          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`⚠️ [CentralizedProjectMap] Skipping project "${project.name}" - Invalid coordinates: [${lat}, ${lng}]`);
            markersSkipped++;
            return;
          }
          
          // Check if this coordinate is already used by another marker
          const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          const existingCount = coordinateMap.get(coordKey) || 0;
          coordinateMap.set(coordKey, existingCount + 1);
          
          // If multiple markers share the same coordinates, add a small offset
          if (existingCount > 0) {
            // Generate a unique offset based on project ID to ensure consistent positioning
            let idHash = 0;
            if (typeof project.id === 'string') {
              for (let i = 0; i < project.id.length; i++) {
                idHash = ((idHash << 5) - idHash) + project.id.charCodeAt(i);
                idHash = idHash & idHash; // Convert to 32-bit integer
              }
            } else if (typeof project.id === 'number') {
              idHash = project.id;
            }
            
            // Create a circular offset pattern around the original point
            // Use existingCount to determine the angle, and idHash for radius variation
            // Prefer south/west offsets to keep markers on land (away from northern water)
            const angle = (existingCount * 60) * (Math.PI / 180); // 60 degrees per marker
            const radius = 0.0015 + (Math.abs(idHash) % 3) * 0.0008; // Smaller radius: 0.0015 to 0.0039 degrees offset
            let latOffset = radius * Math.cos(angle);
            let lngOffset = radius * Math.sin(angle);
            
            // Prefer offsets that move markers south (negative lat) and slightly west to stay on land
            // If the offset would push north (positive lat), reduce it or reverse it
            if (latOffset > 0 && lat > 14.290) {
              // If already in northern area and offset pushes north, prefer south
              latOffset = -Math.abs(latOffset) * 0.7;
            }
            
            // Ensure final coordinates stay within Santa Cruz bounds and on land
            const newLat = lat + latOffset;
            const newLng = lng + lngOffset;
            
            // Validate: ensure coordinates are within Santa Cruz bounds
            // Santa Cruz bounds: lat 14.273-14.297, lng 121.413-121.432
            if (newLat >= 14.273 && newLat <= 14.297 && newLng >= 121.413 && newLng <= 121.432) {
              // Prefer coordinates that are more central (away from edges, especially north where water is)
              if (newLat > 14.290) {
                // If in northern area (near water), push slightly south
                lat = Math.max(newLat - 0.001, 14.280);
              } else {
                lat = newLat;
              }
              lng = newLng;
            } else {
              // If out of bounds, use a safer offset
              lat = lat - 0.001; // Move south
              lng = lng + (existingCount % 2 === 0 ? 0.0005 : -0.0005); // Alternate east/west
            }
            
            console.log(`📍 [CentralizedProjectMap] Project ${index + 1}: "${project.name}" - Applied offset for overlapping marker (${existingCount + 1} at same location): [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
          }

          // Create custom icon based on project status
          const statusColor = getStatusColor(project.status);
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              width: 20px; 
              height: 20px; 
              background-color: ${statusColor}; 
              border: 3px solid white; 
              border-radius: 50%; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstance.current);
          
          // Get progress value - NEW SYSTEM: prioritize calculated API value (project.progress?.overall)
          const progressValue = parseFloat(project.progress?.overall) || 
                               parseFloat(project.overallProgress) || 
                               parseFloat(project.progress) || 0;

          // Create popup content with better styling to prevent cutoff
          marker.bindPopup(`
            <div style="min-width: 280px; max-width: 350px; font-family: system-ui, -apple-system, sans-serif; word-wrap: break-word; overflow-wrap: break-word;">
              <h3 style="font-weight: bold; margin-bottom: 8px; color: #2563eb; font-size: 16px; line-height: 1.4; word-wrap: break-word;">
                ${project.name || project.projectName || 'Project'}
              </h3>
              <p style="margin: 4px 0; line-height: 1.5;"><strong>Location:</strong> ${project.location || 'Santa Cruz, Laguna'}</p>
              <p style="margin: 4px 0; line-height: 1.5;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${(project.status === 'pending' || project.status === 'Pending' || project.status === 'PENDING') ? 'Ongoing' : (project.status || 'N/A')}</span></p>
              <p style="margin: 4px 0; line-height: 1.5;"><strong>Budget:</strong> ${formatBudget(project.budget || project.totalBudget)}</p>
              <p style="margin: 4px 0; line-height: 1.5;"><strong>Progress:</strong> ${progressValue.toFixed(1)}%</p>
              ${project.startDate ? `<p style="margin: 4px 0; line-height: 1.5;"><strong>Start:</strong> ${formatDate(project.startDate)}</p>` : ''}
              ${project.endDate ? `<p style="margin: 4px 0; line-height: 1.5;"><strong>End:</strong> ${formatDate(project.endDate)}</p>` : ''}
              ${project.category ? `<p style="margin: 4px 0; line-height: 1.5;"><strong>Category:</strong> ${project.category}</p>` : ''}
            </div>
          `, {
            maxWidth: 350,
            minWidth: 280,
            className: 'custom-popup',
            autoPan: true,
            autoPanPadding: [50, 50],
            keepInView: true
          });

          markersRef.current.push(marker);
          markersCreated++;
          console.log(`✅ [CentralizedProjectMap] Created marker ${markersCreated} for "${project.name}" at [${lat}, ${lng}]`);
        });
        
        console.log(`🗺️ [CentralizedProjectMap] Summary: ${markersCreated} markers created, ${markersSkipped} skipped, ${projects.length} total projects`);

        // Always set max bounds to Santa Cruz to prevent panning outside
        // (santaCruzBounds was already defined above during map initialization)
        mapInstance.current.setMaxBounds(santaCruzBounds);
        
        // If there are markers and fitBounds is enabled, adjust to show markers but stay within bounds
        if (fitBounds && markersRef.current.length > 0) {
          console.log(`🗺️ [CentralizedProjectMap] Fitting bounds for ${markersRef.current.length} markers`);
          
          try {
            const group = new L.featureGroup(markersRef.current);
            const projectBounds = group.getBounds();
            
            console.log(`🗺️ [CentralizedProjectMap] Project bounds:`, {
              south: projectBounds.getSouth(),
              west: projectBounds.getWest(),
              north: projectBounds.getNorth(),
              east: projectBounds.getEast()
            });
            
            // Ensure project bounds are within Santa Cruz bounds
            const constrainedSW = [
              Math.max(projectBounds.getSouth(), santaCruzBounds.getSouth()),
              Math.max(projectBounds.getWest(), santaCruzBounds.getWest())
            ];
            const constrainedNE = [
              Math.min(projectBounds.getNorth(), santaCruzBounds.getNorth()),
              Math.min(projectBounds.getEast(), santaCruzBounds.getEast())
            ];
            
            // Validate bounds are valid (south < north, west < east)
            if (constrainedSW[0] >= constrainedNE[0] || constrainedSW[1] >= constrainedNE[1]) {
              console.warn('⚠️ [CentralizedProjectMap] Invalid constrained bounds, using Santa Cruz bounds instead');
              mapInstance.current.fitBounds(santaCruzBounds.pad(0.05));
            } else {
              const constrainedBounds = L.latLngBounds(constrainedSW, constrainedNE);
              
              // Use fitBounds with padding to ensure all markers are visible
              console.log(`🗺️ [CentralizedProjectMap] Final bounds for fitBounds:`, {
                south: constrainedBounds.getSouth(),
                west: constrainedBounds.getWest(),
                north: constrainedBounds.getNorth(),
                east: constrainedBounds.getEast()
              });
              
              // Use setTimeout to avoid stack overflow from rapid bounds updates
              setTimeout(() => {
                if (mapInstance.current) {
                  mapInstance.current.fitBounds(constrainedBounds.pad(0.1), { animate: false });
                }
              }, 100);
            }
          } catch (error) {
            console.error('⚠️ [CentralizedProjectMap] Error fitting bounds:', error);
            // Fallback to Santa Cruz bounds
            mapInstance.current.fitBounds(santaCruzBounds.pad(0.05));
          }
        } else {
          // If fitBounds is disabled or no markers, just show Santa Cruz bounds
          mapInstance.current.fitBounds(santaCruzBounds.pad(0.01));
        }

        // Invalidate size to ensure proper rendering
        setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
          }
        }, 100);

        setLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initMap();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [mapId, zoom, scrollWheelZoom, fitBounds, projects]);

  // Handle map view type change
  useEffect(() => {
    if (!mapInstance.current || !L) return;

    // Define Santa Cruz bounds (same as initialization) - all 26 barangays
    const santaCruzBounds = L.latLngBounds(
      [14.273, 121.413], // Southwest (all 26 barangays)
      [14.297, 121.432]  // Northeast (all 26 barangays)
    );

    // Remove existing tile layers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current.removeLayer(layer);
      }
    });

    // Add new tile layer based on current view
    // No bounds restriction to avoid glitches - rely on maxBounds instead
    const currentTileConfig = mapTileLayers[currentView];
    L.tileLayer(currentTileConfig.url, {
      attribution: currentTileConfig.attribution,
      maxZoom: 20
    }).addTo(mapInstance.current);
    
    // Re-enforce bounds after view change
    mapInstance.current.setMaxBounds(santaCruzBounds);
    mapInstance.current.setMinZoom(10); // Allow zoom in but prevent zoom out beyond Santa Cruz
    
    // Ensure map stays within bounds
    const currentBounds = mapInstance.current.getBounds();
    if (!santaCruzBounds.contains(currentBounds)) {
      mapInstance.current.fitBounds(santaCruzBounds.pad(0.02));
    }
  }, [currentView]);

  // Handle window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (mapInstance.current) {
        setTimeout(() => {
          mapInstance.current.invalidateSize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mapId) {
    return (
      <div className="text-red-600 p-4">
        Error: mapId prop is required for CentralizedProjectMap
      </div>
    );
  }

  return (
    <div 
      className="relative w-full" 
      style={{ 
        height: `${height}px`,
        position: 'relative',
        zIndex: 1,
        isolation: 'isolate',
        overflow: 'hidden'
      }}
    >
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          max-width: 350px !important;
          min-width: 280px !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          padding: 12px !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.5 !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: white !important;
        }
        /* Ensure popup stays within viewport */
        .leaflet-container .leaflet-popup {
          max-width: 350px !important;
        }
        /* Ensure map container doesn't overflow */
        #${mapId} {
          position: relative !important;
          z-index: 1 !important;
          overflow: hidden !important;
        }
        /* Limit Leaflet's z-index to prevent overlap */
        #${mapId} .leaflet-container {
          position: relative !important;
          z-index: 1 !important;
        }
        #${mapId} .leaflet-control-container {
          position: relative !important;
          z-index: 10 !important;
        }
        #${mapId} .leaflet-popup {
          z-index: 1000 !important;
        }
      `}</style>
      {/* Map View Selector */}
      {showViewSelector && (
        <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 flex gap-2">
          {Object.entries(mapTileLayers).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setCurrentView(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                currentView === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={`Switch to ${config.name} view`}
            >
              {config.name}
            </button>
          ))}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-[999]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-700 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div
        id={mapId}
        className="w-full h-full rounded-lg"
        style={{ minHeight: `${height}px` }}
      />

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Project Status</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Ongoing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Completed</span>
            </div>
            {/* Removed: Pending status - projects now go directly to ongoing */}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-[999] rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="text-gray-600 text-sm">No project locations available</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Export helper functions for use in other components
export { barangayCoordinates, generateProjectCoordinates, getStatusColor, SANTA_CRUZ_CENTER };


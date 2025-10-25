import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../config/api';

const SantaCruzMap = () => {
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [barangays, setBarangays] = useState([]);
  const [projects, setProjects] = useState([]);
  const mapRef = useRef(null);

  // Santa Cruz base locations; dynamic data will be merged in
  const baseLocations = [
    {
      id: 'municipal-hall',
      name: 'Municipal Hall',
      type: 'government',
      description: 'Main government building of Santa Cruz LGU',
      address: 'Municipal Hall, Santa Cruz, Laguna',
      phone: '(049) XXX-XXXX',
      email: 'buildwatch@santacruz.gov.ph',
      x: 50,
      y: 45,
      icon: '🏛️',
      color: '#EB3C3C',
      labelPosition: 'bottom' // bottom, top, left, right
    },
    {
      id: 'poblacion-1',
      name: 'Poblacion I',
      type: 'barangay',
      description: 'Central business district and main commercial area',
      address: 'Poblacion I, Santa Cruz, Laguna',
      projects: 5,
      x: 35,
      y: 40,
      icon: '🏢',
      color: '#FF6B6B',
      labelPosition: 'right'
    },
    {
      id: 'poblacion-2',
      name: 'Poblacion II',
      type: 'barangay',
      description: 'Residential and commercial area',
      address: 'Poblacion II, Santa Cruz, Laguna',
      projects: 3,
      x: 65,
      y: 42,
      icon: '🏘️',
      color: '#4ECDC4',
      labelPosition: 'left'
    },
    {
      id: 'gatid',
      name: 'Gatid',
      type: 'barangay',
      description: 'Agricultural and residential community',
      address: 'Gatid, Santa Cruz, Laguna',
      projects: 3,
      x: 25,
      y: 60,
      icon: '🌾',
      color: '#45B7D1',
      labelPosition: 'right'
    },
    {
      id: 'labuin',
      name: 'Labuin',
      type: 'barangay',
      description: 'Rural community with farming activities',
      address: 'Labuin, Santa Cruz, Laguna',
      projects: 2,
      x: 75,
      y: 58,
      icon: '🌾',
      color: '#96CEB4',
      labelPosition: 'left'
    },
    {
      id: 'bubukal',
      name: 'Bubukal',
      type: 'barangay',
      description: 'Mountainous area with scenic views',
      address: 'Bubukal, Santa Cruz, Laguna',
      projects: 1,
      x: 20,
      y: 25,
      icon: '⛰️',
      color: '#FFEAA7',
      labelPosition: 'right'
    },
    {
      id: 'calios',
      name: 'Calios',
      type: 'barangay',
      description: 'Coastal community near Laguna de Bay',
      address: 'Calios, Santa Cruz, Laguna',
      projects: 4,
      x: 80,
      y: 70,
      icon: '🌊',
      color: '#DDA0DD',
      labelPosition: 'left'
    },
    {
      id: 'public-market',
      name: 'Public Market',
      type: 'facility',
      description: 'Main public market and trading center',
      address: 'Public Market, Santa Cruz, Laguna',
      phone: '(049) XXX-XXXX',
      x: 45,
      y: 50,
      icon: '🛒',
      color: '#FF8C42',
      labelPosition: 'top'
    },
    {
      id: 'health-center',
      name: 'Health Center',
      type: 'facility',
      description: 'Municipal health center and clinic',
      address: 'Health Center, Santa Cruz, Laguna',
      phone: '(049) XXX-XXXX',
      x: 55,
      y: 52,
      icon: '🏥',
      color: '#FF6B9D',
      labelPosition: 'top'
    }
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const api = getApiUrl();
        const [bgy, proj] = await Promise.all([
          fetch(`${api}/home/barangay-stats`).then(r => r.json()).catch(() => null),
          fetch(`${api}/home/project-locations`).then(r => r.json()).catch(() => null)
        ]);
        if (!mounted) return;
        if (bgy?.success) {
          const list = bgy.barangayStats || [];
          const count = list.length || 1;
          const dyn = list.map((item, i) => {
            const angle = (i / count) * Math.PI * 2;
            const r = 28 + ((i * 3) % 7);
            const x = 50 + r * Math.cos(angle);
            const y = 50 + r * Math.sin(angle) * 0.6;
            const initials = item.name.split(' ').map(w => w[0]).join('').slice(0,3).toUpperCase();
            return {
              id: `bgy-${i}`,
              name: item.name,
              type: 'barangay',
              description: `${item.name} Barangay` ,
              address: `${item.name}, Santa Cruz, Laguna`,
              projects: item.totalProjects,
              x: Math.max(6, Math.min(94, x)),
              y: Math.max(8, Math.min(92, y)),
              icon: initials,
              color: '#3B82F6',
              labelPosition: 'top'
            };
          });
          setBarangays(dyn);
        }
        if (proj?.success) {
          const dynP = (proj.locations || []).map((p, idx) => {
            let x = 60 + ((idx * 7) % 30) - 15;
            let y = 60 + ((idx * 5) % 20) - 10;
            try {
              if (typeof p.location === 'string') {
                const m = p.location.match(/([\-\d\.]+)\s*,\s*([\-\d\.]+)/);
                if (m) {
                  const lat = parseFloat(m[1]);
                  const lng = parseFloat(m[2]);
                  x = 50 + (lng % 1) * 60 - 30;
                  y = 50 - (lat % 1) * 40 + 10;
                }
              } else if (p.location && typeof p.location === 'object') {
                if (typeof p.location.x === 'number' && typeof p.location.y === 'number') { x = p.location.x; y = p.location.y; }
              }
            } catch {}
            return {
              id: `proj-${p.id}`,
              name: p.name,
              type: 'project',
              description: `${p.category || 'Project'} • ${Math.round(p.progress || 0)}% complete`,
              address: p.location || 'Santa Cruz, Laguna',
              x: Math.max(6, Math.min(94, x)),
              y: Math.max(8, Math.min(92, y)),
              icon: '●',
              color: '#10B981',
              labelPosition: 'bottom'
            };
          });
          setProjects(dynP);
        }
      } finally {
        if (mounted) setMapLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLocationHover = (location) => {
    setHoveredLocation(location);
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
  };

  const handleLocationLeave = () => {
    setHoveredLocation(null);
  };

  const closeInfoCard = () => {
    setSelectedLocation(null);
  };

  // Function to get label positioning styles
  const getLabelPosition = (position, isHovered) => {
    const baseClasses = `absolute bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-800 shadow-md transition-all duration-300 whitespace-nowrap z-30 ${
      isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`;

    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
    }
  };

  const locations = [...baseLocations, ...barangays, ...projects];

  const toggleFullscreen = () => {
    const el = mapRef.current?.parentElement?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  return (
    <div ref={mapRef} className={`relative w-full ${fullscreen ? 'h-[85vh]' : 'h-96'} bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl overflow-hidden shadow-lg border border-blue-200`} style={{ perspective: '1000px' }}>
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-yellow-50">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-green-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-yellow-200/30 rounded-full blur-lg"></div>
        
        {/* Water body (Laguna de Bay) */}
        <div className="absolute bottom-0 right-0 w-1/3 h-1/4 bg-blue-300/40 rounded-tl-full"></div>
        
        {/* Roads */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300/50 transform -translate-y-1/2"></div>
        <div className="absolute top-0 left-1/2 w-1 h-full bg-gray-300/50 transform -translate-x-1/2"></div>
      </div>

      {/* Map Title + Fullscreen */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md z-20">
        <h3 className="text-lg font-bold text-gray-800">Santa Cruz, Laguna</h3>
        <p className="text-sm text-gray-600">Interactive Map</p>
      </div>
      <button onClick={toggleFullscreen} title="Fullscreen" className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 w-9 h-9 rounded-lg shadow-md z-20 flex items-center justify-center">
        {fullscreen ? '⤬' : '⛶'}
      </button>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs z-20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Government</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Barangay</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>Facility</span>
        </div>
      </div>

      {/* Location Markers */}
      {mapLoaded && locations.map((location) => (
        <div
          key={location.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
            hoveredLocation?.id === location.id ? 'scale-125 z-40' : 'scale-100 z-10'
          } ${selectedLocation?.id === location.id ? 'scale-110 z-50' : ''}`}
          style={{ left: `${location.x}%`, top: `${location.y}%` }}
          onMouseEnter={() => handleLocationHover(location)}
          onMouseLeave={handleLocationLeave}
          onClick={() => handleLocationClick(location)}
        >
          {/* Marker */}
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white transition-all duration-300 ${
              hoveredLocation?.id === location.id ? 'animate-pulse' : ''
            }`}
            style={{ backgroundColor: location.color }}
          >
            {location.type === 'barangay' ? location.icon : location.icon}
          </div>
          
          {/* Location Name Label - Improved positioning */}
          <div className={getLabelPosition(location.labelPosition, hoveredLocation?.id === location.id)}>
            {location.name}
          </div>
        </div>
      ))}

      {/* Hover Info Card */}
      {hoveredLocation && !selectedLocation && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-xs border border-gray-200 z-30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{hoveredLocation.icon}</span>
            <h4 className="font-bold text-gray-800">{hoveredLocation.name}</h4>
          </div>
          <p className="text-sm text-gray-600 mb-2">{hoveredLocation.description}</p>
          <p className="text-xs text-gray-500">{hoveredLocation.address}</p>
          {hoveredLocation.projects && (
            <p className="text-xs text-blue-600 font-medium mt-1">
              {hoveredLocation.projects} Active Projects
            </p>
          )}
          {hoveredLocation.phone && (
            <p className="text-xs text-gray-500 mt-1">📞 {hoveredLocation.phone}</p>
          )}
          {hoveredLocation.email && (
            <p className="text-xs text-gray-500">📧 {hoveredLocation.email}</p>
          )}
        </div>
      )}

      {/* Selected Location Info Card */}
      {selectedLocation && (
        <div className="absolute inset-4 bg-white/95 backdrop-blur-sm p-6 rounded-lg shadow-xl border border-gray-200 overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedLocation.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedLocation.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{selectedLocation.type}</p>
              </div>
            </div>
            <button
              onClick={closeInfoCard}
              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <p className="text-gray-700">{selectedLocation.description}</p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-800 mb-1">📍 Address</p>
              <p className="text-sm text-gray-600">{selectedLocation.address}</p>
            </div>
            
            {selectedLocation.projects && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">📊 Projects</p>
                <p className="text-sm text-blue-600">{selectedLocation.projects} Active Projects</p>
              </div>
            )}
            
            {selectedLocation.phone && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-1">📞 Contact</p>
                <p className="text-sm text-green-600">{selectedLocation.phone}</p>
              </div>
            )}
            
            {selectedLocation.email && (
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-purple-800 mb-1">📧 Email</p>
                <p className="text-sm text-purple-600">{selectedLocation.email}</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={closeInfoCard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Loading Santa Cruz Map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SantaCruzMap; 
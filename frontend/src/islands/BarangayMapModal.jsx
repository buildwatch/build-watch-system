import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../config/api.js';

// Full view map modal for barangay page
export default function BarangayMapModal({ barangayName }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Listen for custom events to open/close modal
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      document.body.style.overflow = 'hidden';
    };
    const handleClose = () => {
      setIsOpen(false);
      document.body.style.overflow = '';
    };

    window.addEventListener('openMapModal', handleOpen);
    window.addEventListener('closeMapModal', handleClose);

    // Also listen for clicks on the modal backdrop
    const modal = document.querySelector('.barangay-map-modal');
    if (modal) {
      const handleClickOutside = (e) => {
        if (e.target === modal) {
          setIsOpen(false);
          document.body.style.overflow = '';
        }
      };
      modal.addEventListener('click', handleClickOutside);
      return () => {
        window.removeEventListener('openMapModal', handleOpen);
        window.removeEventListener('closeMapModal', handleClose);
        modal.removeEventListener('click', handleClickOutside);
      };
    }

    return () => {
      window.removeEventListener('openMapModal', handleOpen);
      window.removeEventListener('closeMapModal', handleClose);
      // Ensure overflow is restored on cleanup
      document.body.style.overflow = '';
    };
  }, []);

  // Handle modal state changes to manage body overflow
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup: ensure overflow is restored when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Coordinates for Santa Cruz barangays (approx)
  const barangayCoordinates = {
    'Alipit': [14.281, 121.419],
    'Bagumbayan': [14.295, 121.420],
    'Bubukal': [14.278, 121.423],
    'Calios': [14.287, 121.430],
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
  };

  // Fetch projects for this barangay
  useEffect(() => {
    async function fetchProjects() {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/home/project-locations?_t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          const barangayProjects = (data.locations || []).filter(project => 
            (project.location || '').toLowerCase().includes(barangayName.toLowerCase())
          );
          setProjects(barangayProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }
    if (isOpen) {
      fetchProjects();
    }
  }, [barangayName, isOpen]);

  useEffect(() => {
    if (!isOpen || loading) return;

    let marker;
    (async () => {
      const target = barangayCoordinates[barangayName] || [14.281, 121.419];

      // Dynamically import Leaflet only in the browser
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current && containerRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: target,
          zoom: 13,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
      }

      if (mapRef.current) {
        mapRef.current.setView(target, 13);

        // Clear existing markers
        markersRef.current.forEach(m => {
          mapRef.current.removeLayer(m);
        });
        markersRef.current = [];

        // Add barangay marker
        marker = L.circleMarker(target, {
          radius: 12,
          color: '#2563eb',
          weight: 4,
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
        }).addTo(mapRef.current);
        
        marker.bindPopup(`<strong style="font-size: 16px;">${barangayName}</strong><br/><small>Barangay Location</small>`, {
          className: 'barangay-map-modal-popup',
          closeButton: true,
          maxWidth: 200
        });
        markersRef.current.push(marker);

        // Add project markers
        const getStatusColor = (status) => {
          switch (status?.toLowerCase()) {
            case 'ongoing': return '#3b82f6'; // blue
            case 'delayed': return '#ef4444'; // red
            case 'completed': return '#10b981'; // green
            case 'planning': return '#6b7280'; // gray
            default: return '#6b7280'; // gray
          }
        };

        projects.forEach((project) => {
          // Find coordinates based on project location
          let coordinates = target; // Default to barangay center
          
          for (const [barangay, coords] of Object.entries(barangayCoordinates)) {
            if (project.location && project.location.toLowerCase().includes(barangay.toLowerCase())) {
              coordinates = coords;
              // Add slight offset to avoid overlapping
              coordinates = [coords[0] + (Math.random() - 0.5) * 0.01, coords[1] + (Math.random() - 0.5) * 0.01];
              break;
            }
          }

          const statusColor = getStatusColor(project.status);
          
          const customIcon = L.divIcon({
            className: 'custom-project-marker-modal',
            html: `<div style="background-color: ${statusColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const projectMarker = L.marker(coordinates, { icon: customIcon }).addTo(mapRef.current);
          
          const formatBudget = (budget) => {
            if (!budget) return 'N/A';
            return new Intl.NumberFormat('en-PH', {
              style: 'currency',
              currency: 'PHP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(budget);
          };

          projectMarker.bindPopup(`
            <div style="font-family: Montserrat, sans-serif; min-width: 250px;">
              <strong style="color: ${statusColor}; font-size: 16px;">${project.name || 'Unnamed Project'}</strong><br/>
              <small style="color: #666;">${project.location || 'N/A'}</small><br/>
              <div style="margin-top: 10px;">
                <span style="font-size: 13px;">Status: <strong>${project.status || 'N/A'}</strong></span><br/>
                <span style="font-size: 13px;">Progress: <strong>${Math.round(project.progress || 0)}%</strong></span><br/>
                <span style="font-size: 13px;">Budget: <strong>${formatBudget(project.budget)}</strong></span>
              </div>
              <a href="/project/${project.id}" style="display: inline-block; margin-top: 10px; padding: 6px 12px; background: ${statusColor}; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: bold;">View Details</a>
            </div>
          `, {
            className: 'barangay-map-modal-popup',
            closeButton: true,
            maxWidth: 300
          });
          
          markersRef.current.push(projectMarker);
        });

        // Resize map when modal opens
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 100);
      }
    })();

    return () => {
      markersRef.current.forEach(m => {
        if (mapRef.current) mapRef.current.removeLayer(m);
      });
      markersRef.current = [];
    };
  }, [barangayName, projects, loading, isOpen]);

  return (
    <div 
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 barangay-map-modal transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none invisible'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
          document.body.style.overflow = '';
        }
      }}
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
          <div>
            <h3 className="text-xl font-bold text-white">Barangay Map - {barangayName}</h3>
            <p className="text-sm text-blue-100 mt-1">Projects and locations in {barangayName}</p>
          </div>
          <button 
            onClick={() => {
              setIsOpen(false);
              document.body.style.overflow = '';
            }} 
            className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Map Legend */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-blue-600 bg-blue-500"></div>
            <span className="text-gray-700 font-medium">Barangay Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">Ongoing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500"></div>
            <span className="text-gray-700">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500"></div>
            <span className="text-gray-700">Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-500"></div>
            <span className="text-gray-700">Planning</span>
          </div>
        </div>

        {/* Modal Content - Map */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={containerRef}
            style={{ height: '100%', width: '100%', minHeight: '500px' }}
            className="relative"
          />
        </div>
      </div>
    </div>
  );
}


import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../config/api.js';

// Minimal Leaflet map for barangay page with projects
export default function MiniMap({ barangayName = 'Santa Cruz', onClick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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
    fetchProjects();
  }, [barangayName]);

  useEffect(() => {
    if (loading) return;

    let marker;
    (async () => {
      const target = barangayCoordinates[barangayName] || [14.281, 121.419];

      // Dynamically import Leaflet only in the browser
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: target,
          zoom: 13,
          scrollWheelZoom: false,
          zoomControl: false,
          // Prevent popups from going outside bounds
          maxBounds: [
            [14.25, 121.40],
            [14.30, 121.45]
          ],
          maxBoundsViscosity: 1.0
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);

        // Add click handler to open modal - but prevent clicks on markers/popups
        if (onClick) {
          mapRef.current.on('click', (e) => {
            // Only trigger if not clicking on a popup or marker
            if (!e.originalEvent.target.closest('.leaflet-popup') && 
                !e.originalEvent.target.closest('.leaflet-marker-icon') &&
                !e.originalEvent.target.closest('.leaflet-marker-shadow')) {
              onClick();
            }
          });
          // Only show pointer cursor on the map background, not on markers
          containerRef.current.style.cursor = 'pointer';
        }
      }

      mapRef.current.setView(target, 13);

      // Clear existing markers
      markersRef.current.forEach(m => {
        if (mapRef.current) mapRef.current.removeLayer(m);
      });
      markersRef.current = [];

      // Add barangay marker
      marker = L.circleMarker(target, {
        radius: 10,
        color: '#2563eb',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 0.9,
      }).addTo(mapRef.current);
      
      marker.bindPopup(`<strong>${barangayName}</strong><br/><small>Barangay Location</small>`, {
        className: 'barangay-minimap-popup',
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        maxWidth: 150
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
          className: 'custom-project-marker',
          html: `<div style="background-color: ${statusColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
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
          <div style="font-family: Montserrat, sans-serif; min-width: 200px; max-width: 280px;">
            <strong style="color: ${statusColor}; font-size: 14px; display: block; margin-bottom: 6px;">${project.name || 'Unnamed Project'}</strong>
            <small style="color: #666; font-size: 12px; display: block; margin-bottom: 8px;">${project.location || 'N/A'}</small>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 12px; margin-bottom: 4px;"><span style="color: #666;">Status:</span> <strong style="color: ${statusColor};">${project.status || 'N/A'}</strong></div>
              <div style="font-size: 12px; margin-bottom: 4px;"><span style="color: #666;">Progress:</span> <strong>${Math.round(project.progress || 0)}%</strong></div>
              <div style="font-size: 12px; margin-bottom: 8px;"><span style="color: #666;">Budget:</span> <strong>${formatBudget(project.budget)}</strong></div>
            </div>
            <a href="/project/${project.id}" style="display: inline-block; width: 100%; text-align: center; margin-top: 8px; padding: 6px 12px; background: ${statusColor}; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">View Details</a>
          </div>
        `, {
          className: 'barangay-minimap-popup',
          closeButton: true,
          autoClose: false,
          closeOnClick: false,
          maxWidth: 280,
          offset: [0, -10], // Offset to position popup above marker
          autoPan: true,
          autoPanPadding: [50, 50] // Add padding to ensure popup stays within view
        });
        
        markersRef.current.push(projectMarker);
      });
      
      // Configure popup positioning and styling
      mapRef.current.on('popupopen', function(e) {
        const popupElement = e.popup.getElement();
        if (popupElement) {
          popupElement.style.zIndex = '40'; // Lower than topbar (usually 50)
          // Ensure popup is properly positioned and not cut off
          const container = containerRef.current;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const popupRect = popupElement.getBoundingClientRect();
            
            // Adjust if popup goes above container
            if (popupRect.top < containerRect.top) {
              e.popup.setOffset([0, 20]); // Move popup down
            }
            // Adjust if popup goes below container
            if (popupRect.bottom > containerRect.bottom) {
              e.popup.setOffset([0, -30]); // Move popup up
            }
            // Adjust if popup goes left of container
            if (popupRect.left < containerRect.left) {
              e.popup.setOffset([containerRect.left - popupRect.left + 10, e.popup.options.offset[1]]);
            }
            // Adjust if popup goes right of container
            if (popupRect.right > containerRect.right) {
              e.popup.setOffset([containerRect.right - popupRect.right - 10, e.popup.options.offset[1]]);
            }
          }
        }
      });
    })();

    return () => {
      markersRef.current.forEach(m => {
        if (mapRef.current) mapRef.current.removeLayer(m);
      });
      markersRef.current = [];
    };
  }, [barangayName, projects, loading, onClick]);

  return (
    <div
      ref={containerRef}
      style={{ height: '220px', width: '100%', borderRadius: '16px', position: 'relative', zIndex: 1, overflow: 'hidden' }}
      className="shadow-lg border border-blue-100"
      onClick={onClick}
    />
  );
}



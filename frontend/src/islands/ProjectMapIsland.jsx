import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function getProjectLatLng(proj) {
  // Try to extract lat/lng from project fields (customize as needed)
  if (proj.latitude && proj.longitude) return [proj.latitude, proj.longitude];
  if (proj.lat && proj.lng) return [proj.lat, proj.lng];
  // Fallback: Santa Cruz, Laguna
  return [14.2814, 121.4179];
}

export default function ProjectMapIsland({ projects = [] }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([14.2814, 121.4179], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMap.current);
    }
    // Remove old markers
    leafletMap.current.eachLayer(layer => {
      if (layer instanceof L.Marker) leafletMap.current.removeLayer(layer);
    });
    // Add project markers
    projects.forEach(proj => {
      const [lat, lng] = getProjectLatLng(proj);
      L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        })
      })
        .addTo(leafletMap.current)
        .bindPopup(
          `<div style='font-family:Montserrat,sans-serif;font-size:14px;min-width:180px;'>
            <b style='color:#EB3C3C;'>${proj.name || proj.projectName}</b><br/>
            <span style='color:#7A1F1F;'>${proj.location || 'N/A'}</span><br/>
            <span style='color:#7A1F1F;font-size:12px;'>Status: <b>${proj.status || 'Not Started'}</b></span>
          </div>`
        );
    });
    // Resize map on view change
    setTimeout(() => {
      leafletMap.current.invalidateSize();
    }, 200);
  }, [projects]);

  return (
    <div className="w-full h-[500px] rounded-2xl shadow-lg overflow-hidden border border-[#EB3C3C]/10">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
} 
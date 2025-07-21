import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Barangay coordinates for Santa Cruz, Laguna
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
  'Santo Angel Sur': [14.283, 121.422]
};

export default function ProjectMap() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real project data from backend
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/home/project-locations');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.locations || []);
        } else {
          console.error('Failed to fetch project locations');
        }
      } catch (error) {
        console.error('Error fetching project locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    if (loading) return;

    const map = L.map("project-map-leaflet", {
      center: [14.281, 121.419],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Add markers for real projects
    projects.forEach((project) => {
      // Get coordinates based on project location
      let coordinates = [14.281, 121.419]; // Default to Santa Cruz center
      
      // Try to find coordinates based on location
      for (const [barangay, coords] of Object.entries(barangayCoordinates)) {
        if (project.location && project.location.toLowerCase().includes(barangay.toLowerCase())) {
          coordinates = coords;
          break;
        }
      }

      // Create custom icon based on project status
      const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
          case 'ongoing': return '#fbbf24'; // yellow
          case 'completed': return '#10b981'; // green
          case 'planning': return '#3b82f6'; // blue
          default: return '#6b7280'; // gray
        }
      };

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 20px; 
          height: 20px; 
          background-color: ${getStatusColor(project.status)}; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(coordinates, { icon: customIcon }).addTo(map);
      
      // Format budget
      const formatBudget = (amount) => {
        if (!amount) return 'N/A';
        if (amount >= 1000000) {
          return `₱${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
          return `₱${(amount / 1000).toFixed(0)}K`;
        }
        return `₱${amount.toLocaleString()}`;
      };

      // Format date
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

      marker.bindPopup(`
        <div style="min-width: 250px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #dc2626;">${project.name}</h3>
          <p><strong>Location:</strong> ${project.location || 'Santa Cruz, Laguna'}</p>
          <p><strong>Status:</strong> <span style="color: ${getStatusColor(project.status)}; font-weight: bold;">${project.status}</span></p>
          <p><strong>Budget:</strong> ${formatBudget(project.budget)}</p>
          <p><strong>Progress:</strong> ${project.progress || 0}%</p>
          <p><strong>Start Date:</strong> ${formatDate(project.startDate)}</p>
          <p><strong>End Date:</strong> ${formatDate(project.endDate)}</p>
          <p><strong>Category:</strong> ${project.category || 'Infrastructure'}</p>
        </div>
      `);
    });

    // Add legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.borderRadius = '5px';
      div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      div.style.fontSize = '12px';
      
      div.innerHTML = `
        <h4 style="margin: 0 0 8px 0; color: #333;">Project Status</h4>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 12px; height: 12px; background-color: #fbbf24; border-radius: 50%; margin-right: 8px;"></div>
          <span>Ongoing</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; margin-right: 8px;"></div>
          <span>Completed</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 12px; height: 12px; background-color: #3b82f6; border-radius: 50%; margin-right: 8px;"></div>
          <span>Planning</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 12px; height: 12px; background-color: #6b7280; border-radius: 50%; margin-right: 8px;"></div>
          <span>Other</span>
        </div>
      `;
      return div;
    };
    legend.addTo(map);

    return () => map.remove();
  }, [projects, loading]);

  return (
    <div className="w-full flex flex-col items-center">
      {loading && (
        <div className="text-white text-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          Loading project locations...
        </div>
      )}
      <div 
        id="project-map-leaflet" 
        className="w-full rounded-2xl shadow-lg z-10" 
        style={{ 
          height: '960px', // 3x bigger (was 320px, now 960px)
          minHeight: '960px',
          width: '100%',
          maxWidth: '100vw'
        }}
      ></div>
      {projects.length === 0 && !loading && (
        <div className="text-white text-center mt-4">
          <p>No project locations available at the moment.</p>
        </div>
      )}
      {projects.length > 0 && !loading && (
        <div className="text-white text-center mt-4">
          <p className="text-sm opacity-80">Showing {projects.length} project{projects.length !== 1 ? 's' : ''} on the map</p>
        </div>
      )}
    </div>
  );
} 
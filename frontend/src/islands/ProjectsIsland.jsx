import React, { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getApiUrl } from '../config/api.js';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  'ongoing': '#3B82F6', // blue
  'completed': '#10B981', // green
  'delayed': '#EF4444', // red
  'pending': '#F59E0B', // yellow
  'on hold': '#F97316', // orange
  'default': '#6B7280' // gray
};

// Progress bar color function
const getProgressColor = (progress) => {
  if (progress >= 0 && progress <= 25) return '#EF4444'; // red
  if (progress >= 26 && progress <= 50) return '#F59E0B'; // yellow
  if (progress >= 51 && progress <= 75) return '#3B82F6'; // blue
  if (progress >= 76 && progress <= 100) return '#10B981'; // green
  return '#6B7280'; // gray fallback
};

// Barangay coordinates for Santa Cruz, Laguna (same as home page)
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
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        Project Analytics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Total Projects</p>
              <p className="text-3xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{projects.length}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full group-hover:bg-blue-300 transition-all duration-300">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 group-hover:text-green-600 transition-colors">Ongoing</p>
              <p className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">{statusCounts.ongoing || 0}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full group-hover:bg-green-300 transition-all duration-300">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Completed</p>
              <p className="text-3xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{statusCounts.completed || 0}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full group-hover:bg-blue-300 transition-all duration-300">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 group-hover:text-purple-600 transition-colors">Avg Progress</p>
              <p className="text-3xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">{averageProgress}%</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full group-hover:bg-purple-300 transition-all duration-300">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl border border-amber-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-amber-700">Total Budget</span>
          <span className="text-lg font-bold text-amber-800">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalBudget)}</span>
        </div>
      </div>
    </div>
  );
}

// Map Legend Component
function MapLegend() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-blue-600 mb-3">Project Status Legend</h4>
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

// API configuration - will call getApiUrl() dynamically to ensure correct environment detection

// Santa Cruz, Laguna coordinates (approximate center)
const SANTA_CRUZ_CENTER = [14.2783, 121.4153];

const VIEW_OPTIONS = [
  { key: 'table', label: 'Table', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ) },
  { key: 'grid', label: 'Grid', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ) },
  { key: 'hybrid', label: 'Hybrid', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ) },
  { key: 'map', label: 'Map', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
    </svg>
  ) },
];

// Generate coordinates for projects based on location
const generateProjectCoordinates = (projectId, location) => {
  // Try to find coordinates based on location
  for (const [barangay, coords] of Object.entries(barangayCoordinates)) {
    if (location && location.toLowerCase().includes(barangay.toLowerCase())) {
      return coords;
    }
  }
  
  // Fallback: generate based on project ID
  const baseLat = SANTA_CRUZ_CENTER[0];
  const baseLng = SANTA_CRUZ_CENTER[1];
  const idNum = Number(projectId);
  if (isNaN(idNum)) {
    return [baseLat, baseLng];
  }
  const latOffset = (idNum % 10 - 5) * 0.01;
  const lngOffset = (idNum % 7 - 3) * 0.01;
  return [baseLat + latOffset, baseLng + lngOffset];
};

// Function to get project-specific images based on category and content
const getProjectImage = (project) => {
  // Check if project has an initial photo
  if (project.initialPhoto && project.initialPhoto !== '' && project.initialPhoto !== 'None') {
    const backendUrl = getApiUrl().replace('/api', '');
    return project.initialPhoto.startsWith('http') ? project.initialPhoto : `${backendUrl}${project.initialPhoto}`;
  }
  
  // Array of construction and infrastructure images
  const constructionImages = [
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1577760258779-e787a1733016?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of healthcare and medical images
  const healthcareImages = [
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of education and school images
  const educationImages = [
    'https://images.unsplash.com/photo-1523050854058-8df90110c9d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1523240794102-9ebd0c1c6d8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of road and transportation images
  const roadImages = [
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Array of social services and community images
  const socialImages = [
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  
  // Determine which image array to use based on project name, category, and description
  let imageArray = constructionImages; // Default to construction
  
  const projectText = `${project.name || ''} ${project.category || ''} ${project.description || ''}`.toLowerCase();
  
  if (projectText.includes('health') || projectText.includes('medical') || projectText.includes('hospital') || projectText.includes('clinic')) {
    imageArray = healthcareImages;
  } else if (projectText.includes('school') || projectText.includes('education') || projectText.includes('learning') || projectText.includes('academic')) {
    imageArray = educationImages;
  } else if (projectText.includes('road') || projectText.includes('highway') || projectText.includes('bridge') || projectText.includes('transport')) {
    imageArray = roadImages;
  } else if (projectText.includes('social') || projectText.includes('community') || projectText.includes('welfare') || projectText.includes('assistance')) {
    imageArray = socialImages;
  }
  
  // Use project ID to consistently select an image from the array
  const projectId = project.id || project.name || 'default';
  const hash = projectId.toString().split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const imageIndex = Math.abs(hash) % imageArray.length;
  
  return imageArray[imageIndex];
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

  // Get status color for enhanced design
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ongoing': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'delayed': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'on hold': return 'bg-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Handle project card click
  const handleProjectClick = () => {
    window.location.href = `/project/${proj.id}`;
  };

  return (
    <div 
      className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden flex flex-col w-full border border-blue-100/50 hover:shadow-2xl hover:border-blue-300/50 transition-all duration-500 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-2 group relative"
      onClick={handleProjectClick}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
      }}
    >
      {/* Enhanced Featured Image Section */}
      <div className="h-52 relative overflow-hidden">
        <img 
          src={getProjectImage(proj)}
          alt={proj.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
          onError={(e) => {
            e.target.src = '/projects-page-header-bg.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {/* Category Badge */}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
            <span className="text-white text-xs font-semibold">
              {proj.category || 'Infrastructure'}
            </span>
          </div>
          
          {/* Status Badge */}
          <div className="relative">
            <span className={`px-3 py-1.5 ${getStatusColor(proj.status)} text-xs font-bold rounded-full border border-white/30 shadow-lg backdrop-blur-sm`}>
              {proj.status || 'Not Started'}
            </span>
            {/* Status glow effect */}
            <div className={`absolute inset-0 ${getStatusColor(proj.status)} rounded-full blur-md opacity-40 -z-10`}></div>
          </div>
        </div>
        
        {/* Enhanced Progress Overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between text-white text-sm mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span className="font-semibold">Progress</span>
              </div>
              <span className="text-lg font-bold">{(parseFloat(proj.progress) || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="h-3 rounded-full transition-all duration-2000 ease-out shadow-lg relative project-progress-bar-fill" 
                style={{ 
                  width: '0%',
                  backgroundColor: getProgressColor(parseFloat(proj.progress) || 0)
                }}
                data-progress={parseFloat(proj.progress) || 0}
                data-progress-color={getProgressColor(parseFloat(proj.progress) || 0)}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Content Section */}
      <div className="p-6 flex flex-col flex-1 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-3xl"></div>
        </div>
        
        {/* Project Title */}
        <div className="relative z-10">
          <h3 className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2 group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-300 line-clamp-2 leading-tight">
            {proj.name || 'Project Name'}
          </h3>
          
          {/* Project Code */}
          <div className="text-sm text-gray-500 mb-3">
            <span className="font-medium">Code:</span> {proj.projectCode || 'N/A'}
          </div>
          
          {/* Project Description */}
          {proj.description && (
            <div className="text-sm text-gray-600 mb-3 line-clamp-2">
              {proj.description}
            </div>
          )}
        </div>
        
        {/* Enhanced Project Details */}
        <div className="relative z-10 space-y-2 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Location:</span>
            <span className="text-gray-800">{proj.location || 'N/A'}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Implementing Office:</span>
            <span className="text-gray-800 text-right">{proj.implementingOfficeName || proj.implementingOffice || 'N/A'}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Budget:</span>
            <span className="text-gray-800 font-semibold">{formatBudget(proj.totalBudget || proj.budget)}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Funding Source:</span>
            <span className="text-gray-800">{proj.fundingSource === 'donor_fund' ? 'Municipal Development Fund' : proj.fundingSource?.replace('_', ' ').toUpperCase() || 'N/A'}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Category:</span>
            <span className="text-gray-800">{proj.category || 'Infrastructure'}</span>
          </div>
        </div>

        {/* Progress Breakdown */}
        <div className="relative z-10 space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Timeline:</span>
            <span className="font-semibold text-blue-600">{(parseFloat(proj.timelineProgress || proj.progress?.timeline) || 0).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Budget:</span>
            <span className="font-semibold text-blue-600">{(parseFloat(proj.budgetProgress || proj.progress?.budget) || 0).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Physical:</span>
            <span className="font-semibold text-blue-600">{(parseFloat(proj.physicalProgress || proj.progress?.physical) || 0).toFixed(1)}%</span>
          </div>
        </div>

        {/* Dates */}
        <div className="relative z-10 space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Start: {formatDate(proj.startDate) || 'N/A'}</span>
            <span>Target: {formatDate(proj.targetCompletionDate || proj.targetDateOfCompletion || proj.endDate) || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Actual: {formatDate(proj.completionDate || proj.actualCompletionDate) || '–'}</span>
            <span>Days: {proj.expectedDaysOfCompletion || '–'}</span>
          </div>
        </div>

        {/* Additional Information */}
        <div className="relative z-10 space-y-1 mb-4">
          {/* Coordinates (if available) */}
          {(proj.longitude && proj.latitude) && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">📍 Coordinates:</span> {proj.latitude}, {proj.longitude}
            </div>
          )}
          
          {/* Priority */}
          <div className="text-xs text-gray-500">
            <span className="font-medium">⚡ Priority:</span> 
            <span className={`font-semibold ${
              proj.priority === 'high' ? 'text-red-600' : 
              proj.priority === 'medium' ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              {proj.priority?.toUpperCase() || 'MEDIUM'}
            </span>
          </div>
        </div>
        
        {/* Enhanced Action Section */}
        <div className="relative z-10 mt-auto pt-4 border-t border-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-500 text-xs font-medium">Ready to explore</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                View Details
              </span>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110">
                <svg className="w-5 h-5 text-white transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
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

// Real Leaflet Map Component (like home page)
function LeafletMap({ projects, isFullMap = false }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current, {
      center: [14.281, 121.419],
      zoom: isFullMap ? 11 : 12,
      scrollWheelZoom: isFullMap,
    });

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstance.current);

    // Add markers for projects
    projects.forEach((project) => {
      const coordinates = generateProjectCoordinates(project.id, project.location);
      
      // Create custom icon based on project status
      const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
          case 'ongoing': return '#10B981'; // green
          case 'completed': return '#3B82F6'; // blue
          case 'delayed': return '#EF4444'; // red
          case 'planning': return '#F59E0B'; // yellow
          case 'on hold': return '#F97316'; // orange
          default: return '#6B7280'; // gray
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

      const marker = L.marker(coordinates, { icon: customIcon }).addTo(mapInstance.current);
      
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
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #2563eb;">${project.name}</h3>
          <p><strong>Location:</strong> ${project.location || 'Santa Cruz, Laguna'}</p>
          <p><strong>Status:</strong> <span style="color: ${getStatusColor(project.status)}; font-weight: bold;">${project.status}</span></p>
          <p><strong>Budget:</strong> ${formatBudget(project.budget)}</p>
          <p><strong>Progress:</strong> ${(parseFloat(project.progress) || 0).toFixed(2)}%</p>
          <p><strong>Start Date:</strong> ${formatDate(project.startDate)}</p>
          <p><strong>Category:</strong> ${project.category || 'Infrastructure'}</p>
        </div>
      `);
    });

    // Add legend
    if (isFullMap) {
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
            <div style="width: 12px; height: 12px; background-color: #10B981; border-radius: 50%; margin-right: 8px;"></div>
            <span>Ongoing</span>
                  </div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 12px; height: 12px; background-color: #3B82F6; border-radius: 50%; margin-right: 8px;"></div>
            <span>Completed</span>
                    </div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 12px; height: 12px; background-color: #F59E0B; border-radius: 50%; margin-right: 8px;"></div>
            <span>Planning</span>
                    </div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 12px; height: 12px; background-color: #EF4444; border-radius: 50%; margin-right: 8px;"></div>
            <span>Delayed</span>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="width: 12px; height: 12px; background-color: #6B7280; border-radius: 50%; margin-right: 8px;"></div>
            <span>Other</span>
          </div>
        `;
        return div;
      };
      legend.addTo(mapInstance.current);
    }

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [projects, isFullMap]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: isFullMap ? '700px' : '500px' }}
    />
  );
}

function MiniMap({ projects, isFullMap = false }) {
  return (
    <ErrorBoundary>
      <LeafletMap projects={projects} isFullMap={isFullMap} />
    </ErrorBoundary>
  );
}

export default function ProjectsIsland() {
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState('table');
  const [isTransitioning, setIsTransitioning] = useState(false);
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
    priority: ''
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
      if (currentFilters.priority) params.append('priority', currentFilters.priority);

      const response = await fetch(`${getApiUrl()}/projects/public?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Map backend data to frontend expected format
        const mappedProjects = data.projects.map(project => ({
            id: project.id,
            name: project.name,
            projectCode: project.projectCode, // Keep original field name for ProjectCard
            code: project.projectCode, // Legacy support
            location: project.location,
            implementingOfficeName: project.implementingOfficeName, // Keep original field name for ProjectCard
            implementingOffice: project.implementingOfficeName, // Legacy support
            implementingUnitName: project.implementingOfficeName, // Legacy support
            budget: project.totalBudget,
            totalBudget: project.totalBudget, // Keep original field name for ProjectCard
            status: project.status,
            progress: project.overallProgress || project.progress?.overall || project.progress?.overallProgress || 0,
            timelineProgress: project.timelineProgress || project.progress?.timeline || 0,
            budgetProgress: project.budgetProgress || project.progress?.budget || 0,
            physicalProgress: project.physicalProgress || project.progress?.physical || 0,
            startDate: project.startDate,
            endDate: project.endDate,
            targetCompletionDate: project.targetCompletionDate,
            targetDateOfCompletion: project.targetDateOfCompletion,
            completionDate: project.completionDate,
            actualCompletionDate: project.actualCompletionDate,
            expectedDaysOfCompletion: project.expectedDaysOfCompletion,
            category: project.category,
            priority: project.priority,
            fundingSource: project.fundingSource,
            description: project.description,
            initialPhoto: project.initialPhoto, // Add missing field
            latitude: project.latitude, // Add missing field
            longitude: project.longitude, // Add missing field
            hasExternalPartner: project.hasExternalPartner,
            eiuPersonnelName: project.eiuPersonnelName,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        }));
        
        setProjects(mappedProjects);
        setPagination(data.pagination);
        
        // Dispatch event to update analytics
        console.log('Dispatching projectsUpdated event with projects:', mappedProjects);
        window.dispatchEvent(new CustomEvent('projectsUpdated', {
          detail: { projects: mappedProjects }
        }));
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

  // Enhanced search and filter handling
  const handleSearch = (searchTerm, barangay) => {
    const newFilters = { ...filters, search: searchTerm, barangay };
    setFilters(newFilters);
    fetchProjects(1, newFilters);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    fetchProjects(1, newFilters);
  };

  // Handle view changes
  const handleViewChange = (newView) => {
    setView(newView);
  };

  // Update results counter
  const updateResultsCounter = (count, total) => {
    if (window.updateResultsCounter) {
      window.updateResultsCounter(count, total);
    }
  };

  // Event listeners for parent Astro page communication
  useEffect(() => {
    const handleProjectSearch = (event) => {
      console.log('ProjectsIsland: Received projectSearch event:', event.detail);
      const { searchTerm } = event.detail;
      const newFilters = { ...filters, search: searchTerm };
      console.log('ProjectsIsland: New filters for search:', newFilters);
      setFilters(newFilters);
      fetchProjects(1, newFilters);
    };

    const handleProjectFilter = (event) => {
      console.log('ProjectsIsland: Received projectFilter event:', event.detail);
      const { status, category, priority, barangay } = event.detail;
      const newFilters = { ...filters, status, category, priority, barangay };
      console.log('ProjectsIsland: New filters for filter:', newFilters);
      setFilters(newFilters);
      fetchProjects(1, newFilters);
    };

    const handleProjectAdvancedSearch = (event) => {
      console.log('ProjectsIsland: Received projectAdvancedSearch event:', event.detail);
      const { searchTerm, status, category, priority, barangay } = event.detail;
      const newFilters = { search: searchTerm, status, category, priority, barangay };
      console.log('ProjectsIsland: New filters for advanced search:', newFilters);
      setFilters(newFilters);
      fetchProjects(1, newFilters);
    };

    const handleProjectFilterReset = () => {
      console.log('ProjectsIsland: Received projectFilterReset event');
      const newFilters = { search: '', status: '', category: '', priority: '', barangay: '' };
      console.log('ProjectsIsland: Resetting filters:', newFilters);
      setFilters(newFilters);
      fetchProjects(1, newFilters);
    };

    const handleViewChangeEvent = (event) => {
      console.log('ProjectsIsland: Received viewChange event:', event.detail);
      setView(event.detail);
    };

    window.addEventListener('projectSearch', handleProjectSearch);
    window.addEventListener('projectFilter', handleProjectFilter);
    window.addEventListener('projectAdvancedSearch', handleProjectAdvancedSearch);
    window.addEventListener('projectFilterReset', handleProjectFilterReset);
    window.addEventListener('viewChange', handleViewChangeEvent);

    return () => {
      window.removeEventListener('projectSearch', handleProjectSearch);
      window.removeEventListener('projectFilter', handleProjectFilter);
      window.removeEventListener('projectAdvancedSearch', handleProjectAdvancedSearch);
      window.removeEventListener('projectFilterReset', handleProjectFilterReset);
      window.removeEventListener('viewChange', handleViewChangeEvent);
    };
  }, [filters]);

  // Expose searchProjects method to parent (for backward compatibility)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.searchProjects = handleSearch;
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, []);

  // Update results counter when projects change
  useEffect(() => {
    updateResultsCounter(projects.length, pagination.total);
  }, [projects, pagination.total]);

  // Dispatch initial load event for analytics
  useEffect(() => {
    if (projects.length > 0) {
      console.log('Dispatching projectsLoaded event with projects:', projects);
      window.dispatchEvent(new CustomEvent('projectsLoaded', {
        detail: { projects }
      }));
    }
  }, [projects]);

  // Progress bar animation effect
  useEffect(() => {
    const animateProgressBars = () => {
      const progressBars = document.querySelectorAll('.project-progress-bar-fill');
      progressBars.forEach((bar, index) => {
        const progress = parseFloat(bar.getAttribute('data-progress')) || 0;
        const colorClass = bar.getAttribute('data-progress-color') || '#6B7280';
        
        // Apply the color
        bar.style.backgroundColor = colorClass;
        
        // Reset and start animation
        bar.style.width = '0%';
        bar.offsetHeight; // Trigger reflow
        
        // Start animation after a small delay
        setTimeout(() => {
          bar.style.width = `${progress}%`;
        }, 100 + (index * 200)); // Stagger animations
      });
    };

    // Run animation when component mounts or projects change
    const timer = setTimeout(animateProgressBars, 500);
    
    return () => clearTimeout(timer);
  }, [projects, view]);

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
      {/* Enhanced View Switcher */}
      <div className="flex flex-row justify-end gap-2 mb-8">
        <div className="inline-flex items-center bg-white/95 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-blue-100/50">
          {VIEW_OPTIONS.map((opt, index) => (
            <button
              key={opt.key}
              className={`group relative flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ease-out transform ${
                view === opt.key 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' 
                  : 'text-blue-600 hover:bg-blue-50 hover:scale-105'
              } ${index < VIEW_OPTIONS.length - 1 ? 'mr-1' : ''}`}
              aria-label={opt.label + ' View'}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setView(opt.key);
                  setIsTransitioning(false);
                }, 150);
              }}
              onMouseEnter={(e) => {
                if (view !== opt.key) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (view !== opt.key) {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {/* Background glow for active button */}
              {view === opt.key && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur-lg opacity-30 -z-10"></div>
              )}
              
              {/* Icon with enhanced styling */}
              <div className={`transition-all duration-300 ${view === opt.key ? 'drop-shadow-sm' : 'group-hover:scale-110'}`}>
                {opt.icon}
              </div>
              
              {/* Tooltip */}
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                {opt.label} View
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
              </div>
              
              {/* Active indicator dot */}
              {view === opt.key && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800 text-lg">Loading projects...</p>
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
            <div className="mb-4 text-blue-800 text-sm">
              Showing {projects.length} of {pagination.total} projects
              {(filters.search || filters.barangay) && (
                <span className="ml-2 text-gray-500">
                  (filtered)
                </span>
              )}
            </div>
          )}

          {/* Project Analytics is now moved to the top section */}

          {/* Enhanced View Content with Transitions */}
          <div className={`transition-all duration-500 ease-out ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            {/* Enhanced Premium Table View */}
            {view === 'table' && (
            <div className="relative">
              {/* Premium Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-white/30 to-indigo-50/20 rounded-3xl"></div>
              <div className="absolute top-8 right-8 w-32 h-32 bg-gradient-to-br from-blue-400/8 to-indigo-400/6 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-8 left-8 w-40 h-40 bg-gradient-to-br from-emerald-400/6 to-blue-400/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
              
              <div className="relative bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/50"
                   style={{
                     background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 50%, rgba(239,246,255,0.98) 100%)',
                     boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                   }}>
                
                {/* Enhanced Premium Header */}
                <div className="relative p-8 border-b border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                  {/* Floating Header Decorations */}
                  <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-400/15 rounded-full blur-xl"></div>
                  <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-emerald-400/15 to-blue-400/20 rounded-full blur-lg"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* Enhanced Title Section */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white/50">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 mb-2">
                          Project Data Table
                        </h3>
                        <div className="flex items-center gap-3 text-blue-600/80">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                          </svg>
                          <span className="font-bold">Comprehensive Overview • {projects.length} Projects</span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Project Statistics */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 px-6 py-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                        <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full animate-pulse"></div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-emerald-700">{projects.filter(p => p.status?.toLowerCase() === 'completed').length}</div>
                          <div className="text-xs font-bold text-emerald-600/80">Completed</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-6 py-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                        <div className="w-3 h-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full animate-pulse"></div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-orange-700">{projects.filter(p => p.status?.toLowerCase() === 'ongoing').length}</div>
                          <div className="text-xs font-bold text-orange-600/80">Ongoing</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-500 to-blue-600 border-b border-blue-100">
                      <th className="px-6 py-4 font-bold text-left text-sm text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          </div>
                          Project Details
                        </div>
                      </th>
                      <th className="px-6 py-4 font-bold text-left text-sm text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                          </div>
                          Location
                        </div>
                      </th>
                      <th className="px-6 py-4 font-bold text-left text-sm text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                          </div>
                          Office & Funding
                        </div>
                      </th>
                      <th className="px-6 py-4 font-bold text-left text-sm text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                            </svg>
                          </div>
                          Budget & Progress
                        </div>
                      </th>
                      <th className="px-6 py-4 font-bold text-left text-sm text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                          Timeline
                        </div>
                      </th>
                      <th className="px-6 py-4 font-bold text-left text-sm text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          Status
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 bg-white/80 backdrop-blur-sm">
                    {projects.length > 0 ? (
                      projects.map((proj, index) => (
                        <tr 
                          key={proj.id} 
                          className="hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-blue-100/40 hover:shadow-lg transition-all duration-300 group cursor-pointer transform hover:scale-[1.001] active:scale-[0.999] border-l-4 border-transparent hover:border-blue-500 hover:border-l-4"
                          onClick={(e) => {
                            // Add click animation
                            e.currentTarget.style.transform = 'scale(0.98)';
                            setTimeout(() => {
                              window.location.href = `/project/${proj.id}`;
                            }, 150);
                          }}
                          style={{ cursor: 'pointer' }}
                          title="Click to view project details"
                        >
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300 text-base leading-tight">
                                {proj.name}
                              </div>
                              {proj.code && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h4c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                  </svg>
                                  {proj.code}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                              </div>
                              <span className="font-medium text-gray-900">{proj.location || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="font-semibold text-gray-900">{proj.implementingUnitName || 'Municipal Engineer Office'}</div>
                              <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md text-xs font-medium text-blue-700">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                                </svg>
                                {proj.fundingSource || 'local_fund'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-3">
                              <div className="font-bold text-gray-900 text-lg">{formatBudget(proj.budget || proj.totalBudget)}</div>
                              {proj.progress > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span className="font-medium">Progress</span>
                                    <span className="font-bold text-blue-600">{proj.progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div 
                                      className="h-3 rounded-full transition-all duration-2000 ease-out shadow-sm project-progress-bar-fill"
                                      style={{ 
                                        width: '0%',
                                        backgroundColor: getProgressColor(parseFloat(proj.progress) || 0)
                                      }}
                                      data-progress={parseFloat(proj.progress) || 0}
                                      data-progress-color={getProgressColor(parseFloat(proj.progress) || 0)}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                </div>
                                <span className="font-medium text-gray-900">Start: {formatDate(proj.startDate) || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                </div>
                                <span className="font-medium text-gray-900">Target: {formatDate(proj.targetCompletionDate || proj.targetDateOfCompletion || proj.endDate) || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                </div>
                                <span className="font-medium text-gray-900">Actual: {formatDate(proj.completionDate || proj.actualCompletionDate) || '–'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                </div>
                                <span className="font-medium text-gray-900">Days: {proj.expectedDaysOfCompletion || '–'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-sm ${getStatusColor(proj.status)}`}>
                              <div className={`w-3 h-3 rounded-full mr-3 ${proj.status?.toLowerCase() === 'ongoing' ? 'bg-green-500' : proj.status?.toLowerCase() === 'completed' ? 'bg-blue-500' : proj.status?.toLowerCase() === 'delayed' ? 'bg-red-500' : 'bg-gray-500'} animate-pulse`}></div>
                              {proj.status || 'Not Started'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <div className="text-gray-500">
                              <p className="text-lg font-medium">No projects found</p>
                              <p className="text-sm">Try adjusting your search criteria or filters</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
                {/* Enhanced Footer */}
                <div className="p-6 bg-gradient-to-r from-blue-50/30 to-indigo-50/20 border-t border-blue-100/50">
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122"/>
                      </svg>
                      <span className="text-blue-700 font-bold text-sm">Click any row for details</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
                      </svg>
                      <span className="text-emerald-700 font-bold text-sm">Scroll to navigate</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/>
                      </svg>
                      <span className="text-purple-700 font-bold text-sm">Sort by columns</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Premium Grid/Card View */}
          {view === 'grid' && (
            <div className="relative">
              {/* Premium Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-white/30 to-indigo-50/20 rounded-3xl"></div>
              <div className="absolute top-8 right-8 w-32 h-32 bg-gradient-to-br from-blue-400/8 to-indigo-400/6 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-8 left-8 w-40 h-40 bg-gradient-to-br from-emerald-400/6 to-blue-400/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
              
              <div className="relative z-10">
                {/* Enhanced Header for Grid View */}
                <div className="mb-8 p-8 bg-white/80 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                  {/* Floating Header Decorations */}
                  <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-400/15 rounded-full blur-xl"></div>
                  <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-emerald-400/15 to-blue-400/20 rounded-full blur-lg"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* Enhanced Title Section */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white/50">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-700 to-blue-800 mb-2">
                          Project Card Gallery
                        </h3>
                        <div className="flex items-center gap-3 text-purple-600/80">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                          </svg>
                          <span className="font-bold">Visual Project Overview • {projects.length} Projects</span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Project Statistics */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 px-6 py-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                        <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full animate-pulse"></div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-emerald-700">{projects.filter(p => p.status?.toLowerCase() === 'completed').length}</div>
                          <div className="text-xs font-bold text-emerald-600/80">Completed</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-6 py-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                        <div className="w-3 h-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full animate-pulse"></div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-orange-700">{projects.filter(p => p.status?.toLowerCase() === 'ongoing').length}</div>
                          <div className="text-xs font-bold text-orange-600/80">Ongoing</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-6 py-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                        <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-blue-700">{projects.filter(p => p.status?.toLowerCase() === 'planning').length}</div>
                          <div className="text-xs font-bold text-blue-600/80">Planning</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Grid Container */}
                {projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-fade-in">
                    {projects.map((proj, index) => (
                      <div 
                        key={proj.id} 
                        className="group transform transition-all duration-500 ease-out"
                        style={{
                          animationDelay: `${index * 100}ms`
                        }}
                      >
                        {/* Enhanced Project Card with Premium Design */}
                        <div className="relative">
                          {/* Card Glow Effect */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/20 via-indigo-400/15 to-blue-400/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                          
                          {/* Main Card */}
                          <div className="relative bg-white/90 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-500 group-hover:scale-[1.02] overflow-hidden">
                            <ProjectCard proj={proj} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Enhanced Empty State */}
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 p-16 text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 rounded-full blur-xl"></div>
                        <div className="relative text-purple-400/60 text-8xl mb-6">🏗️</div>
                      </div>
                      <h3 className="text-2xl font-black text-purple-800 mb-4">No Projects Found</h3>
                      <p className="text-purple-600/70 font-semibold mb-6 text-lg">Try adjusting your search criteria or filters to discover projects</p>
                      <div className="flex justify-center gap-4">
                        <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          Reset Filters
                        </button>
                        <button className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-purple-200/50 text-purple-700 font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                          Browse All
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Grid Footer */}
                <div className="mt-8 p-6 bg-white/80 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      <span className="text-purple-700 font-bold text-sm">Click cards to view details</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                      </svg>
                      <span className="text-indigo-700 font-bold text-sm">Hover for quick preview</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
                      </svg>
                      <span className="text-blue-700 font-bold text-sm">Scroll to explore more</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Premium Hybrid View (Cards + Interactive Map) */}
          {view === 'hybrid' && (
            <div className="relative mt-8">
              {/* Premium Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-white/30 to-indigo-50/20 rounded-3xl"></div>
              <div className="absolute top-8 right-8 w-32 h-32 bg-gradient-to-br from-blue-400/8 to-indigo-400/6 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-8 left-8 w-40 h-40 bg-gradient-to-br from-emerald-400/6 to-blue-400/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Enhanced Project Cards Section - 2/3 width */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    {/* Enhanced Header for Project Cards */}
                    <div className="mb-8 p-6 bg-white/80 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800">
                              Project Portfolio
                            </h3>
                            <p className="text-blue-600/80 font-semibold">{projects.length} Active Projects</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/50">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-emerald-700 font-bold text-sm">{projects.filter(p => p.status?.toLowerCase() === 'completed').length} Completed</span>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/50">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span className="text-orange-700 font-bold text-sm">{projects.filter(p => p.status?.toLowerCase() === 'ongoing').length} Ongoing</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Project Cards Grid */}
                    {projects.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projects.map((proj) => (
                          <div key={proj.id} className="group">
                            {/* Enhanced Project Card with Premium Design */}
                            <div className="relative">
                              {/* Card Glow Effect */}
                              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400/20 via-indigo-400/15 to-purple-400/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                              
                              {/* Main Card */}
                              <div className="relative bg-white/90 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-500 group-hover:scale-[1.02] overflow-hidden">
                                <ProjectCard proj={proj} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Enhanced Empty State */}
                        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 p-16 text-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-full blur-xl"></div>
                            <div className="relative text-blue-400/60 text-8xl mb-6">🏗️</div>
                          </div>
                          <h3 className="text-2xl font-black text-blue-800 mb-4">No Projects Found</h3>
                          <p className="text-blue-600/70 font-semibold mb-6 text-lg">Try adjusting your search criteria or filters to discover projects</p>
                          <div className="flex justify-center gap-4">
                            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                              Reset Filters
                            </button>
                            <button className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 text-blue-700 font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                              Browse All
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Premium Mini Map Section - 1/3 width */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8">
                    {/* Enhanced Map Container */}
                    <div className="relative">
                      {/* Map Background Effects */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-white/50 to-blue-50/30 rounded-3xl"></div>
                      <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-emerald-400/10 to-blue-400/8 rounded-full blur-2xl"></div>
                      
                      <ErrorBoundary>
                        <div className="relative bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
                             style={{
                               background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 50%, rgba(239,246,255,0.98) 100%)',
                               boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                             }}>
                          
                          {/* Enhanced Map Header */}
                          <div className="p-6 border-b border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-blue-700 to-indigo-800">
                                  Interactive Map
                                </h4>
                                <p className="text-blue-600/80 font-semibold text-sm">Real-time Project Locations</p>
                              </div>
                            </div>
                            
                            {/* Map Quick Stats */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="px-3 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 text-center">
                                <div className="text-lg font-black text-blue-700">{projects.length}</div>
                                <div className="text-xs font-bold text-blue-600/80">Projects</div>
                              </div>
                              <div className="px-3 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 text-center">
                                <div className="text-lg font-black text-emerald-700">{new Set(projects.map(p => p.location || p.barangay)).size}</div>
                                <div className="text-xs font-bold text-emerald-600/80">Locations</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced Map Container */}
                          <div className="relative h-[450px] bg-gradient-to-br from-blue-50/20 via-transparent to-emerald-50/20">
                            <MiniMap projects={projects} />
                            
                            {/* Floating Map Controls */}
                            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                              <button className="w-10 h-10 bg-white/90 backdrop-blur-lg rounded-xl shadow-lg border border-white/50 flex items-center justify-center text-blue-600 hover:bg-white hover:scale-110 transition-all duration-300">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"/>
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd"/>
                                </svg>
                              </button>
                              <button className="w-10 h-10 bg-white/90 backdrop-blur-lg rounded-xl shadow-lg border border-white/50 flex items-center justify-center text-emerald-600 hover:bg-white hover:scale-110 transition-all duration-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Enhanced Map Footer */}
                          <div className="p-4 bg-gradient-to-r from-blue-50/30 to-emerald-50/20 border-t border-blue-100/50">
                            <div className="flex items-center justify-center gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                </svg>
                                <span className="text-blue-700 font-bold">Click markers</span>
                              </div>
                              <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                                <span className="text-emerald-700 font-bold">Zoom to explore</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ErrorBoundary>
                    </div>
                    
                    {/* Enhanced Map Legend */}
                    <div className="mt-6">
                      <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-5">
                        <h4 className="text-blue-700 font-black text-base mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                          </svg>
                          Project Status
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/50 hover:scale-105 transition-transform duration-300">
                            <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full shadow-md ring-2 ring-emerald-300/30"></div>
                            <span className="text-emerald-800 font-bold text-sm">Completed</span>
                            <div className="ml-auto bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">
                              {projects.filter(p => p.status?.toLowerCase() === 'completed').length}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/50 hover:scale-105 transition-transform duration-300">
                            <div className="w-3 h-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full shadow-md ring-2 ring-yellow-300/30"></div>
                            <span className="text-orange-800 font-bold text-sm">Ongoing</span>
                            <div className="ml-auto bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-xs font-bold">
                              {projects.filter(p => p.status?.toLowerCase() === 'ongoing').length}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 hover:scale-105 transition-transform duration-300">
                            <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-md ring-2 ring-blue-300/30"></div>
                            <span className="text-blue-800 font-bold text-sm">Planning</span>
                            <div className="ml-auto bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">
                              {projects.filter(p => p.status?.toLowerCase() === 'planning').length}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Premium Full Map View */}
          {view === 'map' && (
            <div className="w-full max-w-7xl mx-auto">
              {/* Enhanced Premium Map Container */}
              <div className="relative">
                {/* Premium Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white/50 to-indigo-50/30 rounded-3xl"></div>
                <div className="absolute top-8 right-8 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-400/8 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-8 left-8 w-40 h-40 bg-gradient-to-br from-emerald-400/8 to-blue-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
                
                {/* Main Map Container with Glassmorphism */}
                <div className="relative bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
                     style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 50%, rgba(239,246,255,0.98) 100%)',
                       boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                     }}>
                  
                  {/* Enhanced Header Section */}
                  <div className="relative p-8 border-b border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                    {/* Floating Header Decorations */}
                    <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-400/15 rounded-full blur-xl"></div>
                    <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-emerald-400/15 to-blue-400/20 rounded-full blur-lg"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      {/* Enhanced Title Section */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white/50">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                            </svg>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 mb-2">
                            Interactive Project Map
                          </h3>
                          <div className="flex items-center gap-3 text-blue-600/80">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <span className="font-bold">Santa Cruz, Laguna • {projects.length} Projects</span>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Project Statistics */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-6 py-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                          <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full animate-pulse"></div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-emerald-700">{projects.filter(p => p.status?.toLowerCase() === 'completed').length}</div>
                            <div className="text-xs font-bold text-emerald-600/80">Completed</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-6 py-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg">
                          <div className="w-3 h-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full animate-pulse"></div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-orange-700">{projects.filter(p => p.status?.toLowerCase() === 'ongoing').length}</div>
                            <div className="text-xs font-bold text-orange-600/80">Ongoing</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Map Controls Panel */}
                  <div className="absolute top-32 right-8 z-30 flex flex-col gap-3">
                    <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/50">
                      <h4 className="text-blue-700 font-black text-base mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                        </svg>
                        Map Controls
                      </h4>
                      <div className="flex flex-col gap-3">
                        <button className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"/>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-sm font-bold">Zoom In</span>
                        </button>
                        <button className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                          </svg>
                          <span className="text-sm font-bold">Reset View</span>
                        </button>
                        <button className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 000 2h.01a1 1 0 100-2H3zM6 4a1 1 0 000 2h11a1 1 0 100-2H6zM3 10a1 1 0 000 2h.01a1 1 0 100-2H3zM6 10a1 1 0 000 2h11a1 1 0 100-2H6zM3 16a1 1 0 000 2h.01a1 1 0 100-2H3zM6 16a1 1 0 000 2h11a1 1 0 100-2H6z"/>
                          </svg>
                          <span className="text-sm font-bold">Layers</span>
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Map Legend */}
                    <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/50">
                      <h4 className="text-blue-700 font-black text-base mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        Status Legend
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/50">
                          <div className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full shadow-md ring-2 ring-emerald-300/30"></div>
                          <span className="text-emerald-800 font-bold text-sm">Completed</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/50">
                          <div className="w-4 h-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full shadow-md ring-2 ring-yellow-300/30"></div>
                          <span className="text-orange-800 font-bold text-sm">Ongoing</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200/50">
                          <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full shadow-md ring-2 ring-red-300/30"></div>
                          <span className="text-red-800 font-bold text-sm">Delayed</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                          <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-md ring-2 ring-blue-300/30"></div>
                          <span className="text-blue-800 font-bold text-sm">Planning</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Map Container */}
                  <div className="relative" style={{height: '80vh', minHeight: '700px'}}>
                    {/* Map Background Enhancement */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-emerald-50/20 pointer-events-none"></div>
                    
                    {/* Main Map */}
                    <ErrorBoundary>
                      <MiniMap projects={projects} isFullMap={true} />
                    </ErrorBoundary>
                    
                    {/* Enhanced Map Overlay Information */}
                    <div className="absolute bottom-6 left-6 z-20">
                      <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/50 max-w-sm">
                        <h4 className="text-blue-700 font-black text-base mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Quick Stats
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-semibold text-sm">Total Projects:</span>
                            <span className="text-blue-700 font-black text-base">{projects.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-semibold text-sm">Active Locations:</span>
                            <span className="text-emerald-700 font-black text-base">{new Set(projects.map(p => p.location || p.barangay)).size}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-semibold text-sm">Total Budget:</span>
                            <span className="text-indigo-700 font-black text-base">₱{(projects.reduce((sum, p) => sum + (Number(p.budget || p.totalBudget) || 0), 0) / 1000000).toFixed(1)}M</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Instructions Panel */}
                  <div className="p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border-t border-blue-100/50">
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        <span className="text-blue-700 font-bold text-sm">Click markers for project details</span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <span className="text-emerald-700 font-bold text-sm">Zoom to explore areas</span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-lg rounded-xl border border-white/50 shadow-md">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
                        </svg>
                        <span className="text-purple-700 font-bold text-sm">Drag to navigate around</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Enhanced Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-12 flex justify-center">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-blue-100/50">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => fetchProjects(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                      Previous
                    </div>
                  </button>
                  <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-blue-50 text-blue-800 rounded-xl font-bold text-lg border border-blue-200/50">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  <button
                    onClick={() => fetchProjects(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 
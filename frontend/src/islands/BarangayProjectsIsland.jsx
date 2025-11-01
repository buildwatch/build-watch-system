import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../config/api.js';

// Progress bar color function (same as ProjectsIsland)
const getProgressColor = (progress) => {
  if (progress >= 0 && progress <= 25) return '#EF4444'; // red
  if (progress >= 26 && progress <= 50) return '#F59E0B'; // yellow
  if (progress >= 51 && progress <= 75) return '#3B82F6'; // blue
  if (progress >= 76 && progress <= 100) return '#10B981'; // green
  return '#6B7280'; // gray fallback
};

// Get project image (same logic as ProjectsIsland)
const getProjectImage = (project) => {
  if (project.initialPhoto && project.initialPhoto !== '' && project.initialPhoto !== 'None') {
    const backendUrl = getApiUrl().replace('/api', '');
    return project.initialPhoto.startsWith('http') ? project.initialPhoto : `${backendUrl}${project.initialPhoto}`;
  }
  return '/projects-page-header-bg.png';
};

// Format budget
const formatBudget = (budget) => {
  if (!budget) return 'N/A';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(budget);
};

// Format date
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
    case 'ongoing': return 'bg-blue-500 text-white';
    case 'completed': return 'bg-green-500 text-white';
    case 'delayed': return 'bg-red-500 text-white';
    case 'pending': return 'bg-yellow-500 text-white';
    case 'on hold': return 'bg-orange-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// ProjectCard component (matching ProjectsIsland structure)
function ProjectCard({ proj }) {
  const progress = parseFloat(proj.progress || proj.overallProgress || 0);
  const timelineProgress = parseFloat(proj.timelineProgress || proj.progress?.timeline || 0);
  const budgetProgress = parseFloat(proj.budgetProgress || proj.progress?.budget || 0);
  const physicalProgress = parseFloat(proj.physicalProgress || proj.progress?.physical || 0);

  const handleProjectClick = () => {
    window.location.href = `/project/${proj.id}`;
  };

  useEffect(() => {
    // Animate progress bars
    const progressBar = document.querySelector(`[data-project-id="${proj.id}"] .project-progress-bar-fill`);
    if (progressBar) {
      setTimeout(() => {
        progressBar.style.width = `${progress}%`;
      }, 100);
    }
  }, [proj.id, progress]);

  return (
    <div className="relative">
      <div 
        className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden flex flex-col w-full border border-blue-100/50 hover:shadow-2xl hover:border-blue-300/50 transition-all duration-500 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-2 group relative"
        onClick={handleProjectClick}
        data-project-id={proj.id}
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
                <span className="text-lg font-bold">{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-2000 ease-out shadow-lg relative project-progress-bar-fill" 
                  style={{ 
                    width: '0%',
                    backgroundColor: getProgressColor(progress)
                  }}
                  data-progress={progress}
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
              <span className="font-semibold text-blue-600">{timelineProgress.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Budget:</span>
              <span className="font-semibold text-blue-600">{budgetProgress.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Physical:</span>
              <span className="font-semibold text-blue-600">{physicalProgress.toFixed(1)}%</span>
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

          {/* Priority */}
          <div className="relative z-10 mt-auto pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/>
                </svg>
                <span className={`text-xs font-bold ${proj.priority?.toLowerCase() === 'high' ? 'text-red-600' : proj.priority?.toLowerCase() === 'medium' ? 'text-orange-600' : 'text-blue-600'}`}>
                  Priority: {proj.priority?.toUpperCase() || 'MEDIUM'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-green-600 text-xs font-semibold">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Ready to explore</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BarangayProjectsIsland({ barangayName, initialProjects = [] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [filteredProjects, setFilteredProjects] = useState(initialProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch(`${getApiUrl()}/projects/public?page=1&limit=1000&_t=${Date.now()}`);
        const data = await res.json().catch(() => ({}));
        const all = (data.projects || []).map(p => ({
          ...p,
          location: p.location || '',
        }));
        const byBarangay = all.filter(p => 
          (p.location || '').toLowerCase().includes(barangayName.toLowerCase())
        );
        setProjects(byBarangay);
        setFilteredProjects(byBarangay);
        
                // Update stats in DOM
                const byId = (id) => document.getElementById(id);
                const total = byBarangay.length;
                const ongoing = byBarangay.filter(p => (p.status || '').toLowerCase() === 'ongoing').length;
                const delayed = byBarangay.filter(p => (p.status || '').toLowerCase() === 'delayed').length;
                const completed = byBarangay.filter(p => 
                  (p.status || '').toLowerCase() === 'completed' || (p.status || '').toLowerCase() === 'complete'
                ).length;
                const avg = total > 0 
                  ? Math.round(byBarangay.reduce((s, p) => s + (Number(p.overallProgress || p.progress?.overall || p.progress || 0)), 0) / total) 
                  : 0;
                
                if (byId('stat-total')) byId('stat-total').textContent = total;
                if (byId('stat-ongoing')) byId('stat-ongoing').textContent = ongoing;
                if (byId('stat-delayed')) byId('stat-delayed').textContent = delayed;
                if (byId('stat-completed')) byId('stat-completed').textContent = completed;
                if (byId('stat-avg')) byId('stat-avg').textContent = `${avg}%`;
                if (byId('count')) byId('count').textContent = byBarangay.length;
                
                // Last Update - now shown as subtitle in Avg. Progress card
                if (total > 0) {
                  const lastUpdate = byBarangay
                    .map(p => new Date(p.updatedAt || p.createdAt || p.startDate || 0))
                    .sort((a,b) => b - a)[0];
                  if (lastUpdate && !isNaN(lastUpdate.getTime())) {
                    const stamp = lastUpdate.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
                    // Update subtitle in Avg. Progress card
                    if (byId('stat-lastupdate')) {
                      byId('stat-lastupdate').textContent = `Updated ${stamp}`;
                    }
                    // Also update hero badge if it exists
                    const badge = byId('last-update-badge');
                    if (badge) {
                      badge.textContent = `Updated on ${stamp}`;
                      badge.classList.remove('hidden');
                    }
                  } else {
                    if (byId('stat-lastupdate')) {
                      byId('stat-lastupdate').textContent = '—';
                    }
                  }
                  // Top Implementing Office
                  const officeCounts = {};
                  byBarangay.forEach(p => {
                    const key = p.implementingOfficeName || 'Unknown';
                    officeCounts[key] = (officeCounts[key] || 0) + 1;
                  });
                  const top = Object.entries(officeCounts).sort((a,b) => b[1] - a[1])[0];
                  if (top && byId('stat-topoffice')) byId('stat-topoffice').textContent = `${top[0]} (${top[1]})`;
                } else {
                  // No projects, show default
                  if (byId('stat-lastupdate')) {
                    byId('stat-lastupdate').textContent = '—';
                  }
                }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    }
    
    loadProjects();
  }, [barangayName]);
  
  // Wire up search/filter/sort inputs
  useEffect(() => {
    const searchInput = document.getElementById('search');
    const statusSelect = document.getElementById('status');
    const sortSelect = document.getElementById('sort');
    
    const handleChange = () => {
      if (searchInput) setSearchQuery(searchInput.value || '');
      if (statusSelect) setStatusFilter(statusSelect.value || 'all');
      if (sortSelect) {
        const val = sortSelect.value || 'recent';
        // Map page sort values to island sort values
        const sortMap = {
          'recent': 'recent',
          'name': 'name',
          'budget_desc': 'budget-high',
          'budget_asc': 'budget-low',
          'progress_desc': 'progress-high',
          'progress_asc': 'progress-low'
        };
        setSortBy(sortMap[val] || 'recent');
      }
    };
    
    if (searchInput) searchInput.addEventListener('input', handleChange);
    if (statusSelect) statusSelect.addEventListener('change', handleChange);
    if (sortSelect) sortSelect.addEventListener('change', handleChange);
    
    return () => {
      if (searchInput) searchInput.removeEventListener('input', handleChange);
      if (statusSelect) statusSelect.removeEventListener('change', handleChange);
      if (sortSelect) sortSelect.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    let filtered = [...projects];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => 
        (p.status || '').toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'budget-high':
          return (Number(b.totalBudget || b.budget || 0)) - (Number(a.totalBudget || a.budget || 0));
        case 'budget-low':
          return (Number(a.totalBudget || a.budget || 0)) - (Number(b.totalBudget || b.budget || 0));
        case 'progress-high':
          return (Number(b.progress || b.overallProgress || 0)) - (Number(a.progress || a.overallProgress || 0));
        case 'progress-low':
          return (Number(a.progress || a.overallProgress || 0)) - (Number(b.progress || b.overallProgress || 0));
        case 'recent':
        default:
          return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      }
    });
    
    setFilteredProjects(filtered);
    
    // Update count in DOM
    const countEl = document.getElementById('count');
    if (countEl) countEl.textContent = filtered.length;
  }, [projects, searchQuery, statusFilter, sortBy]);

  return (
    <>
      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((proj) => (
          <ProjectCard key={proj.id} proj={proj} />
        ))}
      </div>
      
      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-semibold">No projects found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}
    </>
  );
}


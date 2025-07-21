import React, { useEffect, useState, Suspense } from 'react';
import projectService from '../services/projects.js';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  'All',
  'Planning',
  'Ongoing',
  'On Hold',
  'Delayed',
  'Near Completion',
  'Completed',
  'Cancelled',
  'Not Started',
];
const SORT_OPTIONS = [
  { value: 'name', label: 'Project Name' },
  { value: 'startDate', label: 'Start Date' },
];

function ProjectCard({ proj, onClick }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col w-full sm:w-[48%] lg:w-[32%] mb-6 border border-[#EB3C3C]/10 cursor-pointer hover:shadow-2xl transition focus:outline-none focus:ring-2 focus:ring-[#EB3C3C]" onClick={onClick} tabIndex={0} aria-label={`View details for ${proj.name || proj.projectName}`}> 
      <div className="h-32 sm:h-40 w-full bg-gray-200 flex items-center justify-center">
        {/* Placeholder for project image or icon */}
        <span className="text-4xl sm:text-5xl text-[#EB3C3C]">🏗️</span>
      </div>
      <div className="p-4 sm:p-6 flex flex-col flex-1">
        <h3 className="text-lg sm:text-xl font-bold text-[#EB3C3C] mb-2 line-clamp-2">{proj.name || proj.projectName}</h3>
        <div className="text-[#7A1F1F] text-xs sm:text-sm mb-1"><b>Location:</b> {proj.location || 'N/A'}</div>
        <div className="text-[#7A1F1F] text-xs sm:text-sm mb-1"><b>Implementing Office:</b> {proj.implementingOffice || 'N/A'}</div>
        <div className="text-[#7A1F1F] text-xs sm:text-sm mb-1"><b>Budget:</b> {proj.budget ? `${proj.budget} | ${proj.fundingSource || 'N/A'}` : 'N/A'}</div>
        <div className="text-[#7A1F1F] text-xs sm:text-sm mb-1"><b>Status:</b> <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-yellow-200 text-[#7A1F1F]">{proj.status || 'Not Started'}</span></div>
        <div className="text-[#7A1F1F] text-xs mt-2"><b>Start Date:</b> {proj.startDate || 'N/A'}</div>
      </div>
    </div>
  );
}

function ProjectDetailModal({ projectId, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    projectService.getProjectById(projectId)
      .then(data => {
        setProject(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.error || 'Failed to load project details');
        setLoading(false);
      });
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-[95vw] p-4 sm:p-8 relative font-[Montserrat] mx-2">
        <button onClick={onClose} className="absolute top-3 right-3 text-[#EB3C3C] text-2xl font-bold hover:text-[#7A1F1F] focus:outline-none" aria-label="Close modal">&times;</button>
        {loading ? (
          <div className="flex justify-center items-center h-40 text-[#7A1F1F] text-xl font-bold">Loading...</div>
        ) : error ? (
          <div className="flex justify-center items-center h-40 text-red-600 text-xl font-bold">{error}</div>
        ) : (
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EB3C3C] mb-2 break-words">{project.name || project.projectName}</h2>
            <div className="text-[#7A1F1F] mb-2 text-sm sm:text-base break-words">{project.description || 'No description available.'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs sm:text-sm">
              <div><b>Location:</b> {project.location || 'N/A'}</div>
              <div><b>Status:</b> <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-yellow-200 text-[#7A1F1F]">{project.status || 'Not Started'}</span></div>
              <div><b>Implementing Office:</b> {project.implementingOffice || 'N/A'}</div>
              <div><b>Budget:</b> {project.budget ? `${project.budget} | ${project.fundingSource || 'N/A'}` : 'N/A'}</div>
              <div><b>Start Date:</b> {project.startDate || 'N/A'}</div>
              <div><b>End Date:</b> {project.endDate || 'N/A'}</div>
            </div>
          </div>
        )}
      </div>
      <div className="fixed inset-0 z-40" onClick={onClose} tabIndex={-1} aria-label="Close modal" />
    </div>
  );
}

const ProjectMapIsland = React.lazy(() => import('./ProjectMapIsland.jsx'));

export default function ProjectListIsland() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState('table'); // 'table', 'card', 'map'
  const [detailId, setDetailId] = useState(null); // projectId for modal
  // Search, filter, sort state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('name');
  const [asc, setAsc] = useState(true);

  useEffect(() => {
    setLoading(true);
    projectService.getAllProjects({ page, pageSize: PAGE_SIZE })
      .then(data => {
        setProjects(data.projects || data); // support both array and {projects, total}
        setTotal(data.total || (data.projects ? data.projects.length : data.length));
        setLoading(false);
      })
      .catch(err => {
        setError(err.error || 'Failed to load projects');
        setLoading(false);
      });
  }, [page]);

  // Filter, search, and sort projects client-side
  const filtered = projects
    .filter(p => {
      const matchesSearch = search.trim() === '' || (p.name || p.projectName || '').toLowerCase().includes(search.trim().toLowerCase());
      const matchesStatus = status === 'All' || (p.status || 'Not Started') === status;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal = a[sort] || a.name || a.projectName || '';
      let bVal = b[sort] || b.name || b.projectName || '';
      if (sort === 'startDate') {
        aVal = a.startDate || '';
        bVal = b.startDate || '';
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-[#7A1F1F] text-xl font-bold">Loading projects...</div>;
  }
  if (error) {
    return <div className="flex justify-center items-center h-64 text-red-600 text-xl font-bold">{error}</div>;
  }

  // Paginate filtered results
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="w-full font-[Montserrat]">
      {/* Search, Filter, Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="flex-1 flex flex-row gap-2">
          <input
            type="text"
            placeholder="Search for Project Name or Code"
            className="flex-1 px-4 py-2 rounded-lg border border-[#EB3C3C] bg-white text-[#7A1F1F] font-medium text-sm sm:text-base"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search projects"
          />
          <select
            className="px-4 py-2 rounded-lg border border-[#EB3C3C] bg-white text-[#EB3C3C] font-bold text-sm sm:text-base"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="flex flex-row gap-2 items-center">
          <label className="text-[#7A1F1F] font-bold mr-2 text-sm sm:text-base">Sort by:</label>
          <select
            className="px-3 py-2 rounded-lg border border-[#EB3C3C] bg-white text-[#EB3C3C] font-bold text-sm sm:text-base"
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label="Sort projects"
          >
            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button
            className="ml-2 px-3 py-2 rounded-lg border border-[#EB3C3C] bg-white text-[#EB3C3C] font-bold hover:bg-[#EBACAC] transition text-sm sm:text-base"
            onClick={() => setAsc(a => !a)}
            title={asc ? 'Ascending' : 'Descending'}
            aria-label={asc ? 'Sort ascending' : 'Sort descending'}
          >{asc ? '↑' : '↓'}</button>
        </div>
      </div>
      {/* View Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          className={`px-4 py-2 rounded-lg font-bold border transition text-sm sm:text-base ${view === 'table' ? 'bg-[#EB3C3C] text-white border-[#EB3C3C]' : 'bg-white text-[#EB3C3C] border-[#EB3C3C]'}`}
          onClick={() => setView('table')}
          aria-label="Table view"
        >Table</button>
        <button
          className={`px-4 py-2 rounded-lg font-bold border transition text-sm sm:text-base ${view === 'card' ? 'bg-[#EB3C3C] text-white border-[#EB3C3C]' : 'bg-white text-[#EB3C3C] border-[#EB3C3C]'}`}
          onClick={() => setView('card')}
          aria-label="Card view"
        >Cards</button>
        <button
          className={`px-4 py-2 rounded-lg font-bold border transition text-sm sm:text-base ${view === 'map' ? 'bg-[#EB3C3C] text-white border-[#EB3C3C]' : 'bg-white text-[#EB3C3C] border-[#EB3C3C]'}`}
          onClick={() => setView('map')}
          aria-label="Map view"
        >Map</button>
      </div>
      {/* Table View */}
      {view === 'table' && (
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden text-xs sm:text-sm md:text-base">
            <thead>
              <tr className="bg-[#EB3C3C] text-white text-left">
                <th className="px-4 sm:px-6 py-3 font-bold">Project Name/Code</th>
                <th className="px-4 sm:px-6 py-3 font-bold">Location</th>
                <th className="px-4 sm:px-6 py-3 font-bold">Implementing Office</th>
                <th className="px-4 sm:px-6 py-3 font-bold">Budget (PHP)/Funding Src</th>
                <th className="px-4 sm:px-6 py-3 font-bold">Start Date/Longevity</th>
                <th className="px-4 sm:px-6 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#7A1F1F]">No projects found.</td></tr>
              ) : (
                paged.map((proj, idx) => (
                  <tr key={proj.id || idx} className="border-b last:border-none hover:bg-[#EBACAC]/20 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#EB3C3C]" onClick={() => setDetailId(proj.id)} tabIndex={0} aria-label={`View details for ${proj.name || proj.projectName}`}> 
                    <td className="px-4 sm:px-6 py-4 font-semibold max-w-[180px] truncate">{proj.name || proj.projectName}</td>
                    <td className="px-4 sm:px-6 py-4 max-w-[120px] truncate">{proj.location || 'N/A'}</td>
                    <td className="px-4 sm:px-6 py-4 max-w-[120px] truncate">{proj.implementingOffice || 'N/A'}</td>
                    <td className="px-4 sm:px-6 py-4 max-w-[120px] truncate">{proj.budget ? `${proj.budget} | ${proj.fundingSource || 'N/A'}` : 'N/A'}</td>
                    <td className="px-4 sm:px-6 py-4 max-w-[120px] truncate">{proj.startDate || 'N/A'}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-yellow-200 text-[#7A1F1F]">
                        {proj.status || 'Not Started'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Card/Grid View */}
      {view === 'card' && (
        <div className="flex flex-wrap gap-4 justify-between">
          {paged.length === 0 ? (
            <div className="w-full text-center py-8 text-[#7A1F1F]">No projects found.</div>
          ) : (
            paged.map((proj, idx) => (
              <ProjectCard key={proj.id || idx} proj={proj} onClick={() => setDetailId(proj.id)} />
            ))
          )}
        </div>
      )}
      {/* Map View */}
      {view === 'map' && (
        <Suspense fallback={<div className="flex justify-center items-center h-64 text-[#7A1F1F] text-xl font-bold">Loading map...</div>}>
          <ProjectMapIsland projects={paged} />
        </Suspense>
      )}
      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-2">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#EB3C3C] text-white text-xl shadow hover:bg-[#d32f2f] transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >&#8592;</button>
        <span className="text-[#7A1F1F] font-bold text-base sm:text-lg">Page {page} / {pageCount}</span>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#EB3C3C] text-white text-xl shadow hover:bg-[#d32f2f] transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setPage(p => Math.min(pageCount, p + 1))}
          disabled={page === pageCount || pageCount === 0}
          aria-label="Next page"
        >&#8594;</button>
      </div>
      {/* Project Detail Modal */}
      {detailId && <ProjectDetailModal projectId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
} 
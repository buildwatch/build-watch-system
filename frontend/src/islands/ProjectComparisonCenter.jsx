import { useState, useEffect } from 'react';

/**
 * ProjectComparisonCenter - Side-by-side project comparison tool
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 */
export default function ProjectComparisonCenter({
  theme = 'amber',
  projects = []
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [projectDetails, setProjectDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [maxCompare, setMaxCompare] = useState(4);

  // Theme colors
  const themeColors = {
    amber: {
      button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
      accent: 'text-amber-600',
      border: 'border-amber-200'
    },
    emerald: {
      button: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      accent: 'text-emerald-600',
      border: 'border-emerald-200'
    },
    sky: {
      button: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
      accent: 'text-sky-600',
      border: 'border-sky-200'
    },
    blue: {
      button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      accent: 'text-blue-600',
      border: 'border-blue-200'
    }
  };

  const colors = themeColors[theme] || themeColors.amber;

  // Toggle project selection for comparison
  const toggleProjectSelection = (projectId) => {
    const newSelected = [...selectedProjects];
    const index = newSelected.indexOf(projectId);
    
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      if (newSelected.length >= maxCompare) {
        alert(`You can compare up to ${maxCompare} projects at a time.`);
        return;
      }
      newSelected.push(projectId);
    }
    
    setSelectedProjects(newSelected);
  };

  // Load project details for comparison
  const loadProjectDetails = async () => {
    if (selectedProjects.length < 2) {
      alert('Please select at least 2 projects to compare');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';

      const detailsPromises = selectedProjects.map(async (projectId) => {
        const response = await fetch(`${API_URL}/projects/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch project ${projectId}`);
        }

        const data = await response.json();
        return data.success ? data.project : null;
      });

      const details = await Promise.all(detailsPromises);
      const validDetails = details.filter(d => d !== null);
      
      if (validDetails.length !== selectedProjects.length) {
        alert('Some projects could not be loaded');
      }

      setProjectDetails(validDetails);
      setShowModal(true);
    } catch (error) {
      console.error('Error loading project details:', error);
      alert('Error loading project details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format budget
  const formatBudget = (amount) => {
    if (!amount) return '₱0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectComparisonCenter = {
        toggleSelection: toggleProjectSelection,
        getSelectedProjects: () => selectedProjects,
        clearSelection: () => setSelectedProjects([]),
        compare: loadProjectDetails,
        openModal: () => {
          if (selectedProjects.length >= 2) {
            loadProjectDetails();
          } else {
            alert('Please select at least 2 projects to compare');
          }
        },
        closeModal: () => {
          setShowModal(false);
          setProjectDetails([]);
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectComparisonCenter) {
        delete window.projectComparisonCenter;
      }
    };
  }, [selectedProjects, maxCompare]);

  if (!showModal) {
    return null;
  }

  const comparisonFields = [
    { key: 'name', label: 'Project Name' },
    { key: 'projectCode', label: 'Project Code' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'totalBudget', label: 'Total Budget', format: formatBudget },
    { key: 'overallProgress', label: 'Overall Progress', format: (v) => `${v}%` },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'location', label: 'Location' },
    { key: 'implementingOfficeName', label: 'Implementing Office' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Compare Projects</h3>
              <p className="text-white/90 text-sm mt-1">
                Side-by-side comparison of {projectDetails.length} project(s)
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                setProjectDetails([]);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10">
                    Field
                  </th>
                  {projectDetails.map((project, index) => (
                    <th key={project.id} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 min-w-[250px]">
                      <div className="font-bold text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{project.projectCode}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFields.map((field) => (
                  <tr key={field.key} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                      {field.label}
                    </td>
                    {projectDetails.map((project) => {
                      let value = project[field.key];
                      if (field.format) {
                        value = field.format(value);
                      } else if (Array.isArray(value)) {
                        value = value.join(', ');
                      } else if (value === null || value === undefined) {
                        value = 'N/A';
                      }
                      
                      return (
                        <td key={project.id} className="px-4 py-3 text-sm text-gray-900">
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowModal(false);
              setProjectDetails([]);
            }}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


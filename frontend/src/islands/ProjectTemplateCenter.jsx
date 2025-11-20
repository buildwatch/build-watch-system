import { useState, useEffect } from 'react';

/**
 * ProjectTemplateCenter - Centralized component for project templates and duplication
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of existing projects
 * @param {Function} onDuplicate - Callback when project is duplicated
 * @param {Function} onSaveTemplate - Callback when project is saved as template
 * @param {Function} onLoadTemplate - Callback when template is loaded
 */
export default function ProjectTemplateCenter({
  theme = 'amber',
  projects = [],
  onDuplicate = null,
  onSaveTemplate = null,
  onLoadTemplate = null
}) {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Load templates from localStorage
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const saved = localStorage.getItem('projectTemplates');
      if (saved) {
        setTemplates(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading templates:', e);
    }
  };

  const saveTemplates = (newTemplates) => {
    try {
      localStorage.setItem('projectTemplates', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (e) {
      console.error('Error saving templates:', e);
    }
  };

  // Duplicate project
  const handleDuplicate = async (project) => {
    if (!project) {
      alert('No project selected');
      return;
    }

    setLoading(true);
    try {
      // Fetch full project details
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      
      const response = await fetch(`${API_URL}/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const data = await response.json();
      if (!data.success || !data.project) {
        throw new Error('Project not found');
      }

      const fullProject = data.project;

      // Prepare duplicate project data (remove ID, generate new code, update name)
      const duplicateData = {
        ...fullProject,
        name: `${fullProject.name} (Copy)`,
        projectCode: '', // Will be auto-generated
        status: 'pending',
        createdAt: new Date().toISOString(),
        // Remove IDs from milestones so they're created as new
        milestones: fullProject.milestones?.map(m => ({
          ...m,
          id: undefined,
          projectId: undefined
        })) || []
      };

      // Open create modal with duplicated data
      if (typeof window !== 'undefined' && window.openCreateProjectModal) {
        window.openCreateProjectModal();
        
        // Wait for modal to open, then populate form
        setTimeout(() => {
          populateFormFromProject(duplicateData);
        }, 300);
      }

      // Call callback if provided
      if (onDuplicate && typeof onDuplicate === 'function') {
        onDuplicate(duplicateData);
      }

      setShowDuplicateModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error duplicating project:', error);
      alert('Error duplicating project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Populate create form from project data
  const populateFormFromProject = (project) => {
    const form = document.getElementById('createProjectForm');
    if (!form) {
      console.error('Create project form not found');
      return;
    }

    // Populate basic fields
    const fields = [
      { selector: 'input[name="name"]', value: project.name },
      { selector: 'select[name="category"]', value: project.category },
      { selector: 'select[name="priority"]', value: project.priority },
      { selector: 'select[name="fundingSource"]', value: project.fundingSource },
      { selector: 'textarea[name="description"]', value: project.description },
      { selector: 'textarea[name="expectedOutputs"]', value: project.expectedOutputs },
      { selector: 'textarea[name="targetBeneficiaries"]', value: project.targetBeneficiaries },
      { selector: 'input[name="eiuPersonnelId"]', value: project.eiuPersonnelId || '' },
      { selector: 'input[name="startDate"]', value: project.startDate },
      { selector: 'input[name="endDate"]', value: project.endDate },
      { selector: 'textarea[name="timelineMilestones"]', value: project.timelineMilestones },
      { selector: 'input[name="totalBudget"]', value: project.totalBudget },
      { selector: 'textarea[name="budgetBreakdown"]', value: project.budgetBreakdown },
      { selector: 'textarea[name="requiredDocumentation"]', value: project.requiredDocumentation },
      { selector: 'textarea[name="physicalProgressRequirements"]', value: project.physicalProgressRequirements },
      { selector: 'input[name="projectManager"]', value: project.projectManager },
      { selector: 'input[name="contactNumber"]', value: project.contactNumber },
      { selector: 'textarea[name="specialRequirements"]', value: project.specialRequirements }
    ];

    fields.forEach(field => {
      const element = form.querySelector(field.selector);
      if (element) {
        element.value = field.value || '';
      }
    });

    // Handle location
    if (project.location) {
      const locationContainer = document.getElementById('barangayContainer');
      if (locationContainer) {
        locationContainer.innerHTML = '';
        const locations = typeof project.location === 'string' 
          ? project.location.split(',').map(loc => loc.trim()).filter(loc => loc)
          : Array.isArray(project.location) ? project.location : [];
        
        locations.forEach((location, index) => {
          if (index === 0 && typeof window.addBarangayDropdown === 'function') {
            window.addBarangayDropdown(location);
          } else if (typeof window.addBarangayDropdown === 'function') {
            window.addBarangayDropdown(location);
          }
        });
      }
    }

    // Handle milestones
    if (project.milestones && project.milestones.length > 0) {
      const milestonesContainer = document.getElementById('milestonesContainer');
      if (milestonesContainer && typeof window.addMilestone === 'function') {
        project.milestones.forEach((milestone, index) => {
          if (index === 0) {
            // Populate first milestone
            const milestoneFields = milestonesContainer.querySelectorAll('input, textarea, select');
            // This would need to be implemented based on the actual milestone structure
          } else {
            window.addMilestone();
          }
        });
      }
    }

    // Handle external partner checkbox
    const hasExternalPartnerCheckbox = form.querySelector('input[name="hasExternalPartner"]');
    if (hasExternalPartnerCheckbox) {
      hasExternalPartnerCheckbox.checked = project.hasExternalPartner || !!project.eiuPersonnelId;
    }
  };

  // Save project as template
  const handleSaveTemplate = async () => {
    if (!selectedProject || !templateName.trim()) {
      alert('Please select a project and enter a template name');
      return;
    }

    setLoading(true);
    try {
      // Fetch full project details
      const token = localStorage.getItem('token');
      const API_URL = 'http://localhost:3000/api';
      
      const response = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const data = await response.json();
      if (!data.success || !data.project) {
        throw new Error('Project not found');
      }

      const fullProject = data.project;

      // Create template object
      const template = {
        id: Date.now().toString(),
        name: templateName.trim(),
        description: templateDescription.trim(),
        projectData: {
          ...fullProject,
          // Remove IDs and dates
          id: undefined,
          projectCode: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          status: 'pending',
          milestones: fullProject.milestones?.map(m => ({
            ...m,
            id: undefined,
            projectId: undefined
          })) || []
        },
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('userId') || 'unknown'
      };

      // Save to localStorage
      const newTemplates = [...templates, template];
      saveTemplates(newTemplates);

      // Call callback if provided
      if (onSaveTemplate && typeof onSaveTemplate === 'function') {
        onSaveTemplate(template);
      }

      setShowTemplateModal(false);
      setSelectedProject(null);
      setTemplateName('');
      setTemplateDescription('');
      
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load template into create form
  const handleLoadTemplate = (template) => {
    if (!template || !template.projectData) {
      alert('Invalid template');
      return;
    }

    // Open create modal
    if (typeof window !== 'undefined' && window.openCreateProjectModal) {
      window.openCreateProjectModal();
      
      // Wait for modal to open, then populate form
      setTimeout(() => {
        populateFormFromProject(template.projectData);
      }, 300);
    }

    // Call callback if provided
    if (onLoadTemplate && typeof onLoadTemplate === 'function') {
      onLoadTemplate(template);
    }

    setShowTemplateModal(false);
  };

  // Delete template
  const handleDeleteTemplate = (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    const newTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(newTemplates);
  };

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectTemplateCenter = {
        duplicateProject: handleDuplicate,
        saveAsTemplate: (project) => {
          setSelectedProject(project);
          setShowTemplateModal(true);
        },
        loadTemplate: handleLoadTemplate,
        getTemplates: () => templates
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectTemplateCenter) {
        delete window.projectTemplateCenter;
      }
    };
  }, [templates, selectedProject]);

  return (
    <>
      {/* Template Management Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Save Project as Template</h3>
                  <p className="text-white/90 mt-1">Create a reusable template from this project</p>
                </div>
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setSelectedProject(null);
                    setTemplateName('');
                    setTemplateDescription('');
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedProject && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Selected Project</p>
                  <p className="font-semibold text-gray-900">{selectedProject.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedProject.projectCode}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Infrastructure Project Template"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is used for..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  maxLength={500}
                />
              </div>

              {/* Templates List */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Saved Templates</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No templates saved yet</p>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-amber-300 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Created {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadTemplate(template)}
                            className={`px-3 py-1.5 ${colors.button} text-white text-sm rounded-lg hover:shadow-lg transition-all`}
                          >
                            Use
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedProject(null);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={loading || !templateName.trim()}
                className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


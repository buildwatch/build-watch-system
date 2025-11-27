import { useState, useEffect } from 'react';

/**
 * ProjectAssignmentCenter - Centralized component for EIU assignment and reassignment
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Object} project - Project object to assign/reassign EIU
 * @param {Function} onAssign - Callback when EIU is assigned
 */
export default function ProjectAssignmentCenter({
  theme = 'amber',
  project: propProject = null,
  onAssign = null
}) {
  const [showModal, setShowModal] = useState(false);
  const [project, setProject] = useState(propProject);
  const [eiuPersonnelId, setEiuPersonnelId] = useState('');
  const [eiuValidation, setEiuValidation] = useState({ valid: false, name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [currentEIU, setCurrentEIU] = useState(null);
  const [eiuAccounts, setEiuAccounts] = useState([]);
  const [loadingEIUAccounts, setLoadingEIUAccounts] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingEIUId, setPendingEIUId] = useState(null);
  
  // Dynamic API URL helper
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      if (window.getApiUrl) {
        return window.getApiUrl();
      }
      const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      return isProd 
        ? `${window.location.protocol}//${window.location.hostname}/api`
        : 'http://localhost:3000/api';
    }
    return '/api';
  };

  // Update project when prop changes
  useEffect(() => {
    if (propProject) {
      setProject(propProject);
    }
  }, [propProject]);

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

  // Load current EIU info when project changes
  useEffect(() => {
    if (project) {
      // If project has eiuPersonnel object (from API), use it directly
      if (project.eiuPersonnel) {
        setCurrentEIU(project.eiuPersonnel);
        setEiuPersonnelId(project.eiuPersonnel.id || project.eiuPersonnelId || '');
        setEiuValidation({ 
          valid: true, 
          name: project.eiuPersonnel.name || 'Current EIU', 
          email: project.eiuPersonnel.email || '' 
        });
      } else if (project.eiuPersonnelId) {
        // If only eiuPersonnelId (UUID) is available, fetch user details
        loadEIUInfoByUUID(project.eiuPersonnelId);
      } else {
        setEiuPersonnelId('');
        setCurrentEIU(null);
        setEiuValidation({ valid: false, name: '', email: '' });
      }
    } else {
      setEiuPersonnelId('');
      setCurrentEIU(null);
      setEiuValidation({ valid: false, name: '', email: '' });
    }
  }, [project]);

  // Load EIU accounts when modal opens
  useEffect(() => {
    if (showModal) {
      loadEIUAccounts();
    }
  }, [showModal, project]);

  // Load EIU information by UUID (database ID) - fetch from project API
  const loadEIUInfoByUUID = async (uuid) => {
    if (!uuid || !project) {
      setCurrentEIU(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Fetch the project again to get the full eiuPersonnel data
      const response = await fetch(`${getApiUrl()}/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.project && data.project.eiuPersonnel) {
          const eiuUser = data.project.eiuPersonnel;
          setCurrentEIU(eiuUser);
          setEiuPersonnelId(eiuUser.userId || uuid); // Use userId if available, otherwise UUID
          setEiuValidation({ 
            valid: true, 
            name: eiuUser.name || 'Valid EIU Account', 
            email: eiuUser.email || '' 
          });
        } else {
          setCurrentEIU(null);
          setEiuValidation({ valid: false, name: 'EIU not found', email: '' });
        }
      } else {
        setCurrentEIU(null);
        setEiuValidation({ valid: false, name: 'Validation failed', email: '' });
      }
    } catch (error) {
      console.error('Error loading EIU info by UUID:', error);
      setCurrentEIU(null);
      setEiuValidation({ valid: false, name: 'Error loading EIU info', email: '' });
    }
  };

  // Load EIU information by userId (like "EIU-0001")
  const loadEIUInfo = async (personnelId) => {
    if (!personnelId) {
      setCurrentEIU(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Check if it's a UUID format (contains hyphens and is 36 chars)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personnelId);
      
      let response;
      if (isUUID) {
        // If UUID, fetch by ID
        response = await fetch(`${getApiUrl()}/users/${personnelId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        // If userId format, use validate-eiu endpoint
        response = await fetch(`${getApiUrl()}/auth/validate-eiu/${personnelId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user && data.user.role === 'EIU') {
          setCurrentEIU(data.user);
          setEiuValidation({ 
            valid: true, 
            name: data.user.name || 'Valid EIU Account', 
            email: data.user.email || '' 
          });
        } else {
          setCurrentEIU(null);
          setEiuValidation({ valid: false, name: 'Invalid EIU Account', email: '' });
        }
      } else {
        setCurrentEIU(null);
        setEiuValidation({ valid: false, name: 'Validation failed', email: '' });
      }
    } catch (error) {
      console.error('Error loading EIU info:', error);
      setCurrentEIU(null);
      setEiuValidation({ valid: false, name: 'Validation error', email: '' });
    }
  };

  // Load EIU accounts (excluding already assigned EIU)
  const loadEIUAccounts = async () => {
    setLoadingEIUAccounts(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setEiuAccounts([]);
        return;
      }

      // Fetch all active EIU users
      const usersResponse = await fetch(`${getApiUrl()}/users/eiu/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!usersResponse.ok) {
        console.error('Failed to fetch EIU users:', usersResponse.status);
        setEiuAccounts([]);
        return;
      }

      const usersData = await usersResponse.json();
      const allEIUUsers = usersData.success && usersData.users ? usersData.users : [];

      // Filter out the currently assigned EIU (if any)
      const currentEIUId = project?.eiuPersonnelId || (currentEIU?.id);
      const availableEIUUsers = allEIUUsers.filter(eiu => {
        // Exclude if it's the currently assigned EIU
        return eiu.id !== currentEIUId;
      });

      setEiuAccounts(availableEIUUsers);
    } catch (error) {
      console.error('Error loading EIU accounts:', error);
      setEiuAccounts([]);
    } finally {
      setLoadingEIUAccounts(false);
    }
  };

  // Handle EIU selection from dropdown
  const handleEIUSelection = (eiuId) => {
    const selectedEIU = eiuAccounts.find(eiu => eiu.id === eiuId);
    if (selectedEIU) {
      setEiuPersonnelId(selectedEIU.id);
      setCurrentEIU(selectedEIU);
      setEiuValidation({ 
        valid: true, 
        name: selectedEIU.name || 'Selected EIU', 
        email: selectedEIU.email || '' 
      });
    }
  };

  // Handle assignment (with warning if reassigning)
  const handleAssign = async (proceedAnyway = false) => {
    if (!project || !project.id) {
      alert('No project selected');
      return;
    }

    if (!eiuPersonnelId.trim()) {
      alert('Please select an EIU account');
      return;
    }

    // Check if project already has an EIU assigned and user is trying to assign a different one
    if (project.eiuPersonnelId && project.eiuPersonnelId !== eiuPersonnelId && !proceedAnyway) {
      setPendingEIUId(eiuPersonnelId);
      setShowWarningModal(true);
      return;
    }

    // Proceed with assignment
    await performAssignment();
  };

  // Perform the actual assignment
  const performAssignment = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // First get the project to preserve other fields
      const getResponse = await fetch(`${getApiUrl()}/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!getResponse.ok) {
        throw new Error('Failed to fetch project');
      }

      const getData = await getResponse.json();
      if (!getData.success || !getData.project) {
        throw new Error('Project not found');
      }

      // Determine the correct eiuPersonnelId to use
      // If currentEIU exists and has an id (UUID), use that
      // Otherwise, if the input is a UUID, use it directly
      // If it's a userId, we need to get the UUID first
      let finalEiuPersonnelId = null;
      
      if (currentEIU && currentEIU.id) {
        // Use the UUID from the validated user
        finalEiuPersonnelId = currentEIU.id;
      } else {
        // Check if input is UUID format
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eiuPersonnelId.trim());
        if (isUUID) {
          finalEiuPersonnelId = eiuPersonnelId.trim();
        } else {
          // It's a userId, we need to get the UUID
          // The currentEIU should already have the id from validation
          if (currentEIU && currentEIU.id) {
            finalEiuPersonnelId = currentEIU.id;
          } else {
            throw new Error('Unable to determine EIU Personnel ID. Please validate the account first.');
          }
        }
      }

      // Update EIU assignment
      const updateResponse = await fetch(`${getApiUrl()}/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...getData.project,
          eiuPersonnelId: finalEiuPersonnelId,
          hasExternalPartner: true
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update project');
      }

      const updateData = await updateResponse.json();
      
      if (updateData.success) {
        alert(`Successfully ${project.eiuPersonnelId ? 'reassigned' : 'assigned'} EIU: ${eiuValidation.name}`);
        
        // Call callback if provided
        if (onAssign && typeof onAssign === 'function') {
          onAssign({
            projectId: project.id,
            eiuPersonnelId: finalEiuPersonnelId,
            eiuName: eiuValidation.name,
            eiuEmail: eiuValidation.email
          });
        }

        // Close modals and refresh page
        setShowModal(false);
        setShowWarningModal(false);
        window.location.reload();
      } else {
        throw new Error(updateData.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error assigning EIU:', error);
      alert('Error assigning EIU: ' + error.message);
    } finally {
      setLoading(false);
    }
  };


  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectAssignmentCenter = {
        openModal: (projectData) => {
          if (projectData) {
            // Set the project so useEffect can handle loading EIU info
            // We'll use a state variable to track the project
            setProject(projectData);
            setShowModal(true);
          } else {
            setProject(null);
            setShowModal(true);
          }
        },
        closeModal: () => {
          setShowModal(false);
          setProject(null);
          setEiuPersonnelId('');
          setEiuValidation({ valid: false, name: '', email: '' });
          setCurrentEIU(null);
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectAssignmentCenter) {
        delete window.projectAssignmentCenter;
      }
    };
  }, []);

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`${colors.button} p-6 text-white rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Assign/Reassign EIU</h3>
              <p className="text-white/90 text-sm mt-1">
                {project ? project.name : 'Project Assignment'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                setEiuPersonnelId('');
                setEiuValidation({ valid: false, name: '', email: '' });
                setCurrentEIU(null);
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
        <div className="p-6 space-y-4">
          {/* Current EIU Info */}
          {currentEIU && project?.eiuPersonnelId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Current EIU Assignment</p>
              <p className="text-sm text-blue-800">{currentEIU.name || 'Unknown'}</p>
              {currentEIU.email && (
                <p className="text-xs text-blue-600 mt-1">{currentEIU.email}</p>
              )}
              <p className="text-xs text-blue-600 mt-1">ID: {project.eiuPersonnelId}</p>
            </div>
          )}

          {/* EIU Account Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              EIU Account *
            </label>
            {loadingEIUAccounts ? (
              <div className="px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-center text-sm text-gray-600">
                Loading EIU accounts...
              </div>
            ) : (
              <select
                value={eiuPersonnelId}
                onChange={(e) => handleEIUSelection(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              >
                <option value="">Select EIU Account</option>
                {eiuAccounts.map((eiu) => (
                  <option key={eiu.id} value={eiu.id}>
                    {eiu.name || eiu.userId} {eiu.email ? `(${eiu.email})` : ''}
                  </option>
                ))}
              </select>
            )}
            
            {/* Selected EIU Info */}
            {eiuValidation.valid && currentEIU && (
              <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  {eiuValidation.name}
                </p>
                {eiuValidation.email && (
                  <p className="text-xs text-green-600 mt-1">{eiuValidation.email}</p>
                )}
              </div>
            )}
          </div>

          {/* Info Message */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> Assigning or reassigning an EIU will notify them about the project. 
              Select an EIU account from the dropdown above.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowModal(false);
              setEiuPersonnelId('');
              setEiuValidation({ valid: false, name: '', email: '' });
              setCurrentEIU(null);
            }}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => handleAssign(false)}
            disabled={loading || !eiuValidation.valid}
            className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
          >
            {loading ? 'Assigning...' : project?.eiuPersonnelId ? 'Reassign EIU' : 'Assign EIU'}
          </button>
        </div>
      </div>

      {/* Warning Modal for Reassignment */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Warning: Project Already Has EIU Partner</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-3">
                  This project is already assigned to an EIU partner. Reassigning will replace the current EIU assignment.
                </p>
                {project?.eiuPersonnel && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Current EIU:</p>
                    <p className="text-sm text-blue-800">{project.eiuPersonnel.name || 'Unknown'}</p>
                    {project.eiuPersonnel.email && (
                      <p className="text-xs text-blue-600 mt-1">{project.eiuPersonnel.email}</p>
                    )}
                  </div>
                )}
                {pendingEIUId && (() => {
                  const pendingEIU = eiuAccounts.find(eiu => eiu.id === pendingEIUId);
                  return pendingEIU ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-900 mb-1">New EIU:</p>
                      <p className="text-sm text-green-800">{pendingEIU.name || 'Unknown'}</p>
                      {pendingEIU.email && (
                        <p className="text-xs text-green-600 mt-1">{pendingEIU.email}</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    setPendingEIUId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    handleAssign(true);
                  }}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 ${colors.button} text-white rounded-lg font-semibold disabled:opacity-50 transition-all`}
                >
                  {loading ? 'Processing...' : 'Proceed Anyway'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


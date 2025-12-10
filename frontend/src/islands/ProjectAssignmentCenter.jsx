import { useState, useEffect } from 'react';

// CSS Animations for modals
const modalAnimations = `
  @keyframes xMarkDraw {
    from {
      stroke-dashoffset: 24;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  
  @keyframes checkMarkDraw {
    from {
      stroke-dashoffset: 24;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
  }
  
  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }
  
  .animate-x-mark {
    animation: xMarkDraw 0.6s ease-out forwards;
  }
`;

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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  
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

  // Verify password before proceeding with reassignment
  const verifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Please enter your password');
      return;
    }

    setVerifyingPassword(true);
    setPasswordError('');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setPasswordError('Authentication required. Please log in again.');
        setVerifyingPassword(false);
        return;
      }

      // Get current user ID from token or profile
      let currentUserId = null;
      try {
        const profileResponse = await fetch(`${getApiUrl()}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.user) {
            currentUserId = profileData.user.id;
          }
        }
      } catch (e) {
        console.error('Error fetching user profile:', e);
      }

      if (!currentUserId) {
        setPasswordError('Unable to verify user. Please log in again.');
        setVerifyingPassword(false);
        return;
      }

      // Verify password with backend - use current user's ID
      const response = await fetch(`${getApiUrl()}/auth/verify-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password, targetUserId: currentUserId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Password verified - proceed with assignment
        setShowPasswordModal(false);
        setPassword('');
        setVerifyingPassword(false);
        await handleAssign(true);
      } else {
        // Password incorrect
        const errorMsg = data.error || 'Incorrect password. Please try again.';
        setPasswordError(errorMsg);
        setVerifyingPassword(false);
        
        // Show error modal with X animation
        setTimeout(() => {
          setShowErrorModal(true);
          setErrorMessage(errorMsg);
        }, 300);
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      const errorMsg = 'Failed to verify password. Please try again.';
      setPasswordError(errorMsg);
      setVerifyingPassword(false);
      setTimeout(() => {
        setShowErrorModal(true);
        setErrorMessage(errorMsg);
      }, 300);
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

      // 🔍 DEBUG: Log initial state
      console.log('🔍 [EIU ASSIGNMENT DEBUG] ========== STARTING ASSIGNMENT ==========');
      console.log('🔍 [EIU ASSIGNMENT DEBUG] Project ID:', project.id);
      console.log('🔍 [EIU ASSIGNMENT DEBUG] Current EIU:', currentEIU);
      console.log('🔍 [EIU ASSIGNMENT DEBUG] EIU Personnel ID:', eiuPersonnelId);
      console.log('🔍 [EIU ASSIGNMENT DEBUG] Project Status:', project.status);
      console.log('🔍 [EIU ASSIGNMENT DEBUG] API URL:', getApiUrl());

      // First get the project to preserve other fields
      const getResponse = await fetch(`${getApiUrl()}/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('🔍 [EIU ASSIGNMENT DEBUG] GET Response Status:', getResponse.status);
      console.log('🔍 [EIU ASSIGNMENT DEBUG] GET Response OK:', getResponse.ok);

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('❌ [EIU ASSIGNMENT DEBUG] GET Request Failed:', errorText);
        throw new Error('Failed to fetch project');
      }

      const getData = await getResponse.json();
      console.log('🔍 [EIU ASSIGNMENT DEBUG] GET Response Data:', {
        success: getData.success,
        projectStatus: getData.project?.status,
        projectWorkflowStatus: getData.project?.workflowStatus,
        projectId: getData.project?.id,
        currentEiuPersonnelId: getData.project?.eiuPersonnelId
      });

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

      // 🔍 DEBUG: Check if this is a reassignment (project already has an EIU)
      const isReassignment = project.eiuPersonnelId && project.eiuPersonnelId !== finalEiuPersonnelId;
      const isNonDraftProject = getData.project.workflowStatus !== 'draft';
      
      // For non-draft projects, only send EIU-related fields to allow reassignment
      // For draft projects, we can send the full project object
      let updatePayload;
      if (isNonDraftProject) {
        // Only send EIU-related fields for non-draft projects (reassignment allowed)
        updatePayload = {
          eiuPersonnelId: finalEiuPersonnelId,
          hasExternalPartner: true
        };
        console.log('🔍 [EIU ASSIGNMENT DEBUG] Non-draft project detected - sending only EIU fields for reassignment');
      } else {
        // For draft projects, send full project object
        updatePayload = {
          ...getData.project,
          eiuPersonnelId: finalEiuPersonnelId,
          hasExternalPartner: true
        };
        console.log('🔍 [EIU ASSIGNMENT DEBUG] Draft project - sending full project object');
      }
      
      console.log('🔍 [EIU ASSIGNMENT DEBUG] Update Payload:', {
        isReassignment,
        isNonDraftProject,
        workflowStatus: getData.project.workflowStatus,
        currentEiuPersonnelId: project.eiuPersonnelId,
        newEiuPersonnelId: finalEiuPersonnelId,
        payloadFields: Object.keys(updatePayload)
      });

      // Update EIU assignment
      const updateResponse = await fetch(`${getApiUrl()}/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      console.log('🔍 [EIU ASSIGNMENT DEBUG] PUT Response Status:', updateResponse.status);
      console.log('🔍 [EIU ASSIGNMENT DEBUG] PUT Response OK:', updateResponse.ok);

      if (!updateResponse.ok) {
        // Read response as text first to avoid "body stream already read" error
        const responseText = await updateResponse.text();
        let errorData = {};
        
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: 'Failed to update project' };
        }
        
        // Extract error message
        const errorMsg = errorData.error || errorData.message || 'Failed to update project';
        
        // Check for specific error messages
        if (errorMsg.includes('draft status') || errorMsg.includes('Cannot update project')) {
          throw new Error('Cannot update project that is not in draft status. Please ensure the project is in draft status before assigning an EIU.');
        }
        
        throw new Error(errorMsg);
      }

      // Read response as text first, then parse
      const updateResponseText = await updateResponse.text();
      let updateData = {};
      try {
        updateData = JSON.parse(updateResponseText);
      } catch (e) {
        throw new Error('Failed to parse response from server');
      }
      
      if (updateData.success) {
        const successMsg = `Successfully ${project.eiuPersonnelId ? 'reassigned' : 'assigned'} EIU: ${eiuValidation.name}`;
        setSuccessMessage(successMsg);
        
        // Close password modal if open
        setShowPasswordModal(false);
        setPassword('');
        
        // Close other modals
        setShowModal(false);
        setShowWarningModal(false);
        
        // Show success modal with check animation
        setShowSuccessModal(true);
        
        // Call callback if provided
        if (onAssign && typeof onAssign === 'function') {
          onAssign({
            projectId: project.id,
            eiuPersonnelId: finalEiuPersonnelId,
            eiuName: eiuValidation.name,
            eiuEmail: eiuValidation.email
          });
        }
        
        // Reload page after showing success message
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        throw new Error(updateData.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error assigning EIU:', error);
      
      // Parse error message from response if available
      let errorMsg = error.message || 'An unexpected error occurred';
      
      // Check if error message contains specific project status error
      if (errorMsg.includes('draft status') || errorMsg.includes('Cannot update project')) {
        errorMsg = 'Cannot update project that is not in draft status. Please ensure the project is in draft status before assigning an EIU.';
      }
      
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
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
        },
        // Debug function to check project status and EIU assignment
        debugProjectStatus: async (projectId) => {
          try {
            const token = localStorage.getItem('token');
            const apiUrl = getApiUrl();
            
            console.log('🔍 [DEBUG] Checking project status for:', projectId);
            console.log('🔍 [DEBUG] API URL:', apiUrl);
            
            const response = await fetch(`${apiUrl}/projects/${projectId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ [DEBUG] Failed to fetch project:', errorText);
              return { error: 'Failed to fetch project', status: response.status };
            }
            
            const data = await response.json();
            if (!data.success || !data.project) {
              console.error('❌ [DEBUG] Project not found in response');
              return { error: 'Project not found' };
            }
            
            const project = data.project;
            const debugInfo = {
              id: project.id,
              name: project.name,
              status: project.status,
              workflowStatus: project.workflowStatus,
              approvedBySecretariat: project.approvedBySecretariat,
              eiuPersonnelId: project.eiuPersonnelId,
              hasExternalPartner: project.hasExternalPartner,
              canAssignEIU: project.status === 'draft' || project.status === 'pending',
              isDraft: project.status === 'draft',
              isPending: project.status === 'pending',
              isOngoing: project.status === 'ongoing',
              isApproved: project.approvedBySecretariat === true
            };
            
            console.log('✅ [DEBUG] Project Status Information:', debugInfo);
            return debugInfo;
          } catch (error) {
            console.error('❌ [DEBUG] Error:', error);
            return { error: error.message };
          }
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectAssignmentCenter) {
        delete window.projectAssignmentCenter;
      }
    };
  }, []);

  // Render error and success modals even if main modal is closed
  if (!showModal && !showErrorModal && !showSuccessModal && !showPasswordModal) {
    return null;
  }

  return (
    <>
      <style>{modalAnimations}</style>
      {showModal && (
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
                    setShowPasswordModal(true);
                    setPassword('');
                    setPasswordError('');
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

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Password Verification Required</h3>
                  <p className="text-sm text-gray-600 mt-1">Please enter your LGU-IU account password to proceed</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !verifyingPassword && password.trim()) {
                      verifyPassword();
                    }
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    passwordError 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-amber-500 focus:ring-amber-200'
                  }`}
                  placeholder="Enter your password"
                  disabled={verifyingPassword}
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setPasswordError('');
                    setShowWarningModal(true);
                  }}
                  disabled={verifyingPassword}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyPassword}
                  disabled={verifyingPassword || !password.trim()}
                  className={`flex-1 px-4 py-3 ${colors.button} text-white rounded-xl font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2`}
                >
                  {verifyingPassword ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Proceed'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Error Modal with X Animation */}
      {showErrorModal && errorMessage.includes('password') && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-shake">
            <div className="p-6">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center relative">
                  <svg 
                    className="w-12 h-12 text-red-600 animate-x-mark" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{
                      animation: 'xMarkDraw 0.6s ease-out forwards'
                    }}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="3" 
                      d="M6 18L18 6M6 6l12 12"
                      style={{
                        strokeDasharray: '24',
                        strokeDashoffset: '24',
                        animation: 'xMarkDraw 0.6s ease-out 0.2s forwards'
                      }}
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Password Verification Failed</h3>
                  <p className="text-sm text-gray-600">{errorMessage}</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                    setShowPasswordModal(true);
                    setPassword('');
                  }}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Check Animation */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="p-6">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center relative">
                  <svg 
                    className="w-12 h-12 text-green-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{
                      strokeDasharray: '24',
                      strokeDashoffset: '24',
                      animation: 'checkMarkDraw 0.6s ease-out 0.2s forwards'
                    }}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="3" 
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">EIU Reassignment Successful</h3>
                  <p className="text-sm text-gray-600">{successMessage}</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                    setShowModal(false);
                    setPassword('');
                    if (onAssign) {
                      onAssign();
                    }
                  }}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal (for non-password errors) */}
      {showErrorModal && !errorMessage.includes('password') && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Error Assigning EIU</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700">{errorMessage}</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                  }}
                  className={`px-6 py-2 ${colors.button} text-white rounded-lg font-semibold transition-all`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


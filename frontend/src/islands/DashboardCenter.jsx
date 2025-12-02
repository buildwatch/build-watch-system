import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Import centralized API config
import { getApiUrl } from '../config/api.js';
import CentralizedProjectMap from '../components/CentralizedProjectMap.jsx';

const API_URL = typeof window !== 'undefined' ? getApiUrl() : 'http://localhost:3000/api';

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
  'Santo Angel Sur': [14.283, 121.422],
  'Various Barangay': [14.281, 121.419],
  'Various Barangays': [14.281, 121.419]
};

const SANTA_CRUZ_CENTER = [14.281, 121.419];

// Generate coordinates for projects based on location
const generateProjectCoordinates = (projectId, location) => {
  // Try to find coordinates based on location
  if (location) {
    for (const [barangay, coords] of Object.entries(barangayCoordinates)) {
      if (location.toLowerCase().includes(barangay.toLowerCase())) {
        return coords;
      }
    }
  }
  
  // Fallback: generate based on project ID
  const baseLat = SANTA_CRUZ_CENTER[0];
  const baseLng = SANTA_CRUZ_CENTER[1];
  
  // Convert project ID to a number for consistent positioning
  let idNum = 0;
  if (typeof projectId === 'string') {
    // Extract numbers from ID string
    const numbers = projectId.match(/\d/g);
    if (numbers) {
      idNum = parseInt(numbers.join('').substring(0, 6)) || 0;
    }
  } else if (typeof projectId === 'number') {
    idNum = projectId;
  }
  
  // Generate offset based on ID
  const latOffset = ((idNum % 10) - 5) * 0.01;
  const lngOffset = ((idNum % 7) - 3) * 0.01;
  
  return [baseLat + latOffset, baseLng + lngOffset];
};

// Theme configurations
const themes = {
  green: {
    primary: 'bg-green-600',
    primaryHover: 'hover:bg-green-700',
    accent: 'text-green-600',
    border: 'border-green-200',
    gradient: 'from-green-600 to-green-500',
    gradientText: 'from-green-600 to-green-500',
    gradientIcon: 'from-green-600 to-green-500',
    button: 'bg-green-600 hover:bg-green-700',
    cardHover: 'hover:border-green-400 hover:shadow-green-100'
  },
  orange: {
    primary: 'bg-orange-600',
    primaryHover: 'hover:bg-orange-700',
    accent: 'text-orange-600',
    border: 'border-orange-200',
    gradient: 'from-orange-600 to-orange-500',
    gradientText: 'from-orange-600 to-orange-500',
    gradientIcon: 'from-orange-600 to-orange-500',
    button: 'bg-orange-600 hover:bg-orange-700',
    cardHover: 'hover:border-orange-400 hover:shadow-orange-100'
  },
  blue: {
    primary: 'bg-[#0D7DB5]',
    primaryHover: 'hover:bg-[#0A6A9A]',
    primaryLight: 'bg-[#0D7DB5]/10',
    accent: 'text-[#0D7DB5]',
    border: 'border-[#0D7DB5]/20',
    gradient: 'from-[#0D7DB5] via-[#0A6A9A] to-[#075A85]',
    gradientText: 'from-[#0D7DB5] to-[#0A6A9A]',
    gradientIcon: 'from-[#0D7DB5] to-[#0A6A9A]',
    button: 'bg-[#0D7DB5] hover:bg-[#0A6A9A]',
    cardHover: 'hover:border-[#0D7DB5]/40 hover:shadow-[#0D7DB5]/10'
  },
  black: {
    primary: 'bg-gray-900',
    primaryHover: 'hover:bg-black',
    accent: 'text-gray-900',
    border: 'border-gray-200',
    gradient: 'from-black to-gray-800',
    gradientText: 'from-black to-gray-600',
    gradientIcon: 'from-black to-gray-800',
    button: 'bg-gray-900 hover:bg-black',
    cardHover: 'hover:border-gray-400 hover:shadow-gray-100'
  },
  'light-blue': {
    primary: 'bg-sky-600',
    primaryHover: 'hover:bg-sky-700',
    accent: 'text-sky-600',
    border: 'border-sky-200',
    gradient: 'from-sky-600 to-sky-500',
    gradientText: 'from-sky-600 to-sky-500',
    gradientIcon: 'from-sky-600 to-sky-500',
    button: 'bg-sky-600 hover:bg-sky-700',
    cardHover: 'hover:border-sky-400 hover:shadow-sky-100'
  }
};

// Helper function to get auth token
const getToken = () => {
  if (typeof window === 'undefined') return null;
  const cookieToken = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  return cookieToken || localStorage.getItem('token') || localStorage.getItem('authToken');
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Helper function to get current user role
const getCurrentUserRole = () => {
  if (typeof window === 'undefined') return null;
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role || null;
    }
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
  return null;
};

// Helper function to get publisher label based on role
const getPublisherLabel = (role, fullName) => {
  if (!fullName) return 'Unknown';
  
  if (role === 'EIU') {
    return `Company: ${fullName}`;
  } else if (role === 'LGU-IU' || role === 'IU') {
    return `Department: ${fullName}`;
  } else {
    return fullName;
  }
};

// Helper function to format date - with comprehensive error handling
const formatDate = (dateInput) => {
  try {
    // Handle null, undefined, or empty values
    if (dateInput === null || dateInput === undefined || dateInput === '') {
      return 'N/A';
    }
  
  let date;
  
  // Handle if it's already a Date object
  if (dateInput instanceof Date) {
    // Create a new Date object to ensure it's a proper Date instance
    date = new Date(dateInput.getTime());
  } 
  // Handle string or number
  else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    // Trim string if it's a string
    const dateStr = typeof dateInput === 'string' ? dateInput.trim() : dateInput;
    if (!dateStr && dateStr !== 0) return 'N/A';
    date = new Date(dateStr);
  }
  // Handle objects with date properties (e.g., {date: "2025-11-17"})
  else if (typeof dateInput === 'object' && dateInput !== null) {
    // Try common date property names
    if (dateInput.date) {
      date = new Date(dateInput.date);
    } else if (dateInput.publishDate) {
      date = new Date(dateInput.publishDate);
    } else if (dateInput.createdAt) {
      date = new Date(dateInput.createdAt);
    } else {
      // Try to convert the object to a date string
      try {
        date = new Date(dateInput.toString());
      } catch (e) {
        return 'N/A';
      }
    }
  }
  // Unknown type
  else {
    return 'N/A';
  }
  
  // Verify date is actually a Date object - use Object.prototype.toString for more reliable check
  if (!(date instanceof Date) || Object.prototype.toString.call(date) !== '[object Date]') {
    console.warn('Date conversion failed, result is not a Date object:', date, dateInput, typeof date);
    return 'N/A';
  }
  
  // Check if date is valid (not NaN or Infinity)
  const timeValue = date.getTime();
  if (isNaN(timeValue) || !isFinite(timeValue)) {
    console.warn('Invalid date (NaN or Infinity):', dateInput);
    return 'N/A';
  }
  
  // Verify toLocaleDateString exists and is a function
  if (!date.toLocaleDateString || typeof date.toLocaleDateString !== 'function') {
    console.error('toLocaleDateString is not a function on date:', date, typeof date, dateInput, Object.getPrototypeOf(date));
    // Fallback: try to format manually
    try {
      const year = date.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${month} ${day}, ${year}, ${hours}:${minutes}`;
    } catch (e) {
      console.error('Manual date formatting also failed:', e);
      return 'N/A';
    }
  }
  
  // Finally, try to format the date
  try {
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return formatted;
  } catch (error) {
    console.error('Error calling toLocaleDateString:', error, dateInput, date);
    // Last resort: manual formatting
    try {
      const year = date.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${month} ${day}, ${year}, ${hours}:${minutes}`;
    } catch (e) {
      return 'N/A';
    }
  }
  } catch (error) {
    // Catch any unexpected errors in the entire function
    console.error('Unexpected error in formatDate:', error, dateInput);
    return 'N/A';
  }
};

// Helper function to get theme colors for creator role
const getThemeByRole = (role) => {
  switch (role) {
    case 'SYS.AD':
      return 'black';
    case 'LGU-IU':
    case 'IU':
      return 'orange';
    case 'EIU':
      return 'green';
    case 'LGU-PMT':
      return 'blue';
    case 'EMS':
      return 'light-blue';
    default:
      return 'blue';
  }
};

export default function DashboardCenter({ theme = 'green', role = null }) {
  const currentRole = role || getCurrentUserRole();
  const currentTheme = themes[theme] || themes.green;
  const isSystemAdmin = currentRole === 'SYS.AD' || currentRole === 'SYS_AD' || currentRole === 'SYSAD';
  
  // State management
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    ongoingProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    averageProgress: 0,
    totalBudget: '₱0',
    utilizedBudget: '₱0',
    budgetUtilizationPercentage: 0
  });
  const [announcements, setAnnouncements] = useState([]);
  const [announcementSlideIndex, setAnnouncementSlideIndex] = useState(0);
  const [systemHealth, setSystemHealth] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const announcementSlideIntervalRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventType: 'meeting',
    startDate: '',
    endDate: '',
    location: '',
    priority: 'medium'
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [showFullMapModal, setShowFullMapModal] = useState(false);
  const [userLogsSummary, setUserLogsSummary] = useState({
    totalActivities: 0,
    todayActivities: 0,
    failedLogins: 0,
    activeUsers: 0,
    activeUsersList: []
  });
  const [userLogsLoading, setUserLogsLoading] = useState(true);
  // Map refs removed - using CentralizedProjectMap component instead
  
  // Refs
  const calendarRef = useRef(null);
  const projectCardsContainerRef = useRef(null);

  // Inject Astro-rendered project cards into React component
  useEffect(() => {
    if (typeof window !== 'undefined' && !isSystemAdmin) {
      let injectionAttempts = 0;
      const maxAttempts = 20; // Try for up to 10 seconds
      
      const injectProjectCards = () => {
        injectionAttempts++;
        const astroCardsContainer = document.getElementById('dashboard-project-cards-astro');
        const reactCardsContainer = document.getElementById('dashboard-project-cards');
        
        if (astroCardsContainer && reactCardsContainer) {
          const cardCount = astroCardsContainer.children.length;
          
          if (cardCount > 0) {
            // Only inject if React container is empty (avoid duplicate injections)
            if (reactCardsContainer.children.length === 0) {
              console.log(`🔄 [DashboardCenter] Injecting ${cardCount} project cards from Astro to React container (attempt ${injectionAttempts})`);
              
              // Move all project cards from Astro container to React container
              while (astroCardsContainer.firstChild) {
                reactCardsContainer.appendChild(astroCardsContainer.firstChild);
              }
              
              // Remove the now-empty Astro container
              astroCardsContainer.remove();
              
              console.log(`✅ [DashboardCenter] Successfully injected ${cardCount} project cards`);
              return true; // Success - stop trying
            } else {
              // Already injected, remove Astro container if it still exists
              if (astroCardsContainer.parentNode) {
                astroCardsContainer.remove();
              }
              return true; // Already done - stop trying
            }
          } else {
            if (injectionAttempts <= 3) {
              console.log(`⏳ [DashboardCenter] Waiting for Astro cards to render... (attempt ${injectionAttempts})`);
            }
          }
        } else {
          if (injectionAttempts <= 3) {
            if (!astroCardsContainer) {
              console.log(`⏳ [DashboardCenter] Waiting for Astro container... (attempt ${injectionAttempts})`);
            }
            if (!reactCardsContainer) {
              console.log(`⏳ [DashboardCenter] Waiting for React container... (attempt ${injectionAttempts})`);
            }
          }
        }
        
        return false; // Not ready yet
      };
      
      // Try immediately
      if (injectProjectCards()) {
        return; // Success on first try
      }
      
      // Set up interval to keep trying
      const intervalId = setInterval(() => {
        if (injectProjectCards() || injectionAttempts >= maxAttempts) {
          clearInterval(intervalId);
          if (injectionAttempts >= maxAttempts) {
            console.warn('⚠️ [DashboardCenter] Max injection attempts reached. Cards may not be available.');
          }
        }
      }, 500); // Check every 500ms
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isSystemAdmin]); // Removed 'projects' dependency since Astro cards are independent

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUserData(data.user);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // Fetch projects (for non-System Admin accounts)
  useEffect(() => {
    if (isSystemAdmin) {
      setLoading(false);
      return;
    }
    
    const fetchProjects = async () => {
      try {
        const token = getToken();
        if (!token) return;
        
        let projectsEndpoint = `${API_URL}/projects`;
        if (currentRole === 'EIU') {
          projectsEndpoint = `${API_URL}/eiu/projects`;
        }
        
        // Fetch all projects (no pagination) for accurate budget calculation
        // Add limit parameter to get all projects for dashboard stats
        const separator = projectsEndpoint.includes('?') ? '&' : '?';
        const fullEndpoint = `${projectsEndpoint}${separator}limit=1000&page=1`;
        
        console.log(`📊 [DashboardCenter] Fetching projects from: ${fullEndpoint}`);
        
        const response = await fetch(fullEndpoint, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.projects) {
            const projectsList = data.projects;
            console.log(`📊 [DashboardCenter] Fetched ${projectsList.length} projects for role: ${currentRole}`);
            console.log(`📊 [DashboardCenter] Sample project budgets:`, projectsList.slice(0, 3).map(p => ({
              name: p.name,
              totalBudget: p.totalBudget,
              totalBudgetAllocation: p.totalBudgetAllocation
            })));
            setProjects(projectsList);
            
            // Calculate statistics
            const totalProjects = projectsList.length;
            // Status filtering: Only 3 statuses exist - Ongoing, Delayed, and Completed
            // Ongoing projects include both 'ongoing' and 'delayed' statuses (delayed projects are still ongoing)
            const ongoingProjects = projectsList.filter(p => {
              const status = (p.status || '').toLowerCase();
              return status === 'ongoing' || status === 'delayed';
            }).length;
            const completedProjects = projectsList.filter(p => {
              const status = (p.status || '').toLowerCase();
              return status === 'completed' || status === 'complete';
            }).length;
            // Removed: pendingProjects - projects now go directly to ongoing (no pending status exists)
            
            // Calculate total budget from projects - use totalBudget field, fallback to totalBudgetAllocation if needed
            const totalBudget = projectsList.reduce((sum, p) => {
              const budget = parseFloat(p.totalBudget || p.totalBudgetAllocation || 0);
              if (budget > 0) {
                console.log(`💰 Project ${p.name || p.projectCode}: budget = ${budget}`);
              }
              return sum + budget;
            }, 0);
            
            console.log(`💰 [DashboardCenter] Total Budget calculated: ₱${totalBudget.toLocaleString()} from ${projectsList.length} projects`);
            
            // Calculate utilized budget - role-specific logic
            let utilizedBudget = 0;
            
            if (currentRole === 'EIU') {
              // For EIU, calculate utilized budget from their own projects only
              // If no projects, utilized budget should be 0 (not global stats)
              if (projectsList.length > 0) {
                // Fetch amountSpent for each EIU project in parallel (ProgressCalculationService calculates this accurately)
                try {
                  const projectBudgetPromises = projectsList.map(async (project) => {
                    try {
                      const projectResponse = await fetch(`${API_URL}/projects/${project.id}`, {
                        headers: getAuthHeaders()
                      });
                      if (projectResponse.ok) {
                        const projectData = await projectResponse.json();
                        if (projectData.success && projectData.progress?.amountSpent !== undefined) {
                          // amountSpent is calculated by ProgressCalculationService from approved milestone submissions
                          return parseFloat(projectData.progress.amountSpent || 0);
                        } else if (projectData.success && projectData.project?.amountSpent !== undefined) {
                          return parseFloat(projectData.project.amountSpent || 0);
                        }
                      }
                    } catch (err) {
                      console.warn(`⚠️ Failed to fetch budget for project ${project.id}:`, err);
                    }
                    return 0;
                  });
                  
                  const projectBudgets = await Promise.all(projectBudgetPromises);
                  utilizedBudget = projectBudgets.reduce((sum, budget) => sum + budget, 0);
                  console.log('💰 Utilized budget calculated from EIU projects only:', utilizedBudget);
                } catch (budgetError) {
                  console.warn('⚠️ Failed to calculate utilized budget from EIU projects, using fallback:', budgetError);
                  // Fallback: Calculate from milestone data if available in projects
                  for (const project of projectsList) {
                    if (project.milestones && Array.isArray(project.milestones)) {
                      project.milestones.forEach(milestone => {
                        const usedBudget = parseFloat(milestone.usedBudget || 0);
                        if (usedBudget > 0) {
                          utilizedBudget += usedBudget;
                        }
                      });
                    }
                  }
                  
                  // Final fallback: Calculate from budget progress percentage (least accurate)
                  if (utilizedBudget === 0) {
                    utilizedBudget = projectsList.reduce((sum, p) => {
                      const budget = parseFloat(p.totalBudget || 0);
                      const budgetProgress = parseFloat(p.progress?.budget || p.budgetProgress || 0);
                      return sum + (budget * budgetProgress / 100);
                    }, 0);
                  }
                }
              } else {
                // EIU user has no projects - utilized budget should be 0
                utilizedBudget = 0;
                console.log('💰 EIU user has no projects - utilized budget set to 0');
              }
            } else {
              // For LGU-IU and other roles, calculate from actual projects only (not global stats)
              // Fetch amountSpent for each project in parallel (ProgressCalculationService calculates this accurately)
              if (projectsList.length > 0) {
                try {
                  const projectBudgetPromises = projectsList.map(async (project) => {
                    try {
                      // Fetch project with progress data to get accurate amountSpent
                      const projectResponse = await fetch(`${API_URL}/projects/${project.id}`, {
                        headers: getAuthHeaders()
                      });
                      if (projectResponse.ok) {
                        const projectData = await projectResponse.json();
                        if (projectData.success && projectData.progress?.amountSpent !== undefined) {
                          // amountSpent is calculated by ProgressCalculationService from approved milestone submissions
                          return parseFloat(projectData.progress.amountSpent || 0);
                        } else if (projectData.success && projectData.project?.amountSpent !== undefined) {
                          return parseFloat(projectData.project.amountSpent || 0);
                        }
                      }
                    } catch (err) {
                      console.warn(`⚠️ Failed to fetch budget for project ${project.id}:`, err);
                    }
                    return 0;
                  });
                  
                  const projectBudgets = await Promise.all(projectBudgetPromises);
                  utilizedBudget = projectBudgets.reduce((sum, budget) => sum + budget, 0);
                  console.log('💰 Utilized budget calculated from user projects only:', utilizedBudget, 'from', projectsList.length, 'projects');
                } catch (budgetError) {
                  console.warn('⚠️ Error fetching project budgets, using fallback:', budgetError);
                  
                  // Fallback: Calculate from milestone data if available in projects
                  for (const project of projectsList) {
                    if (project.milestones && Array.isArray(project.milestones)) {
                      project.milestones.forEach(milestone => {
                        // Get usedBudget from approved submissions
                        if (milestone.submissions && Array.isArray(milestone.submissions)) {
                          const approvedSubmission = milestone.submissions.find(s => 
                            s.status === 'approved' || s.status === 'iu_approved'
                          );
                          if (approvedSubmission) {
                            const usedBudget = parseFloat(approvedSubmission.usedBudget || 0);
                            if (usedBudget > 0) {
                              utilizedBudget += usedBudget;
                            }
                          }
                        } else {
                          // Fallback to milestone usedBudget if no submissions
                          const usedBudget = parseFloat(milestone.usedBudget || 0);
                          if (usedBudget > 0) {
                            utilizedBudget += usedBudget;
                          }
                        }
                      });
                    }
                  }
                  
                  // Final fallback: Calculate from budget progress percentage (least accurate)
                  if (utilizedBudget === 0) {
                    utilizedBudget = projectsList.reduce((sum, p) => {
                      // Skip pending projects
                      // Removed: pending check - projects now go directly to ongoing
                      const budget = parseFloat(p.totalBudget || 0);
                      const budgetProgress = parseFloat(p.progress?.budget || p.budgetProgress || 0);
                      // Only add if there's actual progress
                      if (budgetProgress > 0 && budget > 0) {
                        return sum + (budget * budgetProgress / 100);
                      }
                      return sum;
                    }, 0);
                  }
                }
              } else {
                // User has no projects - utilized budget should be 0
                utilizedBudget = 0;
                console.log('💰 User has no projects - utilized budget set to 0');
              }
            }
            
            const avgProgress = totalProjects > 0 
              ? projectsList.reduce((sum, p) => sum + parseFloat(p.progress?.overall || p.overallProgress || 0), 0) / totalProjects
              : 0;
            
            const budgetUtilizationPercentage = totalBudget > 0 ? (utilizedBudget / totalBudget) * 100 : 0;
            
            console.log(`💰 [DashboardCenter] Budget Calculation:`, {
              totalBudget,
              utilizedBudget,
              percentage: budgetUtilizationPercentage,
              rounded: Math.round(budgetUtilizationPercentage * 100) / 100
            });
            
            setStats({
              totalProjects,
              ongoingProjects,
              completedProjects,
              pendingProjects: 0, // Removed pending status - projects go directly to ongoing
              averageProgress: Math.round(avgProgress),
              totalBudget: `₱${totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              utilizedBudget: `₱${utilizedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              budgetUtilizationPercentage: Math.round(budgetUtilizationPercentage * 100) / 100 // Round to 2 decimal places, but keep as number for percentage display
            });
          }
        }
      } catch (error) {
        console.error('❌ [DashboardCenter] Error fetching projects:', error);
        console.error('❌ [DashboardCenter] Error details:', {
          message: error.message,
          stack: error.stack,
          role: currentRole,
          endpoint: currentRole === 'EIU' ? `${API_URL}/eiu/projects` : `${API_URL}/projects`
        });
        
        // Set stats to 0 on error
        setStats({
          totalProjects: 0,
          ongoingProjects: 0,
          completedProjects: 0,
          pendingProjects: 0,
          averageProgress: 0,
          totalBudget: '₱0',
          utilizedBudget: '₱0',
          budgetUtilizationPercentage: 0
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
    
    // Expose debugging function to window for console access
    if (typeof window !== 'undefined') {
      window.debugDashboardBudget = async () => {
        console.log('🔍 [DEBUG] Starting dashboard budget debugging...');
        console.log('🔍 [DEBUG] Current role:', currentRole);
        console.log('🔍 [DEBUG] API URL:', API_URL);
        
        try {
          const token = getToken();
          if (!token) {
            console.error('❌ [DEBUG] No auth token found');
            return;
          }
          
          let projectsEndpoint = `${API_URL}/projects`;
          if (currentRole === 'EIU') {
            projectsEndpoint = `${API_URL}/eiu/projects`;
          }
          
          const separator = projectsEndpoint.includes('?') ? '&' : '?';
          const fullEndpoint = `${projectsEndpoint}${separator}limit=1000&page=1`;
          
          console.log('🔍 [DEBUG] Fetching from:', fullEndpoint);
          
          const response = await fetch(fullEndpoint, {
            headers: getAuthHeaders()
          });
          
          console.log('🔍 [DEBUG] Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('🔍 [DEBUG] Response data:', data);
            
            if (data.success && data.projects) {
              const projectsList = data.projects;
              console.log(`🔍 [DEBUG] Total projects fetched: ${projectsList.length}`);
              
              // Analyze budgets
              const budgetAnalysis = projectsList.map(p => ({
                name: p.name,
                projectCode: p.projectCode,
                status: p.status,
                totalBudget: p.totalBudget,
                totalBudgetAllocation: p.totalBudgetAllocation,
                budgetValue: parseFloat(p.totalBudget || p.totalBudgetAllocation || 0)
              }));
              
              console.log('🔍 [DEBUG] Budget analysis:', budgetAnalysis);
              
              const totalBudget = projectsList.reduce((sum, p) => {
                return sum + parseFloat(p.totalBudget || p.totalBudgetAllocation || 0);
              }, 0);
              
              console.log('🔍 [DEBUG] Calculated Total Budget:', totalBudget);
              console.log('🔍 [DEBUG] Formatted Total Budget:', `₱${totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
              
              // Check utilized budget
              const projectsWithUtilized = await Promise.all(
                projectsList.slice(0, 5).map(async (project) => {
                  try {
                    const projectResponse = await fetch(`${API_URL}/projects/${project.id}`, {
                      headers: getAuthHeaders()
                    });
                    if (projectResponse.ok) {
                      const projectData = await projectResponse.json();
                      return {
                        name: project.name,
                        amountSpent: projectData.progress?.amountSpent || projectData.project?.amountSpent || 0
                      };
                    }
                  } catch (err) {
                    console.warn(`⚠️ [DEBUG] Failed to fetch project ${project.id}:`, err);
                  }
                  return null;
                })
              );
              
              console.log('🔍 [DEBUG] Sample utilized budgets:', projectsWithUtilized.filter(Boolean));
              
              return {
                success: true,
                totalProjects: projectsList.length,
                totalBudget,
                projects: budgetAnalysis
              };
            } else {
              console.error('❌ [DEBUG] Response missing projects:', data);
              return { success: false, error: 'No projects in response', data };
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ [DEBUG] Response error:', response.status, errorData);
            return { success: false, error: `HTTP ${response.status}`, errorData };
          }
        } catch (error) {
          console.error('❌ [DEBUG] Debug function error:', error);
          return { success: false, error: error.message };
        }
      };
      
      console.log('✅ [DashboardCenter] Debug function available: window.debugDashboardBudget()');
    }
  }, [isSystemAdmin, currentRole]);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const token = getToken();
        if (!token) return;
        
        // Use public endpoint for non-admin users, admin endpoint for System Admin
        // Include readReceipts to check read status - fetch all to get read receipts
        const endpoint = isSystemAdmin 
          ? `${API_URL}/admin/announcements?status=active&limit=100`
          : `${API_URL}/admin/public/announcements?limit=100`;
        
        const response = await fetch(endpoint, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.announcements) {
            // Process announcements to ensure readReceipts are properly checked
            // The backend should include readReceipts in the response
            setAnnouncements(data.announcements);
          }
        } else {
          console.error('Error fetching announcements:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      }
    };
    
    fetchAnnouncements();
  }, [isSystemAdmin]);

  // Auto-advance announcement slideshow
  useEffect(() => {
    const validAnnouncements = announcements.filter(ann => ann && ann.id);
    if (validAnnouncements.length > 1) {
      // Clear existing interval
      if (announcementSlideIntervalRef.current) {
        clearInterval(announcementSlideIntervalRef.current);
      }
      
      // Reset index if it's out of bounds
      if (announcementSlideIndex >= validAnnouncements.length) {
        setAnnouncementSlideIndex(0);
      }
      
      // Set up auto-advance every 5 seconds
      announcementSlideIntervalRef.current = setInterval(() => {
        setAnnouncementSlideIndex((prevIndex) => 
          (prevIndex + 1) % validAnnouncements.length
        );
      }, 5000);
      
      return () => {
        if (announcementSlideIntervalRef.current) {
          clearInterval(announcementSlideIntervalRef.current);
        }
      };
    }
  }, [announcements, announcementSlideIndex]);

  // Fetch user logs summary (System Admin only)
  useEffect(() => {
    if (!isSystemAdmin) return;
    
    const fetchUserLogsSummary = async () => {
      try {
        setUserLogsLoading(true);
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/activity-logs/summary`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.summary) {
            setUserLogsSummary({
              totalActivities: data.summary.totalActivities || 0,
              todayActivities: data.summary.todayActivities || 0,
              failedLogins: data.summary.failedLogins || 0,
              activeUsers: data.summary.activeUsers || 0,
              activeUsersList: data.summary.activeUsersList || []
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user logs summary:', error);
      } finally {
        setUserLogsLoading(false);
      }
    };
    
    fetchUserLogsSummary();
  }, [isSystemAdmin]);

  // Fetch system health
  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/admin/system-health/metrics`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.metrics) {
            setSystemHealth(data.metrics);
          }
        }
      } catch (error) {
        console.error('Error fetching system health:', error);
        // Set default system health if API fails
        setSystemHealth({
          overallStatus: 'Healthy',
          uptime: '99.9%',
          cpuUsage: 0,
          memoryUsage: 0
        });
      }
    };
    
    fetchSystemHealth();
  }, []);

  // Fetch calendar events from projects, announcements, and coordination events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        const token = getToken();
        if (!token) return;
        
        const events = [];
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Fetch coordination events for current month
        try {
          const coordResponse = await fetch(`${API_URL}/coordination/calendar/${currentYear}/${currentMonth}`, {
            headers: getAuthHeaders()
          });
          if (coordResponse.ok) {
            const coordData = await coordResponse.json();
            if (coordData.success && coordData.events) {
              coordData.events.forEach(event => {
                events.push({
                  id: event.id,
                  title: event.title,
                  date: event.startDate,
                  time: new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  type: 'coordination',
                  eventType: event.eventType,
                  priority: event.priority
                });
              });
            }
          }
        } catch (err) {
          console.error('Error fetching coordination events:', err);
        }
        
        // Add project deadlines from projects
        if (!isSystemAdmin && projects.length > 0) {
          projects.forEach(project => {
            if (project.targetCompletionDate) {
              const deadlineDate = new Date(project.targetCompletionDate);
              if (deadlineDate.getFullYear() === currentYear && deadlineDate.getMonth() + 1 === currentMonth) {
                events.push({
                  id: `project-${project.id}`,
                  title: `${project.name || project.projectName} - Project Deadline`,
                  date: project.targetCompletionDate,
                  time: deadlineDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  type: 'project',
                  eventSubType: 'project_deadline',
                  priority: 'high',
                  projectId: project.id,
                  implementingOfficeName: project.implementingOfficeName || project.implementingOffice?.name || 'N/A',
                  implementingOfficePicture: project.implementingOffice?.profilePictureUrl || project.implementingOffice?.profilePicture || null,
                  eiuPersonnelName: project.eiuPersonnelName || project.eiuPersonnel?.name || project.eiuPersonnel?.externalCompanyName || null,
                  eiuPersonnelPicture: project.eiuPersonnel?.profilePictureUrl || project.eiuPersonnel?.profilePicture || null,
                  status: project.status || 'ongoing',
                  progress: project.progress?.overall || project.overallProgress || 0,
                  projectCode: project.projectCode || null,
                  location: project.location || null,
                  category: project.category || null,
                  budget: project.totalBudget || null
                });
              }
            }
          });
        }
        
        // Fetch and add milestone due dates
        if (!isSystemAdmin && projects.length > 0) {
          try {
            console.log('📅 [DashboardCenter] Fetching milestones for', projects.length, 'projects');
            const milestonesResponse = await fetch(`${API_URL}/projects/all-milestones`, {
              headers: getAuthHeaders()
            });
            
            console.log('📅 [DashboardCenter] Milestones response status:', milestonesResponse.status);
            
            if (milestonesResponse.ok) {
              const milestonesData = await milestonesResponse.json();
              console.log('📅 [DashboardCenter] Milestones data:', milestonesData);
              
              if (milestonesData.success && milestonesData.milestones) {
                console.log('📅 [DashboardCenter] Processing', milestonesData.milestones.length, 'milestones');
                milestonesData.milestones.forEach(milestone => {
                  if (milestone.dueDate) {
                    try {
                      const dueDate = new Date(milestone.dueDate);
                      if (dueDate.getFullYear() === currentYear && dueDate.getMonth() + 1 === currentMonth) {
                        // Find the project for this milestone to get additional details
                        const project = projects.find(p => p.id === milestone.projectId);
                        
                        // Calculate milestone progress from actual division contributions
                        let calculatedProgress = parseFloat(milestone.progress || 0);
                        const milestoneWeight = parseFloat(milestone.weight || 0);
                        const milestoneStatus = milestone.status || 'pending';
                        const plannedBudget = parseFloat(milestone.plannedBudget || milestone.budgetPlanned || 0);
                        const usedBudget = parseFloat(milestone.usedBudget || 0);
                        const projectOverallProgress = project ? (project.progress?.overall || project.overallProgress || 0) : 0;
                        
                        // Debug: Log all available milestone data
                        console.log('🔍 [Milestone Progress Calc] Raw milestone data:', {
                          milestoneId: milestone.id,
                          milestoneTitle: milestone.title,
                          milestoneStatus: milestoneStatus,
                          milestoneProgress: milestone.progress,
                          milestoneWeight: milestoneWeight,
                          plannedBudget: plannedBudget,
                          usedBudget: usedBudget,
                          timelineStatus: milestone.timelineStatus,
                          budgetStatus: milestone.budgetStatus,
                          physicalStatus: milestone.physicalStatus,
                          timelineWeight: milestone.timelineWeight,
                          budgetWeight: milestone.budgetWeight,
                          physicalWeight: milestone.physicalWeight,
                          projectOverallProgress: projectOverallProgress,
                          allMilestoneKeys: Object.keys(milestone)
                        });
                        
                        // Calculate actual progress from budget utilization and division statuses
                        if (calculatedProgress === 0 && milestoneWeight > 0) {
                          // Get division weights (default to equal distribution if not set)
                          const timelineWeight = parseFloat(milestone.timelineWeight || milestoneWeight / 3);
                          const budgetWeight = parseFloat(milestone.budgetWeight || milestoneWeight / 3);
                          const physicalWeight = parseFloat(milestone.physicalWeight || milestoneWeight / 3);
                          
                          // Calculate actual progress based on division statuses and budget utilization
                          let actualTimelineProgress = 0;
                          let actualBudgetProgress = 0;
                          let actualPhysicalProgress = 0;
                          
                          // Timeline division: if approved/completed, use full weight
                          if (milestone.timelineStatus === 'completed' || milestone.timelineStatus === 'approved' || milestone.timelineStatus === 'iu_approved' || milestone.timelineStatus === 'secretariat_approved') {
                            actualTimelineProgress = timelineWeight;
                          } else if (milestone.timelineStatus === 'in_progress' || milestone.timelineStatus === 'ongoing') {
                            actualTimelineProgress = timelineWeight * 0.5;
                          }
                          
                          // Budget division: calculate from actual budget utilization
                          if (milestone.budgetStatus === 'completed' || milestone.budgetStatus === 'approved' || milestone.budgetStatus === 'iu_approved' || milestone.budgetStatus === 'secretariat_approved') {
                            if (plannedBudget > 0 && usedBudget > 0) {
                              // Use actual budget utilization ratio
                              const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
                              actualBudgetProgress = budgetWeight * budgetUtilizationRatio;
                            } else {
                              // If no budget data, use full weight if approved
                              actualBudgetProgress = budgetWeight;
                            }
                          } else if (milestone.budgetStatus === 'in_progress' || milestone.budgetStatus === 'ongoing') {
                            if (plannedBudget > 0 && usedBudget > 0) {
                              const budgetUtilizationRatio = Math.min(1, usedBudget / plannedBudget);
                              actualBudgetProgress = budgetWeight * budgetUtilizationRatio * 0.5;
                            } else {
                              actualBudgetProgress = budgetWeight * 0.5;
                            }
                          }
                          
                          // Physical division: if approved/completed, use full weight
                          if (milestone.physicalStatus === 'completed' || milestone.physicalStatus === 'approved' || milestone.physicalStatus === 'iu_approved' || milestone.physicalStatus === 'secretariat_approved') {
                            actualPhysicalProgress = physicalWeight;
                          } else if (milestone.physicalStatus === 'in_progress' || milestone.physicalStatus === 'ongoing') {
                            actualPhysicalProgress = physicalWeight * 0.5;
                          }
                          
                          // Sum up the actual progress from all divisions
                          calculatedProgress = actualTimelineProgress + actualBudgetProgress + actualPhysicalProgress;
                          
                          // Debug: Log calculation details
                          console.log('📊 [Milestone Progress Calc] Calculation details:', {
                            milestoneId: milestone.id,
                            timelineWeight: timelineWeight,
                            budgetWeight: budgetWeight,
                            physicalWeight: physicalWeight,
                            actualTimelineProgress: actualTimelineProgress,
                            actualBudgetProgress: actualBudgetProgress,
                            actualPhysicalProgress: actualPhysicalProgress,
                            calculatedProgress: calculatedProgress,
                            budgetUtilizationRatio: plannedBudget > 0 && usedBudget > 0 ? (usedBudget / plannedBudget).toFixed(3) : 'N/A'
                          });
                          
                          // Fallback: If calculated progress is still 0 but milestone is completed and we have project progress,
                          // estimate based on project progress contribution
                          if (calculatedProgress === 0 && (milestoneStatus === 'completed' || milestoneStatus === 'complete' || milestoneStatus === 'approved') && projectOverallProgress > 0) {
                            // If this is the only milestone or first milestone, use project progress as estimate
                            // This is a fallback when division data is not available
                            console.log('⚠️ [Milestone Progress Calc] Using fallback: project progress contribution');
                            calculatedProgress = Math.min(milestoneWeight, projectOverallProgress);
                          }
                        }
                        
                        // Debug: Log milestone data to understand progress calculation
                        if (calculatedProgress > 0 || milestone.progress > 0) {
                          console.log('📊 [DashboardCenter] Milestone progress calculation:', {
                            milestoneId: milestone.id,
                            milestoneTitle: milestone.title,
                            milestoneStatus: milestoneStatus,
                            milestoneProgress: milestone.progress,
                            calculatedProgress: calculatedProgress,
                            milestoneWeight: milestoneWeight,
                            plannedBudget: plannedBudget,
                            usedBudget: usedBudget,
                            budgetUtilization: plannedBudget > 0 ? (usedBudget / plannedBudget * 100).toFixed(1) + '%' : 'N/A',
                            timelineStatus: milestone.timelineStatus,
                            budgetStatus: milestone.budgetStatus,
                            physicalStatus: milestone.physicalStatus,
                            timelineWeight: milestone.timelineWeight,
                            budgetWeight: milestone.budgetWeight,
                            physicalWeight: milestone.physicalWeight,
                            projectProgress: project ? (project.progress?.overall || project.overallProgress || 0) : 0,
                            displayValue: `${calculatedProgress.toFixed(1)}%/${milestoneWeight.toFixed(1)}%`
                          });
                        }
                        
                        events.push({
                          id: `milestone-${milestone.id}`,
                          title: `${milestone.title || 'Milestone'} - ${milestone.projectName || 'Project'}`,
                          date: milestone.dueDate,
                          time: dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                          type: 'project',
                          eventSubType: 'milestone_deadline',
                          priority: milestone.priority || 'medium',
                          projectId: milestone.projectId,
                          milestoneId: milestone.id,
                          projectName: milestone.projectName || 'Unknown Project',
                          milestoneTitle: milestone.title || 'Milestone',
                          implementingOfficeName: project ? (project.implementingOfficeName || project.implementingOffice?.name || 'N/A') : 'N/A',
                          implementingOfficePicture: project ? (project.implementingOffice?.profilePictureUrl || project.implementingOffice?.profilePicture || null) : null,
                          eiuPersonnelName: project ? (project.eiuPersonnelName || project.eiuPersonnel?.name || project.eiuPersonnel?.externalCompanyName || null) : null,
                          eiuPersonnelPicture: project ? (project.eiuPersonnel?.profilePictureUrl || project.eiuPersonnel?.profilePicture || null) : null,
                          status: project ? (project.status || 'pending') : 'pending',
                          progress: project ? (project.progress?.overall || project.overallProgress || 0) : 0,
                          milestoneStatus: milestone.status || 'pending',
                          milestoneProgress: calculatedProgress,
                          milestoneWeight: parseFloat(milestone.weight || 0),
                          milestonePlannedBudget: parseFloat(milestone.plannedBudget || milestone.budgetPlanned || 0),
                          milestoneUsedBudget: parseFloat(milestone.usedBudget || 0),
                          projectCode: project ? (project.projectCode || null) : null,
                          location: project ? (project.location || null) : null,
                          category: project ? (project.category || null) : null,
                          budget: project ? (project.totalBudget || null) : null
                        });
                      }
                    } catch (dateError) {
                      console.error('📅 [DashboardCenter] Error processing milestone date:', dateError, milestone);
                    }
                  }
                });
                console.log('📅 [DashboardCenter] Added', events.filter(e => e.eventSubType === 'milestone_deadline').length, 'milestone events');
              } else {
                console.warn('📅 [DashboardCenter] No milestones in response or success is false');
              }
            } else {
              const errorText = await milestonesResponse.text();
              console.error('📅 [DashboardCenter] Error fetching milestones:', milestonesResponse.status, milestonesResponse.statusText);
              console.error('📅 [DashboardCenter] Error response:', errorText);
            }
          } catch (err) {
            console.error('📅 [DashboardCenter] Error fetching milestones:', err);
            console.error('📅 [DashboardCenter] Error details:', err.message, err.stack);
          }
        }
        
        // Add announcement publish dates with read status
        const currentUserId = userData?.id || null;
        announcements.forEach(announcement => {
          if (announcement.publishDate) {
            const publishDate = new Date(announcement.publishDate);
            if (publishDate.getFullYear() === currentYear && publishDate.getMonth() + 1 === currentMonth) {
              // Check if announcement is read by current user
              let isRead = false;
              if (announcement.readReceipts && currentUserId) {
                if (Array.isArray(announcement.readReceipts)) {
                  const receipt = announcement.readReceipts.find(r => r && r.userId === currentUserId);
                  isRead = receipt ? !!receipt.readAt : false;
                } else if (announcement.readReceipts.userId === currentUserId) {
                  // Handle case where readReceipts is a single object
                  isRead = !!announcement.readReceipts.readAt;
                }
              } else if (announcement.isRead !== undefined) {
                isRead = announcement.isRead;
              }
              
              // Get creator information
              const creatorName = announcement.creator?.name || announcement.creator?.fullName || 'System Administrator';
              
              events.push({
                id: `announcement-${announcement.id}`,
                title: announcement.title,
                date: announcement.publishDate,
                time: publishDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                type: 'announcement',
                priority: announcement.priority || 'medium',
                announcementId: announcement.id,
                isRead: isRead,
                creatorName: creatorName,
                creatorPicture: announcement.creator?.profilePictureUrl || announcement.creator?.profilePicture || null,
                content: announcement.content || announcement.contentHtml || null,
                announcementType: announcement.announcementType || null,
                targetAudience: announcement.targetAudience || null
              });
            }
          }
        });
        
        setCalendarEvents(events);
        // Expose events to window for debugging
        if (typeof window !== 'undefined') {
          window.__CALENDAR_EVENTS__ = events;
        }
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      }
    };
    
    fetchCalendarEvents();
  }, [currentDate, projects, announcements, isSystemAdmin, userData]);

  // Map initialization removed - using CentralizedProjectMap component instead

  // Calendar navigation
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (dateInput) => {
    try {
      // Handle both Date objects and date strings
      let date;
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        return 'N/A';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateInput);
      return 'N/A';
    }
  };

  // Handle adding new calendar event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startDate) {
      alert('Please fill in required fields (Title and Start Date)');
      return;
    }

    setIsSubmittingEvent(true);
    try {
      const token = getToken();
      if (!token) {
        alert('You must be logged in to add events');
        return;
      }

      const response = await fetch(`${API_URL}/coordination`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newEvent)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh calendar events
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1;
          const coordResponse = await fetch(`${API_URL}/coordination/calendar/${currentYear}/${currentMonth}`, {
            headers: getAuthHeaders()
          });
          if (coordResponse.ok) {
            const coordData = await coordResponse.json();
            if (coordData.success && coordData.events) {
              const events = [...calendarEvents];
              coordData.events.forEach(event => {
                if (!events.find(e => e.id === event.id)) {
                  events.push({
                    id: event.id,
                    title: event.title,
                    date: event.startDate,
                    time: new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    type: 'coordination',
                    eventType: event.eventType,
                    priority: event.priority
                  });
                }
              });
              setCalendarEvents(events);
            }
          }
          
          // Reset form and close modal
          setNewEvent({
            title: '',
            description: '',
            eventType: 'meeting',
            startDate: '',
            endDate: '',
            location: '',
            priority: 'medium'
          });
          setShowAddEventModal(false);
          alert('Event added successfully!');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add event. You may not have permission to add events.');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Check if user can add events (LGU-PMT role)
  const canAddEvents = () => {
    const role = getCurrentUserRole();
    return role === 'LGU-PMT' || role === 'LGU_PMT' || role === 'MPMEC';
  };

  const getWelcomeMessage = () => {
    if (!userData) return 'Welcome back!';
    const name = userData.name || userData.fullName || 'User';
    const roleName = userData.role === 'EIU' ? 'EIU Personnel' :
                     userData.role === 'LGU-IU' ? 'Implementing Office Officer' :
                     userData.role === 'LGU-PMT' && userData.subRole?.includes('Secretariat') ? 'MPMEC Secretariat' :
                     userData.role === 'LGU-PMT' ? 'MPMEC Member' :
                     userData.role === 'EMS' ? 'Executive Viewer' :
                     userData.role === 'SYS.AD' ? 'System Administrator' : 'User';
    return `Welcome back, ${name}!`;
  };

  const getDashboardTitle = () => {
    if (currentRole === 'EIU') return 'EIU Dashboard';
    if (currentRole === 'LGU-IU' || currentRole === 'IU') return 'LGU-IU Dashboard';
    if (currentRole === 'LGU-PMT' && userData?.subRole?.includes('Secretariat')) return 'Secretariat Dashboard';
    if (currentRole === 'LGU-PMT') return 'MPMEC Dashboard';
    if (currentRole === 'EMS') return 'Executive Dashboard';
    if (isSystemAdmin) return 'System Admin Dashboard';
    return 'Dashboard';
  };

  const getDashboardSubtitle = () => {
    if (currentRole === 'EIU') return 'Engineering and Infrastructure Unit - Project Monitoring Overview';
    if (currentRole === 'LGU-IU' || currentRole === 'IU') return 'Implementing Office - Project Management Overview';
    if (currentRole === 'LGU-PMT' && userData?.subRole?.includes('Secretariat')) return 'MPMEC Secretariat - Project Review and Approval Overview';
    if (currentRole === 'LGU-PMT') return 'Municipal Project Monitoring and Evaluation Committee - Project Overview';
    if (currentRole === 'EMS') return 'Comprehensive oversight of all LGU projects and programs';
    if (isSystemAdmin) return 'System Administration and Management Overview';
    return 'Project Monitoring Overview';
  };

  // Render project card (will be handled by ProjectCard.astro component)
  const handleProjectClick = (projectId) => {
    if (typeof window !== 'undefined' && window.showProjectModal) {
      window.showProjectModal(projectId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${currentTheme.primary}`}></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Welcome Banner */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${currentTheme.gradient} text-white py-8 px-8 mb-8 rounded-2xl shadow-xl`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">{getDashboardTitle()}</h1>
          <p className="text-lg text-white/90">{getDashboardSubtitle()}</p>
          <p className="text-sm text-white/80 mt-2">{getWelcomeMessage()}</p>
        </div>
      </div>

      {/* Statistics Cards - Only for non-System Admin */}
      {!isSystemAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300 transform hover:-translate-y-2`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalProjects}</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300 transform hover:-translate-y-2`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ongoing</p>
                <p className="text-3xl font-bold text-green-600">{stats.ongoingProjects}</p>
              </div>
              <div className="p-4 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300 transform hover:-translate-y-2`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Complete</p>
                <p className="text-3xl font-bold text-blue-600">{stats.completedProjects}</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300 transform hover:-translate-y-2`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Progress</p>
                <p className="text-3xl font-bold text-purple-600">{stats.averageProgress}%</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Overview and Quick Actions - Only for non-System Admin */}
      {!isSystemAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300`}>
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Budget Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Budget</span>
                <span className="text-lg font-semibold text-gray-800">{stats.totalBudget}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Utilized Budget</span>
                <span className="text-lg font-semibold text-green-600">{stats.utilizedBudget}</span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`bg-gradient-to-r ${currentTheme.gradient} h-3 rounded-full budget-progress-bar-fill`}
                    style={{ 
                      '--progress-width': `${Math.max(stats.budgetUtilizationPercentage, 0.1)}%`,
                      width: '0%'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {stats.budgetUtilizationPercentage > 0 
                    ? `${stats.budgetUtilizationPercentage.toFixed(2)}% utilized`
                    : '0% utilized'}
                </p>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300`}>
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <button 
                onClick={() => {
                  const basePath = currentRole === 'EIU' ? '/dashboard/eiu/modules/projects' :
                                  currentRole === 'LGU-IU' || currentRole === 'IU' ? '/dashboard/iu-implementing-office/modules/project-management' :
                                  currentRole === 'LGU-PMT' && userData?.subRole?.includes('Secretariat') ? '/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions' :
                                  currentRole === 'LGU-PMT' ? '/dashboard/lgu-pmt-mpmec/modules/approved-projects' :
                                  '/dashboard/executive-viewer/modules/projects';
                  window.location.href = basePath;
                }}
                className={`w-full px-6 py-4 ${currentTheme.button} text-white rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-left flex items-center gap-4`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <span className="font-semibold">View All Projects</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Cards Section - Only for non-System Admin */}
      {/* Always render the section if not System Admin - cards will be injected from Astro */}
      {!isSystemAdmin && (
        <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} overflow-hidden mb-8`}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-gray-800">Recent Projects</h3>
            <a 
              href={currentRole === 'EIU' ? '/dashboard/eiu/modules/projects' :
                    currentRole === 'LGU-IU' || currentRole === 'IU' ? '/dashboard/iu-implementing-office/modules/project-management' :
                    currentRole === 'LGU-PMT' && userData?.subRole?.includes('Secretariat') ? '/dashboard/lgu-pmt-mpmec-secretariat/modules/submissions' :
                    currentRole === 'LGU-PMT' ? '/dashboard/lgu-pmt-mpmec/modules/approved-projects' :
                    '/dashboard/executive-viewer/modules/projects'}
              className={`inline-flex items-center gap-2 ${currentTheme.accent} hover:opacity-80 text-sm font-medium transition-all duration-300`}
            >
              <span>View All Projects</span>
              <svg className="w-4 h-4 transition-transform duration-300 hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" id="dashboard-project-cards">
              {/* Project cards will be injected here by script from #dashboard-project-cards-astro */}
              {typeof window !== 'undefined' && document.getElementById('dashboard-project-cards-astro')?.children.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <p>No recent projects to display</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar and User Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Interactive Calendar */}
        <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Calendar</h3>
            <div className="flex items-center gap-2">
              {canAddEvents() && (
                <button
                  onClick={() => {
                    const today = new Date();
                    const dateStr = today.toISOString().split('T')[0];
                    setNewEvent(prev => ({ ...prev, startDate: dateStr }));
                    setShowAddEventModal(true);
                  }}
                  className={`px-4 py-2 ${currentTheme.button} text-white rounded-lg transition-all duration-200 hover:opacity-90 text-sm font-medium flex items-center gap-2`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Add Event
                </button>
              )}
              <button
                onClick={() => navigateMonth(-1)}
                className={`p-2 ${currentTheme.primary} text-white rounded-lg transition-all duration-200 hover:opacity-80`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className={`p-2 ${currentTheme.primary} text-white rounded-lg transition-all duration-200 hover:opacity-80`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="calendar-container" ref={calendarRef}>
            <div className="mb-4 text-center">
              <h4 className="text-lg font-semibold text-gray-800">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square"></div>
              ))}
              {Array.from({ length: getDaysInMonth(currentDate) }).map((_, index) => {
                const day = index + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                // Determine if date is in left column (Sun, Mon, Tue) to adjust tooltip position
                const dayOfWeek = date.getDay();
                const isLeftColumn = dayOfWeek <= 2; // Sunday (0), Monday (1), Tuesday (2)
                const dayEvents = calendarEvents.filter(event => {
                  const eventDate = new Date(event.date);
                  return eventDate.toDateString() === date.toDateString();
                });
                const hasEvent = dayEvents.length > 0;
                
                // Determine event types for color coding
                const hasProject = dayEvents.some(e => e.type === 'project');
                const hasAnnouncement = dayEvents.some(e => e.type === 'announcement');
                const hasMilestone = dayEvents.some(e => e.eventSubType === 'milestone_deadline');
                const hasProjectDeadline = dayEvents.some(e => e.eventSubType === 'project_deadline');
                
                // Count events by type
                const announcementCount = dayEvents.filter(e => e.type === 'announcement').length;
                const projectCount = dayEvents.filter(e => e.type === 'project').length;
                
                // Create detailed tooltip content
                const tooltipContent = hasEvent ? dayEvents.map(event => {
                  const eventDate = new Date(event.date);
                  const formattedDate = eventDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  });
                  const formattedTime = event.time || eventDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  
                  let eventDetails = '';
                  const eventTypeColor = event.type === 'project' ? '#3B82F6' : event.type === 'announcement' ? '#F97316' : '#6B7280';
                  
                  if (event.type === 'project') {
                    const isMilestone = event.eventSubType === 'milestone_deadline';
                    const isProjectDeadline = event.eventSubType === 'project_deadline';
                    let projectName = event.title;
                    let eventTypeLabel = 'Project Deadline';
                    let milestoneTitle = null;
                    let projectTitle = null;
                    
                    if (isMilestone) {
                      // Use milestone-specific data if available
                      milestoneTitle = event.milestoneTitle || (event.title.split(' - ')[0]);
                      projectTitle = event.projectName || (event.title.split(' - ')[1] || 'Project');
                      projectName = milestoneTitle;
                      eventTypeLabel = 'Milestone Due Date';
                    } else if (isProjectDeadline) {
                      projectName = event.title.replace(' - Project Deadline', '');
                      eventTypeLabel = 'Project Target Completion Date';
                    }
                    
                    // Get project details
                    const implementingOffice = event.implementingOfficeName || 'N/A';
                    const implementingOfficePic = event.implementingOfficePicture || null;
                    const eiuPartner = event.eiuPersonnelName || null;
                    const eiuPartnerPic = event.eiuPersonnelPicture || null;
                    const projectStatus = event.status || 'ongoing';
                    const progress = parseFloat(event.progress || 0).toFixed(1);
                    const projectCode = event.projectCode || null;
                    const location = event.location || null;
                    const category = event.category || null;
                    const budget = event.budget || null;
                    
                    // Milestone-specific data
                    const milestoneStatus = isMilestone ? (event.milestoneStatus || 'pending') : null;
                    // Get actual milestone progress from database
                    // Debug: Log event data to understand what's available
                    if (isMilestone) {
                      console.log('🔍 [Calendar Tooltip Debug] Milestone Event Data:', {
                        milestoneId: event.milestoneId,
                        milestoneStatus: event.milestoneStatus,
                        milestoneProgress: event.milestoneProgress,
                        milestoneWeight: event.milestoneWeight,
                        projectProgress: event.progress,
                        allEventKeys: Object.keys(event)
                      });
                    }
                    const actualMilestoneProgress = isMilestone ? parseFloat(event.milestoneProgress || 0) : 0;
                    // Get milestone weight
                    const milestoneWeight = isMilestone ? parseFloat(event.milestoneWeight || 0) : 0;
                    // Display actual progress out of milestone weight (e.g., "19.6%/20%")
                    let milestoneProgressDisplay = null;
                    if (isMilestone) {
                      if (milestoneWeight > 0) {
                        milestoneProgressDisplay = `${actualMilestoneProgress.toFixed(1)}%/${milestoneWeight.toFixed(1)}%`;
                      } else {
                        milestoneProgressDisplay = actualMilestoneProgress.toFixed(1) + '%';
                      }
                    }
                    const milestoneProgress = isMilestone ? milestoneProgressDisplay : null;
                    const milestonePlannedBudget = isMilestone ? parseFloat(event.milestonePlannedBudget || 0) : null;
                    const milestoneUsedBudget = isMilestone ? parseFloat(event.milestoneUsedBudget || 0) : null;
                    
                    // Format budget
                    const formattedBudget = budget ? `₱${parseFloat(budget).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
                    const formattedMilestonePlannedBudget = milestonePlannedBudget ? `₱${milestonePlannedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
                    const formattedMilestoneUsedBudget = milestoneUsedBudget ? `₱${milestoneUsedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
                    
                    // Status badge colors for project
                    let statusBadgeColor = '#6B7280'; // default gray
                    let statusBadgeBg = '#F3F4F6';
                    if (projectStatus === 'ongoing') {
                      statusBadgeColor = '#059669';
                      statusBadgeBg = '#D1FAE5';
                    } else if (projectStatus === 'delayed') {
                      statusBadgeColor = '#DC2626';
                      statusBadgeBg = '#FEE2E2';
                    } else if (projectStatus === 'completed' || projectStatus === 'complete') {
                      statusBadgeColor = '#2563EB';
                      statusBadgeBg = '#DBEAFE';
                    // Removed: pending status check - projects now go directly to ongoing
                    } else if (false) { // Removed pending check
                      statusBadgeColor = '#F59E0B';
                      statusBadgeBg = '#FEF3C7';
                    }
                    
                    // Milestone status badge colors
                    let milestoneStatusBadgeColor = '#6B7280';
                    let milestoneStatusBadgeBg = '#F3F4F6';
                    if (isMilestone && milestoneStatus) {
                      if (milestoneStatus === 'completed' || milestoneStatus === 'complete') {
                        milestoneStatusBadgeColor = '#059669';
                        milestoneStatusBadgeBg = '#D1FAE5';
                      } else if (milestoneStatus === 'approved' || milestoneStatus === 'iu_approved' || milestoneStatus === 'secretariat_approved') {
                        milestoneStatusBadgeColor = '#059669';
                        milestoneStatusBadgeBg = '#D1FAE5';
                      } else if (milestoneStatus === 'pending') {
                        milestoneStatusBadgeColor = '#F59E0B';
                        milestoneStatusBadgeBg = '#FEF3C7';
                      } else if (milestoneStatus === 'delayed') {
                        milestoneStatusBadgeColor = '#DC2626';
                        milestoneStatusBadgeBg = '#FEE2E2';
                      }
                    }
                    
                    // Format status text
                    const statusText = projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1);
                    const milestoneStatusText = isMilestone && milestoneStatus ? milestoneStatus.charAt(0).toUpperCase() + milestoneStatus.slice(1).replace('_', ' ') : null;
                    
                    // Format profile picture URL
                    const formatProfilePic = (pic) => {
                      if (!pic) return null;
                      if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
                      // Use dynamic API base URL (remove /api suffix for file URLs)
                      const baseUrl = API_URL.replace('/api', '');
                      return `${baseUrl}${pic.startsWith('/') ? pic : '/' + pic}`;
                    };
                    
                    const implementingOfficePicUrl = formatProfilePic(implementingOfficePic);
                    const eiuPartnerPicUrl = formatProfilePic(eiuPartnerPic);
                    
                    eventDetails = `
                      <div style="margin-bottom: 12px; padding: 10px; background: #F0F9FF; border-left: 3px solid ${eventTypeColor}; border-radius: 4px;">
                        ${isMilestone && projectTitle ? `<div style="font-weight: bold; color: #1f2937; margin-bottom: 4px; font-size: 13px;"><strong>${projectTitle}</strong></div>` : ''}
                        <div style="font-weight: bold; color: #1f2937; margin-bottom: 6px; font-size: 12px;">${projectName}</div>
                        <div style="font-size: 11px; color: #4B5563; line-height: 1.6;">
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Type:</strong> <span style="color: ${eventTypeColor}; font-weight: 600;">${eventTypeLabel}</span></div>
                          ${projectCode ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Project Code:</strong> <span style="color: #1f2937;">${projectCode}</span></div>` : ''}
                          ${implementingOffice && implementingOffice !== 'N/A' ? `
                            <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                              ${implementingOfficePicUrl ? `<img src="${implementingOfficePicUrl}" alt="${implementingOffice}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid #E5E7EB;" onerror="this.style.display='none'">` : ''}
                              <span style="color: #1f2937;">${implementingOffice}</span>
                            </div>
                          ` : ''}
                          ${eiuPartner ? `
                            <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                              ${eiuPartnerPicUrl ? `<img src="${eiuPartnerPicUrl}" alt="${eiuPartner}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid #E5E7EB;" onerror="this.style.display='none'">` : ''}
                              <span style="color: #1f2937;">${eiuPartner}</span>
                            </div>
                          ` : ''}
                          ${isMilestone && milestoneStatus ? `
                            <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; color: ${milestoneStatusBadgeColor}; background: ${milestoneStatusBadgeBg};">${milestoneStatusText}</span>
                              ${milestoneProgress !== null ? `<span style="color: #1f2937; font-weight: 500;">${milestoneProgress}</span>` : ''}
                            </div>
                          ` : `
                            <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; color: ${statusBadgeColor}; background: ${statusBadgeBg};">${statusText}</span>
                              <span style="color: #1f2937; font-weight: 500;">${progress}%</span>
                            </div>
                          `}
                          ${isMilestone && formattedMilestonePlannedBudget ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Milestone Planned Budget:</strong> <span style="color: #1f2937;">${formattedMilestonePlannedBudget}</span></div>` : ''}
                          ${isMilestone && formattedMilestoneUsedBudget ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Milestone Used Budget:</strong> <span style="color: #1f2937;">${formattedMilestoneUsedBudget}</span></div>` : ''}
                          ${location ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Location:</strong> <span style="color: #1f2937;">${location}</span></div>` : ''}
                          ${category ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Category:</strong> <span style="color: #1f2937;">${category}</span></div>` : ''}
                          ${formattedBudget ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Project Budget:</strong> <span style="color: #1f2937;">${formattedBudget}</span></div>` : ''}
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Date:</strong> ${formattedDate}</div>
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Time:</strong> ${formattedTime}</div>
                          <div><strong style="color: #374151;">Priority:</strong> <span style="color: #DC2626; font-weight: 600;">${event.priority || 'High'}</span></div>
                        </div>
                      </div>
                    `;
                  } else if (event.type === 'announcement') {
                    const isRead = event.isRead || false;
                    const creatorName = event.creatorName || 'System Administrator';
                    const creatorPicture = event.creatorPicture || null;
                    const announcementType = event.announcementType || null;
                    const targetAudience = event.targetAudience || null;
                    const content = event.content || null;
                    
                    // Format profile picture URL
                    const formatProfilePic = (pic) => {
                      if (!pic) return null;
                      if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
                      // Use dynamic API base URL (remove /api suffix for file URLs)
                      const baseUrl = API_URL.replace('/api', '');
                      return `${baseUrl}${pic.startsWith('/') ? pic : '/' + pic}`;
                    };
                    
                    const creatorPicUrl = formatProfilePic(creatorPicture);
                    
                    // Strip HTML tags from content for preview (first 100 chars)
                    const contentPreview = content ? content.replace(/<[^>]*>/g, '').substring(0, 100) + (content.length > 100 ? '...' : '') : null;
                    
                    eventDetails = `
                      <div style="margin-bottom: 12px; padding: 10px; background: #FFF7ED; border-left: 3px solid ${eventTypeColor}; border-radius: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                          <div style="font-weight: bold; color: #1f2937; font-size: 12px; flex: 1;">${event.title}</div>
                          ${isRead 
                            ? '<div style="color: #10B981; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 2px;" title="Read"><span style="font-size: 12px;">✓</span><span style="font-size: 9px; color: #10B981;">Read</span></div>' 
                            : '<div style="display: flex; align-items: center; gap: 2px; flex-shrink: 0;" title="Unread"><div style="width: 8px; height: 8px; background: #F97316; border-radius: 50%;"></div><span style="font-size: 9px; color: #F97316; font-weight: 600;">Unread</span></div>'
                          }
                        </div>
                        <div style="font-size: 11px; color: #4B5563; line-height: 1.6;">
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Type:</strong> <span style="color: ${eventTypeColor}; font-weight: 600;">Announcement</span></div>
                          ${announcementType ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Announcement Type:</strong> <span style="color: #1f2937;">${announcementType}</span></div>` : ''}
                          <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                            ${creatorPicUrl ? `<img src="${creatorPicUrl}" alt="${creatorName}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid #E5E7EB;" onerror="this.style.display='none'">` : ''}
                            <span><strong style="color: #374151;">Published by:</strong> <span style="color: #1f2937; font-weight: 500;">${creatorName}</span></span>
                          </div>
                          ${targetAudience ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Target Audience:</strong> <span style="color: #1f2937;">${targetAudience}</span></div>` : ''}
                          ${contentPreview ? `<div style="margin-bottom: 4px;"><strong style="color: #374151;">Content:</strong> <span style="color: #1f2937;">${contentPreview}</span></div>` : ''}
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Date:</strong> ${formattedDate}</div>
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Time:</strong> ${formattedTime}</div>
                          <div><strong style="color: #374151;">Priority:</strong> <span style="color: #F97316; font-weight: 600;">${event.priority || 'Medium'}</span></div>
                        </div>
                      </div>
                    `;
                  } else if (event.type === 'coordination') {
                    eventDetails = `
                      <div style="margin-bottom: 12px; padding: 10px; background: #F9FAFB; border-left: 3px solid #6B7280; border-radius: 4px;">
                        <div style="font-weight: bold; color: #1f2937; margin-bottom: 6px; font-size: 12px;">${event.title}</div>
                        <div style="font-size: 11px; color: #4B5563; line-height: 1.6;">
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Type:</strong> ${(event.eventType || 'Event').replace('_', ' ')}</div>
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Date:</strong> ${formattedDate}</div>
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Time:</strong> ${formattedTime}</div>
                          <div><strong style="color: #374151;">Priority:</strong> ${event.priority || 'Medium'}</div>
                        </div>
                      </div>
                    `;
                  } else {
                    eventDetails = `
                      <div style="margin-bottom: 12px; padding: 10px; background: #F9FAFB; border-left: 3px solid #6B7280; border-radius: 4px;">
                        <div style="font-weight: bold; color: #1f2937; margin-bottom: 6px; font-size: 12px;">${event.title}</div>
                        <div style="font-size: 11px; color: #4B5563; line-height: 1.6;">
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Type:</strong> ${event.type || 'Event'}</div>
                          <div style="margin-bottom: 4px;"><strong style="color: #374151;">Date:</strong> ${formattedDate}</div>
                          <div><strong style="color: #374151;">Time:</strong> ${formattedTime}</div>
                        </div>
                      </div>
                    `;
                  }
                  return eventDetails;
                }).join('') : '';
                
                return (
                  <div key={day} className="relative group">
                    <button
                      onClick={() => setSelectedDate(date)}
                      className={`w-full aspect-square rounded-lg text-sm font-medium transition-all duration-200 relative ${
                        isToday 
                          ? `${currentTheme.primary} text-white shadow-lg` 
                          : isSelected
                          ? `${currentTheme.accent} bg-${currentTheme.primary.replace('bg-', '')}/10 border-2 ${currentTheme.border}`
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${
                        hasProject && !isToday ? 'ring-2 ring-blue-500 animate-pulse' : ''
                      } ${
                        hasAnnouncement && !isToday && !hasProject ? 'ring-2 ring-orange-500 animate-pulse' : ''
                      }`}
                    >
                      {day}
                      {/* Event type letter indicators */}
                      {hasEvent && (
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 flex-wrap">
                          {hasAnnouncement && (
                            <span className="bg-orange-500 text-white text-[8px] font-bold rounded px-0.5 h-3 flex items-center justify-center min-w-[12px]" title="Announcement">A</span>
                          )}
                          {hasProjectDeadline && (
                            <span className="bg-blue-400 text-white text-[8px] font-bold rounded px-0.5 h-3 flex items-center justify-center min-w-[12px]" title="Project Target Completion Date">P</span>
                          )}
                          {hasMilestone && (
                            <span className="bg-blue-600 text-white text-[8px] font-bold rounded px-0.5 h-3 flex items-center justify-center min-w-[14px]" title="Project Milestone Due Date">PM</span>
                          )}
                        </div>
                      )}
                      {/* Event counts */}
                      {hasEvent && (
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
                          {announcementCount > 0 && (
                            <span className="bg-orange-500 text-white text-[9px] font-bold rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center" title={`${announcementCount} announcement${announcementCount > 1 ? 's' : ''}`}>
                              {announcementCount}
                            </span>
                          )}
                          {projectCount > 0 && (
                            <span className="bg-blue-500 text-white text-[9px] font-bold rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center" title={`${projectCount} project${projectCount > 1 ? 's' : ''}`}>
                              {projectCount}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                    {hasEvent && (
                      <div 
                        className={`absolute bottom-full mb-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${isLeftColumn ? 'left-0' : 'right-0'}`}
                        style={{ 
                          maxWidth: 'min(400px, calc(100vw - 2rem))',
                          transform: isLeftColumn ? 'translateX(0)' : 'translateX(0)'
                        }}
                      >
                        <div 
                          className="bg-white text-gray-800 text-xs rounded-xl shadow-2xl border border-gray-200 overflow-hidden" 
                          style={{ 
                            minWidth: '300px', 
                            maxWidth: 'min(400px, calc(100vw - 2rem))',
                            maxHeight: '70vh',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Fixed Header */}
                          <div className="font-semibold px-4 pt-4 pb-3 text-gray-800 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
                            <span className="text-lg font-bold">{dayEvents.length} Event{dayEvents.length > 1 ? 's' : ''}</span>
                            <span className="text-gray-500 text-sm">on {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          {/* Scrollable Content */}
                          <div 
                            className="space-y-2 px-4 py-3 overflow-y-auto custom-scrollbar" 
                            dangerouslySetInnerHTML={{ __html: tooltipContent }}
                            style={{
                              maxHeight: 'calc(70vh - 80px)',
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#cbd5e1 #f1f5f9'
                            }}
                          />
                          {/* Arrow Indicator */}
                          <div className={`absolute top-full -mt-1 ${isLeftColumn ? 'left-6' : 'right-6'}`}>
                            <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {calendarEvents.filter(event => {
              const eventDate = new Date(event.date);
              return eventDate.toDateString() === selectedDate.toDateString();
            }).length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Events for {(() => {
                  try {
                    return formatDate(selectedDate);
                  } catch (error) {
                    console.error('Error formatting selectedDate:', error, selectedDate);
                    return 'N/A';
                  }
                })()}</h5>
                <div className="space-y-2">
                  {calendarEvents.filter(event => {
                    const eventDate = new Date(event.date);
                    return eventDate.toDateString() === selectedDate.toDateString();
                  }).map((event, index) => {
                    const priorityColors = {
                      low: 'bg-blue-100 text-blue-800',
                      medium: 'bg-yellow-100 text-yellow-800',
                      high: 'bg-orange-100 text-orange-800',
                      urgent: 'bg-red-100 text-red-800'
                    };
                    const typeColors = {
                      meeting: 'bg-purple-100 text-purple-800',
                      field_inspection: 'bg-green-100 text-green-800',
                      deadline: 'bg-red-100 text-red-800',
                      training: 'bg-blue-100 text-blue-800',
                      review: 'bg-indigo-100 text-indigo-800',
                      other: 'bg-gray-100 text-gray-800',
                      project: 'bg-cyan-100 text-cyan-800',
                      announcement: 'bg-pink-100 text-pink-800'
                    };
                    // Format profile picture URL helper
                    const formatProfilePic = (pic) => {
                      if (!pic) return null;
                      if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
                      // Use dynamic API base URL (remove /api suffix for file URLs)
                      const baseUrl = API_URL.replace('/api', '');
                      return `${baseUrl}${pic.startsWith('/') ? pic : '/' + pic}`;
                    };
                    
                    // Render event details based on type
                    let eventDetails = null;
                    
                    if (event.type === 'project') {
                      const isMilestone = event.eventSubType === 'milestone_deadline';
                      const isProjectDeadline = event.eventSubType === 'project_deadline';
                      let projectName = event.title;
                      let eventTypeLabel = 'Project Deadline';
                      let milestoneTitle = null;
                      let projectTitle = null;
                      
                      if (isMilestone) {
                        milestoneTitle = event.milestoneTitle || (event.title.split(' - ')[0]);
                        projectTitle = event.projectName || (event.title.split(' - ')[1] || 'Project');
                        projectName = milestoneTitle;
                        eventTypeLabel = 'Milestone Due Date';
                      } else if (isProjectDeadline) {
                        projectName = event.title.replace(' - Project Deadline', '');
                        eventTypeLabel = 'Project Target Completion Date';
                      }
                      
                      const implementingOffice = event.implementingOfficeName || 'N/A';
                      const implementingOfficePic = formatProfilePic(event.implementingOfficePicture);
                      const eiuPartner = event.eiuPersonnelName || null;
                      const eiuPartnerPic = formatProfilePic(event.eiuPersonnelPicture);
                      const projectStatus = event.status || 'ongoing';
                      const progress = parseFloat(event.progress || 0).toFixed(1);
                      const projectCode = event.projectCode || null;
                      const location = event.location || null;
                      const category = event.category || null;
                      const budget = event.budget || null;
                      const formattedBudget = budget ? `₱${parseFloat(budget).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
                      
                      // Milestone-specific data
                      const milestoneStatus = isMilestone ? (event.milestoneStatus || 'pending') : null;
                      // Get actual milestone progress from database
                      // Debug: Log event data to understand what's available
                      if (isMilestone) {
                        console.log('🔍 [Calendar Tooltip Debug - React] Milestone Event Data:', {
                          milestoneId: event.milestoneId,
                          milestoneStatus: event.milestoneStatus,
                          milestoneProgress: event.milestoneProgress,
                          milestoneWeight: event.milestoneWeight,
                          projectProgress: event.progress,
                          allEventKeys: Object.keys(event)
                        });
                      }
                      const actualMilestoneProgress = isMilestone ? parseFloat(event.milestoneProgress || 0) : 0;
                      // Get milestone weight
                      const milestoneWeight = isMilestone ? parseFloat(event.milestoneWeight || 0) : 0;
                      // Display actual progress out of milestone weight (e.g., "19.6%/20%")
                      let milestoneProgressDisplay = null;
                      if (isMilestone) {
                        if (milestoneWeight > 0) {
                          milestoneProgressDisplay = `${actualMilestoneProgress.toFixed(1)}%/${milestoneWeight.toFixed(1)}%`;
                        } else {
                          milestoneProgressDisplay = actualMilestoneProgress.toFixed(1) + '%';
                        }
                      }
                      const milestoneProgress = isMilestone ? milestoneProgressDisplay : null;
                      const milestonePlannedBudget = isMilestone ? parseFloat(event.milestonePlannedBudget || 0) : null;
                      const milestoneUsedBudget = isMilestone ? parseFloat(event.milestoneUsedBudget || 0) : null;
                      const formattedMilestonePlannedBudget = milestonePlannedBudget ? `₱${milestonePlannedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
                      const formattedMilestoneUsedBudget = milestoneUsedBudget ? `₱${milestoneUsedBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
                      
                      // Status badge colors for project
                      let statusBadgeColor = '#6B7280';
                      let statusBadgeBg = '#F3F4F6';
                      if (projectStatus === 'ongoing') {
                        statusBadgeColor = '#059669';
                        statusBadgeBg = '#D1FAE5';
                      } else if (projectStatus === 'delayed') {
                        statusBadgeColor = '#DC2626';
                        statusBadgeBg = '#FEE2E2';
                      } else if (projectStatus === 'completed' || projectStatus === 'complete') {
                        statusBadgeColor = '#2563EB';
                        statusBadgeBg = '#DBEAFE';
                      // Removed: pending status check - projects now go directly to ongoing
                    } else if (false) { // Removed pending check
                        statusBadgeColor = '#F59E0B';
                        statusBadgeBg = '#FEF3C7';
                      }
                      
                      // Milestone status badge colors
                      let milestoneStatusBadgeColor = '#6B7280';
                      let milestoneStatusBadgeBg = '#F3F4F6';
                      if (isMilestone && milestoneStatus) {
                        if (milestoneStatus === 'completed' || milestoneStatus === 'complete') {
                          milestoneStatusBadgeColor = '#059669';
                          milestoneStatusBadgeBg = '#D1FAE5';
                        } else if (milestoneStatus === 'approved' || milestoneStatus === 'iu_approved' || milestoneStatus === 'secretariat_approved') {
                          milestoneStatusBadgeColor = '#059669';
                          milestoneStatusBadgeBg = '#D1FAE5';
                        } else if (milestoneStatus === 'pending') {
                          milestoneStatusBadgeColor = '#F59E0B';
                          milestoneStatusBadgeBg = '#FEF3C7';
                        } else if (milestoneStatus === 'delayed') {
                          milestoneStatusBadgeColor = '#DC2626';
                          milestoneStatusBadgeBg = '#FEE2E2';
                        }
                      }
                      
                      const statusText = projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1);
                      const milestoneStatusText = isMilestone && milestoneStatus ? milestoneStatus.charAt(0).toUpperCase() + milestoneStatus.slice(1).replace('_', ' ') : null;
                      const eventDate = new Date(event.date);
                      const formattedDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      
                      eventDetails = (
                        <div className="space-y-2 text-xs">
                          {isMilestone && projectTitle && <div className="font-bold text-gray-900">{projectTitle}</div>}
                          <div className="font-semibold text-gray-800">{projectName}</div>
                          <div className="space-y-1 text-gray-600">
                            <div><span className="font-medium">Type:</span> <span className="text-blue-600">{eventTypeLabel}</span></div>
                            {projectCode && <div><span className="font-medium">Project Code:</span> {projectCode}</div>}
                            {implementingOffice && implementingOffice !== 'N/A' && (
                              <div className="flex items-center gap-2">
                                {implementingOfficePic && (
                                  <img src={implementingOfficePic} alt={implementingOffice} className="w-5 h-5 rounded-full object-cover border border-gray-300" onError={(e) => e.target.style.display = 'none'} />
                                )}
                                <span>{implementingOffice}</span>
                              </div>
                            )}
                            {eiuPartner && (
                              <div className="flex items-center gap-2">
                                {eiuPartnerPic && (
                                  <img src={eiuPartnerPic} alt={eiuPartner} className="w-5 h-5 rounded-full object-cover border border-gray-300" onError={(e) => e.target.style.display = 'none'} />
                                )}
                                <span>{eiuPartner}</span>
                              </div>
                            )}
                            {isMilestone && milestoneStatus ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold`} style={{ color: milestoneStatusBadgeColor, backgroundColor: milestoneStatusBadgeBg }}>
                                  {milestoneStatusText}
                                </span>
                                {milestoneProgress !== null && <span className="font-medium">{milestoneProgress}</span>}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold`} style={{ color: statusBadgeColor, backgroundColor: statusBadgeBg }}>
                                  {statusText}
                                </span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                            )}
                            {isMilestone && formattedMilestonePlannedBudget && <div><span className="font-medium">Milestone Planned Budget:</span> {formattedMilestonePlannedBudget}</div>}
                            {isMilestone && formattedMilestoneUsedBudget && <div><span className="font-medium">Milestone Used Budget:</span> {formattedMilestoneUsedBudget}</div>}
                            {location && <div><span className="font-medium">Location:</span> {location}</div>}
                            {category && <div><span className="font-medium">Category:</span> {category}</div>}
                            {formattedBudget && <div><span className="font-medium">Project Budget:</span> {formattedBudget}</div>}
                            <div><span className="font-medium">Date:</span> {formattedDate}</div>
                            <div><span className="font-medium">Time:</span> {event.time}</div>
                            <div><span className="font-medium">Priority:</span> <span className="text-red-600 font-semibold">{event.priority || 'High'}</span></div>
                          </div>
                        </div>
                      );
                    } else if (event.type === 'announcement') {
                      const isRead = event.isRead || false;
                      const creatorName = event.creatorName || 'System Administrator';
                      const creatorPic = formatProfilePic(event.creatorPicture);
                      const announcementType = event.announcementType || null;
                      const targetAudience = event.targetAudience || null;
                      const content = event.content || null;
                      const contentPreview = content ? content.replace(/<[^>]*>/g, '').substring(0, 100) + (content.length > 100 ? '...' : '') : null;
                      const eventDate = new Date(event.date);
                      const formattedDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      
                      eventDetails = (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-gray-800">{event.title}</div>
                            {isRead ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <span className="text-xs">✓</span>
                                <span className="text-[9px]">Read</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-[9px] text-orange-600 font-semibold">Unread</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 text-gray-600">
                            <div><span className="font-medium">Type:</span> <span className="text-orange-600">Announcement</span></div>
                            {announcementType && <div><span className="font-medium">Announcement Type:</span> {announcementType}</div>}
                            <div className="flex items-center gap-2">
                              {creatorPic && (
                                <img src={creatorPic} alt={creatorName} className="w-5 h-5 rounded-full object-cover border border-gray-300" onError={(e) => e.target.style.display = 'none'} />
                              )}
                              <span><span className="font-medium">Published by:</span> {creatorName}</span>
                            </div>
                            {targetAudience && <div><span className="font-medium">Target Audience:</span> {targetAudience}</div>}
                            {contentPreview && <div><span className="font-medium">Content:</span> {contentPreview}</div>}
                            <div><span className="font-medium">Date:</span> {formattedDate}</div>
                            <div><span className="font-medium">Time:</span> {event.time}</div>
                            <div><span className="font-medium">Priority:</span> <span className="text-orange-600 font-semibold">{event.priority || 'Medium'}</span></div>
                          </div>
                        </div>
                      );
                    } else {
                      // Default for coordination events
                      eventDetails = (
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold text-gray-800">{event.title}</div>
                          <div className="text-gray-600">
                            <div><span className="font-medium">Type:</span> {event.eventType || 'Event'}</div>
                            <div><span className="font-medium">Time:</span> {event.time}</div>
                            <div><span className="font-medium">Priority:</span> <span className={`font-semibold ${priorityColors[event.priority] || priorityColors.medium}`}>{event.priority || 'Medium'}</span></div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={index} className="text-xs p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {eventDetails || (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-800">{event.title}</span>
                                  {event.type && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[event.type] || typeColors.other}`}>
                                      {event.type === 'coordination' ? (event.eventType || 'event').replace('_', ' ') : event.type}
                                    </span>
                                  )}
                                  {event.priority && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[event.priority] || priorityColors.medium}`}>
                                      {event.priority}
                                    </span>
                                  )}
                                </div>
                                {event.time && (
                                  <span className="text-gray-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    {event.time}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Logs Overview - Only for System Admin */}
        {isSystemAdmin && (
          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">User Logs Overview</h3>
              <a 
                href="/dashboard/sysadmin/modules/user-logs"
                className={`px-4 py-2 ${currentTheme.button} text-white rounded-lg transition-all duration-200 hover:opacity-90 text-sm font-medium flex items-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                View All
              </a>
            </div>
            
            {userLogsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Activities</p>
                        <p className="text-2xl font-bold text-blue-800">{userLogsSummary.totalActivities.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-blue-200 rounded-lg">
                        <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Today's Activities</p>
                        <p className="text-2xl font-bold text-green-800">{userLogsSummary.todayActivities.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-green-200 rounded-lg">
                        <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Failed Logins</p>
                        <p className="text-2xl font-bold text-red-800">{userLogsSummary.failedLogins.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-red-200 rounded-lg">
                        <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Active Users</p>
                        <p className="text-2xl font-bold text-purple-800">{userLogsSummary.activeUsers.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-purple-200 rounded-lg">
                        <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Active Users List */}
                {userLogsSummary.activeUsersList && userLogsSummary.activeUsersList.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recently Active Users</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userLogsSummary.activeUsersList.slice(0, 5).map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.userId ? user.userId.charAt(0) : 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{user.name || user.userId || 'Unknown User'}</p>
                              <p className="text-xs text-gray-500">{user.role || 'N/A'}</p>
                            </div>
                          </div>
                          <span className="text-xs text-green-600 font-medium">Active</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Heatmap + Municipality Map - Only for non-System Admin */}
        {!isSystemAdmin && (
          <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300 relative z-0`}>
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Project Map - Santa Cruz, Laguna</h3>
            <div className={`map-container rounded-lg relative overflow-hidden border-2 border-gray-200 ${showFullMapModal ? 'hidden' : ''}`} style={{ position: 'relative', zIndex: 1, isolation: 'isolate' }}>
              <CentralizedProjectMap
                projects={projects}
                mapId="dashboard-mini-map"
                height={320}
                zoom={12}
                showLegend={false}
                showViewSelector={false}
                fitBounds={true}
                scrollWheelZoom={false}
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm mb-4">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Total Projects: <span className="font-semibold">{projects.length}</span></span>
                <span className="text-gray-600">With Location: <span className="font-semibold">{projects.filter(p => p.latitude && p.longitude).length}</span></span>
              </div>
              <button 
                onClick={() => setShowFullMapModal(true)}
                className={`${currentTheme.accent} font-medium hover:opacity-80 transition-opacity flex items-center gap-1`}
              >
                <span>View Full Map</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
            
            {/* Project List Below Map */}
            {projects.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  Projects ({projects.length})
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {projects.map((project) => {
                    const getStatusColor = (status) => {
                      // Normalize status - convert pending to ongoing
                      const normalizedStatus = (status === 'pending' || status === 'Pending' || status === 'PENDING') 
                        ? 'ongoing' 
                        : (status?.toLowerCase() || 'ongoing');
                      
                      switch (normalizedStatus) {
                        case 'ongoing': return 'bg-blue-100 text-blue-800'; // Blue theme for ongoing
                        case 'completed': 
                        case 'complete': return 'bg-green-100 text-green-800'; // Green theme for completed
                        case 'delayed': return 'bg-red-100 text-red-800'; // Red theme for delayed
                        case 'on hold': return 'bg-orange-100 text-orange-800';
                        default: return 'bg-blue-100 text-blue-800'; // Default to ongoing (blue)
                      }
                    };
                    
                    const formatBudget = (amount) => {
                      if (!amount) return 'N/A';
                      const num = parseFloat(amount);
                      if (isNaN(num)) return 'N/A';
                      if (num >= 1000000) {
                        return `₱${(num / 1000000).toFixed(1)}M`;
                      } else if (num >= 1000) {
                        return `₱${(num / 1000).toFixed(0)}K`;
                      }
                      return `₱${num.toLocaleString()}`;
                    };
                    
                    return (
                      <div 
                        key={project.id} 
                        className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="text-base font-bold text-gray-900 truncate">
                                {project.name || project.projectName || 'Unnamed Project'}
                              </h5>
                              {(() => {
                                // Normalize status - convert pending to ongoing
                                const normalizedStatus = (project.status === 'pending' || project.status === 'Pending' || project.status === 'PENDING') 
                                  ? 'ongoing' 
                                  : (project.status || 'ongoing');
                                return (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(normalizedStatus)}`}>
                                    {normalizedStatus}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Code:</span>
                                <span className="ml-1 font-semibold text-gray-700">{project.projectCode || project.code || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Location:</span>
                                <span className="ml-1 font-semibold text-gray-700">{project.location || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Budget:</span>
                                <span className="ml-1 font-semibold text-gray-700">{formatBudget(project.budget || project.totalBudget)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Progress:</span>
                                <span className="ml-1 font-semibold text-gray-700">
                                  {(parseFloat(project.overallProgress) || parseFloat(project.progress) || 0).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {project.description && (
                              <p className="text-xs text-gray-600 mt-2 line-clamp-2">{project.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Announcement Overview & System Health Overview - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Announcement Overview - Left */}
        <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300 overflow-hidden`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${currentTheme.primary} rounded-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Announcement Overview</h3>
            </div>
            <a 
              href={currentRole === 'EIU' ? '/dashboard/eiu/modules/announcements' :
                    currentRole === 'LGU-IU' || currentRole === 'IU' ? '/dashboard/iu-implementing-office/modules/announcements' :
                    currentRole === 'LGU-PMT' && userData?.subRole?.includes('Secretariat') ? '/dashboard/lgu-pmt-mpmec-secretariat/modules/announcements' :
                    currentRole === 'LGU-PMT' ? '/dashboard/lgu-pmt-mpmec/modules/announcements' :
                    currentRole === 'EMS' ? '/dashboard/executive-viewer/modules/announcements' :
                    '/dashboard/sysadmin/modules/announcements'}
              className={`text-sm ${currentTheme.accent} hover:opacity-80 transition-opacity font-medium flex items-center gap-1`}
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
          
          <div className="h-80 relative overflow-hidden">
            {announcements.length > 0 ? (
              <>
                {/* Slideshow Container */}
                <div className="relative h-full">
                  {announcements.slice(0, 5).filter(ann => ann && ann.id).map((announcement, index) => {
                    // Safety check: ensure announcement has required properties
                    if (!announcement || !announcement.id) return null;
                    
                    const creatorRole = announcement.creator?.role || 'SYS.AD';
                    const creatorTheme = getThemeByRole(creatorRole);
                    const creatorThemeColors = themes[creatorTheme] || themes.blue;
                    const isActive = index === announcementSlideIndex;
                    
                    return (
                      <div
                        key={announcement.id}
                        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                          isActive 
                            ? 'opacity-100 translate-x-0' 
                            : index < announcementSlideIndex
                            ? 'opacity-0 -translate-x-full'
                            : 'opacity-0 translate-x-full'
                        }`}
                      >
                        {/* Announcement Card - Matching AnnouncementCenter design */}
                        <div className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl border-2 ${creatorThemeColors.border} bg-white h-full flex flex-col`}>
                          {/* Banner Header with Gradient */}
                          <div className={`relative h-28 bg-gradient-to-r ${creatorThemeColors.gradient} flex-shrink-0`}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <div className="absolute top-4 left-6 right-6 z-10">
                              {/* Title and Publisher Row */}
                              <div className="flex items-center gap-3 mb-2">
                                {/* Profile Picture */}
                                {announcement.creator?.profilePictureUrl ? (
                                  <img 
                                    src={announcement.creator.profilePictureUrl} 
                                    alt={announcement.creator.name || 'Publisher'}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-md"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) {
                                        e.target.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 shadow-md flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                  </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-xl font-bold text-white mb-1 truncate">
                                    {announcement.title}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-white">
                                      {announcement.creator 
                                        ? getPublisherLabel(announcement.creator.role, announcement.creator.name || announcement.creator.email)
                                        : 'Unknown Publisher'}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {announcement.isPinned && (
                                    <span className="text-yellow-300 text-xl" title="Pinned">📌</span>
                                  )}
                                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                                    {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                            {/* Publish Date */}
                            <div className="mb-4 flex items-center gap-2 text-sm">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                              <span className="text-gray-500">
                                {(() => {
                                  try {
                                    return announcement.publishDate ? formatDate(announcement.publishDate) : 'N/A';
                                  } catch (error) {
                                    console.error('Error formatting publishDate:', error, announcement.publishDate);
                                    return 'N/A';
                                  }
                                })()}
                              </span>
                            </div>

                            {/* Content Preview */}
                            {announcement.contentHtml ? (
                              <div 
                                className="text-gray-700 mb-4 leading-relaxed prose prose-sm max-w-none line-clamp-4 flex-1"
                                dangerouslySetInnerHTML={{ __html: announcement.contentHtml.substring(0, 300) + (announcement.contentHtml.length > 300 ? '...' : '') }}
                              />
                            ) : (
                              <p className="text-gray-700 mb-4 leading-relaxed line-clamp-4 flex-1">
                                {announcement.content?.substring(0, 300) || 'No content available'}{announcement.content && announcement.content.length > 300 ? '...' : ''}
                              </p>
                            )}

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm mt-auto">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                                  {announcement.announcementType ? announcement.announcementType.replace('_', ' ') : 'general'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                  {announcement.targetAudience}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <span>{announcement.views || 0} views</span>
                              </div>
                              {announcement.attachments && announcement.attachments.length > 0 && (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                  </svg>
                                  <span>{announcement.attachments.length} attachment(s)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Dots */}
                {announcements.filter(ann => ann && ann.id).length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    {announcements.slice(0, 5).filter(ann => ann && ann.id).map((_, index) => {
                      const validAnnouncements = announcements.filter(ann => ann && ann.id);
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (announcementSlideIntervalRef.current) {
                              clearInterval(announcementSlideIntervalRef.current);
                            }
                            setAnnouncementSlideIndex(index);
                            // Restart auto-advance
                            announcementSlideIntervalRef.current = setInterval(() => {
                              setAnnouncementSlideIndex((prevIndex) => 
                                (prevIndex + 1) % validAnnouncements.length
                              );
                            }, 5000);
                          }}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === announcementSlideIndex 
                              ? `${currentTheme.primary} w-6` 
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Navigation Arrows */}
                {(() => {
                  const validAnnouncements = announcements.filter(ann => ann && ann.id);
                  if (validAnnouncements.length <= 1) return null;
                  
                  return (
                    <>
                      <button
                        onClick={() => {
                          if (announcementSlideIntervalRef.current) {
                            clearInterval(announcementSlideIntervalRef.current);
                          }
                          setAnnouncementSlideIndex((prevIndex) => 
                            prevIndex === 0 ? validAnnouncements.length - 1 : prevIndex - 1
                          );
                          // Restart auto-advance
                          announcementSlideIntervalRef.current = setInterval(() => {
                            setAnnouncementSlideIndex((prevIndex) => 
                              (prevIndex + 1) % validAnnouncements.length
                            );
                          }, 5000);
                        }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                        aria-label="Previous announcement"
                      >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (announcementSlideIntervalRef.current) {
                            clearInterval(announcementSlideIntervalRef.current);
                          }
                          setAnnouncementSlideIndex((prevIndex) => 
                            (prevIndex + 1) % validAnnouncements.length
                          );
                          // Restart auto-advance
                          announcementSlideIntervalRef.current = setInterval(() => {
                            setAnnouncementSlideIndex((prevIndex) => 
                              (prevIndex + 1) % validAnnouncements.length
                            );
                          }, 5000);
                        }}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                        aria-label="Next announcement"
                      >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className={`p-4 ${currentTheme.primaryLight} rounded-full mb-4`}>
                  <svg className={`w-12 h-12 ${currentTheme.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No announcements available</p>
                <p className="text-sm text-gray-400 mt-1">Check back later for updates</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health Overview - Right */}
        <div className={`bg-white rounded-2xl shadow-lg border ${currentTheme.border} p-6 ${currentTheme.cardHover} transition-all duration-300 overflow-hidden`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${currentTheme.primary} rounded-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">System Health Overview</h3>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 font-medium">Live</span>
              </div>
            </div>
            <a 
              href={currentRole === 'EIU' ? '/dashboard/eiu/modules/system-health' :
                    currentRole === 'LGU-IU' || currentRole === 'IU' ? '/dashboard/iu-implementing-office/modules/system-health' :
                    currentRole === 'LGU-PMT' && userData?.subRole?.includes('Secretariat') ? '/dashboard/lgu-pmt-mpmec-secretariat/modules/system-health' :
                    currentRole === 'LGU-PMT' ? '/dashboard/lgu-pmt-mpmec/modules/system-health' :
                    currentRole === 'EMS' ? '/dashboard/executive-viewer/modules/system-health' :
                    '/dashboard/sysadmin/modules/system-health'}
              className={`text-sm ${currentTheme.accent} hover:opacity-80 transition-opacity font-medium flex items-center gap-1`}
            >
              View Details
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
          
          <div className="h-80 overflow-y-auto pr-2">
            {systemHealth ? (
              <div className="space-y-4">
                {/* Overall Status */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Overall Status</span>
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                      systemHealth.overallStatus === 'Healthy' ? 'bg-green-500 text-white' :
                      systemHealth.overallStatus === 'Warning' ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {systemHealth.overallStatus || 'Healthy'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      systemHealth.overallStatus === 'Healthy' ? 'bg-green-500 animate-pulse' :
                      systemHealth.overallStatus === 'Warning' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500 animate-pulse'
                    }`}></div>
                    <span className="text-xs text-gray-600">All systems operational</span>
                  </div>
                </div>

                {/* Uptime */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span className="text-sm font-semibold text-gray-700">Uptime</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{systemHealth.uptime || '99.9%'}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-3 overflow-hidden">
                    <div 
                      key={`uptime-${systemHealth.uptime}`}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: '99.9%' }}
                    ></div>
                  </div>
                </div>

                {/* CPU Usage */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                      </svg>
                      <span className="text-sm font-semibold text-gray-700">CPU Usage</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">{systemHealth.cpuUsage || 0}%</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 mt-3 overflow-hidden">
                    <div 
                      key={`cpu-${systemHealth.cpuUsage}`}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(systemHealth.cpuUsage || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="bg-gradient-to-br from-cyan-50 to-teal-50 p-5 rounded-xl border border-cyan-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                      </svg>
                      <span className="text-sm font-semibold text-gray-700">Memory Usage</span>
                    </div>
                    <span className="text-2xl font-bold text-cyan-600">{systemHealth.memoryUsage || 0}%</span>
                  </div>
                  <div className="w-full bg-cyan-200 rounded-full h-2 mt-3 overflow-hidden">
                    <div 
                      key={`memory-${systemHealth.memoryUsage}`}
                      className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(systemHealth.memoryUsage || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className={`p-4 ${currentTheme.primaryLight} rounded-full mb-4`}>
                  <svg className={`w-12 h-12 ${currentTheme.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">System health data unavailable</p>
                <p className="text-sm text-gray-400 mt-1">Please check back later</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`p-6 border-b ${currentTheme.border}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">Add Calendar Event</h3>
                <button
                  onClick={() => setShowAddEventModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter event title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter event description"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newEvent.eventType}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, eventType: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="field_inspection">Field Inspection</option>
                    <option value="deadline">Deadline</option>
                    <option value="training">Training</option>
                    <option value="review">Review</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter event location"
                />
              </div>
              
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvent}
                  className={`px-6 py-2 ${currentTheme.button} text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmittingEvent ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Map Modal */}
      {showFullMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm" onClick={() => setShowFullMapModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] m-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${currentTheme.primary} rounded-lg`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Project Map - Santa Cruz, Laguna</h3>
                  <p className="text-sm text-gray-600">Interactive map showing all project locations</p>
                </div>
              </div>
              <button
                onClick={() => setShowFullMapModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative overflow-hidden" style={{ position: 'relative', zIndex: 1, isolation: 'isolate', overflow: 'hidden' }}>
              <CentralizedProjectMap
                projects={projects}
                mapId="dashboard-full-map"
                height={600}
                zoom={11}
                showLegend={true}
                showViewSelector={true}
                fitBounds={true}
                scrollWheelZoom={true}
              />
              
              {/* Project Stats */}
              <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-lg z-10">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total Projects:</span>
                    <span className="font-semibold text-gray-800">{projects.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Displayed:</span>
                    <span className="font-semibold text-gray-800">{projects.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>All projects shown (coordinates generated if needed)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Add CSS for budget progress bar animation
if (typeof document !== 'undefined') {
  const styleId = 'dashboard-budget-progress-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .budget-progress-bar-fill {
        transform-origin: left;
        animation: fillBudgetProgress 2s ease-out forwards;
      }
      
      @keyframes fillBudgetProgress {
        from {
          width: 0%;
        }
        to {
          width: var(--progress-width);
        }
      }
    `;
    document.head.appendChild(style);
  }
}


import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}:3000/api`)
  : 'http://localhost:3000/api';

// Get auth token
const getToken = () => {
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
    const token = tokenCookie ? tokenCookie.split('=')[1] : null;
    
    if (!token && typeof localStorage !== 'undefined') {
      const localToken = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (localToken) {
        return localToken;
      }
    }
    
    return token;
  }
  return null;
};

// Profile Picture Image Component
function ProfilePictureImage({ userId, url, alt, className = "w-full h-full object-cover", onError }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let blobUrl = null;

    const loadImage = async () => {
      setLoading(true);
      setError(false);
      
      try {
        if (url && (url.startsWith('data:') || url.startsWith('blob:'))) {
          setImgSrc(url);
          setLoading(false);
          return;
        }

        if (!url) {
          setError(true);
          setLoading(false);
          return;
        }

        // Try to fetch from API endpoint
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (response.ok) {
            const blob = await response.blob();
            blobUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setImgSrc(blobUrl);
              setLoading(false);
            }
          } else {
            throw new Error('Failed to load image');
          }
        } catch (fetchError) {
          // If fetch fails, try using URL directly
          if (isMounted) {
            setImgSrc(url);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error loading profile picture:', error);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url]);

  if (error || !imgSrc) {
    return null; // Let fallback show
  }

  return (
    <img
      ref={imgRef}
      src={imgSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        setError(true);
        if (onError) onError(e);
      }}
      style={{ display: loading ? 'none' : 'block' }}
    />
  );
}

export default function ProfileCenter({ 
  theme = 'green', // 'green', 'orange', 'blue', 'black', 'light-blue'
  userRole = null, // Auto-detect from user data
  title = null, // Custom title, auto-generated if null
  subtitle = null // Custom subtitle, auto-generated if null
}) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const fileInputRef = useRef(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    contactNumber: '',
    birthdate: ''
  });
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'activity', 'statistics', 'security'
  const [profileCompletion, setProfileCompletion] = useState({ percentage: 0, missingFields: [] });
  const [activityHistory, setActivityHistory] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState({ show: false, message: '' });
  const [showSuccessModal, setShowSuccessModal] = useState({ show: false, message: '' });
  const [showImageModal, setShowImageModal] = useState(false);
  const [progressBarAnimated, setProgressBarAnimated] = useState(false);

  // Theme configurations - matching AnnouncementCenter.jsx style
  const themes = {
    green: {
      primary: 'bg-green-600',
      primaryHover: 'hover:bg-green-700',
      primaryLight: 'bg-green-50',
      accent: 'text-green-600',
      border: 'border-green-200',
      infoField: 'from-green-50 to-green-100 border-green-200',
      profileBorder: 'border-green-600',
      gradient: 'from-green-600 to-green-500',
      gradientHover: 'hover:from-green-700 hover:to-green-600',
      gradientText: 'from-green-600 to-green-500',
      gradientIcon: 'from-green-600 to-green-500',
      borderHover: 'border-green-600/20',
      hoverShine: 'rgba(34, 197, 94, 0.08)', // green-600 with opacity
      hoverBorder: 'rgba(34, 197, 94, 0.2)', // green-600 with opacity
      hoverShineLight: 'rgba(34, 197, 94, 0.05)' // green-600 with lower opacity
    },
    orange: {
      primary: 'bg-orange-600',
      primaryHover: 'hover:bg-orange-700',
      primaryLight: 'bg-orange-50',
      accent: 'text-orange-600',
      border: 'border-orange-200',
      infoField: 'from-amber-50 to-amber-100 border-amber-200',
      profileBorder: 'border-orange-600',
      gradient: 'from-orange-600 to-orange-500',
      gradientHover: 'hover:from-orange-700 hover:to-orange-600',
      gradientText: 'from-orange-600 to-orange-500',
      gradientIcon: 'from-orange-600 to-orange-500',
      borderHover: 'border-orange-600/20',
      hoverShine: 'rgba(234, 88, 12, 0.08)', // orange-600 with opacity
      hoverBorder: 'rgba(234, 88, 12, 0.2)', // orange-600 with opacity
      hoverShineLight: 'rgba(234, 88, 12, 0.05)' // orange-600 with lower opacity
    },
    blue: {
      primary: 'bg-blue-600',
      primaryHover: 'hover:bg-blue-700',
      primaryLight: 'bg-blue-50',
      accent: 'text-blue-600',
      border: 'border-blue-200',
      infoField: 'from-blue-50 to-blue-100 border-blue-200',
      profileBorder: 'border-blue-600',
      gradient: 'from-blue-600 to-blue-500',
      gradientHover: 'hover:from-blue-700 hover:to-blue-600',
      gradientText: 'from-blue-600 to-blue-500',
      gradientIcon: 'from-blue-600 to-blue-500',
      borderHover: 'border-blue-600/20',
      hoverShine: 'rgba(37, 99, 235, 0.08)', // blue-600 with opacity
      hoverBorder: 'rgba(37, 99, 235, 0.2)', // blue-600 with opacity
      hoverShineLight: 'rgba(37, 99, 235, 0.05)' // blue-600 with lower opacity
    },
    black: {
      primary: 'bg-gray-900',
      primaryHover: 'hover:bg-black',
      primaryLight: 'bg-gray-50',
      accent: 'text-gray-900',
      border: 'border-gray-200',
      infoField: 'from-gray-50 to-gray-100 border-gray-200',
      profileBorder: 'border-gray-900',
      gradient: 'from-black to-gray-800',
      gradientHover: 'hover:from-gray-900 hover:to-black',
      gradientText: 'from-black to-gray-600',
      gradientIcon: 'from-black to-gray-800',
      borderHover: 'border-black/20',
      hoverShine: 'rgba(0, 0, 0, 0.08)', // black with opacity
      hoverBorder: 'rgba(0, 0, 0, 0.2)', // black with opacity
      hoverShineLight: 'rgba(0, 0, 0, 0.05)' // black with lower opacity
    },
    'light-blue': {
      primary: 'bg-sky-600',
      primaryHover: 'hover:bg-sky-700',
      primaryLight: 'bg-sky-50',
      accent: 'text-sky-600',
      border: 'border-sky-200',
      infoField: 'from-sky-50 to-sky-100 border-sky-200',
      profileBorder: 'border-sky-600',
      gradient: 'from-sky-600 to-sky-500',
      gradientHover: 'hover:from-sky-700 hover:to-sky-600',
      gradientText: 'from-sky-600 to-sky-500',
      gradientIcon: 'from-sky-600 to-sky-500',
      borderHover: 'border-sky-600/20',
      hoverShine: 'rgba(2, 132, 199, 0.08)', // sky-600 with opacity
      hoverBorder: 'rgba(2, 132, 199, 0.2)', // sky-600 with opacity
      hoverShineLight: 'rgba(2, 132, 199, 0.05)' // sky-600 with lower opacity
    }
  };

  const currentTheme = themes[theme] || themes.green;

  // Role-specific configurations
  const roleConfigs = {
    'LGU-IU': {
      title: 'LGU-IU Profile',
      subtitle: 'Implementing Office Officer Account Management',
      roleLabel: 'LGU-IU Member',
      positionLabel: 'Implementing Office Officer',
      infoSections: ['Personal Information', 'LGU-IU Information']
    },
    'LGU-PMT': {
      title: 'Committee Profile',
      subtitle: 'MPMEC Committee Management & Profile Settings',
      roleLabel: 'MPMEC Member',
      positionLabel: 'LGU - Project Monitoring Team',
      infoSections: ['Personal Information', 'Committee Information']
    },
    'MPMEC Secretariat': {
      title: 'Secretariat Profile',
      subtitle: 'MPMEC Secretariat Account Management',
      roleLabel: 'MPMEC Secretariat',
      positionLabel: 'LGU - Project Monitoring Team',
      infoSections: ['Personal Information', 'Secretariat Information']
    },
    'EIU': {
      title: 'EIU Profile',
      subtitle: 'External Implementing Unit Account Management',
      roleLabel: 'EIU Member',
      positionLabel: 'External Partner',
      infoSections: ['Personal Information', 'EIU Information']
    },
    'SYS.AD': {
      title: 'My Profile',
      subtitle: 'System Administrator Account Management',
      roleLabel: 'System Administrator',
      positionLabel: 'Information Technology',
      infoSections: ['Personal Information', 'System Statistics', 'Permissions & Access Control']
    },
    'Executive Viewer': {
      title: 'Executive Viewer Profile',
      subtitle: 'Executive Oversight Account Management',
      roleLabel: 'Executive Viewer',
      positionLabel: 'Executive Oversight Officer',
      infoSections: ['Personal Information', 'Executive Information']
    }
  };

  // Define functions first
  const loadProfileCompletion = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/auth/profile/completion`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProfileCompletion(response.data.completion);
        // Trigger progress bar animation
        setProgressBarAnimated(false);
        setTimeout(() => {
          setProgressBarAnimated(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error loading profile completion:', error);
      // Set default completion if API fails
      setProfileCompletion({ percentage: 0, missingFields: [] });
      setProgressBarAnimated(false);
    }
  };

  const loadActivityHistory = async () => {
    try {
      setLoadingActivity(true);
      const token = getToken();
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/auth/profile/activity?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setActivityHistory(response.data.activities);
      }
    } catch (error) {
      console.error('Error loading activity history:', error);
      setActivityHistory([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoadingStats(true);
      const token = getToken();
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/auth/profile/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      setStatistics(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.user) {
        const user = response.data.user;
        setUserData(user);
        setEditFormData({
          fullName: user.fullName || user.name || '',
          contactNumber: user.contactNumber || '',
          birthdate: user.birthdate || ''
        });
        
        // Load profile picture
        if (user.profilePictureUrl) {
          setProfilePicturePreview(user.profilePictureUrl);
        } else {
          // Try to load from profile picture API
          const userId = user.employeeId || user.username || user.id || user.userId;
          if (userId) {
            loadProfilePicture(userId);
          }
        }

        // Update last updated time
        setLastUpdated(new Date());
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfilePicture = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/profile/picture/${userId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profilePictureUrl) {
          setProfilePicturePreview(data.profilePictureUrl);
        }
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setShowWarningModal({ show: true, message: 'File must be less than 10 mb' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setShowWarningModal({ show: true, message: 'Please select an image file' });
      return;
    }

    setProfilePicture(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePicturePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = getToken();
      
      // Update profile data
      const updateData = {
        fullName: editFormData.fullName,
        contactNumber: editFormData.contactNumber,
        birthdate: editFormData.birthdate
      };

      const response = await axios.put(`${API_URL}/auth/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Upload profile picture if selected
        if (profilePicture) {
          await uploadProfilePicture();
        }

        // Reload user data and completion
        await loadUserProfile();
        await loadProfileCompletion();
        setEditing(false);
        setShowSuccessModal({ show: true, message: 'Profile updated successfully!' });
      } else {
        setShowWarningModal({ show: true, message: 'Failed to update profile: ' + (response.data.error || 'Unknown error') });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setShowWarningModal({ show: true, message: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const uploadProfilePicture = async () => {
    try {
      const token = getToken();
      const userId = userData?.employeeId || userData?.username || userData?.id || userData?.userId;
      
      if (!userId) {
        console.error('No user ID found for profile picture upload');
        return;
      }

      const formData = new FormData();
      formData.append('profilePicture', profilePicture);
      formData.append('userId', userId);

      const response = await axios.post(`${API_URL}/profile/upload-picture`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const newProfilePictureUrl = response.data.profilePictureUrl;
        setProfilePicturePreview(newProfilePictureUrl);
        
        // CRITICAL: Prefer HTTP URL over base64 data URL for consistency
        // The server returns the URL, which should be HTTP, not base64
        let urlToStore = newProfilePictureUrl;
        
        // If the response has a base64 but we should use HTTP URL, extract it
        // The profilePictureUrl from response should be the HTTP URL
        if (newProfilePictureUrl.startsWith('data:')) {
          // If it's base64, we might need to use the HTTP URL from the response
          // Check if response has an alternative URL
          if (response.data.url && response.data.url.startsWith('http')) {
            urlToStore = response.data.url;
          } else if (response.data.profilePictureUrl && response.data.profilePictureUrl.startsWith('http')) {
            urlToStore = response.data.profilePictureUrl;
          }
        }
        
        // Update localStorage for immediate access
        const rolePrefix = userData?.role === 'LGU-IU' ? 'iu' :
                          userData?.role === 'LGU-PMT' || userData?.role === 'MPMEC Secretariat' ? 'lgu_pmt' :
                          userData?.role === 'EIU' ? 'eiu' :
                          userData?.role === 'SYS.AD' ? 'sysadmin' :
                          userData?.role === 'Executive Viewer' ? 'executive' : 'secretariat';
        
        // Update user data in localStorage with the HTTP URL
        const updatedUser = { ...userData, profilePictureUrl: urlToStore };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        
        // Store in both keys for LGU-IU to ensure consistency
        localStorage.setItem(`${rolePrefix}_profile_picture`, urlToStore);
        if (userData?.role === 'LGU-IU' || userData?.role === 'IU') {
          localStorage.setItem('lgu_iu_profile_picture', urlToStore);
          
          // CRITICAL: Dispatch a custom storage event for cross-tab communication
          // This ensures user-management page receives the update even if it's in another tab
          window.dispatchEvent(new CustomEvent('profilePictureStorageUpdated', {
            detail: {
              profilePictureUrl: urlToStore,
              userId: updatedUser.userId || updatedUser.id,
              userData: updatedUser,
              role: 'LGU-IU'
            }
          }));
          console.log('✅ Dispatched profilePictureStorageUpdated event for cross-tab communication');
        }
        
        // Reload user profile and completion to reflect the new profile picture
        // Wait for database transaction to commit, then reload
        setTimeout(async () => {
          // Reload user profile first to get latest data from database
          await loadUserProfile();
          // Wait a bit more for completion check
          setTimeout(async () => {
            await loadProfileCompletion();
            // Double-check completion after another short delay
            setTimeout(() => {
              loadProfileCompletion();
            }, 1000);
          }, 800);
        }, 1500);
        
        // Dispatch comprehensive event for other components to update
        // Use the normalized URL (HTTP URL preferred)
        // CRITICAL: Use updatedUser.userId (like LGU-IU-0001) instead of computed userId
        const eventUserId = updatedUser.userId || updatedUser.id || userId;
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: { 
            profilePictureUrl: urlToStore,
            userId: eventUserId,
            userData: updatedUser
          }
        }));
        console.log('✅ Generic profilePictureUpdated event dispatched with userId:', eventUserId);
        
        // Dispatch role-specific events for better component targeting
        if (userData?.role === 'SYS.AD' || userData?.role === 'System Administrator') {
          // System Admin specific event
          window.dispatchEvent(new CustomEvent('sysadminProfilePictureUpdated', {
            detail: { 
              profilePictureUrl: newProfilePictureUrl,
              userId: userId,
              userData: updatedUser
            }
          }));
          
          // Also notify the ProfilePictureManager if it exists
          if (window.profilePictureManager && typeof window.profilePictureManager.setProfilePicture === 'function') {
            window.profilePictureManager.setProfilePicture(newProfilePictureUrl);
            console.log('✅ Notified ProfilePictureManager of new profile picture');
          }
          
          console.log('✅ System Admin profile picture event dispatched');
        } else if (userData?.role === 'EIU') {
          // CRITICAL: Ensure userId is the correct format (userId from userData, like EIU-0001)
          const correctUserId = updatedUser.userId || updatedUser.id || userId;
          
          window.dispatchEvent(new CustomEvent('eiuProfilePictureUpdated', {
            detail: { 
              profilePictureUrl: urlToStore, // Use urlToStore (HTTP URL) instead of newProfilePictureUrl
              userId: correctUserId, // Use correct userId (EIU-0001) instead of computed userId
              userData: updatedUser
            }
          }));
          
          // Also notify the EIU ProfilePictureManager if it exists
          if (window.eiuProfilePictureManager && typeof window.eiuProfilePictureManager.setProfilePicture === 'function') {
            window.eiuProfilePictureManager.setProfilePicture(urlToStore);
            console.log('✅ Notified EIU ProfilePictureManager of new profile picture');
          }
          
          console.log('✅ EIU profile picture event dispatched with userId:', correctUserId);
        } else if (userData?.role === 'LGU-IU' || userData?.role === 'IU') {
          // CRITICAL: Ensure userId is the correct format (userId from userData, not employeeId/username)
          const correctUserId = updatedUser.userId || updatedUser.id || userId;
          
          window.dispatchEvent(new CustomEvent('iuProfilePictureUpdated', {
            detail: { 
              profilePictureUrl: urlToStore,
              userId: correctUserId,  // Use userId from userData, not the computed userId
              userData: updatedUser
            }
          }));
          
          // Also notify the LGU-IU ProfilePictureManager if it exists
          if (window.lguIuProfilePictureManager && typeof window.lguIuProfilePictureManager.setProfilePicture === 'function') {
            window.lguIuProfilePictureManager.setProfilePicture(urlToStore);
            console.log('✅ Notified LGU-IU ProfilePictureManager of new profile picture');
          }
          
          console.log('✅ LGU-IU profile picture event dispatched with userId:', correctUserId);
        } else if ((userData?.role === 'LGU-PMT' && (userData?.subRole === 'MPMEC' || !userData?.subRole)) || userData?.role === 'MPMEC') {
          window.dispatchEvent(new CustomEvent('mpmecProfilePictureUpdated', {
            detail: { 
              profilePictureUrl: newProfilePictureUrl,
              userId: userId,
              userData: updatedUser
            }
          }));
          
          // Also notify the MPMEC ProfilePictureManager if it exists
          if (window.mpmecProfilePictureManager && typeof window.mpmecProfilePictureManager.setProfilePicture === 'function') {
            window.mpmecProfilePictureManager.setProfilePicture(newProfilePictureUrl);
            console.log('✅ Notified MPMEC ProfilePictureManager of new profile picture');
          }
          
          console.log('✅ MPMEC profile picture event dispatched');
        } else if (userData?.role === 'MPMEC Secretariat' || userData?.role === 'Secretariat') {
          window.dispatchEvent(new CustomEvent('secretariatProfilePictureUpdated', {
            detail: { 
              profilePictureUrl: newProfilePictureUrl,
              userId: userId,
              userData: updatedUser
            }
          }));
          
          // Also notify the Secretariat ProfilePictureManager if it exists
          if (window.secretariatProfilePictureManager && typeof window.secretariatProfilePictureManager.setProfilePicture === 'function') {
            window.secretariatProfilePictureManager.setProfilePicture(newProfilePictureUrl);
            console.log('✅ Notified Secretariat ProfilePictureManager of new profile picture');
          }
          
          console.log('✅ Secretariat profile picture event dispatched');
        } else if (userData?.role === 'Executive Viewer' || userData?.role === 'EXEC') {
          window.dispatchEvent(new CustomEvent('executiveProfilePictureUpdated', {
            detail: { 
              profilePictureUrl: newProfilePictureUrl,
              userId: userId,
              userData: updatedUser
            }
          }));
          
          // Also notify the Executive ProfilePictureManager if it exists
          if (window.executiveProfilePictureManager && typeof window.executiveProfilePictureManager.setProfilePicture === 'function') {
            window.executiveProfilePictureManager.setProfilePicture(newProfilePictureUrl);
            console.log('✅ Notified Executive ProfilePictureManager of new profile picture');
          }
          
          console.log('✅ Executive Viewer profile picture event dispatched');
        }
        
        console.log('✅ Profile picture updated and events dispatched:', { userId, profilePictureUrl: urlToStore, role: userData?.role });
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setShowWarningModal({ show: true, message: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setShowWarningModal({ show: true, message: 'New password must be at least 6 characters long' });
      return;
    }

    try {
      const token = getToken();
      const response = await axios.post(`${API_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setShowSuccessModal({ show: true, message: 'Password changed successfully!' });
        setShowChangePasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        // Reload profile completion after password change
        loadProfileCompletion();
      } else {
        setShowWarningModal({ show: true, message: 'Failed to change password: ' + (response.data.error || 'Unknown error') });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setShowWarningModal({ show: true, message: 'Failed to change password. Please check your current password and try again.' });
    }
  };

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
    // Load profile completion with a slight delay to ensure user data is loaded first
    setTimeout(() => {
      loadProfileCompletion();
    }, 300);
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'activity' && userData) {
      loadActivityHistory();
    } else if (activeTab === 'statistics' && userData) {
      loadStatistics();
    }
  }, [activeTab, userData]);

  // Inject modal animation styles
  useEffect(() => {
    const styleId = 'profile-center-modal-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes drawCheckmark {
        from {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
        }
        to {
          stroke-dasharray: 50;
          stroke-dashoffset: 0;
        }
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
      }
      
      .animate-scaleIn {
        animation: scaleIn 0.3s ease-out;
      }
      
      .checkmark-path {
        stroke-dasharray: 50;
        stroke-dashoffset: 50;
        animation: drawCheckmark 0.6s ease-out 0.2s forwards;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const formatActivityAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActivityIcon = (action) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    } else if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
    } else if (action.includes('CREATE') || action.includes('ADD')) {
      return 'M12 4v16m8-8H4';
    } else if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';
    } else if (action.includes('PASSWORD')) {
      return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z';
    }
    return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatDateTime = (date) => {
    if (!date) return 'Loading...';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Manila'
      }) + ' Philippine Standard Time';
    } catch (error) {
      return 'Loading...';
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length === 0) return 'U';
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Determine role config - handle role variations
  let detectedRole = userRole || userData?.role || 'LGU-IU';
  
  // Map role variations to standard roles
  if (detectedRole === 'MPMEC Secretariat' || detectedRole === 'Secretariat') {
    detectedRole = 'MPMEC Secretariat';
  } else if (detectedRole === 'LGU-PMT' || detectedRole === 'MPMEC') {
    detectedRole = 'LGU-PMT';
  } else if (detectedRole === 'SYS.AD' || detectedRole === 'System Administrator') {
    detectedRole = 'SYS.AD';
  } else if (detectedRole === 'Executive Viewer' || detectedRole === 'Executive') {
    detectedRole = 'Executive Viewer';
  }
  
  const roleConfig = roleConfigs[detectedRole] || roleConfigs['LGU-IU'];
  const displayTitle = title || roleConfig.title;
  const displaySubtitle = subtitle || roleConfig.subtitle;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${currentTheme.primary}`}></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load profile data</p>
          <button 
            onClick={loadUserProfile}
            className={`mt-4 px-4 py-2 ${currentTheme.primary} ${currentTheme.primaryHover} text-white rounded-lg`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const fullName = userData.fullName || userData.name || 'User';
  const initials = getUserInitials(fullName);
  const userId = userData.userId || userData.employeeId || userData.id || 'N/A';
  const email = userData.email || userData.username || 'N/A';
  const contactNumber = userData.contactNumber || '-';
  const birthdate = formatDate(userData.birthdate);
  const department = userData.department || '-';
  const position = userData.position || roleConfig.positionLabel;
  const subRole = userData.subRole || roleConfig.roleLabel;
  const status = userData.status || 'active';
  const location = userData.location || userData.address || '-';
  const timezone = userData.timezone || 'Asia/Manila';


  return (
    <div className="w-full">
      <style>{`
        /* Modern Profile Card Styles with Hover Effects - Theme-specific */
        .profile-card-modern {
          @apply bg-white border border-gray-200 rounded-2xl shadow-lg transition-all duration-500 ease-out;
          position: relative;
          overflow: hidden;
        }
        
        .profile-card-modern:hover {
          @apply shadow-2xl -translate-y-2;
        }
        
        .profile-card-modern::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          transition: left 0.6s ease-out;
          z-index: 1;
        }
        
        .profile-card-modern > * {
          position: relative;
          z-index: 2;
        }
        
        .profile-card-modern:hover::before {
          left: 100%;
        }
        
        /* Modern Tab Styles */
        .tab-modern {
          @apply px-6 py-3 font-semibold text-sm transition-all duration-300 relative;
          position: relative;
          overflow: hidden;
        }
        
        .tab-modern::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 3px;
          transition: width 0.3s ease-out;
          z-index: 1;
        }
        
        .tab-modern:hover::before {
          width: 100%;
        }
        
        .tab-modern.active::before {
          width: 100%;
        }
        
        /* Modern Button Styles with Shining Effect */
        .btn-modern-primary {
          @apply font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform;
          position: relative;
          overflow: hidden;
        }
        
        .btn-modern-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease-out;
          z-index: 1;
        }
        
        .btn-modern-primary > * {
          position: relative;
          z-index: 2;
        }
        
        .btn-modern-primary:hover::before {
          left: 100%;
        }
        
        .btn-modern-primary:hover {
          @apply scale-105 shadow-xl;
          transform: translateY(-2px) scale(1.02);
        }
        
        /* Icon Container Hover Effects */
        .icon-container-modern {
          @apply rounded-xl p-3 shadow-xl transition-all duration-300;
          position: relative;
          overflow: hidden;
        }
        
        .icon-container-modern::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease-out;
          z-index: 1;
        }
        
        .icon-container-modern > * {
          position: relative;
          z-index: 2;
        }
        
        .icon-container-modern:hover::before {
          left: 100%;
        }
        
        .icon-container-modern:hover {
          @apply transform scale-110 rotate-3 shadow-2xl;
        }
        
        /* Info Field Hover Effects - Theme-specific */
        .info-field-modern {
          @apply transition-all duration-300;
        }
        
        .info-field-modern:hover {
          @apply transform -translate-y-1;
        }
        
        /* Activity Card Hover Effects - Theme-specific */
        .activity-card-modern {
          @apply transition-all duration-300;
          position: relative;
          overflow: hidden;
        }
        
        .activity-card-modern::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          transition: left 0.5s ease-out;
          z-index: 1;
        }
        
        .activity-card-modern:hover::before {
          left: 100%;
        }
        
        .activity-card-modern > * {
          position: relative;
          z-index: 2;
        }
        
        .activity-card-modern:hover {
          @apply transform -translate-y-1 shadow-lg;
        }
      `}</style>
      
      <style dangerouslySetInnerHTML={{__html: `
        /* Theme-specific hover effects */
        .profile-card-modern:hover {
          border-color: ${currentTheme.hoverBorder} !important;
        }
        
        .profile-card-modern::before {
          background: linear-gradient(90deg, transparent, ${currentTheme.hoverShine}, transparent) !important;
        }
        
        .activity-card-modern::before {
          background: linear-gradient(90deg, transparent, ${currentTheme.hoverShineLight}, transparent) !important;
        }
        
        .info-field-modern:hover {
          box-shadow: 0 10px 25px -5px ${currentTheme.hoverShineLight}, 0 10px 10px -5px ${currentTheme.hoverShineLight} !important;
        }
      `}} />
      
      {/* Header Section - Matching announcements.astro style */}
      <div className={`bg-white border-b ${currentTheme.border} px-8 py-6 mb-0 -mx-8 -mt-8`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br ${currentTheme.gradientIcon} shadow-xl hover:scale-110 hover:rotate-3 relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div>
                <h1 className={`text-3xl font-bold bg-gradient-to-r ${currentTheme.gradientText} bg-clip-text text-transparent`}>{displayTitle}</h1>
                <p className="text-sm text-gray-600 mt-1">{displaySubtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className={`text-xs ${currentTheme.accent} font-semibold`}>
                {formatDateTime(lastUpdated)}
              </p>
            </div>
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Matching announcements.astro style */}
      <div className="px-8 py-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                activeTab === 'overview'
                  ? `bg-gradient-to-r ${currentTheme.gradient} text-white shadow-sm`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                activeTab === 'activity'
                  ? `bg-gradient-to-r ${currentTheme.gradient} text-white shadow-sm`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Activity & Login History
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                activeTab === 'statistics'
                  ? `bg-gradient-to-r ${currentTheme.gradient} text-white shadow-sm`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-2.5 font-semibold text-sm rounded-md transition-all duration-200 ${
                activeTab === 'security'
                  ? `bg-gradient-to-r ${currentTheme.gradient} text-white shadow-sm`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Security
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <section className="px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className={`profile-card-modern ${currentTheme.primaryLight} rounded-2xl p-6 border ${currentTheme.border}`}>
                <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div 
                    className={`relative w-32 h-32 rounded-2xl overflow-hidden shadow-xl mb-4 cursor-pointer group border-4 ${currentTheme.profileBorder}`}
                    onClick={() => {
                      if (editing) {
                        fileInputRef.current?.click();
                      } else if (profilePicturePreview) {
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {profilePicturePreview ? (
                      <ProfilePictureImage
                        userId={userId}
                        url={profilePicturePreview}
                        alt={fullName}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full ${currentTheme.primary} flex items-center justify-center text-white font-bold text-4xl`}
                      style={{ display: profilePicturePreview ? 'none' : 'flex' }}
                    >
                      {initials}
                    </div>
                    
                    {editing && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <div className="text-center text-white">
                          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p className="text-sm font-medium">Click to Change</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{fullName}</h2>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status === 'active' ? 'Active' : status}
                </div>
                <p className="text-sm text-gray-700 font-medium mt-2">{subRole}</p>
                <p className="text-xs text-gray-600">{position}</p>
              </div>
              
              {/* Quick Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                    </svg>
                    User ID
                  </span>
                  <span className="text-sm font-bold text-gray-800">{userId}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Email
                  </span>
                  <span className="text-sm font-bold text-gray-800 truncate max-w-[200px]" title={email}>{email}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                    Contact
                  </span>
                  <span className="text-sm font-bold text-gray-800">{contactNumber}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    Department
                  </span>
                  <span className="text-sm font-bold text-gray-800 truncate max-w-[150px]" title={department}>{department}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    Location
                  </span>
                  <span className="text-sm font-bold text-gray-800">{location}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Birthday
                  </span>
                  <span className="text-sm font-bold text-gray-800">{birthdate}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Timezone
                  </span>
                  <span className="text-sm font-bold text-gray-800">{timezone}</span>
                </div>
              </div>
            </div>

            {/* Profile Completion Indicator */}
            <div className={`${currentTheme.primaryLight} rounded-2xl p-6 shadow-lg border ${currentTheme.border}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Profile Completion</h3>
                <span className={`text-2xl font-bold ${profileCompletion.percentage >= 80 ? 'text-green-600' : profileCompletion.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {profileCompletion.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                    profileCompletion.percentage >= 80 ? 'bg-green-600' :
                    profileCompletion.percentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ 
                    width: progressBarAnimated ? `${profileCompletion.percentage}%` : '0%',
                    transition: 'width 1.5s ease-out'
                  }}
                ></div>
              </div>
              {profileCompletion.missingFields && profileCompletion.missingFields.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Missing fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {profileCompletion.missingFields.slice(0, 3).map((field, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-700">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))}
                    {profileCompletion.missingFields.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-700">
                        +{profileCompletion.missingFields.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className={`profile-card-modern ${currentTheme.primaryLight} rounded-2xl p-6 border ${currentTheme.border}`}>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setEditing(!editing)}
                  className={`btn-modern-primary w-full text-white rounded-xl font-semibold shadow-md ${
                    editing 
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800' 
                      : currentTheme.primary + ' ' + currentTheme.primaryHover
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={editing ? "M6 18L18 6M6 6l12 12" : "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"}></path>
                    </svg>
                    {editing ? 'Cancel Editing' : 'Edit Profile'}
                  </span>
                </button>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className={`btn-modern-primary w-full ${currentTheme.primary} ${currentTheme.primaryHover} text-white rounded-xl font-semibold shadow-md`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                    </svg>
                    Change Password
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <div className="profile-card-modern bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`icon-container-modern ${currentTheme.primary} rounded-xl p-3`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>
                    <p className="text-sm text-gray-600">Complete personal details and contact information</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className={`w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 focus:ring-4 focus:ring-opacity-20 focus:border-opacity-100 transition-all text-gray-900 font-medium`}
                      placeholder="Enter full name"
                    />
                  ) : (
                    <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                      {fullName}
                    </div>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Email Address
                  </label>
                    <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                      {email}
                    </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Date of Birth
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={editFormData.birthdate}
                      onChange={(e) => setEditFormData({ ...editFormData, birthdate: e.target.value })}
                      className={`w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 focus:ring-4 focus:ring-opacity-20 focus:border-opacity-100 transition-all text-gray-900 font-medium`}
                    />
                  ) : (
                    <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                      {birthdate}
                    </div>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Username
                  </label>
                  <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                    {userData.username || email}
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                    Contact Number
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editFormData.contactNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                      className={`w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 focus:ring-4 focus:ring-opacity-20 focus:border-opacity-100 transition-all text-gray-900 font-medium`}
                      placeholder="Enter contact number"
                    />
                  ) : (
                    <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                      {contactNumber}
                    </div>
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                    </svg>
                    User ID
                  </label>
                  <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                    {userId}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditFormData({
                        fullName: userData.fullName || userData.name || '',
                        contactNumber: userData.contactNumber || '',
                        birthdate: userData.birthdate || ''
                      });
                      setProfilePicture(null);
                      setProfilePicturePreview(userData.profilePictureUrl || null);
                    }}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className={`px-6 py-3 ${currentTheme.primary} ${currentTheme.primaryHover} text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Role-Specific Information Card */}
            <div className="profile-card-modern bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className={`icon-container-modern ${currentTheme.primary} rounded-xl p-3`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {detectedRole === 'LGU-IU' ? 'LGU-IU Information' :
                     detectedRole === 'LGU-PMT' ? 'Committee Information' :
                     detectedRole === 'MPMEC Secretariat' ? 'Secretariat Information' :
                     detectedRole === 'EIU' ? 'EIU Information' :
                     detectedRole === 'SYS.AD' ? 'System Statistics' :
                     'Executive Information'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {detectedRole === 'SYS.AD' ? 'System performance and statistics' :
                     `${detectedRole} role and access details`}
                  </p>
                </div>
              </div>

              {detectedRole === 'SYS.AD' ? (
                // System Admin Statistics
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className={`${currentTheme.primaryLight} rounded-xl p-4 border ${currentTheme.border}`}>
                    <p className="text-sm text-gray-600 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div className={`${currentTheme.primaryLight} rounded-xl p-4 border ${currentTheme.border}`}>
                    <p className="text-sm text-gray-600 mb-1">Active Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div className={`${currentTheme.primaryLight} rounded-xl p-4 border ${currentTheme.border}`}>
                    <p className="text-sm text-gray-600 mb-1">System Uptime</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div className={`${currentTheme.primaryLight} rounded-xl p-4 border ${currentTheme.border}`}>
                    <p className="text-sm text-gray-600 mb-1">Security Score</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div className={`${currentTheme.primaryLight} rounded-xl p-4 border ${currentTheme.border}`}>
                    <p className="text-sm text-gray-600 mb-1">Performance</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div className={`${currentTheme.primaryLight} rounded-xl p-4 border ${currentTheme.border}`}>
                    <p className="text-sm text-gray-600 mb-1">Last Backup</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                </div>
              ) : (
                // Role Information Fields
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      {detectedRole === 'LGU-IU' ? 'LGU-IU Role' :
                       detectedRole === 'LGU-PMT' ? 'Committee Role' :
                       detectedRole === 'MPMEC Secretariat' ? 'Secretariat Role' :
                       detectedRole === 'EIU' ? 'EIU Role' :
                       'Executive Role'}
                    </label>
                    <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                      {subRole}
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-bold text-gray-800 mb-2">Position</label>
                    <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                      {position}
                    </div>
                  </div>
                  {detectedRole === 'MPMEC Secretariat' && (
                    <>
                      <div className="group">
                        <label className="block text-sm font-bold text-gray-800 mb-2">Department</label>
                        <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                          {department}
                        </div>
                      </div>
                      <div className="group">
                        <label className="block text-sm font-bold text-gray-800 mb-2">Status</label>
                        <div className={`info-field-modern w-full px-4 py-3 bg-gradient-to-br ${currentTheme.infoField} rounded-xl border-2 text-gray-800 font-medium`}>
                          {status === 'active' ? 'Active' : status}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Activity & Login History Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="profile-card-modern bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`icon-container-modern ${currentTheme.primary} rounded-xl p-3`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Activity & Login History</h3>
                    <p className="text-sm text-gray-600">Recent account activities and login sessions</p>
                  </div>
                </div>
              </div>

              {loadingActivity ? (
                <div className="flex items-center justify-center py-12">
                  <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${currentTheme.primary}`}></div>
                </div>
              ) : activityHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No activity history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityHistory.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`${currentTheme.primaryLight} rounded-lg p-2 flex-shrink-0`}>
                        <svg className={`w-5 h-5 ${currentTheme.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={getActivityIcon(activity.action)}></path>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">{formatActivityAction(activity.action)}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</p>
                        </div>
                        {activity.details && (
                          <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {activity.module && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                              </svg>
                              {activity.module}
                            </span>
                          )}
                          {activity.ipAddress && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                              </svg>
                              {activity.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics Dashboard Tab */}
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <div className="profile-card-modern bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className={`icon-container-modern ${currentTheme.primary} rounded-xl p-3`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Account Statistics</h3>
                  <p className="text-sm text-gray-600">Your account performance and activity metrics</p>
                </div>
              </div>

              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${currentTheme.primary}`}></div>
                </div>
              ) : statistics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className={`${currentTheme.primaryLight} rounded-xl p-6 border ${currentTheme.border}`}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Account Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Account Created</span>
                        <span className="text-sm font-semibold text-gray-900">{formatDate(statistics.account?.accountCreated)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Login</span>
                        <span className="text-sm font-semibold text-gray-900">{statistics.account?.lastLogin ? formatDateTime(statistics.account.lastLogin) : 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className={`text-sm font-semibold ${statistics.account?.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                          {statistics.account?.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`${currentTheme.primaryLight} rounded-xl p-6 border ${currentTheme.border}`}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Activity Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Activities</span>
                        <span className="text-sm font-semibold text-gray-900">{statistics.activity?.totalActivities || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last 30 Days</span>
                        <span className="text-sm font-semibold text-gray-900">{statistics.activity?.recentActivities || 0}</span>
                      </div>
                      {statistics.activity?.lastActivity && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Activity</span>
                          <span className="text-sm font-semibold text-gray-900">{formatDateTime(statistics.activity.lastActivity.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {statistics.projects && (
                    <div className={`${currentTheme.primaryLight} rounded-xl p-6 border ${currentTheme.border}`}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Project Statistics</h4>
                      <div className="space-y-3">
                        {statistics.projects.managed !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Projects Managed</span>
                            <span className="text-sm font-semibold text-gray-900">{statistics.projects.managed}</span>
                          </div>
                        )}
                        {statistics.projects.assigned !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Projects Assigned</span>
                            <span className="text-sm font-semibold text-gray-900">{statistics.projects.assigned}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {statistics.validations && (
                    <div className={`${currentTheme.primaryLight} rounded-xl p-6 border ${currentTheme.border}`}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Validation Statistics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Validations Completed</span>
                          <span className="text-sm font-semibold text-gray-900">{statistics.validations.completed || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {statistics.system && (
                    <div className={`${currentTheme.primaryLight} rounded-xl p-6 border ${currentTheme.border}`}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">System Statistics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Users</span>
                          <span className="text-sm font-semibold text-gray-900">{statistics.system.totalUsers || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Active Users</span>
                          <span className="text-sm font-semibold text-gray-900">{statistics.system.activeUsers || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No statistics available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Settings Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="profile-card-modern bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className={`icon-container-modern ${currentTheme.primary} rounded-xl p-3`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Security Settings</h3>
                  <p className="text-sm text-gray-600">Manage your account security and authentication</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Password</h4>
                      <p className="text-sm text-gray-600">Change your account password</p>
                    </div>
                    <button
                      onClick={() => setShowChangePasswordModal(true)}
                      className={`px-4 py-2 ${currentTheme.primary} ${currentTheme.primaryHover} text-white rounded-lg font-semibold transition-colors`}
                    >
                      Change Password
                    </button>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Last changed: {userData?.passwordChangedAt ? formatDateTime(userData.passwordChangedAt) : 'Never'}</p>
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Two-Factor Authentication (2FA)</h4>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        twoFactorEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => {
                          setShowWarningModal({ show: true, message: '2FA setup will be implemented in a future update' });
                        }}
                        className={`px-4 py-2 ${twoFactorEnabled ? 'bg-gray-200 hover:bg-gray-300' : currentTheme.primary + ' ' + currentTheme.primaryHover} text-white rounded-lg font-semibold transition-colors`}
                      >
                        {twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      {twoFactorEnabled 
                        ? 'Two-factor authentication is currently enabled on your account.'
                        : 'Two-factor authentication adds an extra layer of security by requiring a second verification step when logging in.'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Login Sessions</h4>
                  <div className="space-y-3">
                    {statistics?.account?.lastLogin ? (
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Last Login</p>
                            <p className="text-xs text-gray-600 mt-1">{formatDateTime(statistics.account.lastLogin)}</p>
                          </div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">No login history available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowChangePasswordModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-opacity-20 focus:border-gray-400 transition-all"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-opacity-20 focus:border-gray-400 transition-all"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-opacity-20 focus:border-gray-400 transition-all"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className={`px-6 py-3 ${currentTheme.primary} ${currentTheme.primaryHover} text-white rounded-lg font-semibold transition-colors`}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Warning Modal */}
      {showWarningModal.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 animate-fadeIn"
          onClick={() => setShowWarningModal({ show: false, message: '' })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              {/* Warning Icon with Animation */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                  <svg 
                    className="w-12 h-12 text-red-600 animate-bounce" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                {/* Ripple Effect */}
                <div className="absolute inset-0 rounded-full bg-red-200 animate-ping opacity-75"></div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Warning</h3>
              <p className="text-gray-600 mb-6">{showWarningModal.message}</p>
              
              <button
                onClick={() => setShowWarningModal({ show: false, message: '' })}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Success Modal */}
      {showSuccessModal.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 animate-fadeIn"
          onClick={() => setShowSuccessModal({ show: false, message: '' })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              {/* Success Checkmark with Animation */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <svg 
                    className="w-12 h-12 text-green-600 checkmark-animation" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M5 13l4 4L19 7"
                      className="checkmark-path"
                    />
                  </svg>
                </div>
                {/* Success Ripple Effect */}
                <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-75"></div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Success</h3>
              <p className="text-gray-600 mb-6">{showSuccessModal.message}</p>
              
              <button
                onClick={() => setShowSuccessModal({ show: false, message: '' })}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Modal */}
      {showImageModal && profilePicturePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4 animate-fadeIn"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            {/* Full Image */}
            <img
              src={profilePicturePreview}
              alt={fullName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scaleIn"
            />
            
            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
              <p className="text-sm font-medium">{fullName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


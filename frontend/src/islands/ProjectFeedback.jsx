import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { getApiUrl } from '../config/api.js';

const API_URL = getApiUrl();

// Get Socket.IO URL for feedback namespace
const getSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Check if we're in development (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // For production, use the same protocol and domain WITHOUT port
  // This assumes Nginx reverse proxy is configured to route Socket.IO to backend
  // Socket.IO will automatically use /socket.io path
  if (hostname.includes('build-watch.com')) {
    if (protocol === 'https:') {
      // HTTPS: Use same domain without port (Nginx reverse proxy expected)
      return `${protocol}//${hostname}`;
    } else {
      // HTTP: Can use port 3000 directly
      return `http://${hostname}:3000`;
    }
  }
  
  // Fallback
  return 'http://localhost:3000';
};

// Get or create session ID for anonymous users (browser-only)
const getSessionId = () => {
  if (typeof window === 'undefined') {
    // Return a temporary ID for SSR - will be replaced on client
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  let sessionId = localStorage.getItem('feedback_session_id');
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('feedback_session_id', sessionId);
  }
  return sessionId;
};

export default function ProjectFeedback({ projectId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
  const [showLogoutSuccessModal, setShowLogoutSuccessModal] = useState(false);
  const [loginSuccessUserName, setLoginSuccessUserName] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const sessionId = useRef(null);
  const socketRef = useRef(null);

  // Check authentication status and load user data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkAuth = () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            setIsAuthenticated(true);
            setCurrentUser(user);
            setIsSystemAdmin(user.role === 'SYS.AD' || user.email === 'sysadmin@gmail.com');
            
            // Auto-populate name field if user is logged in
            if (user.name && !authorName) {
              setAuthorName(user.name);
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
            setIsAuthenticated(false);
            setCurrentUser(null);
            setIsSystemAdmin(false);
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsSystemAdmin(false);
        }
      };
      
      checkAuth();
      // Check auth status periodically and on storage changes
      const interval = setInterval(checkAuth, 2000);
      window.addEventListener('storage', checkAuth);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', checkAuth);
      };
    }
  }, [authorName]);

  // Initialize session ID on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionId.current = getSessionId();
      
      // Load Google Sign-In script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      
      return () => {
        // Cleanup script if component unmounts
        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
      };
    }
  }, []);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      // Check if Google script is loaded
      if (!window.google) {
        alert('Google Sign-In is loading. Please wait a moment and try again.');
        return;
      }

      // Initialize Google Sign-In
      const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;
      
      // Validate that Google Client ID is configured
      if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID' || clientId.includes('YOUR_GOOGLE')) {
        alert('⚠️ Google Sign-In is not configured yet.\n\nPlease add your Google OAuth Client ID to the environment variables:\n\n1. Get your Client ID from Google Cloud Console\n2. Add PUBLIC_GOOGLE_CLIENT_ID to your .env file\n3. Restart the development server');
        return;
      }
      
      // Create a temporary container for the Google button
      let tempContainer = document.getElementById('google-signin-temp-container');
      if (!tempContainer) {
        tempContainer = document.createElement('div');
        tempContainer.id = 'google-signin-temp-container';
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);
      } else {
        tempContainer.innerHTML = '';
      }

      // Initialize Google Sign-In with proper client_id
      console.log('🔧 Initializing Google Sign-In with Client ID:', clientId.substring(0, 20) + '...');
      
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            console.log('✅ Google Sign-In callback received, credential length:', response.credential?.length || 0);
            // Send the credential to backend
            const authResponse = await axios.post(`${API_URL}/auth/google-login`, {
              credential: response.credential
            });

            if (authResponse.data.success) {
              // Store authentication data
              localStorage.setItem('token', authResponse.data.token);
              localStorage.setItem('user', JSON.stringify(authResponse.data.user));
              
              // Update auth status and user data
              setIsAuthenticated(true);
              setCurrentUser(authResponse.data.user);
              setIsSystemAdmin(authResponse.data.user.role === 'SYS.AD' || authResponse.data.user.email === 'sysadmin@gmail.com');
              
              // Auto-populate name field with user's name
              if (authResponse.data.user.name) {
                setAuthorName(authResponse.data.user.name);
              }
              
              // Reload comments to show verified badge
              loadComments();
              
              // Clean up temp container
              if (tempContainer) {
                tempContainer.remove();
              }
              
              // Show success modal
              setLoginSuccessUserName(authResponse.data.user.name || 'User');
              setShowLoginSuccessModal(true);
              
              // Auto-close success modal after 3 seconds
              setTimeout(() => {
                setShowLoginSuccessModal(false);
              }, 3000);
            }
          } catch (error) {
            console.error('Google login error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to login with Google. Please try again.';
            alert(`❌ ${errorMessage}`);
            if (tempContainer) {
              tempContainer.remove();
            }
          }
        }
      });

      // Use One Tap for better UX, or render button as fallback
      // Note: The FedCM warning is just a future compatibility notice, not blocking
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap not available, render button instead
          window.google.accounts.id.renderButton(tempContainer, {
            client_id: clientId,
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 250,
            type: 'standard'
          });

          // Trigger the button click after a short delay
          setTimeout(() => {
            const googleButton = tempContainer.querySelector('div[role="button"]');
            if (googleButton) {
              googleButton.click();
            } else {
              console.warn('⚠️ Google Sign-In button not found, user may need to click manually');
            }
          }, 200);
        } else {
          console.log('✅ Google One Tap is available');
        }
      });
      
    } catch (error) {
      console.error('Google login initialization error:', error);
      alert('Google Sign-In is not available. Please ensure you have internet connection.');
    }
  };

  // Handle logout - open confirmation modal
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setShowLogoutMenu(false);
  };

  // Confirm logout
  const confirmLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // IMPORTANT: Call logout endpoint BEFORE clearing token
      // This ensures the backend can authenticate and update lastLogoutAt
      if (token) {
        try {
          // Construct logout URL properly
          // API_URL is already the base API URL (e.g., "http://localhost:3000/api")
          // Just append /auth/logout
          const logoutUrl = `${API_URL}/auth/logout`;
          
          console.log('🔓 Calling logout endpoint:', logoutUrl);
          const response = await axios.post(logoutUrl, {}, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('✅ Logout endpoint response:', response.data);
        } catch (error) {
          console.error('❌ Error calling logout endpoint:', error);
          console.error('   Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          // Continue with logout even if API call fails
        }
      } else {
        console.warn('⚠️ No token found, skipping logout API call');
      }
      
      // Clear local storage after API call
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsSystemAdmin(false);
      setAuthorName('');
      setShowLogoutModal(false);
      setShowLogoutMenu(false);
      loadComments(); // Reload to remove verified badges
      
      // Show success modal
      setShowLogoutSuccessModal(true);
      
      // Auto-close success modal after 3 seconds
      setTimeout(() => {
        setShowLogoutSuccessModal(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Still clear local storage even if there's an error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsSystemAdmin(false);
      setAuthorName('');
      setShowLogoutModal(false);
      setShowLogoutMenu(false);
      loadComments();
    }
  };

  // Load comments
  const loadComments = async () => {
    try {
      setLoading(true);
      const headers = {};
      if (sessionId.current) {
        headers['X-Session-ID'] = sessionId.current;
      }
      
      // Add auth token if logged in
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API_URL}/project-comments/project/${projectId}`, {
        params: { sort: sortBy, filter: filterBy },
        headers
      });

      if (response.data.success) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file count (max 2)
    if (selectedImages.length + files.length > 2) {
      alert('Maximum 2 images allowed per comment');
      e.target.value = '';
      return;
    }
    
    // Validate file size (max 10MB each)
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`Some files exceed 10MB limit. Please select smaller files.`);
      e.target.value = '';
      return;
    }
    
    // Validate file types (images only)
    const invalidTypes = files.filter(file => !file.type.startsWith('image/'));
    if (invalidTypes.length > 0) {
      alert('Only image files are allowed (JPEG, PNG, GIF, WebP, BMP)');
      e.target.value = '';
      return;
    }
    
    // Add new files to selected images
    const newImages = [...selectedImages, ...files];
    setSelectedImages(newImages);
    
    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
    
    // Reset input
    e.target.value = '';
  };
  
  // Remove image
  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };
  
  // Open image lightbox
  const openImageLightbox = (imageUrl) => {
    setLightboxImage(imageUrl);
    setShowImageLightbox(true);
  };
  
  // Close image lightbox
  const closeImageLightbox = () => {
    setShowImageLightbox(false);
    setLightboxImage(null);
  };

  // Submit comment
  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && selectedImages.length === 0) {
      alert('Please enter a comment or upload at least one image.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Determine if comment is anonymous - only false if user is actually logged in
      const isUserLoggedIn = !!localStorage.getItem('token');
      
      // Use current user's name if logged in, otherwise use provided name
      const finalAuthorName = isUserLoggedIn && currentUser 
        ? (currentUser.name || currentUser.email || 'Anonymous')
        : (authorName.trim() || 'Anonymous');
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append('content', commentText.trim());
      formData.append('authorName', finalAuthorName);
      formData.append('isAnonymous', !isUserLoggedIn);
      
      // Add images
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });
      
      // Prepare headers
      const headers = {
        'Content-Type': 'multipart/form-data'
      };
      
      if (sessionId.current) {
        headers['X-Session-ID'] = sessionId.current;
      }
      
      // Add auth token if logged in
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(`${API_URL}/project-comments/project/${projectId}`, formData, {
        headers
      });

      if (response.data.success) {
        // Clear form and reset image states
        setCommentText('');
        setAuthorName('');
        setSelectedImages([]);
        // Revoke all preview URLs
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
        setImagePreviews([]);
        setShowCommentForm(false);
        loadComments();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit comment. Please try again.';
      
      // Show user-friendly error message
      if (error.response?.status === 429) {
        alert(`⏱️ ${errorMessage}`);
      } else if (error.response?.status === 400) {
        alert(`⚠️ ${errorMessage}`);
      } else {
        alert(`❌ ${errorMessage}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (comment) => {
    if (!isSystemAdmin) {
      alert('Only System Administrators can delete comments.');
      return;
    }
    setCommentToDelete(comment);
    setShowDeleteModal(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setCommentToDelete(null);
  };

  // Delete comment (System Admin only)
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in as System Admin to delete comments.');
        closeDeleteModal();
        return;
      }

      const response = await axios.delete(`${API_URL}/project-comments/${commentToDelete.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.success) {
        closeDeleteModal();
        loadComments(); // Reload comments after deletion
        
        // Show success modal
        setShowSuccessModal(true);
        
        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      } else {
        // Handle case where response doesn't have success flag
        const errorMessage = response.data?.error || 'Failed to delete comment. Please try again.';
        if (window.showAppToast) {
          window.showAppToast({
            title: 'Deletion failed',
            message: errorMessage,
            variant: 'error',
            duration: 3000
          });
        } else {
          alert(`❌ ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Check if the deletion actually succeeded (status 200) but there was a parsing error
      if (error.response?.status === 200) {
        // Deletion likely succeeded, show success
        closeDeleteModal();
        loadComments();
        setShowSuccessModal(true);
        
        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      } else {
        // Real error occurred
        const errorMessage = error.response?.data?.error || error.message || 'Failed to delete comment. Please try again.';
        if (window.showAppToast) {
          window.showAppToast({
            title: 'Deletion failed',
            message: errorMessage,
            variant: 'error',
            duration: 3000
          });
        } else {
          alert(`❌ ${errorMessage}`);
        }
      }
    }
  };

  // Toggle reaction
  const toggleReaction = async (commentId, reactionType) => {
    try {
      const headers = {};
      if (sessionId.current) {
        headers['X-Session-ID'] = sessionId.current;
      }
      
      const response = await axios.post(`${API_URL}/project-comments/${commentId}/reaction`, {
        reactionType
      }, {
        headers
      });

      if (response.data.success) {
        // Update local state
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            const wasReacted = comment.userReaction === reactionType;
            return {
              ...comment,
              likes: response.data.likes || comment.likes,
              hearts: response.data.hearts || comment.hearts,
              userReaction: wasReacted ? null : reactionType
            };
          }
          return comment;
        }));
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Load comments when component mounts or filters change (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId.current) {
      loadComments();
    }
  }, [projectId, sortBy, filterBy]);
  
  // Load comments once session ID is initialized (after initial mount)
  useEffect(() => {
    if (sessionId.current && typeof window !== 'undefined') {
      loadComments();
    }
  }, [sessionId.current]);

  // Initialize Socket.IO connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined' || !projectId) return;

    const socketUrl = getSocketUrl();
    const isProduction = window.location.hostname.includes('build-watch.com');
    
    console.log('🔌 Connecting to feedback Socket.IO namespace:', `${socketUrl}/feedback`);

    // Connect to feedback namespace (no auth required)
    // Socket.IO namespaces: connect to base URL with /socket.io path, then specify namespace
    // For production, use relative URL which will use current origin
    // For development, use full URL with port
    if (isProduction) {
      // Production: Use relative URL (will use current origin: https://www.build-watch.com)
      // Connect to /feedback namespace via /socket.io path
      socketRef.current = io('/feedback', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        upgrade: true,
        timeout: 20000
      });
    } else {
      // Development: Use full URL with port
      socketRef.current = io(`${socketUrl}/feedback`, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        upgrade: true,
        timeout: 20000
      });
    }

    socketRef.current.on('connect', () => {
      console.log('✅ Feedback Socket.IO connected');
      // Join project room
      socketRef.current.emit('join_project', { projectId });
      console.log(`✅ Joined project room: project:${projectId}`);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.warn('⚠️ Feedback Socket.IO disconnected:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Feedback Socket.IO connection error:', error);
    });

    // Listen for new comments
    socketRef.current.on('new_comment', (newComment) => {
      console.log('📨 Received new_comment event:', newComment);
      if (newComment.projectId === projectId) {
        // Add new comment to the list (respecting current sort/filter)
        setComments(prevComments => {
          // Check if comment already exists (avoid duplicates)
          if (prevComments.some(c => c.id === newComment.id)) {
            return prevComments;
          }
          // Add to beginning for newest first, or end for oldest first
          if (sortBy === 'newest') {
            return [newComment, ...prevComments];
          } else {
            return [...prevComments, newComment];
          }
        });
      }
    });

    // Listen for reaction updates
    socketRef.current.on('comment_reaction_updated', (reactionData) => {
      console.log('📨 Received comment_reaction_updated event:', reactionData);
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === reactionData.commentId) {
            // Update counts but preserve current user's reaction state
            // (their own reaction is already updated locally)
            return {
              ...comment,
              likes: reactionData.likes,
              hearts: reactionData.hearts
              // Don't update userReaction here - it's already correct from local state
            };
          }
          return comment;
        })
      );
    });

    // Listen for comment deletions
    socketRef.current.on('comment_deleted', (deletionData) => {
      console.log('📨 Received comment_deleted event:', deletionData);
      if (deletionData.projectId === projectId) {
        setComments(prevComments =>
          prevComments.filter(comment => comment.id !== deletionData.commentId)
        );
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_project', { projectId });
        socketRef.current.disconnect();
        console.log('🔌 Feedback Socket.IO disconnected (cleanup)');
      }
    };
  }, [projectId, sortBy]);

  // Effect to add/remove body class for full-screen blur when modals are open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (showDeleteModal || showLogoutModal || showImageLightbox || showSuccessModal || showLoginSuccessModal || showLogoutSuccessModal) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    }
    
    // Cleanup function
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('modal-open');
      }
    };
  }, [showDeleteModal, showLogoutModal, showImageLightbox, showSuccessModal, showLoginSuccessModal, showLogoutSuccessModal]);

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Project Feedback
            </h2>
            <p className="text-gray-600 mt-1">Share your thoughts and feedback about this project</p>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                  title={`Logged in as ${currentUser.name || currentUser.email}`}
                >
                  {currentUser.profilePicture ? (
                    <img
                      src={currentUser.profilePicture}
                      alt={currentUser.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 shadow-md"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md border-2 border-blue-400">
                      {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
                {showLogoutMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowLogoutMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {currentUser.name || currentUser.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                        {isSystemAdmin && (
                          <p className="text-xs text-blue-600 font-medium mt-1">System Administrator</p>
                        )}
                      </div>
                      {!isSystemAdmin && (
                        <button
                          onClick={handleLogoutClick}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                          </svg>
                          Logout
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                title="Login with Google to get a verified badge on your comments"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Login with Google
              </button>
            )}
            {!isSystemAdmin && (
              <button
                onClick={() => setShowCommentForm(!showCommentForm)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                {showCommentForm ? 'Cancel' : 'Add Comment'}
              </button>
            )}
          </div>
        </div>

        {/* Sorting and Filtering */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_liked">Most Liked</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Filter:</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-white"
            >
              <option value="all">All Comments</option>
              <option value="most_liked">Most Liked</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-600 font-medium">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </div>
        </div>

        {/* Comment Form */}
        {showCommentForm && (
          <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-lg">
            <div className="mb-4 p-4 bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-300 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div className="flex-1">
                  {isAuthenticated ? (
                    <div className="text-sm text-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="font-semibold text-green-700">✓ You're logged in!</p>
                      </div>
                      <p className="text-blue-700">Your comments will show with a verified badge.</p>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">💡 No login required!</p>
                      <p className="text-blue-700 mb-3">You can comment anonymously, or log in to show as a verified user. All comments are moderated for professionalism.</p>
                      <button
                        onClick={handleGoogleLogin}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-sm"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Login with Google
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <form onSubmit={submitComment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name {isAuthenticated ? '(Your Google Account Name)' : '(Optional)'}
                  {!isAuthenticated && <span className="text-xs font-normal text-gray-500 ml-2">Leave blank to post anonymously</span>}
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => {
                    if (!isAuthenticated) {
                      setAuthorName(e.target.value);
                    }
                  }}
                  placeholder={isAuthenticated ? "Your name from Google account" : "Your name (optional)"}
                  maxLength={100}
                  disabled={isAuthenticated}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isAuthenticated ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {isAuthenticated && (
                  <p className="text-xs text-gray-500 mt-1">Your name is automatically set from your Google account and cannot be changed.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Comment <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-500 ml-2">Minimum 3 characters</span>
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => {
                    if (e.target.value.length <= 5000) {
                      setCommentText(e.target.value);
                    }
                  }}
                  placeholder="Share your thoughts, suggestions, or feedback about this project..."
                  rows="4"
                  required
                  minLength={3}
                  maxLength={5000}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {commentText.length < 3 ? (
                      <span className="text-amber-600">At least {3 - commentText.length} more character{3 - commentText.length !== 1 ? 's' : ''} required</span>
                    ) : (
                      <span>{commentText.length}/5000 characters</span>
                    )}
                  </p>
                  {commentText.length > 4500 && (
                    <p className="text-xs text-amber-600">Approaching character limit</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {submitting ? 'Submitting...' : 'Submit Comment'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentForm(false);
                    setCommentText('');
                    setAuthorName('');
                    // Clear images
                    selectedImages.forEach(() => {
                      imagePreviews.forEach(url => URL.revokeObjectURL(url));
                    });
                    setSelectedImages([]);
                    setImagePreviews([]);
                  }}
                  className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
              
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Photos (Optional)
                  <span className="text-xs font-normal text-gray-500 ml-2">Max 2 images, 10MB each</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Choose Images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={selectedImages.length >= 2}
                    />
                  </label>
                  {selectedImages.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedImages.length}/2 images selected
                    </span>
                  )}
                </div>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 text-center truncate max-w-[128px]">
                          {(selectedImages[index].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No comments yet</h3>
          <p className="text-gray-500">Be the first to share your feedback about this project!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{comment.authorName}</span>
                      {!comment.isAnonymous && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                      {isSystemAdmin && (
                        <button
                          onClick={() => openDeleteModal(comment)}
                          className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Delete comment (System Admin only)"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                    {!comment.isAnonymous && comment.authorEmail && (
                      <div className="text-xs text-gray-500 mt-0.5">{comment.authorEmail}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">{formatDate(comment.createdAt)}</div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              
              {/* Display Images */}
              {comment.images && comment.images.length > 0 && (
                <div className="mt-4 mb-4 flex flex-wrap gap-3">
                  {comment.images.map((imageUrl, imgIndex) => {
                    // Ensure full URL for images
                    let fullImageUrl = imageUrl;
                    if (!imageUrl.startsWith('http')) {
                      // Handle relative paths
                      const baseUrl = API_URL.replace('/api/project-comments', '');
                      if (imageUrl.startsWith('/')) {
                        fullImageUrl = `${baseUrl}${imageUrl}`;
                      } else {
                        fullImageUrl = `${baseUrl}/${imageUrl}`;
                      }
                    }
                    
                    return (
                      <div 
                        key={imgIndex} 
                        className="relative group cursor-pointer"
                        onClick={() => openImageLightbox(fullImageUrl)}
                      >
                        <img
                          src={fullImageUrl}
                          alt={`Comment image ${imgIndex + 1}`}
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                          <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Reactions */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => toggleReaction(comment.id, 'like')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    comment.userReaction === 'like'
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${comment.userReaction === 'like' ? 'fill-blue-600' : ''}`}
                    fill={comment.userReaction === 'like' ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                  </svg>
                  <span>{comment.likes || 0}</span>
                </button>
                
                <button
                  onClick={() => toggleReaction(comment.id, 'heart')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    comment.userReaction === 'heart'
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${comment.userReaction === 'heart' ? 'fill-red-600' : ''}`}
                    fill={comment.userReaction === 'heart' ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                  <span>{comment.hearts || 0}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Comment Confirmation Modal - Rendered via Portal */}
      {showDeleteModal && commentToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={closeDeleteModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Delete Comment</h3>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
              </div>
              <button
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-gray-800 text-sm leading-relaxed">
                  <strong className="text-yellow-800">Are you sure you want to delete this comment?</strong>
                </p>
                <p className="text-gray-700 text-sm mt-2">
                  This will permanently remove the comment and all associated reactions. This action cannot be undone.
                </p>
              </div>
              
              {/* Comment Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(commentToDelete.authorName || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{commentToDelete.authorName || 'Anonymous'}</p>
                    <p className="text-xs text-gray-500">{formatDate(commentToDelete.createdAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{commentToDelete.content}</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteComment}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Delete Comment
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Logout Confirmation Modal - Rendered via Portal */}
      {showLogoutModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Logout</h3>
                <p className="text-sm text-gray-600 mt-1">Confirm logout from your account</p>
              </div>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-gray-800 text-sm leading-relaxed">
                  <strong className="text-blue-800">Are you sure you want to logout?</strong>
                </p>
                <p className="text-gray-700 text-sm mt-2">
                  You will be signed out of your Google account. You can log in again anytime to continue commenting as a verified user.
                </p>
              </div>
              
              {/* User Info Preview */}
              {currentUser && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {(currentUser.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{currentUser.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{currentUser.email}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Lightbox Modal - Rendered via Portal */}
      {showImageLightbox && lightboxImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4"
          onClick={closeImageLightbox}
        >
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
          >
            <button
              onClick={closeImageLightbox}
              className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all z-10"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Success Modal - Rendered via Portal */}
      {showSuccessModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content */}
            <div className="p-8 text-center">
              {/* Animated Checkmark Circle */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Outer circle with animation */}
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center relative overflow-hidden">
                    {/* Animated checkmark */}
                    <svg 
                      className="w-12 h-12 text-green-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: 'drawCheckmark 0.6s ease-out forwards'
                      }}
                    >
                      <path 
                        d="M5 13l4 4L19 7"
                        style={{
                          strokeDasharray: '20',
                          strokeDashoffset: '20',
                          animation: 'drawCheckmark 0.6s ease-out forwards'
                        }}
                      />
                    </svg>
                  </div>
                  {/* Success rings animation */}
                  <div className="absolute inset-0 w-20 h-20 bg-green-200 rounded-full animate-ping opacity-20"></div>
                </div>
              </div>
              
              {/* Success Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Comment Deleted
              </h3>
              <p className="text-gray-600 mb-6">
                The comment has been successfully deleted.
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Login Success Modal - Rendered via Portal */}
      {showLoginSuccessModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowLoginSuccessModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content */}
            <div className="p-8 text-center">
              {/* Animated Checkmark Circle */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Outer circle with animation */}
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center relative overflow-hidden">
                    {/* Animated checkmark */}
                    <svg 
                      className="w-12 h-12 text-blue-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: 'drawCheckmark 0.6s ease-out forwards'
                      }}
                    >
                      <path 
                        d="M5 13l4 4L19 7"
                        style={{
                          strokeDasharray: '20',
                          strokeDashoffset: '20',
                          animation: 'drawCheckmark 0.6s ease-out forwards'
                        }}
                      />
                    </svg>
                  </div>
                  {/* Success rings animation */}
                  <div className="absolute inset-0 w-20 h-20 bg-blue-200 rounded-full animate-ping opacity-20"></div>
                </div>
              </div>
              
              {/* Success Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Login Successful!
              </h3>
              <p className="text-gray-600 mb-6">
                Welcome, <span className="font-semibold text-blue-600">{loginSuccessUserName}</span>! Your comments will now show with a verified badge.
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => setShowLoginSuccessModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Logout Success Modal - Rendered via Portal */}
      {showLogoutSuccessModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowLogoutSuccessModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content */}
            <div className="p-8 text-center">
              {/* Animated Checkmark Circle */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Outer circle with animation */}
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center relative overflow-hidden">
                    {/* Logout icon (door/sign out) */}
                    <svg 
                      className="w-12 h-12 text-gray-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: 'fadeIn 0.6s ease-out forwards'
                      }}
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </div>
                  {/* Success rings animation */}
                  <div className="absolute inset-0 w-20 h-20 bg-gray-200 rounded-full animate-ping opacity-20"></div>
                </div>
              </div>
              
              {/* Success Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Logged Out Successfully
              </h3>
              <p className="text-gray-600 mb-6">
                You have been successfully logged out. You can continue browsing as a guest.
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => setShowLogoutSuccessModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Debug function for logout testing (available in browser console)
if (typeof window !== 'undefined') {
  window.testGmailLogout = async function() {
    console.log('🔍 Testing Gmail Logout Debug...\n');
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No token found. Please login with Gmail first.');
      return;
    }
    
    console.log('✅ Token found:', token.substring(0, 20) + '...');
    
    const API_URL = getApiUrl();
    // Construct logout URL properly
    // API_URL is already the base API URL (e.g., "http://localhost:3000/api")
    // Just append /auth/logout
    const logoutUrl = `${API_URL}/auth/logout`;
    
    console.log(`🌐 Logout URL: ${logoutUrl}\n`);
    
    console.log('📤 Calling logout endpoint...');
    try {
      const response = await axios.post(logoutUrl, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Logout endpoint response:', response.data);
      console.log('✅ Status:', response.status);
      console.log('\n✅ Logout endpoint call successful!');
      console.log('📝 Check the backend console for:');
      console.log('   - "✅ Updated lastLogoutAt for user..."');
      console.log('   - "📤 Emitted gmail_user_logged_out to admin dashboard..."');
    } catch (error) {
      console.error('❌ Error calling logout endpoint:', error);
      console.error('   Status:', error.response?.status);
      console.error('   Response:', error.response?.data);
      console.error('   Message:', error.message);
    }
  };
  
  console.log('💡 Debug function available: window.testGmailLogout()');
  console.log('   Run this in the console to test logout endpoint');
}


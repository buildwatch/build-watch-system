import React, { useState, useEffect, useRef } from 'react';
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

export default function PhotoVideoComments({ projectId, mediaUrl, mediaType, mediaName }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
  const [showLogoutSuccessModal, setShowLogoutSuccessModal] = useState(false);
  const [loginSuccessUserName, setLoginSuccessUserName] = useState('');
  const sessionId = useRef(null);
  const socketRef = useRef(null);

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
  };

  // Confirm logout
  const confirmLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // IMPORTANT: Call logout endpoint BEFORE clearing token
      if (token) {
        try {
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
        }
      }
      
      // Clear local storage after API call
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsSystemAdmin(false);
      setAuthorName('');
      setShowLogoutModal(false);
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
      loadComments();
    }
  };

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
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsSystemAdmin(false);
        }
      };
      
      checkAuth();
      // Check auth status periodically and on storage changes (to sync with Feedback panel login)
      const interval = setInterval(checkAuth, 2000);
      window.addEventListener('storage', checkAuth);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', checkAuth);
      };
    }
  }, [authorName]);

  // Initialize session ID and load Google Sign-In script
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
        if (existingScript && existingScript.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
        }
      };
    }
  }, []);

  // Setup Socket.IO connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined' || !projectId) return;

    const socketUrl = getSocketUrl();
    console.log('🔌 Connecting to Socket.IO:', `${socketUrl}/feedback`);
    
    socketRef.current = io(`${socketUrl}/feedback`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Photo/Video Comments Socket.IO connected');
      // Join project room
      const projectRoom = `project:${projectId}`;
      socketRef.current.emit('join_room', projectRoom);
      console.log(`📥 Joined project room: ${projectRoom}`);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Photo/Video Comments Socket.IO disconnected');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Photo/Video Comments Socket.IO connection error:', error);
    });

    // Listen for new comments
    socketRef.current.on('new_comment', (newComment) => {
      console.log('📨 Received new_comment event:', newComment);
      // Check if comment is for this media item
      if (newComment.projectId === projectId && 
          newComment.mediaUrl === mediaUrl) {
        setComments(prevComments => {
          if (prevComments.some(c => c.id === newComment.id)) {
            return prevComments;
          }
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
            return {
              ...comment,
              likes: reactionData.likes,
              hearts: reactionData.hearts
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
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [projectId, mediaUrl, sortBy]);

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
        params: { sort: sortBy, filter: 'all' },
        headers
      });

      if (response.data.success) {
        // Filter comments for this specific media item
        // We'll store mediaUrl in comment content as metadata or filter by checking content
        const allComments = response.data.comments || [];
        const mediaComments = allComments.filter(comment => {
          // Check if comment content contains media identifier
          // Format: [MEDIA:mediaUrl] at the start of content
          const content = comment.content || '';
          return content.startsWith(`[MEDIA:${mediaUrl}]`) || 
                 content.includes(`mediaUrl:${mediaUrl}`);
        });
        
        // Extract media URL and clean content, ensure reaction data is present
        const cleanedComments = mediaComments.map(comment => {
          const content = comment.content || '';
          // Extract media URL from [MEDIA:url] format
          const mediaUrlMatch = content.match(/\[MEDIA:([^\]]+)\]/);
          const extractedMediaUrl = mediaUrlMatch ? mediaUrlMatch[1] : null;
          // Remove media identifier from display
          const cleanedContent = content.replace(/^\[MEDIA:[^\]]+\]\s*/, '').replace(/mediaUrl:[^\s]+\s*/, '').trim();
          
          return {
            ...comment,
            content: cleanedContent,
            mediaUrl: extractedMediaUrl || mediaUrl, // Use extracted URL or fallback to prop
            likes: comment.likes || 0,
            hearts: comment.hearts || 0,
            userReaction: comment.userReaction || null
          };
        });
        
        setComments(cleanedComments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load comments when component mounts or filters change
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId.current && projectId && mediaUrl) {
      loadComments();
    }
  }, [projectId, mediaUrl, sortBy]);
  
  // Load comments once session ID is initialized
  useEffect(() => {
    if (sessionId.current && typeof window !== 'undefined' && projectId && mediaUrl) {
      loadComments();
    }
  }, [sessionId.current]);

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedImages.length + files.length > 2) {
      alert('Maximum 2 images allowed per comment');
      e.target.value = '';
      return;
    }
    
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`Some files exceed 10MB limit. Please select smaller files.`);
      e.target.value = '';
      return;
    }
    
    const invalidTypes = files.filter(file => !file.type.startsWith('image/'));
    if (invalidTypes.length > 0) {
      alert('Only image files are allowed (JPEG, PNG, GIF, WebP, BMP)');
      e.target.value = '';
      return;
    }
    
    const newImages = [...selectedImages, ...files];
    setSelectedImages(newImages);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
    
    e.target.value = '';
  };
  
  // Remove image
  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
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
    
    if (!commentText.trim()) {
      alert('Please enter a comment');
      return;
    }
    
    if (!authorName.trim() && !isAuthenticated) {
      alert('Please enter your name');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepend media identifier to comment content
      const commentContent = `[MEDIA:${mediaUrl}] ${commentText.trim()}`;
      
      const formData = new FormData();
      formData.append('content', commentContent);
      formData.append('authorName', authorName.trim() || (currentUser?.name || 'Anonymous'));
      formData.append('isAnonymous', !isAuthenticated);
      
      if (selectedImages.length > 0) {
        selectedImages.forEach((file) => {
          formData.append('images', file);
        });
      }
      
      const headers = {
        'Content-Type': 'multipart/form-data'
      };
      
      if (sessionId.current) {
        headers['X-Session-ID'] = sessionId.current;
      }
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(
        `${API_URL}/project-comments/project/${projectId}`,
        formData,
        { headers }
      );
      
      if (response.data.success) {
        // Add mediaUrl to the comment for filtering
        const newComment = {
          ...response.data.comment,
          content: commentText.trim(), // Display without media identifier
          mediaUrl: mediaUrl
        };
        
        setComments(prev => {
          if (sortBy === 'newest') {
            return [newComment, ...prev];
          } else {
            return [...prev, newComment];
          }
        });
        
        setCommentText('');
        setSelectedImages([]);
        setImagePreviews([]);
        setShowCommentForm(false);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert(error.response?.data?.error || 'Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle reaction
  const toggleReaction = async (commentId, reactionType) => {
    try {
      const headers = {};
      if (sessionId.current) {
        headers['X-Session-ID'] = sessionId.current;
      }
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(`${API_URL}/project-comments/${commentId}/reaction`, {
        reactionType
      }, {
        headers
      });

      if (response.data.success) {
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

  // Delete comment (admin only)
  const deleteComment = async (commentId) => {
    if (!isSystemAdmin) return;
    
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to delete comments');
        return;
      }
      
      const response = await axios.delete(
        `${API_URL}/project-comments/${commentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error.response?.data?.error || 'Failed to delete comment');
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

  if (!projectId || !mediaUrl) {
    return null;
  }

  return (
    <div className="mt-6 border-t-2 border-gray-100 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
          <h4 className="text-lg font-bold text-gray-800">
            Comments <span className="text-blue-600">({comments.length})</span>
          </h4>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            {showCommentForm ? 'Cancel' : '+ Add Comment'}
          </button>
        </div>
      </div>

      {/* Login/Logout Section */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200">
        {!isAuthenticated ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">Want to post verified comments?</p>
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-white border-2 border-gray-300 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login with Google
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{currentUser?.name || currentUser?.email}</span>
                  <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-semibold border border-blue-300">✓ Verified</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">You can post verified comments</p>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all font-medium border border-red-200 hover:border-red-300"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {showCommentForm && (
        <form onSubmit={submitComment} className="mb-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
          <div className="mb-4">
            {!isAuthenticated && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white"
                  required={!isAuthenticated}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Comment</label>
              <textarea
                placeholder="Share your thoughts about this media..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none transition-all bg-white"
                required
              />
            </div>
          </div>
          
          {imagePreviews.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-xl cursor-pointer border-2 border-gray-200 hover:border-blue-600 transition-all shadow-sm hover:shadow-md"
                    onClick={() => openImageLightbox(preview)}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 shadow-lg transition-all transform hover:scale-110"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <label className="cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                disabled={selectedImages.length >= 2}
              />
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all group-hover:shadow-md">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                  Add Images {selectedImages.length > 0 && `(${selectedImages.length}/2)`}
                </span>
              </div>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-gray-600 font-medium">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-1">No comments yet</p>
          <p className="text-sm text-gray-500">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-2xl p-5 border-2 border-gray-200 hover:border-blue-600/30 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {(comment.isAnonymous ? comment.authorName : (comment.user?.name || comment.authorName || 'Anonymous')).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">
                          {comment.isAnonymous ? comment.authorName : (comment.user?.name || comment.authorName || 'Anonymous')}
                        </span>
                        {!comment.isAnonymous && comment.user && (
                          <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-semibold border border-blue-300">
                            ✓ Verified
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Media thumbnail if comment is associated with media */}
                  {comment.mediaUrl && comment.mediaUrl !== mediaUrl && (
                    <div className="mb-4">
                      <div className="inline-block border-2 border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer group"
                           onClick={() => {
                             if (mediaType === 'photo') {
                               window.showFullPhotoView?.(comment.mediaUrl, 'Photo');
                             } else if (mediaType === 'video') {
                               window.showFullVideoView?.(comment.mediaUrl, 'Video');
                             }
                           }}>
                        {mediaType === 'photo' ? (
                          <img
                            src={comment.mediaUrl}
                            alt="Related media"
                            className="w-36 h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-36 h-36 bg-gradient-to-br from-gray-900 to-gray-800 relative flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                            <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Comment text - only show if there's actual text content */}
                  {comment.content && comment.content.trim() && (
                    <p className="text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed text-base">{comment.content}</p>
                  )}
                  
                  {comment.images && comment.images.length > 0 && (
                    <div className="flex gap-3 mb-4 flex-wrap">
                      {comment.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Comment image ${index + 1}`}
                            className="w-28 h-28 object-cover rounded-xl cursor-pointer border-2 border-gray-200 hover:border-blue-600 transition-all shadow-sm hover:shadow-md"
                            onClick={() => openImageLightbox(imageUrl)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all flex items-center justify-center">
                            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => toggleReaction(comment.id, 'like')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                        comment.userReaction === 'like'
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-semibold border-2 border-blue-200 shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <span className="text-lg">👍</span>
                      <span className="text-sm font-semibold">{comment.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => toggleReaction(comment.id, 'heart')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                        comment.userReaction === 'heart'
                          ? 'bg-gradient-to-r from-red-50 to-pink-100 text-red-600 font-semibold border-2 border-red-200 shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 border-2 border-gray-200 hover:border-red-200'
                      }`}
                    >
                      <span className="text-lg">❤️</span>
                      <span className="text-sm font-semibold">{comment.hearts || 0}</span>
                    </button>
                  </div>
                </div>
                
                {isSystemAdmin && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                    title="Delete comment (Admin only)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      {showImageLightbox && lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeImageLightbox}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageLightbox}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              ×
            </button>
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout? You'll need to login again to post verified comments.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Success Modal */}
      {showLoginSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Login Successful!</h3>
            <p className="text-gray-600 mb-4">Welcome back, {loginSuccessUserName}!</p>
            <p className="text-sm text-gray-500">You can now post verified comments.</p>
          </div>
        </div>
      )}

      {/* Logout Success Modal */}
      {showLogoutSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Logged Out Successfully</h3>
            <p className="text-gray-600">You have been logged out. Login again to post verified comments.</p>
          </div>
        </div>
      )}
    </div>
  );
}


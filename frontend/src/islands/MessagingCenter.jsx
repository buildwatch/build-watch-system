import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import ProjectContextCenter from './ProjectContextCenter.jsx';
import ProjectSearchCenter from './ProjectSearchCenter.jsx';
import ProjectAlertsCenter from './ProjectAlertsCenter.jsx';
import ProjectAnalyticsCenter from './ProjectAnalyticsCenter.jsx';

const API_URL = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.protocol}//${window.location.hostname}/api`)
  : 'http://localhost:3000/api';

const SOCKET_URL = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : `${window.location.protocol}//${window.location.hostname}`)
  : 'http://localhost:3000';

// Profile Picture Image Component - handles base64 data URLs, regular URLs, and API endpoint URLs
// Uses base64 directly (fast), converts URLs to blob URLs, or fetches from API endpoint
function ProfilePictureImage({ userId, url, alt, className = "w-full h-full object-cover" }) {
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
        // If it's already a data URL or blob URL, use it directly (fastest)
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

        // Get auth token
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        
        // If it's an API endpoint URL, fetch JSON response first
        let imageUrl = url;
        if (url.startsWith('/api/profile/picture/') || url.includes('/api/profile/picture/')) {
          // Fetch from API endpoint - it returns JSON with base64 data URL
          const apiUrl = url.startsWith('/') && !url.startsWith('//') && !url.startsWith('http')
            ? window.location.origin + url
            : url;
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            }
          });
          
          if (apiResponse.ok && isMounted) {
            const data = await apiResponse.json();
            if (data.success && data.profilePictureUrl) {
              // If API returns base64, use it directly
              if (data.profilePictureUrl.startsWith('data:')) {
                setImgSrc(data.profilePictureUrl);
                setLoading(false);
                return;
              } else {
                // If API returns regular URL, use that
                imageUrl = data.profilePictureUrl;
              }
            } else {
              setError(true);
              setLoading(false);
              return;
            }
          } else {
            setError(true);
            setLoading(false);
            return;
          }
        }
        
        // For regular URLs, fetch image and convert to blob URL
        const fullUrl = imageUrl.startsWith('/') && !imageUrl.startsWith('//') && !imageUrl.startsWith('http')
          ? window.location.origin + imageUrl
          : imageUrl;
        
        const response = await fetch(fullUrl, {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });
        
        if (response.ok && isMounted) {
          const blob = await response.blob();
          blobUrl = URL.createObjectURL(blob);
          setImgSrc(blobUrl);
          setLoading(false);
        } else if (isMounted) {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error(`⚠️ Failed to load profile picture for ${userId}:`, err);
        console.error(`   URL attempted: ${url}`);
        console.error(`   Error type: ${err.name}, Message: ${err.message}`);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      // Clean up blob URL to prevent memory leaks
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url, userId]);

  // If there's an error and we're not loading, return null to show fallback
  if (error && !loading) {
    // Log error for debugging
    console.error(`❌ ProfilePictureImage: Failed to load for ${userId}, URL: ${url?.substring(0, 50)}...`);
    return null; // Let fallback show
  }

  // If we have a source, render the image
  if (imgSrc) {
    return (
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className={className}
        onError={() => {
          console.error(`❌ ProfilePictureImage: Image load error for ${userId}`);
          setError(true);
          setLoading(false);
          if (imgRef.current) {
            imgRef.current.style.display = 'none';
            if (imgRef.current.nextSibling) {
              imgRef.current.nextSibling.style.display = 'flex';
            }
          }
        }}
        onLoad={() => {
          setLoading(false);
        }}
        style={{ display: 'block' }}
      />
    );
  }

  // While loading or no source yet, return null to show fallback initial
  // The component will re-render once imgSrc is set
  return null;
}

// Image Thumbnail Component with Data URL conversion (same approach as progress-timeline.astro)
function ImageThumbnail({ imageUrl, alt, onView }) {
  const [imgSrc, setImgSrc] = useState('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOTlBM0FFIi8+Cjwvc3ZnPgo=');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        console.log(`🔄 Converting image URL to data URL: ${imageUrl}`);
        const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
        if (response.ok && isMounted) {
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted) {
              setImgSrc(reader.result);
              setLoading(false);
              console.log(`✅ Image converted to data URL successfully`);
            }
          };
          reader.onerror = () => {
            if (isMounted) {
              setError(true);
              setLoading(false);
            }
          };
          reader.readAsDataURL(blob);
        } else if (isMounted) {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error(`⚠️ Failed to convert image URL to data URL:`, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  if (error) {
    return (
      <div className="relative group">
        <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      {loading && (
        <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      )}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className="max-w-full max-h-64 h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover shadow-sm"
        onClick={onView}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}

// Media Thumbnail Component for Photos & Videos panel
function MediaThumbnail({ imageUrl, alt, onView }) {
  const [imgSrc, setImgSrc] = useState('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOTlBM0FFIi8+Cjwvc3ZnPgo=');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        console.log(`🔄 Converting media URL to data URL: ${imageUrl}`);
        const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
        if (response.ok && isMounted) {
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted) {
              setImgSrc(reader.result);
              setLoading(false);
              console.log(`✅ Media converted to data URL successfully`);
            }
          };
          reader.onerror = () => {
            if (isMounted) {
              setError(true);
              setLoading(false);
            }
          };
          reader.readAsDataURL(blob);
        } else if (isMounted) {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error(`⚠️ Failed to convert media URL to data URL:`, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  if (error) {
    return (
      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="cursor-pointer relative" onClick={onView}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10">
          <div className="text-xs text-gray-500">Loading...</div>
        </div>
      )}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}

// Image Lightbox Component with Data URL conversion
function ImageLightbox({ imageUrl, onClose }) {
  const [imgSrc, setImgSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        console.log(`🔄 Converting full image URL to data URL: ${imageUrl}`);
        const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
        if (response.ok && isMounted) {
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted) {
              setImgSrc(reader.result);
              setLoading(false);
              console.log(`✅ Full image converted to data URL successfully`);
            }
          };
          reader.onerror = () => {
            if (isMounted) {
              setError(true);
              setLoading(false);
            }
          };
          reader.readAsDataURL(blob);
        } else if (isMounted) {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error(`⚠️ Failed to convert full image URL to data URL:`, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading image...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Failed to load image</p>
            </div>
          </div>
        )}
        {imgSrc && !loading && !error && (
          <img
            ref={imgRef}
            src={imgSrc}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/70 hover:bg-black/90 rounded-full p-3 z-10 shadow-lg"
          title="Close (ESC)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* Open in New Tab Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(imageUrl, '_blank');
          }}
          className="absolute bottom-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/70 hover:bg-black/90 rounded-full p-3 z-10 shadow-lg"
          title="Open in new tab"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Video Lightbox Component for full-view modal
function VideoLightbox({ videoUrl, videoTitle, onClose }) {
  const videoRef = useRef(null);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Cleanup video when closing
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
        {/* Video Container */}
        <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <video 
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            style={{ maxHeight: '85vh', maxWidth: '85vw' }}
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
        
        {/* Video Title */}
        {videoTitle && (
          <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg z-20 shadow-lg">
            <p className="text-sm font-medium">{videoTitle}</p>
          </div>
        )}
        
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current) {
              videoRef.current.pause();
            }
            onClose();
          }}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/70 hover:bg-black/90 rounded-full p-3 z-20 shadow-lg"
          title="Close (ESC)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Open in New Tab Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(videoUrl, '_blank');
          }}
          className="absolute bottom-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/70 hover:bg-black/90 rounded-full p-3 z-20 shadow-lg"
          title="Open in new tab"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
        
        {/* Instructions */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg z-20 shadow-lg">
          <p className="text-xs text-center">Click outside or press Esc to close • Use video controls to play/pause</p>
        </div>
      </div>
    </div>
  );
}

export default function MessagingCenter({ theme = 'green' }) {
  // Add fadeIn animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .animate-fadeIn {
        animation: fadeIn 0.2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [allConversations, setAllConversations] = useState([]); // Store all conversations (never filtered)
  const [conversations, setConversations] = useState([]); // Filtered conversations for display
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'department', 'unread', 'project'
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectFilterId, setProjectFilterId] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]); // Store projects for project badge display
  const [showAnalytics, setShowAnalytics] = useState(false); // Show project analytics widget
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [userStatusMap, setUserStatusMap] = useState({}); // Store user activity status
  const [profilePictures, setProfilePictures] = useState({}); // Store loaded profile pictures
  const [showMediaHistory, setShowMediaHistory] = useState(false);
  const [showFilesHistory, setShowFilesHistory] = useState(false);
  const [mediaHistory, setMediaHistory] = useState([]);
  const [filesHistory, setFilesHistory] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesFilterTab, setFilesFilterTab] = useState('all'); // 'all', 'received', 'sent'
  const [filesDateFilter, setFilesDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month'
  const [mediaFilterTab, setMediaFilterTab] = useState('all'); // 'all', 'received', 'sent'
  const [mediaDateFilter, setMediaDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month'
  const [selectedImage, setSelectedImage] = useState(null); // For image lightbox/modal
  const [selectedVideo, setSelectedVideo] = useState(null); // For video lightbox/modal { url, title }
  const [showBadWordModal, setShowBadWordModal] = useState(false); // For bad word warning modal
  const [showReactionPicker, setShowReactionPicker] = useState(null); // Message ID for which reaction picker is shown
  const [showValidationModal, setShowValidationModal] = useState(false); // For validation error modal
  const [validationMessage, setValidationMessage] = useState(''); // Validation error message
  const [filePreviews, setFilePreviews] = useState({}); // Store file preview URLs { fileIndex: previewUrl }
  
  // Store refs for debug access
  const selectedConversationRef = useRef(null);
  const conversationsRef = useRef([]);
  const messagesRef = useRef([]);
  const filesHistoryRef = useRef([]);
  
  // Update refs when state changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    conversationsRef.current = conversations;
    messagesRef.current = messages;
    filesHistoryRef.current = filesHistory;
  }, [selectedConversation, conversations, messages, filesHistory]);
  
  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showReactionPicker && !e.target.closest('.reaction-picker-container')) {
        setShowReactionPicker(null);
      }
    };

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showReactionPicker]);
  
  // Close image modal on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null);
        }
        if (selectedVideo) {
          setSelectedVideo(null);
        }
        if (showReactionPicker) {
          setShowReactionPicker(null);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedImage, selectedVideo]);

  // Helper function to convert server URL to data URL (same approach as progress-timeline.astro)
  const convertToDataURL = async (serverUrl) => {
    try {
      console.log(`🔄 Converting server URL to data URL: ${serverUrl}`);
      const response = await fetch(serverUrl, { mode: 'cors', credentials: 'omit' });
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        console.log(`✅ Successfully converted to data URL`);
        return dataUrl;
      }
    } catch (error) {
      console.error(`⚠️ Failed to convert server URL to data URL:`, error);
    }
    return serverUrl; // Fallback to original URL
  };

  // Theme colors
  const themes = {
    green: {
      primary: 'bg-green-600',
      primaryHover: 'hover:bg-green-700',
      primaryLight: 'bg-green-50',
      primaryBorder: 'border-green-200',
      primaryText: 'text-green-700',
      primaryBg: 'from-green-50 to-green-100',
      accent: 'text-green-600',
      focusRing: 'focus:ring-green-500',
      borderColor: 'border-green-500'
    },
    orange: {
      primary: 'bg-orange-600',
      primaryHover: 'hover:bg-orange-700',
      primaryLight: 'bg-orange-50',
      primaryBorder: 'border-orange-200',
      primaryText: 'text-orange-700',
      primaryBg: 'from-orange-50 to-orange-100',
      accent: 'text-orange-600',
      focusRing: 'focus:ring-orange-500',
      borderColor: 'border-orange-500'
    },
    'light-blue': {
      primary: 'bg-sky-600',
      primaryHover: 'hover:bg-sky-700',
      primaryLight: 'bg-sky-50',
      primaryBorder: 'border-sky-200',
      primaryText: 'text-sky-700',
      primaryBg: 'from-sky-50 to-sky-100',
      accent: 'text-sky-600',
      focusRing: 'focus:ring-sky-500',
      borderColor: 'border-sky-500'
    },
    blue: {
      primary: 'bg-blue-600',
      primaryHover: 'hover:bg-blue-700',
      primaryLight: 'bg-blue-50',
      primaryBorder: 'border-blue-200',
      primaryText: 'text-blue-700',
      primaryBg: 'from-blue-50 to-blue-100',
      accent: 'text-blue-600',
      focusRing: 'focus:ring-blue-500',
      borderColor: 'border-blue-500'
    },
    black: {
      primary: 'bg-gray-900',
      primaryHover: 'hover:bg-black',
      primaryLight: 'bg-gray-100',
      primaryBorder: 'border-gray-300',
      primaryText: 'text-gray-900',
      primaryBg: 'from-gray-50 to-gray-100',
      accent: 'text-gray-900',
      focusRing: 'focus:ring-gray-700',
      borderColor: 'border-gray-900'
    }
  };

  const currentTheme = themes[theme] || themes.green;

  // Get auth token
  const getToken = () => {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
      const token = tokenCookie ? tokenCookie.split('=')[1] : null;
      
      // Also try localStorage as fallback
      if (!token && typeof localStorage !== 'undefined') {
        const localToken = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (localToken) {
          console.log('📝 Token found in localStorage');
          return localToken;
        }
      }
      
      return token;
    }
    return null;
  };
  
  // Get current user ID from token - exposed globally for debugging
  // Handle adding/removing reactions
  const handleReaction = async (messageId, emoji) => {
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_URL}/messages/reaction/${messageId}`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update message reactions in state (socket will also update it, but this is optimistic)
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === messageId
              ? { ...msg, reactions: response.data.reactions }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error adding/removing reaction:', error);
    }
  };

  const getCurrentUserIdFromToken = () => {
    try {
      const token = getToken();
      if (!token) {
        console.warn('⚠️ No token found');
        return null;
      }
      
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid token format (not a JWT)');
        return null;
      }
      
      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      console.log('📝 Token payload:', payload);
      
      // Try different possible ID fields - check userId first (as JWT uses userId)
      const userId = payload.userId || payload.id || payload.sub || payload.user_id;
      
      if (!userId) {
        console.warn('⚠️ No user ID found in token payload');
        console.warn('   Available fields:', Object.keys(payload));
      }
      
      return userId ? String(userId) : null;
    } catch (e) {
      console.error('❌ Error parsing token:', e);
      return null;
    }
  };

  // Initialize Socket.IO - separate effect that doesn't depend on selectedConversation
  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.error('❌ No token found, cannot connect to socket');
      return;
    }

    console.log('🔌 Initializing Socket.IO connection...');
    console.log('🔌 Socket URL:', SOCKET_URL);
    console.log('🔌 Token present:', !!token);
    
    // Verify token and user ID before connecting
    const userId = getCurrentUserIdFromToken();
    console.log('🔌 Current User ID from token:', userId);
    
    if (!userId) {
      console.error('❌ Cannot get user ID from token, socket connection may fail');
      console.log('🔍 Token preview:', token.substring(0, 50) + '...');
    }

    socketRef.current = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      upgrade: true,
      timeout: 20000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
      console.log('✅ Socket ID:', socketRef.current.id);
      console.log('✅ Socket connected:', socketRef.current.connected);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('❌ Error message:', error.message);
    });

    socketRef.current.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Log all events for debugging
    const originalEmit = socketRef.current.emit;
    socketRef.current.emit = function(...args) {
      console.log('📤 Socket emit:', args[0], args[1]);
      return originalEmit.apply(this, args);
    };
    
    // Listen for ALL events (Socket.IO v4+ supports onAny)
    if (socketRef.current.onAny) {
      socketRef.current.onAny((event, ...args) => {
        console.log('🔔 [onAny] Socket event received:', event, args);
      });
    } else {
      // Fallback: manually listen to all known events
      ['new_message', 'message_sent', 'user_typing', 'message_read_receipt', 'connect', 'disconnect', 'error'].forEach(eventName => {
        socketRef.current.on(eventName, (...args) => {
          console.log(`🔔 [${eventName}] Socket event received:`, args);
        });
      });
    }

    // Make socket available globally for debugging
    if (typeof window !== 'undefined') {
      window.debugSocket = socketRef.current;
      
      // Use the global function
      const getCurrentUserIdHelper = getCurrentUserIdFromToken;
      
      window.debugMessaging = {
        getSocket: () => socketRef.current,
        getSocketId: () => socketRef.current?.id,
        isConnected: () => socketRef.current?.connected,
        getCurrentUserId: getCurrentUserIdHelper,
        getSelectedConversation: () => selectedConversationRef.current,
        getConversations: () => conversationsRef.current,
        getMessages: () => messagesRef.current,
        getFilesHistory: () => filesHistoryRef.current,
        getMediaHistory: () => mediaHistory,
        getProfilePictures: () => profilePictures,
        getProfilePictureUrl: (userId) => getProfilePictureUrl(userId),
        loadFilesHistory: loadFilesHistory,
        loadMediaHistory: loadMediaHistory,
        testConnection: () => {
          if (socketRef.current?.connected) {
            console.log('✅ Socket is connected');
            console.log('📊 Socket ID:', socketRef.current.id);
            console.log('📊 Current User ID:', getCurrentUserIdHelper());
          } else {
            console.error('❌ Socket is NOT connected');
          }
        },
        // Add method to manually listen for events
        listenForEvents: () => {
          if (!socketRef.current) {
            console.error('❌ Socket not available');
            return;
          }
          
          socketRef.current.on('new_message', (data) => {
            console.log('🎯 DEBUG: new_message received:', data);
          });
          
          socketRef.current.on('message_sent', (data) => {
            console.log('🎯 DEBUG: message_sent received:', data);
          });
          
          console.log('✅ Manual event listeners added');
        },
        // Debug profile pictures
        debugProfilePictures: () => {
          const currentUserId = getCurrentUserIdHelper();
          const stored = localStorage.getItem('messaging_profile_pictures');
          console.log('🔍 ========== PROFILE PICTURE DEBUG ==========');
          console.log('Current User ID:', currentUserId);
          console.log('React State Pictures:', Object.keys(profilePictures).length);
          console.log('localStorage Pictures:', stored ? JSON.parse(stored) : null);
          
          if (stored) {
            const parsed = JSON.parse(stored);
            const currentUserPicture = parsed[currentUserId];
            const overwrites = Object.entries(parsed).filter(([key, value]) => 
              key !== currentUserId && value === currentUserPicture && value !== null
            );
            if (overwrites.length > 0) {
              console.warn('❌ FOUND OVERWRITES:', overwrites);
            }
          }
        },
        clearProfilePictures: () => {
          localStorage.removeItem('messaging_profile_pictures');
          setProfilePictures({});
          console.log('✅ Cleared profile pictures from localStorage and state');
        }
      };
      console.log('🔧 Debug helpers available: window.debugSocket, window.debugMessaging');
      console.log('🔧 Try: window.debugMessaging.testConnection()');
      console.log('🔧 Try: window.debugMessaging.listenForEvents()');
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection');
        socketRef.current.disconnect();
      }
    };
  }, []); // Only run once on mount

  // Handle real-time message events - separate effect that uses current state
  useEffect(() => {
    if (!socketRef.current) return;

    // Use the global function
    const getCurrentUserId = getCurrentUserIdFromToken;

    const handleNewMessage = (message) => {
      console.log('📨 New message received:', message);
      console.log('📨 Message senderId:', message.senderId);
      console.log('📨 Message recipientId:', message.recipientId);
      
      const currentUserId = getCurrentUserId();
      console.log('📨 Current user ID:', currentUserId);
      
      const isForMe = String(message.recipientId) === String(currentUserId);
      const partnerId = isForMe ? String(message.senderId) : String(message.recipientId);
      
      console.log('📨 Is for me:', isForMe);
      console.log('📨 Partner ID:', partnerId);
      console.log('📨 Selected conversation partner ID:', selectedConversation?.partnerId);
      
      // Update conversations list immediately (optimistically update state)
      setConversations(prev => {
        const updated = [...prev];
        let conversationFound = false;
        
        // Find and update existing conversation - compare as strings to handle UUIDs
        const updatedConvs = updated.map(conv => {
          const convPartnerId = String(conv.partnerId);
          if (convPartnerId === partnerId) {
            conversationFound = true;
            const isConversationOpen = selectedConversation && String(selectedConversation.partnerId) === partnerId;
            
            return {
              ...conv,
              lastMessage: {
                id: message.id,
                content: message.content,
                type: message.type,
                createdAt: message.createdAt || message.created_at || null,
                isRead: isForMe && isConversationOpen ? true : (conv.lastMessage?.isRead || false)
              },
              unreadCount: isForMe && !isConversationOpen
                ? (conv.unreadCount || 0) + 1 
                : (isForMe && isConversationOpen ? 0 : (conv.unreadCount || 0))
            };
          }
          return conv;
        });
        
        // If conversation doesn't exist, we need to load it from API
        if (!conversationFound) {
          console.log('📨 Conversation not found in list, loading from API');
          loadConversations();
          return updated;
        } else {
          const sorted = updatedConvs.sort((a, b) => {
            const aTime = new Date(a.lastMessage?.createdAt || a.lastMessage?.created_at || 0);
            const bTime = new Date(b.lastMessage?.createdAt || b.lastMessage?.created_at || 0);
            return bTime - aTime;
          });
          console.log('📨 Updated conversations list:', sorted);
          return sorted;
        }
      });
      
      // Check if this message is for the currently selected conversation
      // Compare as strings to handle UUID comparison issues
      const isSelectedConversation = selectedConversation && 
        (String(selectedConversation.partnerId) === partnerId ||
         String(selectedConversation.partnerId) === String(message.senderId) ||
         String(selectedConversation.partnerId) === String(message.recipientId));
      
      console.log('📨 Is selected conversation:', isSelectedConversation);
      
      // If the message is for the currently selected conversation, add it to messages automatically
      if (isSelectedConversation) {
        console.log('📨 Adding message to open conversation');
        // Normalize createdAt field and attachments for new messages
        let attachments = message.attachments;
        if (typeof attachments === 'string') {
          try {
            attachments = JSON.parse(attachments);
          } catch (e) {
            console.error('Error parsing attachments JSON in handleNewMessage:', e);
            attachments = [];
          }
        }
        if (!Array.isArray(attachments)) {
          attachments = attachments ? [attachments] : [];
        }
        
        const normalizedMessage = {
          ...message,
          createdAt: message.createdAt || message.created_at || null,
          attachments: attachments
        };
        console.log('📨 Normalized new message in handleNewMessage:', {
          id: normalizedMessage.id,
          createdAt: normalizedMessage.createdAt,
          created_at: message.created_at
        });
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg.id === normalizedMessage.id);
          if (exists) {
            console.log('📨 Message already exists, skipping');
            return prev;
          }
          console.log('📨 Adding new message to messages array');
          return [...prev, normalizedMessage];
        });
        scrollToBottom();
        
        // Refresh media/files history if message has attachments
        if (message.attachments && message.attachments.length > 0) {
          if (message.type === 'image' || message.type === 'video') {
            loadMediaHistory();
          } else if (message.type === 'file') {
            loadFilesHistory();
          }
        }
        
        // Mark as read automatically if we're viewing this conversation and we received it
        if (isForMe) {
          console.log('📨 Marking message as read');
          markAsRead(selectedConversation.partnerId);
        }
      } else {
        console.log('📨 Conversation not selected, not adding to messages');
      }
    };

    const handleMessageSent = (message) => {
      console.log('✅ Message sent confirmation:', message);
      
      const currentUserId = getCurrentUserId();
      const isFromMe = String(message.senderId) === String(currentUserId);
      const partnerId = String(message.recipientId) === String(currentUserId) 
        ? String(message.senderId) 
        : String(message.recipientId);
      
      // Update conversations list immediately
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (String(conv.partnerId) === partnerId) {
            return {
              ...conv,
              lastMessage: {
                id: message.id,
                content: message.content,
                type: message.type,
                createdAt: message.createdAt || message.created_at || null,
                isRead: message.isRead || false
              }
            };
          }
          return conv;
        });
        
        return updated.sort((a, b) => {
          const aTime = new Date(a.lastMessage?.createdAt || a.lastMessage?.created_at || 0);
          const bTime = new Date(b.lastMessage?.createdAt || b.lastMessage?.created_at || 0);
          return bTime - aTime;
        });
      });
      
      // If the message is from me and for the currently selected conversation,
      // update the existing message (optimistically added) with the full message data
      // but DON'T add it again to avoid duplicates
      const isSelectedConversation = selectedConversation && 
        (String(selectedConversation.partnerId) === partnerId ||
         String(selectedConversation.partnerId) === String(message.senderId) ||
         String(selectedConversation.partnerId) === String(message.recipientId));
      
      if (isSelectedConversation && isFromMe) {
        // Message was already added optimistically in sendMessage, just update it
        // or skip if it's exactly the same to avoid duplicates
        // Normalize createdAt field
        const normalizedMessage = {
          ...message,
          createdAt: message.createdAt || message.created_at || null
        };
        setMessages(prev => {
          const existingIndex = prev.findIndex(msg => msg.id === normalizedMessage.id);
          if (existingIndex >= 0) {
            // Message exists, update it with full server data
            console.log('✅ Updating existing message in handleMessageSent (from me)');
            return prev.map(msg => msg.id === normalizedMessage.id ? normalizedMessage : msg);
          } else {
            // Message doesn't exist yet (shouldn't happen, but handle it)
            console.log('⚠️ Message from me not found in messages, adding it');
            return [...prev, normalizedMessage];
          }
        });
      } else if (isSelectedConversation && !isFromMe) {
        // Message is from someone else (shouldn't happen in message_sent, but handle it)
        // Normalize createdAt field and attachments
        let attachments = message.attachments;
        if (typeof attachments === 'string') {
          try {
            attachments = JSON.parse(attachments);
          } catch (e) {
            console.error('Error parsing attachments JSON in handleMessageSent:', e);
            attachments = [];
          }
        }
        if (!Array.isArray(attachments)) {
          attachments = attachments ? [attachments] : [];
        }
        
        const normalizedMessage = {
          ...message,
          createdAt: message.createdAt || message.created_at || null,
          attachments: attachments
        };
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === normalizedMessage.id);
          if (exists) {
            console.log('📨 Message already exists in handleMessageSent, skipping');
            return prev;
          }
          console.log('📨 Adding message from handleMessageSent');
          return [...prev, normalizedMessage];
        });
        scrollToBottom();
        
        // Refresh media/files history if message has attachments
        if (message.attachments && message.attachments.length > 0) {
          if (message.type === 'image' || message.type === 'video') {
            loadMediaHistory();
          } else if (message.type === 'file') {
            loadFilesHistory();
          }
        }
      }
    };

    const handleUserTyping = (data) => {
      if (selectedConversation && data.userId === selectedConversation.partnerId) {
        setTyping(prev => ({ ...prev, [data.userId]: data.isTyping }));
        if (data.isTyping) {
          setTimeout(() => {
            setTyping(prev => ({ ...prev, [data.userId]: false }));
          }, 3000);
        }
      }
    };

    const handleReadReceipt = (data) => {
      // Update read status for messages
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, isRead: true, readAt: data.readAt }
          : msg
      ));
    };

    // Register event listeners with debugging
    console.log('📡 Registering socket event listeners...');
    
    socketRef.current.on('new_message', (message) => {
      console.log('🔔 NEW_MESSAGE event received!', message);
      handleNewMessage(message);
    });
    
    socketRef.current.on('message_sent', (message) => {
      console.log('🔔 MESSAGE_SENT event received!', message);
      handleMessageSent(message);
    });
    
    socketRef.current.on('user_typing', (data) => {
      console.log('🔔 USER_TYPING event received!', data);
      handleUserTyping(data);
    });
    
    socketRef.current.on('message_read_receipt', (data) => {
      console.log('🔔 MESSAGE_READ_RECEIPT event received!', data);
      handleReadReceipt(data);
    });

    // Handle real-time reaction updates
    const handleReactionUpdate = (data) => {
      console.log('🔔 MESSAGE_REACTION_UPDATED event received!', data);
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    };

    socketRef.current.on('message_reaction_updated', handleReactionUpdate);

    // Log all incoming events for debugging
    const allEvents = ['new_message', 'message_sent', 'user_typing', 'message_read_receipt', 'message_reaction_updated', 'connect', 'disconnect', 'error'];
    allEvents.forEach(eventName => {
      socketRef.current.on(eventName, (...args) => {
        console.log(`🔔 Socket event [${eventName}]:`, args);
      });
    });

    console.log('✅ Socket event listeners registered');

    return () => {
      if (socketRef.current) {
        console.log('🧹 Removing socket event listeners');
        socketRef.current.off('new_message', handleNewMessage);
        socketRef.current.off('message_sent', handleMessageSent);
        socketRef.current.off('user_typing', handleUserTyping);
        socketRef.current.off('message_read_receipt', handleReadReceipt);
        socketRef.current.off('message_reaction_updated', handleReactionUpdate);
        allEvents.forEach(eventName => {
          socketRef.current.off(eventName);
        });
      }
    };
  }, [selectedConversation]); // Re-bind when selectedConversation changes

  // Load conversations - always load all conversations, then filter for display
  const loadConversations = async (forceProjectFilter = null) => {
    try {
      const token = getToken();
      // Always load ALL conversations first (no project filter)
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Normalize conversations to ensure lastMessage has createdAt field
        const normalizedConversations = response.data.conversations.map(conv => {
          if (conv.lastMessage) {
            const normalized = {
              ...conv,
              lastMessage: {
                ...conv.lastMessage,
                createdAt: conv.lastMessage.createdAt || conv.lastMessage.created_at || null
              }
            };
            
            // Debug logging
            if (!normalized.lastMessage.createdAt) {
              console.warn('⚠️ Conversation missing createdAt:', {
                partner: conv.partner?.name,
                lastMessage: conv.lastMessage,
                hasCreatedAt: !!conv.lastMessage.createdAt,
                hasCreated_at: !!conv.lastMessage.created_at
              });
            }
            
            return normalized;
          }
          return conv;
        });
        console.log('📋 Loaded and normalized conversations:', normalizedConversations.length);
        
        // Always store all conversations
        setAllConversations(normalizedConversations);
        
        // Apply filter for display if projectFilterId is set
        const filterId = forceProjectFilter !== null ? forceProjectFilter : projectFilterId;
        if (filterId) {
          const filtered = normalizedConversations.filter(conv => 
            conv.linkedProjects && conv.linkedProjects.some(p => p.id === filterId)
          );
          setConversations(filtered);
        } else {
          setConversations(normalizedConversations);
        }
        
        // Dispatch event for header conversation count update (use all conversations)
        const activeCount = normalizedConversations.filter(c => {
          const status = getUserStatus(c.partnerId);
          return status === 'active';
        }).length;
        window.dispatchEvent(new CustomEvent('messagingConversationsUpdated', {
          detail: { total: normalizedConversations.length, active: activeCount }
        }));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (partnerId) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/messages/conversation/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Ensure all messages have createdAt field and properly parsed attachments
        const normalizedMessages = response.data.messages.map(msg => {
          // Normalize attachments - handle JSON strings
          let attachments = msg.attachments;
          if (typeof attachments === 'string') {
            try {
              attachments = JSON.parse(attachments);
            } catch (e) {
              console.error('Error parsing attachments JSON:', e);
              attachments = [];
            }
          }
          // Ensure attachments is an array
          if (!Array.isArray(attachments)) {
            attachments = attachments ? [attachments] : [];
          }
          
          return {
            ...msg,
            createdAt: msg.createdAt || msg.created_at || null,
            attachments: attachments,
            // Preserve project data if it exists
            projectId: msg.projectId || null,
            project: msg.project || null
          };
        });
        console.log('📨 Loaded messages:', normalizedMessages.length);
        if (normalizedMessages.length > 0) {
          const sampleMsg = normalizedMessages[0];
          console.log('📨 First message sample:', {
            id: sampleMsg.id,
            type: sampleMsg.type,
            content: sampleMsg.content?.substring(0, 30),
            createdAt: sampleMsg.createdAt,
            hasAttachments: !!sampleMsg.attachments,
            attachmentsCount: sampleMsg.attachments?.length || 0,
            attachmentsType: typeof sampleMsg.attachments,
            attachments: sampleMsg.attachments
          });
        }
        setMessages(normalizedMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Load available users
  const loadAvailableUsers = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/messages/users/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAvailableUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    loadConversations();
    loadAvailableUsers();
    // Load projects from window if available (from ProjectContextCenter)
    if (typeof window !== 'undefined' && window.messagingProjects) {
      setAvailableProjects(window.messagingProjects);
    }
  }, []);

  // Add scrollbar styles for tabs
  useEffect(() => {
    const styleId = 'messaging-tabs-scrollbar-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .messaging-tabs-scrollable::-webkit-scrollbar {
          height: 6px;
        }
        .messaging-tabs-scrollable::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .messaging-tabs-scrollable::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.4);
          border-radius: 3px;
        }
        .messaging-tabs-scrollable::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.6);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Apply filter when projectFilterId changes (but don't reload from server)
  useEffect(() => {
    if (projectFilterId) {
      // Filter existing conversations
      const filtered = allConversations.filter(conv => 
        conv.linkedProjects && conv.linkedProjects.some(p => p.id === projectFilterId)
      );
      setConversations(filtered);
    } else {
      // Show all conversations when filter is cleared
      setConversations(allConversations);
    }
  }, [projectFilterId, allConversations]);

  // Restore saved draft when component mounts with a selected conversation
  useEffect(() => {
    if (selectedConversation && selectedConversation.partnerId) {
      const savedDraft = loadMessageDraft(selectedConversation.partnerId);
      if (savedDraft) {
        setMessageInput(savedDraft);
      }
    }
  }, [selectedConversation?.partnerId]); // Only run when partnerId changes, not on every render

  // Reload media/files history when conversation changes while panels are open
  useEffect(() => {
    if (selectedConversation && selectedConversation.partnerId) {
      if (showMediaHistory) {
        console.log('🔄 Conversation changed, reloading media history for new recipient');
        loadMediaHistory();
      }
      if (showFilesHistory) {
        console.log('🔄 Conversation changed, reloading files history for new recipient');
        loadFilesHistory();
      }
    }
  }, [selectedConversation?.partnerId, showMediaHistory, showFilesHistory]);

  // Load user activity status
  useEffect(() => {
    if (availableUsers.length > 0 || conversations.length > 0) {
      loadUserStatus();
      // Refresh status every 30 seconds
      const interval = setInterval(loadUserStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [availableUsers, conversations]);

  // Function to load user activity status
  const loadUserStatus = async () => {
    try {
      const token = getToken();
      // Collect all user IDs - try both id and userId fields if available
      const userIds = [
        ...availableUsers.map(u => u.userId || u.id),
        ...allConversations.map(c => c.partner?.userId || c.partnerId)
      ].filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates and nulls

      if (userIds.length === 0) return;

      const response = await axios.post(`${API_URL}/users/activity/status`, 
        { userIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.statusMap) {
        // Map status using both id and userId as keys
        const mappedStatus = {};
        Object.keys(response.data.statusMap).forEach(key => {
          const status = response.data.statusMap[key];
          // Map to both UUID and userId for flexibility
          mappedStatus[status.userId] = status;
          mappedStatus[key] = status;
        });
        setUserStatusMap(mappedStatus);
      }
    } catch (error) {
      console.error('Error loading user status:', error);
    }
  };

  // Load profile pictures from localStorage on mount (only once)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('messaging_profile_pictures');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log(`📦 Loaded ${Object.keys(parsed).length} profile pictures from localStorage`);
        
        // CRITICAL FIX: Check if stored pictures are corrupted (all same as current user)
        const currentUserId = getCurrentUserIdFromToken();
        const currentUserPicture = parsed[currentUserId];
        
        if (currentUserPicture && currentUserId) {
          // CRITICAL FIX: Only check for corruption if values are NOT endpoint URLs
          // Endpoint URLs are normal and expected - they should all be different endpoint URLs
          // Only check if we have actual base64 data URLs or regular URLs that are all the same
          const nonEndpointEntries = Object.entries(parsed).filter(([key, value]) => 
            value !== null && !value?.startsWith('/api/profile/picture/')
          );
          
          if (nonEndpointEntries.length > 0) {
            // Check if all non-endpoint entries are the same as current user's picture
            const allSame = nonEndpointEntries.every(([key, value]) => 
              key === currentUserId || value === currentUserPicture
            );
            
            if (allSame && nonEndpointEntries.length > 1) {
              console.warn('⚠️ WARNING: localStorage appears corrupted - all non-endpoint pictures are the same as current user!');
              console.warn('⚠️ Clearing corrupted entries from localStorage...');
              // Only remove corrupted entries, not endpoint URLs
              nonEndpointEntries.forEach(([key]) => {
                if (key !== currentUserId) {
                  delete parsed[key];
                }
              });
              // Save cleaned data
              localStorage.setItem('messaging_profile_pictures', JSON.stringify(parsed));
              // Continue loading after cleanup
            }
          }
          
          // Note: Endpoint URLs are fine - they're all different and will be fetched individually
          
          // Also check if any stored picture matches current user's picture (but not endpoint URLs)
          const overwrites = Object.entries(parsed).filter(([key, value]) => 
            key !== currentUserId && 
            value !== null && 
            !value?.startsWith('/api/profile/picture/') &&
            value === currentUserPicture
          );
          
          if (overwrites.length > 0) {
            console.warn(`⚠️ WARNING: Found ${overwrites.length} entries with current user's picture!`);
            console.warn('⚠️ Removing corrupted entries from localStorage...');
            // Remove corrupted entries
            overwrites.forEach(([key]) => {
              delete parsed[key];
            });
            // Save cleaned data
            localStorage.setItem('messaging_profile_pictures', JSON.stringify(parsed));
          }
        }
        
        // CRITICAL FIX: Load endpoint URLs from localStorage and immediately trigger fetching
        // localStorage contains endpoint URLs - we need to fetch them or keep them as endpoint URLs
        // The ProfilePictureImage component will fetch from these endpoints
        const endpointUrls = {};
        
        Object.keys(parsed).forEach(key => {
          const storedValue = parsed[key];
          
          // Skip corrupted entries (current user's picture for other users)
          if (storedValue && storedValue !== null && key !== currentUserId && storedValue === currentUserPicture) {
            console.warn(`⚠️ Skipping corrupted localStorage entry: ${key}`);
            return;
          }
          
          // Store endpoint URLs as-is - component will fetch them
          if (storedValue && storedValue.startsWith('/api/profile/picture/')) {
            endpointUrls[key] = storedValue;
          } else if (storedValue && storedValue !== null) {
            // Regular URLs or base64 (shouldn't be in localStorage, but handle it)
            endpointUrls[key] = storedValue;
          } else if (storedValue === null) {
            // Allow null values
            endpointUrls[key] = null;
          }
        });
        
        // Set the endpoint URLs in state - components will fetch from these
        if (Object.keys(endpointUrls).length > 0) {
          console.log(`📦 Loading ${Object.keys(endpointUrls).length} profile picture endpoint URLs from localStorage`);
          setProfilePictures(prev => {
            // Merge with existing, but don't overwrite base64 data URLs with endpoint URLs
            const merged = { ...prev };
            Object.keys(endpointUrls).forEach(key => {
              // Only set if we don't have a base64 data URL already
              if (!merged[key] || !merged[key].startsWith('data:')) {
                merged[key] = endpointUrls[key];
              }
            });
            return merged;
          });
          
          // CRITICAL: Immediately trigger fetching of endpoint URLs
          // This ensures endpoint URLs from localStorage get fetched right away
          console.log(`🔄 Triggering fetch for ${Object.keys(endpointUrls).length} endpoint URLs from localStorage`);
        }
      }
    } catch (error) {
      console.error('Error loading profile pictures from localStorage:', error);
    }
  }, []); // Only run once on mount

  // Save profile pictures to localStorage whenever they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        if (Object.keys(profilePictures).length > 0) {
          const currentUserId = getCurrentUserIdFromToken();
          const currentUserPicture = profilePictures[currentUserId];
          
          // CRITICAL FIX: Filter out corrupted entries (current user's picture for other users)
          const toSave = Object.entries(profilePictures).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined) {
              // Convert base64 data URLs to API endpoint URLs for localStorage (to avoid quota errors)
              if (typeof value === 'string' && value.startsWith('data:')) {
                // Store API endpoint URL instead of base64 - we'll fetch it again when needed
                acc[key] = `/api/profile/picture/${encodeURIComponent(key)}`;
                return acc;
              }
              
              // Don't save if this is the current user's picture being stored for a different user
              if (currentUserPicture && value === currentUserPicture && key !== currentUserId && String(key) !== String(currentUserId)) {
                console.warn(`⚠️ NOT saving corrupted entry: key ${key} has current user's picture`);
                return acc; // Skip this entry
              }
              acc[key] = value;
            }
            return acc;
          }, {});
          
          if (Object.keys(toSave).length > 0) {
            // Final safety check: ensure we're not saving all the same picture
            const uniquePictures = new Set(Object.values(toSave).filter(v => v !== null));
            if (uniquePictures.size === 1 && Object.keys(toSave).length > 1 && currentUserId) {
              const allSame = Object.entries(toSave).every(([key, value]) => 
                key === currentUserId || value === currentUserPicture
              );
              if (allSame) {
                console.error('❌ BLOCKED save: All pictures are the same as current user! This would corrupt localStorage.');
                return; // Don't save corrupted data
              }
            }
            
            localStorage.setItem('messaging_profile_pictures', JSON.stringify(toSave));
            console.log(`💾 Saved ${Object.keys(toSave).length} profile pictures to localStorage`);
          }
        }
      } catch (error) {
        console.error('Error saving profile pictures to localStorage:', error);
      }
    }, 500); // Debounce by 500ms to avoid excessive writes

    return () => clearTimeout(timeoutId);
  }, [profilePictures]);

  // CRITICAL: Listen for profile picture update events and refresh immediately
  useEffect(() => {
    const handleProfilePictureUpdate = (event) => {
      const { profilePictureUrl, userId, userData } = event.detail;
      if (!profilePictureUrl) return;
      
      console.log('🔄 Messaging Center: Profile picture update event received', { 
        userId, 
        email: userData?.email, 
        userDataUserId: userData?.userId,
        profilePictureUrl: profilePictureUrl.substring(0, 50) + '...' 
      });
      
      // Normalize the profile picture URL
      let normalizedUrl = profilePictureUrl;
      if (normalizedUrl.startsWith('/') && !normalizedUrl.startsWith('//') && !normalizedUrl.startsWith('http')) {
        // Use dynamic base URL
        const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const backendOrigin = isProd 
          ? `${window.location.protocol}//${window.location.hostname}`
          : 'http://localhost:3000';
        normalizedUrl = backendOrigin + normalizedUrl;
      } else if (normalizedUrl.startsWith('/uploads/') || normalizedUrl.startsWith('uploads/')) {
        // Use dynamic base URL
        const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const backendOrigin = isProd 
          ? `${window.location.protocol}//${window.location.hostname}`
          : 'http://localhost:3000';
        normalizedUrl = normalizedUrl.startsWith('/') ? 
          backendOrigin + normalizedUrl : 
          backendOrigin + '/' + normalizedUrl;
      }
      
      // Find all keys that might match this user - be very thorough
      const keysToUpdate = new Set();
      
      // Add all possible identifiers from event
      if (userId) keysToUpdate.add(userId);
      if (userData?.userId) keysToUpdate.add(userData.userId);
      if (userData?.id) keysToUpdate.add(userData.id);
      if (userData?.email) keysToUpdate.add(userData.email);
      if (userData?.username) keysToUpdate.add(userData.username);
      
      // Check availableUsers - match by userId, id, email, or username
      availableUsers.forEach(u => {
        if (u.userId === userId || u.userId === userData?.userId ||
            u.id === userId || u.id === userData?.id ||
            u.email === userData?.email || u.email === userId ||
            u.username === userData?.email || u.username === userData?.username) {
          if (u.id) keysToUpdate.add(u.id);
          if (u.userId) keysToUpdate.add(u.userId);
          if (u.email) keysToUpdate.add(u.email);
          if (u.username) keysToUpdate.add(u.username);
        }
      });
      
      // Check conversations - match by partnerId, partner.userId, partner.id, or partner.email
      conversations.forEach(c => {
        if (c.partnerId === userId || c.partnerId === userData?.userId || c.partnerId === userData?.id ||
            c.partner?.userId === userId || c.partner?.userId === userData?.userId ||
            c.partner?.id === userId || c.partner?.id === userData?.id ||
            c.partner?.email === userData?.email) {
          if (c.partnerId) keysToUpdate.add(c.partnerId);
          if (c.partner?.id) keysToUpdate.add(c.partner.id);
          if (c.partner?.userId) keysToUpdate.add(c.partner.userId);
          if (c.partner?.email) keysToUpdate.add(c.partner.email);
        }
      });
      
      // Check selectedConversation
      if (selectedConversation) {
        if (selectedConversation.partnerId === userId || selectedConversation.partnerId === userData?.userId ||
            selectedConversation.partner?.userId === userId || selectedConversation.partner?.userId === userData?.userId ||
            selectedConversation.partner?.id === userId || selectedConversation.partner?.id === userData?.id ||
            selectedConversation.partner?.email === userData?.email) {
          if (selectedConversation.partnerId) keysToUpdate.add(selectedConversation.partnerId);
          if (selectedConversation.partner?.id) keysToUpdate.add(selectedConversation.partner.id);
          if (selectedConversation.partner?.userId) keysToUpdate.add(selectedConversation.partner.userId);
          if (selectedConversation.partner?.email) keysToUpdate.add(selectedConversation.partner.email);
        }
      }
      
      // Also check all existing profile picture keys - if any match the user identifiers, add them to update list
      // We'll update them all at once after collecting all keys
      const existingKeys = Object.keys(profilePictures);
      existingKeys.forEach(key => {
        // If this key matches any of our identifiers, add it to update list
        if (key === userId || key === userData?.userId || key === userData?.id || 
            key === userData?.email || key === userData?.username) {
          keysToUpdate.add(key);
        }
      });
      
      const uniqueKeys = Array.from(keysToUpdate);
      
      if (uniqueKeys.length === 0) {
        console.log('⚠️ Messaging Center: No matching keys found, but updating with provided identifiers anyway');
        // Still update with the identifiers we have
        if (userId || userData?.userId || userData?.id || userData?.email) {
          setProfilePictures(prev => {
            const updated = { ...prev };
            if (userId) updated[userId] = normalizedUrl;
            if (userData?.userId) updated[userData.userId] = normalizedUrl;
            if (userData?.id) updated[userData.id] = normalizedUrl;
            if (userData?.email) updated[userData.email] = normalizedUrl;
            return updated;
          });
        }
        return;
      }
      
      console.log(`🔄 Messaging Center: Immediately updating profile picture for keys:`, uniqueKeys);
      
      // CRITICAL: Immediately update profile pictures (no delay, no cache)
      setProfilePictures(prev => {
        const updated = { ...prev };
        uniqueKeys.forEach(key => {
          // Force update immediately - clear any cache
          updated[key] = normalizedUrl;
        });
        return updated;
      });
      
      // Also force reload from server immediately to ensure we have the absolute latest
      const identifier = userId || userData?.userId || userData?.id || userData?.email;
      if (identifier) {
        const token = getToken();
        
        fetch(`${API_URL}/profile/picture/${encodeURIComponent(identifier)}?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.profilePictureUrl) {
            let pictureUrl = data.profilePictureUrl;
            
            // Normalize URL
            if (pictureUrl.startsWith('/') && !pictureUrl.startsWith('//') && !pictureUrl.startsWith('http')) {
              // Use dynamic base URL
              const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
              const backendOrigin = isProd 
                ? `${window.location.protocol}//${window.location.hostname}`
                : 'http://localhost:3000';
              pictureUrl = backendOrigin + pictureUrl;
            } else if (pictureUrl.startsWith('/uploads/') || pictureUrl.startsWith('uploads/')) {
              // Use dynamic base URL
              const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
              const backendOrigin = isProd 
                ? `${window.location.protocol}//${window.location.hostname}`
                : 'http://localhost:3000';
              pictureUrl = pictureUrl.startsWith('/') ? 
                backendOrigin + pictureUrl : 
                backendOrigin + '/' + pictureUrl;
            }
            
            // Update with fresh server data immediately
            setProfilePictures(prev => {
              const updated = { ...prev };
              uniqueKeys.forEach(k => {
                updated[k] = pictureUrl;
              });
              // Also update by identifier
              if (userId) updated[userId] = pictureUrl;
              if (userData?.userId) updated[userData.userId] = pictureUrl;
              if (userData?.id) updated[userData.id] = pictureUrl;
              if (userData?.email) updated[userData.email] = pictureUrl;
              return updated;
            });
            
            console.log(`✅ Messaging Center: Profile picture refreshed from server immediately for ${identifier}`);
          }
        })
        .catch(error => {
          console.error(`❌ Messaging Center: Error refreshing profile picture for ${identifier}:`, error);
        });
      }
    };
    
    // Listen for all profile picture update events
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    window.addEventListener('iuProfilePictureUpdated', handleProfilePictureUpdate);
    window.addEventListener('eiuProfilePictureUpdated', handleProfilePictureUpdate);
    window.addEventListener('mpmecProfilePictureUpdated', handleProfilePictureUpdate);
    window.addEventListener('secretariatProfilePictureUpdated', handleProfilePictureUpdate);
    window.addEventListener('executiveProfilePictureUpdated', handleProfilePictureUpdate);
    window.addEventListener('sysadminProfilePictureUpdated', handleProfilePictureUpdate);
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
      window.removeEventListener('iuProfilePictureUpdated', handleProfilePictureUpdate);
      window.removeEventListener('eiuProfilePictureUpdated', handleProfilePictureUpdate);
      window.removeEventListener('mpmecProfilePictureUpdated', handleProfilePictureUpdate);
      window.removeEventListener('secretariatProfilePictureUpdated', handleProfilePictureUpdate);
      window.removeEventListener('executiveProfilePictureUpdated', handleProfilePictureUpdate);
      window.removeEventListener('sysadminProfilePictureUpdated', handleProfilePictureUpdate);
    };
  }, [availableUsers, conversations, selectedConversation]);
  
  // Load profile picture for a user
  useEffect(() => {
    const loadProfilePictures = async () => {
      const userMap = new Map();
      
      // Map users with their IDs - check both id and userId fields
      availableUsers.forEach(u => {
        if (u.id) userMap.set(u.id, { id: u.id, userId: u.userId || u.id, email: u.email || u.username, name: u.name });
        if (u.userId && u.userId !== u.id) userMap.set(u.userId, { id: u.id, userId: u.userId, email: u.email || u.username, name: u.name });
        if (u.email) userMap.set(u.email, { id: u.id, userId: u.userId || u.id, email: u.email, name: u.name });
      });
      conversations.forEach(c => {
        if (c.partnerId) {
          userMap.set(c.partnerId, { 
            id: c.partnerId, 
            userId: c.partner?.userId || c.partner?.id || c.partnerId,
            email: c.partner?.email || c.partner?.username,
            name: c.partner?.name
          });
        }
        // Also check partner.id if different from partnerId
        if (c.partner?.id && c.partner.id !== c.partnerId) {
          userMap.set(c.partner.id, { 
            id: c.partner.id, 
            userId: c.partner?.userId || c.partner.id,
            email: c.partner?.email || c.partner?.username,
            name: c.partner?.name
          });
        }
        // Also check partner.email if available
        if (c.partner?.email) {
          userMap.set(c.partner.email, {
            id: c.partnerId || c.partner?.id,
            userId: c.partner?.userId || c.partner?.id || c.partnerId,
            email: c.partner.email,
            name: c.partner?.name
          });
        }
      });
      
      // Also check selectedConversation if it exists
      if (selectedConversation?.partnerId) {
        userMap.set(selectedConversation.partnerId, {
          id: selectedConversation.partnerId,
          userId: selectedConversation.partner?.userId || selectedConversation.partner?.id || selectedConversation.partnerId,
          email: selectedConversation.partner?.email || selectedConversation.partner?.username,
          name: selectedConversation.partner?.name
        });
        if (selectedConversation.partner?.id && selectedConversation.partner.id !== selectedConversation.partnerId) {
          userMap.set(selectedConversation.partner.id, {
            id: selectedConversation.partner.id,
            userId: selectedConversation.partner?.userId || selectedConversation.partner.id,
            email: selectedConversation.partner?.email || selectedConversation.partner?.username,
            name: selectedConversation.partner?.name
          });
        }
        // Also check partner.email if available
        if (selectedConversation.partner?.email) {
          userMap.set(selectedConversation.partner.email, {
            id: selectedConversation.partnerId || selectedConversation.partner?.id,
            userId: selectedConversation.partner?.userId || selectedConversation.partner?.id || selectedConversation.partnerId,
            email: selectedConversation.partner.email,
            name: selectedConversation.partner?.name
          });
        }
      }
      
      // Also load profile picture for current user
      const currentUserId = getCurrentUserIdFromToken();
      if (currentUserId) {
        userMap.set(currentUserId, {
          id: currentUserId,
          userId: currentUserId,
          name: 'Current User'
        });
      }
      
      // Also load profile pictures for message senders in current conversation
      if (messages.length > 0) {
        messages.forEach(msg => {
          if (msg.senderId) {
            userMap.set(msg.senderId, {
              id: msg.senderId,
              userId: msg.sender?.userId || msg.sender?.id || msg.senderId,
              email: msg.sender?.email || msg.sender?.username,
              name: msg.sender?.name
            });
          }
        });
      }

      for (const [key, userData] of userMap.entries()) {
        // CRITICAL: Check if user data has profilePictureUrl first (like office-groups.astro)
        // This ensures we use the profile picture from the database if available
        if (userData.profilePictureUrl && userData.profilePictureUrl.startsWith('http')) {
          console.log(`✅ Using profilePictureUrl from user data for ${key} (${userData.name}):`, userData.profilePictureUrl.substring(0, 50) + '...');
          setProfilePictures(prev => {
            const updated = { ...prev };
            updated[key] = userData.profilePictureUrl;
            if (userData.userId && userData.userId !== key) {
              updated[userData.userId] = userData.profilePictureUrl;
            }
            if (userData.id && userData.id !== key && userData.id !== userData.userId) {
              updated[userData.id] = userData.profilePictureUrl;
            }
            if (userData.email && userData.email !== key) {
              updated[userData.email] = userData.profilePictureUrl;
            }
            return updated;
          });
          continue;
        }
        
        // Skip if we already have this profile picture loaded (check all key variations)
        const existingPicture = profilePictures[key] || 
                                profilePictures[userData.userId] || 
                                profilePictures[userData.id] ||
                                (userData.email ? profilePictures[userData.email] : null);
        
        // Skip only if we have a valid HTTP URL or base64 data URL (fully loaded)
        if (existingPicture && existingPicture !== null && 
            (existingPicture.startsWith('data:') || existingPicture.startsWith('http'))) {
          console.log(`✅ Profile picture already loaded for ${key} (${userData.name})`);
          continue;
        }
        
        // Don't overwrite null values unless we're sure there's a picture
        if (profilePictures[key] === null && !userData.userId && !userData.id) {
          console.log(`⚠️ Skipping ${key} - already marked as null and no alternative identifier`);
          continue;
        }
        
        try {
          const token = getToken();
          const currentUserId = getCurrentUserIdFromToken();
          
          // CRITICAL: Use userId (like LGU-IU-0001) as primary identifier - same as sidebar/topbar
          // Priority: userId > id > email > key
          let identifier = null;
          
          if (userData.userId && userData.userId !== key) {
            identifier = userData.userId;
          } else if (userData.id && userData.id !== key && userData.id !== userData.userId) {
            identifier = userData.id;
          } else if (userData.email) {
            identifier = userData.email;
          } else {
            identifier = key;
          }
          
          // CRITICAL: Never use current user's identifier for other users
          if (identifier === currentUserId && key !== currentUserId && String(key) !== String(currentUserId)) {
            console.error(`❌ BLOCKED: Identifier ${identifier} matches current user but key ${key} is different!`);
            console.error(`   User data:`, userData);
            // Try to find alternative identifier
            if (userData.userId && userData.userId !== currentUserId) {
              identifier = userData.userId;
            } else if (userData.id && userData.id !== currentUserId) {
              identifier = userData.id;
            } else if (userData.email && userData.email !== currentUserId) {
              identifier = userData.email;
            } else {
              console.error(`❌ Cannot find valid identifier for user ${key} - skipping`);
              continue;
            }
          }
          
          // Enhanced check: if identifier matches current user, make sure key also matches
          if (identifier === currentUserId || String(identifier) === String(currentUserId)) {
            if (key !== currentUserId && String(key) !== String(currentUserId) && 
                key !== userData.userId && String(key) !== String(userData.userId) &&
                key !== userData.id && String(key) !== String(userData.id)) {
              console.error(`❌ BLOCKED: Identifier matches current user but all keys are different!`);
              console.error(`   Key: ${key}, Identifier: ${identifier}, Name: ${userData.name}`);
              console.error(`   UserData:`, userData);
              continue;
            }
          }
          
          // Only load if we don't have it stored (undefined, not null)
          // Always load from server to ensure we have the latest (like sidebar/topbar)
          if (profilePictures[key] === undefined || profilePictures[key] === null || 
              profilePictures[key]?.startsWith('/api/profile/picture/') || 
              !profilePictures[key]?.startsWith('http')) {
            console.log(`🖼️ Loading profile picture from server for user: ${identifier} (key: ${key}, name: ${userData.name || 'Unknown'})`);
            console.log(`   UserData:`, { email: userData.email, userId: userData.userId, id: userData.id, key });
            
            // CRITICAL: Use full backend URL with userId (like sidebar/topbar/office-groups)
            const response = await fetch(`${API_URL}/profile/picture/${encodeURIComponent(identifier)}?t=${Date.now()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.profilePictureUrl) {
                // CRITICAL: Prefer HTTP URL over base64 data URL for consistency (like sidebar/topbar)
                let pictureUrl = data.profilePictureUrl;
                let isBase64 = false;
                
                // Check if it's a base64 data URL
                if (pictureUrl && pictureUrl.startsWith('data:')) {
                  isBase64 = true;
                  console.log(`⚠️ API returned base64 data URL for ${identifier} (key: ${key}), preferring HTTP URLs`);
                  pictureUrl = data.profilePictureUrl; // Keep base64 for now
                } else if (pictureUrl) {
                  // Handle regular URLs - ensure they're absolute
                  if (pictureUrl.startsWith('/') && !pictureUrl.startsWith('//') && !pictureUrl.startsWith('http')) {
                    // Convert relative URLs to use backend server
                    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                    const backendOrigin = isProd 
                      ? `${window.location.protocol}//${window.location.hostname}`
                      : 'http://localhost:3000';
                    pictureUrl = backendOrigin + pictureUrl;
                  } else if (pictureUrl.startsWith('/uploads/') || pictureUrl.startsWith('uploads/')) {
                    // Ensure upload URLs use backend server
                    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                    const backendOrigin = isProd 
                      ? `${window.location.protocol}//${window.location.hostname}`
                      : 'http://localhost:3000';
                    pictureUrl = pictureUrl.startsWith('/') ? 
                      backendOrigin + pictureUrl : 
                      backendOrigin + '/' + pictureUrl;
                  }
                }
                
                console.log(`✅ Profile picture loaded from server for ${identifier} (key: ${key}): ${isBase64 ? 'base64 data URL' : pictureUrl.substring(0, 50) + '...'}`);
                
                // CRITICAL FIX: Check if this picture matches current user's picture
                const currentUserPicture = profilePictures[currentUserId];
                
                // Compare base64 data URLs by comparing a portion of the data
                let isCurrentUserPicture = false;
                if (currentUserPicture && pictureUrl) {
                  if (pictureUrl === currentUserPicture) {
                    isCurrentUserPicture = true;
                  } else if (isBase64 && currentUserPicture.startsWith('data:')) {
                    // Compare first 100 chars of base64 to detect if it's the same picture
                    const picPrefix = pictureUrl.substring(0, 100);
                    const currentPicPrefix = currentUserPicture.substring(0, 100);
                    if (picPrefix === currentPicPrefix) {
                      isCurrentUserPicture = true;
                    }
                  }
                }
                
                if (isCurrentUserPicture && key !== currentUserId && String(key) !== String(currentUserId)) {
                  console.error(`❌ BLOCKED: Picture matches current user's picture for different user!`);
                  console.error(`   Key: ${key}, Identifier: ${identifier}, Name: ${userData.name}`);
                  console.error(`   Current User ID: ${currentUserId}`);
                  console.error(`   This suggests the API returned the wrong picture or identifier is wrong`);
                  // Don't store - let it remain undefined so it can be retried
                  continue;
                }
                
                // Store under multiple keys for better lookup
                setProfilePictures(prev => {
                  const updated = { ...prev };
                  
                  // Final check: Don't store current user's picture for other users
                  const currentPic = updated[currentUserId];
                  if (currentPic && pictureUrl) {
                    if (pictureUrl === currentPic || 
                        (isBase64 && currentPic.startsWith('data:') && pictureUrl.substring(0, 100) === currentPic.substring(0, 100))) {
                      if (key !== currentUserId && String(key) !== String(currentUserId)) {
                        console.error(`❌ FINAL BLOCK: Picture matches current user's picture! Key: ${key}`);
                        return prev; // Return unchanged
                      }
                    }
                  }
                  
                  // CRITICAL: Always update with new picture from server (server is source of truth)
                  // This ensures we always have the latest profile picture, even if it's different
                  updated[key] = pictureUrl;
                  
                  // Also store under userId and id if they're different and not already set
                  if (userData.userId && userData.userId !== key) {
                    if (updated[userData.userId] === undefined || updated[userData.userId] === null || updated[userData.userId]?.startsWith('/api/profile/picture/')) {
                      // Check again before storing
                      if (!(currentPic && pictureUrl && (pictureUrl === currentPic || (isBase64 && currentPic.startsWith('data:') && pictureUrl.substring(0, 100) === currentPic.substring(0, 100))))) {
                        updated[userData.userId] = pictureUrl;
                      }
                    } else if (isBase64 && updated[userData.userId] && !updated[userData.userId].startsWith('data:')) {
                      // Update if we have base64 and existing is not base64
                      updated[userData.userId] = pictureUrl;
                    }
                  }
                  if (userData.id && userData.id !== key && userData.id !== userData.userId) {
                    if (updated[userData.id] === undefined || updated[userData.id] === null || updated[userData.id]?.startsWith('/api/profile/picture/')) {
                      // Check again before storing
                      if (!(currentPic && pictureUrl && (pictureUrl === currentPic || (isBase64 && currentPic.startsWith('data:') && pictureUrl.substring(0, 100) === currentPic.substring(0, 100))))) {
                        updated[userData.id] = pictureUrl;
                      }
                    } else if (isBase64 && updated[userData.id] && !updated[userData.id].startsWith('data:')) {
                      // Update if we have base64 and existing is not base64
                      updated[userData.id] = pictureUrl;
                    }
                  }
                  
                  return updated;
                });
              } else {
                // No profile picture available, explicitly set to null
                console.log(`⚠️ No profile picture found for ${identifier}`);
                setProfilePictures(prev => {
                  if (prev[key] === undefined) {
                    return { ...prev, [key]: null };
                  }
                  return prev;
                });
              }
            } else {
              console.log(`⚠️ Profile picture API error for ${identifier}: ${response.status}`);
              setProfilePictures(prev => {
                if (prev[key] === undefined) {
                  return { ...prev, [key]: null };
                }
                return prev;
              });
            }
          }
        } catch (error) {
          // Profile picture not found, will use fallback
          console.log(`❌ Profile picture error for user ${identifier}:`, error);
          setProfilePictures(prev => {
            if (prev[key] === undefined) {
              return { ...prev, [key]: null };
            }
            return prev;
          });
        }
      }
    };

    // Always try to load profile pictures if we have any data
    // Also check if we have endpoint URLs in state that need fetching
    const hasEndpointUrls = Object.values(profilePictures).some(url => url?.startsWith('/api/profile/picture/'));
    
    if (availableUsers.length > 0 || conversations.length > 0 || selectedConversation || messages.length > 0 || hasEndpointUrls) {
      loadProfilePictures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableUsers, conversations, selectedConversation, messages, profilePictures]);

  // Get profile picture URL - try multiple identifiers (NEVER return current user's picture for others)
  // Returns base64 data URL, regular URL, or API endpoint URL - component will handle all cases
  const getProfilePictureUrl = (userId) => {
    if (!userId) return null;
    
    const currentUserId = getCurrentUserIdFromToken();
    
    // Try direct match first
    if (profilePictures[userId]) {
      let picture = profilePictures[userId];
      
      // CRITICAL FIX: Return base64 data URLs directly - don't convert to endpoint URL!
      // The ProfilePictureImage component can handle base64 directly (fastest)
      if (picture && picture.startsWith('data:')) {
        return picture; // Return base64 directly
      }
      
      // Safety check: if this userId matches current user but we're asking for a different user's picture, don't return it
      if (userId === currentUserId && String(userId) !== String(currentUserId)) {
        return null;
      }
      return picture;
    }
    
    // Try to find by checking all keys (in case userId vs id mismatch)
    for (const [key, value] of Object.entries(profilePictures)) {
      if (key === userId || key === String(userId)) {
        // Safety check: don't return current user's picture if the requested userId is different
        if (key === currentUserId && String(userId) !== String(currentUserId)) {
          continue;
        }
        return value;
      }
    }
    
    // Check if userId matches any user's userId or id in availableUsers/allConversations
    const allUsers = [...availableUsers, ...allConversations.map(c => c.partner).filter(Boolean)];
    const matchedUser = allUsers.find(u => 
      (u.id && (u.id === userId || String(u.id) === String(userId))) ||
      (u.userId && (u.userId === userId || String(u.userId) === String(userId)))
    );
    
    if (matchedUser) {
      // Try with matched user's id
      if (matchedUser.id && profilePictures[matchedUser.id]) {
        // Safety check: don't return current user's picture for a different user
        if (matchedUser.id === currentUserId && String(userId) !== String(currentUserId)) {
          return null;
        }
        return profilePictures[matchedUser.id];
      }
      // Try with matched user's userId
      if (matchedUser.userId && profilePictures[matchedUser.userId]) {
        // Safety check: don't return current user's picture for a different user
        if (matchedUser.userId === currentUserId && String(userId) !== String(currentUserId)) {
          return null;
        }
        return profilePictures[matchedUser.userId];
      }
    }
    
    // If no picture found in state, return API endpoint URL so component can fetch it
    // This ensures we always try to load the picture even if it's not in state
    return `/api/profile/picture/${encodeURIComponent(userId)}`;
  };

  // Get user activity status - try multiple identifiers
  const getUserStatus = (userId) => {
    const status = userStatusMap[userId];
    if (!status) {
      // Try to find status by checking all keys
      const foundStatus = Object.values(userStatusMap).find(s => 
        s.userId === userId || s.id === userId
      );
      if (foundStatus) {
        return foundStatus.isActive ? 'active' : 'inactive';
      }
      return 'unknown';
    }
    return status.isActive ? 'active' : 'inactive';
  };

  // Filter users based on search query
  const filteredUsers = availableUsers.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    );
  });

  // Get conversations with unread messages - use allConversations to always show correct count
  const unreadConversations = allConversations.filter(conv => conv.unreadCount > 0);
  
  // Dispatch conversation count updates when conversations change
  useEffect(() => {
    const activeCount = conversations.filter(c => {
      const status = getUserStatus(c.partnerId);
      return status === 'active';
    }).length;
    
    window.dispatchEvent(new CustomEvent('messagingConversationsUpdated', {
      detail: { total: conversations.length, active: activeCount }
    }));
  }, [conversations]);

  // Group users by department
  const usersByDepartment = filteredUsers.reduce((acc, user) => {
    const dept = user.department || 'Other';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(user);
    return acc;
  }, {});

  const sortedDepartments = Object.keys(usersByDepartment).sort();

  // Select conversation
  // Helper function to get localStorage key for a conversation draft
  const getDraftKey = (partnerId) => {
    if (!partnerId) return null;
    return `messaging_draft_${partnerId}`;
  };

  // Save message draft to localStorage
  const saveMessageDraft = (partnerId, text) => {
    if (!partnerId) return;
    const key = getDraftKey(partnerId);
    if (key) {
      if (text && text.trim()) {
        localStorage.setItem(key, text);
        console.log(`💾 Saved draft for conversation ${partnerId}`);
      } else {
        // Clear draft if empty
        localStorage.removeItem(key);
      }
    }
  };

  // Load message draft from localStorage
  const loadMessageDraft = (partnerId) => {
    if (!partnerId) return '';
    const key = getDraftKey(partnerId);
    if (key) {
      const draft = localStorage.getItem(key);
      if (draft) {
        console.log(`📂 Loaded draft for conversation ${partnerId}`);
        return draft;
      }
    }
    return '';
  };

  const selectConversation = (conversation) => {
    // Save current conversation's draft before switching
    if (selectedConversation && selectedConversation.partnerId) {
      saveMessageDraft(selectedConversation.partnerId, messageInput);
    }
    
    setSelectedConversation(conversation);
    loadMessages(conversation.partnerId);
    
    // Load saved draft for the new conversation
    const savedDraft = loadMessageDraft(conversation.partnerId);
    setMessageInput(savedDraft);
    
    // Mark messages as read and reset unread count
    markAsRead(conversation.partnerId);
    
    // Update conversations to reset unread count for this conversation
    setConversations(prev => prev.map(conv => 
      conv.partnerId === conversation.partnerId 
        ? { ...conv, unreadCount: 0 }
        : conv
    ));
  };

  // Start new conversation
  const startNewConversation = (user) => {
    // Save current conversation's draft before switching
    if (selectedConversation && selectedConversation.partnerId) {
      saveMessageDraft(selectedConversation.partnerId, messageInput);
    }
    
    const newConv = {
      partnerId: user.id,
      partner: user,
      lastMessage: null,
      unreadCount: 0
    };
    setSelectedConversation(newConv);
    setMessages([]);
    
    // Load saved draft for the new conversation
    const savedDraft = loadMessageDraft(user.id);
    setMessageInput(savedDraft);
  };

  // Mark messages as read
  const markAsRead = async (partnerId) => {
    try {
      const token = getToken();
      await axios.post(`${API_URL}/messages/mark-read/${partnerId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update conversations state immediately to reset unread count
      setConversations(prev => prev.map(conv => 
        conv.partnerId === partnerId 
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
      
      // Also refresh from server to ensure consistency
      loadConversations();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;
    if (!selectedConversation) return;

    // Check for bad words in message content
    if (messageInput.trim() && containsBadWords(messageInput)) {
      setShowBadWordModal(true);
      return;
    }

    setSending(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('recipientId', selectedConversation.partnerId);
      formData.append('content', messageInput);
      if (selectedProjectId) {
        formData.append('projectId', selectedProjectId);
      }
      
      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await axios.post(`${API_URL}/messages/send`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Add message optimistically, but check for duplicates
        const newMessage = response.data.message;
        // Normalize createdAt field and attachments
        if (!newMessage.createdAt && newMessage.created_at) {
          newMessage.createdAt = newMessage.created_at;
        }
        
        // Normalize attachments
        let attachments = newMessage.attachments;
        if (typeof attachments === 'string') {
          try {
            attachments = JSON.parse(attachments);
          } catch (e) {
            console.error('Error parsing attachments JSON in sendMessage:', e);
            attachments = [];
          }
        }
        if (!Array.isArray(attachments)) {
          attachments = attachments ? [attachments] : [];
        }
        newMessage.attachments = attachments;
        // Preserve project data if it exists
        if (selectedProjectId) {
          // Find the project from availableProjects or from ProjectContextCenter
          const linkedProject = availableProjects.find(p => p.id === selectedProjectId);
          if (linkedProject) {
            newMessage.projectId = selectedProjectId;
            newMessage.project = {
              id: linkedProject.id,
              projectCode: linkedProject.projectCode,
              name: linkedProject.name,
              status: linkedProject.status,
              category: linkedProject.category,
              location: linkedProject.location
            };
          } else if (response.data.message.projectId) {
            // If backend returned project data, use it
            newMessage.projectId = response.data.message.projectId;
            newMessage.project = response.data.message.project || null;
          }
        }
        console.log('📨 Sending message, normalized:', {
          id: newMessage.id,
          content: newMessage.content?.substring(0, 30),
          createdAt: newMessage.createdAt,
          projectId: newMessage.projectId,
          hasProject: !!newMessage.project
        });
        setMessages(prev => {
          // Check if message already exists (shouldn't happen, but safety check)
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) {
            console.log('⚠️ Message already exists in sendMessage, updating instead');
            // Update existing message with full data
            return prev.map(msg => msg.id === newMessage.id ? newMessage : msg);
          }
          console.log('✅ Adding message optimistically in sendMessage');
          return [...prev, newMessage];
        });
        setMessageInput('');
        // Clear draft after successful send
        if (selectedConversation && selectedConversation.partnerId) {
          const key = getDraftKey(selectedConversation.partnerId);
          if (key) {
            localStorage.removeItem(key);
          }
        }
        setSelectedFiles([]);
        setFilePreviews({}); // Clear previews after sending
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Refresh media/files history if message has attachments
        if (response.data.message.attachments && response.data.message.attachments.length > 0) {
          if (response.data.message.type === 'image' || response.data.message.type === 'video') {
            loadMediaHistory();
          } else if (response.data.message.type === 'file') {
            loadFilesHistory();
          }
        }
        
        scrollToBottom();
        loadConversations();
        setIsTyping(false);
        if (socketRef.current) {
          socketRef.current.emit('typing', {
            recipientId: selectedConversation.partnerId,
            isTyping: false
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error details:', error.response?.data?.details);
      
      let errorMessage = 'Failed to send message. Please try again.';
      if (error.response?.data) {
        if (error.response.data.details?.message) {
          errorMessage = error.response.data.details.message;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      // Show modern validation modal instead of alert
      // Check if it's a validation error about recipient/content
      if (errorMessage.toLowerCase().includes('recipient') || errorMessage.toLowerCase().includes('content')) {
        setValidationMessage('Message content is required to send media or files.');
      } else {
        setValidationMessage(errorMessage);
      }
      setShowValidationModal(true);
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = (e) => {
    const newValue = e.target.value;
    setMessageInput(newValue);
    
    // Auto-save draft to localStorage
    if (selectedConversation && selectedConversation.partnerId) {
      saveMessageDraft(selectedConversation.partnerId, newValue);
    }
    
    if (!isTyping) {
      setIsTyping(true);
      if (socketRef.current && selectedConversation) {
        socketRef.current.emit('typing', {
          recipientId: selectedConversation.partnerId,
          isTyping: true
        });
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socketRef.current && selectedConversation) {
        socketRef.current.emit('typing', {
          recipientId: selectedConversation.partnerId,
          isTyping: false
        });
      }
    }, 1000);
  };

  // Handle file selection with preview generation
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = {};
    
    files.forEach((file, index) => {
      const fileIndex = selectedFiles.length + index;
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreviews(prev => ({
            ...prev,
            [fileIndex]: event.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
      
      // Generate preview for videos
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        const videoUrl = URL.createObjectURL(file);
        video.preload = 'metadata';
        video.src = videoUrl;
        video.muted = true; // Required for autoplay in some browsers
        
        video.onloadedmetadata = () => {
          video.currentTime = 0.5; // Seek to 0.5 second for thumbnail
        };
        
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            setFilePreviews(prev => ({
              ...prev,
              [fileIndex]: thumbnailUrl
            }));
            URL.revokeObjectURL(videoUrl); // Clean up
          } catch (error) {
            console.error('Error generating video thumbnail:', error);
            URL.revokeObjectURL(videoUrl);
          }
        };
        
        video.onerror = () => {
          console.error('Error loading video for thumbnail');
          URL.revokeObjectURL(videoUrl);
        };
      }
    });
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Remove file
  const removeFile = (index) => {
    // Clean up preview URL if it exists
    if (filePreviews[index]) {
      if (filePreviews[index].startsWith('blob:')) {
        URL.revokeObjectURL(filePreviews[index]);
      }
    }
    
    // Remove file and shift preview indices
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // Update preview indices
      const newPreviews = {};
      newFiles.forEach((_, newIndex) => {
        if (newIndex < index) {
          newPreviews[newIndex] = filePreviews[newIndex];
        } else if (newIndex > index) {
          newPreviews[newIndex] = filePreviews[newIndex + 1];
        }
      });
      setFilePreviews(newPreviews);
      return newFiles;
    });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to convert date to Philippine Standard Time (PST/UTC+8)
  const toPST = (date) => {
    // Philippine Standard Time is UTC+8
    const pstOffset = 8 * 60; // 8 hours in minutes
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000); // Convert to UTC
    const pstTime = new Date(utc + (pstOffset * 60000)); // Add PST offset
    return pstTime;
  };

  // Format date for display (short format like Messenger) - Using Philippine Standard Time
  const formatDate = (dateInput) => {
    // Debug logging (enable for debugging)
    const DEBUG_TIMESTAMPS = false; // Set to true to enable debug logs
    if (DEBUG_TIMESTAMPS) {
      console.log('📅 formatDate called with:', dateInput, 'Type:', typeof dateInput);
    }
    
    if (!dateInput) {
      if (DEBUG_TIMESTAMPS) {
        console.warn('⚠️ formatDate: No date input provided');
      }
      return 'Just now';
    }
    
    // Handle different input formats:
    // 1. String (ISO date string)
    // 2. Object with createdAt/created_at property
    // 3. Date object
    let dateValue;
    if (typeof dateInput === 'string') {
      dateValue = dateInput;
    } else if (dateInput && typeof dateInput === 'object') {
      dateValue = dateInput.createdAt || dateInput.created_at || dateInput;
      // If still an object, try to convert
      if (typeof dateValue === 'object' && dateValue instanceof Date) {
        dateValue = dateValue.toISOString();
      }
    } else {
      dateValue = dateInput;
    }
    
    if (DEBUG_TIMESTAMPS) {
      console.log('📅 formatDate: Processed dateValue:', dateValue);
    }
    
    const date = new Date(dateValue);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('❌ formatDate: Invalid date:', dateInput, 'Parsed as:', dateValue);
      return 'Just now';
    }
    
    // Convert to Philippine Standard Time
    const datePST = toPST(date);
    const nowPST = toPST(new Date());
    
    if (DEBUG_TIMESTAMPS) {
      console.log('📅 formatDate: Valid date parsed:', date.toISOString());
      console.log('📅 formatDate: Date in PST:', datePST.toISOString());
    }
    
    const diff = nowPST - datePST;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    
    if (DEBUG_TIMESTAMPS) {
      console.log('📅 formatDate: Time diff:', {
        seconds,
        minutes,
        hours: Math.floor(diff / 3600000),
        nowPST: nowPST.toISOString(),
        messageDatePST: datePST.toISOString()
      });
    }
    
    // Show "Just now" only for messages less than 10 seconds old
    if (seconds < 10) {
      if (DEBUG_TIMESTAMPS) {
        console.log('📅 formatDate: Returning "Just now" (less than 10 seconds old)');
      }
      return 'Just now';
    }
    
    // Format time in PST (hours and minutes)
    const hours12 = datePST.getHours() % 12 || 12;
    const minutesPadded = datePST.getMinutes().toString().padStart(2, '0');
    const ampm = datePST.getHours() >= 12 ? 'PM' : 'AM';
    const timeString = `${hours12}:${minutesPadded} ${ampm}`;
    
    // Check if message is from today (same calendar day in PST)
    const todayPST = new Date(nowPST.getFullYear(), nowPST.getMonth(), nowPST.getDate());
    const messageDatePST = new Date(datePST.getFullYear(), datePST.getMonth(), datePST.getDate());
    const isToday = todayPST.getTime() === messageDatePST.getTime();
    
    // Check if message is from yesterday (in PST)
    const yesterdayPST = new Date(todayPST);
    yesterdayPST.setDate(yesterdayPST.getDate() - 1);
    const isYesterday = messageDatePST.getTime() === yesterdayPST.getTime();
    
    // If message is from today, show only time
    if (isToday) {
      return timeString;
    }
    
    // If message is from yesterday, show "Yesterday" with time
    if (isYesterday) {
      return `Yesterday ${timeString}`;
    }
    
    // For messages older than yesterday, show day name with time
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[datePST.getDay()];
    
    // For messages older than a week, include month and day
    const daysDiff = Math.floor(diff / 86400000);
    if (daysDiff > 7) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[datePST.getMonth()];
      const day = datePST.getDate();
      return `${dayName} ${monthName} ${day}, ${timeString}`;
    }
    
    // For messages within the last week (but not today or yesterday), show day name with time
    return `${dayName} ${timeString}`;
  };

  // Format full date for tooltip (like "Mon 1:58 AM") - Using Philippine Standard Time
  const formatDateTooltip = (dateInput) => {
    if (!dateInput) return 'Just now';
    
    // Handle different input formats
    let dateValue;
    if (typeof dateInput === 'string') {
      dateValue = dateInput;
    } else if (dateInput && typeof dateInput === 'object') {
      dateValue = dateInput.createdAt || dateInput.created_at || dateInput;
      if (typeof dateValue === 'object' && dateValue instanceof Date) {
        dateValue = dateValue.toISOString();
      }
    } else {
      dateValue = dateInput;
    }
    
    const date = new Date(dateValue);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Just now';
    }
    
    // Convert to Philippine Standard Time
    const datePST = toPST(date);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[datePST.getDay()];
    const hours12 = datePST.getHours() % 12 || 12;
    const minutesPadded = datePST.getMinutes().toString().padStart(2, '0');
    const ampm = datePST.getHours() >= 12 ? 'PM' : 'AM';
    
    // For messages older than a year, include the date
    const nowPST = toPST(new Date());
    const diff = nowPST - datePST;
    const days = Math.floor(diff / 86400000);
    
    if (days > 365) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[datePST.getMonth()];
      const day = datePST.getDate();
      return `${dayName} ${monthName} ${day} at ${hours12}:${minutesPadded} ${ampm}`;
    }
    
    return `${dayName} ${hours12}:${minutesPadded} ${ampm}`;
  };

  // Get file icon with real logos
  const getFileIcon = (mimetype, fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    // PDF
    if (mimetype.includes('pdf') || ext === 'pdf') {
      return (
        <span className="relative inline-block">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png" 
            alt="PDF" 
            className="w-6 h-6 object-contain"
            onError={(e) => { e.target.outerHTML = '<span class="text-xl">📄</span>'; }}
          />
        </span>
      );
    }
    
    // Word Documents
    if (mimetype.includes('word') || ext === 'doc' || ext === 'docx') {
      return (
        <span className="relative inline-block">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Microsoft_Word_logo_%282019%E2%80%93present%29.svg/647px-Microsoft_Word_logo_%282019%E2%80%93present%29.svg.png" 
            alt="Word" 
            className="w-6 h-6 object-contain"
            onError={(e) => { e.target.outerHTML = '<span class="text-xl">📝</span>'; }}
          />
        </span>
      );
    }
    
    // Excel
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet') || ext === 'xls' || ext === 'xlsx') {
      return (
        <span className="relative inline-block">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Microsoft_Excel_Logo_%282019%E2%80%93present%29.svg/647px-Microsoft_Excel_Logo_%282019%E2%80%93present%29.svg.png" 
            alt="Excel" 
            className="w-6 h-6 object-contain"
            onError={(e) => { e.target.outerHTML = '<span class="text-xl">📊</span>'; }}
          />
        </span>
      );
    }
    
    // PowerPoint
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation') || ext === 'ppt' || ext === 'pptx') {
      return (
        <span className="relative inline-block">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Microsoft_Office_PowerPoint_%282019%E2%80%93present%29.svg/647px-Microsoft_Office_PowerPoint_%282019%E2%80%93present%29.svg.png" 
            alt="PowerPoint" 
            className="w-6 h-6 object-contain"
            onError={(e) => { e.target.outerHTML = '<span class="text-xl">📊</span>'; }}
          />
        </span>
      );
    }
    
    // Images
    if (mimetype.startsWith('image/')) {
      return <span className="text-xl">🖼️</span>;
    }
    
    // Videos
    if (mimetype.startsWith('video/')) {
      return <span className="text-xl">🎥</span>;
    }
    
    // Archives
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive') || 
        ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'tar' || ext === 'gz') {
      return <span className="text-xl">📦</span>;
    }
    
    // Default
    return <span className="text-xl">📎</span>;
  };

  // Bad words filter - English and Tagalog
  const badWords = [
    // English bad words
    'fuck', 'fucking', 'fucked', 'shit', 'shitting', 'asshole', 'bitch', 'bastard', 
    'damn', 'damned', 'crap', 'piss', 'pissed', 'dick', 'cock', 'pussy',
    'retard', 'retarded', 'stupid', 'idiot', 'moron', 'dumbass', 'douchebag',
    // Note: 'hell' is excluded to avoid false positives with "hello", "shell", etc.
    // Tagalog bad words (common profanities and variations)
    'putang', 'putang ina', 'putangina', 'putang-ina', 'tang ina', 'tangina', 'tang-ina',
    'puta', 'puta ka', 'putaka', 'gago', 'gagu', 'gago ka', 'gagu ka',
    'tarantado', 'tarantada', 'bobo', 'bubu', 'bobo ka', 'bubu ka',
    'tanga', 'tanga ka', 'ulol', 'ulol ka', 'lintik', 'lintik ka',
    'hayop', 'hayop ka', 'pakyu', 'pakyu ka', 'pak yu', 'pak-yu',
    'leche', 'leche ka', 'lech ka', 'walang hiya', 'walanghiya', 'walang-hiya',
    'walangya', 'walang ya', 'pakshet', 'pakshet ka', 'pakshit', 'pakshit ka',
    // Additional Tagalog variations
    'tangina mo', 'tang ina mo', 'putang ina mo', 'putangina mo',
    'gago mo', 'gagu mo', 'bobo mo', 'tanga mo', 'ulol mo',
    'pakyu mo', 'pakshet mo', 'leche mo', 'walangya mo'
  ];

  // Check if message contains bad words
  const containsBadWords = (text) => {
    if (!text || typeof text !== 'string') return false;
    
    const originalText = text.toLowerCase();
    
    // Normalize text: remove extra spaces, handle common character variations
    // Keep punctuation for phrase matching, but normalize spaces
    let normalizedText = originalText
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim();
    
    // Also create a version without punctuation for better matching
    let textWithoutPunct = normalizedText.replace(/[^\w\s]/g, '');
    
    // Check for bad words with improved matching
    for (const badWord of badWords) {
      const normalizedBadWord = badWord.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // For multi-word phrases, check both with and without punctuation
      if (normalizedBadWord.includes(' ')) {
        // Create patterns that match with flexible spacing and optional punctuation
        const words = normalizedBadWord.split(' ');
        // Pattern 1: With spaces (handles "putang ina", "putang  ina", etc.)
        const phrasePatternWithSpaces = words.map(word => 
          word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('\\s+');
        // Pattern 2: Without spaces (handles "putangina")
        const phrasePatternNoSpaces = words.join('');
        // Pattern 3: With optional punctuation (handles "putang-ina")
        const phrasePatternWithPunct = words.map(word => 
          word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('[\\s\\-]+');
        
        // Check all variations
        if (new RegExp(phrasePatternWithSpaces, 'i').test(normalizedText) ||
            new RegExp(phrasePatternNoSpaces, 'i').test(textWithoutPunct) ||
            new RegExp(phrasePatternWithPunct, 'i').test(originalText)) {
          return true;
        }
      } else {
        // For single words, use strict word boundaries to avoid false positives
        // This prevents "hell" from matching "hello", "shell", etc.
        // Check both with and without punctuation
        const escapedWord = normalizedBadWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wholeWordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        if (wholeWordRegex.test(normalizedText) || wholeWordRegex.test(textWithoutPunct)) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Load media history
  const loadMediaHistory = async () => {
    if (!selectedConversation) return;
    
    setLoadingMedia(true);
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/messages/media/${selectedConversation.partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMediaHistory(response.data.media || []);
      }
    } catch (error) {
      console.error('Error loading media history:', error);
      setMediaHistory([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Load files history
  const loadFilesHistory = async () => {
    if (!selectedConversation) {
      console.warn('⚠️ Cannot load files history: no conversation selected');
      console.warn('⚠️ selectedConversation:', selectedConversation);
      return;
    }
    
    const partnerId = selectedConversation.partnerId || selectedConversation.partner?.id;
    if (!partnerId) {
      console.error('❌ No partner ID found in selected conversation');
      console.error('❌ selectedConversation:', selectedConversation);
      return;
    }
    
    console.log('📁 ========== LOADING FILES HISTORY ==========');
    console.log('📁 Partner ID:', partnerId);
    console.log('📁 Selected Conversation:', selectedConversation);
    console.log('📁 API URL:', `${API_URL}/messages/files/${partnerId}`);
    
    setLoadingFiles(true);
    try {
      const token = getToken();
      if (!token) {
        console.error('❌ No token available for loading files history');
        setFilesHistory([]);
        return;
      }
      
      console.log('📁 Making API request...');
      const startTime = Date.now();
      
      const response = await axios.get(`${API_URL}/messages/files/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const duration = Date.now() - startTime;
      console.log(`📁 API request completed in ${duration}ms`);
      console.log('📁 Response status:', response.status);
      console.log('📁 Files history response:', response.data);
      
      if (response.data.success) {
        const files = response.data.files || [];
        console.log(`📁 Loaded ${files.length} files`);
        if (files.length > 0) {
          console.log('📁 Files:', files);
          console.log('📁 Sample file:', files[0]);
        } else {
          console.warn('⚠️ No files returned from API');
          console.warn('⚠️ This could mean:');
          console.warn('  1. No messages with type="file" exist');
          console.warn('  2. Messages exist but have empty attachments');
          console.warn('  3. Backend query is not finding the messages');
        }
        setFilesHistory(files);
      } else {
        console.warn('⚠️ Files history response not successful:', response.data);
        setFilesHistory([]);
      }
    } catch (error) {
      console.error('❌ ========== ERROR LOADING FILES HISTORY ==========');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error config:', error.config);
      setFilesHistory([]);
    } finally {
      setLoadingFiles(false);
      console.log('📁 ========== FILES HISTORY LOAD COMPLETE ==========');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get current user ID
  const getCurrentUserId = () => {
    return getCurrentUserIdFromToken();
  };

  // Filter files by tab (All, Received, Sent)
  const getFilteredFiles = () => {
    const currentUserId = getCurrentUserId();
    let filtered = filesHistory;

    // Filter by tab
    if (filesFilterTab === 'received') {
      filtered = filtered.filter(file => String(file.senderId) !== String(currentUserId));
    } else if (filesFilterTab === 'sent') {
      filtered = filtered.filter(file => String(file.senderId) === String(currentUserId));
    }

    // Filter by date
    if (filesDateFilter !== 'all') {
      const now = new Date();
      const nowPST = toPST(now);
      filtered = filtered.filter(file => {
        const fileDate = new Date(file.createdAt);
        const fileDatePST = toPST(fileDate);
        const diffTime = nowPST - fileDatePST;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        switch (filesDateFilter) {
          case 'today':
            return diffDays === 0;
          case 'yesterday':
            return diffDays === 1;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  // Filter media by tab (All, Received, Sent)
  const getFilteredMedia = () => {
    const currentUserId = getCurrentUserId();
    let filtered = mediaHistory;

    // Filter by tab
    if (mediaFilterTab === 'received') {
      filtered = filtered.filter(item => String(item.senderId) !== String(currentUserId));
    } else if (mediaFilterTab === 'sent') {
      filtered = filtered.filter(item => String(item.senderId) === String(currentUserId));
    }

    // Filter by date
    if (mediaDateFilter !== 'all') {
      const now = new Date();
      const nowPST = toPST(now);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        const itemDatePST = toPST(itemDate);
        const diffTime = nowPST - itemDatePST;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        switch (mediaDateFilter) {
          case 'today':
            return diffDays === 0;
          case 'yesterday':
            return diffDays === 1;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
          {/* Header */}
          <div className={`${currentTheme.primary} px-4 py-4 text-white`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Messages</h2>
              <div className="flex items-center gap-2">
                {/* Project Alerts */}
                <ProjectAlertsCenter
                  theme={theme}
                  onAlertClick={(alert) => {
                    // Navigate to project when alert is clicked
                    if (alert.projectId) {
                      // First, try to find existing conversation with this project (search in all conversations)
                      let projectConversation = allConversations.find(c => 
                        c.linkedProjects && c.linkedProjects.some(p => p.id === alert.projectId)
                      );
                      
                      // If found, navigate to it
                      if (projectConversation) {
                        setSelectedConversation(projectConversation);
                        setProjectFilterId(alert.projectId);
                        setActiveTab('project');
                        loadMessages(projectConversation.partnerId);
                      } else {
                        // If no conversation exists, set project filter and switch to project tab
                        setProjectFilterId(alert.projectId);
                        setActiveTab('project');
                        // Reload conversations to see if any appear
                        loadConversations();
                      }
                    }
                  }}
                />
              {unreadConversations.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadConversations.length}
                </span>
              )}
            </div>
            </div>
            {/* Smart Project Search */}
            <div className="mb-3">
              <ProjectSearchCenter
                onResultSelect={(result, type) => {
                  if (type === 'project') {
                    // Navigate to project conversation
                    // First, try to find existing conversation with this project (search in all conversations)
                    let projectConversation = allConversations.find(c => 
                      c.linkedProjects && c.linkedProjects.some(p => p.id === result.id)
                    );
                    
                    // If no conversation found, try to find any conversation with a user who has access to this project
                    if (!projectConversation) {
                      // Find conversations where the partner might have access to this project
                      projectConversation = allConversations.find(c => {
                        // Check if we can find a conversation with someone who has this project
                        return c.partnerId; // At least find a conversation to start
                      });
                      
                      // If still no conversation, try to load conversations again
                      if (!projectConversation && allConversations.length > 0) {
                        // Select the first conversation and set project filter
                        projectConversation = allConversations[0];
                        setProjectFilterId(result.id);
                      }
                    }
                    
                    if (projectConversation) {
                      setSelectedConversation(projectConversation);
                      setProjectFilterId(result.id);
                      loadMessages(projectConversation.partnerId);
                    } else {
                      // If no conversation exists, set project filter and show message
                      setProjectFilterId(result.id);
                      setActiveTab('project');
                    }
                  } else if (type === 'message') {
                    // Navigate to message's conversation
                    if (result.projectId) {
                      let projectConversation = allConversations.find(c => 
                        c.linkedProjects && c.linkedProjects.some(p => p.id === result.projectId)
                      );
                      
                      if (!projectConversation) {
                        // Try to find sender's conversation
                        projectConversation = allConversations.find(c => 
                          String(c.partnerId) === String(result.sender?.id)
                        );
                      }
                      
                      if (projectConversation) {
                        setSelectedConversation(projectConversation);
                        setProjectFilterId(result.projectId);
                        loadMessages(projectConversation.partnerId);
                      }
                    }
                  }
                }}
                projectId={projectFilterId}
                theme={theme}
              />
            </div>
            {/* Tabs - Horizontally Scrollable */}
            <div 
              className="border-t border-white/20 pt-3 overflow-x-auto pb-1 messaging-tabs-scrollable"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.4) rgba(255, 255, 255, 0.1)',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex gap-1 min-w-max" style={{ paddingBottom: '2px' }}>
              <button
                onClick={() => {
                  setActiveTab('all');
                  setProjectFilterId(null); // Clear project filter when switching to All Contacts
                }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'all' 
                    ? theme === 'black' ? 'text-white border-b-2 border-gray-900' : 'bg-white/30 text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                All Contacts
              </button>
              <button
                onClick={() => {
                  setActiveTab('department');
                  setProjectFilterId(null); // Clear project filter when switching to By Department
                }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'department' 
                    ? theme === 'black' ? 'text-white border-b-2 border-gray-900' : 'bg-white/30 text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                By Department
              </button>
              <button
                onClick={() => {
                  setActiveTab('unread');
                  setProjectFilterId(null); // Clear project filter when switching to Unread
                }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'unread' 
                    ? theme === 'black' ? 'text-white border-b-2 border-gray-900' : 'bg-white/30 text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                Unread
                {unreadConversations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {unreadConversations.length > 9 ? '9+' : unreadConversations.length}
                  </span>
                )}
              </button>
                <button
                  onClick={() => {
                    setActiveTab('project');
                    // Don't clear filter when switching to project tab - keep it if one is set
                    // Only clear if we're coming from another tab and want to see all projects
                    if (activeTab !== 'project') {
                      setProjectFilterId(null); // Reset filter when first switching to project tab
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'project' 
                      ? theme === 'black' ? 'text-white border-b-2 border-gray-900' : 'bg-white/30 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  By Project
                </button>
              </div>
            </div>
          </div>

          {/* Content based on active tab */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'all' && (
              <>
                {/* Active Conversations Section - Always use allConversations for All Contacts tab */}
                {allConversations.length > 0 && (
                  <div className="border-b border-gray-200">
                    <div className="px-4 py-2 bg-gray-50">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Conversations</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {allConversations
                        .filter(conv => {
                          if (!searchQuery) return true;
                          const query = searchQuery.toLowerCase();
                          return (
                            conv.partner?.name?.toLowerCase().includes(query) ||
                            conv.lastMessage?.content?.toLowerCase().includes(query)
                          );
                        })
                        .map(conv => (
                          <button
                            key={conv.partnerId}
                            onClick={() => selectConversation(conv)}
                            className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                              selectedConversation?.partnerId === conv.partnerId 
                                ? `${currentTheme.primaryLight} ${theme === 'green' ? 'border-green-600' : theme === 'orange' ? 'border-orange-600' : theme === 'light-blue' ? 'border-sky-600' : theme === 'black' ? 'border-gray-900' : 'border-blue-600'}` 
                                : 'border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 flex-shrink-0" style={{ position: 'relative' }}>
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                  {getProfilePictureUrl(conv.partnerId) ? (
                                    <ProfilePictureImage
                                      userId={conv.partnerId}
                                      url={getProfilePictureUrl(conv.partnerId)}
                                      alt={conv.partner?.name || 'User'}
                                    />
                                  ) : null}
                                  <div 
                                    className="w-full h-full flex items-center justify-center text-white font-semibold text-sm" 
                                    style={{ display: getProfilePictureUrl(conv.partnerId) ? 'none' : 'flex' }}
                                  >
                                    {conv.partner?.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                </div>
                                {/* Activity Status Indicator */}
                                <div
                                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                                  style={{ backgroundColor: 'white' }}
                                  title={getUserStatus(conv.partnerId) === 'active' ? 'Active' : getUserStatus(conv.partnerId) === 'inactive' ? 'Inactive' : 'Unknown'}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      getUserStatus(conv.partnerId) === 'active'
                                        ? 'bg-green-500'
                                        : getUserStatus(conv.partnerId) === 'inactive'
                                        ? 'bg-gray-400'
                                        : 'bg-gray-300'
                                    }`}
                                    style={{
                                      boxShadow: getUserStatus(conv.partnerId) === 'active' 
                                        ? '0 0 0 2px rgba(16, 185, 129, 0.3)' 
                                        : undefined
                                    }}
                                  />
                                </div>
                                {/* Unread badge */}
                                {conv.unreadCount > 0 && (
                                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
                                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="font-semibold text-gray-800 truncate text-sm">
                                    {conv.partner?.name || 'Unknown'}
                                  </div>
                                  {conv.lastMessage && (() => {
                                    const timestamp = conv.lastMessage.createdAt || conv.lastMessage.created_at;
                                    const formatted = formatDate(timestamp);
                                    // Debug logging
                                    if (formatted === 'Just now') {
                                      console.log('⚠️ Sidebar timestamp showing "Just now":', {
                                        conversation: conv.partner?.name,
                                        timestamp,
                                        timestampType: typeof timestamp,
                                        lastMessage: conv.lastMessage
                                      });
                                    }
                                    return (
                                      <span 
                                        className="text-xs text-gray-500 ml-2 flex-shrink-0 cursor-default"
                                        title={formatDateTooltip(timestamp)}
                                      >
                                        {formatted}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-600 truncate">
                                    {conv.lastMessage?.content?.substring(0, 40) || 'No messages yet'}
                                    {conv.lastMessage?.content && conv.lastMessage.content.length > 40 ? '...' : ''}
                                  </p>
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5 truncate">
                                  {conv.partner?.role} • {conv.partner?.department}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* All Users/Recipients Section */}
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      All Contacts
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {loading ? (
                      <div className="p-4 text-center text-gray-500 text-sm">Loading contacts...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {searchQuery ? 'No contacts found.' : 'No contacts available.'}
                      </div>
                    ) : (
                      filteredUsers.map(user => {
                        // Check if user already has a conversation (search in all conversations)
                        const existingConv = allConversations.find(c => c.partnerId === user.id);
                        const isSelected = selectedConversation?.partnerId === user.id;
                        
                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              if (existingConv) {
                                selectConversation(existingConv);
                              } else {
                                startNewConversation(user);
                              }
                            }}
                            className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                              isSelected 
                                ? `${currentTheme.primaryLight} ${theme === 'green' ? 'border-green-600' : theme === 'orange' ? 'border-orange-600' : theme === 'light-blue' ? 'border-sky-600' : theme === 'black' ? 'border-gray-900' : 'border-blue-600'}` 
                                : 'border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 flex-shrink-0" style={{ position: 'relative' }}>
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                  {getProfilePictureUrl(user.id) ? (
                                    <ProfilePictureImage
                                      userId={user.id}
                                      url={getProfilePictureUrl(user.id)}
                                      alt={user.name || 'User'}
                                    />
                                  ) : null}
                                  <div 
                                    className="w-full h-full flex items-center justify-center text-white font-semibold text-sm" 
                                    style={{ display: getProfilePictureUrl(user.id) ? 'none' : 'flex' }}
                                  >
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                </div>
                                {/* Activity Status Indicator */}
                                <div
                                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                                  style={{ backgroundColor: 'white' }}
                                  title={getUserStatus(user.id) === 'active' ? 'Active' : getUserStatus(user.id) === 'inactive' ? 'Inactive' : 'Unknown'}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      getUserStatus(user.id) === 'active'
                                        ? 'bg-green-500'
                                        : getUserStatus(user.id) === 'inactive'
                                        ? 'bg-gray-400'
                                        : 'bg-gray-300'
                                    }`}
                                    style={{
                                      boxShadow: getUserStatus(user.id) === 'active' 
                                        ? '0 0 0 2px rgba(16, 185, 129, 0.3)' 
                                        : undefined
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="font-semibold text-gray-800 truncate text-sm">
                                    {user.name}
                                  </div>
                                  {existingConv && (
                                    <span className="text-xs text-gray-400 ml-2">●</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {user.role} • {user.department}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'department' && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Contacts by Department
                  </h3>
                </div>
                {loading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Loading contacts...</div>
                ) : sortedDepartments.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchQuery ? 'No departments found.' : 'No contacts available.'}
                  </div>
                ) : (
                  sortedDepartments.map(dept => (
                    <div key={dept} className="border-b border-gray-200">
                      <div className="px-4 py-2 bg-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700">{dept}</h4>
                        <p className="text-xs text-gray-500">{usersByDepartment[dept].length} contact{usersByDepartment[dept].length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {usersByDepartment[dept].map(user => {
                          const existingConv = allConversations.find(c => c.partnerId === user.id);
                          const isSelected = selectedConversation?.partnerId === user.id;
                          
                          return (
                            <button
                              key={user.id}
                              onClick={() => {
                                if (existingConv) {
                                  selectConversation(existingConv);
                                } else {
                                  startNewConversation(user);
                                }
                              }}
                              className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                                isSelected 
                                  ? `${currentTheme.primaryLight} ${theme === 'green' ? 'border-green-600' : theme === 'orange' ? 'border-orange-600' : theme === 'light-blue' ? 'border-sky-600' : 'border-blue-600'}` 
                                  : 'border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 flex-shrink-0" style={{ position: 'relative' }}>
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                    {getProfilePictureUrl(user.id) ? (
                                      <img
                                        src={getProfilePictureUrl(user.id)}
                                        alt={user.name || 'User'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                        style={{ display: 'block' }}
                                      />
                                    ) : null}
                                    <div 
                                      className="w-full h-full flex items-center justify-center text-white font-semibold text-sm" 
                                      style={{ display: getProfilePictureUrl(user.id) ? 'none' : 'flex' }}
                                    >
                                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                  </div>
                                  {/* Activity Status Indicator */}
                                  <div
                                    className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                                    style={{ backgroundColor: 'white' }}
                                    title={getUserStatus(user.id) === 'active' ? 'Active' : getUserStatus(user.id) === 'inactive' ? 'Inactive' : 'Unknown'}
                                  >
                                    <div
                                      className={`w-3 h-3 rounded-full ${
                                        getUserStatus(user.id) === 'active'
                                          ? 'bg-green-500'
                                          : getUserStatus(user.id) === 'inactive'
                                          ? 'bg-gray-400'
                                          : 'bg-gray-300'
                                      }`}
                                      style={{
                                        boxShadow: getUserStatus(user.id) === 'active' 
                                          ? '0 0 0 2px rgba(16, 185, 129, 0.3)' 
                                          : undefined
                                      }}
                                    />
                                  </div>
                                  {/* Unread badge */}
                                  {existingConv && existingConv.unreadCount > 0 && (
                                    <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
                                      {existingConv.unreadCount > 9 ? '9+' : existingConv.unreadCount}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <div className="font-semibold text-gray-800 truncate text-sm">
                                      {user.name}
                                    </div>
                                    {existingConv && (
                                      <span className="text-xs text-gray-400 ml-2">●</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 truncate">
                                    {user.role}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'project' && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Conversations by Project
                  </h3>
                </div>
                {loading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Loading projects...</div>
                ) : (() => {
                  // Get all unique projects from all conversations (not filtered)
                  const projectMap = new Map();
                  allConversations.forEach(conv => {
                    if (conv.linkedProjects && conv.linkedProjects.length > 0) {
                      conv.linkedProjects.forEach(project => {
                        if (project && project.id && !projectMap.has(project.id)) {
                          projectMap.set(project.id, {
                            ...project,
                            conversationCount: 0
                          });
                        }
                      });
                    }
                  });
                  
                  // Count conversations per project
                  allConversations.forEach(conv => {
                    if (conv.linkedProjects && conv.linkedProjects.length > 0) {
                      conv.linkedProjects.forEach(project => {
                        if (project && project.id && projectMap.has(project.id)) {
                          projectMap.get(project.id).conversationCount++;
                        }
                      });
                    }
                  });
                  
                  const projectsList = Array.from(projectMap.values());
                  
                  if (projectsList.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <div className={`w-16 h-16 mx-auto mb-4 ${currentTheme.primaryLight} rounded-full flex items-center justify-center`}>
                          <svg className={`w-8 h-8 ${currentTheme.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">No project-linked conversations</p>
                        <p className="text-xs text-gray-500">Link messages to projects to see them here</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="divide-y divide-gray-100">
                      {projectsList.map(project => (
                        <button
                          key={project.id}
                          onClick={() => {
                            setProjectFilterId(project.id);
                            // Find and open a conversation with this project (search in all conversations)
                            const projectConversation = allConversations.find(c => 
                              c.linkedProjects && c.linkedProjects.some(p => p.id === project.id)
                            );
                            
                            if (projectConversation) {
                              setSelectedConversation(projectConversation);
                              loadMessages(projectConversation.partnerId);
                            } else {
                              // If no conversation exists, reload to check for new ones
                              loadConversations();
                            }
                          }}
                          className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                            projectFilterId === project.id
                              ? `${currentTheme.primaryLight} ${theme === 'green' ? 'border-green-600' : theme === 'orange' ? 'border-orange-600' : theme === 'light-blue' ? 'border-sky-600' : 'border-blue-600'}` 
                              : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-800 truncate">
                                  {project.projectCode || 'N/A'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs text-white ${
                                  project.status === 'ongoing' ? 'bg-blue-500' :
                                  project.status === 'pending' ? 'bg-yellow-500' :
                                  project.status === 'delayed' ? 'bg-red-500' :
                                  project.status === 'complete' ? 'bg-green-500' :
                                  'bg-gray-500'
                                }`}>
                                  {project.status || 'N/A'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 truncate">{project.name}</p>
                              {project.location && (
                                <p className="text-xs text-gray-500 mt-1">{project.location}</p>
                              )}
                            </div>
                            <div className="text-right ml-2">
                              <div className="text-sm font-semibold text-gray-800">
                                {project.conversationCount}
                              </div>
                              <div className="text-xs text-gray-500">
                                {project.conversationCount === 1 ? 'conversation' : 'conversations'}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'unread' && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Unread Messages ({unreadConversations.length})
                  </h3>
                </div>
                {unreadConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 ${currentTheme.primaryLight} rounded-full flex items-center justify-center`}>
                      <svg className={`w-8 h-8 ${currentTheme.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">All caught up!</p>
                    <p className="text-xs text-gray-500">You have no unread messages</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {unreadConversations
                      .filter(conv => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          conv.partner?.name?.toLowerCase().includes(query) ||
                          conv.lastMessage?.content?.toLowerCase().includes(query)
                        );
                      })
                      .map(conv => (
                        <button
                          key={conv.partnerId}
                          onClick={() => selectConversation(conv)}
                          className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                            selectedConversation?.partnerId === conv.partnerId 
                              ? `${currentTheme.primaryLight} ${theme === 'green' ? 'border-green-600' : theme === 'orange' ? 'border-orange-600' : theme === 'light-blue' ? 'border-sky-600' : 'border-blue-600'}` 
                              : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 flex-shrink-0" style={{ position: 'relative' }}>
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                {getProfilePictureUrl(conv.partnerId) ? (
                                  <ProfilePictureImage
                                    userId={conv.partnerId}
                                    url={getProfilePictureUrl(conv.partnerId)}
                                    alt={conv.partner?.name || 'User'}
                                  />
                                ) : null}
                                <div 
                                  className="w-full h-full flex items-center justify-center text-white font-semibold text-sm" 
                                  style={{ display: getProfilePictureUrl(conv.partnerId) ? 'none' : 'flex' }}
                                >
                                  {conv.partner?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              </div>
                              {/* Activity Status Indicator */}
                              <div
                                className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                                style={{ backgroundColor: 'white' }}
                                title={getUserStatus(conv.partnerId) === 'active' ? 'Active' : getUserStatus(conv.partnerId) === 'inactive' ? 'Inactive' : 'Unknown'}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    getUserStatus(conv.partnerId) === 'active'
                                      ? 'bg-green-500'
                                      : getUserStatus(conv.partnerId) === 'inactive'
                                      ? 'bg-gray-400'
                                      : 'bg-gray-300'
                                  }`}
                                  style={{
                                    boxShadow: getUserStatus(conv.partnerId) === 'active' 
                                      ? '0 0 0 2px rgba(16, 185, 129, 0.3)' 
                                      : undefined
                                  }}
                                />
                              </div>
                              {/* Unread badge */}
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="font-semibold text-gray-800 truncate text-sm">
                                  {conv.partner?.name || 'Unknown'}
                                </div>
                                {conv.lastMessage && (() => {
                                  const timestamp = conv.lastMessage.createdAt || conv.lastMessage.created_at;
                                  const formatted = formatDate(timestamp);
                                  // Debug logging
                                  if (formatted === 'Just now') {
                                    console.log('⚠️ Sidebar timestamp showing "Just now":', {
                                      conversation: conv.partner?.name,
                                      timestamp,
                                      timestampType: typeof timestamp,
                                      lastMessage: conv.lastMessage
                                    });
                                  }
                                  return (
                                    <span 
                                      className="text-xs text-gray-500 ml-2 flex-shrink-0 cursor-default"
                                      title={formatDateTooltip(timestamp)}
                                    >
                                      {formatted}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-600 truncate font-medium">
                                  {conv.lastMessage?.content?.substring(0, 40) || 'No messages yet'}
                                  {conv.lastMessage?.content && conv.lastMessage.content.length > 40 ? '...' : ''}
                                </p>
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5 truncate">
                                {conv.partner?.role} • {conv.partner?.department}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className={`${currentTheme.primary} px-6 py-4 text-white flex items-center justify-between border-b ${currentTheme.primaryBorder}`}>
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                      {getProfilePictureUrl(selectedConversation.partnerId) ? (
                        <ProfilePictureImage
                          userId={selectedConversation.partnerId}
                          url={getProfilePictureUrl(selectedConversation.partnerId)}
                          alt={selectedConversation.partner?.name || 'User'}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full flex items-center justify-center text-white font-semibold text-sm" 
                        style={{ display: getProfilePictureUrl(selectedConversation.partnerId) ? 'none' : 'flex' }}
                      >
                        {selectedConversation.partner?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    </div>
                    {/* Activity Status Indicator */}
                    <div
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ backgroundColor: 'white' }}
                      title={getUserStatus(selectedConversation.partnerId) === 'active' ? 'Active' : getUserStatus(selectedConversation.partnerId) === 'inactive' ? 'Inactive' : 'Unknown'}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          getUserStatus(selectedConversation.partnerId) === 'active'
                            ? 'bg-green-500'
                            : getUserStatus(selectedConversation.partnerId) === 'inactive'
                            ? 'bg-gray-400'
                            : 'bg-gray-300'
                        }`}
                        style={{
                          boxShadow: getUserStatus(selectedConversation.partnerId) === 'active' 
                            ? '0 0 0 2px rgba(16, 185, 129, 0.3)' 
                            : undefined
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {selectedConversation.partner?.name || 'Unknown'}
                      <span className={`text-xs ${getUserStatus(selectedConversation.partnerId) === 'active' ? 'text-green-300' : 'text-gray-300'}`}>
                        {getUserStatus(selectedConversation.partnerId) === 'active' ? '● Active' : getUserStatus(selectedConversation.partnerId) === 'inactive' ? '○ Inactive' : ''}
                      </span>
                    </div>
                    <div className="text-sm opacity-75">{selectedConversation.partner?.role} • {selectedConversation.partner?.department}</div>
                    {/* Project Context - Enhanced */}
                    {selectedConversation.linkedProjects && selectedConversation.linkedProjects.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {selectedConversation.linkedProjects.map((project, idx) => (
                          <span
                            key={project.id || idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/25 text-white rounded-lg text-xs font-medium border border-white/40 backdrop-blur-sm shadow-sm"
                            title={`Project: ${project.name || project.projectCode}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-semibold">{project.projectCode || 'N/A'}</span>
                          </span>
                        ))}
                        {/* Analytics Button */}
                        {selectedConversation.linkedProjects.length > 0 && selectedConversation.linkedProjects[0]?.id && (
                          <button
                            onClick={() => {
                              setShowAnalytics(!showAnalytics);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/25 text-white rounded-lg text-xs font-medium border border-white/40 backdrop-blur-sm shadow-sm hover:bg-white/35 transition-colors"
                            title="View Project Analytics"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Analytics</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {typing[selectedConversation.partnerId] && (
                    <div className="text-sm opacity-75">typing...</div>
                  )}
                  {/* Media and Files History Buttons */}
                  <button
                    onClick={() => {
                      setShowMediaHistory(true);
                      setShowFilesHistory(false);
                      loadMediaHistory();
                    }}
                    className={`p-2 rounded-lg hover:bg-white/20 transition-colors ${currentTheme.primaryLight} ${currentTheme.primaryText}`}
                    title="View photos & videos"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setShowFilesHistory(true);
                      setShowMediaHistory(false);
                      loadFilesHistory();
                    }}
                    className={`p-2 rounded-lg hover:bg-white/20 transition-colors ${currentTheme.primaryLight} ${currentTheme.primaryText}`}
                    title="View files"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Project Analytics Widget */}
              {showAnalytics && selectedConversation?.linkedProjects && selectedConversation.linkedProjects.length > 0 && (
                <div className="border-b border-gray-200 p-4 bg-white">
                  <ProjectAnalyticsCenter
                    projectId={selectedConversation.linkedProjects[0].id}
                    theme={theme}
                    onClose={() => setShowAnalytics(false)}
                  />
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                {/* Deduplicate messages by ID before rendering */}
                {messages
                  .filter((message, index, self) => 
                    index === self.findIndex(m => m.id === message.id)
                  )
                  .map((message) => {
                  const currentUserId = getCurrentUserIdFromToken();
                  const isSender = String(message.senderId) === String(currentUserId);
                  const senderId = isSender ? currentUserId : message.senderId;
                  
                  // Get sender name - try multiple sources
                  let senderName = null;
                  if (isSender) {
                    // For outgoing messages, try message.sender first, then availableUsers, then allConversations
                    senderName = message.sender?.name || 
                                 availableUsers.find(u => String(u.id) === String(currentUserId) || String(u.userId) === String(currentUserId))?.name ||
                                 allConversations.find(c => String(c.partnerId) === String(currentUserId))?.partner?.name ||
                                 null;
                  } else {
                    // For incoming messages, try message.sender first, then selectedConversation partner
                    senderName = message.sender?.name || 
                                 selectedConversation?.partner?.name ||
                                 availableUsers.find(u => String(u.id) === String(senderId) || String(u.userId) === String(senderId))?.name ||
                                 null;
                  }
                  
                  // Calculate initial - use first letter of name, or fallback
                  const senderInitial = senderName && senderName !== 'You'
                    ? senderName.charAt(0).toUpperCase()
                    : (isSender ? (availableUsers.find(u => String(u.id) === String(currentUserId))?.name?.charAt(0)?.toUpperCase() || 'Y') : 'U');
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Profile Picture - Show for incoming messages (on left) */}
                      {!isSender && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                          {getProfilePictureUrl(message.senderId) ? (
                            <ProfilePictureImage
                              userId={message.senderId}
                              url={getProfilePictureUrl(message.senderId)}
                              alt={senderName}
                            />
                          ) : null}
                          <div
                            className="w-full h-full flex items-center justify-center text-gray-600 text-sm font-medium"
                            style={{ display: getProfilePictureUrl(message.senderId) ? 'none' : 'flex' }}
                          >
                            {senderInitial}
                          </div>
                        </div>
                      )}
                      
                      <div className={`max-w-md ${isSender ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            isSender
                              ? `${currentTheme.primary} text-white`
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          {message.type === 'image' && message.attachments && message.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {message.attachments.map((att, idx) => {
                                // Handle both att.path and att.url formats
                                const filePath = att.path || att.url || '';
                                const fileUrl = filePath.startsWith('http') 
                                  ? filePath 
                                  : `${API_URL.replace('/api', '')}${filePath}`;
                                
                                return (
                                  <ImageThumbnail
                                    key={`${message.id}-img-${idx}`}
                                    imageUrl={fileUrl}
                                    alt={att.originalName || att.filename || 'Image'}
                                    onView={() => setSelectedImage(fileUrl)}
                                  />
                                );
                              })}
                            </div>
                          )}
                          {message.type === 'video' && message.attachments && message.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {message.attachments.map((att, idx) => {
                                // Handle both att.path and att.url formats
                                const filePath = att.path || att.url || '';
                                const fileUrl = filePath.startsWith('http') 
                                  ? filePath 
                                  : `${API_URL.replace('/api', '')}${filePath}`;
                                
                                return (
                                  <div key={idx} className="relative">
                                    <video
                                      src={fileUrl}
                                      controls
                                      className="max-w-full max-h-64 h-auto rounded-lg shadow-sm"
                                      preload="metadata"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {message.type === 'file' && message.attachments && message.attachments.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {message.attachments.map((att, idx) => {
                                // Handle both att.path and att.url formats
                                const filePath = att.path || att.url || '';
                                const fileUrl = filePath.startsWith('http') 
                                  ? filePath 
                                  : `${API_URL.replace('/api', '')}${filePath}`;
                                
                                return (
                                  <a
                                    key={idx}
                                    href={fileUrl}
                                    download={att.originalName || att.filename}
                                    className="flex items-center gap-2 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <span className="flex items-center">{getFileIcon(att.mimetype, att.originalName || att.filename)}</span>
                                    <span className="text-sm truncate">{att.originalName || att.filename || 'File'}</span>
                                    {att.size && (
                                      <span className="text-xs opacity-75 ml-auto">
                                        {formatFileSize(att.size)}
                                      </span>
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          
                          {/* Project Badge - Enhanced Visibility */}
                          {(message.projectId && (message.project || availableProjects.find(p => p.id === message.projectId))) && (
                            <div className="mt-2 flex items-center">
                              {(() => {
                                const project = message.project || availableProjects.find(p => p.id === message.projectId);
                                if (!project) return null;
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all hover:shadow-lg ${
                                      isSender
                                        ? 'bg-white/30 text-white border-2 border-white/50 backdrop-blur-sm'
                                        : `${currentTheme.primaryLight} ${currentTheme.primaryText} border-2 ${currentTheme.primaryBorder}`
                                    }`}
                                    title={`Linked to Project: ${project.name || project.projectCode}`}
                                  >
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="font-bold">{project.projectCode || 'N/A'}</span>
                                    {project.name && project.name !== project.projectCode && (
                                      <span className="opacity-80 text-[10px]">• {project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name}</span>
                                    )}
                                  </span>
                                );
                              })()}
                        </div>
                          )}
                          
                          {/* Reactions Display */}
                          {message.reactions && Object.keys(message.reactions).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Object.entries(message.reactions).map(([emoji, userIds]) => {
                                const currentUserId = getCurrentUserIdFromToken();
                                const hasReacted = userIds && Array.isArray(userIds) && userIds.includes(currentUserId);
                                const reactionCount = userIds && Array.isArray(userIds) ? userIds.length : 0;
                                
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(message.id, emoji)}
                                    className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-all ${
                                      hasReacted
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                                    }`}
                                    title={`${reactionCount} reaction${reactionCount > 1 ? 's' : ''}`}
                                  >
                                    <span>{emoji}</span>
                                    {reactionCount > 0 && (
                                      <span className="text-xs font-medium">{reactionCount}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Reaction Button and Picker */}
                        <div className={`relative mt-1 ${isSender ? 'text-right' : 'text-left'}`}>
                          <button
                            onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                            title="Add reaction"
                          >
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </button>
                          
                          {/* Emoji Picker */}
                          {showReactionPicker === message.id && (
                            <div className={`absolute ${isSender ? 'right-0' : 'left-0'} bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 reaction-picker-container`}>
                              <div className="flex gap-1 flex-wrap" style={{ width: '200px' }}>
                                {['❤️', '😍', '🤣', '😊', '😎', '🤔', '😮', '👍', '👏', '🔥', '💯', '🎉'].map((emoji) => {
                                  const currentUserId = getCurrentUserIdFromToken();
                                  const messageReactions = message.reactions || {};
                                  const hasReacted = messageReactions[emoji] && Array.isArray(messageReactions[emoji]) && messageReactions[emoji].includes(currentUserId);
                                  
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        handleReaction(message.id, emoji);
                                        setShowReactionPicker(null);
                                      }}
                                      className={`text-2xl p-1 rounded hover:bg-gray-100 transition-colors ${
                                        hasReacted ? 'bg-blue-50' : ''
                                      }`}
                                      title={hasReacted ? 'Remove reaction' : 'Add reaction'}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-xs text-gray-500 mt-1 ${isSender ? 'text-right' : 'text-left'}`}>
                          <span 
                            title={formatDateTooltip(message.createdAt || message.created_at)}
                            className="cursor-help hover:underline"
                            style={{ cursor: 'help' }}
                          >
                            {formatDate(message.createdAt || message.created_at)}
                          </span>
                          {isSender && message.isRead && (
                            <span className="ml-2" title="Read">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Media History Panel */}
              {showMediaHistory && (
                <div className="absolute inset-0 bg-white z-50 flex flex-col">
                  <div className={`${currentTheme.primary} px-6 py-4 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setShowMediaHistory(false);
                            setShowFilesHistory(false);
                          }}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <h3 className="text-lg font-semibold">Photos & Videos</h3>
                      </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setMediaFilterTab('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          mediaFilterTab === 'all' 
                            ? theme === 'black' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setMediaFilterTab('received')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          mediaFilterTab === 'received' 
                            ? theme === 'black' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Received
                      </button>
                      <button
                        onClick={() => setMediaFilterTab('sent')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          mediaFilterTab === 'sent' 
                            ? theme === 'black' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Sent
                      </button>
                    </div>
                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                      <select
                        value={mediaDateFilter}
                        onChange={(e) => setMediaDateFilter(e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border appearance-none cursor-pointer ${
                          theme === 'black' 
                            ? 'bg-gray-800 text-white border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600' 
                            : 'bg-white/20 text-white border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50'
                        }`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${theme === 'black' ? 'white' : 'white'}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.5em 1.5em',
                          paddingRight: '2.5rem'
                        }}
                      >
                        <option value="all" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>All time</option>
                        <option value="today" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>Today</option>
                        <option value="yesterday" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>Yesterday</option>
                        <option value="week" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>This week</option>
                        <option value="month" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>This month</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingMedia ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500">Loading media...</div>
                      </div>
                    ) : (() => {
                      const filteredMedia = getFilteredMedia();
                      return filteredMedia.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p>{mediaHistory.length === 0 ? 'No photos or videos shared yet' : 'No media matches the selected filters'}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {filteredMedia.map((item) => {
                            const fileUrl = item.url.startsWith('http') 
                              ? item.url 
                              : `${API_URL.replace('/api', '')}${item.url}`;
                            const isSent = String(item.senderId) === String(getCurrentUserId());
                            return (
                              <div
                                key={item.id}
                                className="relative group"
                              >
                                {item.type === 'image' ? (
                                  <MediaThumbnail
                                    imageUrl={fileUrl}
                                    alt={item.originalName || item.filename || 'Image'}
                                    onView={() => setSelectedImage(fileUrl)}
                                  />
                                ) : (
                                  <div 
                                    className="relative w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer"
                                    onClick={() => setSelectedVideo({ url: fileUrl, title: item.originalName || item.filename || 'Video' })}
                                  >
                                    <video
                                      src={fileUrl}
                                      className="w-full h-full object-cover rounded-lg"
                                      muted
                                      preload="metadata"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2">
                                  {isSent ? (
                                    <span className={`text-xs px-2 py-1 text-white rounded ${theme === 'black' ? 'bg-gray-900' : 'bg-blue-500'}`}>Sent</span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 bg-green-500 text-white rounded">Received</span>
                                  )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-xs truncate">{item.originalName || item.filename || 'Media'}</p>
                                  <p className="text-white/70 text-xs">{formatDate(item.createdAt)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Files History Panel */}
              {showFilesHistory && (
                <div className="absolute inset-0 bg-white z-50 flex flex-col">
                  <div className={`${currentTheme.primary} px-6 py-4 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setShowMediaHistory(false);
                            setShowFilesHistory(false);
                          }}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <h3 className="text-lg font-semibold">Files</h3>
                      </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setFilesFilterTab('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filesFilterTab === 'all' 
                            ? theme === 'black' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilesFilterTab('received')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filesFilterTab === 'received' 
                            ? theme === 'black' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Received
                      </button>
                      <button
                        onClick={() => setFilesFilterTab('sent')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filesFilterTab === 'sent' 
                            ? theme === 'black' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Sent
                      </button>
                    </div>
                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                      <select
                        value={filesDateFilter}
                        onChange={(e) => setFilesDateFilter(e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border appearance-none cursor-pointer ${
                          theme === 'black' 
                            ? 'bg-gray-800 text-white border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600' 
                            : 'bg-white/20 text-white border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50'
                        }`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${theme === 'black' ? 'white' : 'white'}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.5em 1.5em',
                          paddingRight: '2.5rem'
                        }}
                      >
                        <option value="all" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>All time</option>
                        <option value="today" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>Today</option>
                        <option value="yesterday" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>Yesterday</option>
                        <option value="week" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>This week</option>
                        <option value="month" style={{ backgroundColor: theme === 'black' ? '#111827' : currentTheme.primary.includes('green') ? '#16a34a' : currentTheme.primary.includes('orange') ? '#ea580c' : currentTheme.primary.includes('sky') ? '#0284c7' : '#2563eb', color: 'white' }}>This month</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingFiles ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500">Loading files...</div>
                      </div>
                    ) : (() => {
                      const filteredFiles = getFilteredFiles();
                      return filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p>{filesHistory.length === 0 ? 'No files shared yet' : 'No files match the selected filters'}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredFiles.map((file) => {
                            const fileUrl = file.url.startsWith('http') 
                              ? file.url 
                              : `${API_URL.replace('/api', '')}${file.url}`;
                            const isSent = String(file.senderId) === String(getCurrentUserId());
                            return (
                              <a
                                key={file.id}
                                href={fileUrl}
                                download={file.originalName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                              >
                                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                  {getFileIcon(file.mimetype, file.originalName)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{file.originalName}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-gray-500">{formatFileSize(file.size || 0)}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-sm text-gray-500">{formatDate(file.createdAt)}</span>
                                    {isSent && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${theme === 'black' ? 'bg-gray-200 text-gray-900' : 'bg-blue-100 text-blue-700'}`}>Sent</span>
                                      </>
                                    )}
                                    {!isSent && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Received</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Image Lightbox Modal */}
              {selectedImage && (
                <ImageLightbox
                  imageUrl={selectedImage}
                  onClose={() => setSelectedImage(null)}
                />
              )}

              {/* Video Lightbox Modal */}
              {selectedVideo && (
                <VideoLightbox
                  videoUrl={selectedVideo.url}
                  videoTitle={selectedVideo.title}
                  onClose={() => setSelectedVideo(null)}
                />
              )}

              {/* Bad Word Warning Modal */}
              {showBadWordModal && (
                <div 
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                  onClick={() => setShowBadWordModal(false)}
                >
                  <div 
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 p-6 border-b border-gray-200">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">Inappropriate Language Detected</h3>
                        <p className="text-sm text-gray-600 mt-1">Professional communication required</p>
                      </div>
                      <button
                        onClick={() => setShowBadWordModal(false)}
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
                          <strong className="text-yellow-800">Bad words are not allowed</strong> for professional maintainability.
                        </p>
                        <p className="text-gray-700 text-sm mt-2">
                          Please revise your message to maintain a professional and respectful communication environment.
                        </p>
                      </div>
                      
                      {/* Action Button */}
                      <button
                        onClick={() => setShowBadWordModal(false)}
                        className={`w-full ${currentTheme.primary} ${currentTheme.primaryHover} text-white py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl`}
                      >
                        I Understand
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Error Modal */}
              {showValidationModal && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
                  onClick={() => setShowValidationModal(false)}
                >
                  <div 
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 p-6 border-b border-gray-200">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">Validation Required</h3>
                        <p className="text-sm text-gray-600 mt-1">Please check your input</p>
                      </div>
                      <button
                        onClick={() => setShowValidationModal(false)}
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
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <p className="text-gray-800 text-sm leading-relaxed">
                          {validationMessage}
                        </p>
                      </div>
                      
                      {/* Action Button */}
                      <button
                        onClick={() => setShowValidationModal(false)}
                        className={`w-full ${currentTheme.primary} ${currentTheme.primaryHover} text-white py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl`}
                      >
                        Got It
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* File Preview with Thumbnails */}
              {selectedFiles.length > 0 && (
                <div className="px-6 py-3 bg-gray-100 border-t border-gray-200">
                  <div className="flex flex-wrap gap-3">
                    {selectedFiles.map((file, idx) => {
                      const isImage = file.type.startsWith('image/');
                      const isVideo = file.type.startsWith('video/');
                      const preview = filePreviews[idx];
                      
                      return (
                        <div key={idx} className="relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          {/* Image/Video Thumbnail */}
                          {(isImage || isVideo) && preview ? (
                            <div className="relative w-32 h-32 bg-gray-100">
                              {isImage ? (
                                <img 
                                  src={preview} 
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="relative w-full h-full">
                                  <img 
                                    src={preview} 
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </div>
                                </div>
                              )}
                        <button
                          onClick={() => removeFile(idx)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
                                title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 min-w-[200px]">
                              <div className="flex-shrink-0">
                                {getFileIcon(file.type, file.name)}
                              </div>
                              <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                              <button
                                onClick={() => removeFile(idx)}
                                className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                          
                          {/* File Info for Images/Videos */}
                          {(isImage || isVideo) && preview && (
                            <div className="px-2 py-1 bg-white border-t border-gray-100">
                              <p className="text-xs text-gray-600 truncate">{file.name}</p>
                              {file.size && (
                                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <div className="flex items-end gap-2">
                  {/* Project Selector */}
                  <ProjectContextCenter
                    onProjectSelect={(project) => {
                      setSelectedProjectId(project ? project.id : null);
                      // Store project data for badge display
                      if (project) {
                        setAvailableProjects(prev => {
                          const exists = prev.find(p => p.id === project.id);
                          if (!exists) {
                            return [...prev, project];
                          }
                          return prev;
                        });
                      } else {
                        // Clear project
                        setSelectedProjectId(null);
                      }
                    }}
                    selectedProjectId={selectedProjectId}
                    currentUserId={getCurrentUserIdFromToken()}
                    recipientId={selectedConversation?.partnerId || null}
                    theme={theme}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 ${currentTheme.primaryLight} ${currentTheme.primaryText} rounded-lg hover:opacity-80 transition-opacity`}
                    title="Attach file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                  <textarea
                    value={messageInput}
                    onChange={handleTyping}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className={`flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 ${currentTheme.focusRing} focus:border-transparent`}
                    rows={1}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || (!messageInput.trim() && selectedFiles.length === 0)}
                    className={`px-6 py-2 ${currentTheme.primary} text-white rounded-lg ${currentTheme.primaryHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center max-w-md px-8">
                <div className={`w-20 h-20 mx-auto mb-6 ${currentTheme.primaryLight} rounded-full flex items-center justify-center`}>
                  <svg className={`w-10 h-10 ${currentTheme.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No conversation selected</h3>
                <p className="text-sm text-gray-500">Select a contact from the sidebar to start a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/api.js';

const API_URL = getApiUrl();

// Get or create session ID for anonymous users
const getSessionId = () => {
  if (typeof window === 'undefined') {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  let sessionId = localStorage.getItem('feedback_session_id');
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('feedback_session_id', sessionId);
  }
  return sessionId;
};

export default function MediaReactions({ projectId, mediaUrl, mediaType }) {
  const [likes, setLikes] = useState(0);
  const [hearts, setHearts] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionId = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionId.current = getSessionId();
      loadReactions();
    }
  }, [projectId, mediaUrl]);

  // Load reactions for this media item
  const loadReactions = async () => {
    try {
      setLoading(true);
      const headers = {};
      if (sessionId.current) {
        headers['X-Session-ID'] = sessionId.current;
      }
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Get all comments for this project
      const response = await axios.get(`${API_URL}/project-comments/project/${projectId}`, {
        params: { sort: 'newest', filter: 'all' },
        headers
      });

      if (response.data.success) {
        // Find comments that are reactions to this media (marked with [MEDIA_REACTION:mediaUrl])
        const allComments = response.data.comments || [];
        const mediaReactionComments = allComments.filter(comment => {
          const content = comment.content || '';
          return content.startsWith(`[MEDIA_REACTION:${mediaUrl}]`);
        });

        // Count likes and hearts
        let likeCount = 0;
        let heartCount = 0;
        let currentUserReaction = null;

        mediaReactionComments.forEach(comment => {
          const content = comment.content || '';
          if (content.includes('REACTION_TYPE:like')) {
            likeCount++;
            // Check if current user made this reaction
            const token = localStorage.getItem('token');
            if (token && comment.userId) {
              try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.id === comment.userId) {
                  currentUserReaction = 'like';
                }
              } catch (e) {}
            } else if (!token && sessionId.current === comment.sessionId) {
              currentUserReaction = 'like';
            }
          } else if (content.includes('REACTION_TYPE:heart')) {
            heartCount++;
            // Check if current user made this reaction
            const token = localStorage.getItem('token');
            if (token && comment.userId) {
              try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.id === comment.userId) {
                  currentUserReaction = 'heart';
                }
              } catch (e) {}
            } else if (!token && sessionId.current === comment.sessionId) {
              currentUserReaction = 'heart';
            }
          }
        });

        setLikes(likeCount);
        setHearts(heartCount);
        setUserReaction(currentUserReaction);
      }
    } catch (error) {
      console.error('Error loading media reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle reaction
  const toggleReaction = async (reactionType) => {
    try {
      const isRemoving = userReaction === reactionType;
      
      // Optimistic update
      if (isRemoving) {
        if (reactionType === 'like') setLikes(prev => Math.max(0, prev - 1));
        if (reactionType === 'heart') setHearts(prev => Math.max(0, prev - 1));
        setUserReaction(null);
      } else {
        // Remove other reaction if exists
        if (userReaction === 'like') setLikes(prev => Math.max(0, prev - 1));
        if (userReaction === 'heart') setHearts(prev => Math.max(0, prev - 1));
        
        // Add new reaction
        if (reactionType === 'like') setLikes(prev => prev + 1);
        if (reactionType === 'heart') setHearts(prev => prev + 1);
        setUserReaction(reactionType);
      }

      const formData = new FormData();
      const commentContent = `[MEDIA_REACTION:${mediaUrl}] REACTION_TYPE:${reactionType}`;
      formData.append('content', commentContent);
      
      const token = localStorage.getItem('token');
      let authorName = 'Anonymous';
      let isAnonymous = true;
      
      if (token) {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          authorName = user.name || user.email || 'Anonymous';
          isAnonymous = false;
        } catch (e) {}
      }
      
      formData.append('authorName', authorName);
      formData.append('isAnonymous', isAnonymous);
      
      const headers = {
        'Content-Type': 'multipart/form-data'
      };
      
      if (sessionId.current) {
        headers['X-Session-ID'] = sessionId.current;
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (isRemoving) {
        // Find and delete the reaction comment
        const response = await axios.get(`${API_URL}/project-comments/project/${projectId}`, {
          params: { sort: 'newest', filter: 'all' },
          headers
        });

        if (response.data.success) {
          const allComments = response.data.comments || [];
          const reactionComment = allComments.find(comment => {
            const content = comment.content || '';
            return content.startsWith(`[MEDIA_REACTION:${mediaUrl}]`) && 
                   content.includes(`REACTION_TYPE:${reactionType}`);
          });

          if (reactionComment) {
            // Delete the reaction comment
            if (token) {
              await axios.delete(`${API_URL}/project-comments/${reactionComment.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
            }
          }
        }
      } else {
        // Create new reaction comment
        await axios.post(
          `${API_URL}/project-comments/project/${projectId}`,
          formData,
          { headers }
        );
      }

      // Reload to get accurate counts
      setTimeout(() => {
        loadReactions();
      }, 500);
    } catch (error) {
      console.error('Error toggling media reaction:', error);
      // Revert optimistic update
      loadReactions();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => toggleReaction('like')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
          userReaction === 'like'
            ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-semibold shadow-md border-2 border-blue-200'
            : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 hover:border-blue-200'
        }`}
        title="Like this media"
      >
        <span className="text-xl">👍</span>
        <span className="text-sm font-semibold">{likes}</span>
      </button>
      <button
        onClick={() => toggleReaction('heart')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
          userReaction === 'heart'
            ? 'bg-gradient-to-r from-red-50 to-pink-100 text-red-600 font-semibold shadow-md border-2 border-red-200'
            : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 border-2 border-gray-200 hover:border-red-200'
        }`}
        title="Love this media"
      >
        <span className="text-xl">❤️</span>
        <span className="text-sm font-semibold">{hearts}</span>
      </button>
    </div>
  );
}


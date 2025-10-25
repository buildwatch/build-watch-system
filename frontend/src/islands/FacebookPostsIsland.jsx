import React, { useState, useEffect } from 'react';
import { homeAPI } from '../services/api.js';

const FacebookPostsIsland = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await homeAPI.getFacebookPosts(5);
      
      if (response.success) {
        setPosts(response.posts);
        setLastUpdate(new Date());
        setError(null);
        
        // Log the data source for debugging
        console.log('Facebook posts fetched from:', response.source);
        if (response.source === 'mock') {
          console.log('Using mock data - Facebook API not accessible');
          console.log('Error:', response.error);
          console.log('Note:', response.note);
        }
      } else {
        throw new Error(response.error || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching Facebook posts:', err);
      setError(err.message);
      // Keep existing posts on error to avoid empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    
    // Auto-refresh every 3 minutes for real-time updates
    const interval = setInterval(() => fetchPosts(true), 3 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const formatReactions = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const truncateText = (text, maxLength = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-6">
        {/* Enhanced Loading Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="group relative bg-gradient-to-br from-white/90 to-indigo-50/60 backdrop-blur-md rounded-2xl border border-indigo-200/50 facebook-loading overflow-hidden">
              {/* Image skeleton with shimmer */}
              <div className="h-56 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 shimmer"></div>
              
              {/* Content skeleton */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-full shimmer"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 shimmer"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2 shimmer"></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-gray-300 rounded w-24 shimmer"></div>
                  <div className="h-3 bg-gray-300 rounded w-20 shimmer"></div>
                </div>
                
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                  <div className="h-3 bg-gray-300 rounded w-12 shimmer"></div>
                  <div className="h-3 bg-gray-300 rounded w-12 shimmer"></div>
                  <div className="h-3 bg-gray-300 rounded w-12 shimmer"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
        <div className="group relative p-6 bg-gradient-to-br from-white/80 to-red-50/60 backdrop-blur-md rounded-2xl border border-red-200/50 max-w-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <div>
              <span className="font-black text-red-700 text-lg">Unable to Load</span>
              <p className="text-red-600/70 text-sm">Latest Updates</p>
              <p className="text-red-500/60 text-xs mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Facebook Posts Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {posts.map((post, index) => (
          <div 
            key={post.id} 
            className="group relative bg-gradient-to-br from-white/95 to-indigo-50/70 backdrop-blur-md rounded-2xl border border-indigo-200/50 hover:border-indigo-300/70 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden facebook-post-card cursor-pointer"
            onClick={() => window.open(post.permalink_url, '_blank')}
          >
            {/* Post Image/Media */}
            {post.thumbnail_url ? (
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={post.thumbnail_url} 
                  alt="Facebook post"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                
                {/* Media Type Badge */}
                <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  {post.is_video ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                      </svg>
                      Video
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                      </svg>
                      Photo
                    </>
                  )}
                </div>
                
                {/* Facebook Badge */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-blue-600 px-2 py-1 rounded-full text-xs font-semibold">
                  Facebook
                </div>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              /* Placeholder for posts without media */
              <div className="relative h-32 bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-blue-600 text-xs font-medium">Text Post</p>
                </div>
                
                {/* Facebook Badge */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-blue-600 px-2 py-1 rounded-full text-xs font-semibold">
                  Facebook
                </div>
              </div>
            )}
            
            {/* Post Content */}
            <div className="p-6">
              {/* Post Message */}
              <div className="mb-4">
                <p className="text-gray-800 text-sm leading-relaxed line-clamp-4 group-hover:text-gray-900 transition-colors duration-300">
                  {truncateText(post.message || 'No message available')}
                </p>
              </div>
              
              {/* Post Meta */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1 group-hover:text-gray-700 transition-colors duration-300">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                  {post.formatted_date} | {post.relative_time}
                </span>
                <span className="text-blue-600 hover:text-blue-700 font-medium group-hover:underline transition-all duration-300">
                  View Post →
                </span>
              </div>
              
              {/* Engagement Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1 group-hover:text-blue-600 transition-colors duration-300">
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                    </svg>
                    {formatReactions(post.reactions?.total_count || 0)}
                  </span>
                  <span className="flex items-center gap-1 group-hover:text-gray-700 transition-colors duration-300">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    {formatReactions(post.comments?.total_count || 0)}
                  </span>
                  <span className="flex items-center gap-1 group-hover:text-gray-700 transition-colors duration-300">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                    </svg>
                    {formatReactions(post.shares?.count || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Enhanced Status Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-xl border border-indigo-200/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>Last updated: {lastUpdate?.toLocaleTimeString()}</span>
            {posts.length > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Live Feed
              </span>
            )}
          </div>
          {/* Mock Data Notice */}
          {posts.length > 0 && posts[0]?.id?.startsWith('mock') && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                Demo Data
              </span>
            </div>
          )}
        </div>
        
        {/* Enhanced Refresh Button */}
        <button 
          onClick={() => fetchPosts(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {refreshing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh Posts
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FacebookPostsIsland;
import { useState, useEffect } from 'react';

/**
 * ProjectNotesCenter - Notes and annotations system for projects
 * 
 * @param {string} theme - Theme color ('amber', 'emerald', 'sky', 'blue')
 * @param {Array} projects - Array of projects
 */
export default function ProjectNotesCenter({
  theme = 'amber',
  projects = []
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ title: '', content: '', priority: 'normal', tags: [] });
  const [editingNote, setEditingNote] = useState(null);
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [currentUserId, setCurrentUserId] = useState('current-user-id');
  const [currentUserName, setCurrentUserName] = useState('Current User');
  const [loading, setLoading] = useState(false);
  const API_URL = 'http://localhost:3000/api';

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

  // Load notes from API
  useEffect(() => {
    if (selectedProject) {
      loadNotes(selectedProject.id);
    }
  }, [selectedProject]);

  // Real-time sync: Poll API for updates (cross-user sync)
  useEffect(() => {
    if (!selectedProject) return;

    // Poll API for updates every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/projects/${selectedProject.id}/notes`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.notes) {
            // Only update if notes have changed
            const currentNotesStr = JSON.stringify(notes);
            const newNotesStr = JSON.stringify(data.notes);
            if (currentNotesStr !== newNotesStr) {
              setNotes(data.notes);
            }
          }
        }
      } catch (err) {
        console.error('Error polling notes from API:', err);
      }
    }, 2000); // Poll every 2 seconds for real-time sync

    return () => {
      clearInterval(pollInterval);
    };
  }, [selectedProject, notes]);

  // Get current user info
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData.id) {
        setCurrentUserId(userData.id);
      }
      if (userData.name) {
        setCurrentUserName(userData.name);
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }, []);

  const loadNotes = async (projectId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setNotes([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/projects/${projectId}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(data.notes || []);
        } else {
          setNotes([]);
        }
      } else {
        console.error('Failed to load notes:', response.status);
        setNotes([]);
      }
    } catch (e) {
      console.error('Error loading notes:', e);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // Note: saveNotes is no longer needed as we use API directly
  // Keeping for backward compatibility but it's not used
  const saveNotes = (projectId, notesList) => {
    // This function is deprecated - use API calls directly
    setNotes(notesList);
  };

  // Add new note
  const handleAddNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      alert('Please provide both title and content for the note');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/projects/${selectedProject.id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newNote.title.trim(),
          content: newNote.content.trim(),
          priority: newNote.priority,
          tags: newNote.tags
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.note) {
          setNotes([...notes, data.note]);
          setNewNote({ title: '', content: '', priority: 'normal', tags: [] });
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to create note: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Error creating note:', e);
      alert('Error creating note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update note
  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.title.trim() || !editingNote.content.trim()) {
      alert('Please provide both title and content for the note');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/projects/${selectedProject.id}/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editingNote.title.trim(),
          content: editingNote.content.trim(),
          priority: editingNote.priority,
          tags: editingNote.tags
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.note) {
          const updatedNotes = notes.map(note => 
            note.id === editingNote.id ? data.note : note
          );
          setNotes(updatedNotes);
          setEditingNote(null);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to update note: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Error updating note:', e);
      alert('Error updating note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/projects/${selectedProject.id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const updatedNotes = notes.filter(note => note.id !== noteId);
          setNotes(updatedNotes);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to delete note: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Error deleting note:', e);
      alert('Error deleting note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add reply to note
  const handleAddReply = async (noteId) => {
    if (!replyText.trim()) {
      alert('Please enter a reply');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/projects/${selectedProject.id}/notes/${noteId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: replyText.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.reply) {
          const updatedNotes = notes.map(note => 
            note.id === noteId
              ? { ...note, replies: [...(note.replies || []), data.reply] }
              : note
          );
          setNotes(updatedNotes);
          setReplyText('');
          setReplyingTo(null);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to add reply: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Error adding reply:', e);
      alert('Error adding reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add reaction to note
  const handleAddReaction = async (noteId, reactionType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/projects/${selectedProject.id}/notes/${noteId}/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reactionType: reactionType
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.reactions) {
          const updatedNotes = notes.map(note => 
            note.id === noteId
              ? { ...note, reactions: data.reactions }
              : note
          );
          setNotes(updatedNotes);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to add reaction:', errorData.error);
      }
    } catch (e) {
      console.error('Error adding reaction:', e);
    }
  };

  // Acknowledge note
  const handleAcknowledge = (noteId) => {
    handleAddReaction(noteId, 'acknowledge');
  };

  // Get all unique tags
  const getAllTags = () => {
    const tagSet = new Set();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !filterTag || note.tags.includes(filterTag);
    
    return matchesSearch && matchesTag;
  });

  // Expose methods to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectNotesCenter = {
        openModal: (project) => {
          setSelectedProject(project);
          setShowModal(true);
        },
        closeModal: () => {
          setShowModal(false);
          setSelectedProject(null);
          setNewNote({ title: '', content: '', priority: 'normal', tags: [] });
          setEditingNote(null);
        },
        getNotes: async (projectId) => {
          try {
            const token = localStorage.getItem('token');
            if (!token) return [];

            const response = await fetch(`${API_URL}/projects/${projectId}/notes`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              return data.success ? (data.notes || []) : [];
            }
            return [];
          } catch (e) {
            console.error('Error getting notes:', e);
            return [];
          }
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.projectNotesCenter) {
        delete window.projectNotesCenter;
      }
    };
  }, [notes]);

  if (!showModal) {
    return null;
  }

  const allTags = getAllTags();
  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    normal: 'bg-blue-100 text-blue-700 border-blue-300',
    low: 'bg-gray-100 text-gray-700 border-gray-300'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.button} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Project Notes & Annotations</h3>
              <p className="text-white/90 text-sm mt-1">
                {selectedProject ? selectedProject.name : 'Add notes and annotations to projects'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedProject(null);
                setNewNote({ title: '', content: '', priority: 'normal', tags: [] });
                setEditingNote(null);
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
        <div className="flex-1 overflow-y-auto p-6">
          {selectedProject ? (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                {allTags.length > 0 && (
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Add/Edit Note Form */}
              {editingNote ? (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Edit Note</h4>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editingNote.title}
                      onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                      placeholder="Note title"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <textarea
                      value={editingNote.content}
                      onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                      placeholder="Note content"
                      rows="6"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-4">
                      <select
                        value={editingNote.priority}
                        onChange={(e) => setEditingNote({ ...editingNote, priority: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="low">Low Priority</option>
                        <option value="normal">Normal Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editingNote.tags.join(', ')}
                          onChange={(e) => setEditingNote({ ...editingNote, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                          placeholder="Tags (comma-separated)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleUpdateNote}
                        className={`px-6 py-2 ${colors.button} text-white rounded-lg font-semibold transition-all`}
                      >
                        Update Note
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Note</h4>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      placeholder="Note title"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="Note content"
                      rows="6"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-4">
                      <select
                        value={newNote.priority}
                        onChange={(e) => setNewNote({ ...newNote, priority: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="low">Low Priority</option>
                        <option value="normal">Normal Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={newNote.tags.join(', ')}
                          onChange={(e) => setNewNote({ ...newNote, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                          placeholder="Tags (comma-separated)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddNote}
                      className={`px-6 py-2 ${colors.button} text-white rounded-lg font-semibold transition-all`}
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              )}

              {/* Notes List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Notes ({filteredNotes.length})
                </h4>
                {loading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                    <p className="text-gray-500 mt-2">Loading notes...</p>
                  </div>
                )}
                {!loading && filteredNotes.length > 0 ? (
                  <div className="space-y-3">
                    {filteredNotes.map((note) => (
                      <div key={note.id} className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-amber-300 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="font-semibold text-gray-900">{note.title}</h5>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityColors[note.priority] || priorityColors.normal}`}>
                                {note.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                            {note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {note.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full cursor-pointer hover:bg-blue-200"
                                    onClick={() => setFilterTag(tag)}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-3">
                              Created by {note.createdByName || 'Unknown'} on {new Date(note.createdAt).toLocaleDateString()}
                              {note.updatedAt !== note.createdAt && (
                                <span> • Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                              )}
                            </p>
                            
                            {/* Reactions */}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                              <button
                                onClick={() => handleAddReaction(note.id, 'like')}
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                                  (note.reactions?.like || []).includes(currentUserId)
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                </svg>
                                <span>{(note.reactions?.like || []).length}</span>
                              </button>
                              <button
                                onClick={() => handleAcknowledge(note.id)}
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                                  (note.reactions?.acknowledge || []).includes(currentUserId)
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Acknowledge ({(note.reactions?.acknowledge || []).length})</span>
                              </button>
                              <button
                                onClick={() => handleAddReaction(note.id, 'important')}
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                                  (note.reactions?.important || []).includes(currentUserId)
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : 'bg-gray-100 text-gray-600 hover:bg-yellow-50'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                </svg>
                                <span>Important ({(note.reactions?.important || []).length})</span>
                              </button>
                              <button
                                onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 hover:bg-blue-50 rounded-lg text-sm transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                </svg>
                                <span>Reply ({(note.replies || []).length})</span>
                              </button>
                            </div>

                            {/* Replies Section */}
                            {note.replies && note.replies.length > 0 && (
                              <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                                {note.replies.map((reply) => (
                                  <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-sm text-gray-700">{reply.content}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {reply.createdByName || 'Unknown'} • {new Date(reply.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply Input */}
                            {replyingTo === note.id && (
                              <div className="mt-4 ml-4 pl-4 border-l-2 border-amber-300">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  rows="3"
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleAddReply(note.id)}
                                    className={`px-4 py-2 ${colors.button} text-white rounded-lg text-sm font-semibold transition-all`}
                                  >
                                    Post Reply
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => setEditingNote(note)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Edit note"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete note"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !loading ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    <p>No notes yet. Add your first note above!</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              <p>Select a project to view or add notes</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={() => {
              setShowModal(false);
              setSelectedProject(null);
              setNewNote({ title: '', content: '', priority: 'normal', tags: [] });
              setEditingNote(null);
            }}
            className={`px-6 py-3 ${colors.button} text-white rounded-xl font-semibold transition-all`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


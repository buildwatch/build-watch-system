/**
 * Project Notes Debugging Script
 * 
 * Copy and paste this entire script into your browser console to debug project notes issues.
 * This will help identify why notes are not syncing between LGU-IU and EIU users.
 */

(function() {
  console.log('%c🔍 Project Notes Debugging Script', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('='.repeat(70));

  const debug = {
    // Check if ProjectNotesCenter is initialized
    checkNotesCenter: function() {
      console.log('\n📋 Checking ProjectNotesCenter initialization...');
      if (window.projectNotesCenter) {
        console.log('✅ window.projectNotesCenter exists');
        console.log('Methods available:', Object.keys(window.projectNotesCenter));
        try {
          const testProject = { id: 'test-project-id', name: 'Test Project' };
          console.log('Testing openModal with test project:', testProject);
        } catch (e) {
          console.error('❌ Error testing ProjectNotesCenter:', e);
        }
      } else {
        console.error('❌ window.projectNotesCenter is NOT defined!');
        console.log('This means the ProjectNotesCenter component has not loaded yet.');
        return false;
      }
      return true;
    },

    // Check localStorage for notes
    checkLocalStorage: function(projectId = null) {
      console.log('\n📋 Checking localStorage for project notes...');
      
      if (!projectId) {
        // Check all project notes keys
        const allKeys = Object.keys(localStorage);
        const notesKeys = allKeys.filter(key => key.startsWith('projectNotes_'));
        console.log(`Found ${notesKeys.length} project notes keys in localStorage:`);
        notesKeys.forEach(key => {
          try {
            const notes = JSON.parse(localStorage.getItem(key));
            console.log(`  ✅ ${key}: ${notes.length} note(s)`);
            if (notes.length > 0) {
              console.log(`     Sample note:`, notes[0]);
            }
          } catch (e) {
            console.log(`  ❌ ${key}: Error parsing - ${e.message}`);
          }
        });
        
        if (notesKeys.length === 0) {
          console.warn('⚠️ No project notes found in localStorage!');
          console.log('This could mean:');
          console.log('  1. No notes have been created yet');
          console.log('  2. Notes are stored in a different location');
          console.log('  3. localStorage was cleared');
        }
      } else {
        const storageKey = `projectNotes_${projectId}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const notes = JSON.parse(saved);
            console.log(`✅ Found notes for project ${projectId}:`);
            console.log(`   Total notes: ${notes.length}`);
            notes.forEach((note, idx) => {
              console.log(`   Note ${idx + 1}:`, {
                id: note.id,
                title: note.title,
                createdBy: note.createdBy,
                createdByName: note.createdByName,
                createdAt: note.createdAt
              });
            });
            return notes;
          } catch (e) {
            console.error(`❌ Error parsing notes for ${projectId}:`, e);
            return null;
          }
        } else {
          console.log(`❌ No notes found in localStorage for project ${projectId}`);
          console.log(`   Storage key: ${storageKey}`);
          return null;
        }
      }
    },

    // Check current user info
    checkCurrentUser: function() {
      console.log('\n📋 Checking current user information...');
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.id) {
          console.log('✅ User data found:');
          console.log('   User ID:', userData.id);
          console.log('   Name:', userData.name);
          console.log('   Role:', userData.role);
          console.log('   SubRole:', userData.subRole);
          return userData;
        } else {
          console.warn('⚠️ No user data found in localStorage');
          console.log('   This might affect note creation (createdBy field)');
          return null;
        }
      } catch (e) {
        console.error('❌ Error loading user data:', e);
        return null;
      }
    },

    // Check if notes are being saved correctly
    testNoteCreation: function(projectId) {
      console.log('\n🧪 Testing note creation...');
      if (!projectId) {
        console.error('❌ Project ID is required for testing');
        console.log('Usage: debugProjectNotes.testNoteCreation("your-project-id")');
        return false;
      }

      const testNote = {
        id: `test-${Date.now()}`,
        projectId: projectId,
        title: 'Test Note',
        content: 'This is a test note created by the debugging script',
        priority: 'normal',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test-user-id',
        createdByName: 'Test User',
        replies: [],
        reactions: {
          like: [],
          acknowledge: [],
          important: []
        }
      };

      try {
        const storageKey = `projectNotes_${projectId}`;
        const existing = localStorage.getItem(storageKey);
        const existingNotes = existing ? JSON.parse(existing) : [];
        const updatedNotes = [...existingNotes, testNote];
        localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        
        console.log('✅ Test note created successfully');
        console.log('   Storage key:', storageKey);
        console.log('   Total notes now:', updatedNotes.length);
        
        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
          key: storageKey,
          newValue: JSON.stringify(updatedNotes),
          oldValue: existing
        }));
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('projectNotesUpdated', {
          detail: { projectId, notes: updatedNotes }
        }));
        
        console.log('✅ Storage events triggered');
        return true;
      } catch (e) {
        console.error('❌ Error creating test note:', e);
        return false;
      }
    },

    // Check API connectivity (if API endpoints exist)
    checkAPI: async function(projectId) {
      console.log('\n📋 Checking API connectivity for project notes...');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No authentication token found');
          return false;
        }

        const API_URL = 'http://localhost:3000/api';
        
        // Try to fetch project notes from API (if endpoint exists)
        try {
          const response = await fetch(`${API_URL}/projects/${projectId}/notes`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ API endpoint exists and returned data:', data);
            return true;
          } else if (response.status === 404) {
            console.warn('⚠️ API endpoint does not exist (404)');
            console.log('   This means notes are only stored in localStorage');
            console.log('   Notes will NOT sync between different users/browsers');
            return false;
          } else {
            console.warn(`⚠️ API returned status ${response.status}`);
            return false;
          }
        } catch (e) {
          console.warn('⚠️ API endpoint does not exist or is not accessible');
          console.log('   Error:', e.message);
          console.log('   This means notes are only stored in localStorage');
          console.log('   Notes will NOT sync between different users/browsers');
          return false;
        }
      } catch (e) {
        console.error('❌ Error checking API:', e);
        return false;
      }
    },

    // Compare notes between two storage locations (if applicable)
    compareStorage: function(projectId) {
      console.log('\n📋 Comparing storage locations...');
      const storageKey = `projectNotes_${projectId}`;
      const localStorageData = localStorage.getItem(storageKey);
      
      console.log('localStorage:');
      if (localStorageData) {
        try {
          const notes = JSON.parse(localStorageData);
          console.log(`  ✅ Found ${notes.length} note(s)`);
        } catch (e) {
          console.log(`  ❌ Error parsing: ${e.message}`);
        }
      } else {
        console.log('  ❌ No data found');
      }

      // Check if there's a sessionStorage backup
      const sessionStorageData = sessionStorage.getItem(storageKey);
      console.log('sessionStorage:');
      if (sessionStorageData) {
        try {
          const notes = JSON.parse(sessionStorageData);
          console.log(`  ✅ Found ${notes.length} note(s)`);
        } catch (e) {
          console.log(`  ❌ Error parsing: ${e.message}`);
        }
      } else {
        console.log('  ❌ No data found');
      }
    },

    // Main diagnostic function
    runAll: async function(projectId = null) {
      console.log('\n🚀 Running all diagnostic checks...\n');
      
      const results = {
        notesCenter: this.checkNotesCenter(),
        localStorage: this.checkLocalStorage(projectId),
        currentUser: this.checkCurrentUser(),
        api: projectId ? await this.checkAPI(projectId) : null,
        storage: projectId ? this.compareStorage(projectId) : null
      };

      console.log('\n' + '='.repeat(70));
      console.log('📊 SUMMARY:');
      console.log('='.repeat(70));
      console.log(`ProjectNotesCenter: ${results.notesCenter ? '✅' : '❌'}`);
      console.log(`localStorage: ${results.localStorage ? '✅' : '❌'}`);
      console.log(`Current User: ${results.currentUser ? '✅' : '⚠️'}`);
      console.log(`API Endpoint: ${results.api === null ? '⏭️' : (results.api ? '✅' : '❌')}`);
      
      console.log('\n💡 KEY FINDINGS:');
      if (!results.api) {
        console.log('⚠️ CRITICAL: No API endpoint found for project notes!');
        console.log('   This means notes are stored ONLY in localStorage.');
        console.log('   localStorage is per-browser and per-user, so:');
        console.log('   - Notes from LGU-IU will NOT be visible to EIU');
        console.log('   - Notes from EIU will NOT be visible to LGU-IU');
        console.log('   - Notes are only visible in the same browser session');
        console.log('\n   SOLUTION: Implement API-based storage for notes.');
      }
      
      if (results.localStorage && results.localStorage.length > 0) {
        console.log(`✅ Found ${results.localStorage.length} note(s) in localStorage`);
        console.log('   These notes are only visible to the current user/browser.');
      }
      
      console.log('\n' + '='.repeat(70));
      console.log('🔍 To test note creation, run:');
      console.log('   debugProjectNotes.testNoteCreation("your-project-id")');
      console.log('='.repeat(70));
      
      return results;
    }
  };

  // Make debug available globally
  window.debugProjectNotes = debug;

  // Auto-run diagnostics
  console.log('\n⏳ Waiting 1 second for page to initialize...\n');
  setTimeout(() => {
    debug.runAll();
  }, 1000);

  console.log('\n💡 Type "debugProjectNotes.runAll(\'project-id\')" to run diagnostics for a specific project');
  console.log('💡 Type "debugProjectNotes.testNoteCreation(\'project-id\')" to create a test note');
})();


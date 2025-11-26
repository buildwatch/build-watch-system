// ============================================
// SHARED DOCUMENT PORTAL - COMPREHENSIVE TEST SCRIPT
// ============================================
// Copy and paste this entire script into your browser console
// while viewing the Evidence Files & Documents page
// Make sure you're logged in first!

(function() {
  console.log('🧪 ========== SHARED DOCUMENT PORTAL TEST SCRIPT ==========');
  console.log('📋 This script will test all functionality of the Shared Document Portal feature\n');

  // Get API URL dynamically
  const getApiUrl = window.getApiUrl || function() {
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProd 
      ? `${window.location.protocol}//${window.location.hostname}/api`
      : 'http://localhost:3000/api';
  };
  const API_URL = getApiUrl();

  // Get token
  const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  if (!token) {
    console.error('❌ No authentication token found!');
    console.log('💡 Please log in first and try again.');
    return;
  }

  console.log('✅ API URL:', API_URL);
  console.log('✅ Token found:', token.substring(0, 20) + '...\n');

  // Test results storage
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Helper function to log test results
  function logTest(name, passed, message = '') {
    if (passed) {
      console.log(`✅ ${name}`);
      testResults.passed.push(name);
    } else {
      console.error(`❌ ${name}${message ? ': ' + message : ''}`);
      testResults.failed.push({ name, message });
    }
  }

  function logWarning(name, message) {
    console.warn(`⚠️ ${name}: ${message}`);
    testResults.warnings.push({ name, message });
  }

  // ============================================
  // TEST 1: Check if Document Sharing Section Exists
  // ============================================
  console.log('\n📦 TEST 1: Checking Document Sharing Section UI');
  console.log('─────────────────────────────────────────────────');
  
  const documentSharingSection = document.querySelector('[class*="Document Sharing"]') || 
                                  Array.from(document.querySelectorAll('*')).find(el => 
                                    el.textContent?.includes('Document Sharing')
                                  );
  
  if (documentSharingSection) {
    logTest('Document Sharing section found in DOM', true);
  } else {
    logTest('Document Sharing section found in DOM', false, 'Section not visible on page');
  }

  // Check for tabs
  const myPortalTab = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent?.includes('My Portal Documents')
  );
  const sharedPortalTab = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent?.includes('Shared Document Portal')
  );

  logTest('My Portal Documents tab found', !!myPortalTab);
  logTest('Shared Document Portal tab found', !!sharedPortalTab);

  // ============================================
  // TEST 2: Test API Endpoint - Get All Users
  // ============================================
  console.log('\n👥 TEST 2: Testing GET /api/documents/users');
  console.log('─────────────────────────────────────────────────');

  async function testGetUsers() {
    try {
      const response = await fetch(`${API_URL}/documents/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        logTest('GET /api/documents/users - Response OK', false, `Status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.users)) {
        logTest('GET /api/documents/users - Success response', true);
        logTest(`GET /api/documents/users - Users returned (${data.users.length})`, data.users.length > 0, 
          data.users.length === 0 ? 'No users found' : '');
        
        console.log(`   📊 Found ${data.users.length} users`);
        if (data.users.length > 0) {
          console.log(`   👤 Sample user: ${data.users[0].name || data.users[0].fullName || 'Unknown'}`);
        }
        
        return data.users;
      } else {
        logTest('GET /api/documents/users - Valid response format', false, 'Invalid response structure');
        return null;
      }
    } catch (error) {
      logTest('GET /api/documents/users - No errors', false, error.message);
      return null;
    }
  }

  // ============================================
  // TEST 3: Test API Endpoint - Get Shared Documents
  // ============================================
  console.log('\n📄 TEST 3: Testing GET /api/documents/shared');
  console.log('─────────────────────────────────────────────────');

  async function testGetSharedDocuments() {
    try {
      const response = await fetch(`${API_URL}/documents/shared`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        logTest('GET /api/documents/shared - Response OK', false, `Status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.documents)) {
        logTest('GET /api/documents/shared - Success response', true);
        logTest(`GET /api/documents/shared - Documents returned (${data.documents.length})`, true);
        
        console.log(`   📊 Found ${data.documents.length} shared documents`);
        
        // Check document structure
        if (data.documents.length > 0) {
          const doc = data.documents[0];
          const hasRequiredFields = doc.id && doc.name && doc.fileType;
          logTest('GET /api/documents/shared - Document structure valid', hasRequiredFields,
            hasRequiredFields ? '' : 'Missing required fields');
        }
        
        return data.documents;
      } else {
        logTest('GET /api/documents/shared - Valid response format', false, 'Invalid response structure');
        return null;
      }
    } catch (error) {
      logTest('GET /api/documents/shared - No errors', false, error.message);
      return null;
    }
  }

  // ============================================
  // TEST 4: Test API Endpoint - Upload File
  // ============================================
  console.log('\n📤 TEST 4: Testing POST /api/documents/shared/upload');
  console.log('─────────────────────────────────────────────────');

  async function testUploadFile() {
    try {
      // Create a test file (text file)
      const testFileContent = 'This is a test file for Shared Document Portal';
      const testBlob = new Blob([testFileContent], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test-document.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('files', testFile);
      formData.append('fileType', 'documents');

      const response = await fetch(`${API_URL}/documents/shared/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logTest('POST /api/documents/shared/upload - Response OK', false, 
          `Status: ${response.status}, Error: ${errorData.error || 'Unknown'}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success) {
        logTest('POST /api/documents/shared/upload - Success response', true);
        logTest('POST /api/documents/shared/upload - Files returned', 
          data.files && data.files.length > 0);
        
        if (data.files && data.files.length > 0) {
          console.log(`   ✅ Uploaded ${data.files.length} file(s)`);
          console.log(`   📄 File: ${data.files[0].name || data.files[0].fileName}`);
          return data.files[0].id;
        }
        
        return null;
      } else {
        logTest('POST /api/documents/shared/upload - Success flag', false, data.error || 'Unknown error');
        return null;
      }
    } catch (error) {
      logTest('POST /api/documents/shared/upload - No errors', false, error.message);
      return null;
    }
  }

  // ============================================
  // TEST 5: Test API Endpoint - Create Folder
  // ============================================
  console.log('\n📁 TEST 5: Testing POST /api/documents/shared/folders');
  console.log('─────────────────────────────────────────────────');

  async function testCreateFolder() {
    try {
      const folderName = `Test Folder ${Date.now()}`;
      
      const response = await fetch(`${API_URL}/documents/shared/folders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          type: 'documents'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logTest('POST /api/documents/shared/folders - Response OK', false, 
          `Status: ${response.status}, Error: ${errorData.error || 'Unknown'}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.folder) {
        logTest('POST /api/documents/shared/folders - Success response', true);
        logTest('POST /api/documents/shared/folders - Folder returned', !!data.folder.id);
        
        console.log(`   ✅ Created folder: ${data.folder.name}`);
        return data.folder.id;
      } else {
        logTest('POST /api/documents/shared/folders - Success flag', false, data.error || 'Unknown error');
        return null;
      }
    } catch (error) {
      logTest('POST /api/documents/shared/folders - No errors', false, error.message);
      return null;
    }
  }

  // ============================================
  // TEST 6: Test API Endpoint - Delete File
  // ============================================
  console.log('\n🗑️ TEST 6: Testing DELETE /api/documents/shared/:id');
  console.log('─────────────────────────────────────────────────');

  async function testDeleteFile(fileId) {
    if (!fileId) {
      logWarning('DELETE /api/documents/shared/:id', 'Skipped - No file ID from upload test');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/documents/shared/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logTest('DELETE /api/documents/shared/:id - Response OK', false, 
          `Status: ${response.status}, Error: ${errorData.error || 'Unknown'}`);
        return false;
      }

      const data = await response.json();
      
      if (data.success) {
        logTest('DELETE /api/documents/shared/:id - Success response', true);
        console.log(`   ✅ Deleted file with ID: ${fileId}`);
        return true;
      } else {
        logTest('DELETE /api/documents/shared/:id - Success flag', false, data.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      logTest('DELETE /api/documents/shared/:id - No errors', false, error.message);
      return false;
    }
  }

  // ============================================
  // TEST 7: Test API Endpoint - Download History
  // ============================================
  console.log('\n📥 TEST 7: Testing GET /api/documents/download-history/:userId');
  console.log('─────────────────────────────────────────────────');

  async function testDownloadHistory() {
    try {
      // Get current user ID
      const userStr = localStorage.getItem('user');
      let userId = null;
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.id;
        } catch (e) {
          // Try to get from profile endpoint
          const profileResponse = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.success && profileData.user) {
              userId = profileData.user.id;
            }
          }
        }
      }

      if (!userId) {
        logWarning('GET /api/documents/download-history/:userId', 'Could not determine user ID');
        return;
      }

      const response = await fetch(`${API_URL}/documents/download-history/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        logTest('GET /api/documents/download-history/:userId - Response OK', false, 
          `Status: ${response.status}`);
        return;
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.history)) {
        logTest('GET /api/documents/download-history/:userId - Success response', true);
        logTest(`GET /api/documents/download-history/:userId - History returned (${data.history.length})`, true);
        console.log(`   📊 Found ${data.history.length} download records`);
        return true;
      } else {
        logTest('GET /api/documents/download-history/:userId - Valid response format', false, 
          'Invalid response structure');
        return false;
      }
    } catch (error) {
      logTest('GET /api/documents/download-history/:userId - No errors', false, error.message);
      return false;
    }
  }

  // ============================================
  // TEST 8: Test Frontend Portal Display
  // ============================================
  console.log('\n🖥️ TEST 8: Testing Frontend Portal Display');
  console.log('─────────────────────────────────────────────────');

  async function testFrontendPortals() {
    // Check if portals are rendered
    const portalCards = Array.from(document.querySelectorAll('[class*="portal"], [class*="Portal"]'))
      .filter(el => {
        const text = el.textContent || '';
        return text.includes('Docs') || text.includes('Photos') || text.includes('Videos');
      });

    if (portalCards.length > 0) {
      logTest('Portal cards rendered in DOM', true);
      console.log(`   📊 Found ${portalCards.length} portal card(s)`);
    } else {
      // Try clicking the Shared Document Portal tab first
      const sharedTab = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Shared Document Portal')
      );
      
      if (sharedTab) {
        console.log('   💡 Clicking Shared Document Portal tab...');
        sharedTab.click();
        
        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const portalCardsAfter = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent || '';
          return (text.includes('Docs') || text.includes('Photos') || text.includes('Videos')) &&
                 el.querySelector('img, [class*="rounded-full"]');
        });
        
        if (portalCardsAfter.length > 0) {
          logTest('Portal cards rendered after tab click', true);
          console.log(`   📊 Found ${portalCardsAfter.length} portal card(s)`);
        } else {
          logTest('Portal cards rendered in DOM', false, 'No portal cards found even after tab click');
        }
      } else {
        logTest('Portal cards rendered in DOM', false, 'Shared Document Portal tab not found');
      }
    }

    // Check for profile pictures
    const profilePictures = document.querySelectorAll('img[class*="rounded-full"], [class*="rounded-full"][class*="bg-gradient"]');
    if (profilePictures.length > 0) {
      logTest('Profile pictures/avatars displayed', true);
      console.log(`   👤 Found ${profilePictures.length} profile picture(s)/avatar(s)`);
    } else {
      logWarning('Profile pictures/avatars displayed', 'No profile pictures found');
    }
  }

  // ============================================
  // TEST 9: Test Modal Functionality
  // ============================================
  console.log('\n🔲 TEST 9: Testing Modal Functionality');
  console.log('─────────────────────────────────────────────────');

  async function testModals() {
    // First, try clicking the "My Portal Documents" tab to see upload buttons
    const myPortalTab = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent?.includes('My Portal Documents')
    );
    
    if (myPortalTab) {
      console.log('   💡 Clicking My Portal Documents tab to check for buttons...');
      myPortalTab.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Check if upload modal can be triggered
    const uploadButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('upload file') || text.includes('upload') || 
             text.includes('+ upload') || text.includes('add file');
    });

    if (uploadButtons.length > 0) {
      logTest('Upload button found', true);
      console.log(`   📤 Found ${uploadButtons.length} upload button(s)`);
    } else {
      logWarning('Upload button found', 'Upload button not found - may be in a different section or require specific permissions');
    }

    // Check if folder creation button exists
    const folderButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('create folder') || text.includes('+ create') || 
             text.includes('new folder') || text.includes('add folder');
    });

    if (folderButtons.length > 0) {
      logTest('Create Folder button found', true);
      console.log(`   📁 Found ${folderButtons.length} folder creation button(s)`);
    } else {
      logWarning('Create Folder button found', 'Create Folder button not found - may be in a different section');
    }

    // Check if download history button exists
    const downloadHistoryButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('download history') || text.includes('my downloads') || 
             text.includes('downloads');
    });

    if (downloadHistoryButtons.length > 0) {
      logTest('Download History button found', true);
      console.log(`   📥 Found ${downloadHistoryButtons.length} download history button(s)`);
    } else {
      logWarning('Download History button found', 'Download History button not found - may be in a different section');
    }
  }

  // ============================================
  // TEST 10: Test User Group Organization
  // ============================================
  console.log('\n👥 TEST 10: Testing User Group Organization');
  console.log('─────────────────────────────────────────────────');

  async function testUserGroups() {
    const users = await testGetUsers();
    
    if (!users || users.length === 0) {
      logWarning('User Group Organization', 'Cannot test - No users returned');
      return;
    }

    // Group users by group
    const usersByGroup = {};
    users.forEach(user => {
      const group = user.group || user.role || 'Other';
      if (!usersByGroup[group]) {
        usersByGroup[group] = [];
      }
      usersByGroup[group].push(user);
    });

    const groupCount = Object.keys(usersByGroup).length;
    logTest('Users organized by groups', groupCount > 0, 
      groupCount === 0 ? 'No groups found' : `Found ${groupCount} group(s)`);
    
    if (groupCount > 0) {
      console.log(`   📊 Groups found:`);
      Object.keys(usersByGroup).forEach(group => {
        console.log(`      - ${group}: ${usersByGroup[group].length} user(s)`);
      });
    }
  }

  // ============================================
  // RUN ALL TESTS
  // ============================================
  console.log('\n🚀 Starting all tests...\n');

  async function runAllTests() {
    // Run tests sequentially
    const users = await testGetUsers();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const documents = await testGetSharedDocuments();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const uploadedFileId = await testUploadFile();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const folderId = await testCreateFolder();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (uploadedFileId) {
      await testDeleteFile(uploadedFileId);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await testDownloadHistory();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testFrontendPortals();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testModals();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testUserGroups();

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n\n📊 ========== TEST SUMMARY ==========');
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);
    console.log(`⚠️ Warnings: ${testResults.warnings.length}`);
    
    if (testResults.passed.length > 0) {
      console.log('\n✅ Passed Tests:');
      testResults.passed.forEach(test => console.log(`   - ${test}`));
    }
    
    if (testResults.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.failed.forEach(({ name, message }) => 
        console.log(`   - ${name}${message ? ': ' + message : ''}`)
      );
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      testResults.warnings.forEach(({ name, message }) => 
        console.log(`   - ${name}: ${message}`)
      );
    }

    const successRate = (testResults.passed.length / 
      (testResults.passed.length + testResults.failed.length) * 100).toFixed(1);
    
    console.log(`\n📈 Success Rate: ${successRate}%`);
    
    if (testResults.failed.length === 0) {
      console.log('\n🎉 All critical tests passed! The Shared Document Portal feature is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the errors above and verify:');
      console.log('   1. Backend server is running');
      console.log('   2. Database models are created (run migrations if needed)');
      console.log('   3. API endpoints are properly registered');
      console.log('   4. You are logged in with a valid token');
    }

    console.log('\n🧪 ========== TEST SCRIPT COMPLETE ==========');
    
    // Store results globally for inspection
    window.sharedDocumentPortalTestResults = testResults;
    console.log('\n💡 Test results stored in: window.sharedDocumentPortalTestResults');
  }

  // Run tests
  runAllTests().catch(error => {
    console.error('❌ Error running tests:', error);
    console.error('Stack:', error.stack);
  });

})();


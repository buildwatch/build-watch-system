// ============================================
// DOWNLOAD TRACKING DEBUGGING SCRIPT
// ============================================
// Copy and paste this entire script into your browser console
// while viewing the Document Sharing page
// Make sure you're logged in as EIU account first, then switch to MEO account to check history

(function() {
  console.log('🔍 ========== DOWNLOAD TRACKING DEBUG SCRIPT ==========');
  console.log('📋 This script will help identify why downloads are not being recorded\n');

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

  // Get current user
  let currentUser = null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
      console.log('👤 Current User:', currentUser.name || currentUser.fullName || 'Unknown');
      console.log('   User ID:', currentUser.id);
      console.log('   User Email:', currentUser.email || 'N/A');
    } catch (e) {
      console.warn('⚠️ Could not parse user from localStorage');
    }
  }

  // ============================================
  // TEST 1: Check if recordDownload function exists
  // ============================================
  console.log('\n📦 TEST 1: Checking recordDownload Function');
  console.log('─────────────────────────────────────────────────');
  
  // Try to find the function in the React component
  const reactFiber = document.querySelector('[class*="document-center"]')?._reactInternalFiber || 
                     document.querySelector('[class*="document-center"]')?._reactInternalInstance;
  
  if (reactFiber) {
    console.log('✅ React component found');
  } else {
    console.log('⚠️ Could not access React component directly');
  }

  // ============================================
  // TEST 2: Check Preview Modal Download Button
  // ============================================
  console.log('\n📦 TEST 2: Checking Preview Modal Download Button');
  console.log('─────────────────────────────────────────────────');
  
  // Check if preview modal exists
  const previewModal = document.querySelector('[class*="fixed inset-0"]');
  const downloadButtons = Array.from(document.querySelectorAll('a[download], button')).filter(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    return text.includes('download') || btn.hasAttribute('download');
  });
  
  console.log(`📊 Found ${downloadButtons.length} download button(s)`);
  downloadButtons.forEach((btn, idx) => {
    console.log(`   Button ${idx + 1}:`, {
      text: btn.textContent?.trim(),
      hasDownloadAttr: btn.hasAttribute('download'),
      hasOnClick: btn.onclick !== null,
      href: btn.href || 'N/A'
    });
  });

  // ============================================
  // TEST 3: Test Download Recording Endpoint
  // ============================================
  console.log('\n📦 TEST 3: Testing POST /api/documents/download');
  console.log('─────────────────────────────────────────────────');
  
  async function testDownloadRecording() {
    // First, get a file ID from shared documents
    try {
      const sharedResponse = await fetch(`${API_URL}/documents/shared`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!sharedResponse.ok) {
        console.error('❌ Failed to fetch shared documents:', sharedResponse.status);
        return;
      }
      
      const sharedData = await sharedResponse.json();
      if (!sharedData.success) {
        console.error('❌ Failed to fetch shared documents:', sharedData.error || 'Unknown error');
        return;
      }
      if (!sharedData.documents || sharedData.documents.length === 0) {
        console.warn('⚠️ No shared documents found to test with');
        console.log('   Response data:', sharedData);
        return;
      }
      
      const testFile = sharedData.documents[0];
      console.log('📄 Test File:', {
        id: testFile.id,
        name: testFile.name || testFile.fileName,
        uploadedBy: testFile.uploadedBy?.name || testFile.uploadedBy?.fullName || 'Unknown',
        uploadedById: testFile.uploadedById || testFile.uploadedBy?.id
      });
      
      // Test recording a download
      console.log('\n🧪 Testing download recording...');
      const recordResponse = await fetch(`${API_URL}/documents/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: testFile.id,
          fileName: testFile.name || testFile.fileName
        })
      });
      
      if (!recordResponse.ok) {
        const errorData = await recordResponse.json().catch(() => ({}));
        console.error('❌ Download recording failed:', recordResponse.status, errorData.error || 'Unknown error');
        return;
      }
      
      const recordData = await recordResponse.json();
      if (recordData.success) {
        console.log('✅ Download recording successful!');
        console.log('   Response:', recordData);
        
        // Wait a bit, then check download history for the file uploader
        console.log('\n⏳ Waiting 1 second, then checking download history...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const uploaderId = testFile.uploadedById || testFile.uploadedBy?.id;
        if (uploaderId) {
          const historyResponse = await fetch(`${API_URL}/documents/download-history/${uploaderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            if (historyData.success) {
              console.log(`\n📊 Download History for Uploader (${uploaderId}):`);
              console.log(`   Total records: ${historyData.history?.length || 0}`);
              
              if (historyData.history && historyData.history.length > 0) {
                const recentDownload = historyData.history.find(d => d.fileId === testFile.id);
                if (recentDownload) {
                  console.log('✅ Found the test download in history!');
                  console.log('   Download record:', {
                    fileId: recentDownload.fileId,
                    fileName: recentDownload.fileName,
                    downloadedBy: recentDownload.downloadedBy?.name || recentDownload.downloadedBy?.fullName || 'Unknown',
                    downloadedAt: recentDownload.downloadedAt
                  });
                } else {
                  console.warn('⚠️ Test download not found in history');
                  console.log('   Available file IDs in history:', historyData.history.map(d => d.fileId));
                }
              } else {
                console.warn('⚠️ No download history found for this uploader');
              }
            } else {
              console.error('❌ Failed to fetch download history:', historyData.error);
            }
          } else {
            console.error('❌ Failed to fetch download history:', historyResponse.status);
          }
        } else {
          console.warn('⚠️ Could not determine uploader ID');
        }
      } else {
        console.error('❌ Download recording failed:', recordData.error);
      }
    } catch (error) {
      console.error('❌ Error testing download recording:', error);
    }
  }

  // ============================================
  // TEST 4: Check Download History Endpoint Logic
  // ============================================
  console.log('\n📦 TEST 4: Checking Download History Endpoint');
  console.log('─────────────────────────────────────────────────');
  
  async function testDownloadHistory() {
    if (!currentUser || !currentUser.id) {
      console.warn('⚠️ Cannot test - current user ID not available');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/documents/download-history/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.error('❌ Failed to fetch download history:', response.status);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        console.log(`✅ Download history fetched successfully`);
        console.log(`   Total records: ${data.history?.length || 0}`);
        
        if (data.history && data.history.length > 0) {
          console.log('\n📋 Recent Downloads:');
          data.history.slice(0, 5).forEach((record, idx) => {
            console.log(`   ${idx + 1}. ${record.fileName || 'Unknown file'}`);
            console.log(`      Downloaded by: ${record.downloadedBy?.name || record.downloadedBy?.fullName || 'Unknown'}`);
            console.log(`      Downloaded at: ${record.downloadedAt || 'N/A'}`);
            console.log(`      File ID: ${record.fileId || 'N/A'}`);
          });
        } else {
          console.log('   No download history found');
        }
      } else {
        console.error('❌ Failed to fetch download history:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching download history:', error);
    }
  }

  // ============================================
  // TEST 5: Check if Preview Modal Calls recordDownload
  // ============================================
  console.log('\n📦 TEST 5: Checking Preview Modal Implementation');
  console.log('─────────────────────────────────────────────────');
  
  // Check if we can intercept download clicks
  console.log('💡 To test manually:');
  console.log('   1. Open a file from another user\'s portal');
  console.log('   2. Click the Download button in the preview modal');
  console.log('   3. Check the Network tab for POST /api/documents/download request');
  console.log('   4. Check the Console for any errors');

  // ============================================
  // RUN ALL TESTS
  // ============================================
  console.log('\n🚀 Running all tests...\n');
  
  async function runAllTests() {
    try {
      console.log('⏳ Starting testDownloadRecording...');
      await testDownloadRecording();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('\n⏳ Starting testDownloadHistory...');
      await testDownloadHistory();
      
      console.log('\n\n📊 ========== TEST SUMMARY ==========');
      console.log('✅ Tests completed');
      console.log('\n💡 Next Steps:');
      console.log('   1. If download recording test passed but history is empty, check backend query');
      console.log('   2. If download recording failed, check backend endpoint');
      console.log('   3. If preview modal download button doesn\'t call recordDownload, fix the onClick handler');
      console.log('   4. Make sure document downloads also call recordDownload (not just photos/videos)');
      console.log('   5. Check the console for "📄 Preview File Details" when opening a file');
      console.log('   6. Check the console for "✅ Download recorded successfully" when downloading');
      
      console.log('\n🔍 ========== DEBUG SCRIPT COMPLETE ==========');
    } catch (error) {
      console.error('❌ Error running tests:', error);
      console.error('Stack:', error.stack);
    }
  }
  
  runAllTests().catch(error => {
    console.error('❌ Fatal error running tests:', error);
    console.error('Stack:', error.stack);
  });
})();


// Debug script for Deleted Comments History
// Run this in your browser console on the User Management page

(async function debugDeletedComments() {
  console.log('🔍 Starting Deleted Comments Debug...\n');

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No authentication token found. Please login as System Admin first.');
    return;
  }
  console.log('✅ Token found\n');

  // Determine API URL
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const PROJECT_COMMENTS_API_URL = isProduction 
    ? (window.location.protocol === 'https:' 
        ? `${window.location.protocol}//${window.location.hostname}/api/project-comments`
        : `http://${window.location.hostname}:3000/api/project-comments`)
    : 'http://localhost:3000/api/project-comments';

  console.log(`🌐 API URL: ${PROJECT_COMMENTS_API_URL}\n`);

  try {
    // Step 1: Check if there are any deleted comments in the database
    console.log('📡 Step 1: Fetching deleted comments history...');
    const response = await fetch(`${PROJECT_COMMENTS_API_URL}/deleted-history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:', data);
    console.log(`📝 Total deleted comments: ${data.total}\n`);

    if (data.history && data.history.length > 0) {
      console.log('📋 Deleted Comments Details:\n');
      data.history.forEach((deleted, index) => {
        console.log(`--- Deleted Comment ${index + 1} ---`);
        console.log('ID:', deleted.id);
        console.log('Original Comment ID:', deleted.originalCommentId);
        console.log('Project ID:', deleted.projectId);
        console.log('Project Name:', deleted.projectName);
        console.log('Author Name:', deleted.authorName);
        console.log('Author Email:', deleted.authorEmail);
        console.log('Is Anonymous:', !deleted.authorEmail);
        console.log('Content:', deleted.content?.substring(0, 50) + '...');
        console.log('Comment Created At:', deleted.commentCreatedAt);
        console.log('Deleted At:', deleted.deletedAt);
        console.log('Deleted By:', deleted.deletedBy);
        console.log('Deleted By Email:', deleted.deletedByEmail);
        console.log('IP Address:', deleted.deletedFromIp);
        console.log('');
      });
    } else {
      console.log('⚠️ No deleted comments found in the database');
      console.log('\n🔍 This could mean:');
      console.log('  1. No comments have been deleted yet');
      console.log('  2. The deletion history is not being saved properly');
      console.log('  3. The table might be empty or not created');
      console.log('\n📝 Next steps:');
      console.log('  1. Try deleting a comment as System Admin');
      console.log('  2. Check the backend console logs for deletion errors');
      console.log('  3. Verify the deleted_project_comments table exists');
    }

    // Step 2: Check database directly (if we can)
    console.log('\n📡 Step 2: Checking backend logs...');
    console.log('⚠️ Please check your backend console for detailed logs:');
    console.log('  - Look for "🗑️ DELETE COMMENT REQUEST STARTED" when deleting');
    console.log('  - Look for "🔍 FETCH DELETED HISTORY REQUEST STARTED" when fetching');
    console.log('  - Check for any error messages with ❌');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', error.message, error.stack);
  }

  console.log('\n✅ Debug complete!');
  console.log('\n💡 Tips:');
  console.log('  1. Delete a comment and watch the backend console');
  console.log('  2. Check if "✅ Deletion history saved successfully" appears');
  console.log('  3. Verify the deleted_project_comments table has records');
  console.log('  4. Check if anonymous comments (userId = null) are being saved');
})();


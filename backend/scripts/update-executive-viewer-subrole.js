const { User } = require('../models');

async function updateExecutiveViewerSubRole() {
  try {
    // Find the Executive Viewer user
    const executiveViewer = await User.findOne({
      where: { email: 'exeviewer@gmail.com' }
    });

    if (!executiveViewer) {
      console.log('Executive Viewer user not found');
      return;
    }

    // Update the subRole
    await executiveViewer.update({
      subRole: 'EXECUTIVE'
    });

    console.log('✅ Executive Viewer user updated successfully:');
    console.log('Username: exeviewer@gmail.com');
    console.log('Role: SYS.AD');
    console.log('SubRole: EXECUTIVE');

  } catch (error) {
    console.error('❌ Error updating Executive Viewer user:', error.message);
  }
}

// Run the script
updateExecutiveViewerSubRole(); 
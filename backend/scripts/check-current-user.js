const { User } = require('../models');

async function checkCurrentUser() {
  try {
    // Find the user with ID from the logs
    const userId = 'a04e2465-b096-49e9-a824-9b2ed3b8178f';
    const user = await User.findByPk(userId);

    if (user) {
      console.log('🔍 Current User Details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   SubRole: ${user.subRole}`);
      console.log(`   Group: ${user.group}`);
      console.log(`   Department: ${user.department}`);
      console.log(`   Status: ${user.status}`);
      
      // Check if user should have Secretariat access
      const hasSecretariatRole = user.role === 'LGU-PMT' && 
        user.subRole && 
        user.subRole.toLowerCase().includes('secretariat');
      
      console.log(`   Has Secretariat Role: ${hasSecretariatRole ? '✅ YES' : '❌ NO'}`);
      
      // Check what roles are allowed in the API
      const allowedRoles = ['secretariat', 'LGU-PMT-MPMEC-SECRETARIAT'];
      const hasValidRole = allowedRoles.includes(user.role);
      
      console.log(`   Has Valid Role for API: ${hasValidRole ? '✅ YES' : '❌ NO'}`);
      console.log(`   Allowed Roles in API: ${allowedRoles.join(', ')}`);
      
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
}

checkCurrentUser(); 
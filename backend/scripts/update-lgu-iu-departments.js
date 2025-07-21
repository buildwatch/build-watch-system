const { User, ActivityLog } = require('../models');
const db = require('../models');

async function updateLGUIUDepartments() {
  try {
    console.log('🔄 Updating LGU-IU users department field...');
    console.log('='.repeat(60));

    // Get all LGU-IU users
    const lguIuUsers = await User.findAll({
      where: {
        group: 'LGU-IU',
        status: { [require('sequelize').Op.ne]: 'deleted' }
      }
    });

    console.log(`Found ${lguIuUsers.length} LGU-IU users to update`);

    const updateResults = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of lguIuUsers) {
      try {
        const fullName = user.fullName || user.name;
        
        // Map full names to department names
        let department = null;
        
        if (fullName.includes('Municipal Engineer') || fullName.includes("Engineer's Office")) {
          department = "Municipal Engineer's Office";
        } else if (fullName.includes('Municipal Agriculturist') || fullName.includes("Agriculturist's Office")) {
          department = "Municipal Agriculturist's Office";
        } else if (fullName.includes('Municipal General Services') || fullName.includes('General Services Office')) {
          department = "Municipal General Services Office";
        } else if (fullName.includes('Municipal Social Welfare') || fullName.includes('Social Welfare and Development')) {
          department = "Municipal Social Welfare and Development Office";
        } else if (fullName.includes('Municipal Disaster') || fullName.includes('Risk Reduction') || fullName.includes('MDRRMO')) {
          department = "Municipal Disaster and Risk Reduction Management Office";
        } else {
          // If no match found, use the full name as department
          department = fullName;
        }

        // Check if department is already set and matches
        if (user.department === department) {
          console.log(`⏭️  Skipped: ${fullName} - Department already set correctly`);
          skippedCount++;
          updateResults.push({
            username: user.username,
            fullName: fullName,
            status: 'SKIPPED',
            details: 'Department already set correctly'
          });
          continue;
        }

        // Update user's department
        await user.update({ department });

        // Log activity
        await ActivityLog.create({
          userId: user.id,
          action: 'UPDATE_USER_DEPARTMENT',
          entityType: 'User',
          entityId: user.id,
          details: `Updated department for ${fullName}: ${department}`,
          ipAddress: '127.0.0.1',
          userAgent: 'Department Update Script'
        });

        console.log(`✅ Updated: ${fullName} -> ${department}`);
        updatedCount++;
        updateResults.push({
          username: user.username,
          fullName: fullName,
          status: 'UPDATED',
          details: `Department set to: ${department}`
        });

      } catch (error) {
        console.error(`❌ Error updating ${user.fullName || user.name}:`, error.message);
        updateResults.push({
          username: user.username,
          fullName: user.fullName || user.name,
          status: 'ERROR',
          details: error.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total LGU-IU users found: ${lguIuUsers.length}`);
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already correct): ${skippedCount}`);
    console.log(`❌ Errors: ${updateResults.filter(r => r.status === 'ERROR').length}`);

    // Show detailed results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(60));
    updateResults.forEach((result, index) => {
      const statusIcon = result.status === 'UPDATED' ? '✅' : result.status === 'SKIPPED' ? '⏭️' : '❌';
      console.log(`${index + 1}. ${statusIcon} ${result.fullName} (${result.username})`);
      console.log(`   Status: ${result.status} - ${result.details}`);
    });

    // Verify the updates
    console.log('\n🔍 VERIFICATION:');
    console.log('-'.repeat(60));
    const updatedUsers = await User.findAll({
      where: {
        group: 'LGU-IU',
        status: { [require('sequelize').Op.ne]: 'deleted' },
        department: { [require('sequelize').Op.ne]: null }
      },
      attributes: ['fullName', 'department', 'username']
    });

    console.log(`Users with department field populated: ${updatedUsers.length}`);
    updatedUsers.forEach(user => {
      console.log(`   ${user.fullName} -> ${user.department}`);
    });

    console.log('\n✅ Department update process completed!');
    return updateResults;

  } catch (error) {
    console.error('❌ Error in updateLGUIUDepartments:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  updateLGUIUDepartments()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateLGUIUDepartments }; 
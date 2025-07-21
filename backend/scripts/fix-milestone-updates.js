const { ProjectUpdate } = require('../models');
const { sequelize } = require('../config/database');

async function fixMilestoneUpdates() {
  try {
    console.log('🔧 Fixing milestone updates data...\n');

    // Find all project updates with milestone type
    const updates = await ProjectUpdate.findAll({
      where: {
        updateType: 'milestone'
      }
    });

    console.log(`📊 Found ${updates.length} milestone updates to check:\n`);

    for (const update of updates) {
      console.log(`🔍 Update ID: ${update.id}`);
      console.log(`   Title: ${update.title}`);
      console.log(`   Status: ${update.status}`);
      console.log(`   Milestone Updates (raw): ${update.milestoneUpdates}`);
      
      let needsFix = false;
      let fixedData = null;

      if (update.milestoneUpdates) {
        if (typeof update.milestoneUpdates === 'string') {
          if (update.milestoneUpdates.includes('[object Object]')) {
            needsFix = true;
            // Create a proper milestone update structure based on the update data
            fixedData = [{
              milestoneId: update.milestoneId || 'default',
              title: update.title || 'Milestone Update',
              status: 'completed',
              progress: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
              weight: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
              completedDate: update.submittedAt,
              remarks: update.remarks || 'Milestone update submitted and approved',
              description: update.description || ''
            }];
            console.log(`   ⚠️  Needs fix: [object Object] detected`);
          } else {
            try {
              JSON.parse(update.milestoneUpdates);
              console.log(`   ✅ Valid JSON already`);
            } catch (e) {
              needsFix = true;
              console.log(`   ⚠️  Invalid JSON: ${e.message}`);
              // Create fallback data
              fixedData = [{
                milestoneId: update.milestoneId || 'default',
                title: update.title || 'Milestone Update',
                status: 'completed',
                progress: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
                weight: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
                completedDate: update.submittedAt,
                remarks: update.remarks || 'Milestone update submitted and approved',
                description: update.description || ''
              }];
            }
          }
        } else if (typeof update.milestoneUpdates === 'object') {
          console.log(`   ✅ Valid object already`);
        } else {
          needsFix = true;
          console.log(`   ⚠️  Unknown type: ${typeof update.milestoneUpdates}`);
          // Create fallback data
          fixedData = [{
            milestoneId: update.milestoneId || 'default',
            title: update.title || 'Milestone Update',
            status: 'completed',
            progress: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
            weight: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
            completedDate: update.submittedAt,
            remarks: update.remarks || 'Milestone update submitted and approved',
            description: update.description || ''
          }];
        }
      } else {
        needsFix = true;
        console.log(`   ⚠️  No milestone updates data`);
        // Create fallback data
        fixedData = [{
          milestoneId: update.milestoneId || 'default',
          title: update.title || 'Milestone Update',
          status: 'completed',
          progress: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
          weight: parseFloat(update.finalProgress) || parseFloat(update.claimedProgress) || 0,
          completedDate: update.submittedAt,
          remarks: update.remarks || 'Milestone update submitted and approved',
          description: update.description || ''
        }];
      }

      if (needsFix && fixedData) {
        console.log(`   🔧 Fixing with data:`, JSON.stringify(fixedData, null, 2));
        
        await update.update({
          milestoneUpdates: fixedData
        });
        
        console.log(`   ✅ Fixed successfully`);
      }
      
      console.log('');
    }

    console.log('✅ Milestone updates fix completed!');

  } catch (error) {
    console.error('❌ Error fixing milestone updates:', error);
  } finally {
    await sequelize.close();
  }
}

fixMilestoneUpdates(); 
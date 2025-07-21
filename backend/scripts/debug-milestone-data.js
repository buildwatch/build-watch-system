const { ProjectUpdate } = require('../models');
const { sequelize } = require('../config/database');

async function debugMilestoneData() {
  try {
    console.log('🔍 Debugging milestone data structure...\n');

    // Find the specific IU approved update
    const update = await ProjectUpdate.findOne({
      where: {
        id: 'd3997780-264e-4c28-9bc2-8193a951a30f'
      }
    });

    if (!update) {
      console.log('❌ Update not found');
      return;
    }

    console.log('📊 Update Details:');
    console.log('  ID:', update.id);
    console.log('  Title:', update.title);
    console.log('  Status:', update.status);
    console.log('  Update Type:', update.updateType);
    console.log('  Submitted At:', update.submittedAt);
    console.log('  Claimed Progress:', update.claimedProgress);
    console.log('  Final Progress:', update.finalProgress);
    console.log('  Remarks:', update.remarks);
    
    console.log('\n🔍 Milestone Updates Data:');
    console.log('  Type:', typeof update.milestoneUpdates);
    console.log('  Raw value:', update.milestoneUpdates);
    
    if (update.milestoneUpdates) {
      if (Array.isArray(update.milestoneUpdates)) {
        console.log('  ✅ It\'s an array with', update.milestoneUpdates.length, 'items');
        update.milestoneUpdates.forEach((item, index) => {
          console.log(`    Item ${index + 1}:`, JSON.stringify(item, null, 2));
        });
      } else if (typeof update.milestoneUpdates === 'object') {
        console.log('  ✅ It\'s an object');
        console.log('  Object:', JSON.stringify(update.milestoneUpdates, null, 2));
      } else if (typeof update.milestoneUpdates === 'string') {
        console.log('  ⚠️  It\'s a string');
        console.log('  String value:', update.milestoneUpdates);
        try {
          const parsed = JSON.parse(update.milestoneUpdates);
          console.log('  ✅ Parsed successfully:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('  ❌ Failed to parse as JSON:', e.message);
        }
      }
    } else {
      console.log('  ❌ No milestone updates data');
    }

    // Test the JSON.stringify behavior
    console.log('\n🧪 Testing JSON.stringify:');
    console.log('  Stringified:', JSON.stringify(update.milestoneUpdates));
    console.log('  toString():', update.milestoneUpdates?.toString());

  } catch (error) {
    console.error('❌ Error debugging milestone data:', error);
  } finally {
    process.exit(0);
  }
}

debugMilestoneData(); 
const { ProjectUpdate, Project, User } = require('../models');
const { Op } = require('sequelize');

async function debugMilestoneData() {
  try {
    console.log('🔍 Debugging Milestone Updates Data Structure...\n');

    // Find all milestone updates
    const milestoneUpdates = await ProjectUpdate.findAll({
      where: {
        updateType: 'milestone'
      },
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'username', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Found ${milestoneUpdates.length} milestone updates:\n`);

    milestoneUpdates.forEach((update, index) => {
      console.log(`\n--- Milestone Update ${index + 1} ---`);
      console.log(`ID: ${update.id}`);
      console.log(`Project ID: ${update.projectId}`);
      console.log(`Submitted By: ${update.submittedBy}`);
      console.log(`Submitted By Role: ${update.submittedByRole}`);
      console.log(`Status: ${update.status}`);
      console.log(`Created At: ${update.createdAt}`);
      console.log(`Submitted At: ${update.submittedAt}`);
      
      // Check milestoneUpdates field
      if (update.milestoneUpdates) {
        console.log(`   Milestone Updates Field Type: ${typeof update.milestoneUpdates}`);
        console.log(`   Milestone Updates Length: ${update.milestoneUpdates.length || 'N/A'}`);
        
        try {
          const parsed = typeof update.milestoneUpdates === 'string'
            ? JSON.parse(update.milestoneUpdates)
            : update.milestoneUpdates;
          
          console.log(`   Parsed Type: ${typeof parsed}`);
          console.log(`   Is Array: ${Array.isArray(parsed)}`);
          
          if (Array.isArray(parsed)) {
            console.log(`   Array Length: ${parsed.length}`);
            parsed.forEach((item, i) => {
              console.log(`   Item ${i + 1}:`, {
                milestoneId: item.milestoneId,
                timeline: item.timeline ? {
                  hasData: true,
                  description: item.timeline.description ? 'Has description' : 'No description',
                  startDate: item.timeline.startDate || 'No start date',
                  endDate: item.timeline.endDate || 'No end date'
                } : 'No timeline data',
                budget: item.budget ? {
                  hasData: true,
                  amount: item.budget.amount || 'No amount',
                  plannedBudget: item.budget.plannedBudget || 'No planned budget',
                  breakdown: item.budget.breakdown ? 'Has breakdown' : 'No breakdown'
                } : 'No budget data',
                physical: item.physical ? {
                  hasData: true,
                  description: item.physical.description ? 'Has description' : 'No description',
                  files: item.uploadedFiles ? `${item.uploadedFiles.length} files` : 'No files'
                } : 'No physical data',
                notes: item.notes ? 'Has notes' : 'No notes'
              });
            });
          } else if (typeof parsed === 'object') {
            console.log(`   Object Keys: ${Object.keys(parsed).join(', ')}`);
            console.log(`   Timeline: ${parsed.timeline ? 'Has data' : 'No data'}`);
            console.log(`   Budget: ${parsed.budget ? 'Has data' : 'No data'}`);
            console.log(`   Physical: ${parsed.physical ? 'Has data' : 'No data'}`);
          }
        } catch (error) {
          console.log(`   ❌ Error parsing: ${error.message}`);
        }
      } else {
        console.log(`   ❌ No milestoneUpdates field`);
      }
      
      console.log(`   Raw data:`, update.milestoneUpdates);
    });

  } catch (error) {
    console.error('Error debugging milestone data:', error);
  } finally {
    process.exit(0);
  }
}

debugMilestoneData(); 
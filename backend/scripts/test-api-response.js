const { Project, ProjectMilestone, User, sequelize } = require('../models');

async function testApiResponse() {
  try {
    console.log('🧪 Testing API Response for Camera Project...\n');

    // Find the camera project
    const project = await Project.findOne({
      where: {
        name: {
          [sequelize.Sequelize.Op.like]: '%Security Cameras%'
        }
      },
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones',
          order: [['dueDate', 'ASC']]
        }
      ]
    });

    if (!project) {
      console.log('❌ Camera project not found');
      return;
    }

    console.log(`📋 Project: ${project.name} (${project.projectCode})`);
    console.log(`   Status: ${project.workflowStatus}`);
    console.log(`   Automated Progress: ${project.automatedProgress}%`);
    
    if (project.milestones && project.milestones.length > 0) {
      console.log(`\n📈 Milestones (${project.milestones.length}):`);
      project.milestones.forEach((milestone, index) => {
        console.log(`   ${index + 1}. ${milestone.title}`);
        console.log(`      Weight: ${milestone.weight}%`);
        console.log(`      Budget: ₱${milestone.plannedBudget?.toLocaleString() || '0'}`);
        console.log(`      Status: ${milestone.status}`);
        console.log(`      Progress: ${milestone.progress || 0}%`);
        console.log(`      Start Date: ${milestone.plannedStartDate || 'Not set'}`);
        console.log(`      End Date: ${milestone.plannedEndDate || 'Not set'}`);
        console.log(`      Description: ${milestone.description || 'No description'}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No milestones found');
    }

    // Test the exact API response format
    console.log('\n🔍 API Response Format Test:');
    const apiResponse = {
      success: true,
      project: {
        ...project.toJSON(),
        milestones: project.milestones ? project.milestones.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          weight: m.weight,
          plannedBudget: m.plannedBudget,
          plannedStartDate: m.plannedStartDate,
          plannedEndDate: m.plannedEndDate,
          status: m.status,
          progress: m.progress,
          priority: m.priority,
          dueDate: m.dueDate
        })) : []
      }
    };

    console.log('✅ API Response Structure:');
    console.log(`   Project ID: ${apiResponse.project.id}`);
    console.log(`   Project Name: ${apiResponse.project.name}`);
    console.log(`   Milestones Count: ${apiResponse.project.milestones.length}`);
    
    if (apiResponse.project.milestones.length > 0) {
      console.log('   First Milestone:');
      const firstMilestone = apiResponse.project.milestones[0];
      console.log(`     Title: ${firstMilestone.title}`);
      console.log(`     Weight: ${firstMilestone.weight}%`);
      console.log(`     Budget: ₱${firstMilestone.plannedBudget?.toLocaleString() || '0'}`);
    }

  } catch (error) {
    console.error('❌ Error testing API response:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testApiResponse(); 
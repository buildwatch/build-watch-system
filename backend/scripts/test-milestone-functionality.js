const { Project, ProjectMilestone, User } = require('../models');
const { Op } = require('sequelize');

async function testMilestoneFunctionality() {
  try {
    console.log('🧪 Testing Milestone Functionality...\n');

    // 1. Check if projects exist
    const projects = await Project.findAll({
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones'
        }
      ]
    });

    console.log(`📊 Found ${projects.length} projects`);

    if (projects.length === 0) {
      console.log('❌ No projects found. Please create some projects first.');
      return;
    }

    // 2. Check each project's milestones
    for (const project of projects) {
      console.log(`\n📋 Project: ${project.name} (${project.projectCode})`);
      console.log(`   Status: ${project.workflowStatus || 'draft'}`);
      console.log(`   Automated Progress: ${project.automatedProgress || 0}%`);
      
      if (project.milestones && project.milestones.length > 0) {
        console.log(`   📈 Milestones: ${project.milestones.length}`);
        
        let totalWeight = 0;
        project.milestones.forEach(milestone => {
          totalWeight += parseFloat(milestone.weight || 0);
          console.log(`      - ${milestone.title}: ${milestone.weight}% (${milestone.status || 'pending'})`);
        });
        
        console.log(`   Total Weight: ${totalWeight}%`);
        
        if (Math.abs(totalWeight - 100) > 0.01) {
          console.log(`   ⚠️  Warning: Total weight is ${totalWeight}%, should be 100%`);
        } else {
          console.log(`   ✅ Total weight is correct (100%)`);
        }
      } else {
        console.log(`   ❌ No milestones found for this project`);
      }
    }

    // 3. Check if there are any users with IU role
    const iuUsers = await User.findAll({
      where: {
        role: { [Op.in]: ['iu', 'LGU-IU'] },
        status: 'active'
      }
    });

    console.log(`\n👥 Found ${iuUsers.length} active IU users`);

    // 4. Summary
    console.log('\n📋 Summary:');
    console.log(`   - Total Projects: ${projects.length}`);
    console.log(`   - Projects with Milestones: ${projects.filter(p => p.milestones && p.milestones.length > 0).length}`);
    console.log(`   - Active IU Users: ${iuUsers.length}`);
    
    const projectsWithCorrectWeight = projects.filter(project => {
      if (!project.milestones || project.milestones.length === 0) return false;
      const totalWeight = project.milestones.reduce((sum, m) => sum + parseFloat(m.weight || 0), 0);
      return Math.abs(totalWeight - 100) <= 0.01;
    });
    
    console.log(`   - Projects with Correct Milestone Weight: ${projectsWithCorrectWeight.length}`);

    // 5. Recommendations
    console.log('\n💡 Recommendations:');
    
    if (projects.filter(p => !p.milestones || p.milestones.length === 0).length > 0) {
      console.log('   - Some projects are missing milestones. Use the edit functionality to add them.');
    }
    
    if (projects.filter(p => p.workflowStatus === 'draft').length > 0) {
      console.log('   - Some projects are in draft status. Submit them to Secretariat for approval.');
    }
    
    if (iuUsers.length === 0) {
      console.log('   - No active IU users found. Create some IU user accounts.');
    }

    console.log('\n✅ Milestone functionality test completed!');

  } catch (error) {
    console.error('❌ Error testing milestone functionality:', error);
  }
}

// Run the test
testMilestoneFunctionality()
  .then(() => {
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 
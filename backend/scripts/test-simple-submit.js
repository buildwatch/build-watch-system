const jwt = require('jsonwebtoken');
const { User, Project, ProjectUpdate } = require('../models');
const sequelize = require('../models').sequelize;

async function testSimpleSubmit() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Find an EIU user
    const eiuUser = await User.findOne({
      where: {
        role: 'eiu',
        status: 'active'
      }
    });

    if (!eiuUser) {
      console.log('❌ No active EIU user found');
      return;
    }

    console.log(`\n👤 Found EIU user: ${eiuUser.name} (${eiuUser.username})`);

    // Find a project assigned to this EIU user
    const project = await Project.findOne({
      where: {
        eiuPersonnelId: eiuUser.id
      },
      include: [{
        model: User,
        as: 'implementingOffice',
        attributes: ['id', 'name', 'username', 'role']
      }]
    });

    if (!project) {
      console.log('❌ No project found for this EIU user');
      return;
    }

    console.log(`\n📋 Found project: ${project.name}`);
    console.log(`   Implementing Office: ${project.implementingOffice.name}`);

    // Test creating a ProjectUpdate directly
    console.log('\n🧪 Testing ProjectUpdate.create directly...');
    
    try {
      const projectUpdate = await ProjectUpdate.create({
        projectId: project.id,
        updateType: 'milestone',
        submittedBy: eiuUser.id,
        submittedByRole: 'eiu',
        submittedTo: project.implementingOffice.id,
        status: 'submitted',
        milestoneUpdates: [{ test: 'data' }],
        claimedProgress: 0,
        currentProgress: 0,
        updateFrequency: 'weekly',
        title: 'Milestone Update',
        description: 'Test milestone update',
        remarks: 'Test milestone update',
        submittedAt: new Date()
      });

      console.log('✅ ProjectUpdate created successfully:', projectUpdate.id);
      
      // Clean up
      await projectUpdate.destroy();
      console.log('✅ Test record cleaned up');
      
    } catch (createError) {
      console.error('❌ ProjectUpdate.create failed:', createError.message);
      console.error('Error details:', createError);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await sequelize.close();
  }
}

testSimpleSubmit(); 
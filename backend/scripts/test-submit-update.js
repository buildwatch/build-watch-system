const jwt = require('jsonwebtoken');
const { User, Project } = require('../models');
const sequelize = require('../models').sequelize;

async function testSubmitUpdate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Find an EIU user
    const eiuUser = await User.findOne({
      where: {
        role: 'eiu',
        status: 'Active'
      }
    });

    if (!eiuUser) {
      console.log('❌ No active EIU user found');
      return;
    }

    console.log(`\n👤 Found EIU user: ${eiuUser.name} (${eiuUser.username})`);

    // Create a test token
    const token = jwt.sign(
      { 
        id: eiuUser.id, 
        userId: eiuUser.id,
        username: eiuUser.username, 
        role: eiuUser.role,
        subRole: eiuUser.subRole
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log(`\n🔑 Generated test token: ${token.substring(0, 50)}...`);

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

    // Test data for milestone updates
    const milestoneUpdates = [
      {
        milestoneId: 'test-milestone-1',
        status: 'in_progress',
        budgetAllocation: 500000,
        budgetBreakdown: 'Materials: 300,000, Labor: 150,000, Equipment: 50,000',
        physicalDescription: 'Site preparation completed, materials delivered, installation in progress',
        notes: 'Project is progressing well, no major issues encountered',
        uploadedFiles: [
          {
            name: 'site_photos.jpg',
            size: 2048576,
            type: 'image/jpeg'
          }
        ]
      }
    ];

    // Test the submit-update endpoint
    console.log('\n📡 Testing EIU submit-update endpoint...');
    
    const response = await fetch('http://localhost:3000/api/eiu/submit-update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: project.id,
        updateType: 'milestone',
        milestoneUpdates: JSON.stringify(milestoneUpdates)
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Submit Update Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      console.log('Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing submit update:', error);
  } finally {
    await sequelize.close();
  }
}

testSubmitUpdate(); 
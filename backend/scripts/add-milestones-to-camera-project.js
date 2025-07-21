const { Project, ProjectMilestone, User, sequelize } = require('../models');

async function addMilestonesToCameraProject() {
  try {
    console.log('🔧 Adding milestones to Camera Installation Project...');

    // Find the camera installation project
    const project = await Project.findOne({
      where: {
        name: {
          [sequelize.Sequelize.Op.like]: '%Security Cameras%'
        }
      }
    });

    if (!project) {
      console.log('❌ Camera installation project not found');
      return;
    }

    console.log(`📋 Found project: ${project.name} (${project.projectCode})`);

    // Check if project already has milestones
    const existingMilestones = await ProjectMilestone.findAll({
      where: { projectId: project.id }
    });

    if (existingMilestones.length > 0) {
      console.log(`✅ Project already has ${existingMilestones.length} milestones`);
      existingMilestones.forEach((milestone, index) => {
        console.log(`   ${index + 1}. ${milestone.title} - ${milestone.weight}% - ₱${milestone.plannedBudget.toLocaleString()}`);
      });
      return;
    }

    // Create camera installation milestones
    const milestones = [
      {
        title: 'Site Assessment and Planning',
        description: 'Conduct site surveys, identify camera locations, and create installation plan',
        weight: 15.00,
        plannedBudget: 300000.00,
        plannedStartDate: new Date('2025-01-15'),
        plannedEndDate: new Date('2025-02-15'),
        dueDate: new Date('2025-02-15'),
        priority: 'high',
        status: 'pending',
        order: 1
      },
      {
        title: 'Infrastructure Preparation',
        description: 'Install electrical connections, mounting brackets, and network infrastructure',
        weight: 25.00,
        plannedBudget: 500000.00,
        plannedStartDate: new Date('2025-02-16'),
        plannedEndDate: new Date('2025-03-31'),
        dueDate: new Date('2025-03-31'),
        priority: 'high',
        status: 'pending',
        order: 2
      },
      {
        title: 'Camera Installation',
        description: 'Install security cameras, connect to power and network systems',
        weight: 35.00,
        plannedBudget: 700000.00,
        plannedStartDate: new Date('2025-04-01'),
        plannedEndDate: new Date('2025-05-31'),
        dueDate: new Date('2025-05-31'),
        priority: 'medium',
        status: 'pending',
        order: 3
      },
      {
        title: 'System Integration and Testing',
        description: 'Configure monitoring software, test camera feeds, and system integration',
        weight: 15.00,
        plannedBudget: 300000.00,
        plannedStartDate: new Date('2025-06-01'),
        plannedEndDate: new Date('2025-06-30'),
        dueDate: new Date('2025-06-30'),
        priority: 'medium',
        status: 'pending',
        order: 4
      },
      {
        title: 'Training and Handover',
        description: 'Train personnel on system operation and complete project handover',
        weight: 10.00,
        plannedBudget: 200000.00,
        plannedStartDate: new Date('2025-07-01'),
        plannedEndDate: new Date('2025-07-15'),
        dueDate: new Date('2025-07-15'),
        priority: 'low',
        status: 'pending',
        order: 5
      }
    ];

    // Add projectId to each milestone
    const milestoneRecords = milestones.map(milestone => ({
      ...milestone,
      projectId: project.id
    }));

    // Create milestones
    const createdMilestones = await ProjectMilestone.bulkCreate(milestoneRecords);

    console.log(`✅ Successfully created ${createdMilestones.length} milestones for camera project`);

    // Display created milestones
    createdMilestones.forEach((milestone, index) => {
      console.log(`   ${index + 1}. ${milestone.title} - ${milestone.weight}% - ₱${milestone.plannedBudget.toLocaleString()}`);
    });

    // Calculate total weight
    const totalWeight = createdMilestones.reduce((sum, milestone) => sum + parseFloat(milestone.weight), 0);
    const totalBudget = createdMilestones.reduce((sum, milestone) => sum + parseFloat(milestone.plannedBudget), 0);

    console.log(`\n📊 Summary:`);
    console.log(`   Total Weight: ${totalWeight}%`);
    console.log(`   Total Budget: ₱${totalBudget.toLocaleString()}`);
    console.log(`   Project Budget: ₱${project.totalBudget?.toLocaleString() || 'Not set'}`);

  } catch (error) {
    console.error('❌ Error adding milestones:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
addMilestonesToCameraProject(); 
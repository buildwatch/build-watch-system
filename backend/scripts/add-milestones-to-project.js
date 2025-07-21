const { Project, ProjectMilestone, User, sequelize } = require('../models');

async function addMilestonesToProject() {
  try {
    console.log('🔧 Adding milestones to existing project...');

    // Find the first project
    const project = await Project.findOne({
      where: {
        implementingOfficeId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });

    if (!project) {
      console.log('❌ No projects found');
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
        console.log(`   ${index + 1}. ${milestone.title} - ${milestone.weight}% - ₱${milestone.plannedBudget}`);
      });
      return;
    }

    // Create sample milestones
    const milestones = [
      {
        title: 'Site Preparation and Planning',
        description: 'Initial site assessment, planning, and preparation activities',
        weight: 20.00,
        plannedBudget: 1000000.00,
        plannedStartDate: new Date('2025-01-15'),
        plannedEndDate: new Date('2025-02-15'),
        dueDate: new Date('2025-02-15'),
        priority: 'high',
        status: 'pending',
        order: 1
      },
      {
        title: 'Foundation and Infrastructure',
        description: 'Construction of foundation and basic infrastructure',
        weight: 30.00,
        plannedBudget: 1500000.00,
        plannedStartDate: new Date('2025-02-16'),
        plannedEndDate: new Date('2025-04-15'),
        dueDate: new Date('2025-04-15'),
        priority: 'high',
        status: 'pending',
        order: 2
      },
      {
        title: 'Main Construction Phase',
        description: 'Primary construction and installation activities',
        weight: 35.00,
        plannedBudget: 1750000.00,
        plannedStartDate: new Date('2025-04-16'),
        plannedEndDate: new Date('2025-07-15'),
        dueDate: new Date('2025-07-15'),
        priority: 'medium',
        status: 'pending',
        order: 3
      },
      {
        title: 'Testing and Quality Assurance',
        description: 'System testing, quality checks, and validation',
        weight: 10.00,
        plannedBudget: 500000.00,
        plannedStartDate: new Date('2025-07-16'),
        plannedEndDate: new Date('2025-08-15'),
        dueDate: new Date('2025-08-15'),
        priority: 'medium',
        status: 'pending',
        order: 4
      },
      {
        title: 'Finalization and Handover',
        description: 'Final touches, documentation, and project handover',
        weight: 5.00,
        plannedBudget: 250000.00,
        plannedStartDate: new Date('2025-08-16'),
        plannedEndDate: new Date('2025-09-15'),
        dueDate: new Date('2025-09-15'),
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

    console.log(`✅ Successfully created ${createdMilestones.length} milestones for project ${project.name}`);

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
addMilestonesToProject(); 
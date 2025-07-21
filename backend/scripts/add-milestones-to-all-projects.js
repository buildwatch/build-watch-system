const { Project, ProjectMilestone, User, sequelize } = require('../models');

async function addMilestonesToAllProjects() {
  try {
    console.log('🔧 Adding milestones to all remaining projects...\n');

    // Get all projects
    const projects = await Project.findAll({
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones'
        }
      ]
    });

    console.log(`📊 Found ${projects.length} total projects`);

    for (const project of projects) {
      console.log(`\n📋 Processing: ${project.name} (${project.projectCode})`);
      
      if (project.milestones && project.milestones.length > 0) {
        console.log(`   ✅ Already has ${project.milestones.length} milestones - skipping`);
        continue;
      }

      console.log(`   🔧 Adding milestones...`);

      // Generate milestones based on project type and budget
      const milestones = generateMilestonesForProject(project);
      
      // Add projectId to each milestone
      const milestoneRecords = milestones.map(milestone => ({
        ...milestone,
        projectId: project.id
      }));

      // Create milestones
      const createdMilestones = await ProjectMilestone.bulkCreate(milestoneRecords);

      console.log(`   ✅ Created ${createdMilestones.length} milestones`);
      createdMilestones.forEach((milestone, index) => {
        console.log(`      ${index + 1}. ${milestone.title} - ${milestone.weight}% - ₱${milestone.plannedBudget.toLocaleString()}`);
      });

      // Calculate total weight
      const totalWeight = createdMilestones.reduce((sum, milestone) => sum + parseFloat(milestone.weight), 0);
      const totalBudget = createdMilestones.reduce((sum, milestone) => sum + parseFloat(milestone.plannedBudget), 0);

      console.log(`   📊 Total Weight: ${totalWeight}%, Total Budget: ₱${totalBudget.toLocaleString()}`);
    }

    console.log('\n🎉 Completed adding milestones to all projects!');

  } catch (error) {
    console.error('❌ Error adding milestones:', error);
  } finally {
    await sequelize.close();
  }
}

function generateMilestonesForProject(project) {
  const projectName = project.name.toLowerCase();
  const totalBudget = parseFloat(project.totalBudget) || 2000000;
  const startDate = project.startDate ? new Date(project.startDate) : new Date('2025-01-15');
  const endDate = project.endDate ? new Date(project.endDate) : new Date('2025-12-31');
  
  // Calculate project duration in months
  const durationMonths = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)));

  if (projectName.includes('garbage truck') || projectName.includes('dump truck')) {
    return generateVehicleMilestones(totalBudget, startDate, durationMonths);
  } else if (projectName.includes('streetlight') || projectName.includes('led')) {
    return generateStreetlightMilestones(totalBudget, startDate, durationMonths);
  } else if (projectName.includes('pension') || projectName.includes('social')) {
    return generateSocialProgramMilestones(totalBudget, startDate, durationMonths);
  } else if (projectName.includes('road') || projectName.includes('construction')) {
    return generateRoadConstructionMilestones(totalBudget, startDate, durationMonths);
  } else {
    return generateGenericMilestones(totalBudget, startDate, durationMonths);
  }
}

function generateVehicleMilestones(totalBudget, startDate, durationMonths) {
  const milestones = [
    {
      title: 'Procurement Planning and Bidding',
      description: 'Prepare procurement documents, conduct bidding process, and evaluate proposals',
      weight: 20.00,
      plannedBudget: totalBudget * 0.20,
      priority: 'high',
      status: 'pending',
      order: 1
    },
    {
      title: 'Vehicle Manufacturing and Delivery',
      description: 'Monitor vehicle manufacturing, quality checks, and delivery to municipality',
      weight: 40.00,
      plannedBudget: totalBudget * 0.40,
      priority: 'high',
      status: 'pending',
      order: 2
    },
    {
      title: 'Vehicle Inspection and Testing',
      description: 'Conduct thorough inspection, testing, and acceptance of delivered vehicle',
      weight: 20.00,
      plannedBudget: totalBudget * 0.20,
      priority: 'medium',
      status: 'pending',
      order: 3
    },
    {
      title: 'Driver Training and Documentation',
      description: 'Train drivers, complete documentation, and prepare for operational deployment',
      weight: 15.00,
      plannedBudget: totalBudget * 0.15,
      priority: 'medium',
      status: 'pending',
      order: 4
    },
    {
      title: 'Operational Deployment',
      description: 'Deploy vehicle for operational use and monitor initial performance',
      weight: 5.00,
      plannedBudget: totalBudget * 0.05,
      priority: 'low',
      status: 'pending',
      order: 5
    }
  ];

  return addDatesToMilestones(milestones, startDate, durationMonths);
}

function generateStreetlightMilestones(totalBudget, startDate, durationMonths) {
  const milestones = [
    {
      title: 'Site Survey and Planning',
      description: 'Conduct site surveys, identify installation points, and create detailed plan',
      weight: 15.00,
      plannedBudget: totalBudget * 0.15,
      priority: 'high',
      status: 'pending',
      order: 1
    },
    {
      title: 'Infrastructure Preparation',
      description: 'Install electrical connections, mounting poles, and prepare installation sites',
      weight: 25.00,
      plannedBudget: totalBudget * 0.25,
      priority: 'high',
      status: 'pending',
      order: 2
    },
    {
      title: 'Streetlight Installation',
      description: 'Install LED streetlights, connect to power grid, and conduct initial testing',
      weight: 35.00,
      plannedBudget: totalBudget * 0.35,
      priority: 'medium',
      status: 'pending',
      order: 3
    },
    {
      title: 'System Testing and Commissioning',
      description: 'Test all installed streetlights, verify functionality, and commission system',
      weight: 15.00,
      plannedBudget: totalBudget * 0.15,
      priority: 'medium',
      status: 'pending',
      order: 4
    },
    {
      title: 'Training and Handover',
      description: 'Train maintenance personnel and complete project handover',
      weight: 10.00,
      plannedBudget: totalBudget * 0.10,
      priority: 'low',
      status: 'pending',
      order: 5
    }
  ];

  return addDatesToMilestones(milestones, startDate, durationMonths);
}

function generateSocialProgramMilestones(totalBudget, startDate, durationMonths) {
  const milestones = [
    {
      title: 'Beneficiary Identification and Registration',
      description: 'Identify eligible beneficiaries, conduct registration, and verify documents',
      weight: 25.00,
      plannedBudget: totalBudget * 0.25,
      priority: 'high',
      status: 'pending',
      order: 1
    },
    {
      title: 'Database Setup and Management',
      description: 'Set up beneficiary database, establish monitoring system, and data validation',
      weight: 20.00,
      plannedBudget: totalBudget * 0.20,
      priority: 'high',
      status: 'pending',
      order: 2
    },
    {
      title: 'Program Implementation and Distribution',
      description: 'Implement program activities, distribute benefits, and monitor delivery',
      weight: 35.00,
      plannedBudget: totalBudget * 0.35,
      priority: 'medium',
      status: 'pending',
      order: 3
    },
    {
      title: 'Monitoring and Evaluation',
      description: 'Conduct regular monitoring, evaluate program impact, and gather feedback',
      weight: 15.00,
      plannedBudget: totalBudget * 0.15,
      priority: 'medium',
      status: 'pending',
      order: 4
    },
    {
      title: 'Reporting and Documentation',
      description: 'Prepare reports, document outcomes, and complete program documentation',
      weight: 5.00,
      plannedBudget: totalBudget * 0.05,
      priority: 'low',
      status: 'pending',
      order: 5
    }
  ];

  return addDatesToMilestones(milestones, startDate, durationMonths);
}

function generateRoadConstructionMilestones(totalBudget, startDate, durationMonths) {
  const milestones = [
    {
      title: 'Site Preparation and Survey',
      description: 'Conduct detailed site survey, clear area, and prepare construction site',
      weight: 15.00,
      plannedBudget: totalBudget * 0.15,
      priority: 'high',
      status: 'pending',
      order: 1
    },
    {
      title: 'Foundation and Base Preparation',
      description: 'Excavate, prepare subgrade, install drainage, and prepare road base',
      weight: 25.00,
      plannedBudget: totalBudget * 0.25,
      priority: 'high',
      status: 'pending',
      order: 2
    },
    {
      title: 'Road Construction and Paving',
      description: 'Construct road layers, install pavement, and complete road surface',
      weight: 35.00,
      plannedBudget: totalBudget * 0.35,
      priority: 'medium',
      status: 'pending',
      order: 3
    },
    {
      title: 'Finishing and Safety Features',
      description: 'Install road markings, safety barriers, signage, and complete finishing works',
      weight: 15.00,
      plannedBudget: totalBudget * 0.15,
      priority: 'medium',
      status: 'pending',
      order: 4
    },
    {
      title: 'Testing and Handover',
      description: 'Conduct quality tests, final inspection, and complete project handover',
      weight: 10.00,
      plannedBudget: totalBudget * 0.10,
      priority: 'low',
      status: 'pending',
      order: 5
    }
  ];

  return addDatesToMilestones(milestones, startDate, durationMonths);
}

function generateGenericMilestones(totalBudget, startDate, durationMonths) {
  const milestones = [
    {
      title: 'Project Planning and Setup',
      description: 'Detailed project planning, resource allocation, and initial setup activities',
      weight: 20.00,
      plannedBudget: totalBudget * 0.20,
      priority: 'high',
      status: 'pending',
      order: 1
    },
    {
      title: 'Implementation Phase 1',
      description: 'First phase of project implementation and core activities',
      weight: 30.00,
      plannedBudget: totalBudget * 0.30,
      priority: 'high',
      status: 'pending',
      order: 2
    },
    {
      title: 'Implementation Phase 2',
      description: 'Second phase of project implementation and continued activities',
      weight: 30.00,
      plannedBudget: totalBudget * 0.30,
      priority: 'medium',
      status: 'pending',
      order: 3
    },
    {
      title: 'Quality Assurance and Testing',
      description: 'Quality checks, testing, validation, and performance verification',
      weight: 15.00,
      plannedBudget: totalBudget * 0.15,
      priority: 'medium',
      status: 'pending',
      order: 4
    },
    {
      title: 'Project Completion and Handover',
      description: 'Final activities, documentation, and project handover',
      weight: 5.00,
      plannedBudget: totalBudget * 0.05,
      priority: 'low',
      status: 'pending',
      order: 5
    }
  ];

  return addDatesToMilestones(milestones, startDate, durationMonths);
}

function addDatesToMilestones(milestones, startDate, durationMonths) {
  const monthDuration = Math.max(1, Math.floor(durationMonths / milestones.length));
  
  return milestones.map((milestone, index) => {
    const milestoneStartDate = new Date(startDate);
    milestoneStartDate.setMonth(startDate.getMonth() + (index * monthDuration));
    
    const milestoneEndDate = new Date(milestoneStartDate);
    milestoneEndDate.setMonth(milestoneStartDate.getMonth() + monthDuration);
    
    return {
      ...milestone,
      plannedStartDate: milestoneStartDate,
      plannedEndDate: milestoneEndDate,
      dueDate: milestoneEndDate
    };
  });
}

// Run the script
addMilestonesToAllProjects(); 
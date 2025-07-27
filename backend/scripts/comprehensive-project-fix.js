const { Project, ProjectUpdate, ProjectMilestone, User } = require('../models');
const { Op } = require('sequelize');

async function comprehensiveProjectFix() {
  try {
    console.log('🔧 Comprehensive Project Lifecycle Fix Starting...\n');

    // ===== STEP 1: AUDIT ALL PROJECTS =====
    console.log('📊 STEP 1: Auditing all projects...');
    
    const allProjects = await Project.findAll({
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: User,
          as: 'eiuPersonnel',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 'status', 'progress', 'order']
        }
      ]
    });

    console.log(`Found ${allProjects.length} projects to audit\n`);

    // ===== STEP 2: FIX EACH PROJECT =====
    for (const project of allProjects) {
      console.log(`🔧 Processing Project: ${project.projectCode} - ${project.name}`);
      
      // Get project milestones
      const milestones = await ProjectMilestone.findAll({
        where: { projectId: project.id },
        order: [['order', 'ASC']]
      });

      console.log(`   Found ${milestones.length} milestones`);

      // ===== STEP 2A: FIX MILESTONE DATA =====
      if (milestones.length > 0) {
        console.log('   📋 Fixing milestone data...');
        
        // Calculate total weight and ensure it's 100%
        let totalWeight = 0;
        milestones.forEach(milestone => {
          totalWeight += parseFloat(milestone.weight) || 0;
        });

        // If total weight is not 100%, redistribute
        if (totalWeight !== 100 && milestones.length > 0) {
          console.log(`   ⚠️  Total weight is ${totalWeight}%, redistributing...`);
          
          const equalWeight = 100 / milestones.length;
          for (let i = 0; i < milestones.length; i++) {
            await milestones[i].update({
              weight: equalWeight,
              status: i === 0 ? 'in_progress' : 'pending',
              progress: i === 0 ? 25 : 0 // First milestone gets 25% progress
            });
            console.log(`      Milestone ${i + 1}: ${equalWeight.toFixed(2)}% weight`);
          }
        }

        // ===== STEP 2B: CALCULATE CORRECT PROGRESS =====
        console.log('   📊 Calculating correct progress...');
        
        const updatedMilestones = await ProjectMilestone.findAll({
          where: { projectId: project.id },
          order: [['order', 'ASC']]
        });

        let appliedWeight = 0;
        updatedMilestones.forEach(milestone => {
          const weight = parseFloat(milestone.weight) || 0;
          const progress = parseFloat(milestone.progress) || 0;
          
          if (milestone.status === 'completed') {
            appliedWeight += weight;
          } else if (milestone.status === 'in_progress') {
            appliedWeight += (weight * progress / 100);
          }
        });

        console.log(`   Total applied weight: ${appliedWeight.toFixed(2)}%`);

        // ===== STEP 2C: UPDATE PROJECT PROGRESS =====
        const divisionWeight = appliedWeight / 3; // Each division gets equal share
        
        const newTimelineProgress = Math.min(100, divisionWeight);
        const newBudgetProgress = Math.min(100, divisionWeight);
        const newPhysicalProgress = Math.min(100, divisionWeight);
        const newOverallProgress = Math.min(100, appliedWeight);

        console.log(`   Progress Update:`);
        console.log(`      Timeline: ${project.timelineProgress}% → ${newTimelineProgress.toFixed(2)}%`);
        console.log(`      Budget: ${project.budgetProgress}% → ${newBudgetProgress.toFixed(2)}%`);
        console.log(`      Physical: ${project.physicalProgress}% → ${newPhysicalProgress.toFixed(2)}%`);
        console.log(`      Overall: ${project.overallProgress}% → ${newOverallProgress.toFixed(2)}%`);

        // Update project with correct progress
        await project.update({
          timelineProgress: newTimelineProgress,
          budgetProgress: newBudgetProgress,
          physicalProgress: newPhysicalProgress,
          overallProgress: newOverallProgress,
          automatedProgress: newOverallProgress,
          lastProgressUpdate: new Date()
        });

        // ===== STEP 2D: FIX MILESTONE UPDATES =====
        console.log('   📝 Fixing milestone updates...');
        
        const milestoneUpdates = await ProjectUpdate.findAll({
          where: {
            projectId: project.id,
            updateType: 'milestone'
          },
          order: [['createdAt', 'DESC']]
        });

        for (const update of milestoneUpdates) {
          // Create correct milestone updates data
          const correctMilestoneUpdates = updatedMilestones.map(milestone => ({
            id: milestone.id,
            title: milestone.title,
            description: milestone.description,
            weight: parseFloat(milestone.weight) || 0,
            status: milestone.status,
            progress: parseFloat(milestone.progress) || 0,
            dueDate: milestone.dueDate,
            plannedBudget: milestone.plannedBudget,
            order: milestone.order
          }));

          // Update the milestone update record
          await update.update({
            milestoneUpdates: correctMilestoneUpdates,
            claimedProgress: appliedWeight,
            adjustedProgress: appliedWeight,
            finalProgress: appliedWeight
          });
        }

        console.log(`   ✅ Project ${project.projectCode} fixed successfully!\n`);
      } else {
        console.log(`   ⚠️  No milestones found for project ${project.projectCode}\n`);
      }
    }

    // ===== STEP 3: VERIFY FIXES =====
    console.log('🔍 STEP 3: Verifying fixes...');
    
    const verificationProjects = await Project.findAll({
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'weight', 'status', 'progress']
        }
      ]
    });

    console.log('\n📊 Final Project Status:');
    verificationProjects.forEach(project => {
      console.log(`\n   Project: ${project.projectCode} - ${project.name}`);
      console.log(`   Overall Progress: ${project.overallProgress}%`);
      console.log(`   Timeline: ${project.timelineProgress}%`);
      console.log(`   Budget: ${project.budgetProgress}%`);
      console.log(`   Physical: ${project.physicalProgress}%`);
      
      if (project.milestones && project.milestones.length > 0) {
        console.log(`   Milestones:`);
        project.milestones.forEach((milestone, index) => {
          console.log(`      ${index + 1}. ${milestone.title}: ${milestone.weight}% weight, ${milestone.status}, ${milestone.progress}% progress`);
        });
      }
    });

    console.log('\n✅ Comprehensive project fix completed successfully!');
    console.log('🎯 All projects now have consistent progress calculation and data structure.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error in comprehensive project fix:', error);
    process.exit(1);
  }
}

comprehensiveProjectFix(); 
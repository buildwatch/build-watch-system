const { ProjectValidation, Project, User } = require('../models');
const { Op } = require('sequelize');

async function cleanupDuplicateReports() {
  try {
    console.log('🔍 Starting cleanup of duplicate compiled reports...');
    
    // Get all compiled reports
    const allReports = await ProjectValidation.findAll({
      where: {
        status: 'approved',
        reportType: 'milestone_report'
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'projectCode', 'name']
        }
      ],
      order: [['validatedAt', 'DESC']]
    });
    
    console.log(`📊 Found ${allReports.length} total compiled reports`);
    
    // Group reports by projectId
    const reportsByProject = {};
    allReports.forEach(report => {
      if (!reportsByProject[report.projectId]) {
        reportsByProject[report.projectId] = [];
      }
      reportsByProject[report.projectId].push(report);
    });
    
    console.log(`📋 Found ${Object.keys(reportsByProject).length} unique projects`);
    
    let totalDeleted = 0;
    
    // For each project, keep only the most recent report
    for (const [projectId, reports] of Object.entries(reportsByProject)) {
      if (reports.length > 1) {
        console.log(`🔄 Project ${projectId} has ${reports.length} reports, keeping the most recent one`);
        
        // Sort by validatedAt (most recent first)
        const sortedReports = reports.sort((a, b) => new Date(b.validatedAt) - new Date(a.validatedAt));
        
        // Keep the first (most recent) one, delete the rest
        const reportsToDelete = sortedReports.slice(1);
        
        for (const report of reportsToDelete) {
          console.log(`🗑️  Deleting duplicate report ${report.id} for project ${projectId}`);
          await report.destroy();
          totalDeleted++;
        }
      }
    }
    
    console.log(`✅ Cleanup completed! Deleted ${totalDeleted} duplicate reports`);
    
    // Verify the cleanup
    const remainingReports = await ProjectValidation.findAll({
      where: {
        status: 'approved',
        reportType: 'milestone_report'
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'projectCode', 'name']
        }
      ],
      order: [['validatedAt', 'DESC']]
    });
    
    console.log(`📊 Remaining reports after cleanup: ${remainingReports.length}`);
    
    // Show remaining reports
    remainingReports.forEach((report, index) => {
      console.log(`${index + 1}. Project: ${report.project?.projectCode || report.projectId} - Validated: ${report.validatedAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

// Run the cleanup
cleanupDuplicateReports(); 
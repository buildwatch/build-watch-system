'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get existing projects and users for seeding
    const projects = await queryInterface.sequelize.query(
      'SELECT id FROM projects LIMIT 10',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const secretariatUsers = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'LGU-PMT' AND (subRole LIKE '%Secretariat%' OR subRole LIKE '%MPMEC%') LIMIT 5",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (projects.length === 0 || secretariatUsers.length === 0) {
      console.log('No projects or secretariat users found for seeding validations');
      return;
    }

    const validationData = [];
    const reportTypes = ['progress_report', 'milestone_report', 'completion_report', 'rpmes_form'];
    const statuses = ['pending', 'validated', 'flagged', 'returned'];
    const priorities = ['high', 'medium', 'low'];
    const complianceStatuses = ['compliant', 'non_compliant', 'partial'];

    // Create validation records for each project
    projects.forEach((project, index) => {
      const reportType = reportTypes[index % reportTypes.length];
      const status = statuses[index % statuses.length];
      const priority = priorities[index % priorities.length];
      const complianceStatus = complianceStatuses[index % complianceStatuses.length];
      const validator = status === 'validated' ? secretariatUsers[0]?.id : null;
      const validatedAt = status === 'validated' ? new Date() : null;

      // Create issues for flagged validations
      const issues = status === 'flagged' ? [
        {
          issue: 'Budget calculation discrepancy detected',
          priority: 'high',
          flaggedBy: secretariatUsers[0]?.id,
          flaggedAt: new Date()
        }
      ] : [];

      // Create validation checklist
      const validationChecklist = {
        dataCompleteness: Math.random() > 0.3,
        budgetAccuracy: Math.random() > 0.3,
        timelineAdherence: Math.random() > 0.3,
        documentationComplete: Math.random() > 0.3
      };

      validationData.push({
        id: Sequelize.literal('UUID()'),
        projectId: project.id,
        reportType,
        reportId: null,
        status,
        priority,
        issues: JSON.stringify(issues),
        validationChecklist: JSON.stringify(validationChecklist),
        comments: status === 'validated' ? 'Report validated successfully. All requirements met.' :
                 status === 'flagged' ? 'Issues identified. Please review and address concerns.' :
                 status === 'returned' ? 'Report returned for revision. Please address feedback.' :
                 'Pending validation review.',
        validatedBy: validator,
        validatedAt,
        returnedForRevision: status === 'returned',
        revisionReason: status === 'returned' ? 'Incomplete documentation and missing budget breakdown' : null,
        resubmittedAt: null,
        validationScore: status === 'validated' ? 85 : null, // Use fixed value to avoid decimal issues
        complianceStatus: status === 'validated' ? complianceStatus : null,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
        updatedAt: new Date()
      });
    });

    await queryInterface.bulkInsert('project_validations', validationData, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('project_validations', null, {});
  }
}; 
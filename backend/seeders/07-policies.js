'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get a user ID for creating policies
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE role = 'LGU-PMT' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length === 0) {
      console.log('No LGU-PMT users found. Skipping policy seeding.');
      return;
    }

    const userId = users[0].id;

    const policies = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Enhanced Road Construction Standards 2025',
        description: 'Comprehensive guidelines for road construction projects including drainage systems and pedestrian walkways',
        documentType: 'policy_memorandum',
        category: 'infrastructure',
        status: 'published',
        version: '1.0',
        effectiveDate: new Date('2025-01-01'),
        expiryDate: new Date('2027-12-31'),
        complianceRate: 95.5,
        impactScore: 92.3,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-12-15'),
        lastReviewedAt: new Date('2024-12-15'),
        nextReviewDate: new Date('2026-06-15'),
        tags: JSON.stringify(['infrastructure', 'road construction', 'accessibility']),
        metadata: JSON.stringify({
          targetDepartments: ['Municipal Engineer Office', 'Public Works'],
          complianceDeadline: '2025-03-01',
          trainingRequired: true
        }),
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-15')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Health Center Accessibility Standards',
        description: 'Policy requiring all new health center projects to include proper accessibility features for persons with disabilities',
        documentType: 'executive_order',
        category: 'health',
        status: 'published',
        version: '1.0',
        effectiveDate: new Date('2025-02-01'),
        expiryDate: new Date('2028-01-31'),
        complianceRate: 100.0,
        impactScore: 87.6,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2025-01-15'),
        lastReviewedAt: new Date('2025-01-15'),
        nextReviewDate: new Date('2026-07-15'),
        tags: JSON.stringify(['health', 'accessibility', 'PWD']),
        metadata: JSON.stringify({
          targetDepartments: ['Health Office', 'Municipal Engineer Office'],
          complianceDeadline: '2025-05-01',
          trainingRequired: true
        }),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'School Infrastructure Safety Guidelines',
        description: 'Safety standards and requirements for all educational infrastructure projects',
        documentType: 'guideline',
        category: 'education',
        status: 'draft',
        version: '1.0',
        effectiveDate: new Date('2025-03-01'),
        expiryDate: new Date('2028-02-29'),
        complianceRate: 0.0,
        impactScore: 0.0,
        createdBy: userId,
        tags: JSON.stringify(['education', 'safety', 'infrastructure']),
        metadata: JSON.stringify({
          targetDepartments: ['Education Office', 'Municipal Engineer Office'],
          complianceDeadline: '2025-06-01',
          trainingRequired: false
        }),
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-01')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        title: 'Agricultural Project Sustainability Framework',
        description: 'Guidelines for sustainable agricultural projects and environmental protection measures',
        documentType: 'procedure',
        category: 'agriculture',
        status: 'published',
        version: '1.0',
        effectiveDate: new Date('2024-11-01'),
        expiryDate: new Date('2027-10-31'),
        complianceRate: 78.9,
        impactScore: 85.2,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-10-15'),
        lastReviewedAt: new Date('2024-10-15'),
        nextReviewDate: new Date('2026-04-15'),
        tags: JSON.stringify(['agriculture', 'sustainability', 'environment']),
        metadata: JSON.stringify({
          targetDepartments: ['Agriculture Office', 'Environment Office'],
          complianceDeadline: '2025-01-01',
          trainingRequired: true
        }),
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-10-15')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        title: 'Social Welfare Project Monitoring Protocol',
        description: 'Standardized monitoring and evaluation procedures for social welfare projects',
        documentType: 'standard',
        category: 'social',
        status: 'published',
        version: '1.0',
        effectiveDate: new Date('2024-09-01'),
        expiryDate: new Date('2027-08-31'),
        complianceRate: 82.3,
        impactScore: 79.8,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-08-15'),
        lastReviewedAt: new Date('2024-08-15'),
        nextReviewDate: new Date('2026-02-15'),
        tags: JSON.stringify(['social welfare', 'monitoring', 'evaluation']),
        metadata: JSON.stringify({
          targetDepartments: ['Social Welfare Office', 'MPMEC'],
          complianceDeadline: '2024-12-01',
          trainingRequired: false
        }),
        createdAt: new Date('2024-08-01'),
        updatedAt: new Date('2024-08-15')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        title: 'Environmental Impact Assessment Requirements',
        description: 'Mandatory environmental impact assessment for all infrastructure projects',
        documentType: 'ordinance',
        category: 'environment',
        status: 'published',
        version: '1.0',
        effectiveDate: new Date('2024-07-01'),
        expiryDate: new Date('2027-06-30'),
        complianceRate: 91.7,
        impactScore: 88.9,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-06-15'),
        lastReviewedAt: new Date('2024-06-15'),
        nextReviewDate: new Date('2025-12-15'),
        tags: JSON.stringify(['environment', 'EIA', 'compliance']),
        metadata: JSON.stringify({
          targetDepartments: ['Environment Office', 'All Implementing Offices'],
          complianceDeadline: '2024-10-01',
          trainingRequired: true
        }),
        createdAt: new Date('2024-06-01'),
        updatedAt: new Date('2024-06-15')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        title: 'Transportation Project Quality Standards',
        description: 'Quality assurance standards for transportation infrastructure projects',
        documentType: 'policy_memorandum',
        category: 'transportation',
        status: 'archived',
        version: '1.0',
        effectiveDate: new Date('2023-01-01'),
        expiryDate: new Date('2024-12-31'),
        complianceRate: 75.4,
        impactScore: 72.1,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2022-12-15'),
        lastReviewedAt: new Date('2024-11-15'),
        nextReviewDate: new Date('2025-05-15'),
        tags: JSON.stringify(['transportation', 'quality', 'infrastructure']),
        metadata: JSON.stringify({
          targetDepartments: ['Municipal Engineer Office', 'Transportation Office'],
          complianceDeadline: '2023-03-01',
          trainingRequired: true
        }),
        createdAt: new Date('2022-12-01'),
        updatedAt: new Date('2024-11-15')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        title: 'General Project Management Guidelines',
        description: 'Standard project management procedures for all LGU projects',
        documentType: 'guideline',
        category: 'general',
        status: 'published',
        version: '2.0',
        effectiveDate: new Date('2024-06-01'),
        expiryDate: new Date('2027-05-31'),
        complianceRate: 89.2,
        impactScore: 86.7,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-05-15'),
        lastReviewedAt: new Date('2024-05-15'),
        nextReviewDate: new Date('2025-11-15'),
        tags: JSON.stringify(['project management', 'general', 'procedures']),
        metadata: JSON.stringify({
          targetDepartments: ['All Departments'],
          complianceDeadline: '2024-09-01',
          trainingRequired: true
        }),
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-15')
      }
    ];

    await queryInterface.bulkInsert('policies', policies, {});

    // Create some sample policy compliance records
    const projects = await queryInterface.sequelize.query(
      `SELECT id FROM projects LIMIT 5`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (projects.length > 0) {
      const complianceRecords = [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          policyId: '550e8400-e29b-41d4-a716-446655440001',
          projectId: projects[0].id,
          complianceStatus: 'compliant',
          complianceScore: 95.5,
          reviewDate: new Date('2025-01-15'),
          reviewedBy: userId,
          findings: 'Project fully complies with road construction standards',
          recommendations: 'Continue monitoring for ongoing compliance',
          nextReviewDate: new Date('2025-07-15'),
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15')
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440002',
          policyId: '550e8400-e29b-41d4-a716-446655440002',
          projectId: projects[0].id,
          complianceStatus: 'compliant',
          complianceScore: 100.0,
          reviewDate: new Date('2025-02-01'),
          reviewedBy: userId,
          findings: 'Health center project includes all required accessibility features',
          recommendations: 'Excellent compliance, no changes needed',
          nextReviewDate: new Date('2025-08-01'),
          createdAt: new Date('2025-02-01'),
          updatedAt: new Date('2025-02-01')
        }
      ];

      await queryInterface.bulkInsert('policy_compliance', complianceRecords, {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('policy_compliance', null, {});
    await queryInterface.bulkDelete('policies', null, {});
  }
}; 
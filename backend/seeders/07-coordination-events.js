'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get user IDs for Secretariat and MPMEC members
    const users = await queryInterface.sequelize.query(
      `SELECT id, role, subRole FROM users WHERE role = 'LGU-PMT' AND (subRole LIKE '%secretariat%' OR subRole LIKE '%mpmec%')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const secretariatUsers = users.filter(user => user.subRole?.toLowerCase().includes('secretariat'));
    const mpmecUsers = users.filter(user => user.subRole?.toLowerCase().includes('mpmec'));

    if (secretariatUsers.length === 0) {
      console.log('No Secretariat users found. Skipping coordination events seeder.');
      return;
    }

    // Get project IDs
    const projects = await queryInterface.sequelize.query(
      `SELECT id, name, projectCode FROM projects LIMIT 5`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const coordinationEvents = [
      // Field Inspections
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        title: 'Health Center Site Inspection',
        description: 'Comprehensive site inspection for the new health center construction project. Check progress, quality, and compliance with specifications.',
        eventType: 'field_inspection',
        startDate: new Date('2025-01-20T09:00:00Z'),
        endDate: new Date('2025-01-20T12:00:00Z'),
        location: 'Health Center Construction Site, Barangay Poblacion',
        status: 'confirmed',
        priority: 'high',
        isRecurring: false,
        participantData: JSON.stringify([
          { userId: secretariatUsers[0].id, role: 'Lead Inspector' },
          { userId: mpmecUsers[0]?.id, role: 'Committee Representative' }
        ]),
        projectId: projects[0]?.id,
        notes: 'Bring safety equipment and camera for documentation. Focus on structural integrity and material quality.',
        createdBy: secretariatUsers[0].id,
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date('2025-01-15T08:00:00Z')
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        title: 'Road Project Progress Review',
        description: 'Monthly progress review for the main road rehabilitation project. Assess timeline adherence and quality standards.',
        eventType: 'field_inspection',
        startDate: new Date('2025-01-25T10:30:00Z'),
        endDate: new Date('2025-01-25T14:30:00Z'),
        location: 'Main Road Rehabilitation Site, Barangay San Jose',
        status: 'scheduled',
        priority: 'medium',
        isRecurring: true,
        recurrencePattern: JSON.stringify({
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: 25
        }),
        participantData: JSON.stringify([
          { userId: secretariatUsers[0].id, role: 'Project Monitor' },
          { userId: mpmecUsers[0]?.id, role: 'Technical Reviewer' }
        ]),
        projectId: projects[1]?.id,
        notes: 'Review asphalt quality, drainage system, and safety measures. Document progress with photos.',
        createdBy: secretariatUsers[0].id,
        createdAt: new Date('2025-01-16T09:00:00Z'),
        updatedAt: new Date('2025-01-16T09:00:00Z')
      },
      // Meetings
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        title: 'MPMEC Monthly Meeting',
        description: 'Regular monthly meeting of the Municipal Project Monitoring and Evaluation Committee. Review project statuses, discuss issues, and plan next month\'s activities.',
        eventType: 'meeting',
        startDate: new Date('2025-01-22T14:00:00Z'),
        endDate: new Date('2025-01-22T16:00:00Z'),
        location: 'Municipal Hall Conference Room',
        status: 'confirmed',
        priority: 'high',
        isRecurring: true,
        recurrencePattern: JSON.stringify({
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: 22
        }),
        participantData: JSON.stringify([
          { userId: secretariatUsers[0].id, role: 'Secretariat' },
          { userId: mpmecUsers[0]?.id, role: 'Committee Chair' },
          { userId: mpmecUsers[1]?.id, role: 'Committee Member' }
        ]),
        notes: 'Agenda: Q1 2025 Progress Report, Budget Utilization Review, Upcoming Project Deadlines',
        createdBy: secretariatUsers[0].id,
        createdAt: new Date('2025-01-17T10:00:00Z'),
        updatedAt: new Date('2025-01-17T10:00:00Z')
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        title: 'Project Coordination Meeting',
        description: 'Coordination meeting with implementing units to discuss project challenges, resource allocation, and timeline adjustments.',
        eventType: 'meeting',
        startDate: new Date('2025-01-28T09:00:00Z'),
        endDate: new Date('2025-01-28T11:00:00Z'),
        location: 'Municipal Planning Office',
        status: 'scheduled',
        priority: 'medium',
        isRecurring: false,
        participantData: JSON.stringify([
          { userId: secretariatUsers[0].id, role: 'Facilitator' },
          { userId: mpmecUsers[0]?.id, role: 'Committee Representative' }
        ]),
        notes: 'Focus on resolving bottlenecks and ensuring smooth project implementation.',
        createdBy: secretariatUsers[0].id,
        createdAt: new Date('2025-01-18T14:00:00Z'),
        updatedAt: new Date('2025-01-18T14:00:00Z')
      },
      // Deadlines
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        title: 'Q1 2025 Progress Report Submission',
        description: 'Deadline for submission of Q1 2025 project progress reports from all implementing units.',
        eventType: 'deadline',
        startDate: new Date('2025-01-31T17:00:00Z'),
        endDate: new Date('2025-01-31T17:00:00Z'),
        location: 'Online Submission Portal',
        status: 'scheduled',
        priority: 'urgent',
        isRecurring: true,
        recurrencePattern: JSON.stringify({
          frequency: 'quarterly',
          interval: 1,
          month: [3, 6, 9, 12],
          dayOfMonth: 31
        }),
        participantData: JSON.stringify([
          { userId: secretariatUsers[0].id, role: 'Report Coordinator' }
        ]),
        notes: 'All implementing units must submit comprehensive progress reports including physical and financial accomplishments.',
        createdBy: secretariatUsers[0].id,
        createdAt: new Date('2025-01-19T11:00:00Z'),
        updatedAt: new Date('2025-01-19T11:00:00Z')
      },
      // Training
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        title: 'Project Monitoring Training',
        description: 'Training session for new committee members and implementing unit staff on project monitoring procedures and RPMES compliance.',
        eventType: 'training',
        startDate: new Date('2025-01-30T08:00:00Z'),
        endDate: new Date('2025-01-30T17:00:00Z'),
        location: 'Municipal Training Center',
        status: 'scheduled',
        priority: 'medium',
        isRecurring: false,
        participantData: JSON.stringify([
          { userId: secretariatUsers[0].id, role: 'Trainer' },
          { userId: mpmecUsers[0]?.id, role: 'Co-Trainer' }
        ]),
        notes: 'Topics: RPMES Forms, Progress Reporting, Quality Assurance, Documentation Standards',
        createdBy: secretariatUsers[0].id,
        createdAt: new Date('2025-01-20T15:00:00Z'),
        updatedAt: new Date('2025-01-20T15:00:00Z')
      },
      // Review
      {
        id: '660e8400-e29b-41d4-a716-446655440007',
        title: 'Budget Utilization Review',
        description: 'Comprehensive review of budget utilization across all ongoing projects. Identify variances and recommend adjustments.',
        eventType: 'review',
        startDate: new Date('2025-02-05T10:00:00Z'),
        endDate: new Date('2025-02-05T15:00:00Z'),
        location: 'Municipal Finance Office',
        status: 'scheduled',
        priority: 'high',
        isRecurring: true,
        recurrencePattern: JSON.stringify({
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: 5
        }),
        participantData: JSON.stringify([
          { userId: secretariatUsers[0].id, role: 'Review Coordinator' },
          { userId: mpmecUsers[0]?.id, role: 'Financial Reviewer' }
        ]),
        notes: 'Prepare detailed financial reports and variance analysis for each project.',
        createdBy: secretariatUsers[0].id,
        createdAt: new Date('2025-01-21T13:00:00Z'),
        updatedAt: new Date('2025-01-21T13:00:00Z')
      }
    ];

    await queryInterface.bulkInsert('coordination_events', coordinationEvents, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('coordination_events', null, {});
  }
}; 
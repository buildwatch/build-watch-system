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

    if (secretariatUsers.length === 0 || mpmecUsers.length === 0) {
      console.log('No Secretariat or MPMEC users found. Skipping communications seeder.');
      return;
    }

    const communications = [
      // Secretariat to MPMEC communications
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        subject: 'Weekly Progress Report - Q1 2025',
        message: 'Dear MPMEC Members,\n\nPlease find attached the weekly progress report for Q1 2025. The report includes updates on ongoing projects, budget utilization, and upcoming milestones.\n\nKey highlights:\n- Road construction project is 75% complete\n- Water system improvement is on schedule\n- Budget utilization is at 68%\n\nPlease review and provide feedback by Friday.\n\nBest regards,\nSecretariat Team',
        category: 'report',
        priority: 'medium',
        type: 'outgoing',
        status: 'sent',
        isRead: true,
        isImportant: true,
        isUrgent: false,
        requestAcknowledgment: true,
        acknowledgedAt: new Date('2025-01-15T10:30:00Z'),
        readAt: new Date('2025-01-15T11:00:00Z'),
        senderId: secretariatUsers[0].id,
        recipientId: mpmecUsers[0].id,
        createdAt: new Date('2025-01-15T09:00:00Z'),
        updatedAt: new Date('2025-01-15T11:00:00Z')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        subject: 'Budget Approval Request - Emergency Fund',
        message: 'Dear MPMEC Chair,\n\nWe are requesting approval for the emergency fund allocation for the flood control project. The recent heavy rains have caused some damage to the existing infrastructure.\n\nRequested amount: ₱500,000\nPurpose: Emergency repairs and reinforcement\n\nPlease review and provide approval by tomorrow.\n\nThank you,\nSecretariat',
        category: 'request',
        priority: 'urgent',
        type: 'outgoing',
        status: 'sent',
        isRead: false,
        isImportant: true,
        isUrgent: true,
        requestAcknowledgment: true,
        senderId: secretariatUsers[0].id,
        recipientId: mpmecUsers[0].id,
        createdAt: new Date('2025-01-20T14:00:00Z'),
        updatedAt: new Date('2025-01-20T14:00:00Z')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        subject: 'Meeting Schedule - Monthly Review',
        message: 'Dear MPMEC Members,\n\nWe would like to schedule the monthly project review meeting for February 2025. Please indicate your availability for the following dates:\n\n- February 5, 2025 (Monday) - 2:00 PM\n- February 7, 2025 (Wednesday) - 10:00 AM\n- February 10, 2025 (Saturday) - 9:00 AM\n\nAgenda will include:\n1. Q1 2025 project status review\n2. Budget utilization report\n3. Q2 2025 planning\n4. Open discussion\n\nPlease respond with your preferred date.\n\nBest regards,\nSecretariat',
        category: 'meeting',
        priority: 'medium',
        type: 'outgoing',
        status: 'sent',
        isRead: true,
        isImportant: false,
        isUrgent: false,
        requestAcknowledgment: false,
        readAt: new Date('2025-01-18T16:30:00Z'),
        senderId: secretariatUsers[0].id,
        recipientId: mpmecUsers[0].id,
        createdAt: new Date('2025-01-18T15:00:00Z'),
        updatedAt: new Date('2025-01-18T16:30:00Z')
      },

      // MPMEC to Secretariat communications
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        subject: 'Feedback on Weekly Progress Report',
        message: 'Dear Secretariat,\n\nThank you for the comprehensive weekly progress report. We have reviewed the document and have the following feedback:\n\n1. The road construction progress is satisfactory\n2. Please provide more details on the water system timeline\n3. Budget utilization needs closer monitoring\n4. Consider adding risk assessment for ongoing projects\n\nOverall, the report is well-structured and informative.\n\nBest regards,\nMPMEC Chair',
        category: 'feedback',
        priority: 'medium',
        type: 'incoming',
        status: 'responded',
        isRead: true,
        isImportant: false,
        isUrgent: false,
        requestAcknowledgment: false,
        readAt: new Date('2025-01-16T09:00:00Z'),
        respondedAt: new Date('2025-01-16T09:00:00Z'),
        parentMessageId: '550e8400-e29b-41d4-a716-446655440001',
        senderId: mpmecUsers[0].id,
        recipientId: secretariatUsers[0].id,
        createdAt: new Date('2025-01-16T08:30:00Z'),
        updatedAt: new Date('2025-01-16T09:00:00Z')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        subject: 'Budget Approval - Emergency Fund',
        message: 'Dear Secretariat,\n\nWe have reviewed your emergency fund request for the flood control project. The request is APPROVED.\n\nApproved amount: ₱500,000\nConditions:\n1. Submit detailed expense report within 7 days\n2. Provide before/after photos of repairs\n3. Ensure all work meets safety standards\n\nPlease proceed with the emergency repairs.\n\nBest regards,\nMPMEC Chair',
        category: 'request',
        priority: 'urgent',
        type: 'incoming',
        status: 'responded',
        isRead: true,
        isImportant: true,
        isUrgent: true,
        requestAcknowledgment: false,
        readAt: new Date('2025-01-21T10:00:00Z'),
        respondedAt: new Date('2025-01-21T10:00:00Z'),
        parentMessageId: '550e8400-e29b-41d4-a716-446655440002',
        senderId: mpmecUsers[0].id,
        recipientId: secretariatUsers[0].id,
        createdAt: new Date('2025-01-21T09:30:00Z'),
        updatedAt: new Date('2025-01-21T10:00:00Z')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        subject: 'Meeting Schedule Confirmation',
        message: 'Dear Secretariat,\n\nThank you for the meeting schedule options. We confirm the meeting for:\n\nDate: February 7, 2025 (Wednesday)\nTime: 10:00 AM\nVenue: Municipal Hall Conference Room\n\nAll MPMEC members are available for this schedule. Please prepare the following documents:\n1. Detailed Q1 2025 project status\n2. Budget utilization breakdown\n3. Q2 2025 project proposals\n\nLooking forward to the meeting.\n\nBest regards,\nMPMEC Secretary',
        category: 'meeting',
        priority: 'medium',
        type: 'incoming',
        status: 'responded',
        isRead: true,
        isImportant: false,
        isUrgent: false,
        requestAcknowledgment: false,
        readAt: new Date('2025-01-19T11:00:00Z'),
        respondedAt: new Date('2025-01-19T11:00:00Z'),
        parentMessageId: '550e8400-e29b-41d4-a716-446655440003',
        senderId: mpmecUsers[0].id,
        recipientId: secretariatUsers[0].id,
        createdAt: new Date('2025-01-19T10:30:00Z'),
        updatedAt: new Date('2025-01-19T11:00:00Z')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        subject: 'Policy Review Request',
        message: 'Dear Secretariat,\n\nWe would like to request a review of the current project monitoring policies. Specifically, we need clarification on:\n\n1. Change order approval process\n2. Budget reallocation procedures\n3. Quality control standards\n4. Timeline adjustment protocols\n\nPlease provide updated policy documents and schedule a briefing session.\n\nThank you,\nMPMEC Committee',
        category: 'request',
        priority: 'high',
        type: 'incoming',
        status: 'sent',
        isRead: false,
        isImportant: true,
        isUrgent: false,
        requestAcknowledgment: true,
        senderId: mpmecUsers[0].id,
        recipientId: secretariatUsers[0].id,
        createdAt: new Date('2025-01-22T13:00:00Z'),
        updatedAt: new Date('2025-01-22T13:00:00Z')
      }
    ];

    await queryInterface.bulkInsert('communications', communications, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('communications', null, {});
  }
}; 
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');

async function seedDatabase() {
  try {
    console.log('🌱 Starting Build Watch LGU Database Seeding...');
    
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Clear existing data (optional - comment out if you want to preserve data)
    console.log('🧹 Clearing existing data...');
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = [
      'notifications',
      'activity_logs',
      'project_feedback',
      'project_issues',
      'uploads',
      'site_visit_participants',
      'site_visits',
      'monitoring_reports',
      'rpmes_forms',
      'project_updates',
      'projects',
      'users'
    ];
    
    for (const table of tables) {
      await db.sequelize.query(`TRUNCATE TABLE ${table}`);
    }
    
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Existing data cleared.');
    
    // Seed Users
    console.log('👥 Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      // LGU-PMT Users
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Mayor John Santos',
        username: 'mayor.santos',
        email: 'mayor.santos@santacruz.gov.ph',
        password: hashedPassword,
        role: 'LGU-PMT',
        subRole: 'Chair',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'GOV-001',
        group: 'Local Government Unit',
        department: 'Office of the Mayor',
        position: 'Municipal Mayor',
        contactNumber: '+63 912 345 6789',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Vice Mayor Maria Garcia',
        username: 'vice.mayor.garcia',
        email: 'vice.mayor.garcia@santacruz.gov.ph',
        password: hashedPassword,
        role: 'LGU-PMT',
        subRole: 'Vice Chair',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'GOV-002',
        group: 'Local Government Unit',
        department: 'Office of the Vice Mayor',
        position: 'Municipal Vice Mayor',
        contactNumber: '+63 912 345 6790',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Engr. Roberto Cruz',
        username: 'engr.cruz',
        email: 'engr.cruz@santacruz.gov.ph',
        password: hashedPassword,
        role: 'LGU-PMT',
        subRole: 'Secretariat',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'GOV-003',
        group: 'Local Government Unit',
        department: 'Municipal Engineering Office',
        position: 'Municipal Engineer',
        contactNumber: '+63 912 345 6791',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // EIU Users
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Atty. Ana Reyes',
        username: 'atty.reyes',
        email: 'atty.reyes@eiu.gov.ph',
        password: hashedPassword,
        role: 'EIU',
        subRole: 'EPIU Manager',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'EIU-001',
        group: 'External Implementing Unit',
        department: 'Department of Public Works and Highways',
        position: 'EPIU Manager',
        contactNumber: '+63 912 345 6792',
        address: 'DPWH Regional Office, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Engr. Carlos Mendoza',
        username: 'engr.mendoza',
        email: 'engr.mendoza@eiu.gov.ph',
        password: hashedPassword,
        role: 'EIU',
        subRole: 'EPIU Staff',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'EIU-002',
        group: 'External Implementing Unit',
        department: 'Department of Public Works and Highways',
        position: 'Project Engineer',
        contactNumber: '+63 912 345 6793',
        address: 'DPWH Regional Office, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // LGU-IU Users
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        name: 'Dr. Elena Torres',
        username: 'dr.torres',
        email: 'dr.torres@santacruz.gov.ph',
        password: hashedPassword,
        role: 'LGU-IU',
        subRole: 'MDC Chair',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'LGU-001',
        group: 'Local Government Unit',
        department: 'Municipal Development Council',
        position: 'MDC Chairperson',
        contactNumber: '+63 912 345 6794',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        name: 'Mr. Jose Martinez',
        username: 'jose.martinez',
        email: 'jose.martinez@santacruz.gov.ph',
        password: hashedPassword,
        role: 'LGU-IU',
        subRole: 'Oversight Officer',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'LGU-002',
        group: 'Local Government Unit',
        department: 'Municipal Planning and Development Office',
        position: 'Oversight Officer',
        contactNumber: '+63 912 345 6795',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        name: 'Ms. Sofia Rodriguez',
        username: 'sofia.rodriguez',
        email: 'sofia.rodriguez@santacruz.gov.ph',
        password: hashedPassword,
        role: 'LGU-IU',
        subRole: 'Implementing Staff',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'LGU-003',
        group: 'Local Government Unit',
        department: 'Municipal Engineering Office',
        position: 'Project Coordinator',
        contactNumber: '+63 912 345 6796',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // EMS Users
      {
        id: '550e8400-e29b-41d4-a716-446655440009',
        name: 'Ms. Patricia Lopez',
        username: 'patricia.lopez',
        email: 'patricia.lopez@ngo.org.ph',
        password: hashedPassword,
        role: 'EMS',
        subRole: 'NGO Representative',
        status: 'active',
        idType: 'NGO ID',
        idNumber: 'NGO-001',
        group: 'Non-Government Organization',
        department: 'Community Development Foundation',
        position: 'Executive Director',
        contactNumber: '+63 912 345 6797',
        address: 'Community Center, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Mr. Ricardo Santos',
        username: 'ricardo.santos',
        email: 'ricardo.santos@cso.org.ph',
        password: hashedPassword,
        role: 'EMS',
        subRole: 'CSO Member',
        status: 'active',
        idType: 'CSO ID',
        idNumber: 'CSO-001',
        group: 'Civil Society Organization',
        department: 'Citizens Action Group',
        position: 'Community Leader',
        contactNumber: '+63 912 345 6798',
        address: 'Barangay Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Engr. Manuel Aquino',
        username: 'manuel.aquino',
        email: 'manuel.aquino@ppmc.gov.ph',
        password: hashedPassword,
        role: 'EMS',
        subRole: 'PPMC Representative',
        status: 'active',
        idType: 'Government ID',
        idNumber: 'PPMC-001',
        group: 'Provincial Project Monitoring Committee',
        department: 'Provincial Planning and Development Office',
        position: 'PPMC Representative',
        contactNumber: '+63 912 345 6799',
        address: 'Provincial Capitol, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // SYS.AD Users
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'Admin System',
        username: 'admin',
        email: 'admin@buildwatch.gov.ph',
        password: hashedPassword,
        role: 'SYS.AD',
        subRole: 'System Administrator',
        status: 'active',
        idType: 'System ID',
        idNumber: 'SYS-001',
        group: 'System Administration',
        department: 'Information Technology',
        position: 'System Administrator',
        contactNumber: '+63 912 345 6800',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440013',
        name: 'Executive Admin',
        username: 'executive.admin',
        email: 'executive.admin@buildwatch.gov.ph',
        password: hashedPassword,
        role: 'SYS.AD',
        subRole: 'Executive',
        status: 'active',
        idType: 'System ID',
        idNumber: 'SYS-002',
        group: 'System Administration',
        department: 'Executive Office',
        position: 'Executive Administrator',
        contactNumber: '+63 912 345 6801',
        address: 'Municipal Hall, Santa Cruz, Laguna',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.User.bulkCreate(users);
    console.log(`✅ ${users.length} users seeded successfully.`);

    // Seed Projects
    console.log('🏗️ Seeding projects...');
    const projects = [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'Municipal Road Rehabilitation Project',
        description: 'Rehabilitation and improvement of major municipal roads including drainage systems and street lighting',
        location: 'Poblacion Area, Santa Cruz, Laguna',
        budget: 15000000.00,
        costSpent: 8500000.00,
        startDate: '2024-01-15',
        targetDate: '2024-12-31',
        actualStartDate: '2024-02-01',
        implementingUnit: 'EIU',
        implementingUnitId: '550e8400-e29b-41d4-a716-446655440004',
        category: 'Infrastructure',
        priority: 'High',
        status: 'Ongoing',
        progress: 65.50,
        physicalProgress: 70.00,
        financialProgress: 56.67,
        objectives: 'Improve road infrastructure and traffic flow in the municipality',
        expectedOutputs: 'Rehabilitated roads with proper drainage and lighting',
        targetBeneficiaries: 'Motorists, pedestrians, and local businesses',
        risks: 'Weather delays, material availability',
        mitigationMeasures: 'Proper scheduling, advance material procurement',
        remarks: 'Project is progressing well within timeline',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        name: 'Municipal Health Center Expansion',
        description: 'Expansion of the municipal health center to accommodate more patients and modern medical equipment',
        location: 'Municipal Health Center, Santa Cruz, Laguna',
        budget: 8000000.00,
        costSpent: 3200000.00,
        startDate: '2024-03-01',
        targetDate: '2024-10-31',
        actualStartDate: '2024-03-15',
        implementingUnit: 'LGU-IU',
        implementingUnitId: '550e8400-e29b-41d4-a716-446655440006',
        category: 'Health',
        priority: 'High',
        status: 'Ongoing',
        progress: 40.00,
        physicalProgress: 45.00,
        financialProgress: 40.00,
        objectives: 'Improve healthcare services and facilities',
        expectedOutputs: 'Expanded health center with modern facilities',
        targetBeneficiaries: 'Local residents requiring medical services',
        risks: 'Equipment delivery delays',
        mitigationMeasures: 'Early equipment ordering and coordination',
        remarks: 'Foundation work completed, structural work in progress',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        name: 'Agricultural Support Program',
        description: 'Comprehensive support program for local farmers including training, equipment, and market access',
        location: 'Various Barangays, Santa Cruz, Laguna',
        budget: 5000000.00,
        costSpent: 1500000.00,
        startDate: '2024-02-01',
        targetDate: '2024-11-30',
        actualStartDate: '2024-02-15',
        implementingUnit: 'LGU-IU',
        implementingUnitId: '550e8400-e29b-41d4-a716-446655440007',
        category: 'Agriculture',
        priority: 'Medium',
        status: 'Ongoing',
        progress: 30.00,
        physicalProgress: 35.00,
        financialProgress: 30.00,
        objectives: 'Enhance agricultural productivity and farmer income',
        expectedOutputs: 'Trained farmers with improved farming techniques',
        targetBeneficiaries: 'Local farmers and agricultural workers',
        risks: 'Weather conditions affecting training schedules',
        mitigationMeasures: 'Flexible training schedules and indoor alternatives',
        remarks: 'Training programs ongoing, equipment distribution planned',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        name: 'Municipal School Building Construction',
        description: 'Construction of additional classrooms and facilities for the municipal elementary school',
        location: 'Santa Cruz Elementary School, Santa Cruz, Laguna',
        budget: 12000000.00,
        costSpent: 0.00,
        startDate: '2024-06-01',
        targetDate: '2025-03-31',
        implementingUnit: 'EIU',
        implementingUnitId: '550e8400-e29b-41d4-a716-446655440005',
        category: 'Education',
        priority: 'High',
        status: 'Planning',
        progress: 0.00,
        physicalProgress: 0.00,
        financialProgress: 0.00,
        objectives: 'Address classroom shortage and improve learning environment',
        expectedOutputs: 'New school building with modern facilities',
        targetBeneficiaries: 'Elementary school students and teachers',
        risks: 'Land acquisition issues, permit delays',
        mitigationMeasures: 'Early land acquisition and permit processing',
        remarks: 'Project in planning phase, permits being processed',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        name: 'Environmental Protection Initiative',
        description: 'Comprehensive environmental protection program including waste management and tree planting',
        location: 'Municipality-wide, Santa Cruz, Laguna',
        budget: 3000000.00,
        costSpent: 1800000.00,
        startDate: '2024-01-01',
        targetDate: '2024-12-31',
        actualStartDate: '2024-01-15',
        implementingUnit: 'LGU-IU',
        implementingUnitId: '550e8400-e29b-41d4-a716-446655440008',
        category: 'Environment',
        priority: 'Medium',
        status: 'Ongoing',
        progress: 60.00,
        physicalProgress: 65.00,
        financialProgress: 60.00,
        objectives: 'Improve environmental sustainability and waste management',
        expectedOutputs: 'Enhanced waste management system and green spaces',
        targetBeneficiaries: 'All residents and future generations',
        risks: 'Community participation challenges',
        mitigationMeasures: 'Intensive community awareness and engagement',
        remarks: 'Waste management system operational, tree planting ongoing',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        name: 'Disaster Risk Reduction Program',
        description: 'Comprehensive disaster preparedness and risk reduction program for the municipality',
        location: 'Municipality-wide, Santa Cruz, Laguna',
        budget: 4000000.00,
        costSpent: 0.00,
        startDate: '2024-07-01',
        targetDate: '2025-06-30',
        implementingUnit: 'LGU-IU',
        implementingUnitId: '550e8400-e29b-41d4-a716-446655440006',
        category: 'Disaster Risk Reduction',
        priority: 'Critical',
        status: 'Planning',
        progress: 0.00,
        physicalProgress: 0.00,
        financialProgress: 0.00,
        objectives: 'Enhance disaster preparedness and response capabilities',
        expectedOutputs: 'Trained response teams and emergency equipment',
        targetBeneficiaries: 'All residents during emergencies',
        risks: 'Equipment procurement delays',
        mitigationMeasures: 'Early procurement planning and vendor coordination',
        remarks: 'Project in planning phase, needs assessment ongoing',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.Project.bulkCreate(projects);
    console.log(`✅ ${projects.length} projects seeded successfully.`);

    // Seed some sample project updates
    console.log('📊 Seeding project updates...');
    const updates = [
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        projectId: '660e8400-e29b-41d4-a716-446655440001',
        submittedById: '550e8400-e29b-41d4-a716-446655440004',
        progress: 65.50,
        costSpent: 8500000.00,
        physicalProgress: 70.00,
        financialProgress: 56.67,
        accomplishments: 'Road rehabilitation 70% complete, drainage system installed, street lighting poles erected',
        challenges: 'Heavy rainfall causing minor delays in asphalt laying',
        nextSteps: 'Complete remaining road sections and install street lights',
        remarks: 'Project progressing well despite weather challenges',
        status: 'Approved',
        validatedById: '550e8400-e29b-41d4-a716-446655440001',
        validatedAt: new Date(),
        validationFeedback: 'Progress update approved. Good work on drainage system.',
        reportPeriod: 'Q2 2024',
        reportDate: '2024-06-30',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        projectId: '660e8400-e29b-41d4-a716-446655440002',
        submittedById: '550e8400-e29b-41d4-a716-446655440006',
        progress: 40.00,
        costSpent: 3200000.00,
        physicalProgress: 45.00,
        financialProgress: 40.00,
        accomplishments: 'Foundation work completed, structural framework 45% done',
        challenges: 'Equipment delivery delayed by 2 weeks',
        nextSteps: 'Complete structural work and begin electrical installation',
        remarks: 'Foundation quality exceeds specifications',
        status: 'Approved',
        validatedById: '550e8400-e29b-41d4-a716-446655440001',
        validatedAt: new Date(),
        validationFeedback: 'Excellent foundation work. Address equipment delays.',
        reportPeriod: 'Q2 2024',
        reportDate: '2024-06-30',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.ProjectUpdate.bulkCreate(updates);
    console.log(`✅ ${updates.length} project updates seeded successfully.`);

    // Seed some sample activity logs
    console.log('📝 Seeding activity logs...');
    const activityLogs = [
      {
        id: '880e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440012',
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'System',
        details: 'Build Watch LGU system initialized and seeded with sample data',
        level: 'Info',
        module: 'System',
        status: 'Success',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        action: 'LOGIN',
        entityType: 'User',
        details: 'User logged in successfully',
        level: 'Info',
        module: 'Authentication',
        status: 'Success',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.ActivityLog.bulkCreate(activityLogs);
    console.log(`✅ ${activityLogs.length} activity logs seeded successfully.`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Seeded Data Summary:');
    console.log(`- Users: ${users.length} (All LGU roles and sub-roles)`);
    console.log(`- Projects: ${projects.length} (Various categories and statuses)`);
    console.log(`- Project Updates: ${updates.length} (With validation status)`);
    console.log(`- Activity Logs: ${activityLogs.length} (System initialization)`);
    console.log('\n🔑 Default Login Credentials:');
    console.log('Username: admin');
    console.log('Password: password123');
    console.log('\nOther users can login with:');
    console.log('Username: mayor.santos, atty.reyes, dr.torres, etc.');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase; 
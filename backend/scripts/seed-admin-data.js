const db = require('../models');

async function seedAdminData() {
  try {
    console.log('🔌 Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Seed Departments
    console.log('📁 Seeding departments...');
    const departments = [
      {
        name: 'Engineering and Infrastructure Unit (EIU)',
        code: 'EIU',
        description: 'Handles engineering projects and infrastructure development',
        head: 'Engr. Juan Dela Cruz',
        contactNumber: '+63 912 345 6789',
        email: 'eiu@santacruz.gov.ph',
        status: 'active'
      },
      {
        name: 'Local Government Unit - Implementing Unit (LGU-IU)',
        code: 'LGU-IU',
        description: 'Local government implementation and coordination unit',
        head: 'Ms. Maria Santos',
        contactNumber: '+63 923 456 7890',
        email: 'lgu-iu@santacruz.gov.ph',
        status: 'active'
      },
      {
        name: 'Local Government Unit - Project Management Team (LGU-PMT)',
        code: 'LGU-PMT',
        description: 'Project management and oversight team',
        head: 'Mr. Pedro Reyes',
        contactNumber: '+63 934 567 8901',
        email: 'lgu-pmt@santacruz.gov.ph',
        status: 'active'
      },
      {
        name: 'Environmental Management Services (EMS)',
        code: 'EMS',
        description: 'Environmental protection and management services',
        head: 'Ms. Ana Garcia',
        contactNumber: '+63 945 678 9012',
        email: 'ems@santacruz.gov.ph',
        status: 'active'
      }
    ];

    for (const deptData of departments) {
      const [department, created] = await db.Department.findOrCreate({
        where: { code: deptData.code },
        defaults: deptData
      });
      
      if (created) {
        console.log(`✅ Created department: ${deptData.name}`);
      } else {
        console.log(`⚠️  Department already exists: ${deptData.name}`);
      }
    }

    // Seed Groups
    console.log('👥 Seeding groups...');
    const groups = [
      {
        name: 'System Administrators',
        code: 'SYSADMIN',
        description: 'Full system access and administration privileges',
        departmentId: null,
        leader: 'System Administrator',
        memberCount: 2,
        status: 'active'
      },
      {
        name: 'Project Managers',
        code: 'PROJ_MGR',
        description: 'Project management and oversight team',
        departmentId: null, // Will be updated after finding LGU-PMT
        leader: 'Mr. Pedro Reyes',
        memberCount: 5,
        status: 'active'
      },
      {
        name: 'Data Entry Team',
        code: 'DATA_ENTRY',
        description: 'Data entry and form submission team',
        departmentId: null, // Will be updated after finding LGU-IU
        memberCount: 8,
        status: 'active'
      },
      {
        name: 'Engineering Team',
        code: 'ENG_TEAM',
        description: 'Engineering and technical team',
        departmentId: null, // Will be updated after finding EIU
        leader: 'Engr. Juan Dela Cruz',
        memberCount: 6,
        status: 'active'
      }
    ];

    // Get department IDs for associations
    const lguPmtDept = await db.Department.findOne({ where: { code: 'LGU-PMT' } });
    const lguIuDept = await db.Department.findOne({ where: { code: 'LGU-IU' } });
    const eiuDept = await db.Department.findOne({ where: { code: 'EIU' } });

    // Update group department associations
    if (lguPmtDept) groups[1].departmentId = lguPmtDept.id;
    if (lguIuDept) groups[2].departmentId = lguIuDept.id;
    if (eiuDept) groups[3].departmentId = eiuDept.id;

    for (const groupData of groups) {
      const [group, created] = await db.Group.findOrCreate({
        where: { code: groupData.code },
        defaults: groupData
      });
      
      if (created) {
        console.log(`✅ Created group: ${groupData.name}`);
      } else {
        console.log(`⚠️  Group already exists: ${groupData.name}`);
      }
    }

    // Seed Announcements
    console.log('📢 Seeding announcements...');
    const announcements = [
      {
        title: 'System Maintenance Notice',
        content: 'Scheduled maintenance will be performed on Sunday, July 15th from 2:00 AM to 6:00 AM. During this time, the system will be temporarily unavailable.',
        priority: 'urgent',
        status: 'active',
        targetAudience: 'all',
        publishDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        views: 156
      },
      {
        title: 'New Feature: Enhanced Reporting',
        content: 'We\'ve added new reporting features to help you better track project progress and generate comprehensive reports.',
        priority: 'normal',
        status: 'active',
        targetAudience: 'lgu',
        publishDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        views: 89
      },
      {
        title: 'Training Session: RPMES Forms',
        content: 'Join us for a comprehensive training session on the new RPMES forms and reporting procedures.',
        priority: 'high',
        status: 'scheduled',
        targetAudience: 'eiu',
        publishDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        views: 0
      }
    ];

    for (const announcementData of announcements) {
      const [announcement, created] = await db.Announcement.findOrCreate({
        where: { 
          title: announcementData.title,
          publishDate: announcementData.publishDate
        },
        defaults: announcementData
      });
      
      if (created) {
        console.log(`✅ Created announcement: ${announcementData.title}`);
      } else {
        console.log(`⚠️  Announcement already exists: ${announcementData.title}`);
      }
    }

    console.log('🎉 Admin data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Admin data seeding failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

seedAdminData(); 
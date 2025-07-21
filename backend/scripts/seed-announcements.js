const db = require('../models');

async function seedAnnouncements() {
  try {
    console.log('🌱 Starting announcements seeding...');
    
    // Sample announcements data
    const announcements = [
      {
        title: 'System Maintenance Notice',
        content: 'Scheduled maintenance will occur on Sunday, July 20, 2025 from 2:00 AM to 6:00 AM. The Build Watch system will be temporarily unavailable during this period. Please save your work and plan accordingly.',
        priority: 'high',
        status: 'active',
        targetAudience: 'all',
        publishDate: new Date('2025-07-15T10:00:00Z'),
        expiryDate: new Date('2025-07-25T23:59:59Z'),
        views: 0
      },
      {
        title: 'New Feature Release - Enhanced Project Tracking',
        content: 'We are excited to announce the release of enhanced project tracking features! New capabilities include real-time progress updates, improved timeline visualization, and better reporting tools. All users are encouraged to explore these new features.',
        priority: 'normal',
        status: 'active',
        targetAudience: 'all',
        publishDate: new Date('2025-07-10T09:00:00Z'),
        expiryDate: new Date('2025-08-10T23:59:59Z'),
        views: 0
      },
      {
        title: 'Training Session Reminder - LGU-IU Users',
        content: 'Mandatory training session for all Implementing Office users on July 25, 2025 at 9:00 AM. This session will cover new system features and best practices for project management. Attendance is required for all active users.',
        priority: 'high',
        status: 'active',
        targetAudience: 'lgu-iu',
        publishDate: new Date('2025-07-18T08:00:00Z'),
        expiryDate: new Date('2025-07-26T23:59:59Z'),
        views: 0
      },
      {
        title: 'Important: Project Deadline Approaching',
        content: 'Several projects are approaching their deadlines in the next 30 days. Please review your assigned projects and ensure all progress reports are submitted on time. Contact the MPMEC Secretariat if you need assistance.',
        priority: 'urgent',
        status: 'active',
        targetAudience: 'lgu-iu',
        publishDate: new Date('2025-07-17T14:30:00Z'),
        expiryDate: new Date('2025-07-31T23:59:59Z'),
        views: 0
      },
      {
        title: 'Security Update - Password Policy Changes',
        content: 'Effective immediately, all users are required to change their passwords to meet new security requirements. Passwords must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.',
        priority: 'high',
        status: 'active',
        targetAudience: 'all',
        publishDate: new Date('2025-07-16T11:00:00Z'),
        expiryDate: new Date('2025-07-30T23:59:59Z'),
        views: 0
      },
      {
        title: 'Monthly Performance Review',
        content: 'The monthly performance review for all Implementing Office projects will be conducted on July 28, 2025. Please ensure all project data is up to date and prepare any necessary documentation for review.',
        priority: 'normal',
        status: 'active',
        targetAudience: 'lgu-iu',
        publishDate: new Date('2025-07-14T15:00:00Z'),
        expiryDate: new Date('2025-07-29T23:59:59Z'),
        views: 0
      },
      {
        title: 'System Performance Improvements',
        content: 'Recent system updates have improved overall performance and loading times. Users should experience faster page loads and more responsive interactions. If you encounter any issues, please report them immediately.',
        priority: 'low',
        status: 'active',
        targetAudience: 'all',
        publishDate: new Date('2025-07-12T10:00:00Z'),
        expiryDate: new Date('2025-08-12T23:59:59Z'),
        views: 0
      },
      {
        title: 'Emergency Contact Information Update',
        content: 'Please update your emergency contact information in your user profile. This information is crucial for system administrators to reach you in case of urgent system issues or security concerns.',
        priority: 'normal',
        status: 'active',
        targetAudience: 'all',
        publishDate: new Date('2025-07-11T13:00:00Z'),
        expiryDate: new Date('2025-07-25T23:59:59Z'),
        views: 0
      }
    ];

    // Clear existing announcements
    await db.Announcement.destroy({ where: {} });
    console.log('🗑️  Cleared existing announcements');

    // Create new announcements
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

    console.log('🎉 Announcements seeding completed successfully!');
    console.log(`📊 Total announcements created: ${announcements.length}`);
    
  } catch (error) {
    console.error('❌ Announcements seeding failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the seeding function
seedAnnouncements(); 
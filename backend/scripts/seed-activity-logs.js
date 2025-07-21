const { ActivityLog, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function seedActivityLogs() {
  try {
    console.log('🌱 Seeding activity logs...');

    // Get existing users for reference
    const users = await User.findAll({
      attributes: ['id', 'name', 'username', 'email', 'role']
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please seed users first.');
      return;
    }

    // Sample activity data
    const activities = [
      // Authentication activities
      {
        action: 'LOGIN',
        entityType: 'User',
        details: 'User logged in successfully',
        level: 'Info',
        status: 'Success',
        module: 'Authentication',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'FAILED_LOGIN',
        entityType: 'User',
        details: 'Failed login attempt - invalid credentials',
        level: 'Warning',
        status: 'Failed',
        module: 'Authentication',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'LOGOUT',
        entityType: 'User',
        details: 'User logged out',
        level: 'Info',
        status: 'Success',
        module: 'Authentication',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'PASSWORD_CHANGE',
        entityType: 'User',
        details: 'Password changed successfully',
        level: 'Info',
        status: 'Success',
        module: 'Authentication',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'ACCOUNT_LOCKOUT',
        entityType: 'User',
        details: 'Account locked due to multiple failed login attempts',
        level: 'Warning',
        status: 'Success',
        module: 'Authentication',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },

      // User Management activities
      {
        action: 'CREATE_USER',
        entityType: 'User',
        details: 'Created new user account: john.doe@lgusantacruz.gov.ph',
        level: 'Info',
        status: 'Success',
        module: 'User Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'UPDATE_USER',
        entityType: 'User',
        details: 'Updated user profile: jane.smith@lgusantacruz.gov.ph',
        level: 'Info',
        status: 'Success',
        module: 'User Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'DELETE_USER',
        entityType: 'User',
        details: 'Deleted user account: old.user@lgusantacruz.gov.ph',
        level: 'Warning',
        status: 'Success',
        module: 'User Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'CHANGE_ROLE',
        entityType: 'User',
        details: 'Changed user role from EIU to LGU-PMT',
        level: 'Info',
        status: 'Success',
        module: 'User Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'ENABLE_USER',
        entityType: 'User',
        details: 'Enabled user account: disabled.user@lgusantacruz.gov.ph',
        level: 'Info',
        status: 'Success',
        module: 'User Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },

      // System Admin activities
      {
        action: 'UPDATE_CONFIGURATION',
        entityType: 'System',
        details: 'Updated system configuration settings',
        level: 'Info',
        status: 'Success',
        module: 'System Admin',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'BACKUP_CREATED',
        entityType: 'System',
        details: 'Created system backup: backup_2025_07_15_10_30_00.zip',
        level: 'Info',
        status: 'Success',
        module: 'System Admin',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'BACKUP_RESTORED',
        entityType: 'System',
        details: 'Restored system from backup: backup_2025_07_14_15_45_00.zip',
        level: 'Warning',
        status: 'Success',
        module: 'System Admin',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'SYSTEM_MAINTENANCE',
        entityType: 'System',
        details: 'Performed system maintenance and optimization',
        level: 'Info',
        status: 'Success',
        module: 'System Admin',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'SECURITY_UPDATE',
        entityType: 'System',
        details: 'Applied security patches and updates',
        level: 'Info',
        status: 'Success',
        module: 'System Admin',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },

      // Data Management activities
      {
        action: 'CREATE_ANNOUNCEMENT',
        entityType: 'Announcement',
        details: 'Created new announcement: System Maintenance Notice',
        level: 'Info',
        status: 'Success',
        module: 'Data Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'UPDATE_ANNOUNCEMENT',
        entityType: 'Announcement',
        details: 'Updated announcement: Updated System Maintenance Schedule',
        level: 'Info',
        status: 'Success',
        module: 'Data Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'DELETE_ANNOUNCEMENT',
        entityType: 'Announcement',
        details: 'Deleted expired announcement: Old Maintenance Notice',
        level: 'Info',
        status: 'Success',
        module: 'Data Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'EXPORT_DATA',
        entityType: 'Data',
        details: 'Exported user data to CSV format',
        level: 'Info',
        status: 'Success',
        module: 'Data Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'IMPORT_DATA',
        entityType: 'Data',
        details: 'Imported project data from Excel file',
        level: 'Info',
        status: 'Success',
        module: 'Data Management',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },

      // Audit & Monitoring activities
      {
        action: 'VIEW_AUDIT_LOG',
        entityType: 'ActivityLog',
        details: 'Viewed activity logs with filters',
        level: 'Info',
        status: 'Success',
        module: 'Audit & Monitoring',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'EXPORT_AUDIT_LOG',
        entityType: 'ActivityLog',
        details: 'Exported activity logs to CSV',
        level: 'Info',
        status: 'Success',
        module: 'Audit & Monitoring',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'SECURITY_ALERT',
        entityType: 'Security',
        details: 'Multiple failed login attempts detected from IP 192.168.1.101',
        level: 'Warning',
        status: 'Success',
        module: 'Audit & Monitoring',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'PERFORMANCE_ALERT',
        entityType: 'System',
        details: 'High CPU usage detected on database server',
        level: 'Warning',
        status: 'Success',
        module: 'Audit & Monitoring',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        action: 'VIEW_USER_LOGS',
        entityType: 'User',
        details: 'Viewed activity logs for specific user',
        level: 'Info',
        status: 'Success',
        module: 'Audit & Monitoring',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    ];

    // Create activity logs with different timestamps and users
    const activityLogs = [];
    const now = new Date();
    
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Create timestamps spread over the last 7 days
      const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      activityLogs.push({
        id: uuidv4(),
        userId: user.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityType === 'User' ? user.id : null,
        details: activity.details,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        level: activity.level,
        status: activity.status,
        module: activity.module,
        metadata: {
          source: 'seeded',
          category: activity.module
        },
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }

    // Insert activity logs
    await ActivityLog.bulkCreate(activityLogs);
    
    console.log(`✅ Successfully seeded ${activityLogs.length} activity logs`);
    console.log('📊 Activity logs include:');
    console.log('   - Authentication activities (login, logout, failed attempts)');
    console.log('   - User management activities (create, update, delete users)');
    console.log('   - System admin activities (configuration, backup, maintenance)');
    console.log('   - Data management activities (announcements, exports, imports)');
    console.log('   - Audit & monitoring activities (viewing logs, security alerts)');

  } catch (error) {
    console.error('❌ Error seeding activity logs:', error);
  }
}

// Run the seeder
seedActivityLogs().then(() => {
  console.log('🎉 Activity logs seeding completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Activity logs seeding failed:', error);
  process.exit(1);
}); 
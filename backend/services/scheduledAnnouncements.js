const { Announcement, User, AnnouncementAttachment, ReadReceipt } = require('../models');
const { sendAnnouncementEmail } = require('./emailService');

/**
 * Check and publish scheduled announcements
 * This function should be called periodically (e.g., every minute via cron)
 */
const checkAndPublishScheduledAnnouncements = async () => {
  try {
    const now = new Date();
    const Op = require('sequelize').Op;
    
    // Find all scheduled announcements that should be published now
    const scheduledAnnouncements = await Announcement.findAll({
      where: {
        status: 'scheduled',
        publishDate: {
          [Op.lte]: now
        }
      },
      include: [
        {
          model: AnnouncementAttachment,
          as: 'attachments',
          required: false
        }
      ]
    });
    
    if (scheduledAnnouncements.length === 0) {
      return { published: 0, errors: [] };
    }
    
    console.log(`📅 Found ${scheduledAnnouncements.length} scheduled announcement(s) to publish`);
    
    const results = {
      published: 0,
      errors: []
    };
    
    for (const announcement of scheduledAnnouncements) {
      try {
        // Update status to active
        await announcement.update({
          status: 'active'
        });
        
        console.log(`✅ Published scheduled announcement: ${announcement.title} (ID: ${announcement.id})`);
        results.published++;
        
        // Send email notifications if the announcement was created with email notification enabled
        // Note: We'll need to track this in a separate field or check activity logs
        // For now, we'll send emails for all published scheduled announcements
        try {
          const Op = require('sequelize').Op;
          let targetUsers = [];
          
          if (announcement.targetAudience === 'all') {
            targetUsers = await User.findAll({
              where: {
                status: 'active',
                email: { [Op.ne]: null }
              },
              attributes: ['id', 'email', 'name', 'role']
            });
          } else {
            const roleMapping = {
              'SYS.AD': ['SYS.AD'],
              'LGU-PMT': ['LGU-PMT'],
              'LGU-IU': ['LGU-IU'],
              'EIU': ['EIU'],
              'EMS': ['EMS']
            };
            
            const targetRoles = roleMapping[announcement.targetAudience] || [announcement.targetAudience];
            
            if (announcement.targetAudience === 'LGU-PMT') {
              targetUsers = await User.findAll({
                where: {
                  status: 'active',
                  email: { [Op.ne]: null },
                  [Op.or]: [
                    { role: 'LGU-PMT' },
                    { subRole: 'MPMEC-SECRETARIAT' },
                    { subRole: 'MPMEC_SECRETARIAT' },
                    { subRole: 'MPMEC' }
                  ]
                },
                attributes: ['id', 'email', 'name', 'role', 'subRole']
              });
            } else {
              targetUsers = await User.findAll({
                where: {
                  status: 'active',
                  email: { [Op.ne]: null },
                  role: { [Op.in]: targetRoles }
                },
                attributes: ['id', 'email', 'name', 'role']
              });
            }
          }
          
          // Send emails asynchronously
          const emailPromises = targetUsers
            .filter(user => user.email && user.email.trim())
            .map(user => 
              sendAnnouncementEmail(
                user.email, 
                announcement.toJSON(), 
                announcement.attachments || []
              ).catch(err => {
                console.error(`Failed to send email to ${user.email}:`, err);
                return false;
              })
            );
          
          Promise.all(emailPromises).then(results => {
            const successCount = results.filter(r => r === true).length;
            console.log(`📧 Sent ${successCount} email notifications for scheduled announcement: ${announcement.title}`);
          });
          
        } catch (emailError) {
          console.error(`Error sending emails for announcement ${announcement.id}:`, emailError);
          // Don't fail the publish if email fails
        }
        
      } catch (error) {
        console.error(`Error publishing announcement ${announcement.id}:`, error);
        results.errors.push({
          announcementId: announcement.id,
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error checking scheduled announcements:', error);
    return { published: 0, errors: [{ error: error.message }] };
  }
};

/**
 * Check and expire announcements
 */
const checkAndExpireAnnouncements = async () => {
  try {
    const now = new Date();
    const Op = require('sequelize').Op;
    
    // Find all active announcements that have expired
    const expiredAnnouncements = await Announcement.findAll({
      where: {
        status: 'active',
        expiryDate: {
          [Op.lte]: now,
          [Op.ne]: null
        }
      }
    });
    
    if (expiredAnnouncements.length === 0) {
      return { expired: 0 };
    }
    
    console.log(`⏰ Found ${expiredAnnouncements.length} expired announcement(s)`);
    
    // Update status to expired
    await Announcement.update(
      { status: 'expired' },
      {
        where: {
          id: {
            [Op.in]: expiredAnnouncements.map(a => a.id)
          }
        }
      }
    );
    
    console.log(`✅ Expired ${expiredAnnouncements.length} announcement(s)`);
    
    return { expired: expiredAnnouncements.length };
    
  } catch (error) {
    console.error('Error checking expired announcements:', error);
    return { expired: 0 };
  }
};

module.exports = {
  checkAndPublishScheduledAnnouncements,
  checkAndExpireAnnouncements
};


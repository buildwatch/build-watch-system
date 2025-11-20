const nodemailer = require('nodemailer');

// Create Gmail transporter for real email sending
const createGmailTransporter = () => {
  // For development, you can use Gmail with App Password
  // In production, use a proper email service like SendGrid, Mailgun, etc.
  
  // Check if Gmail credentials are configured
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  
  // If no Gmail credentials, return null to use development mode
  return null;
};

// Send User ID email
const sendUserIdEmail = async (email, userId, group) => {
  try {
    const transporter = createGmailTransporter();
    
    if (transporter) {
      // Real email sending
      const mailOptions = {
        from: '"Build Watch System" <noreply@buildwatch.com>',
        to: email,
        subject: 'Your Unique User ID for Build Watch System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #EB3C3C; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Build Watch System</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Santa Cruz LGU</p>
            </div>
            
            <div style="padding: 30px 20px; background-color: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Your Unique User ID</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Hello! Your account has been created in the Build Watch System. 
                Please use the following Unique User ID to complete your account setup:
              </p>
              
              <div style="background-color: white; border: 2px solid #EB3C3C; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
                <h3 style="color: #EB3C3C; margin: 0 0 10px 0; font-size: 18px;">Unique User ID</h3>
                <div style="font-size: 24px; font-weight: bold; color: #333; letter-spacing: 2px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                  ${userId}
                </div>
              </div>
              
              <div style="background-color: #e8f4fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #1976D2;">Account Details:</h4>
                <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Group:</strong> ${group}</p>
              </div>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #856404;">Important Instructions:</h4>
                <ol style="margin: 0; padding-left: 20px; color: #856404;">
                  <li>Go to the Build Watch System login page</li>
                  <li>Select your appropriate login portal (EIU, LGU-PMT, etc.)</li>
                  <li>Enter your email address as the username</li>
                  <li>Enter the Unique User ID above when prompted</li>
                  <li>Set your password and complete the account setup</li>
                </ol>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-top: 30px;">
                If you have any questions or need assistance, please contact your system administrator.
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
                This is an automated message from the Build Watch System. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', email);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } else {
      // Development mode - show User ID in console
      console.log('\n📧 ===== EMAIL VERIFICATION (DEVELOPMENT MODE) =====');
      console.log('📧 To:', email);
      console.log('📧 Subject: Your Unique User ID for Build Watch System');
      console.log('📧 Group:', group);
      console.log('📧 Unique User ID:', userId);
      console.log('📧 ================================================\n');
      
      console.log('💡 To enable real email sending:');
      console.log('1. Enable 2FA on your Gmail account');
      console.log('2. Generate an App Password');
      console.log('3. Add to your .env file:');
      console.log('   GMAIL_USER=your-email@gmail.com');
      console.log('   GMAIL_APP_PASSWORD=your-app-password');
      console.log('4. Restart the backend server\n');
      
      return true; // Return true to allow testing
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Fallback to development mode
    console.log('\n📧 ===== EMAIL VERIFICATION (FALLBACK MODE) =====');
    console.log('📧 To:', email);
    console.log('📧 Unique User ID:', userId);
    console.log('📧 Group:', group);
    console.log('📧 ================================================\n');
    
    return true; // Return true to allow testing
  }
};

// Send announcement notification email
const sendAnnouncementEmail = async (email, announcement, attachments = []) => {
  try {
    const transporter = createGmailTransporter();
    
    // Format priority badge color
    const priorityColors = {
      urgent: '#dc2626',
      high: '#ea580c',
      normal: '#2563eb',
      low: '#6b7280'
    };
    
    const priorityLabels = {
      urgent: 'Urgent',
      high: 'High Priority',
      normal: 'Normal',
      low: 'Low Priority'
    };
    
    const priorityColor = priorityColors[announcement.priority] || priorityColors.normal;
    const priorityLabel = priorityLabels[announcement.priority] || priorityLabels.normal;
    
    // Format date
    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    // Format file size
    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    // Build attachments list HTML
    let attachmentsHtml = '';
    if (attachments && attachments.length > 0) {
      attachmentsHtml = `
        <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #1e40af;">Attachments (${attachments.length}):</h4>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${attachments.map(att => `<li>${att.originalFileName} (${formatFileSize(att.fileSize)})</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    const mailOptions = {
      from: '"Build Watch System" <noreply@buildwatch.com>',
      to: email,
      subject: `[${priorityLabel}] ${announcement.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #EB3C3C; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Build Watch System</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Santa Cruz LGU</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: #f9f9f9;">
            <div style="background-color: ${priorityColor}; color: white; padding: 8px 16px; border-radius: 6px; display: inline-block; margin-bottom: 20px; font-weight: bold;">
              ${priorityLabel}
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px; margin-top: 0;">${announcement.title}</h2>
            
            <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
              ${announcement.contentHtml || announcement.content.replace(/\n/g, '<br>')}
            </div>
            
            ${attachmentsHtml}
            
            <div style="background-color: #e8f4fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #1976D2;">Announcement Details:</h4>
              <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${announcement.announcementType ? announcement.announcementType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'General'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Published:</strong> ${formatDate(announcement.publishDate)}</p>
              ${announcement.expiryDate ? `<p style="margin: 5px 0; color: #666;"><strong>Expires:</strong> ${formatDate(announcement.expiryDate)}</p>` : ''}
              ${announcement.requiresAcknowledgment ? `<p style="margin: 5px 0; color: #dc2626;"><strong>⚠️ Requires Acknowledgment</strong>${announcement.acknowledgmentDeadline ? ` by ${formatDate(announcement.acknowledgmentDeadline)}` : ''}</p>` : ''}
            </div>
            
            ${announcement.requiresAcknowledgment ? `
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; color: #856404;">Action Required:</h4>
                <p style="margin: 0; color: #856404;">Please log in to the Build Watch System to acknowledge this announcement.</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4321'}/dashboard" style="background-color: #EB3C3C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View in Build Watch System
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">
              This is an automated notification from the Build Watch System. Please do not reply to this email.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
              © ${new Date().getFullYear()} Build Watch System - Santa Cruz LGU
            </p>
          </div>
        </div>
      `
    };

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Announcement email sent successfully to:', email);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } else {
      // Development mode
      console.log('\n📧 ===== ANNOUNCEMENT EMAIL (DEVELOPMENT MODE) =====');
      console.log('📧 To:', email);
      console.log('📧 Subject:', mailOptions.subject);
      console.log('📧 Title:', announcement.title);
      console.log('📧 Priority:', priorityLabel);
      console.log('📧 Type:', announcement.announcementType || 'General');
      console.log('📧 Requires Acknowledgment:', announcement.requiresAcknowledgment ? 'Yes' : 'No');
      console.log('📧 Attachments:', attachments.length);
      console.log('📧 ================================================\n');
      
      return true; // Return true to allow testing
    }
  } catch (error) {
    console.error('❌ Error sending announcement email:', error);
    
    // Fallback to development mode
    console.log('\n📧 ===== ANNOUNCEMENT EMAIL (FALLBACK MODE) =====');
    console.log('📧 To:', email);
    console.log('📧 Title:', announcement.title);
    console.log('📧 ================================================\n');
    
    return false; // Return false on error
  }
};

module.exports = {
  sendUserIdEmail,
  sendAnnouncementEmail
}; 
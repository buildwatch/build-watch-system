const nodemailer = require('nodemailer');

// Create Gmail transporter for real email sending
const createGmailTransporter = () => {
  // For development, you can use Gmail with App Password
  // In production, use a proper email service like SendGrid, Mailgun, etc.
  
  // Check if Gmail credentials are configured
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  
  if (!gmailUser || !gmailPassword) {
    console.log('⚠️  [EMAIL CONFIG] Gmail credentials not configured:');
    console.log('   GMAIL_USER:', gmailUser ? '✅ Set' : '❌ Missing');
    console.log('   GMAIL_APP_PASSWORD:', gmailPassword ? '✅ Set' : '❌ Missing');
    console.log('   Email sending will be logged to console only (development mode)');
    return null;
  }
  
  console.log('✅ [EMAIL CONFIG] Gmail credentials configured');
  console.log('   GMAIL_USER:', gmailUser);
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });
    
    // Verify transporter configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ [EMAIL CONFIG] Gmail transporter verification failed:', error.message);
      } else {
        console.log('✅ [EMAIL CONFIG] Gmail transporter verified and ready');
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('❌ [EMAIL CONFIG] Failed to create Gmail transporter:', error.message);
    return null;
  }
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

// Send password reset email
const sendPasswordResetEmail = async (email, resetUrl, userName, userUserId, originalUserEmail = null) => {
  try {
    const transporter = createGmailTransporter();
    
    // Format current time
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const dateString = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // If originalUserEmail is provided, show it in the email body
    const emailInfo = originalUserEmail && originalUserEmail !== email 
      ? `<p style="color: #666; line-height: 1.6; margin-bottom: 10px; font-size: 12px; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
          <strong>Password Reset Request For:</strong><br/>
          User: ${userName || 'User'}<br/>
          Email: ${originalUserEmail}
        </p>`
      : '';
    
    if (transporter) {
      // Real email sending
      const mailOptions = {
        from: '"Build Watch System" <buildwatch69@gmail.com>',
        to: email,
        subject: originalUserEmail && originalUserEmail !== email 
          ? `Password Reset Link for ${originalUserEmail}`
          : 'Your Build Watch Account Recovery Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">Do Not Reply &lt;buildwatch69@gmail.com&gt;</p>
              <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">${timeString} (${dateString})</p>
              <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">to me</p>
            </div>
            
            <div style="padding: 20px 0;">
              <p style="color: #333; line-height: 1.6; margin-bottom: 20px; font-size: 14px;">
                Hi, ${userName || 'User'}
              </p>
              
              ${emailInfo}
              
              <p style="color: #333; line-height: 1.6; margin-bottom: 20px; font-size: 14px;">
                Your Build Watch Account Recovery Link is:
              </p>
              
              <div style="background-color: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin: 20px 0; word-break: break-all;">
                <a href="${resetUrl}" style="color: #0A45E0; text-decoration: none; font-size: 14px; word-break: break-all;">${resetUrl}</a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-top: 30px; font-size: 12px;">
                This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
              </p>
            </div>
          </div>
        `
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ [EMAIL] Password reset email sent successfully!');
        console.log('📧 [EMAIL] To:', email);
        if (originalUserEmail && originalUserEmail !== email) {
          console.log('📧 [EMAIL] Original user email:', originalUserEmail);
        }
        console.log('📧 [EMAIL] Message ID:', info.messageId);
        console.log('📧 [EMAIL] Reset URL:', resetUrl);
        console.log('📧 [EMAIL] Response:', info.response);
        return true;
      } catch (sendError) {
        console.error('❌ [EMAIL] Failed to send email:', sendError.message);
        console.error('❌ [EMAIL] Error code:', sendError.code);
        if (sendError.response) {
          console.error('❌ [EMAIL] SMTP response:', sendError.response);
        }
        throw sendError; // Re-throw to be caught by outer catch
      }
    } else {
      // Development mode - show reset link in console
      console.log('\n📧 ===== PASSWORD RESET EMAIL (DEVELOPMENT MODE) =====');
      console.log('📧 From: Do Not Reply <buildwatch69@gmail.com>');
      console.log('📧 To:', email);
      if (originalUserEmail && originalUserEmail !== email) {
        console.log('📧 Original User Email:', originalUserEmail);
      }
      console.log('📧 Subject: Your Build Watch Account Recovery Link');
      console.log('📧 User:', userName || 'N/A');
      console.log('📧 User ID:', userUserId || 'N/A');
      console.log('📧 Reset URL:', resetUrl);
      console.log('📧 ================================================\n');
      
      console.log('💡 To enable real email sending:');
      console.log('1. Enable 2FA on your Gmail account');
      console.log('2. Generate an App Password');
      console.log('3. Add to your .env file:');
      console.log('   GMAIL_USER=buildwatch69@gmail.com');
      console.log('   GMAIL_APP_PASSWORD=your-app-password');
      console.log('4. Restart the backend server\n');
      
      return true; // Return true to allow testing
    }
  } catch (error) {
    console.error('❌ [EMAIL] Error sending password reset email:', error);
    console.error('❌ [EMAIL] Error details:', {
      message: error.message,
      code: error.code,
      response: error.response
    });
    
    // Fallback to development mode
    console.log('\n📧 ===== PASSWORD RESET EMAIL (FALLBACK MODE) =====');
    console.log('📧 To:', email);
    if (originalUserEmail && originalUserEmail !== email) {
      console.log('📧 Original User Email:', originalUserEmail);
    }
    console.log('📧 Reset URL:', resetUrl);
    console.log('📧 ================================================\n');
    
    return false; // Return false on error
  }
};

// Send User Creation Email with verification link
const sendUserCreationEmail = async (email, userData, verificationToken, baseUrl) => {
  try {
    const transporter = createGmailTransporter();
    
    const verificationUrl = `${baseUrl}/api/users/verify-user-creation?token=${verificationToken}`;
    
    if (transporter) {
      const mailOptions = {
        from: process.env.GMAIL_USER || 'buildwatch69@gmail.com',
        to: email,
        subject: 'Complete Your Account Creation - Build Watch System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Build Watch System</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Santa Cruz LGU</p>
            </div>
            
            <div style="padding: 30px 20px; background-color: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Welcome to Build Watch System!</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Hello! You have been invited to join the Build Watch System. 
                Please complete your account creation by clicking the button below.
              </p>
              
              <div style="background-color: #e8f4fd; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #1d4ed8;">Your Account Details:</h4>
                <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Group:</strong> ${userData.group || 'N/A'}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Role:</strong> ${userData.role || 'N/A'}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  Create Your Account
                </a>
              </div>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #856404;">Important:</h4>
                <p style="margin: 0; color: #856404; line-height: 1.6;">
                  This link will expire in 24 hours. If you did not request this account, please ignore this email.
                </p>
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
      console.log('✅ User creation email sent successfully to:', email);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } else {
      // Development mode
      console.log('\n📧 ===== USER CREATION EMAIL (DEVELOPMENT MODE) =====');
      console.log('📧 To:', email);
      console.log('📧 Subject: Complete Your Account Creation - Build Watch System');
      console.log('📧 Verification URL:', verificationUrl);
      console.log('📧 User Data:', JSON.stringify(userData, null, 2));
      console.log('📧 ================================================\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Error sending user creation email:', error);
    return false;
  }
};

// Send email change verification email
const sendEmailChangeVerificationEmail = async (newEmail, verificationUrl, userData) => {
  try {
    const transporter = createGmailTransporter();
    
    const mailOptions = {
      from: '"Build Watch System" <buildwatch69@gmail.com>',
      to: newEmail,
      subject: 'Verify Your New Email Address - Build Watch System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Build Watch System</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Santa Cruz LGU</p>
          </div>
          
          <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">Email Change Verification</h2>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px; margin-bottom: 20px;">
              Hello ${userData.userName || 'User'},
            </p>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px; margin-bottom: 20px;">
              You have requested to change your email address from <strong>${userData.oldEmail}</strong> to <strong>${userData.newEmail}</strong>.
            </p>
            
            <p style="color: #4b5563; line-height: 1.7; font-size: 16px; margin-bottom: 30px;">
              To complete the email change and update your account information, please click the button below:
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
                Verify Email Change
              </a>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 6px;">
              <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>⚠️ Important:</strong> This verification link will expire in 24 hours. If you did not request this email change, please ignore this email or contact your system administrator.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              If the button above doesn't work, you can copy and paste the following link into your browser:
            </p>
            <p style="color: #2563eb; font-size: 12px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 6px; margin: 10px 0 30px 0;">
              ${verificationUrl}
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                This is an automated email from the Build Watch System. Please do not reply to this email.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
                © ${new Date().getFullYear()} Build Watch System - Santa Cruz LGU
              </p>
            </div>
          </div>
        </div>
      `
    };

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email change verification email sent successfully to:', newEmail);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } else {
      // Development mode
      console.log('\n📧 ===== EMAIL CHANGE VERIFICATION EMAIL (DEVELOPMENT MODE) =====');
      console.log('📧 To:', newEmail);
      console.log('📧 Subject:', mailOptions.subject);
      console.log('📧 Old Email:', userData.oldEmail);
      console.log('📧 New Email:', userData.newEmail);
      console.log('📧 Verification URL:', verificationUrl);
      console.log('📧 ================================================================\n');
      
      return true; // Return true to allow testing
    }
  } catch (error) {
    console.error('❌ Error sending email change verification email:', error);
    
    // Fallback to development mode
    console.log('\n📧 ===== EMAIL CHANGE VERIFICATION EMAIL (FALLBACK MODE) =====');
    console.log('📧 To:', newEmail);
    console.log('📧 Old Email:', userData.oldEmail);
    console.log('📧 New Email:', userData.newEmail);
    console.log('📧 ================================================================\n');
    
    return false; // Return false on error
  }
};

module.exports = {
  sendUserIdEmail,
  sendAnnouncementEmail,
  sendPasswordResetEmail,
  sendUserCreationEmail,
  sendEmailChangeVerificationEmail
}; 
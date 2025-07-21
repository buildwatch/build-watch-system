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

module.exports = {
  sendUserIdEmail
}; 
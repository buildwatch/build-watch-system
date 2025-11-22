require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailSending() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Check environment variables
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  
  console.log('📋 Environment Check:');
  console.log('   GMAIL_USER:', gmailUser ? `✅ Set (${gmailUser})` : '❌ Missing');
  console.log('   GMAIL_APP_PASSWORD:', gmailPassword ? '✅ Set (16 characters)' : '❌ Missing');
  console.log('');
  
  if (!gmailUser || !gmailPassword) {
    console.error('❌ Gmail credentials not configured in .env file');
    console.log('\n💡 To fix:');
    console.log('1. Open backend/.env file');
    console.log('2. Add these lines:');
    console.log('   GMAIL_USER=buildwatch69@gmail.com');
    console.log('   GMAIL_APP_PASSWORD=your-16-char-app-password');
    console.log('3. Restart backend server');
    process.exit(1);
  }
  
  // Create transporter
  console.log('🔧 Creating Gmail transporter...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword
    }
  });
  
  // Verify connection
  console.log('🔍 Verifying Gmail connection...');
  try {
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully!\n');
  } catch (error) {
    console.error('❌ Gmail connection verification failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.log('\n💡 Common issues:');
    console.log('1. App password is incorrect (check for spaces)');
    console.log('2. 2FA is not enabled on the Gmail account');
    console.log('3. App password was revoked');
    process.exit(1);
  }
  
  // Send test email
  console.log('📧 Sending test email to buildwatch69@gmail.com...');
  const testEmail = {
    from: '"Build Watch System" <ilearnu.student5@lu.edu.ph>',
    to: 'buildwatch69@gmail.com',
    subject: 'Test Email - Build Watch Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Test Email</h2>
        <p>This is a test email to verify email sending is working.</p>
        <p>If you receive this, your email configuration is correct!</p>
        <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `
  };
  
  try {
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('\n✅ Email configuration is working!');
    console.log('📬 Check buildwatch69@gmail.com inbox for the test email.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    if (error.response) {
      console.error('   SMTP Response:', error.response);
    }
    process.exit(1);
  }
}

testEmailSending();


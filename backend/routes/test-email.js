const express = require('express');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

// Test email sending endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    console.log('🧪 [TEST EMAIL] Testing email configuration...');
    console.log('🧪 [TEST EMAIL] User ID:', userId);
    
    // Check environment variables
    const hasGmailUser = !!process.env.GMAIL_USER;
    const hasGmailPassword = !!process.env.GMAIL_APP_PASSWORD;
    
    console.log('🧪 [TEST EMAIL] Environment check:');
    console.log('   GMAIL_USER:', hasGmailUser ? '✅ Set' : '❌ Missing');
    console.log('   GMAIL_APP_PASSWORD:', hasGmailPassword ? '✅ Set' : '❌ Missing');
    
    if (!hasGmailUser || !hasGmailPassword) {
      return res.json({
        success: false,
        error: 'Gmail credentials not configured',
        details: {
          GMAIL_USER: hasGmailUser ? 'Set' : 'Missing',
          GMAIL_APP_PASSWORD: hasGmailPassword ? 'Set' : 'Missing',
          instructions: [
            '1. Enable 2FA on buildwatch69@gmail.com',
            '2. Generate an App Password: https://myaccount.google.com/apppasswords',
            '3. Add to backend/.env file:',
            '   GMAIL_USER=buildwatch69@gmail.com',
            '   GMAIL_APP_PASSWORD=your-16-char-app-password',
            '4. Restart the backend server'
          ]
        }
      });
    }
    
    // Test sending email
    const testUrl = 'http://localhost:4321/reset-password?token=test-token-123';
    const testEmail = 'buildwatch69@gmail.com';
    
    console.log('🧪 [TEST EMAIL] Attempting to send test email to:', testEmail);
    
    const emailSent = await sendPasswordResetEmail(
      testEmail,
      testUrl,
      'Test User',
      userId,
      'test@example.com'
    );
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Test email sent successfully! Check buildwatch69@gmail.com inbox.',
        sentTo: testEmail
      });
    } else {
      res.json({
        success: false,
        error: 'Email sending failed (check console for details)',
        sentTo: testEmail
      });
    }
    
  } catch (error) {
    console.error('❌ [TEST EMAIL] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Test email failed',
      details: error.message
    });
  }
});

module.exports = router;


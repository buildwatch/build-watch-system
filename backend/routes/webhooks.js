/**
 * Webhooks API for Announcement System
 * Phase 3D: Integration & Enhancement Features
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Announcement } = require('../models');
const pushNotificationService = require('../services/pushNotificationService');

// Get VAPID public key for frontend
router.get('/vapid-public-key', authenticateToken, (req, res) => {
  const publicKey = pushNotificationService.getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured'
    });
  }
  res.json({ success: true, publicKey });
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;
    const userAgent = req.get('user-agent');

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription object'
      });
    }

    const result = await pushNotificationService.registerSubscription(
      userId,
      subscription,
      userAgent
    );

    if (result.success) {
      res.json({ success: true, message: 'Subscription saved successfully' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to save subscription' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body; // Optional: specific endpoint to unsubscribe

    const result = await pushNotificationService.unregisterSubscription(userId, endpoint);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Unsubscribed successfully',
        deleted: result.deleted 
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
  }
});

// Test push notification (for admin/testing)
router.post('/send-test-notification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title = 'Test Notification', body = 'This is a test push notification from Build Watch.' } = req.body;

    const result = await pushNotificationService.sendNotification(userId, {
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge.png'
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test notification sent',
        sent: result.sent,
        total: result.total
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: 'Failed to send test notification' });
  }
});

// Webhook endpoint for announcement events (external webhooks)
router.post('/announcements/:id/webhook', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { event, webhookUrl } = req.body;
    const announcementId = parseInt(id);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement ID'
      });
    }

    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // In production, store webhook configuration and trigger webhooks on events
    // For now, return success
    res.json({
      success: true,
      message: 'Webhook registered successfully',
      webhook: {
        announcementId,
        event,
        webhookUrl
      }
    });
  } catch (error) {
    console.error('Webhook registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register webhook'
    });
  }
});

module.exports = router;


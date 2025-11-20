/**
 * Push Notification Service
 * Handles browser push notifications for announcements
 * Phase 3D: Integration & Enhancement Features
 */

const webpush = require('web-push');
const { UserPushSubscription } = require('../models');
require('dotenv').config();

// VAPID keys should be generated once and stored securely in .env
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@buildwatch.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  console.warn('⚠️  VAPID keys are not set. Push notifications will not work.');
  console.warn('   Generate them using: npx web-push generate-vapid-keys');
  console.warn('   Add to .env: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
}

class PushNotificationService {
  /**
   * Register a push subscription for a user
   */
  async registerSubscription(userId, subscription, userAgent = null) {
    try {
      if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
        console.warn('VAPID keys not configured. Skipping subscription registration.');
        return { success: false, error: 'Push notifications not configured' };
      }

      const subscriptionData = {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || null
      };

      // Check if subscription already exists
      const existing = await UserPushSubscription.findOne({
        where: {
          userId,
          endpoint: subscription.endpoint
        }
      });

      if (existing) {
        // Update existing subscription
        await existing.update(subscriptionData);
        console.log(`📱 Push subscription updated for user ${userId}`);
      } else {
        // Create new subscription
        await UserPushSubscription.create(subscriptionData);
        console.log(`📱 Push subscription registered for user ${userId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error registering push subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unregister a push subscription for a user
   */
  async unregisterSubscription(userId, endpoint = null) {
    try {
      const whereClause = { userId };
      if (endpoint) {
        whereClause.endpoint = endpoint;
      }

      const deleted = await UserPushSubscription.destroy({ where: whereClause });
      console.log(`📱 Push subscription unregistered for user ${userId} (${deleted} subscription(s) removed)`);
      return { success: true, deleted };
    } catch (error) {
      console.error('Error unregistering push subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to a user
   */
  async sendNotification(userId, notification) {
    try {
      if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
        console.warn('VAPID keys not configured. Cannot send push notification.');
        return { success: false, error: 'Push notifications not configured' };
      }

      // Get all subscriptions for the user
      const subscriptions = await UserPushSubscription.findAll({
        where: { userId }
      });

      if (subscriptions.length === 0) {
        console.log(`No push subscription found for user ${userId}`);
        return { success: false, error: 'No subscription found' };
      }

      const payload = JSON.stringify({
        title: notification.title || 'Build Watch Announcement',
        body: notification.body || '',
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge.png',
        data: notification.data || {},
        tag: notification.tag || 'announcement',
        requireInteraction: notification.requireInteraction || false
      });

      const results = [];
      for (const sub of subscriptions) {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(subscription, payload);
          results.push({ success: true, endpoint: sub.endpoint });
        } catch (error) {
          console.error(`Error sending to subscription ${sub.endpoint}:`, error);
          // If subscription is invalid (410), remove it
          if (error.statusCode === 410) {
            await sub.destroy();
            console.log(`Removed invalid subscription: ${sub.endpoint}`);
          }
          results.push({ success: false, endpoint: sub.endpoint, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`📱 Push notification sent to user ${userId}: ${successCount}/${subscriptions.length} successful`);
      
      return { 
        success: successCount > 0, 
        sent: successCount, 
        total: subscriptions.length,
        results 
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendBulkNotifications(userIds, notification) {
    const results = await Promise.all(
      userIds.map(userId => this.sendNotification(userId, notification))
    );
    const successCount = results.filter(r => r.success).length;
    return { 
      success: successCount > 0, 
      sent: successCount, 
      total: userIds.length,
      results 
    };
  }

  /**
   * Get VAPID public key for frontend
   */
  getVapidPublicKey() {
    return vapidKeys.publicKey;
  }
}

module.exports = new PushNotificationService();


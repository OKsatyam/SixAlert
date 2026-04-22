/**
 * web-push.js — Web Push notification dispatcher.
 * Initialises VAPID credentials once on first call, then sends push payloads
 * to individual PushSubscription objects stored on User documents.
 */
import webpush from 'web-push';
import logger from '../../utils/logger.js';

// VAPID details set once — webpush library caches them internally
let initialised = false;

const init = () => {
  if (initialised) return;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must be set');
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  initialised = true;
};

/**
 * Send a Web Push notification to one subscription.
 * @param {object} subscription — PushSubscription object from browser
 * @param {object} payload      — { title, body, url } shown in the notification
 * @returns {Promise<boolean>}  — true on success, false on non-fatal failure
 */
const sendPushNotification = async (subscription, payload) => {
  init();

  if (!subscription || !subscription.endpoint) {
    logger.warn('sendPushNotification: invalid subscription object');
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    // 410 Gone = subscription expired/revoked — caller should delete it from DB
    if (err.statusCode === 410) {
      logger.warn(`sendPushNotification: subscription gone (410) — endpoint=${subscription.endpoint}`);
      return 'gone';
    }
    logger.error(`sendPushNotification: ${err.message}`);
    return false;
  }
};

// reset for testing — avoids VAPID re-init errors across test runs
const _resetForTest = () => { initialised = false; };

export { sendPushNotification, _resetForTest };

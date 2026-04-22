/**
 * dispatcher.js — fan-out notification dispatcher.
 * Given an OfferTrigger and a list of Users, sends notifications
 * across all channels each user has enabled (push, telegram, email).
 * Channels run in parallel per user; users run in parallel batch.
 */
import { sendPushNotification } from './web-push.js';
import { sendTelegramMessage } from './telegram.js';
import { sendEmail } from './email.js';
import User from '../../models/user.js';
import logger from '../../utils/logger.js';

/**
 * Build a human-readable offer alert message.
 * @param {object} offer — populated Offer document
 */
const buildMessage = (offer) => {
  const discount =
    offer.discountType === 'percent'
      ? `${offer.discountValue}% off`
      : `₹${offer.discountValue} off`;
  return {
    title: `🏏 ${offer.title}`,
    body: `${offer.brandId?.name ?? 'Brand'} — ${discount}. Hurry, offer expires soon!`,
    html: `<h2>🏏 ${offer.title}</h2><p><strong>${offer.brandId?.name ?? 'Brand'}</strong> — ${discount}.</p><p>Offer expires soon. Don't miss out!</p>`,
  };
};

/**
 * Send notifications for a fired offer trigger to all subscribed users.
 * @param {object} trigger — OfferTrigger document (populated with offerId)
 * @returns {Promise<{ sent: number, failed: number }>}
 */
const dispatchOfferNotifications = async (trigger) => {
  const offer = trigger.offerId;
  if (!offer) {
    logger.warn('dispatchOfferNotifications: trigger has no populated offerId');
    return { sent: 0, failed: 0 };
  }

  // fetch users who want at least one notification channel
  const users = await User.find({
    $or: [
      { 'notifications.push': true },
      { 'notifications.telegram': true },
      { 'notifications.email': true },
    ],
  }).select('+pushSubscription');

  if (users.length === 0) return { sent: 0, failed: 0 };

  const { title, body, html } = buildMessage(offer);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    users.map(async (user) => {
      const prefs = user.notifications ?? {};
      const tasks = [];

      if (prefs.push && user.pushSubscription) {
        tasks.push(sendPushNotification(user.pushSubscription, { title, body }));
      }
      if (prefs.telegram && user.telegramChatId) {
        tasks.push(sendTelegramMessage(user.telegramChatId, `${title}\n${body}`));
      }
      if (prefs.email && user.email) {
        tasks.push(sendEmail(user.email, title, html));
      }

      const results = await Promise.allSettled(tasks);
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value === true) sent++;
        else failed++;
      }
    })
  );

  logger.info(`dispatchOfferNotifications: sent=${sent} failed=${failed} offer=${offer._id}`);
  return { sent, failed };
};

export { dispatchOfferNotifications };

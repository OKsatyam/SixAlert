/**
 * telegram.js — Telegram Bot notification dispatcher.
 * Calls the Telegram Bot API sendMessage endpoint over HTTPS.
 * No extra package — uses Node's built-in https module.
 */
import https from 'https';
import logger from '../../utils/logger.js';

/**
 * POST to Telegram Bot API and resolve with parsed response body.
 * @param {string} botToken
 * @param {string} chatId
 * @param {string} text — supports Telegram MarkdownV2
 */
const callTelegramApi = (botToken, chatId, text) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, description: 'Invalid JSON response' }); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });

/**
 * Send a plain-text message to a Telegram chat.
 * @param {string} chatId  — Telegram chat_id (user or group)
 * @param {string} message — message text (plain, not MarkdownV2)
 * @returns {Promise<boolean>}
 */
const sendTelegramMessage = async (chatId, message) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    logger.warn('sendTelegramMessage: TELEGRAM_BOT_TOKEN not set — skipping');
    return false;
  }
  if (!chatId || !message) {
    logger.warn('sendTelegramMessage: chatId and message are required');
    return false;
  }

  try {
    // escape special MarkdownV2 chars in plain text so Telegram doesn't error
    const escaped = message.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
    const result = await callTelegramApi(process.env.TELEGRAM_BOT_TOKEN, chatId, escaped);
    if (!result.ok) {
      logger.error(`sendTelegramMessage: Telegram API error — ${result.description}`);
      return false;
    }
    return true;
  } catch (err) {
    logger.error(`sendTelegramMessage: ${err.message}`);
    return false;
  }
};

export { sendTelegramMessage, callTelegramApi };

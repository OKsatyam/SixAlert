/**
 * email.js — Email notification dispatcher via Resend.
 * Initialises Resend client on first use; sends transactional HTML emails.
 */
import { Resend } from 'resend';
import logger from '../../utils/logger.js';

let client = null;

const getClient = () => {
  if (client) return client;
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY must be set');
  }
  client = new Resend(process.env.RESEND_API_KEY);
  return client;
};

/**
 * Send a transactional email.
 * @param {string} to      — recipient email address
 * @param {string} subject — email subject line
 * @param {string} html    — HTML body content
 * @returns {Promise<boolean>}
 */
const sendEmail = async (to, subject, html) => {
  if (!to || !subject || !html) {
    logger.warn('sendEmail: to, subject, and html are required');
    return false;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    logger.warn('sendEmail: RESEND_FROM_EMAIL not set — skipping');
    return false;
  }

  // missing API key is a config error — throw rather than silently fail
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY must be set');
  }

  try {
    const resend = getClient();
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      logger.error(`sendEmail: Resend API error — ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    logger.error(`sendEmail: ${err.message}`);
    return false;
  }
};

// reset client for tests
const _resetForTest = () => { client = null; };

export { sendEmail, _resetForTest };

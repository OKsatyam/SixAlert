/**
 * Tests for Notification model — required fields, enum validation, defaults, and indexes.
 * Uses validateSync() so no live DB connection is needed.
 */
import mongoose from 'mongoose';
import Notification from '../../src/models/notification.js';

const ids = {
  user: new mongoose.Types.ObjectId(),
  offerTrigger: new mongoose.Types.ObjectId(),
};

const baseNotification = () => ({
  userId: ids.user,
  offerTriggerId: ids.offerTrigger,
  channel: 'webPush',
});

describe('Notification model', () => {
  describe('required fields', () => {
    ['userId', 'offerTriggerId', 'channel'].forEach((field) => {
      it(`fails validation when ${field} is missing`, () => {
        const data = baseNotification();
        delete data[field];
        expect(new Notification(data).validateSync().errors[field]).toBeDefined();
      });
    });

    it('passes validation with all required fields', () => {
      expect(new Notification(baseNotification()).validateSync()).toBeUndefined();
    });
  });

  describe('channel enum', () => {
    it.each(['webPush', 'telegram', 'email'])('accepts valid channel "%s"', (channel) => {
      expect(new Notification({ ...baseNotification(), channel }).validateSync()).toBeUndefined();
    });

    it('rejects an invalid channel', () => {
      const err = new Notification({ ...baseNotification(), channel: 'sms' }).validateSync();
      expect(err.errors.channel).toBeDefined();
    });
  });

  describe('status enum', () => {
    it('defaults to "pending"', () => {
      expect(new Notification(baseNotification()).status).toBe('pending');
    });

    it.each(['pending', 'sent', 'failed'])('accepts valid status "%s"', (status) => {
      expect(new Notification({ ...baseNotification(), status }).validateSync()).toBeUndefined();
    });

    it('rejects an invalid status', () => {
      const err = new Notification({ ...baseNotification(), status: 'delivered' }).validateSync();
      expect(err.errors.status).toBeDefined();
    });
  });

  describe('optional fields', () => {
    it('passes without sentAt or errorMessage', () => {
      expect(new Notification(baseNotification()).validateSync()).toBeUndefined();
    });

    it('accepts sentAt as a Date', () => {
      const n = new Notification({ ...baseNotification(), sentAt: new Date() });
      expect(n.sentAt).toBeInstanceOf(Date);
    });

    it('accepts an errorMessage string', () => {
      const n = new Notification({ ...baseNotification(), errorMessage: 'Telegram timeout' });
      expect(n.errorMessage).toBe('Telegram timeout');
    });
  });

  describe('indexes', () => {
    it('declares a compound index on userId + status', () => {
      const has = Notification.schema.indexes().some(
        ([fields]) => fields.userId === 1 && fields.status === 1
      );
      expect(has).toBe(true);
    });
  });
});

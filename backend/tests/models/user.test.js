/**
 * Tests for User model — required fields, role enum, defaults, and select:false enforcement.
 * Uses validateSync() so no live DB connection is needed.
 */
import User from '../../src/models/user.js';

const baseUser = () => ({
  email: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
});

describe('User model', () => {
  describe('required fields', () => {
    it('fails when email is missing', () => {
      const { email: _, ...rest } = baseUser();
      expect(new User(rest).validateSync().errors.email).toBeDefined();
    });

    it('fails when passwordHash is missing', () => {
      const { passwordHash: _, ...rest } = baseUser();
      expect(new User(rest).validateSync().errors.passwordHash).toBeDefined();
    });

    it('passes with email and passwordHash', () => {
      expect(new User(baseUser()).validateSync()).toBeUndefined();
    });
  });

  describe('email formatting', () => {
    it('lowercases the email automatically', () => {
      const user = new User({ ...baseUser(), email: 'TEST@EXAMPLE.COM' });
      expect(user.email).toBe('test@example.com');
    });

    it('trims whitespace from email', () => {
      const user = new User({ ...baseUser(), email: '  test@example.com  ' });
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('role enum', () => {
    it('defaults to "user"', () => {
      expect(new User(baseUser()).role).toBe('user');
    });

    it.each(['user', 'admin'])('accepts valid role "%s"', (role) => {
      expect(new User({ ...baseUser(), role }).validateSync()).toBeUndefined();
    });

    it('rejects an invalid role', () => {
      const err = new User({ ...baseUser(), role: 'superadmin' }).validateSync();
      expect(err.errors.role).toBeDefined();
    });
  });

  describe('notificationPreferences defaults', () => {
    it('sets all notification preferences to false by default', () => {
      const { notificationPreferences: prefs } = new User(baseUser());
      expect(prefs.webPush).toBe(false);
      expect(prefs.telegram).toBe(false);
      expect(prefs.email).toBe(false);
    });

    it('allows individual preferences to be enabled', () => {
      const user = new User({
        ...baseUser(),
        notificationPreferences: { webPush: true, telegram: false, email: true },
      });
      expect(user.notificationPreferences.webPush).toBe(true);
      expect(user.notificationPreferences.email).toBe(true);
    });
  });

  describe('defaults', () => {
    it('sets isActive to true by default', () => {
      expect(new User(baseUser()).isActive).toBe(true);
    });
  });

  describe('select:false on sensitive fields', () => {
    it('passwordHash has select:false on the schema', () => {
      expect(User.schema.paths.passwordHash.options.select).toBe(false);
    });

    it('pushSubscription has select:false on the schema', () => {
      expect(User.schema.paths.pushSubscription.options.select).toBe(false);
    });
  });
});

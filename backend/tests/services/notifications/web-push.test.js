/**
 * web-push.test.js — unit tests for sendPushNotification.
 * Mocks the web-push library; no real VAPID keys needed.
 */
import { jest } from '@jest/globals';

const mockSetVapidDetails = jest.fn();
const mockSendNotification = jest.fn();

jest.unstable_mockModule('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

const { sendPushNotification, _resetForTest } = await import('../../../src/services/notifications/web-push.js');

const VALID_SUB = { endpoint: 'https://fcm.googleapis.com/test', keys: { p256dh: 'a', auth: 'b' } };

beforeEach(() => {
  _resetForTest();
  jest.clearAllMocks();
  process.env.VAPID_PUBLIC_KEY = 'pub';
  process.env.VAPID_PRIVATE_KEY = 'priv';
  process.env.VAPID_SUBJECT = 'mailto:test@test.com';
});

afterEach(() => {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
});

describe('sendPushNotification', () => {
  test('returns true on success', async () => {
    mockSendNotification.mockResolvedValue({});
    const result = await sendPushNotification(VALID_SUB, { title: 'Six!', body: 'Swiggy 50% off' });
    expect(result).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledWith(VALID_SUB, expect.any(String));
  });

  test('initialises VAPID on first call', async () => {
    mockSendNotification.mockResolvedValue({});
    await sendPushNotification(VALID_SUB, { title: 'test' });
    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      'mailto:test@test.com', 'pub', 'priv'
    );
  });

  test('returns false when subscription missing endpoint', async () => {
    const result = await sendPushNotification({}, { title: 'test' });
    expect(result).toBe(false);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  test('returns "gone" on 410 status', async () => {
    const err = new Error('Gone');
    err.statusCode = 410;
    mockSendNotification.mockRejectedValue(err);
    const result = await sendPushNotification(VALID_SUB, { title: 'test' });
    expect(result).toBe('gone');
  });

  test('returns false on other send error', async () => {
    mockSendNotification.mockRejectedValue(new Error('Network error'));
    const result = await sendPushNotification(VALID_SUB, { title: 'test' });
    expect(result).toBe(false);
  });

  test('throws when VAPID env vars missing', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    await expect(sendPushNotification(VALID_SUB, {})).rejects.toThrow('VAPID');
  });
});

/**
 * dispatcher.test.js — unit tests for dispatchOfferNotifications.
 * Mocks all three channel senders and the User model.
 */
import { jest } from '@jest/globals';

const mockSendPush = jest.fn();
const mockSendTelegram = jest.fn();
const mockSendEmail = jest.fn();
const mockUserFind = jest.fn();

jest.unstable_mockModule('../../../src/services/notifications/web-push.js', () => ({
  sendPushNotification: mockSendPush,
}));
jest.unstable_mockModule('../../../src/services/notifications/telegram.js', () => ({
  sendTelegramMessage: mockSendTelegram,
}));
jest.unstable_mockModule('../../../src/services/notifications/email.js', () => ({
  sendEmail: mockSendEmail,
}));
jest.unstable_mockModule('../../../src/models/user.js', () => ({
  default: { find: mockUserFind },
}));

const { dispatchOfferNotifications } = await import('../../../src/services/notifications/dispatcher.js');

const OFFER = {
  _id: 'offer1',
  title: 'Six Deal',
  discountType: 'percent',
  discountValue: 50,
  brandId: { name: 'Swiggy' },
};

const makeTrigger = (offer = OFFER) => ({ offerId: offer });

beforeEach(() => {
  jest.clearAllMocks();
  // default: User.find returns chainable .select()
  mockUserFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
});

describe('dispatchOfferNotifications', () => {
  test('returns { sent:0, failed:0 } when no users found', async () => {
    const result = await dispatchOfferNotifications(makeTrigger());
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  test('returns { sent:0, failed:0 } when trigger has no offer', async () => {
    const result = await dispatchOfferNotifications({ offerId: null });
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  test('sends push to user with push enabled', async () => {
    const user = { notifications: { push: true }, pushSubscription: { endpoint: 'https://fcm/x' }, email: null, telegramChatId: null };
    mockUserFind.mockReturnValue({ select: jest.fn().mockResolvedValue([user]) });
    mockSendPush.mockResolvedValue(true);

    const result = await dispatchOfferNotifications(makeTrigger());
    expect(mockSendPush).toHaveBeenCalledWith(user.pushSubscription, expect.objectContaining({ title: expect.any(String) }));
    expect(result.sent).toBe(1);
  });

  test('sends telegram to user with telegram enabled', async () => {
    const user = { notifications: { telegram: true }, telegramChatId: '12345', email: null, pushSubscription: null };
    mockUserFind.mockReturnValue({ select: jest.fn().mockResolvedValue([user]) });
    mockSendTelegram.mockResolvedValue(true);

    const result = await dispatchOfferNotifications(makeTrigger());
    expect(mockSendTelegram).toHaveBeenCalledWith('12345', expect.any(String));
    expect(result.sent).toBe(1);
  });

  test('sends email to user with email enabled', async () => {
    const user = { notifications: { email: true }, email: 'user@test.com', pushSubscription: null, telegramChatId: null };
    mockUserFind.mockReturnValue({ select: jest.fn().mockResolvedValue([user]) });
    mockSendEmail.mockResolvedValue(true);

    const result = await dispatchOfferNotifications(makeTrigger());
    expect(mockSendEmail).toHaveBeenCalledWith('user@test.com', expect.any(String), expect.any(String));
    expect(result.sent).toBe(1);
  });

  test('counts failed when channel returns false', async () => {
    const user = { notifications: { push: true }, pushSubscription: { endpoint: 'https://fcm/x' }, email: null, telegramChatId: null };
    mockUserFind.mockReturnValue({ select: jest.fn().mockResolvedValue([user]) });
    mockSendPush.mockResolvedValue(false);

    const result = await dispatchOfferNotifications(makeTrigger());
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });

  test('sends all channels for user with all enabled', async () => {
    const user = {
      notifications: { push: true, telegram: true, email: true },
      pushSubscription: { endpoint: 'https://fcm/x' },
      telegramChatId: '12345',
      email: 'user@test.com',
    };
    mockUserFind.mockReturnValue({ select: jest.fn().mockResolvedValue([user]) });
    mockSendPush.mockResolvedValue(true);
    mockSendTelegram.mockResolvedValue(true);
    mockSendEmail.mockResolvedValue(true);

    const result = await dispatchOfferNotifications(makeTrigger());
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
  });
});

/**
 * telegram.test.js — unit tests for sendTelegramMessage.
 * Mocks the https module so no real HTTP calls are made.
 */
import { jest } from '@jest/globals';

const mockRequest = jest.fn();
jest.unstable_mockModule('https', () => ({
  default: { request: mockRequest },
}));

const { sendTelegramMessage } = await import('../../../src/services/notifications/telegram.js');

// helper: simulate https.request calling back with a fake response
const makeHttpsMock = (responseBody) => {
  mockRequest.mockImplementation((_options, callback) => {
    const res = {
      on: jest.fn((event, handler) => {
        if (event === 'data') handler(JSON.stringify(responseBody));
        if (event === 'end') handler();
      }),
    };
    callback(res);
    return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
  });
};

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  jest.clearAllMocks();
});

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe('sendTelegramMessage', () => {
  test('returns true when Telegram API responds ok: true', async () => {
    makeHttpsMock({ ok: true, result: {} });
    const result = await sendTelegramMessage('12345', 'Six hit! Get 50% off');
    expect(result).toBe(true);
  });

  test('returns false when Telegram API responds ok: false', async () => {
    makeHttpsMock({ ok: false, description: 'chat not found' });
    const result = await sendTelegramMessage('bad-id', 'test');
    expect(result).toBe(false);
  });

  test('returns false when TELEGRAM_BOT_TOKEN not set', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const result = await sendTelegramMessage('12345', 'test');
    expect(result).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test('returns false when chatId is empty', async () => {
    const result = await sendTelegramMessage('', 'test');
    expect(result).toBe(false);
  });

  test('returns false on network error', async () => {
    mockRequest.mockImplementation((_options, _callback) => {
      const req = { on: jest.fn(), write: jest.fn(), end: jest.fn() };
      // trigger error event asynchronously
      req.on.mockImplementation((event, handler) => {
        if (event === 'error') setTimeout(() => handler(new Error('ECONNREFUSED')), 0);
      });
      return req;
    });
    const result = await sendTelegramMessage('12345', 'test');
    expect(result).toBe(false);
  });
});

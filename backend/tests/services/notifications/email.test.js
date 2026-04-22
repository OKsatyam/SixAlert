/**
 * email.test.js — unit tests for sendEmail.
 * Mocks the Resend SDK; no real API calls made.
 */
import { jest } from '@jest/globals';

const mockSend = jest.fn();
jest.unstable_mockModule('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const { sendEmail, _resetForTest } = await import('../../../src/services/notifications/email.js');

beforeEach(() => {
  _resetForTest();
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'noreply@test.com';
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
});

describe('sendEmail', () => {
  test('returns true on successful send', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const result = await sendEmail('user@test.com', 'Six Alert!', '<p>50% off</p>');
    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@test.com',
      subject: 'Six Alert!',
      html: '<p>50% off</p>',
    });
  });

  test('returns false when Resend returns an error object', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });
    const result = await sendEmail('user@test.com', 'test', '<p>test</p>');
    expect(result).toBe(false);
  });

  test('returns false when required params missing', async () => {
    const result = await sendEmail('', 'subject', '<p>html</p>');
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('returns false when RESEND_FROM_EMAIL not set', async () => {
    delete process.env.RESEND_FROM_EMAIL;
    const result = await sendEmail('user@test.com', 'test', '<p>test</p>');
    expect(result).toBe(false);
  });

  test('throws when RESEND_API_KEY not set', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmail('user@test.com', 'test', '<p>test</p>')).rejects.toThrow('RESEND_API_KEY');
  });

  test('returns false on network/SDK exception', async () => {
    mockSend.mockRejectedValue(new Error('Network timeout'));
    const result = await sendEmail('user@test.com', 'test', '<p>test</p>');
    expect(result).toBe(false);
  });
});

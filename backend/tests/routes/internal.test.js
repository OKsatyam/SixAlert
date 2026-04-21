/**
 * Tests for internal.js route handler — 200, 400, and 500 cases.
 * Tests handleBallEvent directly with mock req/res objects so no HTTP
 * server or supertest dependency is needed.
 */
import { jest } from '@jest/globals';

jest.mock('../../src/services/offers/trigger-engine.js', () => ({
  processBallEvent: jest.fn(),
}));
jest.mock('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { handleBallEvent } from '../../src/routes/internal.js';
import { processBallEvent } from '../../src/services/offers/trigger-engine.js';

const makeReq = (body) => ({ body });
const makeRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const validBody = {
  match_id: 'cricapi-001',
  over: 3, ball: 2, runs: 6,
  is_six: true, is_four: false, is_wicket: false,
  source: 'api',
};

beforeEach(() => jest.clearAllMocks());

describe('POST /internal/ball-event', () => {
  describe('400 — bad request', () => {
    it('returns 400 when body is empty', async () => {
      const res = makeRes();
      await handleBallEvent(makeReq(null), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/match_id/);
    });

    it('returns 400 when match_id is missing from body', async () => {
      const res = makeRes();
      await handleBallEvent(makeReq({ over: 1 }), res);
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when engine throws a validation error', async () => {
      processBallEvent.mockRejectedValue(new Error('Missing required field: source'));
      const res = makeRes();
      await handleBallEvent(makeReq(validBody), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Missing required field/);
    });
  });

  describe('200 — success', () => {
    it('returns 200 with triggered count when engine succeeds', async () => {
      processBallEvent.mockResolvedValue([{ _id: 't1' }, { _id: 't2' }]);
      const res = makeRes();
      await handleBallEvent(makeReq(validBody), res);
      expect(res.statusCode).toBe(200);
      expect(res.body.triggered).toBe(2);
      expect(res.body.match_id).toBe('cricapi-001');
    });

    it('returns triggered: 0 when no offers fired (dot ball)', async () => {
      processBallEvent.mockResolvedValue([]);
      const res = makeRes();
      await handleBallEvent(makeReq({ ...validBody, is_six: false }), res);
      expect(res.statusCode).toBe(200);
      expect(res.body.triggered).toBe(0);
    });
  });

  describe('500 — engine error', () => {
    it('returns 500 when engine throws an unexpected error', async () => {
      processBallEvent.mockRejectedValue(new Error('DB connection lost'));
      const res = makeRes();
      await handleBallEvent(makeReq(validBody), res);
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });
});

/**
 * Tests for worker-auth middleware — 401, 403, and pass-through cases.
 * Uses plain objects for req/res — no HTTP server needed.
 */
import workerAuth from '../../src/middleware/worker-auth.js';

const VALID_SECRET = 'test-secret-abc123';

// minimal Express-like mock objects
const makeReq = (headerValue) => ({
  headers: headerValue !== undefined
    ? { 'x-worker-secret': headerValue }
    : {},
});

const makeRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

describe('workerAuth middleware', () => {
  let originalSecret;

  beforeEach(() => {
    originalSecret = process.env.WORKER_SECRET;
    process.env.WORKER_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    process.env.WORKER_SECRET = originalSecret;
  });

  describe('misconfiguration (403)', () => {
    it('returns 403 when WORKER_SECRET env var is not set', () => {
      delete process.env.WORKER_SECRET;
      const req = makeReq(VALID_SECRET);
      const res = makeRes();
      const next = jest.fn();

      workerAuth(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/misconfiguration/i);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('missing header (401)', () => {
    it('returns 401 when x-worker-secret header is absent', () => {
      const req = makeReq(undefined);
      const res = makeRes();
      const next = jest.fn();

      workerAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/missing/i);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('wrong secret (401)', () => {
    it('returns 401 when header value does not match WORKER_SECRET', () => {
      const req = makeReq('wrong-secret');
      const res = makeRes();
      const next = jest.fn();

      workerAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('valid secret', () => {
    it('calls next() when header matches WORKER_SECRET', () => {
      const req = makeReq(VALID_SECRET);
      const res = makeRes();
      const next = jest.fn();

      workerAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBeUndefined();
    });
  });
});

/**
 * Tests for ws-health.js — stats returned in dev, blocked in production.
 * Handler tested directly with mock req/res objects — no HTTP server needed.
 */
import { jest } from '@jest/globals';
import { createWsHealthRouter } from '../../src/routes/ws-health.js';

const makeRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const mockWsServer = {
  getStats: jest.fn().mockReturnValue({ totalConnections: 3, rooms: { 'match-1': 2, 'match-2': 1 } }),
};

const getHandler = () => {
  const router = createWsHealthRouter(mockWsServer);
  // extract the handler registered on GET /stats
  return router.stack[0].route.stack[0].handle;
};

describe('GET /ws/stats', () => {
  let originalEnv;
  beforeEach(() => { originalEnv = process.env.NODE_ENV; });
  afterEach(() => { process.env.NODE_ENV = originalEnv; jest.clearAllMocks(); });

  it('returns stats object in development', () => {
    process.env.NODE_ENV = 'development';
    const handler = getHandler();
    const res = makeRes();
    handler({}, res);
    expect(res.body).toEqual({ totalConnections: 3, rooms: { 'match-1': 2, 'match-2': 1 } });
    expect(res.statusCode).toBeUndefined(); // no explicit status = 200 default
  });

  it('returns 403 in production', () => {
    process.env.NODE_ENV = 'production';
    const handler = getHandler();
    const res = makeRes();
    handler({}, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/production/i);
  });

  it('calls wsServer.getStats() exactly once per request', () => {
    process.env.NODE_ENV = 'development';
    const handler = getHandler();
    handler({}, makeRes());
    expect(mockWsServer.getStats).toHaveBeenCalledTimes(1);
  });
});

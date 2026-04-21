/**
 * auth.test.js — unit tests for requireAuth and requireAdmin middleware.
 * Uses jsonwebtoken directly to mint tokens; no live server needed.
 */
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { requireAuth, requireAdmin } from '../../src/middleware/auth.js';

const SECRET = 'test-secret';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

// ── requireAuth ────────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  test('passes with valid Bearer token and attaches payload to req.user', () => {
    const payload = { id: 'user1', role: 'user' };
    const token = jwt.sign(payload, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('user1');
    expect(req.user.role).toBe('user');
  });

  test('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = mockRes();
    requireAuth(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  test('returns 401 when header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    requireAuth(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 with "Token expired" for expired tokens', () => {
    const token = jwt.sign({ id: 'u1' }, SECRET, { expiresIn: -1 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    requireAuth(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
  });

  test('returns 401 for a tampered token', () => {
    const req = { headers: { authorization: 'Bearer not.a.real.token' } };
    const res = mockRes();
    requireAuth(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  test('returns 500 when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ id: 'u1' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    requireAuth(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── requireAdmin ───────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  test('passes when req.user.role is admin', () => {
    const req = { user: { id: 'u1', role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 403 when role is user', () => {
    const req = { user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    requireAdmin(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 403 when req.user is absent', () => {
    const req = {};
    const res = mockRes();
    requireAdmin(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

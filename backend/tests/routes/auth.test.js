/**
 * auth.test.js — unit tests for POST /auth/register and POST /auth/login.
 * Uses jest.unstable_mockModule (ESM-safe) to mock User model and bcryptjs.
 */
import { jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
jest.unstable_mockModule('../../src/models/user.js', () => ({
  default: { findOne: mockFindOne, create: mockCreate },
}));

const mockHash = jest.fn();
const mockCompare = jest.fn();
jest.unstable_mockModule('bcryptjs', () => ({
  default: { hash: mockHash, compare: mockCompare },
}));

// dynamic imports MUST come after unstable_mockModule calls
const { default: authRouter } = await import('../../src/routes/auth.js');
const { default: jwt } = await import('jsonwebtoken');

const getHandler = (router, method, path) => {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  );
  return layer.route.stack[0].handle;
};

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  jest.clearAllMocks();
});

// ── POST /register ─────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  const register = getHandler(authRouter, 'post', '/register');

  test('creates user and returns 201 with token', async () => {
    mockFindOne.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed-pw');
    const fakeUser = { _id: 'uid1', name: 'Alice', email: 'alice@test.com', role: 'user' };
    mockCreate.mockResolvedValue(fakeUser);

    const req = { body: { name: 'Alice', email: 'Alice@Test.com', password: 'password123' } };
    const res = mockRes();
    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.token).toBeDefined();
    expect(jwt.verify(body.token, 'test-secret').id).toBe('uid1');
    expect(body.user.email).toBe('alice@test.com');
  });

  test('returns 400 when required fields are missing', async () => {
    const req = { body: { email: 'a@b.com' } };
    const res = mockRes();
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when password is too short', async () => {
    const req = { body: { name: 'A', email: 'a@b.com', password: 'short' } };
    const res = mockRes();
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 409 when email is already registered', async () => {
    mockFindOne.mockResolvedValue({ email: 'a@b.com' });
    const req = { body: { name: 'A', email: 'a@b.com', password: 'password123' } };
    const res = mockRes();
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

// ── POST /login ────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  const login = getHandler(authRouter, 'post', '/login');

  test('returns 200 with token on valid credentials', async () => {
    const fakeUser = { _id: 'uid1', name: 'Alice', email: 'alice@test.com', role: 'user', passwordHash: 'hashed' };
    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    mockCompare.mockResolvedValue(true);

    const req = { body: { email: 'alice@test.com', password: 'password123' } };
    const res = mockRes();
    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].token).toBeDefined();
  });

  test('returns 401 when user not found', async () => {
    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { body: { email: 'nobody@test.com', password: 'password123' } };
    const res = mockRes();
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 on wrong password', async () => {
    const fakeUser = { _id: 'uid1', email: 'a@b.com', passwordHash: 'hashed', role: 'user' };
    mockFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    mockCompare.mockResolvedValue(false);

    const req = { body: { email: 'a@b.com', password: 'wrongpass' } };
    const res = mockRes();
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 400 when fields are missing', async () => {
    const req = { body: { email: 'a@b.com' } };
    const res = mockRes();
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

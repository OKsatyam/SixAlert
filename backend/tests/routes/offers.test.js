/**
 * offers.test.js — unit tests for GET/POST/PUT/DELETE /offers.
 * Uses jest.unstable_mockModule (ESM-safe) to mock Offer model and auth middleware.
 */
import { jest } from '@jest/globals';

const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
jest.unstable_mockModule('../../src/models/offer.js', () => ({
  default: { find: mockFind, findById: mockFindById, create: mockCreate, findByIdAndUpdate: mockFindByIdAndUpdate, findByIdAndDelete: mockFindByIdAndDelete },
}));

// auth middleware — pass-through for all tests; individual tests override as needed
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  requireAuth: jest.fn((_req, _res, next) => next()),
  requireAdmin: jest.fn((_req, _res, next) => next()),
}));

const { default: offersRouter } = await import('../../src/routes/offers.js');

const getHandler = (router, method, path) => {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

// ── GET /offers ────────────────────────────────────────────────────────────────

describe('GET /offers', () => {
  const list = getHandler(offersRouter, 'get', '/');

  test('returns 200 with offer list', async () => {
    const fakeOffers = [{ _id: 'o1', title: '50% off' }];
    mockFind.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeOffers),
    });
    const req = { query: {} };
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 1, offers: fakeOffers });
  });

  test('filters by isActive=true', async () => {
    mockFind.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    const req = { query: { isActive: 'true' } };
    const res = mockRes();
    await list(req, res);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
  });
});

// ── GET /offers/:id ────────────────────────────────────────────────────────────

describe('GET /offers/:id', () => {
  const detail = getHandler(offersRouter, 'get', '/:id');

  test('returns 200 with offer when found', async () => {
    const fakeOffer = { _id: 'o1', title: '50% off' };
    // two chained .populate() calls then resolves
    const chain = { populate: jest.fn() };
    chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(fakeOffer);
    mockFindById.mockReturnValue(chain);

    const req = { params: { id: 'o1' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 404 when not found', async () => {
    const chain = { populate: jest.fn() };
    chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(null);
    mockFindById.mockReturnValue(chain);
    const req = { params: { id: 'o1' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── POST /offers ───────────────────────────────────────────────────────────────

describe('POST /offers', () => {
  const create = getHandler(offersRouter, 'post', '/');

  test('creates offer and returns 201', async () => {
    mockCreate.mockResolvedValue({ _id: 'o1', title: '50% off' });
    const req = { body: { title: '50% off' }, user: { role: 'admin' } };
    const res = mockRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('returns 400 on Mongoose ValidationError', async () => {
    const err = new Error('Validation failed');
    err.name = 'ValidationError';
    mockCreate.mockRejectedValue(err);
    const req = { body: {}, user: { role: 'admin' } };
    const res = mockRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ── DELETE /offers/:id ─────────────────────────────────────────────────────────

describe('DELETE /offers/:id', () => {
  const del = getHandler(offersRouter, 'delete', '/:id');

  test('returns 200 when deleted', async () => {
    mockFindByIdAndDelete.mockResolvedValue({ _id: 'o1' });
    const req = { params: { id: 'o1' }, user: { role: 'admin' } };
    const res = mockRes();
    await del(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 404 when not found', async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);
    const req = { params: { id: 'ghost' }, user: { role: 'admin' } };
    const res = mockRes();
    await del(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

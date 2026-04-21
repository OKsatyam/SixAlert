/**
 * brands.test.js — unit tests for GET /brands and GET /brands/:id.
 * Uses jest.unstable_mockModule (ESM-safe) to mock Brand model.
 */
import { jest } from '@jest/globals';

const mockFind = jest.fn();
const mockFindById = jest.fn();
jest.unstable_mockModule('../../src/models/brand.js', () => ({
  default: { find: mockFind, findById: mockFindById },
}));

const { default: brandsRouter } = await import('../../src/routes/brands.js');

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

beforeEach(() => jest.clearAllMocks());

describe('GET /brands', () => {
  const list = getHandler(brandsRouter, 'get', '/');

  test('returns 200 with brands array', async () => {
    const fakeBrands = [{ _id: 'b1', name: 'Swiggy' }];
    mockFind.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeBrands),
    });
    const req = { query: {} };
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 1, brands: fakeBrands });
  });

  test('returns 500 on DB error', async () => {
    mockFind.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const req = { query: {} };
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('GET /brands/:id', () => {
  const detail = getHandler(brandsRouter, 'get', '/:id');

  test('returns 200 with brand when found', async () => {
    const fakeBrand = { _id: 'b1', name: 'Swiggy' };
    mockFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeBrand) });
    const req = { params: { id: 'b1' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 404 when not found', async () => {
    mockFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const req = { params: { id: 'ghost' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 400 on invalid ObjectId', async () => {
    const castError = new Error('Cast');
    castError.name = 'CastError';
    mockFindById.mockReturnValue({ populate: jest.fn().mockRejectedValue(castError) });
    const req = { params: { id: 'bad-id' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

/**
 * sports.test.js — unit tests for GET /sports and GET /sports/:id.
 * Uses jest.unstable_mockModule (ESM-safe) to mock Sport model.
 */
import { jest } from '@jest/globals';

const mockFind = jest.fn();
const mockFindById = jest.fn();
jest.unstable_mockModule('../../src/models/sport.js', () => ({
  default: { find: mockFind, findById: mockFindById },
}));

const { default: sportsRouter } = await import('../../src/routes/sports.js');

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

describe('GET /sports', () => {
  const list = getHandler(sportsRouter, 'get', '/');

  test('returns 200 with sports array', async () => {
    const fakeSports = [{ _id: 's1', name: 'Cricket', slug: 'cricket' }];
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeSports),
    });
    const req = {};
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 1, sports: fakeSports });
  });

  test('returns 500 on DB error', async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const req = {};
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('GET /sports/:id', () => {
  const detail = getHandler(sportsRouter, 'get', '/:id');

  test('returns 200 with sport when found', async () => {
    mockFindById.mockResolvedValue({ _id: 's1', name: 'Cricket' });
    const req = { params: { id: 's1' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 404 when not found', async () => {
    mockFindById.mockResolvedValue(null);
    const req = { params: { id: 'ghost' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 400 on invalid ObjectId', async () => {
    const castError = new Error('Cast');
    castError.name = 'CastError';
    mockFindById.mockRejectedValue(castError);
    const req = { params: { id: 'bad-id' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

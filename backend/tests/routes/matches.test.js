/**
 * matches.test.js — unit tests for GET /matches and GET /matches/:id.
 * Uses jest.unstable_mockModule (ESM-safe) to mock Match model.
 */
import { jest } from '@jest/globals';

const mockFind = jest.fn();
const mockFindById = jest.fn();
jest.unstable_mockModule('../../src/models/match.js', () => ({
  default: { find: mockFind, findById: mockFindById },
}));

const { default: matchesRouter } = await import('../../src/routes/matches.js');

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

const buildChain = (result) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue(result),
});

beforeEach(() => jest.clearAllMocks());

// ── GET /matches ───────────────────────────────────────────────────────────────

describe('GET /matches', () => {
  const list = getHandler(matchesRouter, 'get', '/');

  test('returns 200 with array of matches', async () => {
    const fakeMatches = [{ _id: 'm1', name: 'IND vs AUS' }];
    mockFind.mockReturnValue(buildChain(fakeMatches));

    const req = { query: {} };
    const res = mockRes();
    await list(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 1, matches: fakeMatches });
  });

  test('applies status filter when query param provided', async () => {
    mockFind.mockReturnValue(buildChain([]));
    const req = { query: { status: 'live' } };
    const res = mockRes();
    await list(req, res);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'live' }));
  });

  test('returns 500 on DB error', async () => {
    mockFind.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('DB down')),
    });
    const req = { query: {} };
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── GET /matches/:id ───────────────────────────────────────────────────────────

describe('GET /matches/:id', () => {
  const detail = getHandler(matchesRouter, 'get', '/:id');

  test('returns 200 with match when found', async () => {
    const fakeMatch = { _id: 'm1', name: 'IND vs AUS' };
    mockFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeMatch) });

    const req = { params: { id: 'm1' } };
    const res = mockRes();
    await detail(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ match: fakeMatch });
  });

  test('returns 404 when match not found', async () => {
    mockFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const req = { params: { id: 'nonexistent' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 400 on invalid ObjectId format', async () => {
    const castError = new Error('Cast error');
    castError.name = 'CastError';
    mockFindById.mockReturnValue({ populate: jest.fn().mockRejectedValue(castError) });

    const req = { params: { id: 'not-an-id' } };
    const res = mockRes();
    await detail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

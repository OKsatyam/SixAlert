/**
 * admin/logs.test.js — unit tests for GET /admin/logs.
 */
import { jest } from '@jest/globals';

const mockFind = jest.fn();
jest.unstable_mockModule('../../../src/models/data-source-log.js', () => ({
  default: { find: mockFind },
}));

const { default: logsRouter } = await import('../../../src/routes/admin/logs.js');

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

describe('GET /admin/logs', () => {
  const list = getHandler(logsRouter, 'get', '/');

  test('returns 200 with log list', async () => {
    const fakeLogs = [{ _id: 'l1', layer: 1, status: 'success' }];
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeLogs),
    });
    const req = { query: {} };
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 1, logs: fakeLogs });
  });

  test('applies layer filter', async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    const req = { query: { layer: '2' } };
    const res = mockRes();
    await list(req, res);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ layer: 2 }));
  });

  test('applies status filter', async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    const req = { query: { status: 'error' } };
    const res = mockRes();
    await list(req, res);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  test('applies date range filter', async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    const req = { query: { from: '2026-01-01', to: '2026-04-01' } };
    const res = mockRes();
    await list(req, res);
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) } })
    );
  });

  test('returns 500 on DB error', async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const req = { query: {} };
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

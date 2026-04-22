/**
 * admin/users.test.js — unit tests for admin user management routes.
 */
import { jest } from '@jest/globals';

const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();

jest.unstable_mockModule('../../../src/models/user.js', () => ({
  default: {
    find: mockFind,
    countDocuments: mockCountDocuments,
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findByIdAndDelete: mockFindByIdAndDelete,
  },
}));

const { default: adminUsersRouter } = await import('../../../src/routes/admin/users.js');

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

// ── GET /admin/users ───────────────────────────────────────────────────────────

describe('GET /admin/users', () => {
  const list = getHandler(adminUsersRouter, 'get', '/');

  test('returns 200 with paginated users', async () => {
    const fakeUsers = [{ _id: 'u1', name: 'Alice', role: 'user' }];
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(fakeUsers),
    });
    mockCountDocuments.mockResolvedValue(1);

    const req = { query: {} };
    const res = mockRes();
    await list(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ total: 1, page: 1, users: fakeUsers });
  });

  test('returns 500 on DB error', async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    mockCountDocuments.mockResolvedValue(0);
    const req = { query: {} };
    const res = mockRes();
    await list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── PUT /admin/users/:id/role ──────────────────────────────────────────────────

describe('PUT /admin/users/:id/role', () => {
  const update = getHandler(adminUsersRouter, 'put', '/:id/role');

  test('returns 200 with updated user on valid role', async () => {
    const fakeUser = { _id: 'u1', role: 'admin' };
    mockFindByIdAndUpdate.mockResolvedValue(fakeUser);
    const req = { params: { id: 'u1' }, body: { role: 'admin' } };
    const res = mockRes();
    await update(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 on invalid role', async () => {
    const req = { params: { id: 'u1' }, body: { role: 'superuser' } };
    const res = mockRes();
    await update(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when user not found', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    const req = { params: { id: 'ghost' }, body: { role: 'user' } };
    const res = mockRes();
    await update(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── DELETE /admin/users/:id ────────────────────────────────────────────────────

describe('DELETE /admin/users/:id', () => {
  const del = getHandler(adminUsersRouter, 'delete', '/:id');

  test('returns 200 when user deleted', async () => {
    mockFindByIdAndDelete.mockResolvedValue({ _id: 'u2' });
    const req = { params: { id: 'u2' }, user: { id: 'admin1' } };
    const res = mockRes();
    await del(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 when admin tries to delete themselves', async () => {
    const req = { params: { id: 'admin1' }, user: { id: 'admin1' } };
    const res = mockRes();
    await del(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFindByIdAndDelete).not.toHaveBeenCalled();
  });

  test('returns 404 when user not found', async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);
    const req = { params: { id: 'ghost' }, user: { id: 'admin1' } };
    const res = mockRes();
    await del(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

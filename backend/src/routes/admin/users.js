/**
 * admin/users.js — admin-only routes for user management.
 * GET    /admin/users           → paginated user list
 * PUT    /admin/users/:id/role  → update a user's role (user | admin)
 * DELETE /admin/users/:id       → delete a user account
 */
import { Router } from 'express';
import User from '../../models/user.js';

const LIST_LIMIT = 50;
const VALID_ROLES = ['user', 'admin'];

const router = Router();

// GET /admin/users?page=1
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * LIST_LIMIT;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(LIST_LIMIT),
      User.countDocuments(),
    ]);

    return res.status(200).json({ total, page, users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /admin/users/:id/role
router.put('/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid user ID format' });
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /admin/users/:id
router.delete('/:id', async (req, res) => {
  // prevent admin from deleting themselves
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid user ID format' });
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

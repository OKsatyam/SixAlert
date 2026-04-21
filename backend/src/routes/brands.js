/**
 * brands.js — public REST routes for Brand listings.
 * GET /brands      → all active brands
 * GET /brands/:id  → single brand by ID
 */
import { Router } from 'express';
import Brand from '../models/brand.js';

const LIST_LIMIT = 50;

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const brands = await Brand.find(filter)
      .populate('sport', 'name slug')
      .sort({ name: 1 })
      .limit(LIST_LIMIT);

    return res.status(200).json({ count: brands.length, brands });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id).populate('sport', 'name slug');
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    return res.status(200).json({ brand });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid brand ID format' });
    return res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

export default router;

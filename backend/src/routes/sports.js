/**
 * sports.js — public REST routes for Sport listings.
 * GET /sports      → all sports
 * GET /sports/:id  → single sport by ID
 */
import { Router } from 'express';
import Sport from '../models/sport.js';

const LIST_LIMIT = 50;

const router = Router();

router.get('/', async (req, res) => {
  try {
    const sports = await Sport.find()
      .sort({ name: 1 })
      .limit(LIST_LIMIT);
    return res.status(200).json({ count: sports.length, sports });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sports' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) return res.status(404).json({ error: 'Sport not found' });
    return res.status(200).json({ sport });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid sport ID format' });
    return res.status(500).json({ error: 'Failed to fetch sport' });
  }
});

export default router;

/**
 * matches.js — public REST routes for Match data.
 * GET /matches        → list matches (filterable by status, sport)
 * GET /matches/:id    → single match by MongoDB _id
 */
import { Router } from 'express';
import Match from '../models/match.js';

// cap list results — no unbounded queries on free-tier Atlas
const LIST_LIMIT = 50;

const router = Router();

// GET /matches?status=live&sport=<sportId>
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.sport) filter.sport = req.query.sport;

    const matches = await Match.find(filter)
      .populate('sport', 'name slug')
      .sort({ startTime: -1 })
      .limit(LIST_LIMIT);

    return res.status(200).json({ count: matches.length, matches });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// GET /matches/:id
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate('sport', 'name slug');
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    return res.status(200).json({ match });
  } catch (err) {
    // CastError means the :id wasn't a valid ObjectId
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid match ID format' });
    }
    return res.status(500).json({ error: 'Failed to fetch match' });
  }
});

export default router;

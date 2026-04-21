/**
 * offers.js — REST routes for Offer management.
 * Public:  GET /offers, GET /offers/:id
 * Admin:   POST /offers, PUT /offers/:id, DELETE /offers/:id
 */
import { Router } from 'express';
import Offer from '../models/offer.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const LIST_LIMIT = 50;

const router = Router();

// GET /offers?sport=<id>&triggerEvent=SIX&isActive=true
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.sport) filter.sportId = req.query.sport;
    if (req.query.triggerEvent) filter.triggerEvent = req.query.triggerEvent;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const offers = await Offer.find(filter)
      .populate('sportId', 'name slug')
      .populate('brandId', 'name logoUrl')
      .sort({ createdAt: -1 })
      .limit(LIST_LIMIT);

    return res.status(200).json({ count: offers.length, offers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// GET /offers/:id
router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('sportId', 'name slug')
      .populate('brandId', 'name logoUrl');
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    return res.status(200).json({ offer });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid offer ID format' });
    return res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

// POST /offers — admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const offer = await Offer.create(req.body);
    return res.status(201).json({ offer });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to create offer' });
  }
});

// PUT /offers/:id — admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,        // return updated document
      runValidators: true,
    });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    return res.status(200).json({ offer });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid offer ID format' });
    return res.status(500).json({ error: 'Failed to update offer' });
  }
});

// DELETE /offers/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    return res.status(200).json({ message: 'Offer deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid offer ID format' });
    return res.status(500).json({ error: 'Failed to delete offer' });
  }
});

export default router;

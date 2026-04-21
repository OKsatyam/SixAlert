/**
 * internal.js — Express routes for worker-to-backend communication.
 * Mounted at /internal in index.js, behind workerAuth middleware.
 * Not exposed publicly — only the Python worker calls these endpoints.
 */
import { Router } from 'express';
import { processBallEvent } from '../services/offers/trigger-engine.js';
import logger from '../utils/logger.js';

const router = Router();

// exported separately so tests can invoke it directly without an HTTP server
export const handleBallEvent = async (req, res) => {
  const ballEvent = req.body;

  if (!ballEvent || !ballEvent.match_id) {
    return res.status(400).json({ error: 'Request body must include match_id' });
  }

  try {
    const triggers = await processBallEvent(ballEvent);
    return res.status(200).json({
      triggered: triggers.length,
      match_id: ballEvent.match_id,
    });
  } catch (err) {
    // validation errors from the engine are the caller's fault → 400
    if (err.message.startsWith('Missing required field')) {
      return res.status(400).json({ error: err.message });
    }
    logger.error(`POST /internal/ball-event: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

router.post('/ball-event', handleBallEvent);

export default router;

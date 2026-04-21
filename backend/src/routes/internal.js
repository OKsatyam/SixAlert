/**
 * internal.js — Express routes for worker-to-backend communication.
 * Mounted at /internal in index.js, behind workerAuth middleware.
 * wsServer is injected via createInternalRouter() so the route can broadcast
 * WebSocket events without importing a global singleton.
 */
import { Router } from 'express';
import { processBallEvent } from '../services/offers/trigger-engine.js';
import logger from '../utils/logger.js';

// wsServer param allows the route to broadcast without a global import
const createInternalRouter = (wsServer = null) => {
  const router = Router();

  const handleBallEvent = async (req, res) => {
    const ballEvent = req.body;
    if (!ballEvent || !ballEvent.match_id) {
      return res.status(400).json({ error: 'Request body must include match_id' });
    }
    try {
      const triggers = await processBallEvent(ballEvent, wsServer);
      return res.status(200).json({ triggered: triggers.length, match_id: ballEvent.match_id });
    } catch (err) {
      if (err.message.startsWith('Missing required field')) {
        return res.status(400).json({ error: err.message });
      }
      logger.error(`POST /internal/ball-event: ${err.message}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  router.post('/ball-event', handleBallEvent);
  return router;
};

export { createInternalRouter };

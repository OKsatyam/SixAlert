/**
 * ws-health.js — WebSocket stats endpoint.
 * GET /ws/stats returns connection counts per match room.
 * In production, restricted to requests with a valid admin JWT (Phase 6 will
 * replace the NODE_ENV check with a real auth middleware).
 * In development/test, open to any request for easier debugging.
 */
import { Router } from 'express';

const createWsHealthRouter = (wsServer) => {
  const router = Router();

  router.get('/stats', (req, res) => {
    // temporary guard until Phase 6 admin JWT middleware is wired in
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Stats endpoint is not available in production until admin auth is wired (Phase 6)',
      });
    }
    return res.json(wsServer.getStats());
  });

  return router;
};

export { createWsHealthRouter };

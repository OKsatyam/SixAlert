/**
 * admin/logs.js — admin-only route for viewing DataSourceLog entries.
 * GET /admin/logs?layer=1&status=error&from=ISO&to=ISO
 */
import { Router } from 'express';
import DataSourceLog from '../../models/data-source-log.js';

const LIST_LIMIT = 100;

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.layer) filter.layer = parseInt(req.query.layer);
    if (req.query.status) filter.status = req.query.status;

    // date range filter on createdAt
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const logs = await DataSourceLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(LIST_LIMIT);

    return res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;

/**
 * worker-auth.js — Express middleware that authenticates requests from the Python worker.
 * Validates the X-Worker-Secret header against the WORKER_SECRET environment variable.
 * Returns 403 on misconfiguration (secret not set), 401 on missing or wrong header.
 */

const WORKER_SECRET_HEADER = 'x-worker-secret';

/**
 * Middleware to authenticate internal requests from the Python worker.
 * Must be applied to all /internal/* routes before any route handler runs.
 */
const workerAuth = (req, res, next) => {
  // 403 = server misconfiguration — WORKER_SECRET must always be set in production
  if (!process.env.WORKER_SECRET) {
    return res.status(403).json({
      error: 'Server misconfiguration: WORKER_SECRET is not set',
    });
  }

  const provided = req.headers[WORKER_SECRET_HEADER];

  if (!provided) {
    return res.status(401).json({
      error: `Missing required header: ${WORKER_SECRET_HEADER}`,
    });
  }

  if (provided !== process.env.WORKER_SECRET) {
    return res.status(401).json({
      error: 'Invalid worker secret',
    });
  }

  next();
};

export default workerAuth;

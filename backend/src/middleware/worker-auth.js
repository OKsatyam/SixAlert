/**
 * worker-auth.js — Express middleware that authenticates requests from the Python worker.
 * Validates the X-Worker-Secret header against the WORKER_SECRET environment variable.
 */

const WORKER_SECRET_HEADER = 'x-worker-secret';

const workerAuth = (req, res, next) => {
  if (!process.env.WORKER_SECRET) {
    return res.status(403).json({ error: 'Server misconfiguration: WORKER_SECRET is not set' });
  }
  const provided = req.headers[WORKER_SECRET_HEADER];
  if (!provided) {
    return res.status(401).json({ error: `Missing required header: ${WORKER_SECRET_HEADER}` });
  }
  if (provided !== process.env.WORKER_SECRET) {
    return res.status(401).json({ error: 'Invalid worker secret' });
  }
  next();
};

export default workerAuth;

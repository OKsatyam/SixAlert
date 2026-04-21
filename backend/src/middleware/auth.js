/**
 * auth.js — JWT verification middleware for protected routes.
 * Attaches decoded payload to req.user on success.
 * requireAdmin checks that req.user.role === 'admin' (must run after requireAuth).
 */
import jwt from 'jsonwebtoken';

const requireAuth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice(7); // strip "Bearer "
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is not set' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    // distinguish expired tokens so clients know to re-login vs. bad token
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export { requireAuth, requireAdmin };

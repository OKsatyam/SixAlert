/**
 * index.js — Express + WebSocket server entry point for SixAlert backend.
 * Creates an http.Server so ws can share the same port as Express.
 * wsServer instance is injected into the internal router so the trigger
 * engine can broadcast events without a global import.
 */
import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './config/db.js';
import workerAuth from './middleware/worker-auth.js';
import { createInternalRouter } from './routes/internal.js';
import { createWsHealthRouter } from './routes/ws-health.js';
import WebSocketServer from './services/events/ws-server.js';
import logger from './utils/logger.js';
import authRouter from './routes/auth.js';
import matchesRouter from './routes/matches.js';
import offersRouter from './routes/offers.js';
import brandsRouter from './routes/brands.js';
import sportsRouter from './routes/sports.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import adminUsersRouter from './routes/admin/users.js';
import adminLogsRouter from './routes/admin/logs.js';

const PORT = process.env.PORT || 4000;

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sixalert-backend' });
});

// public REST routes
app.use('/auth', authRouter);
app.use('/matches', matchesRouter);
app.use('/offers', offersRouter);
app.use('/brands', brandsRouter);
app.use('/sports', sportsRouter);

// admin routes — JWT required + admin role
app.use('/admin/users', requireAuth, requireAdmin, adminUsersRouter);
app.use('/admin/logs', requireAuth, requireAdmin, adminLogsRouter);

// 404 handler — must come after all routes
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const startServer = async () => {
  await connectDB();

  // http.createServer so ws and Express share the same port
  const server = http.createServer(app);
  const wsServer = new WebSocketServer(server);

  // inject wsServer into internal router so ball events trigger broadcasts
  app.use('/internal', workerAuth, createInternalRouter(wsServer));
  app.use('/ws', createWsHealthRouter(wsServer));

  server.listen(PORT, () => {
    logger.info(`SixAlert backend running on port ${PORT}`);
  });

  return { server, wsServer };
};

startServer().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

export default app;

/**
 * index.js — Express app entry point for the SixAlert backend.
 * Sets up global middleware, mounts all routers, connects to MongoDB,
 * and starts the HTTP server.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './config/db.js';
import workerAuth from './middleware/worker-auth.js';
import internalRouter from './routes/internal.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 4000;

const app = express();

// security headers — must come before routes
app.use(helmet());

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(morgan('dev'));
app.use(express.json());

// internal worker endpoints — authenticated by shared secret, not JWT
// workerAuth is applied at the router level so it only guards /internal/*
app.use('/internal', workerAuth, internalRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sixalert-backend' });
});

// 404 handler — must be after all routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`SixAlert backend running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

export default app;

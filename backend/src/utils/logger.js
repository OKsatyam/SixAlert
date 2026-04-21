/**
 * logger.js — minimal structured logger for the SixAlert backend.
 * Wraps console methods with ISO timestamp and level prefix.
 * Swap for winston or pino in Phase 10 if structured log ingestion is needed.
 */

const ts = () => new Date().toISOString();

const logger = {
  info: (msg) => console.info(`[${ts()}] INFO  ${msg}`),
  warn: (msg) => console.warn(`[${ts()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${ts()}] ERROR ${msg}`),
};

export default logger;

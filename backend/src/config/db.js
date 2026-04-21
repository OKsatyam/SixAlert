/**
 * db.js — MongoDB connection using Mongoose.
 * Retries 3 times on startup because Atlas free tier (M0) has cold-start delays.
 * Call connectDB() once at server startup; Mongoose re-uses the connection pool.
 */
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// retry 3 times because Atlas free tier has cold-start delays of up to ~30s
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri);
      logger.info(`MongoDB connected (attempt ${attempt})`);
      return;
    } catch (err) {
      lastError = err;
      logger.warn(`MongoDB connect attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw lastError;
};

export default connectDB;

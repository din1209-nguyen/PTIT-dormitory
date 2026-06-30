import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

export function getDatabaseStatus(): 'up' | 'down' {
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}

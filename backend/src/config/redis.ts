import Redis from 'ioredis';
import { config } from './env';

export const redisConnection = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully for BullMQ and Rate Limiting');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

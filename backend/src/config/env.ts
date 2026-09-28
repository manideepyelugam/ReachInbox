import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  
  // Database
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/reachinbox_scheduler?schema=public'),
  
  // Redis & BullMQ
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional(),
  
  // Elasticsearch
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  ELASTICSEARCH_INDEX: z.string().default('email_jobs'),
  
  // Scheduler configs
  WORKER_CONCURRENCY: z.string().default('5').transform((val) => parseInt(val, 10)),
  MIN_EMAIL_DELAY_MS: z.string().default('2000').transform((val) => parseInt(val, 10)),
  DEFAULT_MAX_EMAILS_PER_HOUR: z.string().default('50').transform((val) => parseInt(val, 10)),
  
  // Auth
  JWT_SECRET: z.string().default('reachinbox_development_jwt_secret_key_2026'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Slack OAuth
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5000/api/slack/callback'),
  
  // BullMQ Dashboard
  BULL_BOARD_PATH: z.string().default('/admin/queues'),
});

export const config = envSchema.parse(process.env);

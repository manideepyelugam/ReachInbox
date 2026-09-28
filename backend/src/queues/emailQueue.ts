import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface IEmailJobPayload {
  emailJobId: string;
  userId: string;
  senderAccountId: string;
  recipientEmail: string;
  subject: string;
}

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<IEmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs in Redis for 24h
      count: 5000,
    },
    removeOnFail: {
      age: 86400 * 7, // Keep failed jobs for 7 days
    },
  },
});

/**
 * Enqueue an email to be sent at a specific target time using BullMQ delayed jobs (NO CRON).
 * Idempotency is enforced by using a deterministic jobId: `email_job_${emailJobId}`.
 */
export async function enqueueEmailJob(payload: IEmailJobPayload, scheduledAt: Date) {
  const now = Date.now();
  const targetTime = new Date(scheduledAt).getTime();
  const delay = Math.max(0, targetTime - now);

  const jobId = `email_job_${payload.emailJobId}`;

  const job = await emailQueue.add('send_email', payload, {
    delay,
    jobId,
  });

  return job;
}

/**
 * Cancel / remove a scheduled email job from BullMQ.
 */
export async function removeScheduledJob(jobId: string) {
  const formattedJobId = jobId.startsWith('email_job_') ? jobId : `email_job_${jobId}`;
  const job = await emailQueue.getJob(formattedJobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

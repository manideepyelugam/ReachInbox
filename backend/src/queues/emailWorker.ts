import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { EMAIL_QUEUE_NAME, IEmailJobPayload, emailQueue } from './emailQueue';
import { sendEmailWithEthereal } from '../services/etherealService';
import { checkAndIncrementRateLimit } from '../services/rateLimitService';
import { updateEmailStatusInEs } from '../services/elasticsearchService';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function initEmailWorker() {
  const worker = new Worker<IEmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<IEmailJobPayload>) => {
      const { emailJobId } = job.data;
      console.log(`\n📨 [Worker] Processing email job ${emailJobId} (Job ID: ${job.id})`);

      // 1. Fetch EmailJob from PostgreSQL
      const emailRecord = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: { senderAccount: true, user: true },
      });

      if (!emailRecord) {
        console.warn(`⚠️ [Worker] Email job ${emailJobId} not found in database. Skipping.`);
        return { status: 'skipped_not_found' };
      }

      // 2. Strict Idempotency Check: Don't send if already marked SENT
      if (emailRecord.status === 'SENT') {
        console.log(`ℹ️ [Worker] Email job ${emailJobId} is already marked as SENT. Skipping to prevent duplicate.`);
        return { status: 'already_sent', previewUrl: emailRecord.previewUrl };
      }

      const sender = emailRecord.senderAccount;
      if (!sender || !sender.isActive) {
        throw new Error(`Sender account ${emailRecord.senderAccountId} is inactive or missing`);
      }

      // 3. Hourly Rate Limit Verification via Redis
      const rateLimitCheck = await checkAndIncrementRateLimit(
        sender.id,
        emailRecord.userId,
        sender.email,
        sender.hourlyLimit || config.DEFAULT_MAX_EMAILS_PER_HOUR
      );

      if (!rateLimitCheck.allowed) {
        console.warn(
          `🚫 [Rate Limit Reached] Sender ${sender.email} hit limit (${rateLimitCheck.currentCount}/${sender.hourlyLimit}). Rescheduling in ${Math.round(
            (rateLimitCheck.rescheduleDelayMs || 60000) / 1000
          )}s`
        );

        // Update DB status to RATE_LIMITED
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: { status: 'RATE_LIMITED' },
        });

        await updateEmailStatusInEs(emailJobId, { status: 'RATE_LIMITED' });

        // Reschedule job to next available hour window preserving order
        const rescheduleDelay = rateLimitCheck.rescheduleDelayMs || 60000;
        await emailQueue.add('send_email', job.data, {
          delay: rescheduleDelay,
          jobId: `email_job_${emailJobId}_retry_${Date.now()}`,
        });

        return {
          status: 'rescheduled_rate_limited',
          nextAttemptAt: rateLimitCheck.nextWindowTime,
        };
      }

      // 4. Inter-Email Throttle Delay (Provider Anti-Spam protection)
      const interEmailDelay = config.MIN_EMAIL_DELAY_MS;
      if (interEmailDelay > 0) {
        await sleep(interEmailDelay);
      }

      // 5. Update status to PROCESSING
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'PROCESSING' },
      });

      try {
        // 6. Send Email via Fake SMTP (Ethereal Email)
        const sendResult = await sendEmailWithEthereal({
          smtpConfig: {
            host: sender.smtpHost,
            port: sender.smtpPort,
            user: sender.smtpUser,
            pass: sender.smtpPass,
            fromName: sender.name || undefined,
            fromEmail: sender.email,
          },
          to: emailRecord.recipientEmail,
          subject: emailRecord.subject,
          text: emailRecord.bodyText,
          html: emailRecord.bodyHtml || undefined,
        });

        // 7. Update PostgreSQL on Success
        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            previewUrl: sendResult.previewUrl,
            errorMessage: null,
          },
        });

        // 8. Update Elasticsearch Index
        await updateEmailStatusInEs(emailJobId, {
          status: 'SENT',
          sentAt: updatedJob.sentAt?.toISOString(),
          previewUrl: sendResult.previewUrl,
        });

        console.log(`✅ [Worker] Email sent to ${emailRecord.recipientEmail}`);
        if (sendResult.previewUrl) {
          console.log(`🔗 [Ethereal Preview URL] ${sendResult.previewUrl}`);
        }

        return {
          status: 'sent',
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (sendError: any) {
        console.error(`❌ [Worker] Failed to send email ${emailJobId}:`, sendError.message);

        // Update DB on Failure
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: sendError.message,
            retryCount: { increment: 1 },
          },
        });

        await updateEmailStatusInEs(emailJobId, {
          status: 'FAILED',
          errorMessage: sendError.message,
        });

        throw sendError;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`🎉 Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log(`⚡ BullMQ Email Worker active with concurrency=${config.WORKER_CONCURRENCY}`);
  return worker;
}

import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { sendSlackRateLimitNotification } from './slackService';

export interface IRateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  rescheduleDelayMs?: number;
  nextWindowTime?: Date;
}

/**
 * Returns current UTC hour key, e.g. "2026-09-28-13"
 */
export function getCurrentHourKey(date: Date = new Date()): { key: string; windowStart: Date; nextWindowStart: Date } {
  const windowStart = new Date(date);
  windowStart.setMinutes(0, 0, 0);

  const nextWindowStart = new Date(windowStart);
  nextWindowStart.setHours(nextWindowStart.getHours() + 1);

  const year = windowStart.getUTCFullYear();
  const month = String(windowStart.getUTCMonth() + 1).padStart(2, '0');
  const day = String(windowStart.getUTCDate()).padStart(2, '0');
  const hour = String(windowStart.getUTCHours()).padStart(2, '0');

  return {
    key: `${year}-${month}-${day}-${hour}`,
    windowStart,
    nextWindowStart,
  };
}

/**
 * Atomic Redis-backed Hourly Rate Limiter per sender account.
 * Safe across multi-instance worker processes.
 */
export async function checkAndIncrementRateLimit(
  senderAccountId: string,
  userId: string,
  senderEmail: string,
  hourlyLimit: number
): Promise<IRateLimitResult> {
  const { key, windowStart, nextWindowStart } = getCurrentHourKey();
  const redisKey = `ratelimit:sender:${senderAccountId}:${key}`;
  const alertKey = `ratelimit:slack_alert_sent:${senderAccountId}:${key}`;

  // Atomic increment with TTL
  const count = await redisConnection.incr(redisKey);
  if (count === 1) {
    // Set 2 hour expiry on first increment
    await redisConnection.expire(redisKey, 7200);
  }

  if (count <= hourlyLimit) {
    return {
      allowed: true,
      currentCount: count,
      limit: hourlyLimit,
    };
  }

  // Rate limit exceeded: calculate delay until next hour window
  const now = Date.now();
  const rescheduleDelayMs = Math.max(1000, nextWindowStart.getTime() - now);

  // Trigger Slack alert once per hour window for this sender
  const alreadyAlerted = await redisConnection.set(alertKey, 'true', 'EX', 7200, 'NX');
  if (alreadyAlerted === 'OK') {
    // Record rate limit log in DB asynchronously
    prisma.rateLimitLog
      .upsert({
        where: {
          senderAccountId_hourWindow: {
            senderAccountId,
            hourWindow: windowStart,
          },
        },
        update: {
          count,
          triggeredSlackAlert: true,
        },
        create: {
          senderAccountId,
          hourWindow: windowStart,
          count,
          triggeredSlackAlert: true,
        },
      })
      .catch((err) => console.error('[RateLimitLog DB Error]', err));

    // Send Live Slack Notification
    sendSlackRateLimitNotification({
      userId,
      senderEmail,
      limit: hourlyLimit,
      currentCount: count,
      nextWindowStart,
    }).catch((err) => console.error('[Slack Alert Error]', err));
  }

  return {
    allowed: false,
    currentCount: count,
    limit: hourlyLimit,
    rescheduleDelayMs,
    nextWindowTime: nextWindowStart,
  };
}

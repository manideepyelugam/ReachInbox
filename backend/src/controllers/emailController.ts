import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { enqueueEmailJob, removeScheduledJob } from '../queues/emailQueue';
import { indexEmailJob } from '../services/elasticsearchService';
import { createEtherealAccount } from '../services/etherealService';
import { config } from '../config/env';

/**
 * Schedule a single email job
 */
export async function scheduleEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const {
      recipientEmail,
      subject,
      bodyText,
      bodyHtml,
      senderAccountId,
      scheduledAt,
    } = req.body;

    // Verify sender account
    let sender = await prisma.senderAccount.findFirst({
      where: { id: senderAccountId, userId },
    });

    if (!sender) {
      // Fallback to first active sender
      sender = await prisma.senderAccount.findFirst({
        where: { userId, isActive: true },
      });
      if (!sender) {
        return res.status(400).json({ error: 'No active sender account found. Please create or connect one.' });
      }
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();

    // 1. Create EmailJob in PostgreSQL
    const emailJob = await prisma.emailJob.create({
      data: {
        userId,
        senderAccountId: sender.id,
        recipientEmail,
        subject,
        bodyText,
        bodyHtml,
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
      },
      include: { senderAccount: true },
    });

    // 2. Enqueue into BullMQ with delay
    const bullJob = await enqueueEmailJob(
      {
        emailJobId: emailJob.id,
        userId,
        senderAccountId: sender.id,
        recipientEmail,
        subject,
      },
      scheduledDate
    );

    // Save bullJobId
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullJobId: bullJob.id },
    });

    // 3. Index to Elasticsearch
    await indexEmailJob({
      id: emailJob.id,
      userId,
      senderAccountId: sender.id,
      senderEmail: sender.email,
      recipientEmail,
      subject,
      bodyText,
      status: 'SCHEDULED',
      scheduledAt: scheduledDate.toISOString(),
      createdAt: emailJob.createdAt.toISOString(),
    });

    return res.status(201).json({
      message: 'Email scheduled successfully',
      emailJob,
      bullJobId: bullJob.id,
    });
  } catch (error: any) {
    console.error('Schedule single email error:', error);
    return res.status(500).json({ error: 'Failed to schedule email', message: error.message });
  }
}

/**
 * Schedule bulk emails from CSV / lead list with staggered intervals and rate limit settings
 */
export async function scheduleBulkEmails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const {
      leads, // Array of { email: string, name?: string, metadata?: any } or array of strings
      subject,
      bodyText,
      bodyHtml,
      senderAccountId,
      startTime,
      delayBetweenEmailsSeconds = 2,
      hourlyLimit,
    } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'At least one recipient lead is required' });
    }

    let sender = await prisma.senderAccount.findFirst({
      where: { id: senderAccountId, userId },
    });

    if (!sender) {
      sender = await prisma.senderAccount.findFirst({
        where: { userId, isActive: true },
      });
      if (!sender) {
        return res.status(400).json({ error: 'No active sender account found.' });
      }
    }

    if (hourlyLimit && hourlyLimit > 0) {
      await prisma.senderAccount.update({
        where: { id: sender.id },
        data: { hourlyLimit: parseInt(String(hourlyLimit), 10) },
      });
    }

    const startTimestamp = startTime ? new Date(startTime).getTime() : Date.now();
    const intervalMs = Math.max(0, (delayBetweenEmailsSeconds || 2) * 1000);

    const createdJobs = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const recipientEmail = typeof lead === 'string' ? lead.trim() : lead.email?.trim();
      if (!recipientEmail || !recipientEmail.includes('@')) continue;

      const scheduledDate = new Date(startTimestamp + i * intervalMs);

      // Personalize body if lead name provided
      let personalizedBodyText = bodyText;
      let personalizedSubject = subject;
      if (typeof lead === 'object' && lead.name) {
        personalizedBodyText = personalizedBodyText.replace(/{{name}}/g, lead.name);
        personalizedSubject = personalizedSubject.replace(/{{name}}/g, lead.name);
      }

      // 1. Create DB record
      const emailJob = await prisma.emailJob.create({
        data: {
          userId,
          senderAccountId: sender.id,
          recipientEmail,
          subject: personalizedSubject,
          bodyText: personalizedBodyText,
          bodyHtml,
          status: 'SCHEDULED',
          scheduledAt: scheduledDate,
          metadata: typeof lead === 'object' ? lead.metadata : undefined,
        },
      });

      // 2. Enqueue BullMQ delayed job
      const bullJob = await enqueueEmailJob(
        {
          emailJobId: emailJob.id,
          userId,
          senderAccountId: sender.id,
          recipientEmail,
          subject: personalizedSubject,
        },
        scheduledDate
      );

      await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: { bullJobId: bullJob.id },
      });

      // 3. Index to Elasticsearch
      await indexEmailJob({
        id: emailJob.id,
        userId,
        senderAccountId: sender.id,
        senderEmail: sender.email,
        recipientEmail,
        subject: personalizedSubject,
        bodyText: personalizedBodyText,
        status: 'SCHEDULED',
        scheduledAt: scheduledDate.toISOString(),
        createdAt: emailJob.createdAt.toISOString(),
      });

      createdJobs.push(emailJob);
    }

    return res.status(201).json({
      message: `Successfully scheduled ${createdJobs.length} emails`,
      count: createdJobs.length,
      firstScheduledAt: new Date(startTimestamp),
      lastScheduledAt: new Date(startTimestamp + (createdJobs.length - 1) * intervalMs),
      jobs: createdJobs.slice(0, 10), // return sample
    });
  } catch (error: any) {
    console.error('Schedule bulk emails error:', error);
    return res.status(500).json({ error: 'Failed to schedule bulk emails', message: error.message });
  }
}

/**
 * Get scheduled emails (SCHEDULED, RATE_LIMITED, PROCESSING)
 */
export async function getScheduledEmails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const skip = (page - 1) * limit;

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({
        where: {
          userId,
          status: { in: ['SCHEDULED', 'RATE_LIMITED', 'PROCESSING', 'PENDING'] },
        },
      }),
      prisma.emailJob.findMany({
        where: {
          userId,
          status: { in: ['SCHEDULED', 'RATE_LIMITED', 'PROCESSING', 'PENDING'] },
        },
        include: { senderAccount: true },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch scheduled emails', message: error.message });
  }
}

/**
 * Get sent / completed emails (SENT, FAILED)
 */
export async function getSentEmails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const skip = (page - 1) * limit;

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({
        where: {
          userId,
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
      prisma.emailJob.findMany({
        where: {
          userId,
          status: { in: ['SENT', 'FAILED'] },
        },
        include: { senderAccount: true },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch sent emails', message: error.message });
  }
}

/**
 * Cancel a scheduled email
 */
export async function cancelScheduledEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const emailJob = await prisma.emailJob.findFirst({
      where: { id, userId },
    });

    if (!emailJob) {
      return res.status(404).json({ error: 'Email job not found' });
    }

    if (emailJob.status === 'SENT') {
      return res.status(400).json({ error: 'Cannot cancel an email that has already been sent' });
    }

    if (emailJob.bullJobId) {
      await removeScheduledJob(emailJob.bullJobId);
    }

    await prisma.emailJob.delete({ where: { id } });

    return res.status(200).json({ message: 'Scheduled email cancelled successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to cancel email', message: error.message });
  }
}

/**
 * Get sender accounts
 */
export async function getSenders(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const senders = await prisma.senderAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ senders });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch sender accounts', message: error.message });
  }
}

/**
 * Create a new dynamic Ethereal Test Sender Account
 */
export async function createTestSender(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const eth = await createEtherealAccount();

    const sender = await prisma.senderAccount.create({
      data: {
        userId,
        email: eth.user,
        name: `Ethereal Sender (${eth.user.split('@')[0]})`,
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: eth.user,
        smtpPass: eth.pass,
        hourlyLimit: config.DEFAULT_MAX_EMAILS_PER_HOUR,
        isActive: true,
      },
    });

    return res.status(201).json({ sender });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create Ethereal sender', message: error.message });
  }
}

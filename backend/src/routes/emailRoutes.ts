import { Router } from 'express';
import {
  scheduleEmail,
  scheduleBulkEmails,
  getScheduledEmails,
  getSentEmails,
  cancelScheduledEmail,
  getSenders,
  createTestSender,
} from '../controllers/emailController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const scheduleEmailSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  bodyText: z.string().min(1, 'Body text is required'),
  bodyHtml: z.string().optional(),
  senderAccountId: z.string().optional(),
  scheduledAt: z.string().optional(),
});

const scheduleBulkSchema = z.object({
  leads: z.array(z.any()).min(1, 'At least one lead is required'),
  subject: z.string().min(1, 'Subject is required'),
  bodyText: z.string().min(1, 'Body text is required'),
  bodyHtml: z.string().optional(),
  senderAccountId: z.string().optional(),
  startTime: z.string().optional(),
  delayBetweenEmailsSeconds: z.number().optional().default(2),
  hourlyLimit: z.number().optional(),
});

router.post('/schedule', authenticate, validate(scheduleEmailSchema), scheduleEmail);
router.post('/bulk', authenticate, validate(scheduleBulkSchema), scheduleBulkEmails);
router.get('/scheduled', authenticate, getScheduledEmails);
router.get('/sent', authenticate, getSentEmails);
router.delete('/:id', authenticate, cancelScheduledEmail);
router.get('/senders', authenticate, getSenders);
router.post('/senders/create-test', authenticate, createTestSender);

export default router;

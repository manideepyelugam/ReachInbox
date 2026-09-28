import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
  getSlackAuthUrl,
  exchangeSlackOAuthCode,
  disconnectSlack,
  sendSlackRateLimitNotification,
} from '../services/slackService';
import { prisma } from '../config/db';
import { config } from '../config/env';

/**
 * Get Slack OAuth Connect URL
 */
export async function getAuthUrl(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const url = getSlackAuthUrl(userId);
    return res.status(200).json({ url });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate Slack OAuth URL', message: error.message });
  }
}

/**
 * Slack OAuth Redirect Callback
 */
export async function handleOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${config.CLIENT_URL}?slack_error=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect(`${config.CLIENT_URL}?slack_error=missing_code`);
    }

    const userId = (state as string) || '';
    if (!userId) {
      return res.redirect(`${config.CLIENT_URL}?slack_error=invalid_state`);
    }

    await exchangeSlackOAuthCode(String(code), userId);

    return res.redirect(`${config.CLIENT_URL}?slack_connected=true`);
  } catch (err: any) {
    console.error('Slack OAuth Callback Error:', err);
    return res.redirect(`${config.CLIENT_URL}?slack_error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Get Slack Connection Status
 */
export async function getStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    return res.status(200).json({
      connected: !!integration?.isActive,
      teamName: integration?.teamName || null,
      channelName: integration?.channelName || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get Slack status', message: error.message });
  }
}

/**
 * Disconnect Slack
 */
export async function disconnect(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    await disconnectSlack(userId);
    return res.status(200).json({ message: 'Slack disconnected successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to disconnect Slack', message: error.message });
  }
}

/**
 * Send Test Slack Rate Limit Alert (for live demo & testing)
 */
export async function sendTestAlert(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const sender = await prisma.senderAccount.findFirst({
      where: { userId, isActive: true },
    });

    const senderEmail = sender?.email || 'sales@reachinbox.ai';
    const limit = sender?.hourlyLimit || 50;

    const nextWindow = new Date();
    nextWindow.setHours(nextWindow.getHours() + 1);
    nextWindow.setMinutes(0, 0, 0);

    await sendSlackRateLimitNotification({
      userId,
      senderEmail,
      limit,
      currentCount: limit + 1,
      nextWindowStart: nextWindow,
    });

    return res.status(200).json({ message: 'Test Slack alert dispatched' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to dispatch test Slack alert', message: error.message });
  }
}

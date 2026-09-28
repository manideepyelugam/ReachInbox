import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config/env';

export interface ISlackNotificationParams {
  userId: string;
  senderEmail: string;
  limit: number;
  currentCount: number;
  nextWindowStart: Date;
}

/**
 * Generate Slack OAuth 2.0 authorization URL
 */
export function getSlackAuthUrl(state: string = ''): string {
  const clientId = config.SLACK_CLIENT_ID;
  if (!clientId) {
    return '#';
  }

  const redirectUri = encodeURIComponent(config.SLACK_REDIRECT_URI);
  const scopes = encodeURIComponent('incoming-webhook,chat:write,chat:write.public');
  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}`;
}

/**
 * Exchange OAuth temporary code for Access Token & Webhook URL
 */
export async function exchangeSlackOAuthCode(code: string, userId: string) {
  if (!config.SLACK_CLIENT_ID || !config.SLACK_CLIENT_SECRET) {
    throw new Error('Slack OAuth credentials (SLACK_CLIENT_ID, SLACK_CLIENT_SECRET) are not configured.');
  }

  const response = await axios.post(
    'https://slack.com/api/oauth.v2.access',
    new URLSearchParams({
      client_id: config.SLACK_CLIENT_ID,
      client_secret: config.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: config.SLACK_REDIRECT_URI,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const data = response.data;
  if (!data.ok) {
    throw new Error(data.error || 'Failed to exchange Slack OAuth code');
  }

  const integration = await prisma.slackIntegration.upsert({
    where: { userId },
    update: {
      teamId: data.team?.id || '',
      teamName: data.team?.name || '',
      channelId: data.incoming_webhook?.channel_id || '',
      channelName: data.incoming_webhook?.channel || '',
      incomingWebhookUrl: data.incoming_webhook?.url || null,
      accessToken: data.access_token || '',
      scope: data.scope || '',
      isActive: true,
    },
    create: {
      userId,
      teamId: data.team?.id || '',
      teamName: data.team?.name || '',
      channelId: data.incoming_webhook?.channel_id || '',
      channelName: data.incoming_webhook?.channel || '',
      incomingWebhookUrl: data.incoming_webhook?.url || null,
      accessToken: data.access_token || '',
      scope: data.scope || '',
      isActive: true,
    },
  });

  return integration;
}

/**
 * Disconnect Slack Integration for a user
 */
export async function disconnectSlack(userId: string) {
  const existing = await prisma.slackIntegration.findUnique({ where: { userId } });
  if (existing) {
    await prisma.slackIntegration.delete({ where: { userId } });
    return true;
  }
  return false;
}

/**
 * Send Live Slack Notification when rate limit is reached
 */
export async function sendSlackRateLimitNotification(params: ISlackNotificationParams) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { userId: params.userId },
  });

  if (!integration || !integration.isActive) {
    // If user hasn't connected Slack, rate-limit hits gracefully do not notify
    return;
  }

  const nextWindowFormatted = params.nextWindowStart.toUTCString();

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⚠️ ReachInbox Hourly Rate Limit Reached',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Sender Account:* \`${params.senderEmail}\`\n*Hourly Limit:* ${params.limit} emails/hour\n*Current Volume:* ${params.currentCount} emails triggered`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚡ *Status:* Active jobs are *not dropped*. Excess jobs are automatically staggered and rescheduled for the next window at *${nextWindowFormatted}*.`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `ReachInbox Distributed Scheduler • ${new Date().toISOString()}`,
        },
      ],
    },
  ];

  try {
    if (integration.incomingWebhookUrl) {
      await axios.post(integration.incomingWebhookUrl, {
        text: `⚠️ Rate limit reached for sender ${params.senderEmail} (${params.limit}/hr)`,
        blocks,
      });
      console.log(`📣 [Slack Notification Sent] Sent to webhook for user ${params.userId}`);
    } else if (integration.accessToken && integration.channelId) {
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: integration.channelId,
          text: `⚠️ Rate limit reached for sender ${params.senderEmail} (${params.limit}/hr)`,
          blocks,
        },
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
          },
        }
      );
      console.log(`📣 [Slack Notification Sent] Sent to channel ${integration.channelId}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to dispatch Slack notification:', error?.response?.data || error.message);
  }
}

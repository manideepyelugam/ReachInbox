export type EmailStatus = 'PENDING' | 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';

export interface ISenderAccount {
  id: string;
  userId: string;
  email: string;
  name?: string | null;
  smtpHost: string;
  smtpPort: number;
  hourlyLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface IUser {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  senderAccounts?: ISenderAccount[];
  isSlackConnected?: boolean;
  slackChannel?: string | null;
  slackTeam?: string | null;
}

export interface IEmailJob {
  id: string;
  userId: string;
  senderAccountId: string;
  senderAccount?: ISenderAccount;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  bullJobId?: string | null;
  previewUrl?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface ILead {
  email: string;
  name?: string;
  company?: string;
  [key: string]: any;
}

import axios from 'axios';
import { IEmailJob, ISenderAccount, IUser } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export async function getMe(): Promise<{ user: IUser }> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function loginWithDemo(): Promise<{ token: string; user: IUser }> {
  const res = await api.post('/auth/demo');
  return res.data;
}

export async function loginWithGoogleCredential(credential: string): Promise<{ token: string; user: IUser }> {
  const res = await api.post('/auth/google', { credential });
  return res.data;
}

// Email & Scheduling APIs
export async function scheduleEmail(data: {
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  senderAccountId?: string;
  scheduledAt?: string;
}): Promise<{ message: string; emailJob: IEmailJob }> {
  const res = await api.post('/emails/schedule', data);
  return res.data;
}

export async function scheduleBulkEmails(data: {
  leads: Array<{ email: string; name?: string }>;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  senderAccountId?: string;
  startTime?: string;
  delayBetweenEmailsSeconds?: number;
  hourlyLimit?: number;
}): Promise<{ message: string; count: number; jobs: IEmailJob[] }> {
  const res = await api.post('/emails/bulk', data);
  return res.data;
}

export async function getScheduledEmails(page = 1, limit = 50): Promise<{ total: number; emails: IEmailJob[] }> {
  const res = await api.get(`/emails/scheduled?page=${page}&limit=${limit}`);
  return res.data;
}

export async function getSentEmails(page = 1, limit = 50): Promise<{ total: number; emails: IEmailJob[] }> {
  const res = await api.get(`/emails/sent?page=${page}&limit=${limit}`);
  return res.data;
}

export async function cancelScheduledEmail(id: string): Promise<{ message: string }> {
  const res = await api.delete(`/emails/${id}`);
  return res.data;
}

export async function getSenders(): Promise<{ senders: ISenderAccount[] }> {
  const res = await api.get('/emails/senders');
  return res.data;
}

export async function createTestSender(): Promise<{ sender: ISenderAccount }> {
  const res = await api.post('/emails/senders/create-test');
  return res.data;
}

// Search API (Elasticsearch)
export async function searchEmails(query: string, status?: string): Promise<{ total: number; hits: IEmailJob[] }> {
  const res = await api.get('/search', {
    params: { q: query, status },
  });
  return res.data;
}

// Slack APIs
export async function getSlackAuthUrl(): Promise<{ url: string }> {
  const res = await api.get('/slack/auth-url');
  return res.data;
}

export async function getSlackStatus(): Promise<{ connected: boolean; teamName?: string; channelName?: string }> {
  const res = await api.get('/slack/status');
  return res.data;
}

export async function disconnectSlack(): Promise<{ message: string }> {
  const res = await api.post('/slack/disconnect');
  return res.data;
}

export async function sendTestSlackAlert(): Promise<{ message: string }> {
  const res = await api.post('/slack/test-alert');
  return res.data;
}

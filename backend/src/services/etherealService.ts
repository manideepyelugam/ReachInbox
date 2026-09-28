import nodemailer, { Transporter } from 'nodemailer';

export interface ISmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName?: string;
  fromEmail: string;
}

export interface ISendEmailParams {
  smtpConfig: ISmtpConfig;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface ISendEmailResult {
  messageId: string;
  previewUrl: string | null;
  accepted: string[];
  rejected: string[];
}

// In-memory cache for transporters to avoid creating new connections on every single email
const transporterCache = new Map<string, Transporter>();

export function getTransporter(config: ISmtpConfig): Transporter {
  const cacheKey = `${config.host}:${config.port}:${config.user}`;
  let transporter = transporterCache.get(cacheKey);

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    transporterCache.set(cacheKey, transporter);
  }

  return transporter;
}

export async function sendEmailWithEthereal(params: ISendEmailParams): Promise<ISendEmailResult> {
  const transporter = getTransporter(params.smtpConfig);

  const from = params.smtpConfig.fromName
    ? `"${params.smtpConfig.fromName}" <${params.smtpConfig.fromEmail}>`
    : params.smtpConfig.fromEmail;

  const info = await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html || `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>${params.text.replace(/\n/g, '<br/>')}</p></div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
    accepted: (info.accepted as string[]) || [],
    rejected: (info.rejected as string[]) || [],
  };
}

export async function createEtherealAccount() {
  const account = await nodemailer.createTestAccount();
  return {
    user: account.user,
    pass: account.pass,
    smtp: account.smtp,
    imap: account.imap,
    pop3: account.pop3,
    web: account.web,
  };
}

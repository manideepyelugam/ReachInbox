import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { AuthenticatedRequest } from '../middlewares/auth';
import { createEtherealAccount } from '../services/etherealService';

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export async function googleLogin(req: Request, res: Response) {
  try {
    const { credential, email, name, picture } = req.body;

    let userEmail = email;
    let userName = name;
    let userAvatar = picture;
    let googleId: string | undefined;

    // Verify Google ID Token if credential provided
    if (credential && config.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload) {
          userEmail = payload.email;
          userName = payload.name;
          userAvatar = payload.picture;
          googleId = payload.sub;
        }
      } catch (err: any) {
        console.warn('Google token verification failed, falling back to payload values:', err.message);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Email is required for authentication' });
    }

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: userName || undefined,
        avatarUrl: userAvatar || undefined,
        googleId: googleId || undefined,
      },
      create: {
        email: userEmail,
        name: userName || 'ReachInbox User',
        avatarUrl: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`,
        googleId,
      },
      include: {
        senderAccounts: true,
        slackIntegration: true,
      },
    });

    // If user has no sender accounts, automatically configure an Ethereal SMTP test sender
    if (user.senderAccounts.length === 0) {
      try {
        const eth = await createEtherealAccount();
        await prisma.senderAccount.create({
          data: {
            userId: user.id,
            email: eth.user,
            name: `${user.name || 'Outreach'} (Ethereal)`,
            smtpHost: 'smtp.ethereal.email',
            smtpPort: 587,
            smtpUser: eth.user,
            smtpPass: eth.pass,
            hourlyLimit: config.DEFAULT_MAX_EMAILS_PER_HOUR,
            isActive: true,
          },
        });
      } catch (ethError) {
        console.error('Failed to auto-create Ethereal account on login:', ethError);
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Authentication failed', message: error.message });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        senderAccounts: { where: { isActive: true } },
        slackIntegration: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        senderAccounts: user.senderAccounts,
        isSlackConnected: !!user.slackIntegration?.isActive,
        slackChannel: user.slackIntegration?.channelName,
        slackTeam: user.slackIntegration?.teamName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
}

export async function demoLogin(req: Request, res: Response) {
  try {
    let user = await prisma.user.findFirst({
      where: { email: 'demo@reachinbox.ai' },
      include: { senderAccounts: true, slackIntegration: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@reachinbox.ai',
          name: 'Demo Candidate',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        include: { senderAccounts: true, slackIntegration: true },
      });
    }

    if (user.senderAccounts.length === 0) {
      const eth = await createEtherealAccount();
      await prisma.senderAccount.create({
        data: {
          userId: user.id,
          email: eth.user,
          name: 'ReachInbox Demo Sender',
          smtpHost: 'smtp.ethereal.email',
          smtpPort: 587,
          smtpUser: eth.user,
          smtpPass: eth.pass,
          hourlyLimit: config.DEFAULT_MAX_EMAILS_PER_HOUR,
          isActive: true,
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Demo login failed', message: error.message });
  }
}

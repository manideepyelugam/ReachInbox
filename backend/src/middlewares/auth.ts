import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        id: string;
        email: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        };
        return next();
      }
    } catch (err) {
      // Invalid JWT token
    }
  }

  // Development fallback: automatically use or create default demo user
  try {
    let demoUser = await prisma.user.findFirst({
      where: { email: 'demo@reachinbox.ai' },
    });

    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          email: 'demo@reachinbox.ai',
          name: 'ReachInbox Demo User',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
      });
    }

    req.user = {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      avatarUrl: demoUser.avatarUrl,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

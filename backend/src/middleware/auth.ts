import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { getDatabase } from '../utils/database';
import config from '../config';
import logger from '../utils/logger';
import type { JWTPayload, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      isService?: boolean;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Look up the role on every request so suspensions take effect immediately.
    const db = getDatabase();
    const user = await db('users').where({ id: payload.id }).select('id', 'email', 'role').first();

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    if (user.role === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
    next();
  } catch (error) {
    logger.error({ error }, 'Token verification failed');
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Accepts either a normal user JWT or the shared automation token used by n8n.
 * Service requests are trusted to act on any user's resources.
 */
export async function serviceOrUserAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token && config.apiToken && token === config.apiToken) {
    req.isService = true;
    next();
    return;
  }

  await authMiddleware(req, res, next);
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      req.user = payload;
    }
    next();
  } catch (error) {
    logger.warn({ error }, 'Optional token verification failed, continuing without auth');
    next();
  }
}

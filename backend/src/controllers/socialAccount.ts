import { Request, Response, NextFunction } from 'express';
import * as socialService from '../services/socialAccount';
import { AppError } from '../middleware/error';

export async function connectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { platform, accessToken, refreshToken, expiresAt, accountDetails } = req.body;

    const account = await socialService.connectSocialAccount(req.user.id, platform, accessToken, refreshToken, expiresAt ? new Date(expiresAt) : undefined, accountDetails);

    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
}

export async function getConnectedAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const accounts = await socialService.getConnectedAccounts(req.user.id);
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
}

export async function disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { accountId } = req.params;
    await socialService.deleteConnectedAccount(req.user.id, accountId);

    res.json({ message: 'Account disconnected' });
  } catch (error) {
    next(error);
  }
}

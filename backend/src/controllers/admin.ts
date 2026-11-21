import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin';
import { AppError } from '../middleware/error';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const result = await adminService.listUsers(page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { userId } = req.params;
    await adminService.suspendUser(userId, req.user.id);
    res.json({ message: 'User suspended' });
  } catch (error) {
    next(error);
  }
}

export async function unsuspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params;
    await adminService.unsuspendUser(userId);
    res.json({ message: 'User unsuspended' });
  } catch (error) {
    next(error);
  }
}

export async function getPublishLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const result = await adminService.getPublishLogs(page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function retryPublish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { logId } = req.params;
    const result = await adminService.retryPublish(logId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

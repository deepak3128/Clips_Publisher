import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import logger from '../utils/logger';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err: ApiError | Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ error: err }, 'Request failed');

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Endpoint not found' });
}

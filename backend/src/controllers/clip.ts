import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import fsp from 'fs/promises';
import path from 'path';
import * as clipService from '../services/clip';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import type { ClipSettings } from '../services/clip';

export const validateClipUrl = [
  body('url').isString().trim().notEmpty().withMessage('A video URL is required'),
];

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function parseSettings(source: Record<string, any>): Partial<ClipSettings> {
  const settings: Partial<ClipSettings> = {};

  if (source.clipCount !== undefined) {
    settings.clipCount = parseInt(String(source.clipCount), 10);
  }
  if (source.font) settings.font = String(source.font);
  if (source.fontSize !== undefined) settings.fontSize = parseInt(String(source.fontSize), 10);
  if (source.fontColor) settings.fontColor = String(source.fontColor);
  if (source.bold !== undefined) settings.bold = parseBoolean(source.bold, true);
  if (source.italic !== undefined) settings.italic = parseBoolean(source.italic, false);
  if (source.position === 'top' || source.position === 'bottom') {
    settings.position = source.position;
  }
  if (source.autoCaptions !== undefined) {
    settings.autoCaptions = parseBoolean(source.autoCaptions, true);
  }
  if (source.captionText) settings.captionText = String(source.captionText);

  return settings;
}

export async function createFromUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    if (!req.file) {
      throw new AppError('A video file is required', 400);
    }

    // Keep source uploads outside the publicly served clips directory.
    const dir = path.resolve(process.cwd(), '.clip-uploads');
    await fsp.mkdir(dir, { recursive: true });

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(dir, `${Date.now()}-${safeName}`);
    await fsp.writeFile(filePath, req.file.buffer);

    const job = await clipService.createClipJob(
      req.user.id,
      { type: 'upload', value: filePath, fileName: req.file.originalname },
      parseSettings(req.body),
    );

    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
}

export async function createFromUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const url = String(req.body.url).trim();
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new AppError('Invalid video URL', 400);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new AppError('Only http(s) video URLs are supported', 400);
    }

    const type = /youtube\.com|youtu\.be/i.test(parsed.hostname) ? 'youtube' : 'url';
    const job = await clipService.createClipJob(
      req.user.id,
      { type, value: url },
      parseSettings(req.body),
    );

    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
}

export async function listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    const jobs = await clipService.listClipJobs(req.user.id);
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
}

export async function getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    const job = await clipService.getClipJob(req.user.id, req.params.jobId);
    res.json({ job });
  } catch (error) {
    next(error);
  }
}

export async function getClips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    const clips = await clipService.getClips(req.user.id, req.params.jobId);
    res.json({ clips });
  } catch (error) {
    next(error);
  }
}

export async function publishClip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const platform = req.body.platform;
    if (platform !== 'youtube' && platform !== 'instagram') {
      throw new AppError('Platform must be youtube or instagram', 400);
    }

    const result = await clipService.publishClip(req.user.id, req.params.clipId, platform);
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Clip publish failed');
    next(error);
  }
}

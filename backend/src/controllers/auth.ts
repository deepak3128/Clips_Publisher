import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/auth';
import { AppError } from '../middleware/error';

export const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const validateLogin = [body('email').isEmail().normalizeEmail(), body('password').notEmpty().withMessage('Password is required')];

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { email, name, password } = req.body;
    const { user, token } = await authService.registerUser(email, name, password);

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, name, id: googleId } = req.user as any;
    const { user, token } = await authService.createOrUpdateGoogleUser(email, name, googleId);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function metaCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, name, id: metaId } = req.user as any;
    const { user, token } = await authService.createOrUpdateMetaUser(email, name, metaId);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await authService.getUserById(req.user.id);
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
}

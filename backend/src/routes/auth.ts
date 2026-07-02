import { Router } from 'express';
import * as authController from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', authController.validateRegister, authController.register);
router.post('/login', authController.validateLogin, authController.login);

router.get('/profile', authMiddleware, authController.getProfile);

router.get('/google/callback', authController.googleCallback);
router.get('/meta/callback', authController.metaCallback);

export default router;

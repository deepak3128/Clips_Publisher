import { Router } from 'express';
import * as adminController from '../controllers/admin';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.post('/users/:userId/suspend', adminController.suspendUser);
router.post('/users/:userId/unsuspend', adminController.unsuspendUser);
router.get('/publish-logs', adminController.getPublishLogs);
router.post('/publish-logs/:logId/retry', adminController.retryPublish);

export default router;

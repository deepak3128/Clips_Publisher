import { Router } from 'express';
import * as scheduleController from '../controllers/schedule';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, scheduleController.validateCreateSchedule, scheduleController.createSchedules);
router.post('/bulk', authMiddleware, scheduleController.validateBulkSchedule, scheduleController.bulkScheduleVideos);

router.get('/video/:videoId', authMiddleware, scheduleController.getSchedules);
router.delete('/:scheduleId', authMiddleware, scheduleController.deleteSchedule);

export default router;

import { Router } from 'express';
import * as scheduleController from '../controllers/schedule';
import { authMiddleware, serviceOrUserAuth } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, scheduleController.validateCreateSchedule, scheduleController.createSchedules);
router.post('/bulk', authMiddleware, scheduleController.validateBulkSchedule, scheduleController.bulkScheduleVideos);

// Used by the n8n scheduled-publishing workflow.
router.get('/pending', serviceOrUserAuth, scheduleController.getPendingSchedules);
router.patch(
  '/:scheduleId/status',
  serviceOrUserAuth,
  scheduleController.validateUpdateScheduleStatus,
  scheduleController.updateScheduleStatus,
);

router.get('/video/:videoId', authMiddleware, scheduleController.getSchedules);
router.delete('/:scheduleId', authMiddleware, scheduleController.deleteSchedule);

export default router;

import { Router } from 'express';
import * as publishController from '../controllers/publish';
import { serviceOrUserAuth } from '../middleware/auth';

const router = Router();

router.use(serviceOrUserAuth);

router.post('/youtube', publishController.validatePublish, publishController.publishYouTube);
router.post('/instagram', publishController.validatePublish, publishController.publishInstagram);
router.get('/failed', publishController.getFailedPublishes);
router.post('/retry', publishController.validateRetry, publishController.retryPublish);

export default router;

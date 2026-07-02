import { Router } from 'express';
import * as socialController from '../controllers/socialAccount';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/connect', authMiddleware, socialController.connectAccount);
router.get('/', authMiddleware, socialController.getConnectedAccounts);
router.delete('/:accountId', authMiddleware, socialController.disconnectAccount);

export default router;

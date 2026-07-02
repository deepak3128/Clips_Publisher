import { Router } from 'express';
import multer from 'multer';
import * as videoController from '../controllers/video';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

router.post('/upload', authMiddleware, upload.array('videos', 100), videoController.uploadVideos);
router.get('/upload-progress/:videoId', authMiddleware, videoController.getUploadProgress);

router.get('/', authMiddleware, videoController.getVideos);
router.get('/stats', authMiddleware, videoController.getDashboardStats);
router.get('/:videoId', authMiddleware, videoController.getVideo);
router.patch('/:videoId', authMiddleware, videoController.validateCreateVideo, videoController.updateVideo);
router.delete('/:videoId', authMiddleware, videoController.deleteVideo);

export default router;

import { Router } from 'express';
import multer from 'multer';
import * as clipController from '../controllers/clip';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported video format'));
    }
  },
});

router.use(authMiddleware);

router.post('/upload', upload.single('video'), clipController.createFromUpload);
router.post('/url', clipController.validateClipUrl, clipController.createFromUrl);

router.get('/jobs', clipController.listJobs);
router.get('/jobs/:jobId', clipController.getJob);
router.get('/jobs/:jobId/clips', clipController.getClips);
router.post('/:clipId/publish', clipController.publishClip);

export default router;

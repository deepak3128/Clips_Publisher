import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import authRoutes from './routes/auth';
import videoRoutes from './routes/video';
import scheduleRoutes from './routes/schedule';
import socialAccountRoutes from './routes/socialAccount';
import adminRoutes from './routes/admin';
import publishRoutes from './routes/publish';
import clipRoutes from './routes/clip';
import { errorHandler, notFoundHandler } from './middleware/error';
import logger from './utils/logger';
import config from './config';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(pinoHttp({ logger }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rendered clips (downloadable and used as publish sources)
app.use('/clips', express.static(path.resolve(process.cwd(), config.clips.dir)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/accounts', socialAccountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/clips', clipRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

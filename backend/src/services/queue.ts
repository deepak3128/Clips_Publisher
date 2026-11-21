import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';
import { notifyUploadProcessed } from '../utils/n8n';

const QUEUE_NAME = 'video-uploads';

let connection: Redis | null = null;
let uploadQueue: Queue | null = null;
let uploadWorker: Worker | null = null;

if (config.redis.enabled) {
  connection = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });

  connection.on('error', (error) => {
    logger.warn({ error }, 'Redis connection error; upload queue may be unavailable');
  });

  uploadQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    },
  });
}

export function startUploadWorker(): void {
  if (!connection || uploadWorker) return;

  uploadWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { videoId, userId, fileName, fileSize } = job.data;

      await job.updateProgress(10);
      await notifyUploadProcessed(videoId, userId, fileName, fileSize);
      await job.updateProgress(100);

      return { videoId };
    },
    {
      connection: connection.duplicate(),
      concurrency: 5,
    },
  );

  uploadWorker.on('failed', (job, error) => {
    logger.error({ error, jobId: job?.id }, 'Upload processing job failed');
  });

  uploadWorker.on('error', (error) => {
    logger.error({ error }, 'Upload worker error');
  });

  logger.info('Upload worker started');
}

export async function getUploadProgress(videoId: string, userId?: string): Promise<number | null> {
  if (!uploadQueue) return null;

  try {
    const jobs = await uploadQueue.getJobs(['active', 'waiting', 'delayed', 'completed']);
    const job = jobs.find(
      (candidate) =>
        candidate.data.videoId === videoId &&
        (!userId || candidate.data.userId === userId),
    );

    if (!job) return null;

    return typeof job.progress === 'number' ? job.progress : 0;
  } catch (error) {
    logger.error({ error, videoId }, 'Failed to get upload progress');
    return null;
  }
}

export async function trackUploadProgress(videoId: string, progress: number): Promise<void> {
  if (!uploadQueue) return;

  try {
    const jobs = await uploadQueue.getJobs(['active', 'waiting', 'delayed']);
    const job = jobs.find((candidate) => candidate.data.videoId === videoId);
    if (job) {
      await job.updateProgress(progress);
    }
  } catch (error) {
    logger.error({ error, videoId }, 'Failed to update upload progress');
  }
}

export async function createUploadJob(
  videoId: string,
  userId: string,
  fileName: string,
  fileSize: number,
): Promise<Job | null> {
  if (!uploadQueue) return null;

  try {
    return await uploadQueue.add('upload', {
      videoId,
      userId,
      fileName,
      fileSize,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn({ error, videoId }, 'Failed to create upload job');
    return null;
  }
}

export async function getActiveUploads(): Promise<Job[]> {
  if (!uploadQueue) return [];
  return uploadQueue.getJobs(['active', 'waiting', 'delayed']);
}

export async function closeUploadQueue(): Promise<void> {
  try {
    if (uploadWorker) {
      await uploadWorker.close();
      uploadWorker = null;
    }
    if (uploadQueue) {
      await uploadQueue.close();
      uploadQueue = null;
    }
    if (connection) {
      await connection.quit();
      connection = null;
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to close upload queue cleanly');
  }
}

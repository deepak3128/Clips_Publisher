import app from './app';
import { initializeDatabase, closeDatabase } from './utils/database';
import { startUploadWorker, closeUploadQueue } from './services/queue';
import config from './config';
import logger from './utils/logger';

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database connected');

    startUploadWorker();

    // Start server
    app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Server started');
    });

    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully');
      await closeUploadQueue();
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

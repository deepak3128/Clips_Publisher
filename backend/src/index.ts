import app from './app';
import { initializeDatabase, closeDatabase } from './utils/database';
import config from './config';
import logger from './utils/logger';

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database connected');

    // Start server
    app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Server started');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await closeDatabase();
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

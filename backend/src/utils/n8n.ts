import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

export async function triggerN8nWebhook(webhookPath: string, payload: Record<string, any>): Promise<void> {
  if (!config.n8n.url || !config.n8n.apiKey) {
    logger.warn({ webhookPath }, 'n8n not configured, skipping webhook');
    return;
  }

  try {
    const url = `${config.n8n.url}/webhook/${webhookPath}`;
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.n8n.apiKey,
      },
      timeout: 5000,
    });
    logger.info({ webhookPath }, 'n8n webhook triggered successfully');
  } catch (error) {
    logger.error({ error, webhookPath }, 'Failed to trigger n8n webhook');
  }
}

export async function notifyUploadProcessed(videoId: string, userId: string, fileName: string, fileSize: number): Promise<void> {
  await triggerN8nWebhook('bulk-upload-processing', {
    event: 'upload.processed',
    videoId,
    userId,
    fileName,
    fileSize,
    timestamp: new Date().toISOString(),
  });
}

export async function notifyPublishComplete(
  videoId: string,
  userId: string,
  platform: string,
  status: string,
  url?: string,
  error?: string,
): Promise<void> {
  await triggerN8nWebhook('publish-complete', {
    event: 'publish.complete',
    videoId,
    userId,
    platform,
    status,
    url,
    error,
    timestamp: new Date().toISOString(),
  });
}

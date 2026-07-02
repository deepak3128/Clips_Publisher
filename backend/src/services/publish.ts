import axios from 'axios';
import axiosRetry from 'axios-retry';
import { getDatabase } from '../utils/database';
import { getConnectedAccount, updateAccessToken } from './socialAccount';
import { sendPublishSuccessEmail, sendPublishFailureEmail } from '../utils/email';
import config from '../config';
import logger from '../utils/logger';
import type { PublishLog } from '../types';

const MAX_RETRIES = 3;

// Configure axios with retry
axiosRetry(axios, {
  retries: MAX_RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
});

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function publishToYouTube(videoId: string, userId: string, fileUrl: string, title: string, description: string, hashtags: string[]): Promise<PublishResult> {
  try {
    const account = await getConnectedAccount(userId, 'youtube');
    if (!account) {
      return { success: false, error: 'YouTube account not connected' };
    }

    // Refresh token if needed
    if (account.expires_at && new Date(account.expires_at) < new Date()) {
      // Token refresh logic would go here
      // Using the YouTube API to refresh tokens
    }

    // Call YouTube API
    // This is a simplified example - actual implementation would use google-auth-library
    const response = await axios.post(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&key=${config.youtube.apiKey}`,
      {
        snippet: {
          title,
          description,
          tags: hashtags,
        },
        status: {
          privacyStatus: 'public',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      },
    );

    const publishUrl = `https://www.youtube.com/shorts/${response.data.id}`;

    // Log successful publish
    await createPublishLog(videoId, 'youtube', publishUrl, 'success');

    return { success: true, url: publishUrl };
  } catch (error) {
    logger.error({ error, videoId }, 'YouTube publishing failed');
    await createPublishLog(videoId, 'youtube', undefined, 'failed', String(error), 1);
    return { success: false, error: String(error) };
  }
}

export async function publishToInstagram(videoId: string, userId: string, fileUrl: string, caption: string, hashtags: string[]): Promise<PublishResult> {
  try {
    const account = await getConnectedAccount(userId, 'instagram');
    if (!account) {
      return { success: false, error: 'Instagram account not connected' };
    }

    // Call Meta Graph API
    const response = await axios.post(`https://graph.instagram.com/v18.0/me/media?access_token=${account.access_token}`, {
      media_type: 'REELS',
      video_url: fileUrl,
      caption: `${caption}\n${hashtags.map((h) => `#${h}`).join(' ')}`,
    });

    const publishUrl = `https://instagram.com/reel/${response.data.id}`;

    // Log successful publish
    await createPublishLog(videoId, 'instagram', publishUrl, 'success');

    return { success: true, url: publishUrl };
  } catch (error) {
    logger.error({ error, videoId }, 'Instagram publishing failed');
    await createPublishLog(videoId, 'instagram', undefined, 'failed', String(error), 1);
    return { success: false, error: String(error) };
  }
}

export async function createPublishLog(videoId: string, platform: 'youtube' | 'instagram', publishUrl: string | undefined, status: string, errorMessage?: string, retryCount: number = 0): Promise<PublishLog> {
  const db = getDatabase();

  const [log] = await db('publish_logs')
    .insert({
      video_id: videoId,
      platform,
      publish_url: publishUrl,
      status,
      error_message: errorMessage,
      retry_count: retryCount,
    })
    .returning('*');

  return log;
}

export async function retryFailedPublish(publishLogId: string, userId: string, videoId: string): Promise<PublishResult> {
  const db = getDatabase();

  const log = await db('publish_logs').where({ id: publishLogId }).first();
  if (!log) {
    return { success: false, error: 'Publish log not found' };
  }

  if (log.retry_count >= MAX_RETRIES) {
    return { success: false, error: 'Max retries exceeded' };
  }

  // Retry logic
  const video = await db('videos').where({ id: videoId }).first();

  let result: PublishResult;
  if (log.platform === 'youtube') {
    result = await publishToYouTube(videoId, userId, video.file_url, video.title, video.caption, video.hashtags);
  } else {
    result = await publishToInstagram(videoId, userId, video.file_url, video.caption, video.hashtags);
  }

  // Update retry count
  if (result.success) {
    await db('publish_logs').where({ id: publishLogId }).update({
      status: 'success',
      publish_url: result.url,
      retry_count: log.retry_count + 1,
    });
  } else {
    await db('publish_logs').where({ id: publishLogId }).update({
      retry_count: log.retry_count + 1,
      error_message: result.error,
    });
  }

  return result;
}

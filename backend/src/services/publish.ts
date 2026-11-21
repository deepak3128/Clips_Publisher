import axios from 'axios';
import axiosRetry from 'axios-retry';
import { OAuth2Client } from 'google-auth-library';
import { getDatabase } from '../utils/database';
import { getConnectedAccount, updateAccessToken } from './socialAccount';
import { sendPublishSuccessEmail, sendPublishFailureEmail } from '../utils/email';
import { getStorageProvider } from '../utils/storage';
import { notifyPublishComplete } from '../utils/n8n';
import { sendPublishSuccessTelegram, sendPublishFailureTelegram } from '../utils/telegram';
import config from '../config';
import logger from '../utils/logger';
import type { ConnectedAccount, PublishLog, Video } from '../types';

const MAX_RETRIES = 3;
const INSTAGRAM_POLL_ATTEMPTS = 10;
const INSTAGRAM_POLL_INTERVAL_MS = 3000;

axiosRetry(axios, {
  retries: MAX_RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
});

export interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface PublishLogContext {
  publishLogId?: string;
  retryCount?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHashtags(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return value
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean);
  }
}

function parseAccountDetails(account: ConnectedAccount): Record<string, any> {
  if (!account.account_details) return {};
  if (typeof account.account_details === 'string') {
    try {
      return JSON.parse(account.account_details);
    } catch {
      return {};
    }
  }
  return account.account_details;
}

function getGoogleOAuth2Client(refreshToken: string): OAuth2Client {
  const client = new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackUrl,
  );
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

async function getFreshGoogleAccessToken(account: ConnectedAccount): Promise<string> {
  if (!account.refresh_token) {
    return account.access_token;
  }

  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
  if (expiresAt && expiresAt > Date.now() + 60_000) {
    return account.access_token;
  }

  try {
    const oauth2Client = getGoogleOAuth2Client(account.refresh_token);
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error('Google did not return an access token');
    }

    await updateAccessToken(
      account.id,
      credentials.access_token,
      credentials.refresh_token || account.refresh_token,
      credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
    );

    return credentials.access_token;
  } catch (error) {
    logger.error({ error }, 'Google token refresh failed, using existing token');
    return account.access_token;
  }
}

async function resolveDownloadUrl(fileUrl: string): Promise<string> {
  if (!fileUrl.startsWith('s3://')) {
    return fileUrl;
  }

  // Stored S3 URLs are not directly downloadable; generate a signed URL.
  const withoutScheme = fileUrl.slice('s3://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  const key = slashIndex >= 0 ? withoutScheme.slice(slashIndex + 1) : withoutScheme;
  return getStorageProvider().getSignedUrl(key, 3600);
}

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const db = getDatabase();
    const user = await db('users').where({ id: userId }).select('email').first();
    return user?.email || null;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to look up user email');
    return null;
  }
}

async function notifyPublishResult(
  userId: string,
  videoId: string,
  platform: 'youtube' | 'instagram',
  success: boolean,
  title: string,
  url?: string,
  error?: string,
): Promise<void> {
  const email = await getUserEmail(userId);
  if (email) {
    try {
      if (success) {
        await sendPublishSuccessEmail(email, title, platform);
      } else {
        await sendPublishFailureEmail(email, title, error || 'Unknown error');
      }
    } catch (emailError) {
      logger.error({ emailError, userId }, 'Publish email notification failed');
    }
  }

  await notifyPublishComplete(videoId, userId, platform, success ? 'success' : 'failed', url, error);

  if (success) {
    await sendPublishSuccessTelegram(userId, title, platform);
  } else {
    await sendPublishFailureTelegram(userId, title, error || 'Unknown error');
  }
}

async function recordPublishResult(
  videoId: string,
  platform: 'youtube' | 'instagram',
  publishUrl: string | undefined,
  status: 'success' | 'failed',
  errorMessage: string | undefined,
  context: PublishLogContext,
): Promise<void> {
  try {
    const db = getDatabase();

    if (context.publishLogId) {
      await db('publish_logs')
        .where({ id: context.publishLogId })
        .update({
          status,
          publish_url: publishUrl || null,
          error_message: errorMessage || null,
          retry_count: context.retryCount ?? 0,
          updated_at: new Date(),
        });
      return;
    }

    await db('publish_logs').insert({
      video_id: videoId,
      platform,
      publish_url: publishUrl || null,
      status,
      error_message: errorMessage || null,
      retry_count: context.retryCount ?? 0,
    });
  } catch (error) {
    logger.error({ error, videoId, platform }, 'Failed to record publish result');
  }
}

export async function publishToYouTube(
  videoId: string,
  userId: string,
  fileUrl: string,
  title: string,
  description: string,
  hashtags: string[] | string,
  context: PublishLogContext = {},
): Promise<PublishResult> {
  const tags = normalizeHashtags(hashtags);

  try {
    const account = await getConnectedAccount(userId, 'youtube');
    if (!account) {
      throw new Error('YouTube account not connected');
    }

    const accessToken = await getFreshGoogleAccessToken(account);
    const downloadUrl = await resolveDownloadUrl(fileUrl);

    let videoBuffer: Buffer;
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        maxContentLength: 500 * 1024 * 1024,
        maxBodyLength: 500 * 1024 * 1024,
      });
      videoBuffer = Buffer.from(response.data);
    } catch (downloadError) {
      logger.error({ downloadError, fileUrl }, 'Failed to download video file for YouTube upload');
      throw new Error('Failed to download video file for upload');
    }

    if (videoBuffer.length === 0) {
      throw new Error('Video file is empty');
    }

    const boundary = `boundary_${Math.random().toString(36).substring(2)}`;
    const metadata = {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags,
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    const bodyStart = Buffer.from(
      `--${boundary}\r\n` +
        'Content-Type: application/json\r\n\r\n' +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        'Content-Type: video/mp4\r\n' +
        'Content-Transfer-Encoding: binary\r\n\r\n',
      'utf-8',
    );
    const bodyEnd = Buffer.from(`\r\n--${boundary}--`, 'utf-8');
    const requestBody = Buffer.concat([bodyStart, videoBuffer, bodyEnd]);

    const response = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120_000,
      },
    );

    const publishUrl = `https://www.youtube.com/shorts/${response.data.id}`;

    await recordPublishResult(videoId, 'youtube', publishUrl, 'success', undefined, context);
    await notifyPublishResult(userId, videoId, 'youtube', true, title, publishUrl);

    return { success: true, url: publishUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, videoId }, 'YouTube publishing failed');
    await recordPublishResult(videoId, 'youtube', undefined, 'failed', message, context);
    await notifyPublishResult(userId, videoId, 'youtube', false, title, undefined, message);
    return { success: false, error: message };
  }
}

export async function publishToInstagram(
  videoId: string,
  userId: string,
  fileUrl: string,
  caption: string,
  hashtags: string[] | string,
  context: PublishLogContext = {},
): Promise<PublishResult> {
  const tags = normalizeHashtags(hashtags);

  try {
    const account = await getConnectedAccount(userId, 'instagram');
    if (!account) {
      throw new Error('Instagram account not connected');
    }

    const details = parseAccountDetails(account);
    const igUserId = details.id || details.instagram_business_account?.id || 'me';
    const fullCaption = [caption, tags.map((tag) => `#${tag}`).join(' ')]
      .filter(Boolean)
      .join('\n\n');

    const mediaResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      {
        media_type: 'REELS',
        video_url: await resolveDownloadUrl(fileUrl),
        caption: fullCaption,
        access_token: account.access_token,
      },
    );

    const creationId = mediaResponse.data.id;
    let ready = false;

    for (let attempt = 0; attempt < INSTAGRAM_POLL_ATTEMPTS; attempt++) {
      await sleep(INSTAGRAM_POLL_INTERVAL_MS);

      const statusResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${creationId}`,
        {
          params: {
            fields: 'status_code,status',
            access_token: account.access_token,
          },
        },
      );

      const statusCode = statusResponse.data.status_code;
      if (statusCode === 'FINISHED') {
        ready = true;
        break;
      }

      if (statusCode === 'ERROR') {
        throw new Error(statusResponse.data.status || 'Instagram failed to process the video');
      }
    }

    if (!ready) {
      throw new Error('Timed out waiting for Instagram to process the video');
    }

    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: account.access_token,
      },
    );

    const publishUrl = `https://www.instagram.com/reel/${publishResponse.data.id}/`;

    await recordPublishResult(videoId, 'instagram', publishUrl, 'success', undefined, context);
    await notifyPublishResult(userId, videoId, 'instagram', true, caption, publishUrl);

    return { success: true, url: publishUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, videoId }, 'Instagram publishing failed');
    await recordPublishResult(videoId, 'instagram', undefined, 'failed', message, context);
    await notifyPublishResult(userId, videoId, 'instagram', false, caption, undefined, message);
    return { success: false, error: message };
  }
}

export async function createPublishLog(
  videoId: string,
  platform: 'youtube' | 'instagram',
  publishUrl: string | undefined,
  status: string,
  errorMessage?: string,
  retryCount: number = 0,
): Promise<PublishLog> {
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

export async function getFailedPublishLogs(limit: number = 50, userId?: string) {
  const db = getDatabase();

  let query = db('publish_logs')
    .join('videos', 'publish_logs.video_id', 'videos.id')
    .join('users', 'videos.user_id', 'users.id')
    .where('publish_logs.status', 'failed')
    .andWhere('publish_logs.retry_count', '<', MAX_RETRIES)
    .select(
      'publish_logs.*',
      'videos.user_id',
      'videos.title as video_title',
      'users.email as user_email',
    )
    .orderBy('publish_logs.created_at', 'asc')
    .limit(limit);

  if (userId) {
    query = query.andWhere('videos.user_id', userId);
  }

  return query;
}

export async function getPublishLogWithVideo(publishLogId: string) {
  const db = getDatabase();

  return db('publish_logs')
    .join('videos', 'publish_logs.video_id', 'videos.id')
    .where('publish_logs.id', publishLogId)
    .select('publish_logs.*', 'videos.user_id', 'videos.file_url')
    .first();
}

export async function retryFailedPublish(
  publishLogId: string,
  expectedUserId?: string,
): Promise<PublishResult> {
  const db = getDatabase();

  const log = await getPublishLogWithVideo(publishLogId);
  if (!log) {
    return { success: false, error: 'Publish log not found' };
  }

  if (expectedUserId && log.user_id !== expectedUserId) {
    return { success: false, error: 'Publish log not found' };
  }

  if (log.retry_count >= MAX_RETRIES) {
    return { success: false, error: 'Max retries exceeded' };
  }

  const video: Video | undefined = await db('videos').where({ id: log.video_id }).first();
  if (!video) {
    return { success: false, error: 'Video not found' };
  }

  const context: PublishLogContext = {
    publishLogId: log.id,
    retryCount: log.retry_count + 1,
  };

  if (log.platform === 'youtube') {
    return publishToYouTube(
      video.id,
      video.user_id,
      video.file_url,
      video.title,
      video.caption,
      video.hashtags,
      context,
    );
  }

  return publishToInstagram(
    video.id,
    video.user_id,
    video.file_url,
    video.caption,
    video.hashtags,
    context,
  );
}

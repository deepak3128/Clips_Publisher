import { getDatabase } from '../utils/database';
import { AppError } from '../middleware/error';
import type { Video } from '../types';

export async function createVideo(
  userId: string,
  title: string,
  caption: string,
  hashtags: string[],
  fileUrl: string,
  fileName: string,
  fileSize: number,
  thumbnailUrl?: string,
  duration?: number,
  resolution?: string,
): Promise<Video> {
  const db = getDatabase();

  const [video] = await db('videos')
    .insert({
      user_id: userId,
      title,
      caption,
      hashtags: JSON.stringify(hashtags),
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      thumbnail_url: thumbnailUrl,
      duration,
      resolution,
    })
    .returning('*');

  return video;
}

export async function getVideoById(userId: string, videoId: string): Promise<Video> {
  const db = getDatabase();
  const video = await db('videos').where({ id: videoId, user_id: userId }).first();

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  return video;
}

export async function getVideoForPublishing(videoId: string): Promise<Video | null> {
  const db = getDatabase();
  return db('videos').where({ id: videoId }).first() || null;
}

export async function getUserVideos(userId: string, status?: string, limit: number = 20, offset: number = 0): Promise<{ videos: Video[]; total: number }> {
  const db = getDatabase();

  let query = db('videos').where({ user_id: userId });

  if (status) {
    query = query.where({ status });
  }

  const [{ count }] = await db('videos')
    .where({ user_id: userId })
    .modify((q) => {
      if (status) q.where({ status });
    })
    .count('* as count');

  const videos = await query.limit(limit).offset(offset).orderBy('uploaded_at', 'desc');

  return { videos, total: parseInt(count as string) };
}

export async function updateVideoMetadata(
  userId: string,
  videoId: string,
  data: { title?: string; caption?: string; hashtags?: string[] },
): Promise<Video> {
  const db = getDatabase();

  const video = await db('videos').where({ id: videoId, user_id: userId }).first();
  if (!video) {
    throw new AppError('Video not found', 404);
  }

  const updateData: Record<string, any> = { updated_at: new Date() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.caption !== undefined) updateData.caption = data.caption;
  if (data.hashtags !== undefined) updateData.hashtags = JSON.stringify(data.hashtags);

  const [updated] = await db('videos').where({ id: videoId }).update(updateData).returning('*');

  return updated;
}

export async function updateVideoStatus(userId: string, videoId: string, status: string): Promise<Video> {
  const db = getDatabase();

  const video = await db('videos').where({ id: videoId, user_id: userId }).first();
  if (!video) {
    throw new AppError('Video not found', 404);
  }

  const [updated] = await db('videos').where({ id: videoId }).update({ status, updated_at: new Date() }).returning('*');

  return updated;
}

export async function deleteVideo(userId: string, videoId: string): Promise<void> {
  const db = getDatabase();

  const video = await db('videos').where({ id: videoId, user_id: userId }).first();
  if (!video) {
    throw new AppError('Video not found', 404);
  }

  await db('videos').where({ id: videoId }).delete();
}

export async function getDashboardStats(userId: string): Promise<{ total: number; scheduled: number; published: number; failed: number }> {
  const db = getDatabase();

  const [total] = await db('videos').where({ user_id: userId }).count('* as count');
  const [scheduled] = await db('videos').where({ user_id: userId, status: 'scheduled' }).count('* as count');
  const [published] = await db('videos').where({ user_id: userId, status: 'published' }).count('* as count');
  const [failed] = await db('videos').where({ user_id: userId, status: 'failed' }).count('* as count');

  return {
    total: parseInt(total.count as string),
    scheduled: parseInt(scheduled.count as string),
    published: parseInt(published.count as string),
    failed: parseInt(failed.count as string),
  };
}

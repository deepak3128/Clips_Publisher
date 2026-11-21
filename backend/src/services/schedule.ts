import { getDatabase } from '../utils/database';
import { AppError } from '../middleware/error';
import type { Schedule } from '../types';

export interface PendingSchedule extends Schedule {
  user_id: string;
  user_email: string;
  title: string;
  file_url: string;
  caption: string;
  hashtags: string[] | string;
}

export async function createSchedules(
  videoId: string,
  platform: 'youtube' | 'instagram' | 'both',
  publishDates: Date[],
): Promise<Schedule[]> {
  const db = getDatabase();

  const schedules = publishDates.map((date) => ({
    video_id: videoId,
    platform,
    publish_date: date,
    status: 'pending',
  }));

  const created = await db('schedules').insert(schedules).returning('*');

  await db('videos')
    .where({ id: videoId })
    .update({ status: 'scheduled', updated_at: new Date() });

  return created;
}

export async function getSchedulesByVideo(videoId: string): Promise<Schedule[]> {
  const db = getDatabase();
  return db('schedules').where({ video_id: videoId }).orderBy('publish_date', 'asc');
}

export async function getPendingSchedules(userId?: string): Promise<PendingSchedule[]> {
  const db = getDatabase();

  let query = db('schedules')
    .join('videos', 'schedules.video_id', 'videos.id')
    .join('users', 'videos.user_id', 'users.id')
    .where('schedules.status', 'pending')
    .andWhere('schedules.publish_date', '<=', new Date())
    .select(
      'schedules.*',
      'videos.user_id',
      'videos.title',
      'videos.file_url',
      'videos.caption',
      'videos.hashtags',
      'users.email as user_email',
    )
    .orderBy('schedules.publish_date', 'asc');

  if (userId) {
    query = query.andWhere('videos.user_id', userId);
  }

  return query;
}

export async function getScheduleById(scheduleId: string): Promise<Schedule> {
  const db = getDatabase();
  const schedule = await db('schedules').where({ id: scheduleId }).first();
  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }
  return schedule;
}

export async function updateScheduleStatus(
  scheduleId: string,
  status: 'pending' | 'published' | 'failed',
  userId?: string,
): Promise<Schedule> {
  const db = getDatabase();

  const schedule = await db('schedules')
    .join('videos', 'schedules.video_id', 'videos.id')
    .where('schedules.id', scheduleId)
    .select('schedules.*', 'videos.user_id')
    .first();

  if (!schedule || (userId && schedule.user_id !== userId)) {
    throw new AppError('Schedule not found', 404);
  }

  const [updated] = await db('schedules')
    .where({ id: scheduleId })
    .update({ status, updated_at: new Date() })
    .returning('*');

  if (status === 'published') {
    await db('videos')
      .where({ id: schedule.video_id })
      .update({ status: 'published', updated_at: new Date() });
  } else if (status === 'failed') {
    await db('videos')
      .where({ id: schedule.video_id })
      .update({ status: 'failed', updated_at: new Date() });
  }

  return updated;
}

export async function deleteSchedule(scheduleId: string, userId?: string): Promise<void> {
  const db = getDatabase();

  const schedule = await db('schedules')
    .join('videos', 'schedules.video_id', 'videos.id')
    .where('schedules.id', scheduleId)
    .select('schedules.id', 'videos.user_id')
    .first();

  if (!schedule || (userId && schedule.user_id !== userId)) {
    throw new AppError('Schedule not found', 404);
  }

  await db('schedules').where({ id: scheduleId }).delete();
}

export async function bulkScheduleVideos(
  videoIds: string[],
  platform: 'youtube' | 'instagram' | 'both',
  startDate: Date,
  postsPerDay: number,
  postingTimes: string[],
): Promise<Schedule[]> {
  const db = getDatabase();

  const schedules: any[] = [];
  const currentDate = new Date(startDate);
  let postsCreated = 0;

  for (const videoId of videoIds) {
    for (let i = 0; i < postsPerDay; i++) {
      const timeStr = postingTimes[i % postingTimes.length];
      const [hours, minutes] = timeStr.split(':').map(Number);

      const publishDate = new Date(currentDate);
      publishDate.setHours(hours, minutes, 0, 0);

      schedules.push({
        video_id: videoId,
        platform,
        publish_date: publishDate,
        status: 'pending',
      });

      postsCreated++;
      if (postsCreated % postsPerDay === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  return db('schedules').insert(schedules).returning('*');
}

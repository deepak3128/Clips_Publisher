import { getDatabase } from '../utils/database';
import { AppError } from '../middleware/error';
import type { Schedule } from '../types';

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

  return db('schedules').insert(schedules).returning('*');
}

export async function getSchedulesByVideo(videoId: string): Promise<Schedule[]> {
  const db = getDatabase();
  return db('schedules').where({ video_id: videoId });
}

export async function getPendingSchedules(): Promise<Schedule[]> {
  const db = getDatabase();
  return db('schedules').where({ status: 'pending' }).andWhere('publish_date', '<=', new Date());
}

export async function updateScheduleStatus(scheduleId: string, status: 'pending' | 'published' | 'failed'): Promise<Schedule> {
  const db = getDatabase();

  const [schedule] = await db('schedules')
    .where({ id: scheduleId })
    .update({ status, updated_at: new Date() })
    .returning('*');

  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }

  return schedule;
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const db = getDatabase();
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

  let schedules: any[] = [];
  let currentDate = new Date(startDate);
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

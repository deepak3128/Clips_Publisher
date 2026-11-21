import { getDatabase } from '../utils/database';
import { AppError } from '../middleware/error';
import { getPublishLogWithVideo, retryFailedPublish } from './publish';

export async function listUsers(page: number = 1, limit: number = 20) {
  const db = getDatabase();
  const offset = (page - 1) * limit;

  const users = await db('users')
    .select('id', 'email', 'name', 'role', 'created_at', 'updated_at')
    .limit(limit)
    .offset(offset)
    .orderBy('created_at', 'desc');

  const [{ count }] = await db('users').count('* as count');

  return { users, total: parseInt(count as string), page, limit };
}

export async function suspendUser(userId: string, actorId: string): Promise<void> {
  if (userId === actorId) {
    throw new AppError('You cannot suspend your own account', 400);
  }

  const db = getDatabase();
  const user = await db('users').where({ id: userId }).first();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Admin accounts cannot be suspended', 400);
  }

  await db('users').where({ id: userId }).update({
    role: 'suspended',
    updated_at: new Date(),
  });
}

export async function unsuspendUser(userId: string): Promise<void> {
  const db = getDatabase();
  const user = await db('users').where({ id: userId }).first();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Admin accounts cannot be modified', 400);
  }

  await db('users').where({ id: userId }).update({
    role: 'user',
    updated_at: new Date(),
  });
}

export async function getPublishLogs(page: number = 1, limit: number = 20) {
  const db = getDatabase();
  const offset = (page - 1) * limit;

  const logs = await db('publish_logs')
    .join('videos', 'publish_logs.video_id', 'videos.id')
    .join('users', 'videos.user_id', 'users.id')
    .select(
      'publish_logs.*',
      'videos.title as video_title',
      'users.email as user_email',
      'users.name as user_name',
    )
    .limit(limit)
    .offset(offset)
    .orderBy('publish_logs.created_at', 'desc');

  const [{ count }] = await db('publish_logs').count('* as count');

  return { logs, total: parseInt(count as string), page, limit };
}

export async function retryPublish(logId: string) {
  const log = await getPublishLogWithVideo(logId);
  if (!log) {
    throw new AppError('Publish log not found', 404);
  }

  return retryFailedPublish(log.id);
}

export async function getDashboardStats() {
  const db = getDatabase();

  const [totalUsers] = await db('users').count('* as count');
  const [totalVideos] = await db('videos').count('* as count');
  const [totalSchedules] = await db('schedules').count('* as count');
  const [pendingSchedules] = await db('schedules').where({ status: 'pending' }).count('* as count');
  const [failedPublishes] = await db('publish_logs').where({ status: 'failed' }).count('* as count');

  return {
    totalUsers: parseInt(totalUsers.count as string),
    totalVideos: parseInt(totalVideos.count as string),
    totalSchedules: parseInt(totalSchedules.count as string),
    pendingSchedules: parseInt(pendingSchedules.count as string),
    failedPublishes: parseInt(failedPublishes.count as string),
  };
}

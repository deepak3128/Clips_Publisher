import { getDatabase } from '../utils/database';
import { AppError } from '../middleware/error';
import type { ConnectedAccount } from '../types';

export async function connectSocialAccount(
  userId: string,
  platform: 'youtube' | 'instagram',
  accessToken: string,
  refreshToken: string | undefined,
  expiresAt: Date | undefined,
  accountDetails: Record<string, any>,
): Promise<ConnectedAccount> {
  const db = getDatabase();

  const [account] = await db('connected_accounts')
    .insert({
      user_id: userId,
      platform,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      account_details: JSON.stringify(accountDetails),
    })
    .onConflict(['user_id', 'platform'])
    .merge()
    .returning('*');

  return account;
}

export async function getConnectedAccount(userId: string, platform: 'youtube' | 'instagram'): Promise<ConnectedAccount | null> {
  const db = getDatabase();
  return db('connected_accounts').where({ user_id: userId, platform }).first() || null;
}

export async function getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
  const db = getDatabase();
  return db('connected_accounts').where({ user_id: userId });
}

export async function updateAccessToken(accountId: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<ConnectedAccount> {
  const db = getDatabase();

  const [account] = await db('connected_accounts')
    .where({ id: accountId })
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date(),
    })
    .returning('*');

  return account;
}

export async function deleteConnectedAccount(userId: string, accountId: string): Promise<void> {
  const db = getDatabase();

  const account = await db('connected_accounts').where({ id: accountId, user_id: userId }).first();
  if (!account) {
    throw new AppError('Account not found', 404);
  }

  await db('connected_accounts').where({ id: accountId }).delete();
}

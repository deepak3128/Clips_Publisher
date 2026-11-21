import axios from 'axios';
import { getDatabase } from './database';
import config from '../config';
import logger from './logger';

async function getUserTelegramChatId(userId: string): Promise<string | null> {
  try {
    const db = getDatabase();

    const account = await db('connected_accounts')
      .where({ user_id: userId })
      .whereRaw("account_details->>'telegram_chat_id' IS NOT NULL")
      .first();

    if (account?.account_details?.telegram_chat_id) {
      return account.account_details.telegram_chat_id;
    }

    return null;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to lookup Telegram chat ID');
    return null;
  }
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!config.telegram.botToken) {
    logger.warn('Telegram bot token not configured, skipping message');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    logger.info({ chatId }, 'Telegram message sent successfully');
  } catch (error) {
    logger.error({ error, chatId }, 'Failed to send Telegram message');
  }
}

export async function sendPublishSuccessTelegram(userId: string, videoTitle: string, platform: string): Promise<void> {
  const chatId = await getUserTelegramChatId(userId);
  if (!chatId) return;

  const text = `<b>Video Published Successfully!</b>\n\nYour video "${videoTitle}" has been published to ${platform}.`;
  await sendTelegramMessage(chatId, text);
}

export async function sendPublishFailureTelegram(userId: string, videoTitle: string, reason: string): Promise<void> {
  const chatId = await getUserTelegramChatId(userId);
  if (!chatId) return;

  const text = `<b>Video Publishing Failed</b>\n\nYour video "${videoTitle}" failed to publish.\n\nReason: ${reason}`;
  await sendTelegramMessage(chatId, text);
}

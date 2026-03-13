/**
 * Send Telegram tool
 * Sends text messages or local files to Telegram.
 * Auto-detects images vs documents when sending files.
 */

import { z } from 'zod';
import fs from 'fs';
import { sendMessage, sendPhoto, sendDocument, isImageFile } from '../lib/telegram-client.js';

export const name = 'send_telegram';

export const description =
  'Send a message or file to Telegram. ' +
  'For files, automatically uses sendPhoto for images and sendDocument for everything else.';

export const schema = {
  type: z
    .enum(['message', 'file'])
    .describe('"message" to send text or a URL, "file" to send a local file from the VPS'),
  content: z
    .string()
    .describe(
      'For type=message: the text or URL to send. For type=file: absolute path to the file on the VPS',
    ),
  caption: z
    .string()
    .optional()
    .describe('Optional caption shown below a file (ignored for text messages)'),
};

/**
 * @param {{ type: 'message' | 'file', content: string, caption?: string }} args
 * @param {string} botToken
 * @param {string} chatId
 */
export async function handler({ type, content, caption = '' }, botToken, chatId) {
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  if (!chatId) throw new Error('DEFAULT_CHAT_ID environment variable is not set');

  if (type === 'message') {
    // URLs: send the URL as the message text (with caption prepended if provided)
    const text = caption ? `${caption}\n\n${content}` : content;
    const result = await sendMessage(botToken, chatId, text);
    return {
      success: true,
      type: 'message',
      messageId: result.result.message_id,
    };
  }

  // type === 'file'
  if (!fs.existsSync(content)) {
    throw new Error(`File not found: ${content}`);
  }

  if (isImageFile(content)) {
    const result = await sendPhoto(botToken, chatId, content, caption);
    return {
      success: true,
      type: 'photo',
      messageId: result.result.message_id,
    };
  }

  const result = await sendDocument(botToken, chatId, content, caption);
  return {
    success: true,
    type: 'document',
    messageId: result.result.message_id,
  };
}

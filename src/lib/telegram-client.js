/**
 * Telegram Bot API client
 */

import fs from 'fs';
import path from 'path';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Send a message to Telegram
 * @param {string} botToken - Telegram bot token
 * @param {string|number} chatId - Chat ID
 * @param {string} text - Message text
 * @returns {Promise<Object>} Telegram API response
 */
export async function sendMessage(botToken, chatId, text) {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description}`);
  }

  return response.json();
}

/**
 * Send a photo to Telegram
 * @param {string} botToken - Telegram bot token
 * @param {string|number} chatId - Chat ID
 * @param {string} filePath - Path to the image file
 * @param {string} caption - Optional caption
 * @returns {Promise<Object>} Telegram API response
 */
export async function sendPhoto(botToken, chatId, filePath, caption = '') {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendPhoto`;

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('chat_id', chatId.toString());
  formData.append('photo', new File([fileBuffer], fileName));
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description}`);
  }

  return response.json();
}

/**
 * Send a document (file) to Telegram
 * @param {string} botToken - Telegram bot token
 * @param {string|number} chatId - Chat ID
 * @param {string} filePath - Path to the file
 * @param {string} caption - Optional caption
 * @returns {Promise<Object>} Telegram API response
 */
export async function sendDocument(botToken, chatId, filePath, caption = '') {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendDocument`;

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('chat_id', chatId.toString());
  formData.append('document', new File([fileBuffer], fileName));
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description}`);
  }

  return response.json();
}

/**
 * Detect if a file is an image
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file is an image
 */
export function isImageFile(filePath) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
  return imageExtensions.includes(path.extname(filePath).toLowerCase());
}

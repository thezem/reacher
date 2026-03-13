/**
 * T-Store file upload client
 */

import fs from 'fs';
import path from 'path';

const TSTORE_API_BASE = 'https://tstore.ouim.me';

/**
 * Upload a file to T-Store
 * @param {string} filePath - Absolute path to the file to upload
 * @returns {Promise<string>} Public download URL
 */
export async function uploadFile(filePath) {
  // Validate file exists and is readable
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', new File([fileBuffer], fileName));

  const response = await fetch(`${TSTORE_API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`T-Store upload failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.url) {
    throw new Error('T-Store did not return a download URL');
  }

  return data.url;
}

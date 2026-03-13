/**
 * Upload File tool
 * Uploads a local VPS file to T-Store and returns the public download URL
 */

import { z } from 'zod';
import { uploadFile as tstoreUpload } from '../lib/tstore-client.js';

export const name = 'upload_file';

export const description =
  'Upload a file from the VPS filesystem to T-Store and get back a public shareable URL.';

export const schema = {
  file_path: z
    .string()
    .describe('Absolute path to the file on the VPS (e.g. "/home/hazem/report.pdf")'),
};

/**
 * @param {{ file_path: string }} args
 */
export async function handler({ file_path }) {
  const url = await tstoreUpload(file_path);

  return {
    success: true,
    file_path,
    download_url: url,
    message: `File uploaded successfully. Share this link: ${url}`,
  };
}

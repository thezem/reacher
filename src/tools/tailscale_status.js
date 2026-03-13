/**
 * Tailscale Status tool
 * Fetches all devices in the Tailscale network with online status and IPs
 */

import { z } from 'zod';
import { getDevices } from '../lib/tailscale-client.js';

export const name = 'tailscale_status';

export const description =
  'Get all devices in your Tailscale network with their online/offline status, ' +
  'IP addresses, OS, and last-seen time.';

// No parameters needed — it just fetches your whole tailnet
export const schema = {};

/**
 * @param {Record<string, never>} _args
 * @param {string} apiKey
 */
export async function handler(_args, apiKey) {
  if (!apiKey) {
    throw new Error('TAILSCALE_API_KEY environment variable is not set');
  }

  const devices = await getDevices(apiKey);

  const online = devices.filter((d) => d.online);
  const offline = devices.filter((d) => !d.online);

  return {
    success: true,
    summary: {
      total: devices.length,
      online: online.length,
      offline: offline.length,
    },
    devices: devices.map((d) => ({
      name: d.name,
      hostname: d.hostname,
      status: d.online ? 'online' : 'offline',
      os: d.os,
      ips: d.addresses,
      clientVersion: d.clientVersion,
      lastSeen: d.lastSeen,
    })),
  };
}

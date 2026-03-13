/**
 * Tailscale API client
 */

const TAILSCALE_API_BASE = 'https://api.tailscale.com/api/v2';

/**
 * Get all devices in the Tailscale network
 * @param {string} apiKey - Tailscale API key
 * @returns {Promise<Array>} Array of devices with status and IPs
 */
export async function getDevices(apiKey) {
  const response = await fetch(`${TAILSCALE_API_BASE}/tailnet/-/devices`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Tailscale API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Format devices with relevant info
  return data.devices.map((device) => ({
    name: device.name,
    hostname: device.hostname,
    online: device.online,
    os: device.os,
    clientVersion: device.clientVersion,
    addresses: device.addresses || [],
    lastSeen: device.lastSeen,
  }));
}

/**
 * Get a single device by hostname
 * @param {string} apiKey - Tailscale API key
 * @param {string} hostname - Device hostname to find
 * @returns {Promise<Object|null>} Device object or null if not found
 */
export async function getDevice(apiKey, hostname) {
  const devices = await getDevices(apiKey);
  return devices.find((d) => d.hostname === hostname || d.name === hostname) || null;
}

/**
 * Fetch External tool
 * Fetches data from external URLs with domain whitelisting and token injection
 */

import { z } from 'zod'
import { URL } from 'url'

export const name = 'fetch_external'

export const description =
  'Fetch data from external URLs with domain whitelisting and automatic authentication token injection. ' +
  'Only allowed domains can be accessed. Authentication tokens are injected automatically based on domain.'

export const schema = {
  url: z.string().url().describe('The full URL to fetch'),
  method: z
    .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
    .optional()
    .default('GET')
    .describe('HTTP method (default: GET)'),
  body: z.record(z.any()).optional().describe('Request body for POST/PATCH/PUT requests'),
  headers: z.record(z.string()).optional().describe('Additional headers to merge in'),
}

/**
 * Token injection map - loaded from FETCH_EXTERNAL_TOKEN_MAP env var (JSON string)
 * Format: {"domain": "ENV_VAR_NAME"}
 * Example: {"api.github.com": "GITHUB_TOKEN", "mypanel.com": "EASYPANEL_TOKEN"}
 */
const TOKEN_INJECTION_MAP = JSON.parse(process.env.FETCH_EXTERNAL_TOKEN_MAP || '{}')

/**
 * @param {{ url: string, method: string, body?: object, headers?: object }} args
 * @param {string} allowedDomains - comma-separated list of allowed domains from env
 * @param {object} env - environment variables object
 */
export async function handler({ url, method = 'GET', body, headers = {} }, allowedDomains, env) {
  try {
    // Parse the URL and extract hostname
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname

    // Check if domain is allowed
    const allowedList = (allowedDomains || '')
      .split(',')
      .map(d => d.trim())
      .filter(d => d)

    if (!allowedList.includes(hostname)) {
      return {
        success: false,
        error: 'Domain not allowed',
        url,
        hostname,
      }
    }

    // Build final headers by merging user headers and injected auth
    const finalHeaders = { ...headers }

    // Check if this domain has a token to inject
    const tokenEnvVar = TOKEN_INJECTION_MAP[hostname]
    if (tokenEnvVar && env[tokenEnvVar]) {
      finalHeaders['Authorization'] = `Bearer ${env[tokenEnvVar]}`
    }

    // Build fetch options
    const fetchOptions = {
      method,
      headers: finalHeaders,
    }

    // Add body if provided and method supports it
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = JSON.stringify(body)
      if (!finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json'
      }
    }

    // Execute the fetch
    const response = await fetch(url, fetchOptions)

    // Parse response body
    const contentType = response.headers.get('content-type') || ''
    let responseBody

    if (contentType.includes('application/json')) {
      responseBody = await response.json()
    } else {
      responseBody = await response.text()
    }

    // Return response data
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      url,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url,
    }
  }
}

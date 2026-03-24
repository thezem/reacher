/**
 * Fetch External tool
 * Fetches data from external URLs with domain whitelisting and token injection
 */

import { z } from 'zod'
import { URL } from 'url'
import YAML from 'js-yaml'

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
  pick: z
    .array(z.string())
    .optional()
    .describe('Optional dot-notation field paths to extract from JSON response (e.g. ["id", "user.login", "labels[].name"])'),
  format: z
    .enum(['yaml', 'json'])
    .optional()
    .default('yaml')
    .describe('Response format after transformation. Applies only to JSON responses (default: yaml)'),
}

/**
 * Token injection map - loaded from FETCH_EXTERNAL_TOKEN_MAP env var (JSON string)
 * Format: {"domain": "ENV_VAR_NAME"}
 * Example: {"api.github.com": "GITHUB_TOKEN", "mypanel.com": "EASYPANEL_TOKEN"}
 */
const TOKEN_INJECTION_MAP = JSON.parse(process.env.FETCH_EXTERNAL_TOKEN_MAP || '{}')

/**
 * Extract a value from an object using dot notation
 * Examples: "id", "user.login", "data.user.profile.name"
 * @param {any} obj - The object to extract from
 * @param {string} path - The dot-notation path
 * @returns {any} The extracted value
 */
function getNestedValue(obj, path) {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null) return undefined
    current = current[part]
  }
  return current
}

/**
 * Extract array of values from an array of objects using array notation
 * Examples: "labels[].name", "items[].id"
 * @param {any} baseObj - The base object containing the array
 * @param {string} path - The path with array notation (e.g., "labels[].name")
 * @returns {any[]} Array of extracted values
 */
function getArrayValues(baseObj, path) {
  // Match pattern like "labels[].name" to extract "labels" and "name"
  const match = path.match(/^(.+?)\[\]\.(.+)$/)
  if (!match) return undefined

  const arrayFieldPath = match[1]
  const fieldPath = match[2]

  // Get the array from the base object
  const array = getNestedValue(baseObj, arrayFieldPath)
  if (!Array.isArray(array)) return undefined

  // Extract the field from each element
  return array.map(item => getNestedValue(item, fieldPath))
}

/**
 * Pick specific fields from a JSON object or array of objects
 * Supports dot notation for nested objects and [] notation for arrays
 * @param {any} data - The data to pick from
 * @param {string[]} fields - Array of field paths to pick
 * @returns {any} Picked data maintaining structure
 */
function pickFields(data, fields) {
  // Handle array of objects at top level with regular dot-notation fields
  // Map pickFields recursively over each item in the array
  if (Array.isArray(data) && !fields.some(f => f.startsWith('[].'))) {
    return data.map(item => pickFields(item, fields))
  }

  // Handle array of objects at top level with [] notation
  if (Array.isArray(data) && fields.some(f => f.startsWith('[].'))) {
    const result = data.map(item => {
      const obj = {}
      for (const field of fields) {
        if (field.startsWith('[].')) {
          const nestedField = field.slice(3) // Remove '[].' prefix
          obj[nestedField] = getNestedValue(item, nestedField)
        }
      }
      return obj
    })
    return result
  }

  // Handle single object
  const result = {}
  for (const field of fields) {
    if (field.includes('[].')) {
      // Array notation like "labels[].name"
      const values = getArrayValues(data, field)
      result[field] = values
    } else {
      // Regular dot notation like "user.login"
      result[field] = getNestedValue(data, field)
    }
  }
  return result
}

/**
 * Convert data to YAML format
 * @param {any} data - The data to convert
 * @returns {string} YAML string
 */
function toYAML(data) {
  return YAML.dump(data, { sortKeys: false, lineWidth: -1 }).trim()
}

/**
 * @param {{ url: string, method: string, body?: object, headers?: object, pick?: string[], format?: string }} args
 * @param {string} allowedDomains - comma-separated list of allowed domains from env
 * @param {object} env - environment variables object
 */
export async function handler({ url, method = 'GET', body, headers = {}, pick, format = 'yaml' }, allowedDomains, env) {
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

      // Apply transformations only to JSON responses
      // 1. Apply pick (field extraction) - even if pick is an empty array
      if (pick) {
        responseBody = pickFields(responseBody, pick)
      }

      // 2. Apply format (YAML or JSON)
      if (format === 'yaml') {
        responseBody = toYAML(responseBody)
      }
      // else format === 'json', keep as object
    } else {
      responseBody = await response.text()
      // Non-JSON responses pass through unchanged
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

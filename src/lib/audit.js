/**
 * Audit Logging System
 * Logs all MCP tool calls with sanitization of sensitive data
 */

import fs from 'node:fs/promises'
import { config } from './config.js'

const SENSITIVE_KEYS = ['token', 'password', 'secret', 'key']

/**
 * Audit log a tool execution
 * @param {string} toolName - Name of the tool
 * @param {Object} input - Input arguments to the tool
 * @param {Object} result - Result from the tool execution
 */
export async function auditLog(toolName, input, result) {
  // Check if auditing is enabled
  if (!config.audit?.enabled) {
    return
  }

  // Strip sensitive keys from input
  const cleanInput = { ...input }
  for (const key of Object.keys(cleanInput)) {
    for (const sensitiveKey of SENSITIVE_KEYS) {
      if (key.toLowerCase().includes(sensitiveKey.toLowerCase())) {
        delete cleanInput[key]
      }
    }
  }

  // Build the log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    tool: toolName,
    input: cleanInput,
    success: result?.success ?? true,
  }

  // Write to log file
  const logPath = config.audit.log_path
  try {
    await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n')
  } catch (err) {
    // Swallow errors - don't crash the server
    console.error('Audit log write error:', err.message)
  }
}

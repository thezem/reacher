/**
 * Browser tool
 * Controls a headless browser by running agent-browser CLI commands via CDP
 */

import { z } from 'zod'
import { spawn } from 'child_process'

export const name = 'browser'

export const description =
  'Control a headless browser by running agent-browser CLI commands. ' +
  'Connects to a running Lightpanda (or any CDP-compatible browser) via CDP. ' +
  'agent-browser maintains its own daemon session between calls.'

export const schema = {
  command: z
    .string()
    .describe('agent-browser command to run. Examples: "open https://example.com", "snapshot -i", "click @e2", "fill @e3 hello", "close"'),
}

/**
 * Parse a command string into an args array, respecting quoted strings.
 * e.g. fill @e3 "hello world" => ['fill', '@e3', 'hello world']
 * @param {string} cmd
 * @returns {string[]}
 */
function parseArgs(cmd) {
  const args = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]

    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true
      quoteChar = ch
    } else if (ch === ' ') {
      if (current.length > 0) {
        args.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }

  if (current.length > 0) {
    args.push(current)
  }

  return args
}

/**
 * @param {{ command: string }} args
 * @param {NodeJS.ProcessEnv} env
 */
export async function handler({ command }, env = process.env) {
  const host = env.BROWSER_CDP_HOST ?? '127.0.0.1'
  const port = env.BROWSER_CDP_PORT ?? '9222'

  const cmdArgs = parseArgs(command)
  const spawnArgs = ['--cdp', `ws://${host}:${port}`, ...cmdArgs]

  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''

    const proc = spawn('agent-browser', spawnArgs, {
      timeout: 30_000,
    })

    proc.stdout.on('data', data => {
      stdout += data.toString()
    })

    proc.stderr.on('data', data => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      resolve({
        success: code === 0,
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
      })
    })

    proc.on('error', error => {
      const isNotFound = error.code === 'ENOENT'
      resolve({
        success: false,
        command,
        stdout: '',
        stderr: isNotFound
          ? 'agent-browser binary not found. Run `npm install -g agent-browser` on the server where Reacher is deployed.'
          : error.message,
        exitCode: 127,
        error: error.message,
      })
    })
  })
}

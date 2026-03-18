/**
 * SSH Execute tool
 * Runs shell commands on remote devices via Tailscale SSH
 */

import { z } from 'zod'
import fs from 'fs'
import { spawn } from 'child_process'
import { config } from '../lib/config.js'

/**
 * Encode a string as Base64-encoded UTF-16LE for PowerShell -EncodedCommand
 * @param {string} str
 * @returns {string}
 */
function toBase64Utf16Le(str) {
  const buf = Buffer.alloc(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    buf.writeUInt16LE(str.charCodeAt(i), i * 2);
  }
  return buf.toString('base64');
}

export const name = 'ssh_exec';

export const description =
  'Execute a shell command on a remote device via Tailscale SSH. ' +
  'Uses Tailscale hostnames — no manual SSH key setup required.';

export const schema = {
  hostname: z.string().describe('Tailscale hostname of the target device (e.g. "myserver")'),
  command: z.string().describe('Shell command to execute on the remote device'),
  user: z
    .string()
    .optional()
    .default('hazem')
    .describe('SSH user to connect as (default: hazem)'),
  shell: z
    .enum(['cmd', 'powershell'])
    .optional()
    .default('cmd')
    .describe('Shell to use on Windows (cmd or powershell; default: cmd)'),
};

/**
 * @param {{ hostname: string, command: string, user: string, shell: string }} args
 */
export async function handler({ hostname, command, user, shell = 'cmd' }) {
  // ---
  // Safety checks
  // ---

  // Check for blocked commands
  const blockedCommands = config.ssh.blocked_commands || []
  for (const blocked of blockedCommands) {
    if (command.toLowerCase().includes(blocked.toLowerCase())) {
      return {
        success: false,
        blocked: true,
        reason: 'Command blocked by reacher config',
        matched_rule: blocked,
        hostname,
        user,
        command,
      }
    }
  }

  // Check for allowed directories
  const allowedDirs = config.ssh.allowed_dirs || []
  if (allowedDirs.length > 0) {
    // Extract paths from command (tokens starting with /, ~, or ./)
    const pathTokens = command.match(/(?:^|\s)(\/[\S]*|~[\S]*|\.\/[\S]*)/g) || []
    const paths = pathTokens.map(p => p.trim())

    for (const path of paths) {
      const isAllowed = allowedDirs.some(allowedDir => path.startsWith(allowedDir))
      if (!isAllowed) {
        return {
          success: false,
          blocked: true,
          reason: 'Path not in allowed directories',
          hostname,
          user,
          command,
        }
      }
    }
  }

  // Dry-run mode (after safety checks so blocked commands are still blocked)
  if (config.dry_run) {
    return {
      success: true,
      dry_run: true,
      would_execute: command,
      hostname,
      user,
    }
  }

  // Verify ssh binary exists in the container
  if (!fs.existsSync('/usr/bin/ssh')) {
    return {
      success: false,
      hostname,
      user,
      command,
      stdout: '',
      stderr: 'SSH binary not found at /usr/bin/ssh. Ensure openssh-client is installed in the container.',
      exitCode: 127,
      error: 'ssh: command not found',
    }
  }

  // Set proper permissions on the SSH key (SSH requires 600 for private keys)
  fs.chmodSync('/root/.ssh/reacher-key', 0o600);

  // -o StrictHostKeyChecking=no avoids interactive prompts for new Tailscale hosts
  // -o IdentitiesOnly=yes forces use of only the specified key
  // -i /root/.ssh/reacher-key uses the dedicated reacher key mounted via EasyPanel

  // Build the remote command based on shell type
  let remoteCmd = command;
  if (shell === 'powershell') {
    // Encode the command as Base64 UTF-16LE for PowerShell
    const encoded = toBase64Utf16Le(command);
    remoteCmd = `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`;
  }

  // Build SSH args as array to avoid local shell expansion
  const sshArgs = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'IdentitiesOnly=yes',
    '-i', '/root/.ssh/reacher-key',
    `${user}@${hostname}`,
    remoteCmd,
  ];

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('/usr/bin/ssh', sshArgs, {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        hostname,
        user,
        command,
        shell,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
      });
    });

    proc.on('error', (error) => {
      resolve({
        success: false,
        hostname,
        user,
        command,
        shell,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 1,
        error: error.message,
      });
    });
  });
}

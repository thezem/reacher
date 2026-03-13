/**
 * SSH Execute tool
 * Runs shell commands on remote devices via Tailscale SSH
 */

import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
};

/**
 * @param {{ hostname: string, command: string, user: string }} args
 */
export async function handler({ hostname, command, user }) {
  // -o StrictHostKeyChecking=no avoids interactive prompts for new Tailscale hosts
  const sshCommand = `ssh -o StrictHostKeyChecking=no ${user}@${hostname} "${command.replace(/"/g, '\\"')}"`;

  try {
    const { stdout, stderr } = await execAsync(sshCommand, {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });

    return {
      success: true,
      hostname,
      user,
      command,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    // exec rejects on non-zero exit code too — return structured output either way
    return {
      success: false,
      hostname,
      user,
      command,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? '',
      exitCode: error.code ?? 1,
      error: error.message,
    };
  }
}

/**
 * claude_code_exec tool
 * Fires a headless Claude Code task in the background on a remote machine.
 * Returns a job_id immediately. Use claude_code_status to poll results.
 */

import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const JOBS_DIR = path.join(process.env.CLAUDE_JOBS_DIR || './claude-jobs')

export const name = 'claude_code_exec'

export const description =
  'Run a headless Claude Code task in the background. ' + 'Returns a job_id immediately - use claude_code_status to poll for the result.'

export const schema = {
  prompt: z.string().describe('The task or question to send to Claude Code'),
  cwd: z.string().describe('Working directory to run Claude Code in'),
  hostname: z.string().describe('Tailscale hostname of the target machine'),
  user: z.string().optional().default('user').describe('SSH user on the target machine'),
  model: z.enum(['haiku', 'sonnet']).optional().default('haiku').describe('Claude Code model to use'),
}

export async function handler({ prompt, cwd, hostname, user, model = 'haiku' }) {
  if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true })

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const logFile = path.join(JOBS_DIR, `${jobId}.json`)
  const outFile = path.join(JOBS_DIR, `${jobId}.out`)

  fs.writeFileSync(
    logFile,
    JSON.stringify(
      {
        job_id: jobId,
        status: 'running',
        prompt,
        cwd,
        hostname,
        model,
        started_at: new Date().toISOString(),
        output: null,
        finished_at: null,
      },
      null,
      2,
    ),
  )

  const sshArgs = [
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'IdentitiesOnly=yes',
    '-i',
    '/root/.ssh/reacher-key',
    `${user}@${hostname}`,
    `cd /d "${cwd}" && claude --model ${model} -p "${prompt.replace(/"/g, '\\"')}" > "${outFile}" 2>&1 && node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('${logFile.replace(/\\/g, '\\\\')}'));j.status='done';j.output=fs.readFileSync('${outFile.replace(/\\/g, '\\\\')}','utf8');j.finished_at=new Date().toISOString();fs.writeFileSync('${logFile.replace(/\\/g, '\\\\')}',JSON.stringify(j,null,2));"`,
  ]

  const proc = spawn('/usr/bin/ssh', sshArgs, { detached: true, stdio: 'ignore' })
  proc.unref()

  return { job_id: jobId, status: 'running' }
}

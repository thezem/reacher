import { z } from 'zod'
import fs from 'fs'
import path from 'path'

const JOBS_DIR = path.join(process.env.CLAUDE_JOBS_DIR || './claude-jobs')

export const name = 'claude_code_status'
export const description = 'Poll the result of a background Claude Code job by job_id.'

export const schema = {
  job_id: z.string().describe('Job ID returned by claude_code_exec'),
}

export async function handler({ job_id }) {
  const logFile = path.join(JOBS_DIR, `${job_id}.json`)
  if (!fs.existsSync(logFile)) return { success: false, error: `Job ${job_id} not found` }
  return JSON.parse(fs.readFileSync(logFile, 'utf8'))
}

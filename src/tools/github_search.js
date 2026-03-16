/**
 * GitHub Search tool
 * Searches GitHub for pull requests or commits with clean minimal output
 */

import { z } from 'zod'

export const name = 'github_search'

export const description = 'Search GitHub for pull requests or commits. Returns clean minimal output with only essential fields.'

export const schema = {
  type: z.enum(['prs', 'commits']).describe('Search type: pull requests or commits'),
  repo: z.string().describe('Repository in format "owner/repo" (e.g. "thezem/reacher")'),
  author: z.string().describe('GitHub username (e.g. "thezem")'),
  created_after: z.string().describe('ISO date string (e.g. "2026-03-02") - search for items created after this date'),
  per_page: z.number().int().min(1).max(100).optional().default(25).describe('Results per page (default: 25, max: 100)'),
}

/**
 * Token injection map - loaded from FETCH_EXTERNAL_TOKEN_MAP env var (JSON string)
 * Format: {"api.github.com": "ENV_VAR_NAME"}
 */
const TOKEN_INJECTION_MAP = JSON.parse(process.env.FETCH_EXTERNAL_TOKEN_MAP || '{}')

/**
 * @param {{ type: 'prs'|'commits', repo: string, author: string, created_after: string, per_page?: number }} args
 * @param {string} allowedDomains - comma-separated list of allowed domains
 * @param {object} env - environment variables object
 */
export async function handler({ type, repo, author, created_after, per_page = 25 }, allowedDomains, env) {
  try {
    const hostname = 'api.github.com'

    // Check if domain is allowed
    const allowedList = (allowedDomains || '')
      .split(',')
      .map(d => d.trim())
      .filter(d => d)

    if (!allowedList.includes(hostname)) {
      return {
        success: false,
        error: 'Domain not allowed',
        hostname,
      }
    }

    let url
    const headers = {}

    // Build the GitHub search URL based on type
    if (type === 'prs') {
      const q = encodeURIComponent(`repo:${repo} type:pr author:${author} created:>=${created_after}`)
      url = `https://${hostname}/search/issues?q=${q}&per_page=${per_page}`
    } else if (type === 'commits') {
      const q = encodeURIComponent(`repo:${repo} author:${author} committer-date:>=${created_after}`)
      url = `https://${hostname}/search/commits?q=${q}&per_page=${per_page}`
      // Commits search requires special Accept header
      headers['Accept'] = 'application/vnd.github.cloak-preview'
    } else {
      return {
        success: false,
        error: 'Invalid type. Must be "prs" or "commits".',
      }
    }

    // Inject GitHub token if available
    const tokenEnvVar = TOKEN_INJECTION_MAP[hostname]
    if (tokenEnvVar && env[tokenEnvVar]) {
      headers['Authorization'] = `Bearer ${env[tokenEnvVar]}`
    }

    // Make the request
    const response = await fetch(url, { headers })

    if (!response.ok) {
      const errorBody = await response.text()
      return {
        success: false,
        status: response.status,
        error: `GitHub API error: ${response.statusText}`,
        body: errorBody,
      }
    }

    const data = await response.json()

    // Extract and return clean minimal output based on type
    if (type === 'prs') {
      return {
        success: true,
        items: data.items.map(item => ({
          number: item.number,
          title: item.title,
          url: item.html_url,
          state: item.state,
          draft: item.draft || false,
          merged: item.pull_request?.merged_at != null,
          created_at: item.created_at.split('T')[0], // ISO date only
        })),
      }
    } else {
      // commits
      return {
        success: true,
        items: data.items.map(item => ({
          sha: item.sha.substring(0, 7), // Short SHA
          message: item.commit.message.split('\n')[0], // First line only
          date: item.commit.committer.date.split('T')[0], // ISO date only
          url: item.html_url,
        })),
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}

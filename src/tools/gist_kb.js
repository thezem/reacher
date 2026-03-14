/**
 * Gist Knowledge Base tool
 * Wraps the GitHub Gist API as a private personal knowledge base.
 * All gists are namespaced by filename prefix cc--.
 */

import { z } from 'zod'

export const name = 'gist_kb'

export const description =
  'Manage a private personal knowledge base backed by GitHub Gists. ' +
  'All entries are namespaced with the cc-- filename prefix automatically. ' +
  'Supports list, get, create, update, and delete operations.'

export const schema = {
  action: z.enum(['list', 'get', 'create', 'update', 'delete']),
  id: z.string().optional().describe('Gist ID - required for get, update, delete'),
  title: z.string().optional().describe('Filename without prefix - tool adds cc-- automatically'),
  content: z.string().optional().describe('File content - required for create and update'),
  description: z.string().optional().describe('Gist description'),
}

const BASE_URL = 'https://api.github.com/gists'
const PREFIX = 'cc--'

function enforcePrefix(title) {
  if (!title) return title
  return title.startsWith(PREFIX) ? title : `${PREFIX}${title}`
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }
}

async function ghFetch(url, options) {
  const res = await fetch(url, options)
  if (res.status === 204) return { success: true }
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${body.message || JSON.stringify(body)}`)
  }
  return body
}

/**
 * @param {object} args
 * @param {{ GITHUB_TOKEN: string }} env
 */
export async function handler(args, env) {
  const token = env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not set in the environment')

  const { action, id, content, description } = args
  const title = enforcePrefix(args.title)
  const headers = githubHeaders(token)

  switch (action) {
    case 'list': {
      // Paginate through all gists and filter to cc-- ones
      let page = 1
      const matched = []
      while (true) {
        const gists = await ghFetch(`${BASE_URL}?per_page=100&page=${page}`, { headers })
        if (!Array.isArray(gists) || gists.length === 0) break
        for (const g of gists) {
          const fileNames = Object.keys(g.files || {})
          if (fileNames.some(f => f.startsWith(PREFIX))) {
            matched.push({
              id: g.id,
              description: g.description,
              files: fileNames.filter(f => f.startsWith(PREFIX)),
              created_at: g.created_at,
              updated_at: g.updated_at,
            })
          }
        }
        if (gists.length < 100) break
        page++
      }
      return { success: true, count: matched.length, gists: matched }
    }

    case 'get': {
      if (!id) throw new Error('id is required for get')
      const gist = await ghFetch(`${BASE_URL}/${id}`, { headers })
      const files = {}
      for (const [fname, fdata] of Object.entries(gist.files || {})) {
        files[fname] = fdata.content
      }
      return {
        success: true,
        id: gist.id,
        description: gist.description,
        created_at: gist.created_at,
        updated_at: gist.updated_at,
        files,
      }
    }

    case 'create': {
      if (!title) throw new Error('title is required for create')
      if (!content) throw new Error('content is required for create')
      const body = {
        description: description || '',
        public: false,
        files: { [title]: { content } },
      }
      const gist = await ghFetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      return {
        success: true,
        id: gist.id,
        description: gist.description,
        file: title,
        created_at: gist.created_at,
      }
    }

    case 'update': {
      if (!id) throw new Error('id is required for update')
      if (!title) throw new Error('title is required for update')
      if (!content) throw new Error('content is required for update')
      const body = {
        files: { [title]: { content } },
      }
      const gist = await ghFetch(`${BASE_URL}/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
      return {
        success: true,
        id: gist.id,
        file: title,
        updated_at: gist.updated_at,
      }
    }

    case 'delete': {
      if (!id) throw new Error('id is required for delete')
      await ghFetch(`${BASE_URL}/${id}`, { method: 'DELETE', headers })
      return { success: true, id, deleted: true }
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

/**
 * MCP Server
 * Uses McpServer from the SDK for clean tool registration via server.tool()
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// Import tools - each exports: name, description, schema (ZodRawShape), handler
import * as sshExec from './tools/ssh_exec.js'
import * as tailscaleStatus from './tools/tailscale_status.js'
import * as fetchExternal from './tools/fetch_external.js'
import * as gistKb from './tools/gist_kb.js'
import * as browser from './tools/browser.js'
import * as githubSearch from './tools/github_search.js'

// Import audit logging
import { auditLog } from './lib/audit.js'

/**
 * Create and configure the MCP server with all tools registered.
 * @param {Object} env - process.env (or subset with required keys)
 * @returns {McpServer}
 */
export function createMCPServer(env) {
  const server = new McpServer({
    name: 'personal-mcp-server',
    version: '1.0.0',
  })

  // -------------------------------------------------------------------------
  // Core tools — always available
  // -------------------------------------------------------------------------

  server.tool(fetchExternal.name, fetchExternal.description, fetchExternal.schema, async args => {
    const result = await fetchExternal.handler(args, env.PROXY_ALLOWED_DOMAINS, env)
    await auditLog(fetchExternal.name, args, result)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  server.tool(browser.name, browser.description, browser.schema, async args => {
    const result = await browser.handler(args, env)
    await auditLog(browser.name, args, result)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  // -------------------------------------------------------------------------
  // GitHub tools — require GITHUB_TOKEN
  // -------------------------------------------------------------------------

  if (env.GITHUB_TOKEN) {
    server.tool(gistKb.name, gistKb.description, gistKb.schema, async args => {
      const result = await gistKb.handler(args, env)
      await auditLog(gistKb.name, args, result)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    })

    server.tool(githubSearch.name, githubSearch.description, githubSearch.schema, async args => {
      const result = await githubSearch.handler(args, env.PROXY_ALLOWED_DOMAINS, env)
      await auditLog(githubSearch.name, args, result)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    })
  }

  // -------------------------------------------------------------------------
  // SSH / Tailscale tools — require TAILSCALE_API_KEY
  // -------------------------------------------------------------------------

  if (env.TAILSCALE_API_KEY) {
    server.tool(sshExec.name, sshExec.description, sshExec.schema, async args => {
      const result = await sshExec.handler(args)
      await auditLog(sshExec.name, args, result)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    })

    server.tool(tailscaleStatus.name, tailscaleStatus.description, tailscaleStatus.schema, async args => {
      const result = await tailscaleStatus.handler(args, env.TAILSCALE_API_KEY)
      await auditLog(tailscaleStatus.name, args, result)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    })
  }

  return server
}

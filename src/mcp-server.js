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
  // ssh_exec - no env vars needed
  // -------------------------------------------------------------------------
  server.tool(sshExec.name, sshExec.description, sshExec.schema, async args => {
    const result = await sshExec.handler(args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  // -------------------------------------------------------------------------
  // tailscale_status - needs TAILSCALE_API_KEY
  // -------------------------------------------------------------------------
  server.tool(tailscaleStatus.name, tailscaleStatus.description, tailscaleStatus.schema, async args => {
    const result = await tailscaleStatus.handler(args, env.TAILSCALE_API_KEY)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  // -------------------------------------------------------------------------
  // fetch_external - needs PROXY_ALLOWED_DOMAINS + auth tokens
  // -------------------------------------------------------------------------
  server.tool(fetchExternal.name, fetchExternal.description, fetchExternal.schema, async args => {
    const result = await fetchExternal.handler(args, env.PROXY_ALLOWED_DOMAINS, env)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  // -------------------------------------------------------------------------
  // gist_kb - needs GITHUB_TOKEN
  // -------------------------------------------------------------------------
  server.tool(gistKb.name, gistKb.description, gistKb.schema, async args => {
    const result = await gistKb.handler(args, env)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  // -------------------------------------------------------------------------
  // browser - uses BROWSER_CDP_HOST and BROWSER_CDP_PORT env vars
  // -------------------------------------------------------------------------
  server.tool(browser.name, browser.description, browser.schema, async args => {
    const result = await browser.handler(args, env)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  return server
}

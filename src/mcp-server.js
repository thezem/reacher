/**
 * MCP Server
 * Uses McpServer from the SDK for clean tool registration via server.tool()
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import tools - each exports: name, description, schema (ZodRawShape), handler
import * as sshExec from './tools/ssh_exec.js';
import * as tailscaleStatus from './tools/tailscale_status.js';
import * as uploadFile from './tools/upload_file.js';
import * as sendTelegram from './tools/send_telegram.js';

/**
 * Create and configure the MCP server with all tools registered.
 * @param {Object} env - process.env (or subset with required keys)
 * @returns {McpServer}
 */
export function createMCPServer(env) {
  const server = new McpServer({
    name: 'personal-mcp-server',
    version: '1.0.0',
  });

  // -------------------------------------------------------------------------
  // ssh_exec - no env vars needed
  // -------------------------------------------------------------------------
  server.tool(
    sshExec.name,
    sshExec.description,
    sshExec.schema,
    async (args) => {
      const result = await sshExec.handler(args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // -------------------------------------------------------------------------
  // tailscale_status - needs TAILSCALE_API_KEY
  // -------------------------------------------------------------------------
  server.tool(
    tailscaleStatus.name,
    tailscaleStatus.description,
    tailscaleStatus.schema,
    async (args) => {
      const result = await tailscaleStatus.handler(args, env.TAILSCALE_API_KEY);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // -------------------------------------------------------------------------
  // upload_file - no env vars needed
  // -------------------------------------------------------------------------
  server.tool(
    uploadFile.name,
    uploadFile.description,
    uploadFile.schema,
    async (args) => {
      const result = await uploadFile.handler(args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // -------------------------------------------------------------------------
  // send_telegram - needs TELEGRAM_BOT_TOKEN + DEFAULT_CHAT_ID
  // -------------------------------------------------------------------------
  server.tool(
    sendTelegram.name,
    sendTelegram.description,
    sendTelegram.schema,
    async (args) => {
      const result = await sendTelegram.handler(args, env.TELEGRAM_BOT_TOKEN, env.DEFAULT_CHAT_ID);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

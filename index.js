#!/usr/bin/env node

/**
 * Personal MCP Server
 * Entry point - Express + Streamable HTTP transport
 */

import 'dotenv/config';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from './src/mcp-server.js';

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

function validateEnv() {
  const required = ['TAILSCALE_API_KEY', 'TELEGRAM_BOT_TOKEN', 'DEFAULT_CHAT_ID'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\nPlease set them in .env or as environment variables');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  validateEnv();

  const port = parseInt(process.env.PORT || '3000', 10);

  // MCP server is created once - tool registrations are stateless closures
  const mcpServer = createMCPServer(process.env);

  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // MCP endpoint - a fresh transport is created per request (stateless / no sessions)
  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => transport.close());

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const httpServer = app.listen(port, () => {
    console.log(`✅ MCP Server started on http://localhost:${port}`);
    console.log(`   POST http://localhost:${port}/mcp`);
    console.log(`   GET  http://localhost:${port}/health`);
    console.log(`📋 Tools: ssh_exec, tailscale_status, upload_file, send_telegram`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    httpServer.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Personal MCP Server
 * Entry point - Express + Streamable HTTP transport
 */

import 'dotenv/config'
import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMCPServer } from './src/mcp-server.js'
import { config } from './src/lib/config.js'

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

function validateEnv() {
  // Only MCP_SECRET is strictly required — everything else gates individual tools
  const required = ['MCP_SECRET']
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error('\nPlease set them in .env or as environment variables')
    process.exit(1)
  }

  // Inform which feature sets are active
  if (!process.env.GITHUB_TOKEN) {
    console.warn('⚠️  GITHUB_TOKEN not set — gist_kb and github_search will be unavailable')
  }
  if (!process.env.TAILSCALE_API_KEY) {
    console.warn('⚠️  TAILSCALE_API_KEY not set — ssh_exec and tailscale_status will be unavailable')
  }
  if (!process.env.PROXY_ALLOWED_DOMAINS) {
    console.warn('⚠️  PROXY_ALLOWED_DOMAINS not set — fetch_external will block all requests')
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  validateEnv()

  const port = parseInt(process.env.PORT || '3000', 10)

  // MCP server is created once - tool registrations are stateless closures
  const mcpServer = createMCPServer(process.env)

  const app = express()
  app.use(express.json())

  // Token-based authentication middleware
  app.use((req, res, next) => {
    const secret = process.env.MCP_SECRET
    const token = req.query.token

    if (!token || token !== secret) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    next()
  })

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      dry_run: config.dry_run,
    })
  })

  // MCP endpoint - a fresh transport is created per request (stateless / no sessions)
  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })

    res.on('close', () => transport.close())

    await mcpServer.connect(transport)
    await transport.handleRequest(req, res, req.body)
  })

  const httpServer = app.listen(port, () => {
    console.log(`✅ MCP Server started on http://localhost:${port}`)
    console.log(`   POST http://localhost:${port}/mcp`)
    console.log(`   GET  http://localhost:${port}/health`)

    const activeTools = ['fetch_external', 'browser']
    if (process.env.GITHUB_TOKEN) activeTools.push('gist_kb', 'github_search')
    if (process.env.TAILSCALE_API_KEY) activeTools.push('ssh_exec', 'tailscale_status')
    console.log(`📋 Active tools: ${activeTools.join(', ')}`)
    console.log(`ℹ️  browser requires: agent-browser (npm i -g agent-browser) + CDP browser on ws://${process.env.BROWSER_CDP_HOST || '127.0.0.1'}:${process.env.BROWSER_CDP_PORT || '9222'}`)

    if (config.dry_run) {
      console.log(`⚠️  DRY RUN MODE - ssh_exec will not execute commands`)
    }
  })

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...')
    httpServer.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

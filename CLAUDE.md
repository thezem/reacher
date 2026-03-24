# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Reacher** is a self-hosted MCP (Model Context Protocol) server that gives Claude access to:

- SSH execution on Tailscale devices
- Device discovery and status
- Authenticated HTTP proxying with per-domain token injection
- GitHub search (PRs and commits)
- Persistent knowledge base (GitHub Gists)
- Headless browser control

The server runs as an Express.js HTTP service with token-based auth and communicates with Claude via the MCP protocol.

## Architecture

### Core Stack

- **Runtime**: Node.js 22+ (uses ES modules, no CommonJS)
- **Framework**: Express.js for HTTP + @modelcontextprotocol/sdk for MCP
- **Transport**: StreamableHTTPServerTransport (stateless - new transport per request)
- **Config**: dotenv for environment variables
- **Validation**: Zod for schema definitions

### Request Flow

1. Claude sends HTTP POST to `/mcp?token=MCP_SECRET` with JSON-RPC body
2. Express middleware validates token
3. MCP transport creates new handler per request
4. Tool handler executes and returns result as JSON
5. Response streamed back to Claude

### Tool Pattern

Every tool in `src/tools/*.js` exports:

```javascript
export const name = 'tool_name'
export const description = '...'
export const schema = { param: z.string().describe('...') } // Zod shape
export async function handler(args, allowedDomains?, env) { ... }
```

Different tools receive different parameters:

- **ssh_exec**: `handler(args)` - no env
- **tailscale_status**: `handler(args, apiKey)` - specific API key
- **fetch_external, github_search**: `handler(args, allowedDomains, env)` - whitelist + full env
- **gist_kb, browser**: `handler(args, env)` - full env object

Each tool is registered in `src/mcp-server.js` with `server.tool(...)`.

## Development

### Common Commands

```bash
# Install dependencies
npm install

# Run with auto-reload (recommended for dev)
npm run dev

# Build Docker image
npm run docker:build

# Run Docker locally (single shot, connects to .env)
npm run docker:run

# Run Docker production (daemonized with restart)
npm run docker:run:prod
```

### Environment Variables

Create `.env` from `.env.example`. Key vars:

- **MCP_SECRET**: Token for /mcp endpoint auth (set to random string)
- **TAILSCALE_API_KEY**: For tailscale_status tool
- **GITHUB_TOKEN**: For gist_kb and github_search tools (needs gist scope)
- **PROXY_ALLOWED_DOMAINS**: Comma-separated list for fetch_external (e.g. `api.github.com,api.linear.app`)
- **FETCH_EXTERNAL_TOKEN_MAP**: JSON mapping domain → env var name (e.g. `{"api.github.com":"GITHUB_TOKEN"}`)
- **PORT**: HTTP port (default 3000)
- **BROWSER_CDP_HOST/PORT**: Headless browser connection (defaults: 127.0.0.1:9222)

### Adding a New Tool

1. Create `src/tools/my_tool.js` with the standard export pattern
2. Import and register in `src/mcp-server.js` with `server.tool(...)`
3. Update documentation (README.md, AGENT.MD) to list the new tool
4. No tests needed unless tool integrates with external APIs

### Authentication & Token Injection

The **fetch_external** and **github_search** tools use a token injection pattern:

- `FETCH_EXTERNAL_TOKEN_MAP` maps domain → env var name
- Handler reads this map and automatically injects `Authorization: Bearer <token>` header
- No hardcoding of tokens; they stay server-side

Example: If `FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN"}` and `GITHUB_TOKEN=ghp_xxx`, any call to `api.github.com` gets the token injected automatically.

### Domain Whitelisting

Both **fetch_external** and **github_search** require the target domain to be in `PROXY_ALLOWED_DOMAINS`. This prevents the server from proxying requests to arbitrary domains. The handler checks:

```javascript
const allowedList = (allowedDomains || '')
  .split(',')
  .map(d => d.trim())
  .filter(d => d)

if (!allowedList.includes(hostname)) {
  return { success: false, error: 'Domain not allowed', hostname }
}
```

## Deployment

### Docker (Recommended)

```bash
# Build and run in one command
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  --name reacher \
  $(docker build -q .)
```

### Bare Node

```bash
npm install
node index.js
```

The server exposes:

- **POST /mcp** - MCP protocol endpoint (requires `?token=MCP_SECRET`)
- **GET /health** - Health check (no auth required)

### Connecting to Claude.ai

1. Go to **Claude.ai** > **Settings** > **Integrations**
2. Click **Add custom connector**
3. Enter server URL: `https://yourdomain.com/mcp?token=YOUR_MCP_SECRET`
4. Authenticate

## Key Design Decisions

1. **Stateless Transports**: New MCP transport created per request. No session state stored on server.
2. **Token Injection**: Tokens stay server-side; Claude never sees them. Configured via `FETCH_EXTERNAL_TOKEN_MAP`.
3. **Domain Whitelisting**: Both fetch_external and github_search enforce strict domain allowlists to prevent misuse.
4. **ES Modules Only**: No CommonJS. `"type": "module"` in package.json.
5. **Zod Schemas**: All tool parameters validated using Zod. Descriptions appear in Claude's tool documentation.
6. **Handler Signature Variance**: Different tools receive different env parameters to minimize exposure (least privilege principle).

## Important Notes

- The server requires `MCP_SECRET` to be set; requests without the correct token are rejected with 401.
- Tailscale SSH must be enabled on target devices for `ssh_exec` to work: `sudo tailscale up --ssh`
- GitHub token needs `gist` scope for `gist_kb` tool and any other API scopes needed by `fetch_external`/`github_search`.
- Browser tool requires `agent-browser` CLI to be installed globally and a CDP-compatible browser running (e.g. Lightpanda).

## Documentation Files

- **README.md**: High-level overview, tools table, prerequisites, setup, deployment options
- **QUICKSTART.md**: Step-by-step setup guide, credential acquisition, verification
- **AGENT.MD**: Claude-specific guide on how to use each tool, first-time setup checklist, troubleshooting

# Reacher

Give Claude SSH access to your entire device network. Reacher is a self-hosted MCP server that lets Claude run commands on any machine in your Tailscale network, proxy authenticated API requests, and maintain a persistent knowledge base - all through a single server you control.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

## What it does

Reacher connects to Claude as a custom MCP connector. Once connected, Claude can SSH into any online device in your Tailscale mesh and run arbitrary shell commands - check running containers, tail logs, restart services, whatever. It can also proxy outbound HTTP requests with per-domain auth token injection (so Claude can hit the GitHub API with your token without you hardcoding it into prompts), and read/write a private knowledge base backed by GitHub Gists that persists across conversations.

## Tools

| Tool | What it does | Key use case |
| --- | --- | --- |
| `ssh_exec` | Run shell commands on any Tailscale device | Manage servers, check logs, run deployments |
| `tailscale_status` | List all devices with online/offline status, IPs, OS | Discover hostnames before SSHing, debug connectivity |
| `fetch_external` | Proxy HTTP requests with injected auth per domain | Call GitHub, Jira, or any API without pasting tokens |
| `gist_kb` | Read/write a private knowledge base backed by GitHub Gists | Persist notes, configs, and context across conversations |

## Prerequisites

- A [Tailscale](https://tailscale.com) account with your devices enrolled in a mesh network
- Node.js 18+ (or Docker)
- A VPS or always-on machine to host the server (it needs to be reachable from Claude.ai)
- A Tailscale API key and a GitHub personal access token

## Using with Claude

Drop [AGENT.MD](AGENT.MD) into your Claude session (paste at the start of a new conversation) and Claude will figure out the rest - it'll discover your devices, probe SSH access, and save a device map to your gist so future sessions pick up where you left off. No setup instructions needed. Just connect the MCP server and paste the file.

## Setup

Copy `.env.example` to `.env` and fill in your credentials, then choose your runtime:

**Docker (recommended)**

```bash
git clone https://github.com/your-username/reacher.git
cd reacher
cp .env.example .env
# edit .env with your keys
docker build -t reacher .
docker run -d -p 3000:3000 --env-file .env --restart unless-stopped --name reacher reacher
```

**Bare Node**

```bash
git clone https://github.com/your-username/reacher.git
cd reacher
npm install
cp .env.example .env
# edit .env with your keys
node index.js
```

See [QUICKSTART.md](QUICKSTART.md) for full setup details including Tailscale SSH configuration.

## Connecting to Claude.ai

1. Go to **Claude.ai** > **Settings** > **Integrations**
2. Click **Add custom connector**
3. Paste your server URL (e.g. `https://yourdomain.com/mcp?token=MCP_SECRET`)
4. Authenticate with your `MCP_SECRET`

Claude will now have access to all four tools.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MCP_SECRET` | Yes | Shared secret for authenticating requests to this server |
| `TAILSCALE_API_KEY` | Yes | API key for querying your Tailscale network. Get one at tailscale.com/admin/settings/keys |
| `GITHUB_TOKEN` | Yes | Personal access token for GitHub API calls and Gist read/write |
| `PROXY_ALLOWED_DOMAINS` | Yes | Comma-separated list of domains `fetch_external` is allowed to call (e.g. `api.github.com,api.linear.app`) |
| `PORT` | No | HTTP port to listen on. Defaults to `3000` |

## Adding your own tools

Each tool is a self-contained file in `src/tools/`. To add a new one:

1. Create `src/tools/my_tool.js` - export `name`, `description`, `schema` (a Zod shape), and `handler`
2. Import it in `src/mcp-server.js` and register it with `server.tool(...)`

That's the whole pattern. Look at any existing tool file as a reference.

## Deployment options

- **Docker on any VPS** - build the image, run with `--restart unless-stopped`, done
- **EasyPanel** - connect your GitHub repo, set env vars in the dashboard, it handles builds automatically
- **Railway / Render** - standard Node.js service, set env vars, deploy from GitHub
- **PM2 on a bare VPS** - `pm2 start index.js --name reacher && pm2 save`

The server needs to be publicly reachable over HTTPS for Claude.ai to connect. Most VPS hosts + a reverse proxy (Caddy, Nginx, Traefik) handles this.

## License

MIT

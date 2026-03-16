# Reacher

Reacher is a self-hosted MCP server that turns Claude into a personal infrastructure agent - with authenticated access to your machines, your APIs, and persistent memory across conversations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

<table>
  <tr>
    <td><img src="/imgs/image.png" alt="…" width="320" /></td>
    <td><img src="/imgs/gist_kb.png" alt="…" width="320" /></td>
  </tr>
  <tr>
    <td colspan="2"><img src="/imgs/reacher.png" alt="…" width="640" /></td>
  </tr>
</table>

---

## The problem with official MCP connectors

Official connectors give you 40 tools when you need 3. They live in someone else's sandbox, they don't know your machines, and they reset when the conversation ends.

Reacher is the alternative. One server you own. One authenticated proxy. Every API you care about is just an allowed domain away - no new connector, no new tool, just a new line in your config.

---

## What Reacher actually is

A trust boundary with tools attached.

The VPS is neutral ground - not your laptop, not Anthropic's servers, yours. When Claude calls `ssh_exec` to reach one of your machines, it goes through a server you control, authenticated with a key you own, over your Tailscale mesh. The whole chain is yours.

The tools are almost secondary to that. `ssh_exec`, `fetch_external`, `gist_kb`, `browser` - these are the current surface area. The real asset is the authenticated, persistent, always-on bridge itself.

### The fetch_external insight

This is the part worth understanding before you look at anything else.

Adding GitHub support to Reacher is not "install the GitHub MCP connector." It's adding `api.github.com` to your allowed domains list. Same tool, same authenticated proxy, new target. Claude already knows REST APIs - it doesn't need a dedicated `github_list_prs` tool. It just needs a way to call the API with your token, without you pasting it into every prompt.

That's what `fetch_external` does. It injects your credentials automatically by domain. Every API that needs auth becomes a one-line addition to your `.env`. Not a new integration project. Not a new connector to install and manage.

```
PROXY_ALLOWED_DOMAINS=api.github.com,api.linear.app,api.notion.com
```

That's three integrations. *One tool.*

---

## Tools

| Tool | What it does | Key use case |
| --- | --- | --- |
| `ssh_exec` | Run shell commands on any Tailscale device | Manage servers, check logs, run deployments |
| `tailscale_status` | List all devices with online/offline status, IPs, OS | Discover hostnames before SSHing, debug connectivity |
| `fetch_external` | Proxy HTTP requests with injected auth per domain | Call GitHub, Jira, or any API without pasting tokens |
| `github_search` | Search GitHub for pull requests or commits | Find work by author and date range with minimal output |
| `gist_kb` | Read/write a private knowledge base backed by GitHub Gists | Persist notes, configs, and context across conversations |
| `browser` | Control a headless browser via CDP using `agent-browser` CLI | Scrape pages, fill forms, take snapshots, automate web tasks |

---

## Prerequisites

- A [Tailscale](https://tailscale.com) account with your devices enrolled in a mesh network
- Node.js 18+ (or Docker)
- A VPS or always-on machine to host the server (needs to be reachable from Claude.ai)
- A Tailscale API key and a GitHub personal access token

---

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

---

## Connecting to Claude.ai

1. Go to **Claude.ai** > **Settings** > **Integrations**
2. Click **Add custom connector**
3. Paste your server URL (e.g. `https://yourdomain.com/mcp?token=MCP_SECRET`)
4. Authenticate with your `MCP_SECRET`

Claude will now have access to all tools.

**Tip:** Drop [AGENT.MD](AGENT.MD) into your Claude session at the start of a new conversation. Claude will discover your devices, probe SSH access, and save a device map to your gist so future sessions pick up where you left off. No manual setup needed.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MCP_SECRET` | Yes | Shared secret for authenticating requests to this server |
| `TAILSCALE_API_KEY` | Yes | API key for querying your Tailscale network. Get one at tailscale.com/admin/settings/keys |
| `GITHUB_TOKEN` | Yes | Personal access token for GitHub API calls and Gist read/write |
| `PROXY_ALLOWED_DOMAINS` | Yes | Comma-separated list of domains `fetch_external` is allowed to call (e.g. `api.github.com,api.linear.app`) |
| `PORT` | No | HTTP port to listen on. Defaults to `3000` |
| `BROWSER_CDP_HOST` | No | Host of the CDP-compatible browser to connect to. Defaults to `127.0.0.1` |
| `BROWSER_CDP_PORT` | No | Port of the CDP-compatible browser. Defaults to `9222` |

---

## Adding your own tools

Each tool is a self-contained file in `src/tools/`. To add a new one:

1. Create `src/tools/my_tool.js` - export `name`, `description`, `schema` (a Zod shape), and `handler`
2. Import it in `src/mcp-server.js` and register it with `server.tool(...)`

That's the whole pattern. Look at any existing tool file as a reference.

---

## Deployment options

- **Docker on any VPS** - build the image, run with `--restart unless-stopped`, done
- **EasyPanel** - connect your GitHub repo, set env vars in the dashboard, it handles builds automatically
- **Railway / Render** - standard Node.js service, set env vars, deploy from GitHub
- **PM2 on a bare VPS** - `pm2 start index.js --name reacher && pm2 save`

The server needs to be publicly reachable over HTTPS for Claude.ai to connect. Most VPS hosts + a reverse proxy (Caddy, Nginx, Traefik) handles this.

---

## License

MIT

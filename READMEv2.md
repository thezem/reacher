# Reacher

A self-hosted MCP server that gives Claude authenticated, persistent access to your machines, your APIs, and a private knowledge base — running on infrastructure you control.

[![v0.1.1](https://img.shields.io/badge/version-0.1.1-blue.svg)](https://github.com/thezem/reacher/releases/tag/v0.1.1) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

<table>
  <tr>
    <td colspan="2"><img src="/imgs/reacher.png" alt="Claude exploring code on a remote machine via Reacher SSH tool" width="640" /></td>
  </tr>
  <tr>
    <td><img src="/imgs/ship.png" alt="Claude + Reacher MCP creating a tag and release for the Reacher repo" width="640" /></td>
  </tr>
</table>

---

## Why Reacher exists

Most MCP connectors give you a dedicated tool per action: `github_list_prs`, `linear_create_issue`, `notion_search`. Every new service means a new connector to install and manage.

Reacher takes a different approach. One tool — `fetch_external` — proxies any HTTP request to any domain on your allowlist, and injects the right auth token automatically. Claude already knows REST APIs. It doesn't need a `github_list_prs` tool; it just needs a way to call `api.github.com` with your token, without you pasting credentials into every prompt.

Adding GitHub, Linear, and Notion support looks like this:

```
PROXY_ALLOWED_DOMAINS=api.github.com,api.linear.app,api.notion.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN","api.linear.app":"LINEAR_TOKEN"}
```

Three APIs. One tool. New credentials added in `.env`, not in a connector marketplace.

The SSH side works the same way. `ssh_exec` reaches any device on your Tailscale mesh by hostname — no manual key management per host. The SSH key lives once on the server, and every device in your mesh is reachable from there.

---

## Tools

| Tool | What it does |
| --- | --- |
| `ssh_exec` | Run shell commands on any Tailscale device via SSH. Supports Linux (`cmd`) and Windows (`powershell`). 30s timeout, 10 MB output cap. |
| `tailscale_status` | List all devices with online/offline status, IPs, and OS. Useful for discovering hostnames before SSHing. |
| `fetch_external` | Proxy HTTP requests to allowlisted domains with automatic auth header injection per domain. |
| `github_search` | Search GitHub pull requests and commits by author and date range. |
| `gist_kb` | Private knowledge base backed by GitHub Gists. All entries are namespaced under the `cc--` filename prefix. Supports list, get, create, update, delete. |
| `browser` | Control a headless browser via CDP using the `agent-browser` CLI. Scrape, fill forms, take snapshots. |

---

## Prerequisites

- A [Tailscale](https://tailscale.com) account with your devices enrolled
- Node.js 18+ or Docker
- A VPS or always-on machine with a public HTTPS URL (required for Claude.ai to connect)
- A Tailscale API key (needs "Devices (read)" scope)
- A GitHub personal access token (needs `gist` read+write scope, plus any scopes for APIs you want to proxy)
- An SSH keypair — the private key must be at `/root/.ssh/reacher-key` in the container (or wherever the server runs)

---

## Setup

Copy `.env.example` to `.env` and `reacher.config.example.yaml` to `reacher.config.yaml`, fill in your values, then pick a runtime:

**Docker (recommended)**

```bash
git clone --branch v0.1.1 https://github.com/thezem/reacher.git
cd reacher
cp reacher.config.example.yaml reacher.config.yaml
cp .env.example .env
# edit both files with your keys
docker compose up -d
```

> **SSH key:** Mount your SSH private key into the container at `/root/.ssh/reacher-key`. The server sets `chmod 600` on it at startup. The corresponding public key must be authorized on your target machines.

**Bare Node**

```bash
git clone --branch v0.1.1 https://github.com/thezem/reacher.git
cd reacher
npm install
cp reacher.config.example.yaml reacher.config.yaml
cp .env.example .env
# edit both files with your keys
node index.js
```

See [SKILL.md](SKILL.md) for a complete AI-agent-readable setup guide, or [QUICKSTART.md](QUICKSTART.md) for full manual details.

---

## Connecting to Claude.ai

1. Go to **Claude.ai** → **Settings** → **Integrations**
2. Click **Add custom connector**
3. Enter your server URL: `https://yourdomain.com/mcp?token=YOUR_MCP_SECRET`
4. Authenticate

Claude will now have access to all tools.

**Tip:** Drop [AGENT.MD](AGENT.MD) into a new Claude session. Claude will discover your devices, probe SSH access, and save a device map to your Gist KB so future sessions start with context already loaded.

---

## Configuration

`reacher.config.yaml` controls safety and behavior. Copy from the example:

```yaml
ssh:
  blocked_commands:
    - 'rm -rf /'
    - 'shutdown'
    - 'reboot'
  allowed_dirs: []  # empty = no restriction; paths use prefix matching

audit:
  enabled: true
  log_path: './reacher-audit.log'

dry_run: false
```

All settings can be overridden by environment variables — see `.env.example` for the full list.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MCP_SECRET` | Yes | Shared secret passed as `?token=` in the URL. Generate with `openssl rand -hex 32`. |
| `TAILSCALE_API_KEY` | Yes | API key for querying your Tailscale network. Needs "Devices (read)" scope. |
| `GITHUB_TOKEN` | Yes | Personal access token for GitHub API and Gist KB. Needs `gist` scope. |
| `PROXY_ALLOWED_DOMAINS` | Yes | Comma-separated domains `fetch_external` can call (e.g. `api.github.com,api.linear.app`). |
| `FETCH_EXTERNAL_TOKEN_MAP` | No | JSON map of domain → env var name for auth injection (e.g. `{"api.github.com":"GITHUB_TOKEN"}`). |
| `SSH_DEFAULT_USER` | No | Default SSH user for `ssh_exec` when not specified per-call. Defaults to `root`. |
| `PORT` | No | HTTP port. Defaults to `3000`. |
| `BROWSER_CDP_HOST` | No | CDP browser host. Defaults to `127.0.0.1`. |
| `BROWSER_CDP_PORT` | No | CDP browser port. Defaults to `9222`. |
| `DRY_RUN` | No | Set `true` to have `ssh_exec` report what it would run without running it. |
| `AUDIT_ENABLED` | No | Enable audit logging. Defaults to `true`. |
| `AUDIT_LOG_PATH` | No | Path to the audit log file. Defaults to `./reacher-audit.log`. |

---

## Safety

Reacher gives Claude real access to your infrastructure. These mechanisms let you define the limits:

- **SSH command blocklist** — `ssh.blocked_commands` in config; substring-matched, case-insensitive
- **Directory allowlist** — `ssh.allowed_dirs` restricts SSH operations to specific path prefixes
- **Audit log** — every tool call logged with timestamp, tool name, and result; sensitive values stripped automatically
- **Dry-run mode** — `DRY_RUN=true` makes `ssh_exec` describe what it would do without executing it
- **Domain allowlist** — `fetch_external` hard-blocks any domain not in `PROXY_ALLOWED_DOMAINS`

---

## Adding your own tools

Each tool is a self-contained file in `src/tools/`. To add one:

1. Create `src/tools/my_tool.js` — export `name`, `description`, `schema` (Zod shape), and `handler`
2. Import and register it in `src/mcp-server.js` with `server.tool(...)`

Any existing tool file is a working reference.

---

## Deployment

- **Docker on any VPS** — `docker compose up -d`, set `--restart unless-stopped`
- **EasyPanel** — connect your GitHub repo, set env vars in the dashboard
- **Railway / Render** — standard Node.js service, deploy from GitHub
- **PM2 on a bare VPS** — `pm2 start index.js --name reacher && pm2 save`

The server needs a public HTTPS URL for Claude.ai to reach it. A reverse proxy (Caddy, Nginx, Traefik) in front handles TLS on most VPS setups.

---

## License

MIT

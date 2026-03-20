# Reacher

A self-hosted MCP server that gives Claude authenticated access to your APIs, a persistent knowledge base, your machines, and a headless browser — on infrastructure you control.

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

## Pick your path

You don't need a VPS. You don't need Tailscale. Start with whatever matches where you are right now.

| What I want | What I need | Time |
|---|---|---|
| Claude can call my APIs + remember things across conversations | Node.js + GitHub token | ~5 min |
| + control a headless browser | Above + a running browser | ~10 min |
| + SSH into my servers and machines | Above + Tailscale + SSH key | ~30 min |

Every feature is opt-in. The server starts with whatever credentials you provide and activates only the tools those credentials unlock.

---

## The core idea

Most MCP connectors give you one tool per API action. `github_list_prs`. `linear_create_issue`. A new connector to install every time you want to talk to a new service.

Reacher's `fetch_external` tool takes a different approach: it proxies any HTTP request to any domain on your allowlist and injects the right auth token automatically. Claude already knows how REST APIs work — it doesn't need a bespoke `github_list_prs` tool. It just needs a way to call `api.github.com` with your token, without you pasting credentials into every prompt.

Adding three APIs looks like this:

```
PROXY_ALLOWED_DOMAINS=api.github.com,api.linear.app,api.notion.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN","api.linear.app":"LINEAR_TOKEN"}
```

That's it. New service = one line in `.env`. No new connector. No new tool.

---

## Tools

| Tool | Needs | What it does |
|---|---|---|
| `fetch_external` | `PROXY_ALLOWED_DOMAINS` | Proxy HTTP requests to allowlisted domains with auto auth injection |
| `browser` | A CDP browser running | Control a headless browser — scrape, click, fill forms, snapshot |
| `gist_kb` | `GITHUB_TOKEN` | Persistent private knowledge base backed by GitHub Gists |
| `github_search` | `GITHUB_TOKEN` | Search PRs and commits by author and date range |
| `ssh_exec` | `TAILSCALE_API_KEY` + SSH key | Run shell commands on any machine in your Tailscale mesh |
| `tailscale_status` | `TAILSCALE_API_KEY` | List all your devices with online/offline status and IPs |

---

## Setup

### Path 1 — Run locally with Claude Code (fastest, zero infrastructure)

Claude Code supports local MCP servers. No public URL, no VPS, no HTTPS required.

```bash
git clone https://github.com/thezem/reacher.git
cd reacher
npm install
cp .env.example .env
```

Edit `.env` — at minimum:

```env
MCP_SECRET=any-random-string
GITHUB_TOKEN=your_github_token
PROXY_ALLOWED_DOMAINS=api.github.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN"}
```

Start the server:

```bash
node index.js
```

Add it to Claude Code by editing your MCP config (usually `~/.claude/mcp.json` or via `/mcp` in Claude Code):

```json
{
  "mcpServers": {
    "reacher": {
      "type": "http",
      "url": "http://localhost:3000/mcp?token=your-mcp-secret"
    }
  }
}
```

You now have API proxying and a persistent knowledge base. No cloud required.

---

### Path 2 — Local machine + Cloudflare Tunnel (for Claude.ai, still no VPS)

Claude.ai needs a public HTTPS URL. Cloudflare Tunnel gives you one for free, with no account required, no port forwarding, no domain.

```bash
# Start Reacher
node index.js

# In a second terminal — gives you a public HTTPS URL instantly
npx cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints something like `https://random-words.trycloudflare.com`. Paste that into Claude.ai:

1. Go to **Claude.ai** → **Settings** → **Integrations**
2. **Add custom connector**
3. URL: `https://random-words.trycloudflare.com/mcp?token=your-mcp-secret`

> **Note:** The Cloudflare Tunnel URL changes every time you restart `cloudflared`. For a stable URL, use a free Cloudflare account with a named tunnel, or move to Path 3.

---

### Path 3 — VPS with SSH access (full setup)

This path adds `ssh_exec` and `tailscale_status` — the ability to run commands on any machine in your Tailscale mesh.

**Additional prerequisites:**
- A [Tailscale](https://tailscale.com) account with your devices enrolled
- A VPS or always-on machine reachable from Claude.ai over HTTPS
- An SSH keypair — the private key must be placed at `/root/.ssh/reacher-key` on the server

**Docker (recommended for VPS)**

```bash
git clone --branch v0.1.1 https://github.com/thezem/reacher.git
cd reacher
cp reacher.config.example.yaml reacher.config.yaml
cp .env.example .env
# add TAILSCALE_API_KEY and SSH_DEFAULT_USER to .env
docker compose up -d
```

Mount your SSH private key into the container:

```yaml
# docker-compose.yml — add to the volumes section
volumes:
  - ~/.ssh/your-private-key:/root/.ssh/reacher-key:ro
```

The server sets `chmod 600` on it at startup. The matching public key must be in `~/.ssh/authorized_keys` on your target machines.

**Expose over HTTPS**

The server needs a public HTTPS URL. Options:
- **Caddy** (simplest): `mcp.yourdomain.com { reverse_proxy localhost:3000 }`
- **EasyPanel** — connect your GitHub repo, it handles builds and HTTPS
- **Railway / Render** — standard Node.js deploy, set env vars, done
- **PM2** — `pm2 start index.js --name reacher && pm2 save`

**Tip:** Drop [AGENT.MD](AGENT.MD) into a new Claude session. Claude will discover your devices, probe SSH access, and save a device map to your Gist KB so future sessions start with context already loaded.

---

## Configuration

`reacher.config.yaml` handles safety settings. Copy from the example and edit:

```yaml
ssh:
  blocked_commands:
    - 'rm -rf /'
    - 'shutdown'
    - 'reboot'
  allowed_dirs: []  # empty = no restriction; uses prefix matching

audit:
  enabled: true
  log_path: './reacher-audit.log'

dry_run: false
```

All settings can be overridden by environment variables — see `.env.example` for the full list.

---

## Environment variables

**Always:**

| Variable | Description |
|---|---|
| `MCP_SECRET` | Shared secret passed as `?token=` in the URL. Generate with `openssl rand -hex 32`. |

**For API tools:**

| Variable | Description |
|---|---|
| `PROXY_ALLOWED_DOMAINS` | Comma-separated domains `fetch_external` can call (e.g. `api.github.com,api.linear.app`). |
| `FETCH_EXTERNAL_TOKEN_MAP` | JSON map of domain → env var name for auth injection (e.g. `{"api.github.com":"GITHUB_TOKEN"}`). |

**For GitHub tools (`gist_kb`, `github_search`):**

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Personal access token. Needs `gist` scope for `gist_kb`; add `repo` scope for private repo search. |

**For SSH tools (`ssh_exec`, `tailscale_status`):**

| Variable | Description |
|---|---|
| `TAILSCALE_API_KEY` | API key for your Tailscale network. Needs "Devices (read)" scope. |
| `SSH_DEFAULT_USER` | Default SSH user for `ssh_exec`. Defaults to `root`. |

**Optional:**

| Variable | Description |
|---|---|
| `PORT` | HTTP port. Defaults to `3000`. |
| `BROWSER_CDP_HOST` | CDP browser host. Defaults to `127.0.0.1`. |
| `BROWSER_CDP_PORT` | CDP browser port. Defaults to `9222`. |
| `DRY_RUN` | Set `true` to have `ssh_exec` log what it would run without executing. |
| `AUDIT_ENABLED` | Enable audit logging. Defaults to `true`. |
| `AUDIT_LOG_PATH` | Path to the audit log. Defaults to `./reacher-audit.log`. |

---

## Safety

Reacher gives Claude real access to your infrastructure. These mechanisms define the limits:

- **SSH command blocklist** — `ssh.blocked_commands` in config; substring-matched, case-insensitive
- **Directory allowlist** — `ssh.allowed_dirs` restricts SSH operations to specific path prefixes
- **Domain allowlist** — `fetch_external` hard-blocks any domain not in `PROXY_ALLOWED_DOMAINS`
- **Audit log** — every tool call logged with timestamp, tool name, and result; sensitive values stripped automatically
- **Dry-run mode** — `DRY_RUN=true` makes `ssh_exec` describe what it would do without running it

---

## Adding your own tools

Each tool is a self-contained file in `src/tools/`. To add one:

1. Create `src/tools/my_tool.js` — export `name`, `description`, `schema` (Zod shape), and `handler`
2. Import and register it in `src/mcp-server.js` following the same pattern

Any existing tool file is a working reference.

---

## License

MIT

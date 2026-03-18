# Reacher

A self-hosted MCP server that gives Claude real access to your machines, APIs, and personal data.

[![v0.1.0](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/thezem/reacher/releases/tag/v0.1.0) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## The Pitch

I gave Claude SSH access to my machines via this server. It went completely unsupervised and migrated my entire Node.js setup — figured out what version I needed, uninstalled the old one, installed nvm, configured it, and tested everything—while I watched from another room. That's what this enables.

Most tools lock Claude in a sandbox. Reacher says: no sandbox. Just authenticated access, audit logs, and command blocklists. Your call.

---

## What It Does

| Tool                 | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| **ssh_exec**         | Run shell commands on any Tailscale device                        |
| **tailscale_status** | List all devices with online/offline status and IPs               |
| **fetch_external**   | Proxy HTTP requests with auto-injected auth per domain            |
| **github_search**    | Search GitHub PRs and commits by author and date                  |
| **gist_kb**          | Persistent knowledge base backed by GitHub Gists                  |
| **browser**          | Control a headless browser via CDP (scrape, fill forms, automate) |

---

## Safety

Reacher includes several safety mechanisms:

- **SSH command blocklist** - Block dangerous commands (configurable in `reacher.config.yaml`)
- **Directory allowlist** - Restrict SSH operations to specific paths (optional)
- **Dry-run mode** - Test commands without executing them
- **Audit logging** - Every tool call is logged to `reacher-audit.log`

All these are configurable. You decide the risk tolerance.

---

## Quick Start

```bash
git clone --branch v0.1.0 https://github.com/thezem/reacher
cd reacher

cp reacher.config.example.yaml reacher.config.yaml
cp .env.example .env

# Edit both files with your credentials, then:
docker compose up -d
```

Check it's running:

```bash
curl http://localhost:3000/health
```

**Connect to Claude.ai:**

Go to **Settings** > **Integrations** > **Add MCP server**

Paste: `https://your-domain.com/mcp?token=YOUR_MCP_SECRET`

Then ask Claude: _"What devices are on my Tailscale network?"_

---

## Configuration

Copy `reacher.config.example.yaml` to `reacher.config.yaml` and edit it. Key sections:

```yaml
ssh:
  blocked_commands:
    - 'rm -rf'
    - 'shutdown'
  allowed_dirs:
    # - "/home/user"  # Empty = no restriction

audit:
  enabled: true
  log_path: './reacher-audit.log'

dry_run: false
```

All settings can be overridden via environment variables (see `.env.example`).

---

## Full Setup

See [SKILL.md](SKILL.md) for a complete, step-by-step setup guide designed for AI agents to walk you through.

---

## Tools Reference

Detailed tool documentation: [AGENT.MD](AGENT.MD)

This file covers:

- How to use each tool effectively
- Parameter reference
- Common patterns and examples
- Troubleshooting quick reference

---

## Deployment

**Docker Compose** (recommended):

```bash
docker compose up -d
```

**Docker:**

```bash
docker build -t reacher .
docker run -d -p 3000:3000 --env-file .env --restart unless-stopped reacher
```

**Bare Node:**

```bash
npm install && npm start
```

The server needs a public HTTPS URL for Claude.ai. Use a reverse proxy (Caddy, Nginx) or deploy to Railway/Render/EasyPanel.

---

## Requirements

- Node.js 18+
- A Tailscale account with devices enrolled
- A GitHub personal access token
- A VPS or always-on server (optional, but recommended)

---

## License

MIT

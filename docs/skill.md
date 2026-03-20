# Reacher Setup Guide for AI Agents

This guide is for AI agents (Claude, etc.) helping a new user set up Reacher interactively. Walk through each step in order, asking for user input where needed.

The user does **not** need a VPS or Tailscale to get started. Confirm what they want before deciding which path to take.

---

## Step 1: Understand what the user wants

Ask the user:

> "What do you want Claude to be able to do? For example:
> - Call APIs on your behalf (GitHub, Linear, Notion, etc.)
> - Remember things across conversations (knowledge base)
> - Control a browser
> - SSH into your servers"

Based on their answer:
- **API + memory only** → Path 1 or 2 (no VPS or Tailscale needed)
- **+ SSH to machines** → Path 3 (needs Tailscale + VPS + SSH key)

---

## Step 2: Prerequisites check

**Always required:**
- Node.js 18+ — run `node --version` to check. Install from [nodejs.org](https://nodejs.org) if missing.
- A GitHub account — for `gist_kb` (knowledge base) and API calls to GitHub.

**Only for SSH features:**
- A [Tailscale](https://tailscale.com) account with devices enrolled
- A VPS or always-on machine with a public HTTPS URL

---

## Step 3: Clone and install

```bash
git clone https://github.com/thezem/reacher.git
cd reacher
npm install
cp .env.example .env
```

Confirm the user sees the `reacher` directory and that `npm install` completed without errors.

---

## Step 4: Configure `.env`

Open `.env` in a text editor. Walk through these values:

### Always set:

**`MCP_SECRET`** — any random string. Claude uses this to authenticate with the server.
```bash
openssl rand -hex 32
```
Paste the output as `MCP_SECRET`.

**`GITHUB_TOKEN`** — for the knowledge base and GitHub API calls.
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Create a new token (classic)
3. Grant `gist` scope (read + write)
4. Paste as `GITHUB_TOKEN`

**`PROXY_ALLOWED_DOMAINS`** — domains `fetch_external` can call. Start with:
```
PROXY_ALLOWED_DOMAINS=api.github.com
```

**`FETCH_EXTERNAL_TOKEN_MAP`** — maps domains to token env vars for automatic auth injection:
```
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN"}
```

### Only for SSH features:

**`TAILSCALE_API_KEY`** — for querying the Tailscale device list and activating SSH tools.
1. Go to [tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys)
2. Generate an API key with "Devices (read)" scope
3. Paste as `TAILSCALE_API_KEY`

**`SSH_DEFAULT_USER`** — the default SSH username on target machines.
```
SSH_DEFAULT_USER=your-username
```

---

## Step 5: Start the server

```bash
node index.js
```

The startup log shows which tools are active:
```
✅ MCP Server started on http://localhost:3000
📋 Active tools: fetch_external, browser, gist_kb, github_search
```

If `TAILSCALE_API_KEY` was set, `ssh_exec` and `tailscale_status` will also appear.

---

## Step 6: Connect to Claude

### Path A — Claude Code (local, no public URL needed)

Add to the user's MCP config (via `/mcp` in Claude Code):

```json
{
  "mcpServers": {
    "reacher": {
      "type": "http",
      "url": "http://localhost:3000/mcp?token=THEIR_MCP_SECRET"
    }
  }
}
```

### Path B — Claude.ai via Cloudflare Tunnel (no VPS needed)

Open a second terminal:
```bash
npx cloudflared tunnel --url http://localhost:3000
```

Copy the printed URL (e.g. `https://random-words.trycloudflare.com`).

In Claude.ai → Settings → Integrations → Add custom connector:
```
https://random-words.trycloudflare.com/mcp?token=THEIR_MCP_SECRET
```

### Path C — Claude.ai via VPS

The server needs a public HTTPS URL. See [deployment.md](deployment.md) for full options (Caddy, Docker, EasyPanel, Railway).

In Claude.ai → Settings → Integrations → Add custom connector:
```
https://yourdomain.com/mcp?token=THEIR_MCP_SECRET
```

---

## Step 7: SSH key setup (Path C only)

If the user wants `ssh_exec`:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/reacher-key -N ""
```

Add the public key to each target machine:
```bash
ssh-copy-id -i ~/.ssh/reacher-key.pub user@hostname
```

For Docker: mount the key in `docker-compose.yml`:
```yaml
volumes:
  - ~/.ssh/reacher-key:/root/.ssh/reacher-key:ro
```

---

## Step 8: Verify

Ask the user to start a new Claude conversation and try:

- **"Save a note to my knowledge base: Reacher is set up."** — tests `gist_kb`
- **"What devices are on my Tailscale network?"** — tests `tailscale_status` (Path C only)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Server won't start | Check `MCP_SECRET` is set in `.env` |
| Tools missing | Check startup log — missing env vars = those tools not registered |
| "Unauthorized" from Claude | `MCP_SECRET` in URL doesn't match `.env` |
| `fetch_external` blocked | Domain not in `PROXY_ALLOWED_DOMAINS` — add it and restart |
| SSH fails | Confirm Tailscale is running on target; try `sudo tailscale up --ssh` |
| Cloudflare URL changed | Restart `cloudflared` to get a new URL, or use a named tunnel |

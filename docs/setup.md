# Setup

Pick the path that matches your situation. You can always add more later.

---

## Path 1 — Local with Claude Code (fastest, zero infrastructure)

Claude Code supports local MCP servers. No public URL, no VPS, no HTTPS needed.

**What you get:** `fetch_external`, `gist_kb`, `github_search`, `browser`

### 1. Clone and install

```bash
git clone https://github.com/thezem/reacher.git
cd reacher
npm install
cp .env.example .env
```

### 2. Fill in `.env`

Open `.env` and set at minimum:

```env
MCP_SECRET=any-random-string
GITHUB_TOKEN=your_github_token
PROXY_ALLOWED_DOMAINS=api.github.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN"}
```

- **`MCP_SECRET`** — any random string; it authenticates requests to your server. Generate one with `openssl rand -hex 32`.
- **`GITHUB_TOKEN`** — create at [github.com/settings/tokens](https://github.com/settings/tokens), needs `gist` scope (read+write). Add `repo` scope if you want to search private repos.
- **`PROXY_ALLOWED_DOMAINS`** — domains `fetch_external` is allowed to reach.

### 3. Start the server

```bash
node index.js
```

You should see something like:
```
✅ MCP Server started on http://localhost:3000
📋 Active tools: fetch_external, browser, gist_kb, github_search
```

### 4. Add to Claude Code

Edit your MCP config (via `/mcp` in Claude Code, or `~/.claude/mcp.json` directly):

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

Done. Try asking Claude: *"Save a note to my knowledge base that today I set up Reacher."*

---

## Path 2 — Local machine with Cloudflare Tunnel (for Claude.ai, no VPS)

Claude.ai requires a public HTTPS URL. Cloudflare Tunnel gives you one for free — no account required, no port forwarding, no domain needed.

**What you get:** Same as Path 1, accessible from Claude.ai

### 1–3. Follow Path 1 steps above

### 4. Open a tunnel

In a second terminal:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints a URL like `https://random-words.trycloudflare.com`. That's your public URL.

### 5. Connect to Claude.ai

1. Go to **Claude.ai → Settings → Integrations**
2. **Add custom connector**
3. URL: `https://random-words.trycloudflare.com/mcp?token=your-mcp-secret`

> **Note:** The tunnel URL changes every time you restart `cloudflared`. For a stable URL, sign up for a free Cloudflare account and create a named tunnel. Or move to Path 3.

---

## Path 3 — VPS with SSH access (full setup)

This path adds `ssh_exec` and `tailscale_status` — run commands on any machine in your Tailscale mesh.

**What you get:** All six tools

### Additional prerequisites

- A [Tailscale](https://tailscale.com) account with your devices enrolled
- A VPS or always-on machine reachable from Claude.ai over HTTPS
- A Tailscale API key (create at [tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys), needs "Devices (read)" scope)
- An SSH keypair for the server to use

### 1. Generate an SSH key (if you don't have one)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/reacher-key -N ""
```

Add the public key to `~/.ssh/authorized_keys` on each machine you want Claude to reach:

```bash
cat ~/.ssh/reacher-key.pub >> ~/.ssh/authorized_keys
```

### 2. Clone, configure, deploy

```bash
git clone https://github.com/thezem/reacher.git
cd reacher
cp .env.example .env
cp reacher.config.example.yaml reacher.config.yaml
```

Edit `.env` and add your Tailscale key and SSH default user:

```env
MCP_SECRET=your-secret
GITHUB_TOKEN=your_github_token
TAILSCALE_API_KEY=your_tailscale_api_key
SSH_DEFAULT_USER=your-username
PROXY_ALLOWED_DOMAINS=api.github.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN"}
```

### 3. Deploy with Docker

```bash
docker compose up -d
```

Mount your SSH private key in `docker-compose.yml`:

```yaml
services:
  reacher:
    volumes:
      - ~/.ssh/reacher-key:/root/.ssh/reacher-key:ro
```

The server sets `chmod 600` on the key at startup. The matching public key must be in `authorized_keys` on each target machine.

### 4. Expose over HTTPS

The server needs a public HTTPS URL. See [deployment.md](deployment.md) for options — Caddy, Nginx, EasyPanel, Railway, and others.

### 5. Connect to Claude.ai

1. Go to **Claude.ai → Settings → Integrations**
2. **Add custom connector**
3. URL: `https://yourdomain.com/mcp?token=your-mcp-secret`

### 6. Bootstrap with AGENT.MD

Drop [../AGENT.MD](../AGENT.MD) into a new Claude session. Claude will discover your devices, probe SSH access, and save a device map to your Gist KB so future sessions start with context already loaded.

---

## Verify it's working

```bash
curl -s -X POST "http://localhost:3000/mcp?token=your-mcp-secret" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools[].name'
```

This should print the names of your active tools.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Server won't start | Check that `MCP_SECRET` is set in `.env` |
| Tools missing from Claude | Check startup log — missing env vars = tools not registered |
| `fetch_external` returns "Domain not allowed" | Add the domain to `PROXY_ALLOWED_DOMAINS` in `.env` and restart |
| SSH fails with "connection refused" | Confirm Tailscale is running on the target; try `sudo tailscale up --ssh` |
| Claude.ai can't connect | Confirm the server is publicly reachable; check `MCP_SECRET` in URL matches `.env` |
| Docker SSH fails | Make sure the key is mounted at `/root/.ssh/reacher-key` and the public key is in `authorized_keys` on the target |

# SKILL.md - Reacher Setup Guide for AI Agents

This guide is designed for AI agents (Claude, etc.) to help a new user set up Reacher interactively. Walk through each step in order, asking for user input where needed.

---

## Step 1: Prerequisites Check

Before starting, confirm the user has:

1. **Node.js 18+** - Run `node --version` to check
2. **Docker** (optional but recommended) - Run `docker --version` if they want Docker deployment
3. **A Tailscale account** - They need to be enrolled with devices they want to SSH into
4. **A GitHub account** - Needed for gist_kb (knowledge base) and fetch_external auth
5. **A VPS or always-on server** - To host the Reacher server 24/7 (needs public HTTPS access)

**Action:** Ask the user to confirm they have each of these. If anything is missing, provide setup links:
- Node.js: https://nodejs.org (choose LTS 18+)
- Docker: https://www.docker.com/products/docker-desktop
- Tailscale: https://tailscale.com/download
- GitHub: https://github.com/signup

---

## Step 2: Clone the Repository

Use the stable v0.1.0 tag:

```bash
git clone --branch v0.1.0 https://github.com/thezem/reacher
cd reacher
```

**Action:** Ask the user to run these commands and confirm they see the reacher directory.

---

## Step 3: Create Configuration Files

### 3a. Create `reacher.config.yaml`

Copy the example config:
```bash
cp reacher.config.example.yaml reacher.config.yaml
```

Then open `reacher.config.yaml` in a text editor and explain each section:

**SSH Configuration:**
- `blocked_commands` - Commands to block from execution (e.g., "rm -rf", "dd"). These are checked as substrings.
- `allowed_dirs` - Directories where SSH commands are allowed (optional). Leave empty to allow all directories.

**Audit Configuration:**
- `enabled` - Set to `true` to log all tool calls to an audit log
- `log_path` - Where to save the audit log (default: `./reacher-audit.log`)

**Dry-run Mode:**
- Set `dry_run: true` to test commands without executing them

**Action:** Walk through the config with the user. Ask:
- "Do you want to block specific dangerous commands? (Yes/No)"
- If yes: "What commands? (rm -rf is already a good start)"
- "Do you want to restrict SSH to certain directories? (Typically no for personal use)"
- "Do you want audit logging enabled? (Recommended: yes)"

### 3b. Create `.env`

Copy the example env file:
```bash
cp .env.example .env
```

Open `.env` in your editor and walk through each variable:

**MCP_SECRET** (required)
- A random token Claude.ai uses to authenticate with your server
- Generate one: `openssl rand -hex 32` (or just a long random string)
- Example: `MCP_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`

**TAILSCALE_API_KEY** (required)
- Allows Reacher to query your Tailscale device network
- Go to: https://login.tailscale.com/admin/settings/keys
- Click "Generate auth key"
- Give it "Devices (read)" scope
- Paste the key into `.env`

**GITHUB_TOKEN** (required)
- Personal access token for GitHub API and gist knowledge base
- Go to: https://github.com/settings/tokens
- Create a new fine-grained token
- Give it scopes: `gist` (read + write), and any API scopes you need for `fetch_external` (e.g., if you want to call the GitHub API, you don't need extra scopes - gist alone is fine)
- Paste it into `.env`

**PROXY_ALLOWED_DOMAINS** (required)
- Comma-separated list of domains `fetch_external` is allowed to call
- Start with: `PROXY_ALLOWED_DOMAINS=api.github.com`
- You can add more later (e.g., `api.github.com,api.linear.app,api.notion.com`)

**DRY_RUN** (optional)
- Set to `true` to test commands without executing them
- Default: `false`

**AUDIT_ENABLED** (optional)
- Set to `true` to enable audit logging
- Default: `true`

**AUDIT_LOG_PATH** (optional)
- Path to the audit log file
- Default: `./reacher-audit.log`

**SSH_BLOCKED_COMMANDS** (optional)
- Comma-separated list of commands to block
- Default: `rm -rf /,shutdown,reboot,mkfs,dd,format`

**SSH_ALLOWED_DIRS** (optional)
- Comma-separated list of directories where SSH is allowed
- Default: empty (no restriction)

**ACTION:** Collect values from the user:
1. Generate an MCP_SECRET with them
2. Get their Tailscale API key
3. Get their GitHub token
4. Set PROXY_ALLOWED_DOMAINS (at minimum: `api.github.com`)

---

## Step 4: Generate SSH Key

If the user is deploying to a remote VPS or wants Tailscale SSH authentication, generate an SSH key:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/reacher-key -N ""
```

This creates two files:
- `~/.ssh/reacher-key` (private key - keep secret)
- `~/.ssh/reacher-key.pub` (public key - share with machines)

On each target machine where you want to SSH from Reacher, add the public key to `~/.ssh/authorized_keys`:

```bash
cat ~/.ssh/reacher-key.pub >> ~/.ssh/authorized_keys
```

**Note:** If you're deploying to Docker on a VPS, you'll need to mount the key into the container. This step is optional for local testing.

---

## Step 5: Deploy

Choose one of these options:

### Option A: Docker Compose (Recommended - Easiest)

```bash
docker compose up -d
```

This starts the server in the background. Check it's running:
```bash
docker logs reacher
```

### Option B: Docker (Manual)

```bash
docker build -t reacher .
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  --name reacher \
  reacher
```

### Option C: Node.js (Bare)

```bash
npm install
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

**ACTION:** Ask the user which deployment method they prefer. Guide them through that option and confirm the server started successfully by checking the logs.

---

## Step 6: Expose Publicly (for Claude.ai access)

The server needs a public HTTPS URL for Claude.ai to reach it. Options:

### A. Reverse Proxy on Your VPS (Recommended)

If the server is on a VPS, use a reverse proxy to handle HTTPS. Example with Caddy:

```
mcp.yourdomain.com {
  reverse_proxy localhost:3000
}
```

Caddy auto-generates SSL certificates. Nginx and Traefik work similarly.

### B. Cloud Deployment (Railway, Render, Fly.io)

Deploy directly from GitHub - these platforms handle public URLs and HTTPS automatically.

### C. EasyPanel (See next step)

---

## Step 7: EasyPanel Deployment (Optional - VPS Users)

EasyPanel is a VPS dashboard that handles builds and deployments. If the user wants to use EasyPanel:

1. Go to your EasyPanel dashboard
2. Connect your GitHub account
3. Add a new service and point it at `https://github.com/thezem/reacher`
4. In the EasyPanel UI, set environment variables:
   - `MCP_SECRET`
   - `TAILSCALE_API_KEY`
   - `GITHUB_TOKEN`
   - `PROXY_ALLOWED_DOMAINS`
   - Any others from `.env`
5. Mount the SSH key volume if needed (e.g., `/root/.ssh/reacher-key` → container path `/app/.ssh/reacher-key`)
6. Deploy and note the public URL

---

## Step 8: Connect to Claude.ai

Once the server is running and publicly reachable:

1. Go to **Claude.ai** > **Settings** > **Integrations**
2. Click **Add custom connector** or **Add MCP server**
3. Paste your server URL: `https://mcp.yourdomain.com/mcp?token=YOUR_MCP_SECRET`
   - Replace `mcp.yourdomain.com` with your actual domain
   - Replace `YOUR_MCP_SECRET` with the secret from `.env`
4. Save and start a new conversation

---

## Step 9: Verify It Works

Ask Claude: **"What devices are on my Tailscale network?"**

Claude should call `tailscale_status` and return a list of your devices with hostnames, IPs, OS, and online/offline status.

If that works, try: **"SSH into [device-name] and run `whoami`"**

Claude should call `ssh_exec` and return your username on that machine.

---

## Troubleshooting

### Common Setup Failures

| Problem | Solution |
| --- | --- |
| **"Unauthorized" error from Claude** | Double-check that the `MCP_SECRET` in the URL matches the one in `.env`. Make sure the server is publicly reachable. |
| **"Domain not allowed" for fetch_external** | The domain isn't in `PROXY_ALLOWED_DOMAINS`. Add it to `.env` and restart the server. |
| **SSH fails with "connection refused"** | Make sure Tailscale SSH is enabled on the target: `sudo tailscale up --ssh`. Confirm the device shows online in `tailscale_status`. |
| **Docker won't start** | Check the logs: `docker logs reacher`. Make sure all required env vars are set. |
| **"TAILSCALE_API_KEY not set" error** | The `.env` file isn't being read. Make sure you created it from `.env.example` and it's in the project root. |

### Getting More Help

- **Tailscale SSH troubleshooting:** https://tailscale.com/kb/1193/tailscale-ssh
- **MCP protocol issues:** Check the MCP documentation at https://modelcontextprotocol.io
- **GitHub issues:** https://github.com/thezem/reacher/issues

---

## Next Steps

Once everything is working:

1. **Ask Claude to discover your devices** - run the first-time setup from AGENT.MD
2. **Save a device map** - Claude will create a persistent note with your devices
3. **Add APIs** - add more domains to `PROXY_ALLOWED_DOMAINS` as needed (GitHub, Linear, Notion, etc.)
4. **Customize safety rules** - adjust `reacher.config.yaml` based on your comfort level

You're done! Claude now has secure access to your machines and APIs.

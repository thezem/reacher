# Quickstart

## 1. Clone and configure

```bash
git clone https://github.com/your-username/reacher.git
cd reacher
cp .env.example .env
```

Open `.env` and fill in your credentials. See below for where to get each one.

---

## 2. Get your credentials

**Tailscale API key**

1. Go to https://login.tailscale.com/admin/settings/keys
2. Click **Generate auth key** (or **API keys** depending on your plan)
3. Give it "Devices (read-only)" scope
4. Paste the key into `.env` as `TAILSCALE_API_KEY`

**GitHub personal access token**

1. Go to https://github.com/settings/tokens
2. Create a new token (classic or fine-grained)
3. Grant it the `gist` scope (read + write) plus any other API scopes you need for `fetch_external`
4. Paste it into `.env` as `GITHUB_TOKEN`

**MCP secret**

Just pick a random string and set it as `MCP_SECRET`. This is the token Claude.ai uses to authenticate with your server. Something like `openssl rand -hex 32` works fine.

---

## 3. Configure Tailscale SSH

For `ssh_exec` to work, the devices you want to reach need to have Tailscale SSH enabled.

On each target machine:
```bash
# Enable Tailscale SSH
sudo tailscale up --ssh
```

Then verify you can SSH in manually from your server:
```bash
ssh user@device-hostname
```

If that works, Reacher will work. The `tailscale_status` tool will show you all your device hostnames.

---

## 4. Run the server

**Docker (recommended)**
```bash
docker build -t reacher .
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  --name reacher \
  reacher
```

Check it started:
```bash
docker logs reacher
```

**Docker Compose (handy for local dev)**
```bash
docker-compose up
```

**Bare Node**
```bash
npm install
node index.js
# or for auto-reload during development:
npm run dev
```

Server runs on `http://localhost:3000` by default (or whatever `PORT` you set).

---

## 5. Verify it's working

```bash
curl -X POST http://localhost:3000/mcp?token=YOUR_MCP_SECRET \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

You should get back a JSON response listing all tools.

---

## 6. Expose it publicly

Your server needs a public HTTPS URL for Claude.ai to reach it. Options:

- **Reverse proxy on your VPS** - point a subdomain at port 3000 using Caddy or Nginx. Caddy handles HTTPS automatically:
  ```
  mcp.yourdomain.com {
    reverse_proxy localhost:3000
  }
  ```
- **EasyPanel / Railway / Render** - deploy directly from GitHub and they handle the public URL for you (see README for details)

---

## 7. Connect to Claude.ai

1. Go to **Claude.ai** > **Settings** > **Integrations**
2. Click **Add custom connector**
3. Paste your server URL: `https://mcp.yourdomain.com/mcp?token=YOUR_MCP_SECRET`
4. Save and start a new conversation

Try asking: *"What devices are on my Tailscale network?"* - Claude should call `tailscale_status` and list them.

---

## Adding a new tool

Create `src/tools/my_tool.js`:

```javascript
import { z } from 'zod'

export const name = 'my_tool'
export const description = 'What this tool does'

export const schema = {
  param: z.string().describe('A required parameter'),
}

export async function handler({ param }, env) {
  // your implementation
  return { success: true, result: param }
}
```

Then in `src/mcp-server.js`, import it and register with `server.tool(...)` following the same pattern as the existing tools.

---

## Troubleshooting

**Container won't start**
```bash
docker logs reacher
```

**SSH not working**
- Check `tailscale_status` to confirm the device shows as online
- Test manually from your server: `ssh user@hostname`
- Make sure Tailscale SSH is enabled on the target: `sudo tailscale up --ssh`

**Claude can't connect**
- Confirm the server is publicly reachable: `curl https://mcp.yourdomain.com/mcp?token=...`
- Check your reverse proxy config and that port 3000 is not firewalled
- Make sure `MCP_SECRET` in your URL matches the one in `.env`

**Browser tool not working**
- Make sure `agent-browser` is installed on the server: `npm install -g agent-browser`
- Make sure a CDP-compatible browser (e.g. [Lightpanda](https://github.com/lightpanda-io/lightpanda)) is running and listening on the configured host/port
- Default CDP endpoint is `ws://127.0.0.1:9222` — override with `BROWSER_CDP_HOST` and `BROWSER_CDP_PORT` in `.env`

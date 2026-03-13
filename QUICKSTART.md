# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Create `.env`
```bash
cp .env.example .env
```

### 2. Get Your Credentials

**Tailscale API Key:**
- Visit https://login.tailscale.com/admin/settings/keys
- Create new key with "Devices (read-only)" scope
- Paste into `.env` as `TAILSCALE_API_KEY`

**Telegram Bot Token & Chat ID:**
- Chat @BotFather on Telegram → `/newbot` → follow prompts
- Copy token to `.env` as `TELEGRAM_BOT_TOKEN`
- Send any message to your bot
- Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
- Find your `chat_id` in the response → paste into `.env` as `DEFAULT_CHAT_ID`

### 3. Run Locally (with Docker Compose)
```bash
docker-compose up
# Server runs on http://localhost:3000
```

Or with Node.js:
```bash
npm install
npm run dev
```

### 4. Test a Tool
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

### 5. Add to Claude.ai
- Go to Settings → Connected apps
- Add custom connector: `http://localhost:3000` (or your VPS URL)
- Start using your tools in Claude!

## 📦 Deploy to VPS with EasyPanel

1. Push to GitHub
2. Connect repo to EasyPanel
3. Set environment variables in EasyPanel dashboard
4. EasyPanel auto-deploys from Dockerfile ✨

## 🛠️ Adding a New Tool

Create `src/tools/my_tool.js`:
```javascript
export const myToolTool = {
  name: 'my_tool',
  description: 'What it does',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'A parameter' }
    },
    required: ['param'],
  },
};

export async function handleMyTool(params) {
  return { success: true, result: 'done' };
}
```

Then import and register in `src/mcp-server.js`.

## 🐛 Troubleshooting

**Container won't start?**
```bash
docker logs mcp-server
```

**Need to rebuild?**
```bash
docker-compose build --no-cache
```

**SSH not working?**
- Ensure Tailscale is running
- Test manually: `ssh user@device-hostname`

**Telegram not working?**
- Verify bot token is correct
- Make sure bot has received at least one message

See full README.md for detailed docs.

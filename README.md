# Personal MCP Server

A modular, production-ready MCP (Model Context Protocol) server built for personal use on a Linux VPS. Connect it to Claude.ai as a custom connector to get powerful terminal and system integration.

## Features

- **SSH Execute**: Run shell commands on remote devices via Tailscale SSH
- **Tailscale Status**: Monitor all devices in your Tailscale network
- **File Upload**: Upload files to T-Store and get public shareable URLs
- **Telegram Integration**: Send messages and files directly to Telegram

## Architecture

```
src/
├── tools/              # Individual tool implementations
│   ├── ssh_exec.js
│   ├── tailscale_status.js
│   ├── upload_file.js
│   └── send_telegram.js
├── lib/                # Shared utilities
│   ├── tailscale-client.js
│   ├── telegram-client.js
│   └── tstore-client.js
└── mcp-server.js       # Core MCP server setup
index.js               # Entry point with HTTP transport
```

## Setup

### Prerequisites

- Docker (for containerized deployment) OR Node.js 18+ (for local development)
- Tailscale account with API key
- Telegram bot token

### Installation

**Option 1: Docker (Recommended for production)**

```bash
git clone <repo-url>
cd personal-mcp-server
cp .env.example .env
nano .env  # Fill in your credentials
docker build -t mcp-server .
docker run -p 3000:3000 --env-file .env mcp-server
```

**Option 2: Local development with Node.js**

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd personal-mcp-server
   npm install
   ```

2. **Create `.env` file from example**
   ```bash
   cp .env.example .env
   ```

3. **Get your credentials**

   **Tailscale API Key:**
   - Go to https://login.tailscale.com/admin/settings/keys
   - Create a new API key with "Devices (read-only)" scope
   - Copy it to `.env`

   **Telegram Bot Token:**
   - Chat with @BotFather on Telegram
   - Send `/newbot` and follow prompts
   - Copy the token to `.env`

   **Telegram Chat ID:**
   - Send any message to your bot
   - Open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Find your chat ID in the response
   - Copy it to `.env`

4. **Test locally**
   ```bash
   npm run dev
   # Server should start on http://localhost:3000
   ```

## Deployment to VPS with Docker

The server is containerized for easy deployment. EasyPanel can pull and deploy directly from GitHub.

### Docker Setup

1. **Build the image locally** (for testing)
   ```bash
   npm run docker:build
   ```

2. **Run locally**
   ```bash
   npm run docker:run
   ```

3. **For production on EasyPanel**
   - Connect your GitHub repo to EasyPanel
   - EasyPanel will automatically:
     - Pull the latest code
     - Build the Docker image
     - Run the container with PORT exposed
   - Set environment variables in EasyPanel dashboard
   - Container respects `PORT` env var (default: 3000)

### Manual Docker Deployment

If deploying without EasyPanel:

```bash
# SSH into your VPS
ssh user@your-vps

# Clone repo
git clone <repo-url>
cd personal-mcp-server

# Create .env with your credentials
cp .env.example .env
nano .env  # Edit with your keys

# Build image
docker build -t mcp-server .

# Run as daemon with auto-restart
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  --name mcp-server \
  mcp-server
```

### Docker Commands

```bash
# View logs
docker logs -f mcp-server

# Restart container
docker restart mcp-server

# Stop container
docker stop mcp-server

# Remove container
docker rm mcp-server

# View running containers
docker ps
```

### Using docker-compose (Recommended for local dev)

```bash
# Start the server
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The `docker-compose.yml` includes volume mounts for development, so changes to `src/` and `index.js` will auto-reload if you uncomment the `npm run dev` command.

## Tools Reference

### `ssh_exec`

Execute commands on remote devices via Tailscale SSH.

**Parameters:**
- `hostname` (string, required): Tailscale device hostname
- `command` (string, required): Shell command to execute
- `user` (string, optional, default: "hazem"): SSH user

**Example:**
```json
{
  "hostname": "mydevice",
  "command": "docker ps",
  "user": "hazem"
}
```

**Response:**
```json
{
  "success": true,
  "hostname": "mydevice",
  "user": "hazem",
  "stdout": "CONTAINER ID   IMAGE   STATUS\nab12cd34ef   nginx   Up",
  "stderr": "",
  "exitCode": 0
}
```

---

### `tailscale_status`

Get status of all devices in your Tailscale network.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 5,
    "online": 4,
    "offline": 1
  },
  "devices": [
    {
      "name": "Personal MacBook",
      "hostname": "macbook-personal",
      "online": "online",
      "os": "Darwin",
      "ips": ["100.102.45.67"],
      "clientVersion": "1.68.0",
      "lastSeen": "2025-03-13T10:30:00Z"
    }
  ]
}
```

---

### `upload_file`

Upload a file to T-Store and get a public shareable URL.

**Parameters:**
- `file_path` (string, required): Absolute path to file on the VPS

**Example:**
```json
{
  "file_path": "/home/hazem/documents/report.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "file_path": "/home/hazem/documents/report.pdf",
  "download_url": "https://tstore.ouim.me/files/abc123def456",
  "message": "File uploaded successfully. Share this link: https://tstore.ouim.me/files/abc123def456"
}
```

---

### `send_telegram`

Send messages or files to Telegram.

**Parameters:**
- `type` (string, required): "message" or "file"
- `content` (string, required): Text content or file path
- `caption` (string, optional): Caption for files

**Examples:**

Send a text message:
```json
{
  "type": "message",
  "content": "Hello from my MCP server!"
}
```

Send a file (auto-detects image vs document):
```json
{
  "type": "file",
  "content": "/home/hazem/screenshots/screenshot.png",
  "caption": "Screenshot from deployment"
}
```

**Response:**
```json
{
  "success": true,
  "type": "message",
  "messageId": 12345
}
```

## Adding New Tools

Adding a new tool is simple:

1. **Create a new file in `src/tools/`**
   ```javascript
   // src/tools/my_tool.js
   
   export const myToolTool = {
     name: 'my_tool',
     description: 'What this tool does',
     inputSchema: {
       type: 'object',
       properties: {
         param1: {
           type: 'string',
           description: 'Description of param1',
         },
       },
       required: ['param1'],
     },
   };
   
   export async function handleMyTool(params) {
     const { param1 } = params;
     // Your implementation
     return { success: true, result: 'something' };
   }
   ```

2. **Import it in `src/mcp-server.js`**
   ```javascript
   import { myToolTool, handleMyTool } from './tools/my_tool.js';
   ```

3. **Add it to the tools array**
   ```javascript
   const tools = [
     sshExecTool,
     tailscaleStatusTool,
     uploadFileTool,
     sendTelegramTool,
     myToolTool,  // ← Add here
   ];
   ```

4. **Add it to the handlers map**
   ```javascript
   const handlers = {
     ssh_exec: handleSshExec,
     tailscale_status: handleTailscaleStatus,
     upload_file: handleUploadFile,
     send_telegram: handleSendTelegram,
     my_tool: handleMyTool,  // ← Add here
   };
   ```

That's it! The tool is now registered and available.

## Connecting to Claude.ai

1. Go to [Claude.ai](https://claude.ai)
2. In Settings → Connected apps
3. Add a new custom connector
4. Enter your server URL (e.g., `https://mcp.yourdomain.com`)
5. Test the connection

Claude will now have access to all your tools!

## Environment Variables

Required:
- `TAILSCALE_API_KEY` - Tailscale API key for device access
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `DEFAULT_CHAT_ID` - Default Telegram chat to send messages to

Optional:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to "production" for production deployments

## Troubleshooting

**"TAILSCALE_API_KEY is not set"**
- Check that `.env` file exists and has the correct key
- Make sure you're using a valid Tailscale API key from the admin dashboard

**SSH commands not working**
- Ensure Tailscale is running and you can SSH to the device manually
- Check that the `user` parameter matches your SSH user on that device
- Tailscale devices must be online and reachable

**Telegram messages not sending**
- Verify the bot token is correct
- Make sure the bot has sent at least one message to get your chat ID
- Check that `DEFAULT_CHAT_ID` is correct

**Port already in use**
- Change `PORT` in `.env` to a different port
- Or kill the process: `lsof -ti:3000 | xargs kill -9`

## License

MIT

# Architecture

## Project Structure

```
personal-mcp-server/
├── index.js                    # Entry point - HTTP server setup
├── package.json
├── Dockerfile                  # Container image
├── docker-compose.yml          # Local dev setup
├── .env.example                # Environment template
│
├── src/
│   ├── mcp-server.js          # MCP server core - tool registration
│   │
│   ├── tools/                 # Individual tool implementations
│   │   ├── ssh_exec.js        # Run commands via Tailscale SSH
│   │   ├── tailscale_status.js # Check network status
│   │   ├── upload_file.js     # Upload to T-Store
│   │   └── send_telegram.js   # Send messages/files
│   │
│   └── lib/                   # Shared utilities
│       ├── tailscale-client.js # Tailscale API wrapper
│       ├── telegram-client.js  # Telegram Bot API wrapper
│       └── tstore-client.js    # T-Store upload wrapper
│
├── README.md                   # Full documentation
├── QUICKSTART.md               # 5-minute setup guide
└── ARCHITECTURE.md             # This file
```

## Request Flow

```
Claude.ai
   ↓ (HTTP POST)
index.js (HTTP Server)
   ↓
mcp-server.js (MCP Server)
   ├─→ ListToolsRequest → Returns [tools]
   └─→ CallToolRequest(name, args)
       ├─→ Finds handler for tool
       ├─→ Calls handler(args, env_vars)
       └─→ Returns JSON result
   ↓
src/tools/*.js (Handler functions)
   ↓
src/lib/*.js (API clients)
   ↓
External APIs (Tailscale, Telegram, T-Store)
```

## Tool Pattern

Every tool follows this pattern:

### 1. Tool Definition
```javascript
export const myToolTool = {
  name: 'my_tool',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    required: ['param'],
  },
};
```

### 2. Handler Function
```javascript
export async function handleMyTool(params) {
  const { param } = params;
  // Implementation
  return {
    success: true,
    data: 'result',
  };
}
```

### 3. Registration (in `src/mcp-server.js`)

Import:
```javascript
import { myToolTool, handleMyTool } from './tools/my_tool.js';
```

Add to tools array:
```javascript
const tools = [
  // ... other tools
  myToolTool,
];
```

Add to handlers map:
```javascript
const handlers = {
  // ... other handlers
  my_tool: handleMyTool,
};
```

## Tool Categories

### System Tools
- **ssh_exec**: Executes commands on remote devices via Tailscale SSH
  - No dependency on external APIs
  - Uses Tailscale SSH (no key management)
  - Timeout: 30 seconds
  - Max buffer: 10MB

### Network Tools
- **tailscale_status**: Fetches Tailscale network info
  - Depends on: Tailscale API + API key
  - Caches: No (always fresh)
  - Returns: Device list with online status

### File Tools
- **upload_file**: Uploads files to T-Store
  - Depends on: T-Store service
  - Returns: Public download URL
  - Max size: Determined by T-Store

### Communication Tools
- **send_telegram**: Sends messages/files to Telegram
  - Depends on: Telegram Bot API
  - Auto-detects: Image vs document
  - Supports: Text, URLs, files with captions

## Error Handling

All handlers follow this pattern:
1. Validate inputs
2. Validate environment variables (if needed)
3. Try operation
4. Return `{ success: true, ... }` on success
5. Throw error on failure (caught by MCP server)

Error responses are formatted as:
```json
{
  "content": [{
    "type": "text",
    "text": "Error executing tool X: reason"
  }],
  "isError": true
}
```

## Environment Variables

Required:
- `TAILSCALE_API_KEY` - Tailscale API key (for tailscale_status)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (for send_telegram)
- `DEFAULT_CHAT_ID` - Default Telegram chat (for send_telegram)

Optional:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to "production" for production

## Adding a New Tool

1. Create `src/tools/your_tool.js` with tool definition + handler
2. Create `src/lib/your_client.js` if using external API
3. Import in `src/mcp-server.js`
4. Add to `tools` array and `handlers` map
5. Test with: `npm run dev` or `docker-compose up`
6. Document in README.md

Example minimal tool:
```javascript
// src/tools/echo.js
export const echoTool = {
  name: 'echo',
  description: 'Echo back the input',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string' },
    },
    required: ['text'],
  },
};

export async function handleEcho(params) {
  return { success: true, echo: params.text };
}
```

## Deployment

### Local Development
```bash
npm install
npm run dev
```

### Docker (Local Testing)
```bash
docker-compose up
```

### Docker (Production via EasyPanel)
- Push to GitHub
- EasyPanel builds and deploys automatically
- Container respects `PORT` environment variable
- Health checks enabled

### Configuration in EasyPanel
Set these environment variables:
- `TAILSCALE_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `DEFAULT_CHAT_ID`
- `PORT` (optional, defaults to 3000)

## Security Notes

- ✅ No auth required (assumes behind reverse proxy/VPN)
- ✅ All external API calls use official SDKs/APIs
- ✅ SSH commands executed with specified user context
- ✅ File paths validated before upload
- ✅ Environment variables never logged
- ⚠️ Input validation is minimal (trust Claude)

For public deployment, consider adding:
- API key authentication
- Request rate limiting
- Input sanitization
- Request logging

## Performance

- Cold start: ~500ms
- SSH commands: 100-5000ms (network dependent)
- Tailscale API call: 200-800ms
- File upload: 500ms-30s (file size dependent)
- Telegram send: 100-500ms

Health check interval: 30 seconds (defined in Dockerfile)

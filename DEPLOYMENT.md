# Deployment Guide - EasyPanel

This guide walks you through deploying the MCP server on a Linux VPS using EasyPanel.

## Prerequisites

- GitHub repository with this code
- EasyPanel instance running on your VPS
- Tailscale API key
- Telegram bot token & chat ID

## Deployment Steps

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial MCP server setup"
git remote add origin <your-repo-url>
git push -u origin main
```

Make sure `.env` is in `.gitignore` (it is by default).

### 2. Create EasyPanel App

1. Open your EasyPanel dashboard
2. Click "Create New App" or "Add Service"
3. Select "Docker" as the deployment type
4. Choose "GitHub" as the source
5. Connect your GitHub account
6. Select the repository
7. Select branch (typically `main`)

### 3. Configure Deployment

In EasyPanel's configuration:

**Container Settings:**
- Build from: `Dockerfile`
- Expose port: `3000` (or whatever PORT you want)
- Restart policy: "Unless stopped"

**Environment Variables:**

Click "Add Environment Variable" for each:

```
TAILSCALE_API_KEY = your_tailscale_api_key_here
TELEGRAM_BOT_TOKEN = your_telegram_bot_token_here
DEFAULT_CHAT_ID = your_chat_id_here
PORT = 3000
```

**Storage/Volumes:**

No persistent volumes needed for this app.

### 4. Deploy

1. Click "Deploy" or "Save & Deploy"
2. EasyPanel will:
   - Clone the repository
   - Build the Docker image
   - Start the container
   - Monitor health checks

3. Watch the deployment logs for any errors

### 5. Verify Deployment

Once deployed, test the server:

```bash
# From your local machine
curl -X POST https://your-easypanel-domain.com/your-app/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

Or check EasyPanel's "View App" to see the running container.

### 6. Add to Claude.ai

1. Go to Claude.ai → Settings → Connected Apps
2. Add custom connector
3. Enter your app URL (the one EasyPanel provides)
4. Click "Connect" and test
5. Start using your tools!

## Updating the App

### Method 1: Auto-Update (Recommended)

If EasyPanel is configured with GitHub:
1. Push changes to GitHub `main` branch
2. EasyPanel auto-rebuilds and redeploys (if auto-deploy enabled)

### Method 2: Manual Redeploy

1. Push changes to GitHub
2. In EasyPanel dashboard, click "Redeploy" or "Rebuild"
3. EasyPanel rebuilds image and restarts container

### Important: Environment Variables Stay

When redeploying:
- Environment variables in EasyPanel are preserved
- They do NOT come from the repository
- This keeps secrets safe

## Troubleshooting

### Container won't start

**Check logs in EasyPanel:**
1. Go to your app in EasyPanel
2. Click "View Logs" or "Logs"
3. Look for error messages

Common issues:
- Missing environment variables → Add them in EasyPanel dashboard
- Port already in use → Change PORT to a different number
- Image build failed → Check Dockerfile, push fixes to GitHub

### Tools not working

**SSH exec failing:**
- Verify Tailscale is running on your VPS: `tailscale status`
- Verify you can SSH manually: `ssh user@device-hostname`
- Check hostname spelling

**Tailscale status returning errors:**
- Verify `TAILSCALE_API_KEY` is correct in EasyPanel
- Check it has "Devices (read-only)" scope
- It may need to be regenerated

**Telegram not sending:**
- Verify `TELEGRAM_BOT_TOKEN` in EasyPanel
- Verify `DEFAULT_CHAT_ID` is correct
- Make sure bot has received at least one message
- Check that Telegram API is accessible from your VPS

### Container crashes on startup

**Check health check:**
```
The health check tries to hit http://localhost:PORT/
If this fails, container restarts automatically
```

**View container logs:**
In EasyPanel, expand the container and view logs. Look for:
- Missing `TAILSCALE_API_KEY`
- Missing `TELEGRAM_BOT_TOKEN`
- Missing `DEFAULT_CHAT_ID`
- Port binding issues

### Need to restart container

In EasyPanel:
1. Find the container
2. Click "Restart" or "Stop" then "Start"

No need to redeploy - just restart.

## Monitoring

### View Logs

```bash
# In EasyPanel UI, click "View Logs"
# Or via SSH to VPS:
docker logs -f <container-name>
```

### Resource Usage

EasyPanel shows:
- CPU usage
- Memory usage
- Network I/O

The MCP server is lightweight:
- Startup memory: ~50MB
- Idle memory: ~60MB
- Per request: minimal overhead

### Health Checks

Defined in Dockerfile:
```
Every 30 seconds, checks: http://localhost:PORT/
If fails 3 times in a row, container restarts
```

You'll see "Healthy ✓" in EasyPanel if checks pass.

## Custom Domain

To use a custom domain instead of EasyPanel's subdomain:

1. In EasyPanel, add your domain to the app
2. Update your domain's DNS to point to EasyPanel
3. EasyPanel automatically handles SSL/TLS

Then use in Claude.ai:
```
https://your-domain.com
```

## Scaling (Advanced)

The MCP server is stateless, so you can run multiple instances behind a load balancer if needed. However, for personal use on a single VPS, one instance is sufficient.

## Cost

On most VPS providers:
- Container runs within free tier limits
- Memory: ~60MB idle
- CPU: Minimal (only processes requests from Claude)
- Network: Minimal (only API calls to Tailscale, Telegram, T-Store)

No additional cost beyond your VPS subscription.

## Next Steps

- Read `QUICKSTART.md` for quick reference
- Read `ARCHITECTURE.md` to understand the design
- Check `README.md` for full tool documentation
- Look at `src/tools/*.js` to see how tools work
- Create new tools by following the pattern in `ARCHITECTURE.md`

## Support

For issues:
1. Check the logs in EasyPanel
2. Verify environment variables are set
3. Test tools locally first: `npm run dev`
4. Check Dockerfile for build errors
5. Verify external services (Tailscale API, Telegram API) are accessible

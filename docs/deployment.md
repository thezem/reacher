# Deployment

Options for running Reacher somewhere Claude.ai can reach it. All options assume you've already followed [setup.md](setup.md) for local testing.

---

## Making the server publicly reachable

Claude.ai requires a public HTTPS URL to connect to your MCP server. Your options, roughly ordered by effort:

### Cloudflare Tunnel (free, no domain required)

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Prints a public HTTPS URL instantly. No account, no domain, no port forwarding. URL changes on restart — fine for occasional use, less ideal for permanent setups.

For a stable URL: sign up for a free Cloudflare account and create a named tunnel:

```bash
cloudflared tunnel create reacher
cloudflared tunnel route dns reacher mcp.yourdomain.com
cloudflared tunnel run reacher
```

### Caddy (recommended for VPS)

Caddy handles HTTPS automatically with Let's Encrypt:

```
mcp.yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
caddy run
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name mcp.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

---

## Running the server

### Docker Compose (recommended)

```bash
docker compose up -d
```

Check it started:

```bash
docker compose logs -f
```

If you need SSH access, mount your private key in `docker-compose.yml`:

```yaml
services:
  reacher:
    volumes:
      - ~/.ssh/reacher-key:/root/.ssh/reacher-key:ro
```

### Docker (manual)

```bash
docker build -t reacher .
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  --name reacher \
  reacher
```

With SSH key:

```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  -v ~/.ssh/reacher-key:/root/.ssh/reacher-key:ro \
  --name reacher \
  reacher
```

### PM2 (bare Node on a VPS)

```bash
npm install
pm2 start index.js --name reacher
pm2 save
pm2 startup  # auto-start on reboot
```

### Node directly

```bash
node index.js
# or for dev with auto-reload:
npm run dev
```

---

## Platform deployments

### EasyPanel

1. Connect your GitHub repo to EasyPanel
2. Create a new Node.js service pointing at the repo
3. Set env vars in the EasyPanel dashboard
4. If you need SSH access: mount your private key via the EasyPanel volumes UI to `/root/.ssh/reacher-key`
5. EasyPanel handles builds and provides a public HTTPS URL automatically

### Railway

1. Connect your GitHub repo
2. Railway detects Node.js automatically — no config needed
3. Set env vars in the Railway dashboard
4. Railway provides a public HTTPS URL

> **Note:** Railway's ephemeral filesystem means the SSH key can't be mounted as a file. Use Railway for API-only setups (no `ssh_exec`), or store the key as a base64 env var and decode it at startup.

### Render

Same as Railway — works well for API-only setups. Add a start command of `node index.js` and set your env vars in the dashboard.

---

## SSH key setup (for Docker/VPS deployments)

The server expects the private key at `/root/.ssh/reacher-key` and sets `chmod 600` on it at startup.

**Generate a dedicated key for Reacher:**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/reacher-key -N ""
```

**Authorize it on each target machine:**

```bash
ssh-copy-id -i ~/.ssh/reacher-key.pub user@hostname
# or manually:
cat ~/.ssh/reacher-key.pub >> ~/.ssh/authorized_keys
```

**Test the connection works:**

```bash
ssh -i ~/.ssh/reacher-key user@hostname "whoami"
```

If that works, Reacher's `ssh_exec` will work.

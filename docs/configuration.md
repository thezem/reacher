# Configuration

Reacher has two layers of configuration: environment variables (`.env`) and a YAML file (`reacher.config.yaml`). Environment variables always win over YAML when both are set.

---

## Environment variables

### Always required

| Variable | Description |
|---|---|
| `MCP_SECRET` | Shared secret passed as `?token=` in the server URL. Generate with `openssl rand -hex 32`. |

### For API proxying (`fetch_external`)

| Variable | Description |
|---|---|
| `PROXY_ALLOWED_DOMAINS` | Comma-separated list of domains `fetch_external` is allowed to call. Requests to any other domain are blocked. Example: `api.github.com,api.linear.app` |
| `FETCH_EXTERNAL_TOKEN_MAP` | JSON object mapping domain hostnames to env var names. The corresponding env var's value is injected as `Authorization: Bearer <value>`. Example: `{"api.github.com":"GITHUB_TOKEN","api.linear.app":"LINEAR_TOKEN"}` |

To add a new API: add it to `PROXY_ALLOWED_DOMAINS`, add an entry to `FETCH_EXTERNAL_TOKEN_MAP` pointing at the env var that holds its token, and set that env var.

### For GitHub tools (`gist_kb`, `github_search`)

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Personal access token. Needs `gist` scope for `gist_kb`. Add `repo` scope to search private repositories with `github_search`. Create at [github.com/settings/tokens](https://github.com/settings/tokens). |

### For SSH tools (`ssh_exec`, `tailscale_status`)

| Variable | Description |
|---|---|
| `TAILSCALE_API_KEY` | API key for querying your Tailscale network. Needs "Devices (read)" scope. Create at [tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys). Activates `ssh_exec` and `tailscale_status`. |
| `SSH_DEFAULT_USER` | Default SSH user for `ssh_exec` when not specified per-call. Defaults to `root`. Set this to your username on target machines. |

### For browser automation (`browser`)

| Variable | Description |
|---|---|
| `BROWSER_CDP_HOST` | Hostname of the CDP-compatible browser. Defaults to `127.0.0.1`. |
| `BROWSER_CDP_PORT` | Port of the CDP-compatible browser. Defaults to `9222`. |

### Safety and audit

| Variable | Description |
|---|---|
| `DRY_RUN` | Set `true` to have `ssh_exec` log what it would run without executing. Useful for testing. Also settable in `reacher.config.yaml`. |
| `AUDIT_ENABLED` | Set `false` to disable audit logging. Defaults to `true`. |
| `AUDIT_LOG_PATH` | Path to the audit log file. Defaults to `./reacher-audit.log`. |
| `SSH_BLOCKED_COMMANDS` | Comma-separated list of command substrings to block in `ssh_exec`. Case-insensitive substring match. Example: `rm -rf /,shutdown,reboot`. |
| `SSH_ALLOWED_DIRS` | Comma-separated list of path prefixes where SSH commands are permitted. Empty = no restriction. Example: `/home/user,/var/log`. |

### Server

| Variable | Description |
|---|---|
| `PORT` | HTTP port the server listens on. Defaults to `3000`. |

---

## reacher.config.yaml

Copy `reacher.config.example.yaml` to `reacher.config.yaml` to use it. Environment variables override YAML values if both are set.

```yaml
ssh:
  # Commands to block — substring matched, case-insensitive
  # ssh_exec will return { blocked: true } without executing
  blocked_commands:
    - 'rm -rf /'
    - 'shutdown'
    - 'reboot'
    - 'mkfs'
    - 'dd'

  # Restrict SSH to specific directory prefixes (prefix match)
  # Leave empty to allow all paths
  allowed_dirs: []

audit:
  # Log every tool call to a file
  enabled: true
  log_path: './reacher-audit.log'

# Dry-run mode — ssh_exec reports what it would run without running it
dry_run: false
```

### Which to use: YAML or env vars?

Use **YAML** for safety rules and audit settings — they're more readable as structured config.

Use **env vars** for secrets (`GITHUB_TOKEN`, `TAILSCALE_API_KEY`, `MCP_SECRET`) and anything that varies by environment (Docker vs local vs staging). Never put secrets in the YAML file.

---

## Minimal .env for each path

**API tools only (no SSH):**

```env
MCP_SECRET=your-secret
GITHUB_TOKEN=your_github_token
PROXY_ALLOWED_DOMAINS=api.github.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN"}
```

**Full setup with SSH:**

```env
MCP_SECRET=your-secret
GITHUB_TOKEN=your_github_token
TAILSCALE_API_KEY=your_tailscale_key
SSH_DEFAULT_USER=your-username
PROXY_ALLOWED_DOMAINS=api.github.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN"}
```

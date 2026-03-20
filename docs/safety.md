# Safety

Reacher gives Claude real access to your infrastructure. These mechanisms let you define the limits. All of them are opt-in and configurable.

---

## SSH command blocklist

Configure `ssh.blocked_commands` in `reacher.config.yaml` (or `SSH_BLOCKED_COMMANDS` in `.env`):

```yaml
ssh:
  blocked_commands:
    - 'rm -rf /'
    - 'shutdown'
    - 'reboot'
    - 'mkfs'
    - 'dd'
```

**Behavior:** substring match, case-insensitive. If the command contains any blocked substring, `ssh_exec` returns immediately without executing:

```json
{
  "success": false,
  "blocked": true,
  "reason": "Command blocked by reacher config",
  "matched_rule": "rm -rf /",
  "command": "rm -rf /var/log"
}
```

---

## SSH directory allowlist

Restrict `ssh_exec` to only run commands that reference allowed paths:

```yaml
ssh:
  allowed_dirs:
    - /home/user
    - /var/log
    - /tmp
```

**Behavior:** prefix match on path-like tokens in the command (tokens starting with `/`, `~/`, or `./`). If a command references a path outside the allowlist, it's blocked.

Leave `allowed_dirs` empty (the default) to place no restriction on paths.

---

## Domain allowlist

`fetch_external` hard-blocks any request to a domain not in `PROXY_ALLOWED_DOMAINS`:

```env
PROXY_ALLOWED_DOMAINS=api.github.com,api.linear.app
```

Claude cannot call any domain not on this list, regardless of what it's asked to do. Add domains explicitly and intentionally.

---

## Audit log

Every tool call is appended to the audit log with:

```json
{
  "timestamp": "2026-03-20T10:00:00.000Z",
  "tool": "ssh_exec",
  "input": { "hostname": "myserver", "command": "df -h", "user": "root" },
  "success": true
}
```

Sensitive keys (anything containing `token`, `password`, `secret`, or `key`) are stripped from the `input` object before logging.

Configure in `reacher.config.yaml`:

```yaml
audit:
  enabled: true
  log_path: './reacher-audit.log'
```

Or via env vars: `AUDIT_ENABLED=true`, `AUDIT_LOG_PATH=./reacher-audit.log`.

---

## Dry-run mode

Set `DRY_RUN=true` (or `dry_run: true` in `reacher.config.yaml`) to have `ssh_exec` report what it would run without actually running it:

```json
{
  "success": true,
  "dry_run": true,
  "would_execute": "docker restart nginx",
  "hostname": "myserver",
  "user": "root"
}
```

Useful when setting up Reacher for the first time or testing new automations. Safety checks (blocklist, allowlist) still run in dry-run mode — blocked commands are still blocked.

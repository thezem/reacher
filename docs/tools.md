# Tool reference

---

## `fetch_external`

Proxy an HTTP request to an allowlisted domain. Auth tokens are injected automatically server-side — Claude never sees your credentials. JSON responses can optionally be transformed to extract specific fields and converted to YAML or JSON format.

**Requires:** `PROXY_ALLOWED_DOMAINS` (and optionally `FETCH_EXTERNAL_TOKEN_MAP` for auth injection)

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `url` | string | Full URL to call |
| `method` | string | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. Defaults to `GET`. |
| `body` | object | Request body for `POST`/`PUT`/`PATCH` requests |
| `headers` | object | Additional headers to include |
| `pick` | array | Optional array of field paths to extract from JSON response. Supports dot-notation for nested objects (`user.login`), deep nesting (`data.user.profile.name`), and array notation (`labels[].name`). Only applies to JSON responses. |
| `format` | string | Response format after transformation: `yaml` (default, converts JSON to YAML) or `json` (returns as object). Only applies to JSON responses. |

**How token injection works:**

`FETCH_EXTERNAL_TOKEN_MAP` is a JSON object mapping domain hostnames to env var names. When a request matches a domain in the map, the server injects `Authorization: Bearer <value>` automatically.

```env
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN","api.linear.app":"LINEAR_TOKEN"}
```

**Response transformation with `pick` and `format`:**

When `pick` is provided, only the specified fields are extracted from the JSON response. This is useful for large API responses when you only need specific data:

- **Dot notation:** `"user.login"` extracts the `login` field from a nested `user` object
- **Deep nesting:** `"data.user.profile.email"` works across any nesting level
- **Array notation:** `"labels[].name"` extracts the `name` field from each object in the `labels` array
- **Nested arrays:** `"commits[].author.name"` extracts nested fields from array elements

The `format` parameter controls output format:
- **`yaml` (default):** Converted to YAML format, ideal for reading large responses in chat
- **`json`:** Returned as JavaScript object, useful for further processing

Both parameters only apply to JSON responses (`Content-Type: application/json`). Text responses (HTML, plain text) pass through unchanged.

**Examples:**

```
# Get all PRs with full details (YAML format by default)
url: "https://api.github.com/repos/owner/repo/pulls"
method: GET

# Get only PR numbers and titles as YAML
url: "https://api.github.com/repos/owner/repo/pulls"
method: GET
pick: ["number", "title"]
format: yaml

# Extract specific fields from contributors list
url: "https://api.github.com/repos/owner/repo/contributors"
method: GET
pick: ["login", "contributions"]
format: yaml

# Extract nested fields and array fields, keep as JSON for processing
url: "https://api.github.com/repos/owner/repo/issues"
method: GET
pick: ["number", "title", "user.login", "labels[].name"]
format: json

# Extract from a top-level array of objects
url: "https://api.github.com/repos/owner/repo/commits"
method: GET
pick: ["sha", "message", "author.name"]
format: yaml
```

**If a domain is blocked:** the tool returns `{ success: false, error: "Domain not allowed" }`. Add the domain to `PROXY_ALLOWED_DOMAINS` in `.env` and restart the server.

---

## `browser`

Control a headless browser via CDP using the `agent-browser` CLI. Requires a running CDP-compatible browser (e.g. [Lightpanda](https://github.com/lightpanda-io/lightpanda), Chromium with `--remote-debugging-port`).

**Requires:** `agent-browser` installed globally (`npm install -g agent-browser`), a browser listening on CDP

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `command` | string | `agent-browser` command to run |

**Common commands:**

| Command | What it does |
|---|---|
| `open https://example.com` | Navigate to a URL |
| `snapshot -i` | Take a snapshot of the current page (returns text/HTML) |
| `click @e2` | Click element by CDP reference ID |
| `fill @e3 "hello world"` | Fill an input field |
| `close` | Close the current page |

The CDP host and port are configurable via `BROWSER_CDP_HOST` and `BROWSER_CDP_PORT` (defaults: `127.0.0.1:9222`).

---

## `gist_kb`

A persistent private knowledge base backed by GitHub Gists. All entries are namespaced under the `cc--` filename prefix automatically — this keeps Reacher's gists separate from your other gists.

**Requires:** `GITHUB_TOKEN` with `gist` scope

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `action` | string | One of: `list`, `get`, `create`, `update`, `delete` |
| `id` | string | Gist ID — required for `get`, `update`, `delete` |
| `title` | string | Filename without the `cc--` prefix (e.g. `device-map.md`). The prefix is added automatically. |
| `content` | string | File content — required for `create`, optional for `update` |
| `description` | string | Gist description |

**Example usage:**

```
# Save a note
action: create
title: device-map.md
content: "myserver — Ubuntu 22.04, root, main VPS\nlaptop — macOS, john"
description: Reacher device map

# Read it back
action: get
id: <gist-id-from-create-response>

# List all Reacher gists
action: list
```

**Conventions that work well:**
- Use descriptive filenames: `device-map.md`, `project-notes.md`, `api-tokens.md`
- Always include the file extension for proper formatting
- At the start of a session, `list` first to check if context from a previous session exists

---

## `github_search`

Search GitHub for pull requests or commits. Returns minimal clean output — only the fields that matter.

**Requires:** `GITHUB_TOKEN` + `api.github.com` in `PROXY_ALLOWED_DOMAINS`

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `type` | string | `prs` or `commits` |
| `repo` | string | Repository in `owner/repo` format |
| `author` | string | GitHub username |
| `created_after` | string | ISO date string (e.g. `2026-03-01`) — finds items created after this date |
| `per_page` | number | Results per page, 1–100. Defaults to 25. |

**PR output:**

```json
{
  "number": 42,
  "title": "Add retry logic",
  "url": "https://github.com/owner/repo/pull/42",
  "state": "open",
  "draft": false,
  "merged": false,
  "created_at": "2026-03-10"
}
```

**Commit output:**

```json
{
  "sha": "a3f9c2d",
  "message": "Add retry logic",
  "date": "2026-03-10",
  "url": "https://github.com/owner/repo/commit/a3f9c2d..."
}
```

**Good for:** "What did I work on last week?", building changelogs, reviewing a teammate's recent activity.

---

## `ssh_exec`

Run a shell command on a remote device via Tailscale SSH. Supports both Linux/macOS (`cmd`) and Windows (`powershell`).

**Requires:** `TAILSCALE_API_KEY` set (activates SSH tools), SSH private key at `/root/.ssh/reacher-key`, Tailscale running on target devices

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `hostname` | string | Tailscale hostname of the target device |
| `command` | string | Shell command to run |
| `user` | string | SSH user. Defaults to `SSH_DEFAULT_USER` env var, or `root`. |
| `shell` | string | `cmd` or `powershell` (Windows only). Defaults to `cmd`. |

**Timeout:** 30 seconds. **Output cap:** 10 MB.

**Examples:**

```
# Check disk space on a Linux server
hostname: myserver
command: df -h

# List running Docker containers
hostname: myserver
command: docker ps

# Restart a service
hostname: myserver
command: systemctl restart nginx

# Run a PowerShell command on Windows
hostname: my-windows-pc
user: john
shell: powershell
command: Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
```

**Exit codes:**
- `0` = success
- `255` after a Windows shutdown/hibernate/restart command = success (machine went offline before responding)
- Any other non-zero = command failed; check `stderr` in the response

**Safety:** Commands are checked against `ssh.blocked_commands` in `reacher.config.yaml` before execution. See [safety.md](safety.md).

---

## `tailscale_status`

List all devices in your Tailscale network with their status, IPs, and OS.

**Requires:** `TAILSCALE_API_KEY`

**No parameters.**

**Output:**

```json
{
  "summary": { "total": 4, "online": 3, "offline": 1 },
  "devices": [
    {
      "name": "myserver.example.com",
      "hostname": "myserver",
      "status": "online",
      "os": "linux",
      "ips": ["100.64.0.1"],
      "lastSeen": "2026-03-20T10:00:00Z"
    }
  ]
}
```

**Note:** Online/offline status can occasionally be stale. If a device shows offline but you expect it to be on, try `ssh_exec` anyway — the SSH connection will confirm.

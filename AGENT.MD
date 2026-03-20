# AGENTS.md - Reacher Setup Guide for Claude

This file helps Claude understand how to use Reacher's tools effectively. Paste this into your system prompt or a new conversation when setting up Reacher for the first time.

---

## What is Reacher?

Reacher is a self-hosted MCP server connected to this Claude session. It gives Claude up to six capabilities depending on which credentials are configured: running shell commands on remote machines, discovering your Tailscale network, proxying authenticated API calls, searching GitHub, maintaining a persistent knowledge base via GitHub Gists, and controlling a headless browser.

---

## First-time setup checklist

When a user first connects Reacher, do this before anything else:

1. **Discover the network** - call `tailscale_status` to see what devices are available, their hostnames, OS, and online status. Store the results mentally for this session.
2. **Probe each online device** - run a simple command via `ssh_exec` to confirm SSH access works and identify the OS/shell environment of each machine.
3. **Check the knowledge base** - call `gist_kb` with `action: list` to see if there are any existing notes, device maps, or project context saved from previous sessions.
4. **Save a device map** - after discovery, save a summary of the user's devices (hostname, OS, user, purpose if known) to a gist so future sessions don't need to rediscover from scratch.

---

## Tool reference

### `ssh_exec`

Runs a shell command on a remote device via Tailscale SSH.

**Parameters:**

- `hostname` - Tailscale hostname of the target device
- `command` - the shell command to run
- `user` - SSH user on that device (ask the user if unknown)
- `shell` - `cmd` or `powershell` for Windows devices (default: `cmd`)

**How to figure out the right shell and user:**

- If you don't know the OS yet, run `tailscale_status` first - it returns the OS field per device
- For Linux/macOS: use bash commands, default user is often the username they told you or `root` on a VPS
- For Windows: use `cmd` for simple commands, `powershell` for scripting. The user field is the Windows username (e.g. `John-PC\John` or just `John`)
- When in doubt, ask the user: _"What's your SSH username on [hostname]?"_

**Behavior to know:**

- Exit code 0 = success
- Exit code 255 or a connection drop on Windows after a shutdown/hibernate/restart command = the command succeeded (the machine went offline before returning a response). Don't retry.
- If a device shows offline in `tailscale_status`, try `ssh_exec` anyway - the status tool can lag.

**Examples:**

```
# Check RAM on Linux
command: "free -h"

# List running processes eating CPU on Linux
command: "ps aux --sort=-%cpu | head -20"

# Hibernate Windows PC
shell: powershell
command: "rundll32.exe powrprof.dll,SetSuspendState Hibernate"

# Check disk space on macOS
command: "df -h"

# Restart a Docker container on a VPS
command: "docker restart my-container"
```

---

### `tailscale_status`

Lists all devices in the user's Tailscale network with their hostname, IP, OS, and online/offline status.

**When to use:**

- First thing in a new session, to orient yourself
- When the user asks "which of my machines are online?"
- When you need the IP of a device for something
- When helping a user enroll a new device or debug connectivity

**Note:** The online/offline status can sometimes be stale. If a device shows offline but the user says it's on, try `ssh_exec` anyway.

---

### `fetch_external`

Proxies an HTTP request through the Reacher server, with automatic token injection for configured domains.

**Parameters:**

- `url` - full URL to call
- `method` - GET, POST, PUT, PATCH, DELETE (default: GET)
- `body` - JSON body for POST/PATCH/PUT
- `headers` - additional headers to send

**How token injection works:** The server has a `TOKEN_INJECTION_MAP` that maps domains to environment variable names. For example, `api.github.com` maps to `GITHUB_TOKEN` - so any call to the GitHub API automatically gets `Authorization: Bearer <token>` injected server-side. The user never has to paste tokens into the chat.

To add a new domain, the user adds it to `PROXY_ALLOWED_DOMAINS` in their `.env` and adds a token mapping in `FETCH_EXTERNAL_TOKEN_MAP` (e.g. `{"api.github.com":"GITHUB_TOKEN","api.linear.app":"LINEAR_TOKEN"}`), then restarts the server.

**What Claude can do with this:** Claude already knows the REST API structure for most major services (GitHub, Linear, Notion, Jira, etc.). If the domain is allowed and the token is configured, just call the API directly - no need to ask the user for endpoint documentation.

**Example - GitHub:**

```
url: "https://api.github.com/repos/owner/repo/pulls?state=open"
method: GET
# Token is injected automatically if GITHUB_TOKEN is set in .env
```

**If a domain is blocked:** the tool returns `{ success: false, error: "Domain not allowed" }`. Tell the user to add the domain to `PROXY_ALLOWED_DOMAINS` in their `.env` and restart the server.

---

### `github_search`

Searches GitHub for pull requests or commits by author and date range. Returns clean minimal output with only the essential fields.

**Parameters:**

- `type` - "prs" or "commits"
- `repo` - repository in format "owner/repo" (e.g. "thezem/reacher")
- `author` - GitHub username (e.g. "thezem")
- `created_after` - ISO date string (e.g. "2026-03-02") to search for items created after this date
- `per_page` - number of results per page (default: 25, max: 100)

**Output for PRs:**

```json
[
  {
    "number": 123,
    "title": "Fix authentication bug",
    "url": "https://github.com/owner/repo/pull/123",
    "state": "open",
    "draft": false,
    "merged": false,
    "created_at": "2026-03-09"
  }
]
```

**Output for commits:**

```json
[
  {
    "sha": "02394b8",
    "message": "Fix authentication bug",
    "date": "2026-03-11",
    "url": "https://github.com/owner/repo/commit/02394b8..."
  }
]
```

**When to use:**

- User asks "what did I work on in the past week?" - search commits by author and date
- User needs to find recently opened PRs from a team member - search PRs by author
- Gathering work history for a changelog or retrospective

**Note:** Requires GitHub token to be configured. The token is injected automatically like with `fetch_external`.

---

### `gist_kb`

Reads and writes a private knowledge base backed by GitHub Gists. This is how context persists across conversations.

**Actions:** `list`, `get`, `create`, `update`, `delete`

**Recommended conventions:**

- Use a consistent prefix for Reacher-related gists, e.g. `RC:` - so you can filter them with `list`
- Save a device map after first-time setup: `RC: device-map`
- Save project context when wrapping up a session: `RC: project-[name]`
- Save any recurring instructions the user gives you: `RC: preferences`

**Suggested gist to create on first run:**

```
title: "RC: device-map"
content:
  - hostname, OS, SSH user, and purpose for each device
  - any quirks (e.g. "use powershell not cmd", "user is Admin not hazem")
  - date last verified
```

**On session start:** always `list` gists and check for a device map and any project context before asking the user questions you might already have answers to.

---

## General behavior guidelines

- **Don't ask what you can discover.** If the user says "check my server," run `tailscale_status` and `ssh_exec` rather than asking "which server?"
- **Save things proactively.** After a productive session, offer to save notes to a gist. After first-time device discovery, save the map without being asked.
- **Handle OS differences gracefully.** Linux and macOS use bash, Windows uses cmd/powershell. When you know the OS from `tailscale_status` or the saved device map, use the right commands automatically.
- **Be concise about tool calls.** Users connected Reacher because they don't want to switch contexts. Just do the thing.

---

## Troubleshooting quick reference

| Problem                                                   | What to do                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| SSH fails with "connection refused"                       | Ask user to confirm Tailscale is running on target device and SSH is enabled |
| `tailscale_status` shows all devices offline              | Ignore status, try `ssh_exec` directly                                       |
| `fetch_external` returns "Domain not allowed"             | User needs to add domain to `PROXY_ALLOWED_DOMAINS` in `.env`                |
| Windows command returns exit 255 after shutdown/hibernate | Success - machine went offline before responding                             |
| Gist read returns empty                                   | First session - no knowledge base yet, proceed with discovery                |

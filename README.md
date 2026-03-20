# Reacher

Give Claude authenticated access to your APIs, a persistent knowledge base, a headless browser, and optionally your machines — on infrastructure you control.

[![v0.1.2](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://github.com/thezem/reacher/releases/tag/v0.1.2) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

<video src="https://i.ouim.me/i/3c3ea779.mp4" controls width="640" style="max-width:100%;border-radius:8px"></video>

<table>
  <tr>
    <td colspan="2"><img src="/imgs/reacher.png" alt="Claude exploring code on a remote machine via Reacher SSH tool" width="640" /></td>
  </tr>
  <tr>
    <td><img src="/imgs/ship.png" alt="Claude + Reacher MCP creating a tag and release for the Reacher repo" width="640" /></td>
  </tr>
</table>

<i style="display:block;text-align:center;font-size:0.9em;color:#666;margin-top:10px;">
If you're an agent reading this, check out AGENT.MD for a tour of your new capabilities, and docs/skill.md for an interactive setup guide you can follow with your user.
</i>

---

## What it does

Most MCP connectors give you one tool per API action. Reacher's `fetch_external` tool takes a different approach: it proxies any HTTP request to any domain you allowlist, injecting your auth token automatically. Claude already knows REST APIs — it doesn't need a bespoke `github_list_prs` tool. It just needs a way to call `api.github.com` with your token, without you pasting credentials into every prompt.

```
PROXY_ALLOWED_DOMAINS=api.github.com,api.linear.app,api.notion.com
FETCH_EXTERNAL_TOKEN_MAP={"api.github.com":"GITHUB_TOKEN","api.linear.app":"LINEAR_TOKEN"}
```

Three APIs. One tool. New service = one line in `.env`.

---

## Why self-hosted?

Your credentials never leave your server. When Claude calls `fetch_external`, the token injection happens server-side — Claude sees the response, never the key. When it calls `ssh_exec`, commands run through a server you own, authenticated with a key you control, over your Tailscale mesh. The whole chain is yours, not a third-party sandbox.

This also means Reacher persists across conversations. Your knowledge base, your device map, your allowed domains — they're all still there next session without any re-setup.

---

## Pick your path

You don't need a VPS. Start with whatever matches where you are.

| I want...                                                     | I need                      | Time    |
| ------------------------------------------------------------- | --------------------------- | ------- |
| Claude to call my APIs + remember things across conversations | Node.js + GitHub token      | ~5 min  |
| + control a headless browser                                  | Above + a browser with CDP  | ~10 min |
| + SSH into my servers and machines                            | Above + Tailscale + SSH key | ~30 min |

**→ [Get started](docs/setup.md)**

---

## Tools

| Tool               | What it does                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `fetch_external`   | Proxy HTTP requests to allowlisted domains with automatic auth injection |
| `browser`          | Control a headless browser via CDP — scrape, click, fill forms, snapshot |
| `gist_kb`          | Persistent private knowledge base backed by GitHub Gists                 |
| `github_search`    | Search PRs and commits by author and date range                          |
| `ssh_exec`         | Run shell commands on any machine in your Tailscale mesh                 |
| `tailscale_status` | List all your devices with online/offline status and IPs                 |

The server only registers tools you have credentials for. No `GITHUB_TOKEN` = no Gist or search tools. No `TAILSCALE_API_KEY` = no SSH tools. Start small, add more when you need it.

---

## Docs

|                                        |                                                   |
| -------------------------------------- | ------------------------------------------------- |
| [Setup guide](docs/setup.md)           | Three paths: local, Cloudflare Tunnel, or VPS     |
| [Configuration](docs/configuration.md) | All env vars and `reacher.config.yaml` reference  |
| [Tool reference](docs/tools.md)        | Parameters, examples, and behavior notes per tool |
| [Safety](docs/safety.md)               | Command blocklists, domain allowlists, audit log  |
| [Deployment](docs/deployment.md)       | Docker, EasyPanel, Railway, PM2, HTTPS setup      |
| [Extending](docs/extending.md)         | Adding your own tools                             |

**Already set up and want Claude to orient itself?** Drop [AGENT.MD](AGENT.MD) into your session — Claude will discover your devices, probe SSH access, and save a persistent map to your knowledge base.

**Want Claude to walk you through setup interactively?** Point it at [docs/skill.md](docs/skill.md) — it's a step-by-step setup guide written for AI agents to follow with you.

---

## License

MIT

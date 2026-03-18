# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-18

### Added

- `reacher.config.yaml` support with environment variable override fallback
- SSH command blocklist - configurable via `ssh.blocked_commands` in config (e.g., "rm -rf", "shutdown", "reboot")
- SSH directory allowlist - configurable via `ssh.allowed_dirs` in config (optional; empty = no restriction)
- Dry-run mode - set `dry_run: true` in config or `DRY_RUN=true` in env to test commands without execution
- Audit logging system - every tool call logged to `reacher-audit.log` with timestamp, tool name, user, and result
- `SKILL.md` - AI-agent-readable setup guide for new users (walk-through format for Claude)
- `reacher.config.example.yaml` - fully documented config template with defaults and explanations
- Health endpoint now exposes `dry_run` status via `/health`
- Startup log shows which tools are registered and whether dry-run is active

### Changed

- README rewritten with clearer pitch (the Node.js story), focused tool descriptions, and safety documentation
- `.env.example` updated to reflect new security and audit configuration options
- Removed obsolete environment variables (`TELEGRAM_BOT_TOKEN`, `DEFAULT_CHAT_ID`, `CLAUDE_JOBS_DIR`)
- Updated project metadata in `package.json` (version, name, description, repository, homepage)
- Fixed startup log in `index.js` to list correct tools instead of non-existent ones

### Fixed

- Startup validation now only requires `MCP_SECRET`, `TAILSCALE_API_KEY`, and `GITHUB_TOKEN` (removed Telegram dependencies)
- Better TAILSCALE_API_KEY documentation (clarified it only needs "Devices (read)" scope, not "read-only" label)

[0.1.0]: https://github.com/thezem/reacher/releases/tag/v0.1.0

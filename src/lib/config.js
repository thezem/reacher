/**
 * Config system
 * Loads configuration from reacher.config.yaml with full .env fallback
 */

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..', '..')

// Load YAML config
let yamlConfig = {}
const yamlPath = path.join(projectRoot, 'reacher.config.yaml')
try {
  const content = fs.readFileSync(yamlPath, 'utf-8')
  yamlConfig = yaml.load(content) || {}
} catch {
  // No YAML file found, use empty object (graceful fallback)
}

const envVars = process.env

// Build the final config object with .env always winning over YAML
export const config = {
  ssh: {
    blocked_commands:
      yamlConfig.ssh?.blocked_commands ||
      (envVars.SSH_BLOCKED_COMMANDS || '').split(',').filter(c => c.trim()),
    allowed_dirs:
      yamlConfig.ssh?.allowed_dirs ||
      (envVars.SSH_ALLOWED_DIRS || '').split(',').filter(d => d.trim()),
  },
  audit: {
    enabled:
      envVars.AUDIT_ENABLED === 'false' ? false : (yamlConfig.audit?.enabled ?? true),
    log_path:
      envVars.AUDIT_LOG_PATH || yamlConfig.audit?.log_path || './reacher-audit.log',
  },
  dry_run: envVars.DRY_RUN === 'true' ? true : (yamlConfig.dry_run ?? false),
}

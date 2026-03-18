import test from 'node:test'
import assert from 'node:assert'

// These tests verify the config module behavior is working correctly
// by testing the logic rules that the config system implements

test('Config module has expected structure', async () => {
  // The config module is at src/lib/config.js
  // We test it by importing and checking its exports
  const { config } = await import('../src/lib/config.js')

  // Verify expected structure exists
  assert(config.ssh, 'config.ssh should exist')
  assert(Array.isArray(config.ssh.blocked_commands), 'ssh.blocked_commands should be an array')
  assert(Array.isArray(config.ssh.allowed_dirs), 'ssh.allowed_dirs should be an array')

  assert(config.audit, 'config.audit should exist')
  assert(typeof config.audit.enabled === 'boolean', 'audit.enabled should be boolean')
  assert(typeof config.audit.log_path === 'string', 'audit.log_path should be string')

  assert(typeof config.dry_run === 'boolean', 'dry_run should be boolean')
})

test('Config loads with defaults when no YAML and no env vars', async () => {
  // Clean environment
  const savedEnv = {
    SSH_BLOCKED_COMMANDS: process.env.SSH_BLOCKED_COMMANDS,
    SSH_ALLOWED_DIRS: process.env.SSH_ALLOWED_DIRS,
    AUDIT_ENABLED: process.env.AUDIT_ENABLED,
    AUDIT_LOG_PATH: process.env.AUDIT_LOG_PATH,
    DRY_RUN: process.env.DRY_RUN,
  }

  try {
    delete process.env.SSH_BLOCKED_COMMANDS
    delete process.env.SSH_ALLOWED_DIRS
    delete process.env.AUDIT_ENABLED
    delete process.env.AUDIT_LOG_PATH
    delete process.env.DRY_RUN

    const { config } = await import(`../src/lib/config.js?v=${Date.now()}`)

    // Verify defaults
    assert.deepEqual(config.ssh.blocked_commands, [])
    assert.deepEqual(config.ssh.allowed_dirs, [])
    assert.equal(config.audit.enabled, true)
    assert.equal(config.audit.log_path, './reacher-audit.log')
    assert.equal(config.dry_run, false)
  } finally {
    // Restore environment
    Object.entries(savedEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value
      }
    })
  }
})

test('Config SSH blocked_commands from env var', async () => {
  const savedEnv = process.env.SSH_BLOCKED_COMMANDS
  process.env.SSH_BLOCKED_COMMANDS = 'wget,curl,nc'

  try {
    const { config } = await import(`../src/lib/config.js?v=${Date.now()}`)
    assert.deepEqual(config.ssh.blocked_commands, ['wget', 'curl', 'nc'])
  } finally {
    if (savedEnv !== undefined) {
      process.env.SSH_BLOCKED_COMMANDS = savedEnv
    } else {
      delete process.env.SSH_BLOCKED_COMMANDS
    }
  }
})

test('Config SSH allowed_dirs from env var', async () => {
  const savedEnv = process.env.SSH_ALLOWED_DIRS
  process.env.SSH_ALLOWED_DIRS = '/home/user,/tmp'

  try {
    const { config } = await import(`../src/lib/config.js?v=${Date.now()}`)
    assert.deepEqual(config.ssh.allowed_dirs, ['/home/user', '/tmp'])
  } finally {
    if (savedEnv !== undefined) {
      process.env.SSH_ALLOWED_DIRS = savedEnv
    } else {
      delete process.env.SSH_ALLOWED_DIRS
    }
  }
})

test('Config AUDIT_LOG_PATH env var overrides default', async () => {
  const savedEnv = process.env.AUDIT_LOG_PATH
  process.env.AUDIT_LOG_PATH = '/custom/path/audit.log'

  try {
    const { config } = await import(`../src/lib/config.js?v=${Date.now()}`)
    assert.equal(config.audit.log_path, '/custom/path/audit.log')
  } finally {
    if (savedEnv !== undefined) {
      process.env.AUDIT_LOG_PATH = savedEnv
    } else {
      delete process.env.AUDIT_LOG_PATH
    }
  }
})

test('Config DRY_RUN env var controls dry_run setting', async () => {
  const savedEnv = process.env.DRY_RUN
  process.env.DRY_RUN = 'true'

  try {
    const { config } = await import(`../src/lib/config.js?v=${Date.now()}`)
    assert.equal(config.dry_run, true)
  } finally {
    if (savedEnv !== undefined) {
      process.env.DRY_RUN = savedEnv
    } else {
      delete process.env.DRY_RUN
    }
  }
})

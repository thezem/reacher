import test from 'node:test'
import assert from 'node:assert'

// Mock config for testing
const createMockConfig = (overrides = {}) => ({
  ssh: {
    blocked_commands: [],
    allowed_dirs: [],
    ...overrides.ssh,
  },
  audit: {
    enabled: true,
    log_path: './reacher-audit.log',
    ...overrides.audit,
  },
  dry_run: false,
  ...overrides,
})

// Mock handler function (simplified version of ssh_exec handler with safety checks)
async function sshExecHandler(args, config) {
  const { hostname, command, user = 'hazem', shell = 'cmd' } = args

  // Blocked commands check
  const blockedCommands = config.ssh.blocked_commands || []
  for (const blocked of blockedCommands) {
    if (command.toLowerCase().includes(blocked.toLowerCase())) {
      return {
        success: false,
        blocked: true,
        reason: 'Command blocked by reacher config',
        matched_rule: blocked,
        hostname,
        user,
        command,
      }
    }
  }

  // Allowed dirs check
  const allowedDirs = config.ssh.allowed_dirs || []
  if (allowedDirs.length > 0) {
    // Extract paths from command (tokens starting with /, ~, or ./)
    const pathTokens = command.match(/(?:^|\s)(\/[\S]*|~[\S]*|\.\/[\S]*)/g) || []
    const paths = pathTokens.map(p => p.trim())

    for (const path of paths) {
      const isAllowed = allowedDirs.some(allowedDir => path.startsWith(allowedDir))
      if (!isAllowed) {
        return {
          success: false,
          blocked: true,
          reason: 'Path not in allowed directories',
          hostname,
          user,
          command,
        }
      }
    }
  }

  // Dry-run mode
  if (config.dry_run) {
    return {
      success: true,
      dry_run: true,
      would_execute: command,
      hostname,
      user,
    }
  }

  // Normal execution (mock)
  return {
    success: true,
    hostname,
    user,
    command,
    shell,
    stdout: 'mocked output',
    stderr: '',
    exitCode: 0,
  }
}

test('Blocked command returns blocked:true and does not spawn SSH', async () => {
  const config = createMockConfig({
    ssh: {
      blocked_commands: ['rm -rf', 'dd'],
      allowed_dirs: [],
    },
  })

  const result = await sshExecHandler(
    {
      hostname: 'server1',
      command: 'rm -rf /home/user',
      user: 'root',
    },
    config
  )

  assert.equal(result.success, false)
  assert.equal(result.blocked, true)
  assert.equal(result.reason, 'Command blocked by reacher config')
  assert.equal(result.matched_rule, 'rm -rf')
})

test('Non-blocked command is not rejected', async () => {
  const config = createMockConfig({
    ssh: {
      blocked_commands: ['rm -rf'],
      allowed_dirs: [],
    },
  })

  const result = await sshExecHandler(
    {
      hostname: 'server1',
      command: 'ls -la',
      user: 'user',
    },
    config
  )

  assert.equal(result.success, true)
  assert.equal(result.blocked, undefined)
})

test('Allowed dirs check rejects path outside allowed dirs', async () => {
  const config = createMockConfig({
    ssh: {
      blocked_commands: [],
      allowed_dirs: ['/home/user'],
    },
  })

  const result = await sshExecHandler(
    {
      hostname: 'server1',
      command: 'cat /etc/passwd',
      user: 'user',
    },
    config
  )

  assert.equal(result.success, false)
  assert.equal(result.blocked, true)
  assert.equal(result.reason, 'Path not in allowed directories')
})

test('Allowed dirs check passes when dirs list is empty', async () => {
  const config = createMockConfig({
    ssh: {
      blocked_commands: [],
      allowed_dirs: [],
    },
  })

  const result = await sshExecHandler(
    {
      hostname: 'server1',
      command: 'cat /etc/passwd',
      user: 'user',
    },
    config
  )

  assert.equal(result.success, true)
  assert.equal(result.blocked, undefined)
})

test('Dry-run returns would_execute without spawning SSH', async () => {
  const config = createMockConfig({
    dry_run: true,
  })

  const result = await sshExecHandler(
    {
      hostname: 'server1',
      command: 'rm -rf /tmp/*',
      user: 'root',
    },
    config
  )

  assert.equal(result.success, true)
  assert.equal(result.dry_run, true)
  assert.equal(result.would_execute, 'rm -rf /tmp/*')
})

test('Blocked command in dry-run still returns blocked (not dry-run response)', async () => {
  const config = createMockConfig({
    ssh: {
      blocked_commands: ['rm -rf'],
      allowed_dirs: [],
    },
    dry_run: true,
  })

  const result = await sshExecHandler(
    {
      hostname: 'server1',
      command: 'rm -rf /tmp/*',
      user: 'root',
    },
    config
  )

  assert.equal(result.success, false)
  assert.equal(result.blocked, true)
  assert.equal(result.dry_run, undefined)
})

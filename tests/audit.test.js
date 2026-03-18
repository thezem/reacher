import test from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

// Mock audit function (simplified version)
async function auditLog(toolName, input, result, config) {
  const { enabled, log_path } = config.audit

  if (!enabled) {
    return
  }

  // Strip sensitive keys from input
  const sensitiveKeys = ['token', 'password', 'secret', 'key']
  const cleanInput = { ...input }
  for (const key of sensitiveKeys) {
    for (const k of Object.keys(cleanInput)) {
      if (k.toLowerCase().includes(key.toLowerCase())) {
        delete cleanInput[k]
      }
    }
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    tool: toolName,
    input: cleanInput,
    success: result?.success ?? true,
  }

  try {
    await fs.appendFile(log_path, JSON.stringify(logEntry) + '\n')
  } catch (err) {
    // Swallow errors - don't crash the server
    console.error('Audit log write error:', err.message)
  }
}

test('auditLog writes a line to the log file', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-test-'))
  const logPath = path.join(tempDir, 'audit.log')

  try {
    const config = {
      audit: {
        enabled: true,
        log_path: logPath,
      },
    }

    await auditLog('ssh_exec', { hostname: 'server1', command: 'ls' }, { success: true }, config)

    const content = await fs.readFile(logPath, 'utf-8')
    assert(content.includes('ssh_exec'), 'Tool name should be in log')
    assert(content.includes('server1'), 'Hostname should be in log')
  } finally {
    await fs.rm(tempDir, { recursive: true })
  }
})

test('Written line is valid JSON with expected fields', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-test-'))
  const logPath = path.join(tempDir, 'audit.log')

  try {
    const config = {
      audit: {
        enabled: true,
        log_path: logPath,
      },
    }

    const input = { hostname: 'server1', command: 'ls -la' }
    const result = { success: true, exitCode: 0 }

    await auditLog('ssh_exec', input, result, config)

    const content = await fs.readFile(logPath, 'utf-8')
    const logEntry = JSON.parse(content.trim())

    assert(logEntry.timestamp, 'Should have timestamp')
    assert.equal(logEntry.tool, 'ssh_exec')
    assert.deepEqual(logEntry.input, input)
    assert.equal(logEntry.success, true)
  } finally {
    await fs.rm(tempDir, { recursive: true })
  }
})

test('Sensitive keys are stripped from input before writing', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-test-'))
  const logPath = path.join(tempDir, 'audit.log')

  try {
    const config = {
      audit: {
        enabled: true,
        log_path: logPath,
      },
    }

    const input = {
      hostname: 'server1',
      api_token: 'secret123',
      password: 'mypass',
      API_KEY: 'key456',
      someOtherField: 'value',
    }

    await auditLog('fetch_external', input, { success: true }, config)

    const content = await fs.readFile(logPath, 'utf-8')
    const logEntry = JSON.parse(content.trim())

    assert(!logEntry.input.api_token, 'api_token should be stripped')
    assert(!logEntry.input.password, 'password should be stripped')
    assert(!logEntry.input.API_KEY, 'API_KEY should be stripped')
    assert.equal(logEntry.input.someOtherField, 'value', 'Non-sensitive fields should remain')
  } finally {
    await fs.rm(tempDir, { recursive: true })
  }
})

test('auditLog is a no-op when audit.enabled is false', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-test-'))
  const logPath = path.join(tempDir, 'audit.log')

  try {
    const config = {
      audit: {
        enabled: false,
        log_path: logPath,
      },
    }

    await auditLog('ssh_exec', { hostname: 'server1' }, { success: true }, config)

    // File should not exist
    try {
      await fs.access(logPath)
      assert.fail('Log file should not exist when audit is disabled')
    } catch (err) {
      // Expected - file should not exist
      assert(err.code === 'ENOENT')
    }
  } finally {
    await fs.rm(tempDir, { recursive: true })
  }
})

test('A failed file write does not throw (it should swallow the error)', async () => {
  const config = {
    audit: {
      enabled: true,
      log_path: '/invalid/nonexistent/path/audit.log',
    },
  }

  // This should not throw
  try {
    await auditLog('ssh_exec', { hostname: 'server1' }, { success: true }, config)
  } catch (err) {
    assert.fail('auditLog should not throw on file write error')
  }
})

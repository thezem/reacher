import test from 'node:test'
import assert from 'node:assert'

// Import the handler and schema
const { handler, schema } = await import('../src/tools/fetch_external.js')

// Mock fetch for testing
const originalFetch = globalThis.fetch

function setupMockFetch(response) {
  globalThis.fetch = async (url, options) => {
    return new Response(JSON.stringify(response), {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
      },
    })
  }
}

function setupMockFetchText(responseText, contentType = 'text/plain') {
  globalThis.fetch = async (url, options) => {
    return new Response(responseText, {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': contentType,
      },
    })
  }
}

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

// Test schema includes new parameters
test('Schema includes pick and format parameters', () => {
  assert(schema.pick !== undefined, 'schema should have pick parameter')
  assert(schema.format !== undefined, 'schema should have format parameter')
})

// Test basic YAML transformation (default format)
test('JSON response is transformed to YAML by default', async () => {
  setupMockFetch({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(typeof result.body, 'string', 'body should be a string (YAML)')
  assert(result.body.includes('id: 1'), 'YAML should contain id field')
  assert(result.body.includes('name: John'), 'YAML should contain name field')
})

// Test JSON format (explicit)
test('JSON response is returned as JSON when format is "json"', async () => {
  setupMockFetch({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(typeof result.body, 'object', 'body should be an object (JSON)')
  assert.equal(result.body.id, 1, 'should contain id field')
  assert.equal(result.body.name, 'John', 'should contain name field')
})

// Test pick parameter with single fields
test('pick parameter extracts specified fields', async () => {
  setupMockFetch({
    id: 123,
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
      pick: ['id', 'name'],
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(Object.keys(result.body).length, 2, 'should only have 2 fields')
  assert.equal(result.body.id, 123, 'should include id')
  assert.equal(result.body.name, 'John Doe', 'should include name')
  assert.equal(result.body.email, undefined, 'should not include email')
  assert.equal(result.body.password, undefined, 'should not include password')
})

// Test pick with dot notation (nested objects)
test('pick parameter supports dot notation for nested objects', async () => {
  setupMockFetch({
    id: 1,
    user: {
      login: 'octocat',
      name: 'The Octocat',
    },
    repo: {
      name: 'Hello-World',
    },
  })

  const result = await handler(
    {
      url: 'https://api.github.com/repos/octocat/Hello-World',
      method: 'GET',
      pick: ['id', 'user.login', 'repo.name'],
      format: 'json',
    },
    'api.github.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(result.body.id, 1, 'should include id')
  assert.equal(result.body['user.login'], 'octocat', 'should extract user.login')
  assert.equal(result.body['repo.name'], 'Hello-World', 'should extract repo.name')
})

// Test pick with array notation
test('pick parameter supports array notation (labels[].name)', async () => {
  setupMockFetch({
    id: 1,
    title: 'Bug report',
    labels: [
      { id: 101, name: 'bug' },
      { id: 102, name: 'urgent' },
      { id: 103, name: 'backend' },
    ],
  })

  const result = await handler(
    {
      url: 'https://api.github.com/repos/octocat/Hello-World/issues/1',
      method: 'GET',
      pick: ['id', 'labels[].name'],
      format: 'json',
    },
    'api.github.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(result.body.id, 1, 'should include id')
  assert(Array.isArray(result.body['labels[].name']), 'should return array')
  assert.deepEqual(result.body['labels[].name'], ['bug', 'urgent', 'backend'], 'should extract label names')
})

// Test pick with format (combined)
test('pick and format parameters work together', async () => {
  setupMockFetch({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
      pick: ['id', 'name'],
      format: 'yaml',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(typeof result.body, 'string', 'body should be YAML string')
  assert(result.body.includes('id: 1'), 'YAML should contain picked id')
  assert(result.body.includes('name: John'), 'YAML should contain picked name')
  assert(!result.body.includes('email'), 'YAML should not contain unpicked email')
})

// Test that non-JSON responses are unaffected
test('non-JSON responses are returned as text unchanged', async () => {
  const htmlResponse = '<html><body>Hello World</body></html>'
  setupMockFetchText(htmlResponse, 'text/html')

  const result = await handler(
    {
      url: 'https://example.com/page',
      method: 'GET',
      pick: ['something'],
      format: 'yaml',
    },
    'example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(result.body, htmlResponse, 'text response should be unchanged')
})

// Test empty pick array
test('empty pick array returns empty object', async () => {
  setupMockFetch({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
      pick: [],
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.deepEqual(result.body, {}, 'empty pick should result in empty object')
})

// Test pick without format (should default to YAML)
test('pick without format defaults to YAML', async () => {
  setupMockFetch({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
      pick: ['id', 'name'],
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(typeof result.body, 'string', 'body should be YAML string by default')
  assert(result.body.includes('id: 1'), 'YAML should contain id')
  assert(result.body.includes('name: John'), 'YAML should contain name')
})

// Test pick with non-existent field
test('pick with non-existent field returns undefined', async () => {
  setupMockFetch({
    id: 1,
    name: 'John',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
      pick: ['id', 'nonexistent'],
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(result.body.id, 1, 'should include id')
  assert.equal(result.body.nonexistent, undefined, 'non-existent field should be undefined')
})

// Test pick with deeply nested dot notation
test('pick supports deeply nested dot notation', async () => {
  setupMockFetch({
    data: {
      user: {
        profile: {
          name: 'John Doe',
          location: 'New York',
        },
      },
    },
  })

  const result = await handler(
    {
      url: 'https://api.example.com/data',
      method: 'GET',
      pick: ['data.user.profile.name', 'data.user.profile.location'],
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(result.body['data.user.profile.name'], 'John Doe', 'should extract deeply nested field')
  assert.equal(result.body['data.user.profile.location'], 'New York', 'should extract deeply nested field')
})

// Test response structure (body key exists)
test('transformed response body is returned under the same body key', async () => {
  setupMockFetch({
    id: 1,
    name: 'John',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/user',
      method: 'GET',
      pick: ['id'],
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert(result.hasOwnProperty('body'), 'response should have body key')
  assert.equal(result.body.id, 1, 'body should contain transformed data')
})

// Test array of objects (top-level array)
test('pick works with array of objects at top level', async () => {
  setupMockFetch([
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ])

  const result = await handler(
    {
      url: 'https://api.example.com/users',
      method: 'GET',
      pick: ['[].id', '[].name'],
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert(Array.isArray(result.body), 'body should be an array')
  assert.equal(result.body.length, 2, 'should have 2 items')
  assert.deepEqual(result.body[0], { id: 1, name: 'John' }, 'first item should be picked')
  assert.deepEqual(result.body[1], { id: 2, name: 'Jane' }, 'second item should be picked')
})

// Test YAML output with special characters
test('YAML transformation handles special characters correctly', async () => {
  setupMockFetch({
    id: 1,
    description: 'Multi-line\ndescription with: special chars & symbols',
  })

  const result = await handler(
    {
      url: 'https://api.example.com/item',
      method: 'GET',
      pick: ['id', 'description'],
      format: 'yaml',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert.equal(typeof result.body, 'string', 'body should be string')
  // YAML should properly escape special characters
  assert(result.body.includes('description:'), 'YAML should contain description key')
})

// Test pick with top-level array and dot notation fields
test('pick with top-level array and dot-notation fields maps over each item', async () => {
  setupMockFetch([
    { number: 1, title: 'First', user: { login: 'user1' } },
    { number: 2, title: 'Second', user: { login: 'user2' } },
    { number: 3, title: 'Third', user: { login: 'user3' } },
  ])

  const result = await handler(
    {
      url: 'https://api.example.com/items',
      method: 'GET',
      pick: ['number', 'title', 'user.login'],
      format: 'json',
    },
    'api.example.com',
    {}
  )

  assert.equal(result.success, true, 'request should succeed')
  assert(Array.isArray(result.body), 'body should be an array')
  assert.equal(result.body.length, 3, 'should have 3 items')

  assert.deepEqual(result.body[0], { number: 1, title: 'First', 'user.login': 'user1' }, 'first item should be picked correctly')
  assert.deepEqual(result.body[1], { number: 2, title: 'Second', 'user.login': 'user2' }, 'second item should be picked correctly')
  assert.deepEqual(result.body[2], { number: 3, title: 'Third', 'user.login': 'user3' }, 'third item should be picked correctly')
})

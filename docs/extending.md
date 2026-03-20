# Adding your own tools

Each tool is a self-contained file in `src/tools/`. The pattern is consistent across all of them.

---

## The pattern

A tool file exports four things:

```js
export const name = 'my_tool'           // the name Claude sees
export const description = '...'        // what Claude reads to decide when to use it
export const schema = { ... }           // Zod shape defining the parameters
export async function handler(args, env) { ... }  // the implementation
```

---

## Example: a simple tool

`src/tools/ping.js`:

```js
import { z } from 'zod'

export const name = 'ping'

export const description =
  'Check if a URL is reachable. Returns HTTP status and response time.'

export const schema = {
  url: z.string().url().describe('The URL to check'),
}

export async function handler({ url }) {
  const start = Date.now()
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return {
      success: true,
      url,
      status: res.status,
      ms: Date.now() - start,
    }
  } catch (err) {
    return {
      success: false,
      url,
      error: err.message,
      ms: Date.now() - start,
    }
  }
}
```

---

## Register it in `src/mcp-server.js`

Add the import at the top:

```js
import * as ping from './tools/ping.js'
```

Register it with the server (place it in the "Core tools" section if it needs no special credentials):

```js
server.tool(ping.name, ping.description, ping.schema, async args => {
  const result = await ping.handler(args, env)
  await auditLog(ping.name, args, result)
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
})
```

Restart the server. The new tool is live.

---

## Tips

**Use Zod's `.describe()` on every field.** Claude reads these descriptions to understand what to pass. The more specific you are, the better Claude uses the tool.

```js
export const schema = {
  hostname: z.string().describe('Tailscale hostname (e.g. "myserver", not an IP)'),
  timeout: z.number().int().min(1).max(30).optional().default(5)
    .describe('Timeout in seconds (default: 5)'),
}
```

**Always return a `success` boolean.** Claude uses this to decide whether to retry or report an error.

**Gate on credentials when relevant.** If your tool needs an env var, register it conditionally (like the GitHub and Tailscale tools):

```js
if (env.MY_SERVICE_TOKEN) {
  server.tool(myTool.name, myTool.description, myTool.schema, async args => {
    const result = await myTool.handler(args, env)
    await auditLog(myTool.name, args, result)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })
}
```

**Look at `fetch_external.js` for a clean reference.** It shows domain allowlisting, dynamic token injection, and error handling in about 100 lines.

import * as assert from 'remix/assert'
import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'
import { describe, it } from 'remix/test'

import { createAppRequestListener } from './http.ts'
import { routes } from './routes.ts'
import { createTestApp, csrfToken } from '../test/helpers.ts'

const PUBLIC_HOST = 'fliptrack.example.com'
const PUBLIC_ORIGIN = `https://${PUBLIC_HOST}`

describe('CSRF origin behind a TLS-terminating proxy', () => {
  it('rejects HTTPS Origin when the listener does not trust X-Forwarded-Proto', async () => {
    let app = await createTestApp()
    try {
      let status = await postOobeThroughProxy(
        createRequestListener((request) => app.router.fetch(request), { trustProxy: false }),
      )
      assert.equal(status, 403)
    } finally {
      await app.db.close()
    }
  })

  it('accepts HTTPS Origin when the app listener trusts X-Forwarded-Proto', async () => {
    let app = await createTestApp()
    try {
      let status = await postOobeThroughProxy(
        createAppRequestListener((request) => app.router.fetch(request)),
      )
      assert.equal(status, 400)
    } finally {
      await app.db.close()
    }
  })
})

async function postOobeThroughProxy(listener: http.RequestListener): Promise<number> {
  let server = http.createServer(listener)
  await listen(server)
  let address = server.address()
  if (address == null || typeof address === 'string') {
    server.close()
    throw new Error('Expected a TCP address')
  }

  try {
    let pageUrl = `http://127.0.0.1:${address.port}${routes.oobe.index.href()}`
    let page = await fetch(pageUrl, {
      headers: proxyHeaders(),
    })
    let html = await page.text()
    let cookie = cookieHeader(page)
    let body = new URLSearchParams({
      _csrf: csrfToken(html),
      setup_secret: 'wrong-secret',
      email: 'probe@example.com',
      password: 'not-a-real-password',
    })

    let posted = await fetch(pageUrl, {
      method: 'POST',
      headers: {
        ...proxyHeaders(),
        Origin: PUBLIC_ORIGIN,
        Referer: `${PUBLIC_ORIGIN}${routes.oobe.index.href()}`,
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
    await posted.text()
    return posted.status
  } finally {
    await close(server)
  }
}

function proxyHeaders(): Record<string, string> {
  return {
    Host: PUBLIC_HOST,
    'X-Forwarded-Host': PUBLIC_HOST,
    'X-Forwarded-Proto': 'https',
  }
}

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

function listen(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve())
    server.on('error', reject)
  })
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

import { createRequestListener, type FetchHandler } from 'remix/node-fetch-server'

// Railway (and any TLS-terminating proxy) forwards HTTP to Node. CSRF origin
// checks compare Origin to request.url, so the listener must take Host and
// proto from X-Forwarded-* / Forwarded.
export function createAppRequestListener(handler: FetchHandler) {
  return createRequestListener(handler, { trustProxy: true })
}

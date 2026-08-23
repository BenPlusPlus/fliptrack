import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import { THIRTY_DAYS } from '../../middleware/session.ts'
import {
  createOperatorViaOobe,
  createTestApp,
  csrfToken,
  fetchPage,
  login,
  readBody,
  resetBooks,
  setCookieMaxAge,
} from '../../../test/helpers.ts'

describe('login and logout', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('logs in with email and password and sets a ~30 day cookie', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      app.jar.clear()

      let response = await login(app)
      assert.equal(response.status, 303)
      assert.equal(response.headers.get('Location'), routes.home.href())
      let maxAge = setCookieMaxAge(response)
      assert.ok(maxAge != null)
      assert.ok(Math.abs(maxAge! - THIRTY_DAYS) < 60)

      let home = await fetchPage(app, routes.home.href())
      assert.equal(home.status, 200)
    } finally {
      await app.db.close()
    }
  })

  it('does not mention /oobe on login once an Operator exists', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      app.jar.clear()

      let response = await fetchPage(app, routes.login.index.href())
      assert.equal(response.status, 200)
      let html = await readBody(response)
      assert.doesNotMatch(html, /\/oobe/)
      assert.doesNotMatch(html, /first run/i)
    } finally {
      await app.db.close()
    }
  })

  it('logs out from Account', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      app.jar.clear()
      await login(app)

      let account = await fetchPage(app, routes.account.href())
      assert.equal(account.status, 200)
      let html = await readBody(account)
      assert.match(html, /Logout/)
      assert.doesNotMatch(html, /Tags/)
      assert.doesNotMatch(html, /Channel/)

      let form = new FormData()
      form.set('_csrf', csrfToken(html))
      let logout = await fetchPage(app, routes.logout.href(), { method: 'POST', body: form })
      assert.equal(logout.status, 303)
      assert.equal(logout.headers.get('Location'), routes.login.index.href())

      let home = await fetchPage(app, routes.home.href())
      assert.equal(home.status, 303)
      assert.equal(home.headers.get('Location'), routes.login.index.href())
    } finally {
      await app.db.close()
    }
  })
})

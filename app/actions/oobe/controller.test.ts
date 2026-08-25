import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import {
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_SETUP_SECRET,
  createOperatorViaOobe,
  createTestApp,
  fetchFollow,
  fetchPage,
  login,
  postForm,
  readBody,
  resetBooks,
} from '../../../test/helpers.ts'

describe('first-run /oobe', () => {
  afterEach(async () => {
    // Each test creates its own app/db client; reset via a short-lived app.
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('redirects login to /oobe when no Operator exists', async () => {
    let app = await createTestApp()
    try {
      let response = await fetchPage(app, routes.login.index.href())
      assert.equal(response.status, 303)
      assert.equal(response.headers.get('Location'), routes.oobe.index.href())
    } finally {
      await app.db.close()
    }
  })

  it('rejects /oobe without the setup secret', async () => {
    let app = await createTestApp()
    try {
      let response = await postForm(app, routes.oobe.index.href(), {
        setup_secret: 'wrong-secret',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })
      assert.equal(response.status, 400)
      assert.match(await readBody(response), /setup secret is wrong/i)
    } finally {
      await app.db.close()
    }
  })

  it('creates the instance-admin Operator and empty Books on first run', async () => {
    let app = await createTestApp()
    try {
      let response = await createOperatorViaOobe(app)
      assert.equal(response.status, 303)
      assert.equal(response.headers.get('Location'), routes.home.href())

      let home = await fetchFollow(app, routes.home.href())
      assert.equal(home.status, 200)
      let html = await readBody(home)
      assert.match(html, /This Week/)
      assert.match(html, /This Month/)
      assert.match(html, /This Year/)
      assert.match(html, /\$0/)
      assert.match(html, /New Acquisition/)
    } finally {
      await app.db.close()
    }
  })

  it('redirects /oobe to login when the setup secret is unset', async () => {
    let app = await createTestApp({ setupSecret: undefined })
    try {
      let response = await fetchPage(app, routes.oobe.index.href())
      assert.equal(response.status, 303)
      assert.equal(response.headers.get('Location'), routes.login.index.href())
    } finally {
      await app.db.close()
    }
  })

  it('resets the existing instance-admin standing password and does not create a second Operator', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      app.jar.clear()

      let reset = await postForm(app, routes.oobe.index.href(), {
        setup_secret: TEST_SETUP_SECRET,
        password: 'break-glass-standing',
      })
      assert.equal(reset.status, 303)
      assert.equal(reset.headers.get('Location'), routes.home.href())

      let home = await fetchFollow(app, routes.home.href())
      assert.equal(home.status, 200)
      let html = await readBody(home)
      assert.match(html, /This Week/)
      assert.doesNotMatch(html, /Change your password/)

      app.jar.clear()
      let oldPassword = await postForm(app, routes.login.index.href(), {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })
      assert.equal(oldPassword.status, 400)

      let fresh = await login(app, { email: TEST_EMAIL, password: 'break-glass-standing' })
      assert.equal(fresh.status, 303)
      assert.equal(fresh.headers.get('Location'), routes.home.href())

      let admin = await fetchPage(app, routes.admin.index.href())
      let adminHtml = await readBody(admin)
      assert.match(adminHtml, new RegExp(TEST_EMAIL))
      assert.doesNotMatch(adminHtml, /second@example.com/)
    } finally {
      await app.db.close()
    }
  })
})

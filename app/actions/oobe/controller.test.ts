import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import {
  TEST_EMAIL,
  TEST_PASSWORD,
  createOperatorViaOobe,
  createTestApp,
  fetchFollow,
  fetchPage,
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
})

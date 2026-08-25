import * as assert from 'remix/assert'
import { afterEach, describe, it } from 'remix/test'

import { routes } from '../../routes.ts'
import {
  SECOND_EMAIL,
  SECOND_PASSWORD,
  TEST_EMAIL,
  TEST_PASSWORD,
  acquireFlip,
  adminActionHref,
  copyJar,
  createOperatorViaOobe,
  createTestApp,
  fetchFollow,
  fetchPage,
  flipHrefFromInventory,
  login,
  openSignup,
  postForm,
  postFormFrom,
  readBody,
  resetBooks,
  revealedTempPassword,
  signupOperator,
} from '../../../test/helpers.ts'

describe('instance admin', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('is its own view, visible only to the instance-admin Operator', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)

      let home = await fetchPage(app, routes.home.href())
      let homeHtml = await readBody(home)
      assert.match(homeHtml, new RegExp(`href="${routes.admin.index.href()}"`))
      assert.match(homeHtml, /Admin/)

      let admin = await fetchPage(app, routes.admin.index.href())
      assert.equal(admin.status, 200)
      let adminHtml = await readBody(admin)
      assert.match(adminHtml, /<h1[^>]*>Admin<\/h1>/)
      assert.match(adminHtml, /Sign-up is closed/)
      assert.match(adminHtml, new RegExp(TEST_EMAIL))
      assert.doesNotMatch(adminHtml, /\/oobe/)

      await openSignup(app)
      app.jar.clear()
      let created = await signupOperator(app)
      assert.equal(created.status, 303)
      assert.equal(created.headers.get('Location'), routes.home.href())

      let secondHome = await fetchPage(app, routes.home.href())
      let secondHtml = await readBody(secondHome)
      assert.doesNotMatch(secondHtml, new RegExp(`href="${routes.admin.index.href()}"`))

      let forbidden = await fetchPage(app, routes.admin.index.href())
      assert.equal(forbidden.status, 404)
    } finally {
      await app.db.close()
    }
  })

  it('toggles sign-up; sign-up starts closed', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      app.jar.clear()

      let loginClosed = await fetchPage(app, routes.login.index.href())
      assert.doesNotMatch(await readBody(loginClosed), /Create Operator/)

      await login(app)
      let admin = await fetchPage(app, routes.admin.index.href())
      assert.match(await readBody(admin), /Sign-up is closed/)

      let opened = await openSignup(app)
      assert.equal(opened.status, 303)
      assert.equal(opened.headers.get('Location'), routes.admin.index.href())

      let openAdmin = await fetchPage(app, routes.admin.index.href())
      assert.match(await readBody(openAdmin), /Sign-up is open/)

      app.jar.clear()
      let loginOpen = await fetchPage(app, routes.login.index.href())
      assert.match(await readBody(loginOpen), /Create Operator/)
    } finally {
      await app.db.close()
    }
  })
})

describe('sign-up door', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('creates an Operator on login only while sign-up is on, with empty Books, and never as the first Operator', async () => {
    let app = await createTestApp()
    try {
      let noOperator = await postFormFrom(
        app,
        routes.oobe.index.href(),
        routes.login.signup.href(),
        { email: SECOND_EMAIL, password: SECOND_PASSWORD },
      )
      assert.equal(noOperator.status, 303)
      assert.equal(noOperator.headers.get('Location'), routes.oobe.index.href())

      await createOperatorViaOobe(app)
      app.jar.clear()

      let closed = await postFormFrom(app, routes.login.index.href(), routes.login.signup.href(), {
        email: SECOND_EMAIL,
        password: SECOND_PASSWORD,
      })
      assert.equal(closed.status, 400)
      assert.match(await readBody(closed), /Sign-up is closed/)

      await login(app)
      await openSignup(app)
      app.jar.clear()

      let created = await signupOperator(app)
      assert.equal(created.status, 303)
      assert.equal(created.headers.get('Location'), routes.home.href())

      let home = await fetchFollow(app, routes.home.href())
      assert.equal(home.status, 200)
      let html = await readBody(home)
      assert.match(html, /This Week/)
      assert.match(html, /\$0/)
      assert.doesNotMatch(html, /Change your password/)
      assert.doesNotMatch(html, new RegExp(`href="${routes.admin.index.href()}"`))
    } finally {
      await app.db.close()
    }
  })
})

describe('second Operator isolation', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('cannot see or mutate the first Operator\'s Books', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Admin lamp', itemCost: '12' })
      let adminInventory = await readBody(await fetchPage(app, routes.inventory.href()))
      let adminFlipHref = flipHrefFromInventory(adminInventory, 'Admin lamp')

      await openSignup(app)
      app.jar.clear()
      await signupOperator(app)

      let inventory = await fetchPage(app, routes.inventory.href())
      let inventoryHtml = await readBody(inventory)
      assert.doesNotMatch(inventoryHtml, /Admin lamp/)

      let hidden = await fetchPage(app, adminFlipHref)
      assert.equal(hidden.status, 404)

      let mutated = await postFormFrom(app, routes.account.href(), adminFlipHref, {
        name: 'Stolen lamp',
        notes: '',
        item_cost: '1',
        tax_paid: '0',
        inbound_shipping: '0',
      })
      assert.equal(mutated.status, 404)
    } finally {
      await app.db.close()
    }
  })
})

describe('inspector', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('is read-only on the same screens and leave inspector returns to your Books', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await acquireFlip(app, { name: 'Admin lamp', itemCost: '12' })
      await openSignup(app)
      app.jar.clear()
      await signupOperator(app)
      await acquireFlip(app, { name: 'Guest vase', itemCost: '8' })
      let guestInventory = await readBody(await fetchPage(app, routes.inventory.href()))
      let guestFlipHref = flipHrefFromInventory(guestInventory, 'Guest vase')

      app.jar.clear()
      await login(app)
      let admin = await readBody(await fetchPage(app, routes.admin.index.href()))
      let inspectHref = adminActionHref(admin, SECOND_EMAIL, 'inspect')
      let inspect = await postFormFrom(app, routes.admin.index.href(), inspectHref, {})
      assert.equal(inspect.status, 303)
      assert.equal(inspect.headers.get('Location'), routes.home.href())

      let home = await fetchPage(app, routes.home.href())
      let homeHtml = await readBody(home)
      assert.match(homeHtml, new RegExp(`Viewing ${SECOND_EMAIL} — read only`))
      assert.doesNotMatch(homeHtml, /New Acquisition/)

      let inventory = await fetchPage(app, routes.inventory.href())
      let inventoryHtml = await readBody(inventory)
      assert.match(inventoryHtml, /Guest vase/)
      assert.doesNotMatch(inventoryHtml, /Admin lamp/)
      assert.match(inventoryHtml, new RegExp(`Viewing ${SECOND_EMAIL} — read only`))
      assert.doesNotMatch(inventoryHtml, /New Acquisition/)

      let hub = await fetchPage(app, guestFlipHref)
      assert.equal(hub.status, 200)
      let hubHtml = await readBody(hub)
      assert.match(hubHtml, /Guest vase/)
      assert.match(hubHtml, new RegExp(`Viewing ${SECOND_EMAIL} — read only`))
      assert.doesNotMatch(hubHtml, /Save Flip/)

      let write = await postFormFrom(app, guestFlipHref, guestFlipHref, {
        name: 'Hacked vase',
        notes: '',
        item_cost: '1',
        tax_paid: '0',
        inbound_shipping: '0',
      })
      assert.equal(write.status, 403)

      let leave = await postFormFrom(app, routes.home.href(), routes.admin.leave.href(), {})
      assert.equal(leave.status, 303)
      assert.equal(leave.headers.get('Location'), routes.home.href())

      let ownHome = await fetchPage(app, routes.home.href())
      let ownHomeHtml = await readBody(ownHome)
      assert.doesNotMatch(ownHomeHtml, /Viewing /)
      assert.match(ownHomeHtml, /New Acquisition/)

      let ownInventory = await readBody(await fetchPage(app, routes.inventory.href()))
      assert.match(ownInventory, /Admin lamp/)
      assert.doesNotMatch(ownInventory, /Guest vase/)
    } finally {
      await app.db.close()
    }
  })
})

describe('temporary password', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('reveals a temp password once and forces a change before Home', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      await openSignup(app)
      app.jar.clear()
      await signupOperator(app)
      app.jar.clear()
      await login(app)

      let admin = await readBody(await fetchPage(app, routes.admin.index.href()))
      let tempHref = adminActionHref(admin, SECOND_EMAIL, 'password')
      let setTemp = await postFormFrom(app, routes.admin.index.href(), tempHref, {})
      assert.equal(setTemp.status, 303)
      assert.equal(setTemp.headers.get('Location'), routes.admin.index.href())

      let revealedPage = await fetchPage(app, routes.admin.index.href())
      let revealedHtml = await readBody(revealedPage)
      assert.match(revealedHtml, /shown once/i)
      let tempPassword = revealedTempPassword(revealedHtml)
      assert.ok(tempPassword.length >= 8)

      let again = await readBody(await fetchPage(app, routes.admin.index.href()))
      assert.doesNotMatch(again, /id="temp-password"/)
      assert.doesNotMatch(
        again,
        new RegExp(tempPassword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      )

      app.jar.clear()
      let withTemp = await login(app, { email: SECOND_EMAIL, password: tempPassword })
      assert.equal(withTemp.status, 303)

      let interstitial = await fetchFollow(app, routes.home.href())
      assert.equal(interstitial.status, 200)
      let interstitialHtml = await readBody(interstitial)
      assert.match(interstitialHtml, /Change your password/)
      assert.doesNotMatch(interstitialHtml, /This Week/)

      let skipped = await fetchPage(app, routes.inventory.href())
      assert.equal(skipped.status, 303)
      assert.equal(skipped.headers.get('Location'), routes.password.index.href())

      let changed = await postForm(app, routes.password.index.href(), {
        password: 'standing-after-temp',
      })
      assert.equal(changed.status, 303)
      assert.equal(changed.headers.get('Location'), routes.home.href())

      let home = await fetchFollow(app, routes.home.href())
      assert.equal(home.status, 200)
      assert.match(await readBody(home), /This Week/)
    } finally {
      await app.db.close()
    }
  })
})

describe('Account password', () => {
  afterEach(async () => {
    let app = await createTestApp()
    await resetBooks(app.db)
    await app.db.close()
  })

  it('changes password and invalidates other devices\' cookies', async () => {
    let app = await createTestApp()
    try {
      await createOperatorViaOobe(app)
      app.jar.clear()
      await login(app)
      let jarA = copyJar(app.jar)
      app.jar.clear()
      await login(app)
      let jarB = copyJar(app.jar)

      app.jar = jarA
      let account = await fetchPage(app, routes.account.href())
      let accountHtml = await readBody(account)
      assert.match(accountHtml, /Change password/)
      assert.match(accountHtml, /Logout/)

      let changed = await postFormFrom(
        app,
        routes.account.href(),
        routes.accountPassword.href(),
        {
          current_password: TEST_PASSWORD,
          password: 'brand-new-standing',
        },
      )
      assert.equal(changed.status, 303)
      assert.equal(changed.headers.get('Location'), routes.account.href())

      let stillA = await fetchPage(app, routes.home.href())
      assert.equal(stillA.status, 200)

      app.jar = jarB
      let other = await fetchPage(app, routes.home.href())
      assert.equal(other.status, 303)
      assert.equal(other.headers.get('Location'), routes.login.index.href())
    } finally {
      await app.db.close()
    }
  })
})

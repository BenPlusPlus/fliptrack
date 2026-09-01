import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'
import { render } from 'remix/ui/test'

import { AddFlipForm, type AddFlipFormProps } from './add-flip-form.tsx'

const LEAVE_HREF = '/acquisitions/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const ACTION = `${LEAVE_HREF}/flips/new`

describe('Add a Flip in-place save', () => {
  it('prepends the typed Flip, clears the form, and focuses Flip name without a second fetch', async (t) => {
    let gate = holdFetch(t)
    let { $, act, cleanup } = renderForm()
    t.after(cleanup)

    fill($('input[name="name"]'), 'Oak dresser')
    fill($('input[name="item_cost"]'), '40')
    fill($('textarea[name="notes"]'), 'scuffed')
    fill($('input[name="tag"]'), 'Vintage')

    await act(() => clickSave($))
    assert.equal(gate.calls, 1)
    assert.equal(gate.init?.method, 'POST')
    assert.equal(gate.init?.redirect, 'manual')

    gate.resolve(new Response(null, { status: 204 }))
    await settle(act, gate.pending)

    assert.equal(gate.calls, 1)
    assert.match($('ol')?.textContent ?? '', /Oak dresser/)
    assert.match($('ol')?.textContent ?? '', /\$40\.00/)
    assert.equal(field($('input[name="name"]')).value, '')
    assert.equal(field($('input[name="item_cost"]')).value, '')
    assert.equal(field($('textarea[name="notes"]')).value, '')
    assert.equal(field($('input[name="tag"]')).value, '')
    assert.equal(document.activeElement, $('input[name="name"]'))
    assert.equal($('button[type="submit"]')?.textContent, 'Save Flip')
  })

  it('locks fields and Save while the POST is in flight, and Leave stays clickable', async (t) => {
    let gate = holdFetch(t)
    let { $, act, cleanup } = renderForm()
    t.after(cleanup)

    fill($('input[name="name"]'), 'Lamp')
    fill($('input[name="item_cost"]'), '10')

    await act(() => clickSave($))

    assert.equal($('form')?.getAttribute('aria-busy'), 'true')
    assert.equal(field($('input[name="name"]')).readOnly, true)
    assert.equal(field($('input[name="item_cost"]')).readOnly, true)
    assert.equal(field($('textarea[name="notes"]')).readOnly, true)
    assert.equal(field($('input[name="tag"]')).readOnly, true)
    let save = saveButton($)
    assert.equal(save.textContent, 'Saving…')
    assert.equal(save.disabled, true)
    let leave = $('a')
    assert.equal(leave?.textContent?.trim(), 'Leave')
    assert.equal(leave?.getAttribute('href'), LEAVE_HREF)

    await act(() => clickSave($))
    assert.equal(gate.calls, 1)

    gate.resolve(new Response(null, { status: 204 }))
    await settle(act, gate.pending)
  })

  it('keeps typed values and shows the 400 banner, then the form is usable again', async (t) => {
    let gate = holdFetch(t)
    let { $, act, cleanup } = renderForm()
    t.after(cleanup)

    fill($('input[name="name"]'), 'Lamp')
    fill($('input[name="item_cost"]'), 'nope')

    await act(() => clickSave($))
    gate.resolve(
      new Response('<p role="alert">Enter a dollar amount.</p>', {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      }),
    )
    await settle(act, gate.pending)

    assert.equal($('[role="alert"]')?.textContent, 'Enter a dollar amount.')
    assert.equal(field($('input[name="name"]')).value, 'Lamp')
    assert.equal(field($('input[name="item_cost"]')).value, 'nope')
    assert.equal(field($('input[name="name"]')).readOnly, false)
    assert.equal(saveButton($).disabled, false)
    assert.equal(saveButton($).textContent, 'Save Flip')
    assert.equal($('form')?.getAttribute('aria-busy'), null)
  })

  it('shows Couldn’t save. Try again. on 5xx and network failure, keeping values', async (t) => {
    let gate = holdFetch(t)
    let { $, act, cleanup } = renderForm()
    t.after(cleanup)

    fill($('input[name="name"]'), 'Bowl')
    fill($('input[name="item_cost"]'), '6')

    await act(() => clickSave($))
    gate.resolve(new Response('nope', { status: 500 }))
    await settle(act, gate.pending)

    assert.equal($('[role="alert"]')?.textContent, 'Couldn’t save. Try again.')
    assert.equal(field($('input[name="name"]')).value, 'Bowl')
    assert.equal(field($('input[name="item_cost"]')).value, '6')
    assert.equal(saveButton($).disabled, false)

    let again = holdFetch(t)
    fill($('input[name="name"]'), 'Bowl')
    fill($('input[name="item_cost"]'), '6')
    await act(() => clickSave($))
    again.reject(new TypeError('Failed to fetch'))
    await settle(act, again.pending)

    assert.equal($('[role="alert"]')?.textContent, 'Couldn’t save. Try again.')
    assert.equal(field($('input[name="name"]')).value, 'Bowl')
    assert.equal(field($('input[name="item_cost"]')).value, '6')
  })

  it('caps visible rows, updates N more, and deals only the new row', async (t) => {
    let gate = holdFetch(t)
    let existing = [
      { id: '5', name: 'Echo', itemCost: 500 },
      { id: '4', name: 'Delta', itemCost: 400 },
      { id: '3', name: 'Charlie', itemCost: 300 },
      { id: '2', name: 'Bravo', itemCost: 200 },
      { id: '1', name: 'Alpha', itemCost: 100 },
    ]
    let { $, $$, act, cleanup } = renderForm({ sittingFlips: existing, revealSitting: false })
    t.after(cleanup)

    fill($('input[name="name"]'), 'Foxtrot')
    fill($('input[name="item_cost"]'), '1')
    await act(() => clickSave($))
    gate.resolve(new Response(null, { status: 204 }))
    await settle(act, gate.pending)

    let names = [...$$('ol li')].map((row) => row.querySelector('span')?.textContent)
    assert.deepEqual(names, ['Foxtrot', 'Echo', 'Delta', 'Charlie', 'Bravo'])
    assert.doesNotMatch($('ol')?.textContent ?? '', /Alpha/)
    assert.match($('section')?.textContent ?? '', /3 more/)
    assert.match($('section')?.textContent ?? '', /1 more/)

    let rows = [...$$('ol li')]
    assert.equal(getComputedStyle(rows[0]!).animationName, 'ft-deal')
    assert.notEqual(getComputedStyle(rows[1]!).animationName, 'ft-deal')
  })

  it('does not invent a sitting strip when this session is not tracking one', async (t) => {
    let gate = holdFetch(t)
    let { $, act, cleanup } = renderForm({ trackSitting: false })
    t.after(cleanup)

    fill($('input[name="name"]'), 'Solo mug')
    fill($('input[name="item_cost"]'), '5')
    await act(() => clickSave($))
    gate.resolve(new Response(null, { status: 204 }))
    await settle(act, gate.pending)

    assert.equal($('ol'), null)
    assert.doesNotMatch($('section')?.textContent ?? '', /This sitting/)
    assert.equal(field($('input[name="name"]')).value, '')
    assert.equal(document.activeElement, $('input[name="name"]'))
  })

  it('omits Save when inspecting', (t) => {
    let { $, cleanup } = renderForm({ inspecting: true })
    t.after(cleanup)
    assert.equal($('button[type="submit"]'), null)
    assert.equal($('a')?.textContent?.trim(), 'Leave')
  })
})

function renderForm(overrides: Partial<AddFlipFormProps> = {}) {
  let props: AddFlipFormProps = {
    csrf: 'test-csrf',
    action: ACTION,
    leaveHref: LEAVE_HREF,
    inspecting: false,
    tagNames: ['Vintage'],
    acquisitionDate: '2026-08-22',
    acquisitionNotes: 'Saturday haul',
    sittingFlips: [],
    revealSitting: false,
    ...overrides,
  }
  return render(<AddFlipForm {...props} />)
}

async function settle(act: (fn: () => unknown | Promise<unknown>) => Promise<void>, pending: Promise<unknown>) {
  await act(async () => {
    await pending.catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function holdFetch(t: { mock: { method: (obj: typeof globalThis, name: 'fetch', impl: typeof fetch) => unknown } }) {
  let resolve!: (response: Response) => void
  let reject!: (error: unknown) => void
  let pending = new Promise<Response>((res, rej) => {
    resolve = res
    reject = rej
  })
  let gate = { calls: 0, init: undefined as RequestInit | undefined, pending, resolve, reject }
  t.mock.method(globalThis, 'fetch', ((_input: unknown, init?: RequestInit) => {
    gate.calls += 1
    gate.init = init
    return pending
  }) as typeof fetch)
  return gate
}

function fill(el: HTMLElement | null, value: string) {
  field(el).value = value
}

function field(el: HTMLElement | null): HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el
  throw new Error('expected an input or textarea')
}

function saveButton($: (selector: string) => HTMLElement | null): HTMLButtonElement {
  let el = $('button[type="submit"]')
  if (!(el instanceof HTMLButtonElement)) throw new Error('expected Save Flip')
  return el
}

function clickSave($: (selector: string) => HTMLElement | null) {
  saveButton($).click()
}

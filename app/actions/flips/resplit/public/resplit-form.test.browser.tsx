import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'
import { render } from 'remix/ui/test'

import { ResplitForm, type ResplitFormProps } from './resplit-form.tsx'

const ACTION = '/flips/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/resplit'
const LEAVE = '/flips/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('Re-split canvas', () => {
  it('adds a Flip, duplicates after the source, and will not drop the last row', async (t) => {
    let { $, act, cleanup } = renderForm()
    t.after(cleanup)

    assert.equal($$($, '[data-child-row]').length, 2)

    await act(() => click($('button[data-add]')))
    assert.equal($$($, '[data-child-row]').length, 3)
    assert.equal(document.activeElement, $$($, 'input[name^="child_name."]')[2])

    fill($$($, 'input[name^="child_name."]')[0]!, 'Mug')
    fill($$($, 'input[name^="child_item_cost."]')[0]!, '5')
    await act(() => click($$($, 'button[data-duplicate]')[0]!))

    assert.equal($$($, '[data-child-row]').length, 4)
    assert.equal(field($$($, 'input[name^="child_name."]')[1]!).value, 'Mug')
    assert.equal(field($$($, 'input[name^="child_item_cost."]')[1]!).value, '5')

    await act(() => click($$($, 'button[data-remove]')[3]!))
    await act(() => click($$($, 'button[data-remove]')[2]!))
    await act(() => click($$($, 'button[data-remove]')[1]!))
    assert.equal($$($, '[data-child-row]').length, 1)
    assert.equal($$($, 'button[data-remove]')[0]?.hasAttribute('disabled'), true)

    await act(() => click($$($, 'button[data-remove]')[0]!))
    assert.equal($$($, '[data-child-row]').length, 1)
  })

  it('stamps N numbered copies that sum to this child Item cost', async (t) => {
    let { $, act, cleanup } = renderForm({ parentItemCost: 2000, parentTaxPaid: 200, parentInboundShipping: 200 })
    t.after(cleanup)

    fill($$($, 'input[name^="child_name."]')[0]!, 'Charizard')
    fill($$($, 'input[name^="child_item_cost."]')[0]!, '20')
    fill($$($, '[data-split-n]')[0]!, '20')
    dispatchInput($('form'))

    await act(() => click($$($, 'button[data-stamp]')[0]!))

    let names = $$($, 'input[name^="child_name."]').map((el) => field(el).value)
    assert.equal(names.length, 21)
    assert.equal(names[0], 'Charizard 01')
    assert.equal(names[19], 'Charizard 20')
    assert.equal(names[20], '')

    let costs = $$($, 'input[name^="child_item_cost."]').slice(0, 20).map((el) => field(el).value)
    assert.ok(costs.every((value) => value === '1'))

    await act(() => click($$($, 'button[data-remove]')[20]!))
    dispatchInput($('form'))
    assert.equal($('[data-sum]')?.getAttribute('data-balanced'), '1')
    assert.match($('[data-preview]')?.textContent ?? '', /\$1\.20/)
  })
})

function renderForm(overrides: Partial<ResplitFormProps> = {}) {
  return render(
    <ResplitForm
      csrf="test"
      action={ACTION}
      leaveHref={LEAVE}
      inspecting={false}
      parentName="Thrift bag"
      parentItemCost={2000}
      parentTaxPaid={0}
      parentInboundShipping={0}
      {...overrides}
    />,
  )
}

function $$(
  $: (selector: string) => HTMLElement | null,
  selector: string,
): HTMLElement[] {
  let root = $('form') ?? document.body
  return [...root.querySelectorAll(selector)] as HTMLElement[]
}

function fill(el: HTMLElement | null, value: string) {
  field(el).value = value
}

function field(el: HTMLElement | null): HTMLInputElement {
  if (el instanceof HTMLInputElement) return el
  throw new Error('expected an input')
}

function click(el: HTMLElement | null) {
  if (!(el instanceof HTMLButtonElement)) throw new Error('expected a button')
  el.click()
}

function dispatchInput(el: HTMLElement | null) {
  el?.dispatchEvent(new Event('input', { bubbles: true }))
}

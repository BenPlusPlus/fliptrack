import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'
import { render } from 'remix/ui/test'

import { DateInput } from './date-input.tsx'

describe('DateInput', () => {
  it('fills the browser local date when empty and defaultToToday', (t) => {
    let { $, cleanup } = render(
      <DateInput id="acquisition_date" name="acquisition_date" required defaultToToday />,
    )
    t.after(cleanup)

    assert.equal(field($('#acquisition_date')).value, localYmd())
  })

  it('keeps a provided defaultValue', (t) => {
    let { $, cleanup } = render(
      <DateInput id="sale_date" name="sale_date" required defaultToToday defaultValue="2024-01-15" />,
    )
    t.after(cleanup)

    assert.equal(field($('#sale_date')).value, '2024-01-15')
  })
})

function field(el: HTMLElement | null): HTMLInputElement {
  if (el instanceof HTMLInputElement) return el
  throw new Error('expected a date input')
}

function localYmd(): string {
  let now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

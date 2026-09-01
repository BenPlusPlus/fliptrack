import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import {
  RESPLIT_CHILD_CAP,
  allocatedItemCents,
  canStampRow,
  collectResplitRows,
  completeRowCents,
  parseResplitChildren,
  parseStampN,
  saveWouldSucceed,
  stampResplitRow,
  stampedChildNames,
} from './resplit.ts'

describe('Re-split canvas helpers', () => {
  it('appends a two-digit suffix and does not parse a trailing number on the template', () => {
    assert.deepEqual(stampedChildNames('Charizard', 2), ['Charizard 01', 'Charizard 02'])
    assert.deepEqual(stampedChildNames('Issue 2', 3), ['Issue 2 01', 'Issue 2 02', 'Issue 2 03'])
    assert.equal(stampedChildNames('Card', 20)[9], 'Card 10')
    assert.equal(stampedChildNames('Card', 20)[19], 'Card 20')
  })

  it('divides this child Item cost across N copies, leftover cents on the last', () => {
    let stamped = stampResplitRow(
      { id: 'r1', name: 'Card', itemCost: '10', splitN: '3' },
      3,
      letNextId(),
    )
    assert.equal(stamped.length, 3)
    assert.deepEqual(
      stamped.map((row) => row.name),
      ['Card 01', 'Card 02', 'Card 03'],
    )
    assert.deepEqual(
      stamped.map((row) => row.itemCost),
      ['3.33', '3.33', '3.34'],
    )
    assert.ok(stamped.every((row) => row.splitN === ''))
  })

  it('treats every posted row as a real child and refuses a 51st', () => {
    let emptyThird = new FormData()
    emptyThird.set('child_name.0', 'Shirt')
    emptyThird.set('child_item_cost.0', '12')
    emptyThird.set('child_name.1', 'Mug')
    emptyThird.set('child_item_cost.1', '8')
    emptyThird.set('child_name.2', '')
    emptyThird.set('child_item_cost.2', '')
    let skipped = parseResplitChildren(emptyThird)
    assert.equal(skipped.ok, false)
    if (!skipped.ok) {
      assert.equal(skipped.error, 'Flip name is required.')
      assert.equal(skipped.values.length, 3)
    }

    let tooMany = new FormData()
    for (let index = 0; index <= RESPLIT_CHILD_CAP; index += 1) {
      tooMany.set(`child_name.${index}`, `Card ${index}`)
      tooMany.set(`child_item_cost.${index}`, '1')
    }
    assert.equal(collectResplitRows(tooMany).length, RESPLIT_CHILD_CAP + 1)
    let capped = parseResplitChildren(tooMany)
    assert.equal(capped.ok, false)
    if (!capped.ok) {
      assert.match(capped.error, /50 Flips/)
    }
  })

  it('turns the tally green only when Save would succeed', () => {
    let rows = [
      { name: 'Shirt', itemCost: '12' },
      { name: 'Mug', itemCost: '8' },
    ]
    assert.equal(allocatedItemCents(rows), 2000)
    assert.equal(saveWouldSucceed(2000, rows), true)
    assert.equal(saveWouldSucceed(2000, [...rows, { name: '', itemCost: '' }]), false)
    assert.equal(completeRowCents({ name: '', itemCost: '5' }), null)
    assert.equal(parseStampN(''), null)
    assert.equal(parseStampN('2'), 2)
    assert.equal(
      canStampRow({ name: 'Card', itemCost: '20', splitN: '20' }, 2),
      true,
    )
    assert.equal(
      canStampRow({ name: 'Card', itemCost: '20', splitN: '50' }, 2),
      false,
    )
  })
})

function letNextId() {
  let n = 10
  return () => {
    n += 1
    return `r${n}`
  }
}

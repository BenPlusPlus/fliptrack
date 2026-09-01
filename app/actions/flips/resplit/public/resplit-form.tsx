import { clientEntry, css, on, ref, type Handle } from 'remix/ui'

import { MoneyField, PageHeader, Stamp } from '../../../../ui/components.tsx'
import {
  FONT_MONEY,
  errorBanner,
  ghostAction,
  labelStyle,
  leaveRow,
  primaryAction,
  quietAction,
} from '../../../../ui/styles.ts'
import { formatCents } from '../../../../utils/cents.ts'
import {
  RESPLIT_CHILD_CAP,
  allocatedItemCents,
  canStampRow,
  childAcquisitionPreviews,
  initialResplitRows,
  saveWouldSucceed,
  stampResplitRow,
  type ResplitCanvasRow,
  type ResplitFormRow,
} from '../../../../utils/resplit.ts'

export type ResplitFormProps = {
  csrf: string
  action: string
  leaveHref: string
  inspecting: boolean
  parentName: string
  parentItemCost: number
  parentTaxPaid: number
  parentInboundShipping: number
  error?: string
  values?: ResplitFormRow[]
}

export const ResplitForm = clientEntry(
  `${import.meta.url}#ResplitForm`,
  function ResplitForm(handle: Handle<ResplitFormProps>) {
    let rows = initialResplitRows(handle.props.values)
    let nextId = rows.length
    let formEl: HTMLFormElement | undefined

    function newId() {
      nextId += 1
      return `r${nextId}`
    }

    function snapshot(): ResplitCanvasRow[] {
      if (!formEl) return rows
      return [...formEl.querySelectorAll('[data-child-row]')].map((block) => ({
        id: block.getAttribute('data-row-id') || newId(),
        name: inputValue(block, 'input[name^="child_name."]'),
        itemCost: inputValue(block, 'input[name^="child_item_cost."]'),
        splitN: inputValue(block, '[data-split-n]'),
      }))
    }

    function paint() {
      if (!formEl) return
      let current = snapshot()
      let parent = {
        taxPaid: handle.props.parentTaxPaid,
        inboundShipping: handle.props.parentInboundShipping,
      }
      let previews = childAcquisitionPreviews(parent, current)
      formEl.querySelectorAll('[data-preview]').forEach((el, index) => {
        el.textContent = `Acquisition cost ${previews[index] ?? '—'}`
      })
      let sumEl = formEl.querySelector('[data-sum]')
      if (sumEl) {
        sumEl.textContent = formatCents(allocatedItemCents(current))
        sumEl.setAttribute(
          'data-balanced',
          saveWouldSucceed(handle.props.parentItemCost, current) ? '1' : '0',
        )
      }
      formEl.querySelector('[data-add]')?.toggleAttribute('disabled', current.length >= RESPLIT_CHILD_CAP)
      formEl.querySelectorAll('[data-duplicate]').forEach((button) => {
        button.toggleAttribute('disabled', current.length >= RESPLIT_CHILD_CAP)
      })
      formEl.querySelectorAll('[data-remove]').forEach((button) => {
        button.toggleAttribute('disabled', current.length <= 1)
      })
      formEl.querySelectorAll('[data-child-row]').forEach((block, index) => {
        let stamp = block.querySelector('[data-stamp]')
        let row = current[index]
        if (stamp && row) {
          stamp.toggleAttribute('disabled', !canStampRow(row, current.length))
        }
      })
    }

    async function replaceRows(next: ResplitCanvasRow[], focusId: string | null) {
      rows = next
      await handle.update()
      paint()
      if (!focusId || !formEl) return
      let input = formEl.querySelector(`[data-row-id="${focusId}"] input[name^="child_name."]`)
      if (input instanceof HTMLInputElement) input.focus()
    }

    async function addRow() {
      let current = snapshot()
      if (current.length >= RESPLIT_CHILD_CAP) return
      let added: ResplitCanvasRow = { id: newId(), name: '', itemCost: '', splitN: '' }
      await replaceRows([...current, added], added.id)
    }

    async function duplicateRow(index: number) {
      let current = snapshot()
      let source = current[index]
      if (!source || current.length >= RESPLIT_CHILD_CAP) return
      let copy: ResplitCanvasRow = {
        id: newId(),
        name: source.name,
        itemCost: source.itemCost,
        splitN: '',
      }
      await replaceRows([...current.slice(0, index + 1), copy, ...current.slice(index + 1)], copy.id)
    }

    async function removeRow(index: number) {
      let current = snapshot()
      if (current.length <= 1) return
      let next = current.filter((_, rowIndex) => rowIndex !== index)
      let focus = next[Math.min(index, next.length - 1)]?.id ?? null
      await replaceRows(next, focus)
    }

    async function stampRow(index: number) {
      let current = snapshot()
      let source = current[index]
      if (!source || !canStampRow(source, current.length)) return
      let count = Number(source.splitN.trim())
      let stamped = stampResplitRow(source, count, newId)
      await replaceRows(
        [...current.slice(0, index), ...stamped, ...current.slice(index + 1)],
        stamped[0]?.id ?? null,
      )
    }

    return () => {
      let {
        csrf,
        action,
        leaveHref,
        inspecting,
        parentName,
        parentItemCost,
        parentTaxPaid,
        parentInboundShipping,
        error,
      } = handle.props
      let parent = { taxPaid: parentTaxPaid, inboundShipping: parentInboundShipping }
      let previews = childAcquisitionPreviews(parent, rows)
      let allocated = allocatedItemCents(rows)
      let balanced = saveWouldSucceed(parentItemCost, rows)

      return (
        <>
          <PageHeader
            title={`Re-split ${parentName}`}
            lead={`Child Item costs must sum to ${formatCents(parentItemCost)}. Resulting Acquisition costs are shown before save.`}
            aside={<Stamp tone="gold">Re-split</Stamp>}
          />
          {error ? (
            <p mix={errorBanner} role="alert">
              {error}
            </p>
          ) : null}
          <form
            method="post"
            action={action}
            id="resplit-form"
            rmx-document=""
            mix={[
              resplitForm,
              on('input', paint),
              ref((node) => {
                formEl = node
                paint()
              }),
            ]}
          >
            <input type="hidden" name="_csrf" value={csrf} />
            <ol mix={childList}>
              {rows.map((row, index) => (
                <li key={row.id}>
                  <fieldset mix={childRow} data-child-row data-row-id={row.id} data-row-index={String(index)}>
                    <legend mix={childLegend}>Flip {index + 1}</legend>
                    <label mix={labelStyle}>
                      Flip name
                      <input
                        type="text"
                        name={`child_name.${index}`}
                        defaultValue={row.name}
                        autoComplete="off"
                        placeholder="Name this piece"
                      />
                    </label>
                    <MoneyField
                      label="Item cost"
                      name={`child_item_cost.${index}`}
                      defaultValue={row.itemCost}
                    />
                    <p mix={previewLine} data-preview>
                      Acquisition cost {previews[index] ?? '—'}
                    </p>
                    {inspecting ? null : (
                      <div mix={rowActions}>
                        <label mix={splitLabel}>
                          Split into
                          <input
                            type="text"
                            inputMode="numeric"
                            data-split-n
                            defaultValue={row.splitN}
                            autoComplete="off"
                            placeholder="N"
                            aria-label={`Split Flip ${index + 1} into N`}
                          />
                        </label>
                        <button
                          type="button"
                          mix={[ghostAction, compactAction, on('click', () => void stampRow(index))]}
                          data-stamp
                          disabled={!canStampRow(row, rows.length)}
                        >
                          Split
                        </button>
                        <button
                          type="button"
                          mix={[quietAction, on('click', () => void duplicateRow(index))]}
                          data-duplicate
                          disabled={rows.length >= RESPLIT_CHILD_CAP}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          mix={[quietAction, on('click', () => void removeRow(index))]}
                          data-remove
                          disabled={rows.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </fieldset>
                </li>
              ))}
            </ol>
            {inspecting ? null : (
              <p mix={addRowWrap}>
                <button
                  type="button"
                  mix={[ghostAction, on('click', () => void addRow())]}
                  data-add
                  disabled={rows.length >= RESPLIT_CHILD_CAP}
                >
                  Add Flip
                </button>
              </p>
            )}
            <div mix={tallyStrip}>
              <span mix={tallyLabel}>Allocated</span>
              <span mix={tallyValue} data-sum data-balanced={balanced ? '1' : '0'}>
                {formatCents(allocated)}
              </span>
              <span mix={tallyTarget}>of {formatCents(parentItemCost)}</span>
              {inspecting ? null : (
                <button type="submit" mix={primaryAction}>
                  Save Re-split
                </button>
              )}
            </div>
          </form>
          <p mix={leaveRow}>
            <a href={leaveHref} mix={ghostAction}>
              Back to Flip
            </a>
          </p>
        </>
      )
    }
  },
)

function inputValue(root: Element, selector: string): string {
  let el = root.querySelector(selector)
  return el instanceof HTMLInputElement ? el.value : ''
}

const resplitForm = css({ display: 'grid', gap: '1rem' })

const childList = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: 0,
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  boxShadow: 'var(--shadow-lift)',
  '& > li:last-child fieldset': { borderBottom: 0 },
})

const childRow = css({
  display: 'grid',
  gap: '0.65rem',
  margin: 0,
  padding: '0.9rem 1rem 1rem',
  border: 0,
  borderBottom: '1px dashed var(--rule)',
  minWidth: 0,
  '@media (min-width: 48rem)': {
    gridTemplateColumns: 'minmax(0, 1.5fr) 8.5rem minmax(7rem, auto)',
    alignItems: 'end',
    gap: '0.65rem 0.85rem',
  },
  '@media (min-width: 64rem)': {
    gridTemplateColumns: 'minmax(0, 1.4fr) 8.5rem 8rem minmax(12rem, auto)',
  },
})

const childLegend = css({
  padding: '0 0.4rem',
  marginLeft: '-0.4rem',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--stamp)',
  '@media (min-width: 48rem)': { gridColumn: '1 / -1' },
})

const previewLine = css({
  margin: 0,
  paddingTop: '0.45rem',
  borderTop: '1px dashed var(--rule)',
  fontFamily: FONT_MONEY,
  fontSize: '0.74rem',
  letterSpacing: '0.02em',
  color: 'var(--muted)',
  '@media (min-width: 48rem)': {
    borderTop: 0,
    paddingTop: 0,
    paddingBottom: '0.55rem',
  },
})

const rowActions = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'end',
  gap: '0.4rem 0.5rem',
  '@media (min-width: 48rem)': { gridColumn: '1 / -1' },
  '@media (min-width: 64rem)': { gridColumn: '4', justifyContent: 'flex-end' },
})

const splitLabel = css({
  display: 'grid',
  gap: '0.25rem',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  '& input': {
    fontFamily: FONT_MONEY,
    fontVariantNumeric: 'tabular-nums',
    fontSize: '0.95rem',
    letterSpacing: 0,
    textTransform: 'none',
    color: 'var(--ink)',
    background: 'var(--card)',
    border: '1px solid var(--rule)',
    borderRadius: '2px',
    minHeight: '2.6rem',
    width: '4.2rem',
    padding: '0.35rem 0.5rem',
    textAlign: 'right',
  },
})

const compactAction = css({
  minHeight: '2.6rem',
  minWidth: 'auto',
  width: 'auto',
  padding: '0.45rem 0.75rem',
  fontSize: '0.72rem',
})

const addRowWrap = css({
  margin: 0,
})

const tallyStrip = css({
  position: 'sticky',
  bottom: 'calc(4.35rem + env(safe-area-inset-bottom))',
  zIndex: 4,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5rem 0.75rem',
  margin: '0.25rem 0 0',
  padding: '0.75rem 1rem',
  background: 'rgba(251,246,234,0.94)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid var(--rule)',
  borderTop: '2px solid var(--ink)',
  boxShadow: 'var(--shadow-lift)',
  '& [data-balanced="1"]': { color: 'var(--gain)' },
  '@media (min-width: 48rem)': {
    bottom: 0,
  },
})

const tallyLabel = css({
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginRight: 'auto',
})

const tallyValue = css({
  fontFamily: FONT_MONEY,
  fontSize: '1.15rem',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--ink)',
})

const tallyTarget = css({
  fontFamily: FONT_MONEY,
  fontSize: '0.78rem',
  color: 'var(--muted)',
})
